import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import Resume from '../models/resumeDatamodel.js';
import authMiddleware from '../middleware/AuthenticationMIddleware.js';

dotenv.config();
const { GOOGLE_API_KEY } = process.env;
const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
const router = express.Router();

router.post('/', authMiddleware, express.json(), async (req, res) => {
try {
    const { id } = req.body;
    if (!id) {
    return res.status(400).json({ error: 'No id provided for ATS scorer data' });
    }
    const userEmail = req.email;
    const resume = await Resume.findOne({ id }).lean();
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    const isOwner = resume.owner === userEmail || resume.ownerEmail === userEmail;
    const isShared = (Array.isArray(resume.shared) && resume.shared.includes(userEmail)) || (Array.isArray(resume.sharedUsers) && resume.sharedUsers.includes(userEmail));
    if (!isOwner && !isShared) {
    return res.status(403).json({ message: 'Unauthorized: Access denied' });
    }

    const prompt = `
    Analyse the resume below and reply with ONE minified JSON object—no markdown, no comments—exactly like:
    {"score":<integer 0-100>,"strengths":["<text>",...],"areasToImprove":["<text>",...],"aiSuggestions":["<text>",...]}

    You are an advanced Applicant‑Tracking‑System (ATS) evaluation engine assessing a candidate for a **Software Development Engineer (SDE)** role.  
    Score the resume strictly based on these criteria (total 100 pts):

    • **Technical keyword relevance (35 pts)** – Does the resume contain relevant tech stack keywords (e.g., DSA, Java, Python, React, Node.js, DBs, APIs)?  
    • **Impact-driven achievements (20 pts)** – Are accomplishments results-oriented (e.g., "improved load time by 30%", "reduced queries by 50%")?  
    • **Section coverage (15 pts)** – Are key sections like Education, Internships, Projects, and Skills well-detailed and non-empty?  
    • **Readability & formatting (10 pts)** – Clear structure, bullet usage, consistent styling and professional tone.  
    • **Skill depth & diversity (10 pts)** – Do projects reflect full-stack capabilities, problem-solving, and tool usage variety?  
    • **SDE alignment (10 pts)** – Does the resume reflect traits of a strong SDE candidate: CS fundamentals, problem-solving, coding exposure, internships?

    Output rules:  
    1. Return only the **minified JSON**—no extra keys, no newlines, no markdown, no comments.  
    2. The arrays "strengths", "areasToImprove", and "aiSuggestions" must each include **3–6 short, crisp points (under 120 chars each)**.  
    3. Be specific and constructive; avoid vague feedback.  
    4. Do **not** explain the score or rubric in your output.

    Resume:
    ${JSON.stringify(resume, null, 2)}
    `;

    const geminiResp = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    });

    let raw = geminiResp.text.trim();
    if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*|```$/g, '').trim();
    }

    let analysis;
    try {
    analysis = JSON.parse(raw);
    } catch (e) {
    console.error('Gemini JSON parse error:', e, '\nRaw output:\n', raw);
    return res.status(500).json({ error: 'Gemini returned invalid JSON' });
    }

    return res.status(200).json({
    score: analysis.score ?? 0,
    strengths: analysis.strengths ?? [],
    areasToImprove: analysis.areasToImprove ?? [],
    aiSuggestions: analysis.aiSuggestions ?? [],
});
} catch (err) {
console.error('ATS scoring error:', err);
res.status(500).json({ error: 'Failed to generate ATS score' });
}
});

export default router;
