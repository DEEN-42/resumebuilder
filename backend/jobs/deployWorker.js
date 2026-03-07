import { Worker } from "bullmq";
import { Octokit } from "@octokit/rest";
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Resume from "../models/resumeDatamodel.js";
import User from "../models/usermodel.js";
import { sendInstantEmail } from "../Controllers/mailFunctionality.js";

const C = '\x1b[36m'; // cyan
const R = '\x1b[0m';  // reset
const log  = (...a) => console.log(`${C}[Deploy Worker]${R}`, ...a);
const lerr = (...a) => console.error(`${C}[Deploy Worker]${R}`, ...a);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { GITHUB_TOKEN, GITHUB_USERNAME, VERCEL_TOKEN } = process.env;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

function generateRepoName(resumeId) {
  const hash = crypto
    .createHash("sha256")
    .update(resumeId)
    .digest("hex")
    .slice(0, 12);
  const timestamp = Date.now().toString(36).slice(-7);
  const random = crypto.randomBytes(2).toString("hex").slice(0, 3);
  return `portfolio-${hash}-${timestamp}-${random}`;
}

async function commitFile(owner, repo, filePath, content, sha) {
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `feat: Update portfolio data`,
    content: Buffer.from(content).toString("base64"),
    ...(sha && { sha }),
  });
}

async function processDeploy(job) {
  const { resumeId, userEmail, resumeData } = job.data;
  log(`Job ${job.id} started → resumeId: ${resumeId}, user: ${userEmail}`);

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new Error("User not found.");

  const resume = await Resume.findOne({ id: resumeId });
  if (!resume) throw new Error("Resume not found.");

  if (userEmail !== resume.owner) {
    throw new Error("You are not authorized to deploy this resume.");
  }

  const repoName = generateRepoName(resumeId);
  const deploymentInfo = resume.deployment;

  // --- Generate Script Content ---
  const templatePath = path.join(
    __dirname,
    "../portfolio-template/script-template.js"
  );
  const scriptTemplate = await fs.readFile(templatePath, "utf-8");
  const finalScript = scriptTemplate.replace(
    "__RESUME_DATA__",
    JSON.stringify(resumeData, null, 2)
  );

  if (deploymentInfo && deploymentInfo.githubRepo) {
    // --- UPDATE EXISTING REPO ---
    const existingRepoName = deploymentInfo.githubRepo;
    log(`Job ${job.id} updating existing repo: ${existingRepoName}`);

    const { data: fileData } = await octokit.repos.getContent({
      owner: GITHUB_USERNAME,
      repo: existingRepoName,
      path: "script.js",
    });
    await commitFile(
      GITHUB_USERNAME,
      existingRepoName,
      "script.js",
      finalScript,
      fileData.sha
    );
    log(`Job ${job.id} script.js committed → Vercel redeploy triggered`);

    return {
      message: "Update pushed to GitHub. Vercel deployment triggered.",
      url: deploymentInfo.vercelUrl,
    };
  }

  // --- CREATE NEW REPO AND DEPLOY ---
  log(`Job ${job.id} creating new GitHub repo: ${repoName}`);
  const { data: createdRepo } =
    await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: true,
    });

  const repoId = createdRepo.id;

  const htmlContent = await fs.readFile(
    path.join(__dirname, "../portfolio-template/index.html"),
    "utf-8"
  );
  const cssContent = await fs.readFile(
    path.join(__dirname, "../portfolio-template/styles.css"),
    "utf-8"
  );

  await commitFile(GITHUB_USERNAME, repoName, "index.html", htmlContent);
  await commitFile(GITHUB_USERNAME, repoName, "styles.css", cssContent);
  await commitFile(GITHUB_USERNAME, repoName, "script.js", finalScript);
  log(`Job ${job.id} committed 3 files to GitHub repo: ${repoName}`);

  const projectResponse = await fetch("https://api.vercel.com/v9/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    },
    body: JSON.stringify({
      name: repoName,
      gitRepository: {
        type: "github",
        repo: `${GITHUB_USERNAME}/${repoName}`,
      },
    }),
  });

  const projectData = await projectResponse.json();
  if (projectData.error) {
    throw new Error(
      `Vercel project creation failed: ${projectData.error.message}`
    );
  }
  log(`Job ${job.id} Vercel project created: ${repoName}`);

  const deploymentResponse = await fetch(
    "https://api.vercel.com/v13/deployments",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
      body: JSON.stringify({
        name: repoName,
        gitSource: {
          type: "github",
          ref: "main",
          repoId: repoId,
        },
        projectSettings: {
          framework: null,
        },
        target: "production",
      }),
    }
  );

  const deploymentData = await deploymentResponse.json();
  if (deploymentData.error) {
    throw new Error(
      `Vercel deployment trigger failed: ${deploymentData.error.message}`
    );
  }

  const vercelUrl = `https://${repoName}.vercel.app`;
  log(`Job ${job.id} Vercel deployment triggered → ${vercelUrl}`);

  resume.deployment = { githubRepo: repoName, vercelUrl };
  await resume.save();

  await sendInstantEmail(
    userEmail,
    "Portfolio Website hosted",
    `Hello ${user.name}, your portfolio website is deployed on the link: ${vercelUrl}. Please do check it.\nThank you.`
  );

  return {
    message: "New portfolio created and deployed successfully!",
    url: vercelUrl,
  };
}

/**
 * Start the BullMQ worker that processes portfolio deploy jobs.
 * @param {import('ioredis').RedisOptions} redisOpts
 */
export function startDeployWorker(redisOpts) {
  const worker = new Worker("portfolio-deploy", processDeploy, {
    connection: redisOpts,
    concurrency: 3,
  });
  log('Worker started — queue: portfolio-deploy, concurrency: 3');

  worker.on("completed", (job, result) => {
    log(`Job ${job.id} completed — resumeId: ${job.data.resumeId} | URL: ${result?.url ?? 'n/a'}`);
  });

  worker.on("failed", (job, err) => {
    lerr(`Job ${job?.id} failed — resumeId: ${job?.data?.resumeId}:`,
      err.message
    );
  });

  return worker;
}
