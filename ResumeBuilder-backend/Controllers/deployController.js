import Resume from "../models/resumeDatamodel.js";
import User from "../models/usermodel.js";
import { getDeployQueue } from "../jobs/deployQueue.js";

let deployQueue;

/** Called once from index.js after Redis opts are known. */
export function initDeployQueue(redisOpts) {
  deployQueue = getDeployQueue(redisOpts);
}

/**
 * POST /deploy/:id
 * Validates the request, enqueues a BullMQ job, and returns the jobId.
 */
export const handleDeploy = async (req, res) => {
  const { id } = req.params;
  const userEmail = req.email;
  const { resumeData } = req.body;

  if (!resumeData) {
    return res.status(400).json({ message: "resumeData is required." });
  }

  try {
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const resume = await Resume.findOne({ id });
    if (!resume) {
      return res.status(404).json({ message: "Resume not found." });
    }

    if (userEmail !== resume.owner) {
      return res
        .status(403)
        .json({ message: "You are not authorized to deploy this resume." });
    }

    const job = await deployQueue.add(
      "deploy",
      { resumeId: id, userEmail, resumeData },
      {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
      }
    );

    return res.status(202).json({
      message: "Deployment job queued.",
      jobId: job.id,
    });
  } catch (error) {
    console.error("Failed to enqueue deployment:", error);
    return res.status(500).json({
      message: "Something went wrong while queuing deployment.",
      error: error.message,
    });
  }
};

/**
 * GET /deploy/status/:jobId
 * Returns the current state of a deploy job so the frontend can poll.
 */
export const getDeployStatus = async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await deployQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    const state = await job.getState();

    if (state === "completed") {
      return res.json({
        status: "completed",
        result: job.returnvalue,
      });
    }

    if (state === "failed") {
      return res.json({
        status: "failed",
        error: job.failedReason,
      });
    }

    // waiting, delayed, active, etc.
    return res.json({ status: state });
  } catch (error) {
    console.error("Failed to get job status:", error);
    return res.status(500).json({
      message: "Failed to retrieve job status.",
      error: error.message,
    });
  }
};
