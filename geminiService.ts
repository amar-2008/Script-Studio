
import { GoogleGenAI } from "@google/genai";
import { Attachment } from "./types";

// --- CONFIGURATION ---
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing!");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key" });

const SYSTEM_INSTRUCTION_CHAT = `
You are AI AMAR, a sophisticated assistant for Amar Moustafa Noufal.
Speak Egyptian Arabic. Be professional, concise, and helpful.
Refuse medical questions politely.
`;

const SYSTEM_INSTRUCTION_CODING = `
You are AMAR CODE, an expert Senior Software Engineer.
Your task is to write clean, efficient, and modern code.
Provide full code solutions, explain complex logic briefly, and debug errors.
Supported languages: Python, TypeScript, JavaScript, C++, HTML/CSS, React.
`;

const SYSTEM_INSTRUCTION_PROMPT = `
You are the "Prompt Master". 
Your goal: Analyze the user request AND ALL attached images in the conversation history.
Output ONLY a high-fidelity, detailed English image generation prompt inside a code block \`\`\`text ... \`\`\`.
Focus on lighting, style, camera angle, and realism.
If the user uploads multiple images, synthesize their styles or content as requested.
`;

export interface GeminiResponse {
  text: string;
  generatedImage?: string; 
  suggestedPrompt?: string;
}

// --- HELPER FUNCTIONS ---
const cleanBase64 = (dataUrl: string) => dataUrl.split(',')[1];

// 1. General Chat
export const sendChatMessage = async (
  prompt: string,
  history: { role: string; parts: any[] }[],
  attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        const model = "gemini-2.5-flash";
        // Map history strictly
        let contents = history.map(h => ({ role: h.role, parts: h.parts }));

        const newParts: any[] = [{ text: prompt || "Analyze this." }];
        if (attachment) {
             const base64Data = cleanBase64(attachment.dataUrl);
             newParts.unshift({ inlineData: { mimeType: attachment.type, data: base64Data } });
        }

        contents.push({ role: 'user', parts: newParts });

        const response = await ai.models.generateContent({
             model: model,
             contents: contents,
             config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT }
        });

        return { text: response.text || "" };
    } catch (error: any) {
        return { text: "حدث خطأ في الاتصال." };
    }
};

// 2. Code Master (was Nano Banana)
export const generateCodeAssistant = async (
  prompt: string,
  history: { role: string; parts: any[] }[],
  attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        const model = 'gemini-2.5-flash'; 
        let contents = history.map(h => ({ role: h.role, parts: h.parts }));

        const newParts: any[] = [{ text: prompt || "Analyze this code/image." }];
        if (attachment) {
            const base64Data = cleanBase64(attachment.dataUrl);
            newParts.unshift({ inlineData: { mimeType: attachment.type, data: base64Data } });
        }
        
        contents.push({ role: 'user', parts: newParts });

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: { systemInstruction: SYSTEM_INSTRUCTION_CODING }
        });

        return { text: response.text || "" };

    } catch (error: any) {
        console.error("Coding Error:", error);
        return { text: "حدث خطأ أثناء كتابة الكود." };
    }
};

// 3. Prompt Engineer
export const engineerPrompt = async (
    userIdea: string,
    history: { role: string; parts: any[] }[], 
    attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        const model = "gemini-2.5-flash";
        
        // Construct content with history to allow multi-image analysis
        // We pass the full parts (including inlineData if it exists in history)
        let contents = history.map(h => ({ role: h.role, parts: h.parts }));

        const newParts: any[] = [{ text: userIdea || "Analyze this image for a prompt." }];
        if (attachment) {
            const base64Data = cleanBase64(attachment.dataUrl);
            newParts.unshift({ inlineData: { mimeType: attachment.type, data: base64Data } });
        }

        contents.push({ role: 'user', parts: newParts });

        const response = await ai.models.generateContent({
             model: model,
             contents: contents,
             config: { systemInstruction: SYSTEM_INSTRUCTION_PROMPT }
        });

        const text = response.text || "";
        let suggestedPrompt = "";
        const codeBlockMatch = text.match(/```text\s*([\s\S]*?)\s*```/);
        suggestedPrompt = codeBlockMatch ? codeBlockMatch[1].trim() : text;

        return { text, suggestedPrompt };

    } catch (error: any) {
        return { text: "حدث خطأ في استخراج البرومبت." };
    }
}
