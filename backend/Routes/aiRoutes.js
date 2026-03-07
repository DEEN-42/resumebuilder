import express from 'express';
import authMiddleware from '../middleware/AuthenticationMIddleware.js';
import { scoreATS,internships,position, projects, skills, awards, extraAcademicActivities, coursework } from '../Controllers/AiControllers.js';

const router = express.Router();

router.post('/atsScore', authMiddleware, express.json(), scoreATS);
router.post('/internships', authMiddleware, express.json(), internships);
router.post('/projects', authMiddleware, express.json(), projects);
router.post('/skills', authMiddleware, express.json(), skills);
router.post('/awards', authMiddleware, express.json(), awards);
router.post('/extraAcademicActivities', authMiddleware, express.json(), extraAcademicActivities);
router.post('/coursework', authMiddleware, express.json(), coursework);
router.post('/position', authMiddleware, express.json(), position);

export default router;
