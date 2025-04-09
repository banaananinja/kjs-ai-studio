// src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

export async function generateChatResponse(messages, modelCode = "gemini-2.0-flash-lite") {
  // Build a single prompt from the conversation messages
  const conversationText = messages
    .map((msg) => {
      if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
      if (msg.role === 'system') return `System: ${msg.content}`;
      return `User: ${msg.content}`;
    })
    .join('\n');

  try {
    const dynamicModel = genAI.getGenerativeModel({ model: modelCode });
    const result = await dynamicModel.generateContent(conversationText);
    return result.response.text();
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}
