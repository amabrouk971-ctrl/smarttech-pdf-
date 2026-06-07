import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function convertDocumentToHtml(base64Data: string, mimeType: string, templatePrompt?: string, retryCount = 0): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: "You are an expert document architect specializing in high-fidelity document-to-HTML reconstruction. Your goal is 100% text accuracy and structural fidelity. Always analyze the document's visual hierarchy (headings, tables, lists, images) before outputting the structural HTML." + (templatePrompt ? ` Additionally, follow this template guidance: ${templatePrompt}` : ""),
        temperature: 0.1,
        thinkingConfig: {
          includeThoughts: true
        }
      },
      contents: [
        {
          parts: [
            {
              text: "Convert this document into structured HTML content following these strict rules:\n" +
                    "1. ANALYZE FIRST: Identify all sections, complex tables, and visual elements.\n" +
                    "2. TABLES: Identify and reconstruct all tables using standard <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags. Preserve data alignment.\n" +
                    "3. COMPLETENESS: Be exhaustive. Do not summarize or omit any content from the document.\n" +
                    "4. IMAGES: For every image or diagram, insert an <img src='placeholder' alt='[Detailed structural description of the image content]' />.\n" +
                    "5. FORMATTING: Use only standard tags (h1, h2, p, ul, ol, li, table). Do not use style attributes or complex nesting.\n" +
                    "6. OUTPUT: Return ONLY the HTML body content string. No conversational text or markers.",
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });

    if (!response.text) {
      console.error("Gemini Response Empty:", response);
      return "<p>AI returned an empty response. This can happen if the document is too complex or layout cannot be processed.</p>";
    }

    return response.text;
  } catch (error: any) {
    console.error(`Gemini Error (Attempt ${retryCount + 1}):`, error);
    
    // Retry once for 500 errors
    if (error.status === 500 && retryCount < 1) {
      console.log("Retrying conversion due to 500 error...");
      return convertDocumentToHtml(base64Data, mimeType, templatePrompt, retryCount + 1);
    }

    if (error.status === 413 || error.message?.includes('too large')) {
      throw new Error("The file is too large for the AI to process. Please try a smaller file.");
    }
    
    if (error.status === 500) {
      throw new Error("The AI service encountered an internal error. This often happens with very complex structural layouts. Try a simpler document or try again later.");
    }

    throw new Error("Failed to process file with AI. " + (error.message || "Unknown error occurred."));
  }
}

export async function checkSpellingAndGrammar(htmlContent: string): Promise<string> {
  if (!apiKey) return htmlContent;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          parts: [
            {
              text: "You are a professional editor. Review the following HTML document for spelling and grammar errors. Correct all errors you find while strictly maintaining the same HTML structure and tags. Do not change the meaning of the content, only fix mistakes. Return only the corrected HTML content.",
            },
            {
              text: htmlContent,
            },
          ],
        },
      ],
    });

    return response.text || htmlContent;
  } catch (error) {
    console.error("Error checking spelling:", error);
    return htmlContent;
  }
}

export async function generateImage(prompt: string, aspectRatio: string = "1:1", modelId: string = 'gemini-3-pro-image-preview'): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId, 
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: "1K"
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data received from AI");
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    // Fallback to imagen-3 if pro image preview fails
    try {
      const fallbackResponse = await ai.models.generateImages({
        model: 'imagen-3',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspectRatio as any,
        },
      });
      const imgBytes = fallbackResponse.generatedImages?.[0]?.image?.imageBytes;
      if (imgBytes) {
        return `data:image/png;base64,${imgBytes}`;
      }
    } catch (e) {
      console.error("Image Fallback Error:", e);
    }
    throw new Error(error.message || "Failed to generate image");
  }
}

export async function removeBackground(base64Image: string, objectLabel: string): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [
        {
          parts: [
            { text: `Background removal task: Isolate the object labelled "${objectLabel}". Replace the background with solid bright green (#00FF00). Retain the object exactly as it is.` },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              },
            },
          ],
        },
      ],
    });

    // If the model cannot output images in generateContent, this will fail or return text.
    // However, if the environment supports it, we check parts.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    // If no image returned, we fallback to the original crop (which is what we have currently)
    throw new Error("Model did not return isolated image");
  } catch (error) {
    console.error("Remove Background Error:", error);
    throw error;
  }
}

export async function generateVideo(prompt: string, modelId: string = 'veo-3.1-generate-preview'): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  try {
    let operation = await ai.models.generateVideos({
      model: modelId,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: modelId.includes('lite') ? '1080p' : '4k',
        aspectRatio: '16:9'
      },
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string); // Returns a base64 data URL
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    throw new Error("No video data received from AI");
  } catch (error: any) {
    console.error("Video Generation Error:", error);
    throw new Error(error.message || "Failed to generate video");
  }
}

export async function enhancePrompt(prompt: string, type: 'image' | 'video'): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ role: 'user', parts: [{ text: `Enhance this ${type} prompt's detail, style, and composition for a high-quality AI generation model. Add technical details like lighting, camera lens (e.g. 85mm f/1.8), and aesthetic keywords (e.g. photorealistic, cinematic). Output ONLY the enhanced prompt: "${prompt}"` }] }],
      config: {
        temperature: 0.9,
      }
    });

    return response.text || prompt;
  } catch (error: any) {
    console.error("Prompt Enhancement Error:", error);
    return prompt; // Fallback to original
  }
}

export async function analyzeImage(imagePrompt: string, base64Image: string): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          parts: [
            { text: imagePrompt || "Analyze this image with extreme precision. Identify all visible objects, colors, textures, and spatial relationships. If there is text, transcribe it exactly." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              },
            },
          ],
        },
      ],
    });

    return response.text || "I was able to process the image but couldn't generate a text description.";
  } catch (error: any) {
    console.error("Image Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze image");
  }
}

export interface LayerObject {
  label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export async function magicDecompose(base64Image: string): Promise<LayerObject[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          parts: [
            { text: "Identify the main subjects, objects, or background elements in this image that could be separated into high-quality layers. For each distinct object, provide a detailed label and its precise [ymin, xmin, ymax, xmax] bounding box (normalized 0-1000). Return the results as a JSON array of objects with 'label' and 'box_2d' keys. Return ONLY the JSON." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(response.text || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    console.error("Magic Decompose Error:", error);
    return [];
  }
}

export async function enhanceDocument(htmlContent: string): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          role: 'user',
          parts: [
            { text: `You are an elite document editor.
Transform this HTML into a polished, production-ready document.
1. HIERARCHY: Use semantic HTML (h1, h2, h3) with clear visual weight.
2. FLOW: Refine grammar and sentence structure for professional clarity.
3. LAYOUT: Balance text and media perfectly.
4. STYLING: Apply absolute consistency in formatting.
5. CLEANUP: Remove any artifacts or awkward spacing.

Return ONLY the enhanced HTML content. No markdown code blocks, no preamble.

Current Document HTML:
${htmlContent}` }
          ]
        }
      ],
    });

    return response.text || htmlContent;
  } catch (error: any) {
    console.error("Document Enhancement Error:", error);
    throw new Error(error.message || "Failed to enhance document");
  }
}

export async function generateDocument(prompt: string, templatePrompt?: string): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: "You are an expert document generator. Output ONLY clean, well-structured HTML code. No markdown formatting blocks around it. Use h1, h2, h3, p, ul, ol, li, table.",
        temperature: 0.7,
      },
      contents: [{
        role: "user",
        parts: [{ text: `Create a comprehensive document based on this prompt: "${prompt}". ${templatePrompt ? 'Follow this specific formatting guideline: ' + templatePrompt : ''}` }]
      }]
    });
    
    let html = response.text || '';
    // Strip markdown if it exists
    html = html.replace(/```html!?/gi, '').replace(/```/gi, '').trim();
    return html;
  } catch (error: any) {
    console.error("Document Generation Error:", error);
    throw new Error(error.message || "Failed to generate document");
  }
}

function addWavHeader(pcmData: Uint8Array, sampleRate: number): Uint8Array {
  const numFrames = pcmData.byteLength / 2;
  const numChannels = 1;
  const sampleSize = 2; // 16-bit
  const byteRate = sampleRate * numChannels * sampleSize;
  const blockAlign = numChannels * sampleSize;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // "RIFF"
  view.setUint32(0, 1380533830, false);
  view.setUint32(4, 36 + dataSize, true); // file size - 8
  // "WAVE"
  view.setUint32(8, 1463899717, false);
  // "fmt "
  view.setUint32(12, 1718449184, false);
  view.setUint32(16, 16, true); // size of fmt chunk
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, sampleSize * 8, true);
  // "data"
  view.setUint32(36, 1684108385, false);
  view.setUint32(40, dataSize, true);

  const bufferArray = new Uint8Array(buffer);
  bufferArray.set(new Uint8Array(buffer, 0, 44), 0);
  bufferArray.set(pcmData, 44);
  return bufferArray;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function generateAudio(prompt: string, speakerType: 'lady' | 'male' | 'kid' = 'lady'): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  // Choose a prebuilt voice based on speaker type
  let voiceName = 'Kore';
  if (speakerType === 'male') voiceName = 'Fenrir';
  if (speakerType === 'kid') voiceName = 'Puck';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{
        parts: [{ text: `Speak in a natural Egyptian Arabic accent, acting as an Egyptian ${speakerType}. The text to speak is: ${prompt}` }]
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // Decode audio for playing if needed, but returning data URL is usually enough if it's wav (Gemini TTS returns raw PCM usually, wait no, read SKILL.md again!)
      const pcmData = base64ToUint8Array(base64Audio);
      const wavData = addWavHeader(pcmData, 24000);
      const wavBlob = new Blob([wavData], { type: 'audio/wav' });
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(wavBlob);
      });
    }
    throw new Error("No audio data received from AI");
  } catch (error: any) {
    console.error("Audio Generation Error:", error);
    throw new Error(error.message || "Failed to generate audio");
  }
}
