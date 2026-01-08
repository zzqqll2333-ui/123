import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Plus, Trash2, CheckCircle2, Info, ChevronDown, ChevronUp, Sparkles, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeFoodImage, generateDailyReport } from '../services/geminiService';
import { Meal, MealType, NutritionData, DailyReport } from '../types';
import NutritionChart from './NutritionChart';

// Helper to calculate totals from a list of meals
const calculateTotals = (meals: Meal[]): NutritionData => {
  return meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
    foodItems: [...acc.foodItems, ...meal.foodItems],
    healthScore: Math.round((acc.healthScore * meals.length + meal.healthScore) / (meals.length + 1)) || 0, // weighted average approach
    summary: "今日总览",
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    foodItems: [],
    healthScore: 0,
    summary: "",
  });
};

const Analyzer: React.FC = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loadingSlot, setLoadingSlot] = useState<MealType | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Daily Report State
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReportDetails, setShowReportDetails] = useState(false);
  
  // We use a single file input and trigger it for specific slots
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<MealType | null>(null);

  const handleFileSelect = (slot: MealType) => {
    activeSlotRef.current = slot;
    fileInputRef.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeSlotRef.current) return;

    const slot = activeSlotRef.current;
    setLoadingSlot(slot);
    setError(null);
    // Reset report when new data is added as it might be outdated
    setDailyReport(null); 
    setShowReportDetails(false);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // GoogleGenAI expects the base64 string without the data URI scheme
        const base64Data = base64String.split(',')[1];

        try {
          const result = await analyzeFoodImage(base64Data);
          const newMeal: Meal = {
            ...result,
            id: Date.now().toString(),
            type: slot,
            image: base64String,
            timestamp: Date.now(),
          };
          setMeals(prev => [...prev, newMeal]);
        } catch (err) {
          console.error(err);
          setError("分析失败，请重试。");
        } finally {
          setLoadingSlot(null);
          if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setLoadingSlot(null);
      setError("图片处理出错");
    }
  };

  const deleteMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
    setDailyReport(null); // Reset report on change
  };

  const handleGenerateReport = async () => {
    if (meals.length === 0) return;
    setReportLoading(true);
    try {
      const totals = calculateTotals(meals);
      const report = await generateDailyReport(totals);
      setDailyReport(report);
    } catch (e) {
      setError("生成建议失败，请重试。");
    } finally {
      setReportLoading(false);
    }
  };

  const totals = calculateTotals(meals);

  const renderMealSection = (type: MealType, title: string, subtitle: string) => {
    const slotMeals = meals.filter(m => m.type === type);
    const slotCalories = slotMeals.reduce((acc, m) => acc + m.calories, 0);
    const isLoading = loadingSlot === type;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all hover:shadow-md">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {title}
              {slotMeals.length > 0 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            </h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <span className="block font-mono font-bold text-gray-700">{slotCalories} kcal</span>
             </div>
             <button 
               onClick={() => handleFileSelect(type)}
               disabled={!!loadingSlot}
               className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full transition-colors disabled:opacity-50 shadow-sm"
               title="添加食物"
             >
               <Plus className="h-5 w-5" />
             </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {slotMeals.length === 0 && !isLoading && (
            <div 
              onClick={() => handleFileSelect(type)}
              className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-emerald-200 transition-colors"
            >
               点击此处记录{title}
            </div>
          )}

          {slotMeals.map(meal => (
            <div key={meal.id} className="flex gap-4 items-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative group animate-slide-up">
              <img src={meal.image} alt="Food" className="w-20 h-20 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                   <h4 className="font-medium text-gray-900 truncate pr-6">{meal.foodItems.join(', ')}</h4>
                   <span className="font-bold text-emerald-600 whitespace-nowrap">{meal.calories} kcal</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                   <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">蛋白: {meal.protein}g</span>
                   <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">碳水: {meal.carbs}g</span>
                   <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">脂肪: {meal.fat}g</span>
                </div>
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{meal.summary}</p>
              </div>
              <button 
                onClick={() => deleteMeal(meal.id)}
                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 rounded-full transition-colors"
                title="删除"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 animate-pulse">
               <div className="w-20 h-20 bg-emerald-100 rounded-lg"></div>
               <div className="flex-1 space-y-2">
                 <div className="h-4 bg-emerald-100 rounded w-3/4"></div>
                 <div className="h-3 bg-emerald-100 rounded w-1/2"></div>
               </div>
               <div className="flex flex-col items-center gap-1 text-emerald-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-xs font-medium">分析中</span>
               </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-20 space-y-8">
      
      {/* Total Dashboard */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
        {/* Background Element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-bl-full -z-0 opacity-60"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <Info className="h-5 w-5 text-emerald-600" />
            <h2 className="font-bold text-gray-800">今日膳食概览</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
             <div className="text-center md:text-left">
               <div className="text-sm text-gray-500 font-medium tracking-wide uppercase mb-1">总热量摄入</div>
               <div className="flex items-baseline justify-center md:justify-start">
                 <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{totals.calories}</span>
                 <span className="text-lg text-gray-400 ml-1 font-medium">kcal</span>
               </div>
               <p className="text-sm text-gray-400 mt-2">
                 {meals.length > 0 ? `已记录 ${meals.length} 次用餐` : '今天还没有记录哦'}
               </p>
             </div>
             
             <div className="col-span-2 flex flex-col sm:flex-row items-center justify-around bg-gray-50/80 rounded-2xl p-6 backdrop-blur-sm">
                <div className="h-32 w-32 flex-shrink-0 relative">
                   {meals.length > 0 ? (
                     <NutritionChart data={totals} />
                   ) : (
                     <div className="absolute inset-0 rounded-full border-4 border-gray-200 border-dashed flex items-center justify-center text-xs text-gray-400">
                       无数据
                     </div>
                   )}
                </div>
                <div className="space-y-3 flex-1 w-full sm:w-auto mt-6 sm:mt-0 sm:ml-8">
                   <MacroRow label="蛋白质" value={totals.protein} color="bg-blue-500" total={totals.protein + totals.carbs + totals.fat} />
                   <MacroRow label="碳水" value={totals.carbs} color="bg-emerald-500" total={totals.protein + totals.carbs + totals.fat} />
                   <MacroRow label="脂肪" value={totals.fat} color="bg-amber-500" total={totals.protein + totals.carbs + totals.fat} />
                </div>
             </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-xl flex items-center gap-3 text-red-700 border border-red-100 animate-shake">
          <Trash2 className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Meal Sections */}
      <div>
        {renderMealSection(MealType.MORNING, "早餐", "一日之计在于晨")}
        {renderMealSection(MealType.NOON, "午餐", "补充能量，继续奋斗")}
        {renderMealSection(MealType.EVENING, "晚餐", "轻松享用，健康收尾")}
      </div>

      {/* Daily Health Advice Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600">
               <FileText className="h-6 w-6" />
             </div>
             <div>
               <h3 className="font-bold text-gray-900 text-lg">今日健康建议</h3>
               <p className="text-sm text-gray-500">基于您今日摄入的 {meals.length} 餐数据分析</p>
             </div>
          </div>
          
          {meals.length > 0 && !dailyReport && !reportLoading && (
            <button 
              onClick={handleGenerateReport}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm font-medium"
            >
              <Sparkles className="h-4 w-4" />
              生成建议
            </button>
          )}

          {reportLoading && (
             <div className="flex items-center gap-2 text-blue-600 bg-white/50 px-4 py-2 rounded-xl">
               <Loader2 className="h-4 w-4 animate-spin" />
               <span className="text-sm font-medium">生成中...</span>
             </div>
          )}
        </div>

        {dailyReport && (
          <div className="px-6 pb-6 animate-slide-up">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-50">
              <h4 className="text-xl font-bold text-gray-800 mb-2">{dailyReport.title}</h4>
              <p className="text-gray-600 leading-relaxed mb-4">{dailyReport.shortSummary}</p>
              
              {showReportDetails && (
                <div className="mt-6 pt-6 border-t border-gray-100 prose prose-sm max-w-none prose-blue animate-fade-in">
                  <ReactMarkdown>{dailyReport.detailedAdvice}</ReactMarkdown>
                </div>
              )}

              <button 
                onClick={() => setShowReportDetails(!showReportDetails)}
                className="mt-2 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showReportDetails ? (
                  <>收起详情 <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>查看详情 <ChevronDown className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {meals.length === 0 && (
           <div className="px-6 pb-6 text-center text-gray-400 text-sm">
             请先记录今日饮食，AI 将为您生成专属健康建议。
           </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={onFileChange}
      />
    </div>
  );
};

const MacroRow = ({ label, value, color, total }: { label: string, value: number, color: string, total: number }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${color} ring-2 ring-white shadow-sm`}></div>
        <span className="text-sm text-gray-600 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
         <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
            <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
         </div>
         <span className="font-bold text-gray-900 w-12 text-right">{value}g</span>
      </div>
    </div>
  );
};

export default Analyzer;
