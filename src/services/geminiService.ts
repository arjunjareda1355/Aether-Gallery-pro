import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface AssetAnalysis {
  title: string;
  description: string;
  tags: string[];
}

export const analyzeAsset = async (assetUrl: string): Promise<AssetAnalysis | null> => {
  try {
    // Fetch asset as base64
    const response = await fetch(assetUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    const dataUrl = await base64Promise;
    const base64Data = dataUrl.split(',')[1];
    const mimeType = blob.type;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: "Analyze this media and provide: 1. A short, aesthetic, cinematic title. 2. A concise, poetic description (1-2 sentences). 3. A list of 5-8 descriptive tags. Return the result as a JSON object."
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "An aesthetic title for the gallery" },
            description: { type: Type.STRING, description: "A poetic description of the content" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "5-8 keywords"
            }
          },
          required: ["title", "description", "tags"]
        }
      }
    });

    const parsed = JSON.parse(result.text || "{}");
    return {
      title: parsed.title || "",
      description: parsed.description || "",
      tags: parsed.tags || []
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
};

export const getAutoTags = async (imageUrl: string): Promise<string[]> => {
  // Legacy support, but we prefer analyzeAsset now
  const result = await analyzeAsset(imageUrl);
  return result?.tags || [];
};
