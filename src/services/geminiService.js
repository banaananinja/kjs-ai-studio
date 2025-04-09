// src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

export async function generateChatResponse(messages, modelCode = "gemini-2.0-flash-lite", systemInstructions = "") {
  try {
    const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error("API key not found");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelCode}:generateContent`;
    
    // Prepare the request payload
    const requestBody = {
      contents: messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };
    
    // Add system instructions if provided
    if (systemInstructions && systemInstructions.trim() !== "") {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstructions }]
      };
    }

    const response = await fetch(`${endpoint}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || "No response generated.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}
