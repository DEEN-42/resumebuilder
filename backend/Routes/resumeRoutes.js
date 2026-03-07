import express from "express";
import {
  createResume,
  getSharedList,
  shareResume,
  unshareResume,
  deleteResume,
  getAllResumes,
  loadResumeSocket,
  updateResumeSocket
} from "../Controllers/ResumeDataController.js";
import multer from 'multer';
import { imageUpload } from "../Controllers/imageUpload.js";
import authMiddleware from "../middleware/AuthenticationMIddleware.js";

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Traditional HTTP routes (unchanged)
router.post("/create", authMiddleware, createResume);
router.put("/share/:id", authMiddleware, shareResume);
router.get("/share/:id/sharelist", authMiddleware, getSharedList);
router.put("/unshare/:id", authMiddleware, unshareResume);
router.delete("/delete/:id", authMiddleware, deleteResume);
router.get("/list", authMiddleware, getAllResumes);
router.put('/update/:id/upload', authMiddleware, upload.single('image'), imageUpload);
// Socket-enabled routes for real-time collaboration
router.get("/load/:id", authMiddleware, loadResumeSocket);
router.put("/update/:id", authMiddleware, updateResumeSocket);

export default router;