import { GoogleGenAI } from "@google/genai";

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("Generating image...");
    const generateResponse = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: "A beautiful cat",
      config: {
        numberOfImages: 1,
        aspectRatio: "3:4",
        outputMimeType: "image/jpeg",
      }
    });

    console.log("Success?", !!generateResponse);
  } catch(e) {
    console.error("ERROR::", e);
  }
}

run();
