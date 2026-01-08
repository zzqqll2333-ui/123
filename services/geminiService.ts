
import { GoogleGenAI, Type } from "@google/genai";
import { NutritionData, DailyReport } from "../types";

// 营养分析的 JSON Schema
const nutritionSchema = {
  type: Type.OBJECT,
  properties: {
    calories: { type: Type.NUMBER, description: "总热量 (kcal)" },
    protein: { type: Type.NUMBER, description: "蛋白质 (g)" },
    carbs: { type: Type.NUMBER, description: "碳水化合物 (g)" },
    fat: { type: Type.NUMBER, description: "脂肪 (g)" },
    foodItems: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "识别出的食物清单" 
    },
    healthScore: { type: Type.NUMBER, description: "健康评分 (0-100)" },
    summary: { type: Type.STRING, description: "一段简短的中文营养点评。" },
  },
  required: ["calories", "protein", "carbs", "fat", "foodItems", "healthScore", "summary"],
};

// 每日报告的 JSON Schema
const reportSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "报告标题" },
    shortSummary: { type: Type.STRING, description: "简短总结" },
    detailedAdvice: { type: Type.STRING, description: "详细的 Markdown 建议" },
  },
  required: ["title", "shortSummary", "detailedAdvice"],
};

/**
 * 分析食物照片
 */
export const analyzeFoodImage = async (base64Image: string): Promise<NutritionData> => {
  // 按照规范：在调用时直接使用 process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
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
            text: "请作为专业营养师，分析这张照片中的食物。估算其热量和三大营养素（蛋白质、碳水、脂肪）。请确保结果严谨，并以 JSON 格式返回。",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("AI 未能识别图片内容");
    return JSON.parse(resultText) as NutritionData;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error.message?.includes("API_KEY")) {
      throw new Error("检测到 API Key 未配置。请在 Vercel 项目设置中添加名为 API_KEY 的环境变量。");
    }
    throw error;
  }
};

/**
 * 生成每日健康建议
 */
export const generateDailyReport = async (totals: NutritionData): Promise<DailyReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `基于以下今日摄入数据生成健康报告：\n热量: ${totals.calories}kcal, 蛋白质: ${totals.protein}g, 碳水: ${totals.carbs}g, 脂肪: ${totals.fat}g。\n请提供标题、总结和详细的饮食改善建议。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
      },
    });

    return JSON.parse(response.text || '{}') as DailyReport;
  } catch (error: any) {
    throw new Error("生成报告失败，请检查网络或 API 配置。");
  }
};

/**
 * 发送聊天消息
 */
export const sendChatMessage = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: 'user', parts: [{ text: newMessage }] }],
      config: {
        systemInstruction: "你是一位亲切专业的中国营养师。请用中文回答用户的饮食疑问，提供科学建议。",
      },
    });

    return response.text || "抱歉，我暂时无法回答。";
  } catch (error: any) {
    return `对话出错: ${error.message}`;
  }
};
