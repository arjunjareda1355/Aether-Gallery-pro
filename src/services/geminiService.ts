import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = 
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY)) ||
      "";
    if (!key) {
      console.warn("GEMINI_API_KEY is not set. AI features will require an API key.");
    }
    aiInstance = new GoogleGenAI({ apiKey: key || "dummy_key_to_prevent_init_crash" });
  }
  return aiInstance;
}

export interface AssetAnalysis {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  sceneContext?: string;
}

/**
 * Fetches media data safely using the local proxy to avoid CORS issues.
 */
async function fetchMediaAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    // Try local proxy first as it's more reliable for external assets
    const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn("Proxy fetch failed, attempting direct fetch...", e);
  }

  // Fallback to direct fetch (only works if CORS allows)
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ data: base64, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Utility for delaying execution
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced fetch with retry for Gemini API
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.message?.includes('429') || 
                          error?.status === 429 || 
                          error?.message?.includes('RESOURCE_EXHAUSTED') ||
                          error?.message?.includes('high demand');
      
      if (isRateLimit && i < maxRetries - 1) {
        const waitTime = initialDelay * Math.pow(2, i);
        console.warn(`Gemini API rate limited. Retrying in ${waitTime}ms... (Attempt ${i + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Recreates the AI analysis from scratch for maximum accuracy.
 */
export const analyzeAsset = async (assetUrl: string, base64Override?: string, hintTitle?: string): Promise<AssetAnalysis | null> => {
  try {
    let mediaData: { data: string; mimeType: string };

    if (base64Override) {
      const parts = base64Override.split(',');
      mediaData = {
        data: parts[1] || parts[0],
        mimeType: base64Override.match(/data:([^;]+);/)?.[1] || 'image/jpeg'
      };
    } else {
      mediaData = await fetchMediaAsBase64(assetUrl);
    }

    const { data: base64Data, mimeType } = mediaData;

    // Validate MIME type. Gemini only supports specific media types.
    // If it's text/html, it's likely a landing page or incorrect link.
    const supportedTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      'application/pdf'
    ];

    if (!supportedTypes.some(t => mimeType.startsWith(t.split('/')[0]) || mimeType.includes(t))) {
      console.warn(`Unsupported MIME type detected: ${mimeType}. Falling back to title-only analysis.`);
      if (hintTitle) {
        return analyzeFromTitle(hintTitle);
      }
      throw new Error(`The target URL is not a direct media link (it returned ${mimeType}). Please use a direct image/video address.`);
    }

    const result = await withRetry(() => getAiClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `You are the ultimate digital curator for "Aether Gallery", a high-end, mystical aesthetic sanctuary.
            ${hintTitle ? `IMPORTANT: The user has provided a title/hint: "${hintTitle}". Use this as your primary context for understanding the subject, mood, and generating matching metadata.` : ''}
            Analyze this media with 100% precision and provide:

            1. Title: A concise (3-5 words), sophisticated, and atmospheric title. If a hint was provided, refine it into a more polished version.
            2. Description: A single short poetic, evocative phrase between 15 and 30 characters maximum.
            3. Tags: Exactly 5 highly relevant tags. Mix colors/objects with aesthetic keywords (e.g., "liminal", "cinematic").
            4. Category: Map to exactly one of: [Architecture, Nature, Tech, People, Abstract, Cyberpunk, Minimalist, Cinematic].
            5. Scene Context: A DETAILED LITERAL INVENTORY of everything inside. Who is there? What are they wearing? What are they doing? What objects are present? 
            Example: "A young boy with blond hair in a red sweater sitting on a park bench next to a girl with a blue ribbon, eating ice cream, green trees and a fountain in the background, daytime."
            
            Return the result as a strict JSON object.`
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
            title: { type: Type.STRING },
            description: { type: Type.STRING, description: "Must be 15-30 characters long" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Exactly 5 tags"
            },
            category: { type: Type.STRING, description: "Must be from the provided list" },
            sceneContext: { type: Type.STRING, description: "Literal visual description" }
          },
          required: ["title", "description", "tags", "category", "sceneContext"]
        }
      }
    }));

    const parsed = JSON.parse(result.text || "{}");
    return {
      title: parsed.title || "",
      description: parsed.description || "",
      tags: (parsed.tags || []).slice(0, 15),
      category: parsed.category,
      sceneContext: parsed.sceneContext || ""
    };
  } catch (error: any) {
    console.error("New AI Analysis failed:", error);
    // Explicitly check for demand errors to provide better feedback
    if (error?.message?.includes('high demand') || error?.status === 429) {
      throw new Error("The AI Oracle is currently overwhelmed. Please wait a few moments and try again.");
    }
    return null;
  }
};

/**
 * Generates metadata based only on a title or theme.
 */
export const analyzeFromTitle = async (title: string): Promise<AssetAnalysis | null> => {
  try {
    const result = await withRetry(() => getAiClient().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate rich metadata for a sanctuary media asset titled: "${title}".
      The asset belongs to the "Aether" aesthetic (mystical, high-end, atmospheric).
      
      Requirements:
      - Refined title (3-5 words)
      - Poetic description (15-30 characters ONLY)
      - Exactly 5 tags based on the theme
      - Category: Architecture, Nature, Tech, People, Abstract, Cyberpunk, Minimalist, Cinematic
      - Detailed predicted Scene Context
      
      Return as strict JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            category: { type: Type.STRING },
            sceneContext: { type: Type.STRING }
          },
          required: ["title", "description", "tags", "category", "sceneContext"]
        }
      }
    }));

    return JSON.parse(result.text || "{}") as AssetAnalysis;
  } catch (error: any) {
    console.error("AI Title Analysis failed:", error);
    if (error?.message?.includes('high demand') || error?.status === 429) {
      throw new Error("The AI Oracle is currently overwhelmed. Please try again in 1-2 minutes.");
    }
    return null;
  }
};
