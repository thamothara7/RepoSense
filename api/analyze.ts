import { GoogleGenAI, Type, Schema } from "@google/genai";

export const config = {
  runtime: 'edge',
};

// Schema definition matching client side
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectOverview: { type: Type.ARRAY, items: { type: Type.STRING } },
    architectureSummary: { type: Type.ARRAY, items: { type: Type.STRING } },
    componentBreakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
    dataControlFlow: { type: Type.ARRAY, items: { type: Type.STRING } },
    codeQualityRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    metaAnalysis: {
      type: Type.OBJECT,
      properties: {
        qualityScore: { type: Type.NUMBER },
        complexity: { type: Type.STRING },
        maintainability: { type: Type.STRING }
      },
      required: ["qualityScore", "complexity", "maintainability"]
    },
    architectureDiagram: { type: Type.STRING }
  },
  required: ["projectOverview", "architectureSummary", "componentBreakdown", "dataControlFlow", "codeQualityRisks", "improvementSuggestions", "metaAnalysis", "architectureDiagram"]
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
    const modelName = deepReasoning ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const thinkingBudget = deepReasoning ? 8192 : 0;

    const genAIConfig: any = {
      systemInstruction: systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: analysisSchema,
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