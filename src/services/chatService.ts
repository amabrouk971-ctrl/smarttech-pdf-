import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatOptions {
  modelId: string;
  enableGrounding: boolean;
}

export async function getChatResponse(
  message: string, 
  context?: string, 
  history: ChatMessage[] = [],
  options: ChatOptions = { modelId: "gemini-3.1-pro-preview", enableGrounding: false }
): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel.");
  }

  const systemInstruction = `You are SmartTech Assistant, a helpful AI expert in document processing and deep web research.
Your goal is to help users transform their documents, answer questions, and perform web research.
Current document content for context:
${context || 'No document loaded yet.'}

You can:
1. Do web research to pull the latest facts and incorporate them if needed.
2. Rewrite sections of the document in different styles (formal, creative, concise, etc.).
3. Suggest better structures or fix grammatical issues.
4. Answer questions about the content of the loaded document or anything on the web.
5. Instruct users on how to generate assets: "To generate a photo, type: Generate image: [your prompt]" or "To generate a video, type: Generate video: [your prompt]".

If the user asks you to rewrite something or change the document structure based on research, provide the revised HTML content wrapped in [SUGGESTION] tags, like this: [SUGGESTION]<h1>New Title</h1><p>New text...</p>[/SUGGESTION].
Also provide a brief explanation of your changes outside the tags.

Always be professional, concise, and helpful.`;

  try {
    const config: any = {
        systemInstruction,
        temperature: 0.7,
    };

    if (options.enableGrounding) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: options.modelId,
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("Chat Error:", error);
    throw new Error(error.message || "Failed to get response from AI");
  }
}
