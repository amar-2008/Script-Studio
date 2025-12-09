
import { GoogleGenAI } from "@google/genai";
import { Attachment } from "./types";

// --- CONFIGURATION ---
// Safety Check: Avoid app crash if key is missing
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing! Check your Vercel Environment Variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key_to_prevent_crash" });

const SYSTEM_INSTRUCTION_CHAT = `
You are AI AMAR, an exclusive, high-end AI assistant developed by عمار مصطفى نوفل.
Speak mainly in Egyptian Arabic. Be friendly, witty, and professional.
If asked about health/medicine, REFUSE and refer to the medical app.
`;

const SYSTEM_INSTRUCTION_PROMPT = `
You are the "Prompt Master". Convert user ideas into High-Fidelity English Image Prompts inside a code block.
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
  history: { role: string; parts: { text: string }[] }[],
  attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        if (!apiKey) throw new Error("API Key invalid");
        const model = "gemini-2.5-flash";
        let contents = [];

        contents = history.map(h => ({
            role: h.role,
            parts: h.parts
        }));

        if (attachment) {
             const base64Data = cleanBase64(attachment.dataUrl);
             contents.push({
                 role: 'user',
                 parts: [
                     { inlineData: { mimeType: attachment.type, data: base64Data } },
                     { text: prompt || "Analyze this file content." }
                 ]
             });
        } else {
             contents.push({ role: 'user', parts: [{ text: prompt }] });
        }

        const response = await ai.models.generateContent({
             model: model,
             contents: contents,
             config: { systemInstruction: SYSTEM_INSTRUCTION_CHAT }
        });

        return { text: response.text || "" };
    } catch (error: any) {
        console.error("Chat Error:", error);
        return { text: "حدث خطأ في الاتصال، تأكد من مفتاح الـ API." };
    }
};

// 2. Nano Banana Image Studio
export const generateImageWithNano = async (
  prompt: string,
  history: { role: string; parts: { text: string }[] }[],
  baseImage?: Attachment
): Promise<GeminiResponse> => {
    try {
        if (!apiKey) throw new Error("API Key invalid");
        const model = 'gemini-2.5-flash-image'; 
        let contentsPayload = [];
        
        let previousContextText = "";
        if (history.length > 0) {
            previousContextText = history.slice(-4).map(h => `${h.role === 'user' ? 'User' : 'Model'}: ${h.parts[0].text}`).join('\n');
        }

        if (baseImage) {
            const base64Data = cleanBase64(baseImage.dataUrl);
            contentsPayload = [
                { inlineData: { mimeType: baseImage.type || "image/jpeg", data: base64Data } },
                { text: (previousContextText ? `Previous Conversation:\n${previousContextText}\n\n` : "") + `Instruction: ${prompt}` }
            ];
        } else {
            contentsPayload = [
                { text: (previousContextText ? `Previous Conversation:\n${previousContextText}\n\n` : "") + `Create an image based on: ${prompt}` }
            ];
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: contentsPayload },
        });

        let imgData = null;
        let txtData = "تم إنشاء الصورة بنجاح (AMAR Script)";

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imgData = `data:image/png;base64,${part.inlineData.data}`;
                }
                if (part.text) {
                    txtData = part.text;
                }
            }
        }

        if (!imgData) {
            return { text: "عذراً، الموديل لم يرجع صورة. حاول تغيير الوصف." };
        }

        return { text: txtData, generatedImage: imgData };

    } catch (error: any) {
        console.error("Image Gen Error:", error);
        return { text: "فشل توليد الصورة: تأكد من مفتاح الـ API أو حاول بوصف آخر." };
    }
};

// 3. Prompt Engineer
export const engineerPrompt = async (
    userIdea: string,
    history: any[], 
    attachment?: Attachment
): Promise<GeminiResponse> => {
    try {
        if (!apiKey) throw new Error("API Key invalid");
        const model = "gemini-2.5-flash";
        let contentsPayload;

        if (attachment) {
            const base64Data = cleanBase64(attachment.dataUrl);
            contentsPayload = {
                parts: [
                     { inlineData: { mimeType: attachment.type, data: base64Data } },
                     { text: userIdea || "Analyze image and write a prompt." }
                ]
            };
        } else {
            contentsPayload = { parts: [{ text: userIdea }] };
        }

        const response = await ai.models.generateContent({
             model: model,
             contents: contentsPayload,
             config: { systemInstruction: SYSTEM_INSTRUCTION_PROMPT }
        });

        const text = response.text || "";
        let suggestedPrompt = "";
        const codeBlockMatch = text.match(/```text\s*([\s\S]*?)\s*```/);
        suggestedPrompt = codeBlockMatch ? codeBlockMatch[1].trim() : text;

        return { text, suggestedPrompt };

    } catch (error: any) {
        return { text: "حدث خطأ في هندسة البرومبت." };
    }
}
