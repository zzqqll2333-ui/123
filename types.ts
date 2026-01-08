export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foodItems: string[];
  healthScore: number; // 0-100
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AppMode {
  ANALYZER = 'ANALYZER',
  CHAT = 'CHAT',
}

export enum MealType {
  MORNING = '早餐',
  NOON = '午餐',
  EVENING = '晚餐',
}

export interface Meal extends NutritionData {
  id: string;
  type: MealType;
  image: string; // Base64
  timestamp: number;
}

export interface AnalysisState {
  isLoading: boolean;
  result: NutritionData | null;
  error: string | null;
  image: string | null; // Base64 string
}

export interface DailyReport {
  title: string;
  shortSummary: string;
  detailedAdvice: string;
}
