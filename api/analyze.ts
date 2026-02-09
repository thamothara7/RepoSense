import { GoogleGenAI } from "@google/genai";

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { prompt, systemInstruction, deepReasoning } = await request.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration: API_KEY missing' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const thinkingBudget = deepReasoning ? 8192 : 2048;

    // Helper to perform the generation with fallback logic
    const performAnalysis = async (useFallbackModel: boolean) => {
      // Primary: Gemini 3 Pro | Fallback: Gemini 3 Flash
      const modelName = useFallbackModel ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
      
      const config: any = {
        systemInstruction: systemInstruction,
      };

      // Only apply thinking budget to non-fallback models (or models that support it)
      if (!useFallbackModel) {
        config.thinkingConfig = { thinkingBudget };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: config
      });
      
      return response.text;
    };

    try {
      // Attempt 1: Primary Model
      const text = await performAnalysis(false);
      return new Response(JSON.stringify({ text }), { 
        headers: { 'Content-Type': 'application/json' } 
      });

    } catch (error: any) {
      console.warn("Primary model failed, attempting fallback...", error.message);
      
      // Check for rate limits or server errors
      const errString = error.toString().toLowerCase();
      const isRateLimit = errString.includes('429') || errString.includes('quota') || errString.includes('exhausted');
      const isServerError = errString.includes('500') || errString.includes('503');

      if (isRateLimit || isServerError) {
        await delay(1000); // Brief pause
        
        try {
          // Attempt 2: Fallback Model
          const text = await performAnalysis(true);
          return new Response(JSON.stringify({ text }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        } catch (fallbackError: any) {
           throw new Error("Both primary and fallback models failed. Please try again later.");
        }
      }
      
      throw error;
    }

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}