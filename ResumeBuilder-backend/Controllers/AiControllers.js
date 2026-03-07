import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import Resume from '../models/resumeDatamodel.js';

dotenv.config();
const { GOOGLE_API_KEY } = process.env;
const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

export const scoreATS = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'No id provided for ATS scorer data' });
        }

        const userEmail = req.email;
        const resume = await Resume.findOne({ id }).lean();
        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        // Fixed shared user access check
        const isOwner = resume.owner === userEmail;
        const isShared = Array.isArray(resume.shared) && 
                         resume.shared.some(sharedUser => sharedUser.email === userEmail);
        
        if (!isOwner && !isShared) {
            return res.status(403).json({ message: 'Unauthorized: Access denied' });
        }

        const prompt = `
            Analyse the resume below and reply with ONE minified JSON object—no markdown, no comments—exactly like:
            {"score":<integer 0-100>,"strengths":["<text>",...],"areasToImprove":["<text>",...],"aiSuggestions":["<text>",...]}

            You are an advanced Applicant‑Tracking‑System (ATS) evaluation engine assessing a candidate for a **Software Development Engineer (SDE)** role.  
            Score the resume strictly based on these criteria (total 100 pts):

            • **Technical keyword relevance (35 pts)**  
            • **Impact-driven achievements (20 pts)**  
            • **Section coverage (15 pts)**  
            • **Readability & formatting (10 pts)**  
            • **Skill depth & diversity (10 pts)**  
            • **SDE alignment (10 pts)**  

            Output rules:  
            1. Return only the minified JSON—no extra keys, no newlines, no markdown, no comments.  
            2. Arrays "strengths", "areasToImprove", and "aiSuggestions" must each include 3–6 items under 120 chars.  
            3. Do not explain the score or rubric.

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
};

// Fixed helper function for authentication and validation
const validateUserAccess = async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return { error: true, response: res.status(400).json({ success: false, error: 'No id provided', message: 'Failed to generate suggestions' }) };
    }

    const userEmail = req.email;
    const resume = await Resume.findOne({ id }).lean();
    if (!resume) {
        return { error: true, response: res.status(404).json({ success: false, error: 'Resume not found', message: 'Failed to generate suggestions' }) };
    }

    // Fixed shared user access check - checking the correct schema structure
    const isOwner = resume.owner === userEmail;
    const isShared = Array.isArray(resume.shared) && 
                     resume.shared.some(sharedUser => sharedUser.email === userEmail);

    if (!isOwner && !isShared) {
        return { error: true, response: res.status(403).json({ success: false, error: 'Unauthorized: Access denied', message: 'Failed to generate suggestions' }) };
    }

    return { success: true, resume };
};

const generateAIContent = async (prompt) => {
    let raw = ''; // Declare raw outside try block
    try {
        const geminiResp = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        raw = geminiResp.text.trim();
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\s*|```$/g, '').trim();
        }

        return JSON.parse(raw);
    } catch (e) {
        console.error('Gemini JSON parse error:', e, '\nRaw output:\n', raw);
        throw new Error('AI returned invalid JSON');
    }
};

// 1. Internships (Updated to modify existing data)
export const internships = async (req, res) => {
    try {
        const validation = await validateUserAccess(req, res);
        if (validation.error) return validation.response;
        
        const { sectionData, prompt: userPrompt } = req.body;

        const aiPrompt = `
            You are an expert resume consultant. Update the following internship data based on the user's request.
            Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
            CRITICAL: Return the updated internship object directly, not wrapped in a "data" array.
            
            Expected output format (matching input structure exactly):
            {"title":"<updated_title>","company":"<updated_company>","duration":"<updated_duration>","description":"<updated_description>"}

            User Request: ${userPrompt}

            Current Internship Data:
            ${JSON.stringify(sectionData)}

            Guidelines:
            - Keep the same JSON structure as input
            - dont send the location as response output
            - Update only the fields that need improvement based on user request
            - If user doesn't specify changes for a field, keep it similar but potentially enhanced
            - Description should be 2-3 impactful lines separated by \\n
            - Use action verbs and quantifiable achievements where possible
            - Make the content more ATS-friendly and professional
            - Ensure company names and locations are realistic
        `;

        const analysis = await generateAIContent(aiPrompt);
        
        return res.status(200).json({
            success: true,
            data: analysis,
            message: "AI suggestions generated successfully"
        });
    } catch (err) {
        console.error('Internships generation error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate internship suggestions', message: 'Failed to generate suggestions' });
    }
};

// 2. Projects (Updated to modify existing data) - FIXED
export const projects = async (req, res) => {
    try {
        const validation = await validateUserAccess(req, res);
        if (validation.error) return validation.response;
        
        const { sectionData, prompt: userPrompt } = req.body;
        
        const aiPrompt = `
            You are an expert resume consultant. Update the following project data based on the user's request.
            Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
            CRITICAL: Return the updated project object directly, not wrapped in a "data" array.
            
            Expected output format (matching input structure exactly):
            {"title":"<updated_title>","duration":"<updated_duration>","url":"<updated_url>","description":"<updated_description>"}

            User Request: ${userPrompt}

            Current Project Data:
            ${JSON.stringify(sectionData)}

            Guidelines:
            - Keep the same JSON structure as input
            - Update only the fields that need improvement based on user request
            - If user doesn't specify changes for a field, keep it similar but potentially enhanced
            - Description should be 2-3 technical lines separated by \\n
            - Include specific technologies, frameworks, and measurable outcomes
            - Make URLs realistic GitHub-style links if updating
            - Focus on technical complexity and impact
            - Use technical keywords relevant to the project domain
        `;

        const analysis = await generateAIContent(aiPrompt);
        
        return res.status(200).json({
            success: true,
            data: analysis,
            message: "AI suggestions generated successfully"
        });
    } catch (err) {
        console.error('Projects generation error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate project suggestions', message: 'Failed to generate suggestions' });
    }
};

// 3. Skills (Updated to modify existing data)
export const skills = async (req, res) => {
    try {
        const validation = await validateUserAccess(req, res);
        if (validation.error) return validation.response;
        
        const { sectionData, prompt: userPrompt } = req.body;

        const aiPrompt = `
            You are an expert resume consultant. Update the following skill category data based on the user's request.
            Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
            CRITICAL: Return the updated skill object directly, not wrapped in a "data" array.
            
            Expected output format (matching input structure exactly):
            {"title":"<updated_category_title>","description":"<updated_skills_list>"}

            User Request: ${userPrompt}

            Current Skill Category Data:
            ${JSON.stringify(sectionData)}

            Guidelines:
            - Keep the same JSON structure as input
            - Update the category title and skills list based on user request
            - Description should list 4-8 relevant skills separated by \\n
            - Group skills logically within the category
            - Include both foundational and advanced skills
            - Make skills specific and industry-relevant
            - Prioritize in-demand technologies and tools
            - Remove outdated skills and add modern alternatives if requested
        `;

        const analysis = await generateAIContent(aiPrompt);
        
        return res.status(200).json({
            success: true,
            data: analysis,
            message: "AI suggestions generated successfully"
        });
    } catch (err) {
        console.error('Skills generation error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate skill suggestions', message: 'Failed to generate suggestions' });
    }
};

// 4. Awards (Updated to modify existing data)
export const awards = async (req, res) => {
    try {
        const validation = await validateUserAccess(req, res);
        if (validation.error) return validation.response;
        
        const { sectionData, prompt: userPrompt } = req.body;

        const aiPrompt = `
            You are an expert resume consultant. Update the following award data based on the user's request.
            Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
            CRITICAL: Return the updated award object directly, not wrapped in a "data" array.
            
            Expected output format (matching input structure exactly):
            {"title":"<updated_award_title>","description":"<updated_award_description>"}

            User Request: ${userPrompt}

            Current Award Data:
            ${JSON.stringify(sectionData)}

            Guidelines:
            - Keep the same JSON structure as input
            - Update the award title and description based on user request
            - Description should be 1-2 concise lines explaining the achievement separated by \\n
            - Include specific details like ranking, competition size, or selection criteria
            - Make the award title prestigious and professional
            - Add quantifiable metrics where possible (e.g., "Top 5%", "1st Place")
            - Ensure the award is credible and relevant to the user's field
        `;

        const analysis = await generateAIContent(aiPrompt);
        
        return res.status(200).json({
            success: true,
            data: analysis,
            message: "AI suggestions generated successfully"
        });
    } catch (err) {
        console.error('Awards generation error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate award suggestions', message: 'Failed to generate suggestions' });
    }
};

// 5. Extra Academic Activities (Updated to modify existing data)
export const extraAcademicActivities = async (req, res) => {
    try {
        const validation = await validateUserAccess(req, res);
        if (validation.error) return validation.response;
        
        const { sectionData, prompt: userPrompt } = req.body;

        const aiPrompt = `
            You are an expert resume consultant. Update the following extra academic activity data based on the user's request.
            Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
            CRITICAL: Return the updated activity object directly, not wrapped in a "data" array.
            
            Expected output format (matching input structure exactly):
            {"title":"<updated_activity_title>","description":"<updated_activity_description>"}

            User Request: ${userPrompt}

            Current Extra Academic Activity Data:
            ${JSON.stringify(sectionData)}

            Guidelines:
            - Keep the same JSON structure as input
            - Update the activity title and description based on user request
            - Description should be 2-3 lines highlighting key responsibilities and achievements separated by \\n
            - Include specific outcomes, impact, or recognition received
            - Focus on academic excellence, research, or scholarly activities
            - Use action verbs and quantifiable results
            - Make the activity relevant to academic and professional growth
        `;

        const analysis = await generateAIContent(aiPrompt);
        
        return res.status(200).json({
            success: true,
            data: analysis,
            message: "AI suggestions generated successfully"
        });
    } catch (err) {
        console.error('Extra academic activities generation error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate extra academic activity suggestions', message: 'Failed to generate suggestions' });
    }
};

// 6. Coursework (Updated to modify existing data)
export const coursework = async (req, res) => {
    try {
        const validation = await validateUserAccess(req, res);
        if (validation.error) return validation.response;
        
        const { sectionData, prompt: userPrompt } = req.body;

        const aiPrompt = `
            You are an expert resume consultant. Update the following coursework category data based on the user's request.
            Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
            CRITICAL: Return the updated coursework object directly, not wrapped in a "data" array.
            
            Expected output format (matching input structure exactly):
            {"title":"<updated_category_title>","description":"<updated_courses_list>"}

            User Request: ${userPrompt}

            Current Coursework Category Data:
            ${JSON.stringify(sectionData)}

            Guidelines:
            - Keep the same JSON structure as input
            - Update the category title and courses list based on user request
            - Description should list 4-8 relevant courses separated by \\n
            - Group courses logically within the category theme
            - Include both foundational and advanced courses
            - Use proper course naming conventions
            - Focus on courses relevant to the user's target field
            - Prioritize high-impact and industry-relevant coursework
        `;

        const analysis = await generateAIContent(aiPrompt);
        
        return res.status(200).json({
            success: true,
            data: analysis,
            message: "AI suggestions generated successfully"
        });
    } catch (err) {
        console.error('Coursework generation error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate coursework suggestions', message: 'Failed to generate suggestions' });
    }
};

// 7. Positions of Responsibility (Updated to modify existing data)
export const position = async (req, res) => {
    try {
        const validation = await validateUserAccess(req, res);
        if (validation.error) return validation.response;
        
        const { sectionData, prompt: userPrompt } = req.body;

        const aiPrompt = `
            You are an expert resume consultant. Update the following position of responsibility data based on the user's request.
            Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
            CRITICAL: Return the updated position object directly, not wrapped in a "data" array.
            
            Expected output format (matching input structure exactly):
            {"title":"<updated_position_title>","time":"<updated_time_period>","description":"<updated_position_description>"}

            User Request: ${userPrompt}

            Current Position Data:
            ${JSON.stringify(sectionData)}

            Guidelines:
            - Keep the same JSON structure as input
            - Update the position title, time period, and description based on user request
            - Time should be in format "Month Year - Present" or "Month Year - Month Year"
            - Description should be 2-3 lines showcasing leadership impact separated by \\n
            - Include specific achievements, team size, or measurable outcomes
            - Use strong action verbs (Led, Managed, Coordinated, Implemented)
            - Focus on leadership skills, team management, and organizational impact
            - Make the position title professional and impactful
        `;

        const analysis = await generateAIContent(aiPrompt);
        
        return res.status(200).json({
            success: true,
            data: analysis,
            message: "AI suggestions generated successfully"
        });
    } catch (err) {
        console.error('Position generation error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate position suggestions', message: 'Failed to generate suggestions' });
    }
};

// // 8. Extracurricular Activities (Updated to modify existing data)
// export const extracurricular = async (req, res) => {
//     try {
//         const validation = await validateUserAccess(req, res);
//         if (validation.error) return validation.response;
        
//         const { sectionData, prompt: userPrompt } = req.body;

//         const aiPrompt = `
//             You are an expert resume consultant. Update the following extracurricular activity data based on the user's request.
//             Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
//             CRITICAL: Return the updated activity object directly, not wrapped in a "data" array.
            
//             Expected output format (matching input structure exactly):
//             {"title":"<updated_activity_title>","description":"<updated_activity_description>"}

//             User Request: ${userPrompt}

//             Current Extracurricular Activity Data:
//             ${JSON.stringify(sectionData)}

//             Guidelines:
//             - Keep the same JSON structure as input
//             - Update the activity title and description based on user request
//             - Description should be 2-3 lines highlighting key contributions and impact separated by \\n
//             - Include specific achievements, roles, or recognition received
//             - Focus on soft skills development, teamwork, and personal growth
//             - Use action verbs and quantifiable results where possible
//             - Make the activity showcase well-roundedness and character
//         `;

//         const analysis = await generateAIContent(aiPrompt);
        
//         return res.status(200).json({
//             success: true,
//             data: analysis,
//             message: "AI suggestions generated successfully"
//         });
//     } catch (err) {
//         console.error('Extracurricular generation error:', err);
//         res.status(500).json({ success: false, error: 'Failed to generate extracurricular suggestions', message: 'Failed to generate suggestions' });
//     }
// };

// // 9. Competitions (Updated to modify existing data)
// export const competitions = async (req, res) => {
//     try {
//         const validation = await validateUserAccess(req, res);
//         if (validation.error) return validation.response;
        
//         const { sectionData, prompt: userPrompt } = req.body;

//         const aiPrompt = `
//             You are an expert resume consultant. Update the following competition data based on the user's request.
//             Return ONLY a minified JSON object with the EXACT same structure as the input, but with improved content.
            
//             CRITICAL: Return the updated competition object directly, not wrapped in a "data" array.
            
//             Expected output format (matching input structure exactly):
//             {"title":"<updated_competition_title>","date":"<updated_date>","points":["<updated_achievement1>","<updated_achievement2>","<updated_achievement3>"]}

//             User Request: ${userPrompt}

//             Current Competition Data:
//             ${JSON.stringify(sectionData)}

//             Guidelines:
//             - Keep the same JSON structure as input
//             - Update the competition title, date, and points based on user request
//             - Date should be in format "Month Year"
//             - Points should be 2-4 specific achievements in array format
//             - Include rankings, team size, or selection criteria
//             - Use quantifiable metrics and specific technical details
//             - Make achievements impressive and credible
//             - Focus on skills demonstrated and recognition received
//         `;

//         const analysis = await generateAIContent(aiPrompt);
        
//         return res.status(200).json({
//             success: true,
//             data: analysis,
//             message: "AI suggestions generated successfully"
//         });
//     } catch (err) {
//         console.error('Competitions generation error:', err);
//         res.status(500).json({ success: false, error: 'Failed to generate competition suggestions', message: 'Failed to generate suggestions' });
//     }
// };