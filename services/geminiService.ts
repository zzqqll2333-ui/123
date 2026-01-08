import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NutritionData, DailyReport } from "../types";

// Lazy initialization of the client to ensure process.env is accessible and prevent startup crashes
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    // API_KEY must be obtained exclusively from process.env.API_KEY
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("Warning: API_KEY is missing from process.env");
    }
    ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return ai;
};

const nutritionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    calories: { type: Type.NUMBER, description: "Total estimated calories in kcal" },
    protein: { type: Type.NUMBER, description: "Total protein in grams" },
    carbs: { type: Type.NUMBER, description: "Total carbohydrates in grams" },
    fat: { type: Type.NUMBER, description: "Total fat in grams" },
    foodItems: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "List of identified food items" 
    },
    healthScore: { type: Type.NUMBER, description: "Health score from 0 to 100 based on nutritional balance" },
    summary: { type: Type.STRING, description: "A brief, encouraging summary of the nutritional value in Chinese." },
  },
  required: ["calories", "protein", "carbs", "fat", "foodItems", "healthScore", "summary"],
};

const reportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A concise and catchy title for the daily health report in Chinese." },
    shortSummary: { type: Type.STRING, description: "A one or two sentence summary of the daily intake and health impact in Chinese." },
    detailedAdvice: { type: Type.STRING, description: "Comprehensive health advice, tips, and suggestions for the next day in Markdown format (Chinese)." },
  },
  required: ["title", "shortSummary", "detailedAdvice"],
};

export const analyzeFoodImage = async (base64Image: string): Promise<NutritionData> => {
  try {
    // Using gemini-3-pro-preview with thinking budget for deep analysis of the image
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, can be dynamic
              data: base64Image,
            },
          },
          {
            text: "请分析这张图片中的食物。作为一名专业的营养师，请识别所有食物项，仔细估算份量，并计算总卡路里和主要营养素（蛋白质、碳水化合物、脂肪）。请同时给出一个0到100的健康评分，并提供一段简短的中文评价。通过深思熟虑来确保估算的准确性。",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
        thinkingConfig: {
          thinkingBudget: 32768, // Max budget for deep reasoning on visual inputs
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from AI");
    }

    // Parse JSON
    const data = JSON.parse(resultText) as NutritionData;
    return data;
  } catch (error) {
    console.error("Error analyzing food:", error);
    throw error;
  }
};

export const generateDailyReport = async (totals: NutritionData): Promise<DailyReport> => {
  try {
    const prompt = `
      基于以下今日摄入总量数据生成一份每日健康简报：
      - 总热量: ${totals.calories} kcal
      - 蛋白质: ${totals.protein}g
      - 碳水化合物: ${totals.carbs}g
      - 脂肪: ${totals.fat}g
      - 摄入食物: ${totals.foodItems.join(', ')}
      - 平均健康分: ${totals.healthScore}

      请提供：
      1. 一个简短的标题。
      2. 一句简要的总结 (shortSummary)。
      3. 详细的建议 (detailedAdvice)，包括营养均衡分析、缺乏的营养素提醒以及对明日饮食的建议。使用Markdown格式。
    `;

    // Using gemini-3-flash-preview for fast text generation
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from AI");
    }

    return JSON.parse(resultText) as DailyReport;
  } catch (error) {
    console.error("Error generating daily report:", error);
    throw error;
  }
};

export const sendChatMessage = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string
): Promise<string> => {
  try {
    // Using gemini-3-flash-preview for chat responsiveness
    const client = getAiClient();
    const chat = client.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "你是一位经验丰富、友善的中国营养师和健康饮食顾问。你的目标是帮助用户建立健康的饮食习惯。请用中文回答。给出建议时要科学、实用且令人鼓舞。",
      },
      history: history,
    });

    const response = await chat.sendMessage({
      message: newMessage,
    });

    return response.text || "抱歉，我暂时无法回答。";
  } catch (error) {
    console.error("Error in chat:", error);
    return "抱歉，发生了一些错误，请稍后再试。";
  }
};
