// src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// REMOVE Global genAI instance initialized with process.env
// const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
// if (!API_KEY) { throw new Error(...) }
// const genAI = new GoogleGenerativeAI(API_KEY);

// Safety settings remain global
const safetySettings = [ /* ... */ ];

/**
 * Initializes the GoogleGenerativeAI client with a given key.
 * Caches the client instance per key to avoid re-initialization.
 */
const clientCache = {};
function getGenAIClient(apiKey) {
    if (!apiKey) {
        throw new Error("API Key is required to initialize the Gemini client.");
    }
    if (!clientCache[apiKey]) {
        console.log("geminiService: Initializing new GenAI client."); // Log init
        clientCache[apiKey] = new GoogleGenerativeAI(apiKey);
    }
    return clientCache[apiKey];
}


export async function generateChatResponse(
  messages, modelCode = "gemini-2.0-flash-lite", temperature = 1, outputLength = 8192,
  topP = 0.95, systemInstructions = "", filePool = [], apiKey = "" // *** Receive apiKey ***
) {
  // *** Check for API Key ***
  if (!apiKey) { throw new Error("API Key not provided to generateChatResponse."); }

  // Prepare History and Prompt (remains the same)
  const history = messages.slice(0, -1).filter(msg => msg.role === 'user' || msg.role === 'assistant').map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
  const currentPromptMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  if (!currentPromptMsg || currentPromptMsg.role !== 'user') { throw new Error("Internal Error: Last message must be user prompt."); }
  let promptText = currentPromptMsg.content;
  if (filePool?.length > 0) { const fileContentsText = filePool.map(file => `--- File: ${file.name} ---\n${file.content}`).join('\n\n'); promptText = `Use the following file contents as context:\n\n${fileContentsText}\n\n--- User Query ---\n${promptText}`; }

  try {
    const startTime = performance.now();
    // *** Get client using the provided apiKey ***
    const genAI = getGenAIClient(apiKey);

    const dynamicModel = genAI.getGenerativeModel({
      model: modelCode, safetySettings: safetySettings,
      ...(systemInstructions && systemInstructions.trim() !== "" && { systemInstruction: { parts: [{ text: systemInstructions }] } })
    });
    const generationConfig = { temperature, maxOutputTokens: outputLength, topP };
    const chat = dynamicModel.startChat({ history, generationConfig });
    const result = await chat.sendMessage(promptText);

    const endTime = performance.now(); const responseTime = Math.round(endTime - startTime);
    const response = result.response;
    if (!response) { throw new Error("API returned no response object."); }
    if (response.promptFeedback?.blockReason) { console.warn(`Response possibly blocked: ${response.promptFeedback.blockReason}`); }

    const responseText = response.text();
    // *** Pass apiKey to countTokens ***
    const responseTokenCount = await countTokens(responseText, modelCode, apiKey);

    return { text: responseText, tokenCount: responseTokenCount, responseTime, modelUsed: modelCode, temperatureUsed: temperature, outputLengthUsed: outputLength, topPUsed: topP, };
  } catch (error) { /* ... Enhanced error logging remains the same ... */ console.error("--- Error in generateChatResponse ---"); console.error("Message:", error.message); if (error.response) console.error("Response Data:", JSON.stringify(error.response, null, 2)); if (error.status) console.error("Status Code:", error.status); try { console.error("Full Error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2)); } catch (e) { console.error("Full Error (Stringify failed):", error); } console.error("--- End Error ---"); if (error.message?.includes('429')) throw new Error("API Rate Limit Exceeded."); if (error.message?.includes('API key not valid') || error.message?.includes('invalid api key') || (error.status === 400 && error.message?.includes('API key'))) throw new Error("Invalid API Key (Check Settings)."); if (error.message?.includes('SAFETY')) throw new Error("Content blocked due to safety settings."); if (error instanceof TypeError && error.message?.includes('fetch')) throw new Error(`Network error: ${error.message}`); throw new Error(`API Error: ${error.message || 'Unknown error'}`);
  }
}


// *** Modify countTokens to accept apiKey ***
export async function countTokens(text, modelCode = "gemini-2.0-flash-lite", apiKey = "") {
  if (!text) { return 0; }
  // *** Check for API Key ***
  if (!apiKey) { throw new Error("API Key not provided to countTokens."); }
  try {
    // *** Get client using the provided apiKey ***
    const genAI = getGenAIClient(apiKey);
    const model = genAI.getGenerativeModel({ model: modelCode });
    const { totalTokens } = await model.countTokens(text);
    return totalTokens;
  } catch (error) {
    console.error(`Error counting tokens for model ${modelCode}:`, error);
    throw new Error(`Failed to count tokens: ${error.message}`);
  }
}