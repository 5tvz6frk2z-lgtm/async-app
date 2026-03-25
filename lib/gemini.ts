import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set — AI features will be unavailable");
}

// F9: Only initialize if key exists; callers should null-check before use
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
export const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" }) ?? null;
