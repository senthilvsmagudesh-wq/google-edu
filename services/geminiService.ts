import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisType } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const MODEL_FAST = 'gemini-2.0-flash';
const MODEL_LITE = 'gemini-2.0-flash-lite-preview-02-05'; 
const MODEL_PRO = 'gemini-2.0-flash'; 
// Switched to gemini-2.5-flash-image as Imagen was returning 404
const MODEL_IMAGE_GEN = 'gemini-2.5-flash-image'; 

export const generateAnalysis = async (
  type: AnalysisType,
  inputContent: string,
  inputType: 'text' | 'url' | 'file',
  fileData?: string, // base64
  fileMimeType?: string
): Promise<string | { text: string; imageUrl?: string }> => {
  
  let model = MODEL_FAST;
  let systemInstruction = "You are a helpful AI knowledge assistant.";
  let tools: any[] = [];
  let config: any = {};
  
  // Enable Google Search for URL inputs to allow the model to "read" the web
  if (inputType === 'url') {
    tools.push({ googleSearch: {} });
  }
  
  // Construct the base prompt with STRENGTHENED instructions for URLs to prevent "I cannot access" errors
  const textPrompt = inputType === 'url' 
    ? `SYSTEM NOTICE: You have access to Google Search. You MUST use it to process this URL: ${inputContent}
       
       ACTION REQUIRED:
       1. Use the 'googleSearch' tool to find the content of the URL.
       2. If the URL is a general homepage (e.g., news.google.com), search for "top headlines" or "current main stories" on that site.
       3. Do NOT refuse by saying you cannot access external websites. The search tool is your bridge.
       4. Perform the requested analysis (${type}) based on the search results.` 
    : `Analyze the following content:\n\n${inputContent}`;

  switch (type) {
    case AnalysisType.SUMMARY:
      model = MODEL_FAST;
      systemInstruction = "Create a concise, smart summary. Use bullet points for key insights. If analyzing a URL/News, focus on the most important current facts.";
      break;

    case AnalysisType.KEYWORD_INSIGHT:
      model = MODEL_LITE;
      systemInstruction = "Extract the top 10 most important keywords with brief definitions.";
      break;
      
    case AnalysisType.DEEP_ANALYSIS:
      model = MODEL_PRO;
      systemInstruction = "Perform a deep, comprehensive analysis. Break down complex concepts, identify underlying themes, and assess the validity of arguments.";
      break;

    case AnalysisType.COMPARE:
      model = MODEL_PRO;
      // Detailed instruction for table formatting
      systemInstruction = "Compare and contrast the main ideas or entities. Output a strictly formatted Markdown table with clear headers. Ensure the table cells contain concise, easy-to-read bullet points. Do not include excessive text outside the table.";
      break;

    case AnalysisType.CONTEXT_ANALYZER:
      model = MODEL_FAST; // Flash supports grounding
      systemInstruction = "Analyze the context of this topic using recent real-world information. Add external context.";
      // Add tool if not already added (e.g. for text input)
      if (!tools.some(t => t.googleSearch)) {
        tools.push({ googleSearch: {} });
      }
      break;

    case AnalysisType.REPORT:
      model = MODEL_PRO;
      systemInstruction = "Write a detailed professional report based on the content. Include an Executive Summary, Key Findings, and Conclusion.";
      break;

    case AnalysisType.MIND_MAP:
      model = MODEL_FAST;
      systemInstruction = "Generate a text-based hierarchical mind map structure (using Markdown list syntax) that visualizes the relationships between concepts.";
      break;

    case AnalysisType.SLIDE_DECK:
      model = MODEL_PRO;
      systemInstruction = "Create an outline for a 5-slide presentation based on this content. For each slide, provide a Title, Bullet Points, and Speaker Notes.";
      break;

    case AnalysisType.QUIZ:
      model = MODEL_FAST;
      // Strictly enforce JSON structure
      systemInstruction = `Generate a JSON array of 5 multiple choice questions based on the content. 
      IMPORTANT FORMATTING RULES:
      1. The "question" field must contain ONLY the question text. Do NOT include options like "A) ..." in the question string.
      2. The "options" field must be an ARRAY of 4 distinct strings.
      3. The "correctAnswer" must match one of the strings in the options array exactly.
      4. Return ONLY raw JSON.`;
      
      // JSON Schema is NOT compatible with Google Search tool.
      // Only use JSON schema if tools are empty (i.e. not a URL).
      if (tools.length === 0) {
        config = {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "The question text only, without options." },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 4 possible answers." },
                correctAnswer: { type: Type.STRING, description: "The correct answer string." }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        };
      } else {
        // Fallback for when Search is active: Ask nicely in text
        systemInstruction += " Please ensure the output is a valid JSON string inside a markdown code block.";
      }
      break;

    case AnalysisType.FLASHCARDS:
      model = MODEL_FAST;
      systemInstruction = "Generate a JSON array of 8 flashcards. Keep fronts under 10 words and backs under 30 words. Return ONLY raw JSON code. Do not wrap in markdown code blocks. Do not repeat the input text.";
      
      if (tools.length === 0) {
        config = {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING }
              }
            }
          }
        };
      } else {
         systemInstruction += " Please ensure the output is a valid JSON string inside a markdown code block.";
      }
      break;

    case AnalysisType.INFOGRAPHIC:
      return await generateInfographic(inputContent);
      
    default:
      model = MODEL_FAST;
  }

  // Handle Multimodal Input
  const parts: any[] = [];
  
  if (fileData && fileMimeType) {
    if (model === MODEL_LITE) model = MODEL_FAST; 
    parts.push({
      inlineData: {
        mimeType: fileMimeType,
        data: fileData
      }
    });
  }
  
  parts.push({ text: textPrompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        ...config
      }
    });

    // Handle Grounding (Search/Maps) URLs extraction
    let text = response.text || "No analysis generated.";
    
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      const chunks = response.candidates[0].groundingMetadata.groundingChunks;
      const links = chunks
        .map((c: any) => c.web?.uri ? `\n- [${c.web.title || 'Source'}](${c.web.uri})` : '')
        .join('');
      if (links) text += `\n\n### Sources:${links}`;
    }

    return text;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Enhanced Error Handling
    let errorMessage = "Failed to generate analysis. Please try again.";
    
    if (error.message) {
        if (error.message.includes('404')) errorMessage = "The selected AI model is currently unavailable. Please try again later.";
        else if (error.message.includes('429')) errorMessage = "System is busy (Too Many Requests). Please wait a moment.";
        else if (error.message.includes('403')) errorMessage = "Access denied. Please check your API key or permissions.";
        else if (error.message.includes('500')) errorMessage = "Internal AI service error. Please try again.";
        else if (error.message.toLowerCase().includes('safety')) errorMessage = "Content blocked by safety filters.";
    }
    
    throw new Error(errorMessage);
  }
};

const generateInfographic = async (prompt: string): Promise<{ text: string; imageUrl: string }> => {
  try {
    // 1. Summarize content first to get a visual prompt
    const summaryResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Create a brief visual description (max 50 words) for an infographic about: ${prompt.substring(0, 1000)}...`,
    });
    const visualPrompt = summaryResponse.text;

    // 2. Generate Image using Gemini 2.5 Flash Image
    // Uses generateContent, not generateImages
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE_GEN,
      contents: {
        parts: [{ text: `Create a high quality infographic illustration about: ${visualPrompt}` }],
      },
      // Note: responseMimeType is not supported for nano banana (2.5-flash-image)
    });

    let imageUrl = "";
    let text = "Infographic generated.";
    
    // Iterate to find image part in response
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            } else if (part.text) {
                text = part.text;
            }
        }
    }
    
    if (!imageUrl) throw new Error("No image generated in response");
    
    return { text, imageUrl };

  } catch (error) {
    console.error("Image Gen Error:", error);
    return { 
        text: "Could not generate infographic image. The model might be busy or unavailable. Here is the visual description instead:\n\n" + prompt.substring(0, 200) + "...",
        imageUrl: "" 
    };
  }
};

export const chatWithGemini = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    try {
        const chat = ai.chats.create({
            model: MODEL_PRO,
            history: history,
            config: {
                systemInstruction: "You are a helpful AI assistant integrated into an analysis tool."
            }
        });
        
        const result = await chat.sendMessage({ message });
        return result.text;
    } catch (e) {
        console.error(e);
        throw e;
    }
}