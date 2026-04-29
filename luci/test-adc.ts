import { GoogleGenAI } from "@google/genai";

async function run() {
  const ai = new GoogleGenAI({});
  console.log("Making request...");
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "hello"
    });
    console.log("Success:", res.text.substring(0, 50));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
