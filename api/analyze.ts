import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

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
    
    // Optimizations for Speed vs Depth:
    // Standard: Gemini 3 Flash (Fast)
    // Deep Reasoning: Gemini 3 Pro (High Intelligence, Slower)
    const modelName = deepReasoning ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    // Configure Thinking Budget
    // Flash: 0 (Disable thinking for max speed) unless needed? Actually Flash supports thinking, 
    // but for "Instant" feel, we keep it low or disabled.
    // Pro: 8192 for deep analysis.
    const thinkingBudget = deepReasoning ? 8192 : 0;

    const genAIConfig: any = {
      systemInstruction: systemInstruction,
    };

    if (deepReasoning) {
        genAIConfig.thinkingConfig = { thinkingBudget };
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await ai.models.generateContentStream({
            model: modelName,
            contents: prompt,
            config: genAIConfig
          });

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        } catch (error: any) {
          console.error("Streaming Error:", error);
          // Send a JSON error object in the stream if possible, or just close with error
          // Since we already started streaming text, we can't cleanly switch to JSON error.
          // We will log it.
          controller.error(error);
        }
      },
    });

    return new Response(stream, { 
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      } 
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}