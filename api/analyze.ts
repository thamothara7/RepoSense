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
    // Flash: Explicitly set to 0 to disable thinking and ensure fast time-to-first-token.
    // Pro: 8192 for deep analysis.
    const thinkingBudget = deepReasoning ? 8192 : 0;

    const genAIConfig: any = {
      systemInstruction: systemInstruction,
      thinkingConfig: { thinkingBudget }
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await ai.models.generateContentStream({
            model: modelName,
            contents: prompt,
            config: genAIConfig
          });

          for await (const chunk of result) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        } catch (error: any) {
          console.error("Streaming Error:", error);
          // If we haven't sent any data yet, we might be able to send a JSON error,
          // but since we are in a stream, it's safer to just close or log.
          // In a real app, we might send a specific error string chunk.
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