import express from "express";
import { handleDeploy, getDeployStatus } from "../Controllers/deployController.js";
import authMiddleware from "../middleware/AuthenticationMIddleware.js";

const router = express.Router();

router.post("/:id", authMiddleware, handleDeploy);
router.get("/status/:jobId", authMiddleware, getDeployStatus);

export default router;
