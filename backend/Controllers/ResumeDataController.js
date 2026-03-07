import Resume from "../models/resumeDatamodel.js";
import User from "../models/usermodel.js";
import { v4 as uuidv4 } from "uuid";
import { sendInstantEmail } from "./mailFunctionality.js";
// 1. Get all resumes (owned and shared)
export const fetchResumesForUser = async (email) => {
  const owned = await Resume.find({ owner: email }).select(
    "id title description"
  );
  const shared = await Resume.find({ "shared.email": email }).select(
    "id title description"
  );

  return {
    owned: owned.map((doc) => ({ ...doc._doc, type: "owned" })),
    shared: shared.map((doc) => ({ ...doc._doc, type: "shared" })),
  };
};

// ✅ 2. Route Handler: for GET /resumes/list
export const getAllResumes = async (req, res) => {
  try {
    const email = req.email;
    // console.log(email);
    const data = await fetchResumesForUser(email);
    // console.log(data);
    res.status(200).json(data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch resumes", error: error.message });
  }
};

// 2. Delete a resume (only owner)
export const deleteResume = async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.email;

    const resume = await Resume.findOne({ id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (resume.owner !== email) {
      return res.status(403).json({ message: "Unauthorized: Not the owner" });
    }

    await resume.deleteOne();
    const userData = await fetchResumesForUser(email);
    res.status(200).json({ message: "Resume deleted successfully", userData });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
};

// 3. Update a resume (only owner) - Original HTTP version
export const updateResume = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userEmail = req.email;

    const resume = await Resume.findOne({ id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (
      resume.owner !== userEmail &&
      !resume.shared.some((user) => user.email === userEmail)
    ) {
      return res.status(403).json({ message: "Unauthorized: Access Denied" });
    }

    Object.assign(resume, updates);
    await resume.save();

    res.status(200).json({ message: "Resume updated", resume });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

// 4. Share a resume (add email to `shared`)
export const shareResume = async (req, res) => {
  try {
    const { id } = req.params;
    const { sharedemail: targetEmail } = req.body;
    const ownerEmail = req.email;

    // Check if the user exists
    const targetUser = await User.findOne({ email: targetEmail });
    if (!targetUser) {
      return res.status(404).json({
        message: "User not found. Cannot share resume with unregistered user.",
      });
    }

    const resume = await Resume.findOne({ id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (resume.owner !== ownerEmail) {
      return res.status(403).json({ message: "Unauthorized: Not the owner" });
    }

    // Check if user is already in shared list
    const isAlreadyShared = resume.shared.some(
      (user) => user.email === targetEmail
    );
    if (!isAlreadyShared) {
      resume.shared.push({
        email: targetUser.email,
        name: targetUser.name,
        profilePicture: targetUser.profilePicture,
      });
      await resume.save();
    }
    let result = await sendInstantEmail(
      targetEmail,
      "Resume Shared",
      `Hello ${targetUser.name},${ownerEmail} has shared ${resume.title} with you. Please check it. Thank you`
    );
    if (!result.success) {
      res
        .status(500)
        .json({ message: "Failed to send email", error: result.error });
    }

    res.status(200).json({
      message: "Resume shared successfully",
      sharedUsers: resume.shared.map((user) => ({
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
      })),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to share resume", error: error.message });
  }
};

export const getSharedList = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.email;
    const resume = await Resume.findOne({ id });

    if (!resume) {
      return res
        .status(404)
        .json({ message: "Resume not found", sharedUsers: [] });
    }

    if (resume.owner !== userEmail) {
      return res.status(200).json({
        message: "You are not the owner, so the share list is hidden.",
        sharedUsers: [],
      });
    }

    // Update shared user details before returning the list
    let hasUpdates = false;

    for (let i = 0; i < resume.shared.length; i++) {
      const sharedUser = resume.shared[i];

      // Fetch the latest user details from the database
      const latestUserDetails = await User.findOne({ email: sharedUser.email });

      if (latestUserDetails) {
        // Check if any details need updating
        if (
          sharedUser.name !== latestUserDetails.name ||
          sharedUser.profilePicture !== latestUserDetails.profilePicture
        ) {
          // Update the shared user details
          resume.shared[i] = {
            email: latestUserDetails.email,
            name: latestUserDetails.name,
            profilePicture: latestUserDetails.profilePicture,
          };
          hasUpdates = true;
        }
      }
    }

    // Save the resume if there were any updates
    if (hasUpdates) {
      await resume.save();
    }

    const sharedUsers = resume.shared.map((user) => ({
      email: user.email,
      name: user.name,
      profilePicture: user.profilePicture,
    }));

    return res.status(200).json({ sharedUsers });
  } catch (error) {
    console.error("Failed to fetch shared users:", error);
    return res.status(500).json({
      message: "Failed to fetch shared users",
      error: error.message,
      sharedUsers: [],
    });
  }
};

// 5. Unshare a resume (remove email from `shared`)
export const unshareResume = async (req, res) => {
  try {
    const { id } = req.params;
    const { email: targetEmail } = req.body;
    const ownerEmail = req.email;

    const resume = await Resume.findOne({ id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (resume.owner !== ownerEmail) {
      return res.status(403).json({ message: "Unauthorized: Not the owner" });
    }

    resume.shared = resume.shared.filter((user) => user.email !== targetEmail);
    await resume.save();

    const sharedUsers = resume.shared.map((user) => ({
      email: user.email,
      name: user.name,
      profilePicture: user.profilePicture,
    }));

    res.status(200).json({
      message: "Resume unshared successfully",
      sharedUsers,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to unshare resume", error: error.message });
  }
};

// 6. Load a resume (only owner or shared) - Original HTTP version
export const loadResume = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.email;
    const resume = await Resume.findOne({ id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (
      resume.owner !== userEmail &&
      !resume.shared.some((user) => user.email === userEmail)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ resume });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to load resume", error: error.message });
  }
};

// Socket-enabled Load Resume
export const loadResumeSocket = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.email;
    const resume = await Resume.findOne({ id })
      .select('id owner shared deployment')
      .lean();
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (
      resume.owner !== userEmail &&
      !resume.shared.some((user) => user.email === userEmail)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    // Return minimal metadata — actual resume data arrives via Yjs sync
    res.status(200).json({
      resume: { deployment: resume.deployment },
      yjsEnabled: true,
      message: "Resume loaded. Connect to /yjs WS for real-time CRDT collaboration.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to load resume", error: error.message });
  }
};

// Socket-enabled Update Resume
export const updateResumeSocket = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userEmail = req.email;
    const resume = await Resume.findOne({ id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (
      resume.owner !== userEmail &&
      !resume.shared.some((user) => user.email === userEmail)
    ) {
      return res.status(403).json({ message: "Unauthorized: Access Denied" });
    }
    // Update the resume in database
    Object.assign(resume, updates);
    await resume.save();
    // Get socket.io instance
    const io = req.app.get("io");

    // Broadcast the update to all users in the room except the sender
    io.to(id).emit("resume-updated", {
      // <— fixed
      updates,
      updatedBy: userEmail,
      timestamp: new Date(),
    });

    res.status(200).json({
      message: "Resume updated and broadcasted",
      resume,
      socketEnabled: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

export const createResume = async (req, res) => {
  try {
    const ownerEmail = req.email;

    const {
      title,
      description = "",
      selectedTemplate = "iitkg",
      globalStyles = {},
      resumeData = {},
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const newResume = new Resume({
      title,
      description,
      owner: ownerEmail,
      selectedTemplate,
      globalStyles,
      resumeData,
      shared: [],
    });

    const savedResume = await newResume.save();
    // Fetch updated user data after creating the resume
    const userData = await fetchResumesForUser(ownerEmail);
    res.status(201).json({
      message: "Resume created successfully",
      userData,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create resume",
      error: error.message,
    });
  }
};
