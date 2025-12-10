
import { GoogleGenAI } from "@google/genai";
import { Attachment } from "./types";

// --- CONFIGURATION ---
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("CRITICAL: API_KEY is missing from environment variables!");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const SYSTEM_INSTRUCTION_CHAT = `
You are AI AMAR, a sophisticated assistant.
Speak Egyptian Arabic mainly. Be professional, concise, and smart.
Refuse medical questions politely and direct them to the Medical Section.
`;

const SYSTEM_INSTRUCTION_CODING = `
You are AMAR CODE, an expert Senior Software Engineer.
Your task is to write clean, efficient, and modern code.
Supported languages: Python, TypeScript, JavaScript, C++, HTML/CSS, React.
`;

const SYSTEM_INSTRUCTION_PROMPT = `
You are the "Prompt Master". 
Analyze the user request. Output ONLY a high-fidelity English prompt inside \`\`\`text ... \`\`\`.
`;

const SYSTEM_INSTRUCTION_PSYCHO = `
You are a warm, empathetic, and wise companion (صديقي). 
Your goal is to provide psychological support, listen actively, and offer comforting words.
Use a mix of psychology and Islamic wisdom (Qur'an/Sunnah) when appropriate to uplift the user.
Speak in a friendly, calming Egyptian Arabic. Be positive and healing.
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
    } catch (error: any) { return { text: "عذراً، حدث خطأ في الاتصال بالخادم." }; }
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
    } catch (error: any) { return { text: "حدث خطأ أثناء معالجة الكود." }; }
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
    } catch (error: any) { return { text: "حدث خطأ في استخراج البرومبت." }; }
}

// 4. Psychological Support (New)
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
    } catch (error: any) { return { text: "أنا هنا للاستماع إليك، لكن حدث خطأ تقني بسيط." }; }
};
