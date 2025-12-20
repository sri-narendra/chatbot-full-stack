require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"  // or "gemini-2.5-pro"
    });

    const result = await model.generateContent("Hello from Gemini!");
    console.log("✨ Gemini said:", result.response.text());
  } catch (err) {
    console.error("❌ Gemini failed:", err);
  }
}

test();
