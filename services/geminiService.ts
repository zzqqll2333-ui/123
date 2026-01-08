import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NutritionData, DailyReport } from "../types";

// Lazy initialization of the client to ensure process.env is accessible
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Critical Error: API_KEY is missing from process.env. Please check your Vercel Environment Variables.");
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
    const client = getAiClient();
    // Using gemini-3-flash-preview for fast multimodal analysis and reliable availability
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "请分析这张图片中的食物。作为一名专业的营养师，请识别所有食物项，仔细估算份量，并计算总卡路里和主要营养素（蛋白质、碳水化合物、脂肪）。请同时给出一个0到100的健康评分，并提供一段简短的中文评价。请确保计算逻辑严密。",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("API返回内容为空");
    return JSON.parse(resultText) as NutritionData;
  } catch (error: any) {
    console.error("Food analysis error:", error);
    throw new Error(error.message || "未知分析错误");
  }
};

export const generateDailyReport = async (totals: NutritionData): Promise<DailyReport> => {
  try {
    const client = getAiClient();
    const prompt = `
      基于以下今日摄入总量数据生成一份每日健康简报：
      - 总热量: ${totals.calories} kcal
      - 蛋白质: ${totals.protein}g
      - 碳水化合物: ${totals.carbs}g
      - 脂肪: ${totals.fat}g
      - 摄入食物: ${totals.foodItems.join(', ')}
      - 平均健康分: ${totals.healthScore}

      请提供标题、简要总结和Markdown格式的详细建议。
    `;

    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("无法生成简报内容");
    return JSON.parse(resultText) as DailyReport;
  } catch (error: any) {
    console.error("Report generation error:", error);
    throw new Error(error.message || "无法生成每日简报");
  }
};

export const sendChatMessage = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string
): Promise<string> => {
  try {
    const client = getAiClient();
    const chat = client.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "你是一位经验丰富、友善的中国营养师。请用中文提供专业、科学且实用的饮食建议。",
      },
      history: history,
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text || "抱歉，我暂时无法回答。";
  } catch (error: any) {
    console.error("Chat error:", error);
    return `对话出错: ${error.message}`;
  }
};
