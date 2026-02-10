import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey || "DUMMY_KEY");

// Using gemini-1.5-flash as a stable, fast model for summaries
export const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
