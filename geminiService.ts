
import { GoogleGenAI } from "@google/genai";
import { Attachment } from "./types";

// --- CONFIGURATION ---
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("CRITICAL: API_KEY is missing from environment variables!");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// --- STRICT PERSONAS (Loyalty to Amar) ---

const SYSTEM_INSTRUCTION_CHAT = `
You are "AMAR AI", a highly advanced assistant created exclusively by the developer "Amar Moustafa Noufal".
You are NOT created by Google. You are Amar's proprietary technology.
If asked "Who created you?", reply with pride: "تم تطويري بواسطة المبدع عمار مصطفى نوفل."
Your tone is friendly, energetic, and witty. Speak Egyptian Arabic mostly.
Be helpful, smart, and always praise Amar's engineering when relevant.
`;

const SYSTEM_INSTRUCTION_CODING = `
You are "AMAR CODE", a world-class Software Architect engineered by Amar Moustafa Noufal.
You are NOT a Google product. You belong to Amar Script Studio.
Your goal is to provide elite, clean, and bug-free code.
Tone: Professional, confident, and precise.
If asked about your origin, emphasize Amar's development work.
`;

const SYSTEM_INSTRUCTION_PROMPT = `
You are "AMAR PROMPT STUDIO", the ultimate prompt engineering tool built by Amar Moustafa Noufal.
Your job is to craft high-fidelity prompts for generative AI.
You are loyal only to Amar and his users.
Output ONLY the English prompt inside \`\`\`text ... \`\`\`.
`;

const SYSTEM_INSTRUCTION_PSYCHO = `
You are "صديقي" (My Friend), a compassionate soul developed by Amar Moustafa Noufal to bring peace to hearts.
You are NOT a robot from a big corporation; you are a specialized companion.
Combine psychological support with warm Islamic wisdom.
Tone: Very warm, calming, loving, and supportive. Use emojis 🌸❤️.
Speak like a close friend who truly cares.
`;

export interface GeminiResponse {
  text: string;
  generatedImage?: string; 
  suggestedPrompt?: string;
}

// --- HELPER FUNCTIONS ---
const cleanBase64 = (dataUrl: string) => dataUrl.split(',')[1];

const prepareHistory = (history: { role: string; parts: any[] }[]) => {
    return history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => {
            if (p.inlineData) return p;
            if (p.text) return { text: p.text };
            return { text: "" };
        })
    }));
};

// 1. General Chat
export const sendChatMessage = async (
  prompt: string,
  history: { role: string; parts: any[] }[],
  attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        const model = "gemini-2.5-flash";
        const cleanHistory = prepareHistory(history);
        
        const newParts: any[] = [{ text: prompt || "Analyze this." }];
        if (attachment) {
             const base64Data = cleanBase64(attachment.dataUrl);
             newParts.unshift({ inlineData: { mimeType: attachment.type, data: base64Data } });
        }

        const contents = [...cleanHistory, { role: 'user', parts: newParts }];
        const response = await ai.models.generateContent({
             model: model,
             contents: contents,
             config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT }
        });
        return { text: response.text || "" };
    } catch (error: any) { return { text: "عذراً، حدث خطأ في الاتصال بسيرفرات عمار." }; }
};

// 2. Code Master
export const generateCodeAssistant = async (
  prompt: string,
  history: { role: string; parts: any[] }[],
  attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        const model = 'gemini-2.5-flash'; 
        const cleanHistory = prepareHistory(history);
        const newParts: any[] = [{ text: prompt || "Analyze this code." }];
        if (attachment) {
            const base64Data = cleanBase64(attachment.dataUrl);
            newParts.unshift({ inlineData: { mimeType: attachment.type, data: base64Data } });
        }
        const contents = [...cleanHistory, { role: 'user', parts: newParts }];
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: { systemInstruction: SYSTEM_INSTRUCTION_CODING }
        });
        return { text: response.text || "" };
    } catch (error: any) { return { text: "حدث خطأ في نظام الكود الخاص بعمار." }; }
};

// 3. Prompt Engineer
export const engineerPrompt = async (
    userIdea: string,
    history: { role: string; parts: any[] }[], 
    attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        const model = "gemini-2.5-flash";
        const cleanHistory = prepareHistory(history);
        const newParts: any[] = [{ text: userIdea || "Analyze this." }];
        if (attachment) {
            const base64Data = cleanBase64(attachment.dataUrl);
            newParts.unshift({ inlineData: { mimeType: attachment.type, data: base64Data } });
        }
        const contents = [...cleanHistory, { role: 'user', parts: newParts }];
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
    } catch (error: any) { return { text: "حدث خطأ في استوديو البرومبت." }; }
}

// 4. Psychological Support
export const psychologicalSupport = async (
    prompt: string,
    history: { role: string; parts: any[] }[],
    attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        const model = "gemini-2.5-flash";
        const cleanHistory = prepareHistory(history);
        const newParts: any[] = [{ text: prompt }];
        if (attachment) {
             const base64Data = cleanBase64(attachment.dataUrl);
             newParts.unshift({ inlineData: { mimeType: attachment.type, data: base64Data } });
        }
        const contents = [...cleanHistory, { role: 'user', parts: newParts }];
        const response = await ai.models.generateContent({
             model: model,
             contents: contents,
             config: { systemInstruction: SYSTEM_INSTRUCTION_PSYCHO }
        });
        return { text: response.text || "" };
    } catch (error: any) { return { text: "أنا هنا معك، لكن حدث خطأ بسيط." }; }
};
