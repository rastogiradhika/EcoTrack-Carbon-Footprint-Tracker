require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function check() {
  try {
    // Ye SDK ka standard tareeka hai list fetch karne ka
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Model initialized successfully!");
  } catch (error) {
    console.log("Error details:", error.message);
  }
}
check();