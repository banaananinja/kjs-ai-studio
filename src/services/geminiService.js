// src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure the API key is loaded from environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
if (!API_KEY) {
  console.error("FATAL ERROR: REACT_APP_GEMINI_API_KEY not found in .env file. Please create a .env file in the project root with your API key.");
  throw new Error("REACT_APP_GEMINI_API_KEY not found in .env file");
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Default safety settings to disable all content filtering
const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  // { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" } // Keep commented out
];

/**
 * Generates a chat response using the Google Generative AI SDK.
 * Prepends content from filePool to the user's latest message.
 * ... (rest of the function description)
 */
export async function generateChatResponse(
  messages,
  modelCode = "gemini-2.0-flash-lite",
  temperature = 1,
  outputLength = 8192,
  topP = 0.95,
  systemInstructions = "",
  filePool = []
) {
  // 1. Prepare History for SDK
  const history = messages
    .slice(0, -1)
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

  // 2. Extract the last user message
  const currentPromptMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  if (!currentPromptMsg || currentPromptMsg.role !== 'user') {
    throw new Error("Internal Error: Attempted to generate response without a final user prompt.");
  }

  // 3. Prepend File Content to prompt text
  let promptText = currentPromptMsg.content;
  if (filePool && filePool.length > 0) {
      const fileContentsText = filePool
          .map(file => `--- File: ${file.name} ---\n${file.content}`)
          .join('\n\n');
      promptText = `Use the following file contents as context:\n\n${fileContentsText}\n\n--- User Query ---\n${promptText}`;
      console.log("DEBUG: Prepended file context to prompt.");
  }

  // 4. Prepare Model and Config
  try {
    const startTime = performance.now();
    const dynamicModel = genAI.getGenerativeModel({
      model: modelCode,
      safetySettings: safetySettings,
      ...(systemInstructions && systemInstructions.trim() !== "" && {
        systemInstruction: { parts: [{ text: systemInstructions }] }
      })
    });
    const generationConfig = { temperature, maxOutputTokens: outputLength, topP };

    // 5. Start Chat and Send Message
    const chat = dynamicModel.startChat({ history, generationConfig });
    const result = await chat.sendMessage(promptText);

    // 6. Process Response
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    const response = result.response;

    if (!response) {
      console.error("API Error: No response object received.", result);
      throw new Error("API returned no response object. Check console for details.");
    }
    if (response.promptFeedback?.blockReason) {
        console.warn(`Response possibly blocked or flagged: ${response.promptFeedback.blockReason}`, response.promptFeedback);
        // Consider throwing or returning a specific message if blocked
        // throw new Error(`Response blocked due to: ${response.promptFeedback.blockReason}`);
    }

    const responseText = response.text();
    const responseTokenCount = await countTokens(responseText, modelCode);

    return {
      text: responseText, tokenCount: responseTokenCount, responseTime,
      modelUsed: modelCode, temperatureUsed: temperature, outputLengthUsed: outputLength, topPUsed: topP,
    };

  // *** ENHANCED CATCH BLOCK ***
  } catch (error) {
    console.error("---------------------------------------");
    console.error("Error generating content in geminiService:");
    // Log the basic error message
    console.error("Message:", error.message);
    // Log specific properties if they exist in the error object
    if (error.response) { // Often present in SDK errors
        console.error("Error Response Data:", JSON.stringify(error.response, null, 2));
    }
    if (error.status) { // Sometimes included
        console.error("Error Status Code:", error.status);
    }
    // Log the full error object structure for deep debugging
    // Use try/catch for stringify in case of circular references
    try {
       console.error("Full Error Object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (e) {
       console.error("Full Error Object (Stringify failed):", error);
    }
    console.error("---------------------------------------");

    // Provide more specific user-facing feedback based on error type
    if (error.message?.includes('429')) {
       throw new Error("API Rate Limit Exceeded. Please wait and try again.");
    }
    if (error.message?.includes('API key not valid') || error.message?.includes('invalid api key') || (error.status === 400 && error.message?.includes('API key'))) {
       throw new Error("Invalid API Key. Check .env file and restart server.");
    }
    if (error.message?.includes('SAFETY')) {
      console.warn("Response blocked due to SAFETY settings.", error);
       throw new Error("Content blocked due to safety settings (internal filter).");
    }
     if (error instanceof TypeError && error.message?.includes('fetch')) {
        throw new Error(`Network error during API call: ${error.message}`);
     }

    // Default error message
    throw new Error(`API Error: ${error.message || 'Unknown error during generation'}`);
  }
  // *** END ENHANCED CATCH BLOCK ***

} // End of generateChatResponse


/**
 * Counts the number of tokens in a given text string for a specific model.
 * ... (rest of the function description)
 */
export async function countTokens(text, modelCode = "gemini-2.0-flash-lite") {
  if (!text) { return 0; }
  try {
    const model = genAI.getGenerativeModel({ model: modelCode });
    const { totalTokens } = await model.countTokens(text);
    return totalTokens;
  } catch (error) {
    console.error(`Error counting tokens for model ${modelCode}:`, error);
    // Throw error so calling function knows counting failed
    throw new Error(`Failed to count tokens: ${error.message}`);
  }
}