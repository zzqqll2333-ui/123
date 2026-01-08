import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NutritionData, DailyReport } from "../types";

// 每次调用时动态创建实例，确保获取最新的 API_KEY
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const ai = getAi();
    // 使用 Pro 级模型以获得最高质量的图像理解和推理
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "请作为专业的营养师分析这张食物照片。识别所有食材，估算每种食材的分量，并据此精确计算卡路里、蛋白质、碳水和脂肪。给出一个0-100的健康分，并提供中文评价。请确保计算逻辑严密且符合实际饮食常识。",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("AI 未返回任何分析数据");
    return JSON.parse(resultText) as NutritionData;
  } catch (error: any) {
    console.error("Analysis Error:", error);
    if (error.message?.includes("entity was not found")) {
      throw new Error("模型调用失败，请重新选择 API Key。");
    }
    throw new Error(error.message || "分析过程中发生错误");
  }
};

export const generateDailyReport = async (totals: NutritionData): Promise<DailyReport> => {
  try {
    const ai = getAi();
    const prompt = `
      基于今日摄入总量生成健康报告：
      - 总热量: ${totals.calories} kcal
      - 蛋白质: ${totals.protein}g, 碳水: ${totals.carbs}g, 脂肪: ${totals.fat}g
      - 食物清单: ${totals.foodItems.join(', ')}
      - 平均得分: ${totals.healthScore}
      请生成一个中文标题、简要总结以及 Markdown 格式的详细改善建议。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("无法生成报告");
    return JSON.parse(resultText) as DailyReport;
  } catch (error: any) {
    throw new Error(error.message || "简报生成失败");
  }
};

export const sendChatMessage = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string
): Promise<string> => {
  try {
    const ai = getAi();
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "你是一位专业的中国营养师，擅长通过膳食分析提供健康建议。请始终使用中文，语气专业且亲切。",
      },
      history: history,
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text || "抱歉，无法获取回答。";
  } catch (error: any) {
    return `对话错误: ${error.message}`;
  }
};
