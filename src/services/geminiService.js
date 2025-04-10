// src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure the API key is loaded from environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("REACT_APP_GEMINI_API_KEY not found in .env file");
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Default safety settings to disable all content filtering
const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  // Note: CIVIC_INTEGRITY might not be available in all API versions/models,
  // remove if it causes errors.
  // { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
];

// *** MAKE SURE THIS FUNCTION IS PRESENT AND EXPORTED ***
export async function generateChatResponse(
  messages,
  modelCode = "gemini-2.0-flash-lite",
  temperature = 1,
  outputLength = 8192, // Default output length
  topP = 0.95,
  systemInstructions = "" // Add systemInstructions parameter
) {
  // Convert conversation messages to the format required by the SDK's chat history
  const history = messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant') // Only user/assistant roles go in history
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user', // Map roles
      parts: [{ text: msg.content }]
    }));

  // Extract the latest user message which becomes the current prompt
  // The history should contain messages *before* the latest user message.
  const currentPromptMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const actualHistory = history.length > 0 ? history.slice(0, -1) : []; // All messages except the last one

  if (!currentPromptMsg || currentPromptMsg.role !== 'user') {
    console.error("generateChatResponse expects the last message to be from the user.");
    // Handle this case appropriately, maybe throw an error or return a specific message
    throw new Error("The final message in the list must be from the user.");
  }
  const currentPromptText = currentPromptMsg.content;


  try {
    const startTime = performance.now();

    // Dynamically get the selected model
    const dynamicModel = genAI.getGenerativeModel({
      model: modelCode,
      safetySettings: safetySettings,
      // Add system instruction if provided and not empty
      ...(systemInstructions && systemInstructions.trim() !== "" && {
        systemInstruction: { parts: [{ text: systemInstructions }] }
      })
    });

    // Set generation config
    const generationConfig = {
      temperature: temperature,
      maxOutputTokens: outputLength,
      topP: topP,
      // stopSequences: [] // Add if needed later
    };

    // Start chat session with history
    const chat = dynamicModel.startChat({
      history: actualHistory,
      generationConfig: generationConfig
    });

    // Send the latest user message
    const result = await chat.sendMessage(currentPromptText);

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    const response = result.response;
    const responseText = response.text();

    // Get token count for the response (using the separate countTokens function)
    const responseTokenCount = await countTokens(responseText, modelCode); // Calls the other function

    return {
      text: responseText,
      tokenCount: responseTokenCount, // Use counted tokens
      responseTime: responseTime,
      modelUsed: modelCode,
      temperatureUsed: temperature,
      outputLengthUsed: outputLength,
      topPUsed: topP,
      // Prompt feedback might be less relevant now as we manage history manually
      // promptFeedback: response.promptFeedback || {}
    };
  } catch (error) {
    console.error("Error generating content:", error);
    // Attempt to provide more specific error info if available
    if (error.message.includes('429')) {
       throw new Error("API Rate Limit Exceeded. Please wait and try again.");
    }
    if (error.message.includes('API key not valid')) {
       throw new Error("Invalid API Key. Please check your .env file.");
    }
    // Check for safety blocks specifically
    if (error.message.includes('SAFETY')) {
      console.warn("Response blocked due to safety settings, even though set to BLOCK_NONE. Response:", error.response);
       throw new Error("Response blocked due to safety settings.");
    }
    throw error; // Re-throw the original error if not specifically handled
  }
}

// *** MAKE SURE THIS FUNCTION IS PRESENT AND EXPORTED ***
// Function to count tokens for any given text
export async function countTokens(text, modelCode = "gemini-2.0-flash-lite") {
  try {
    const model = genAI.getGenerativeModel({ model: modelCode });
    const result = await model.countTokens(text);
    return result.totalTokens;
  } catch (error) {
    console.error("Error counting tokens:", error);
    // Return 0 or throw, depending on how you want to handle count errors
    return 0;
  }
}