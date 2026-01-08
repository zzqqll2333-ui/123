import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Plus, Trash2, CheckCircle2, Info, ChevronDown, ChevronUp, Sparkles, FileText, AlertCircle, Key } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeFoodImage, generateDailyReport } from '../services/geminiService';
import { Meal, MealType, NutritionData, DailyReport } from '../types';
import NutritionChart from './NutritionChart';

const calculateTotals = (meals: Meal[]): NutritionData => {
  return meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
    foodItems: Array.from(new Set([...acc.foodItems, ...meal.foodItems])),
    healthScore: Math.round((acc.healthScore * Math.max(1, meals.length - 1) + meal.healthScore) / meals.length) || 0,
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
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReportDetails, setShowReportDetails] = useState(false);
  
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

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
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
        } catch (err: any) {
          setError(err.message || '分析失败');
        } finally {
          setLoadingSlot(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setLoadingSlot(null);
      setError(`图片读取错误: ${e.message}`);
    }
  };

  const deleteMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
    setDailyReport(null);
  };

  const handleGenerateReport = async () => {
    if (meals.length === 0) return;
    setReportLoading(true);
    setError(null);
    try {
      const totals = calculateTotals(meals);
      const report = await generateDailyReport(totals);
      setDailyReport(report);
    } catch (e: any) {
      setError(`生成建议失败: ${e.message}`);
    } finally {
      setReportLoading(false);
    }
  };

  const handleResetKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      window.location.reload();
    }
  };

  const totals = calculateTotals(meals);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-20 space-y-8">
      {/* 顶部面板 */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-bl-full -z-0 opacity-60"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-emerald-600">
              <Info className="h-5 w-5" />
              <h2 className="font-bold text-gray-800">今日膳食概览</h2>
            </div>
            <button 
              onClick={handleResetKey}
              className="text-xs text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors"
            >
              <Key className="h-3 w-3" /> 重设 API Key
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
             <div className="text-center md:text-left">
               <div className="text-sm text-gray-500 font-medium mb-1">总热量摄入</div>
               <div className="flex items-baseline justify-center md:justify-start">
                 <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{totals.calories}</span>
                 <span className="text-lg text-gray-400 ml-1 font-medium">kcal</span>
               </div>
               <p className="text-sm text-gray-400 mt-2">
                 {meals.length > 0 ? `已记录 ${meals.length} 次用餐` : '快去拍照记录第一顿饭吧'}
               </p>
             </div>
             
             <div className="col-span-2 flex flex-col sm:flex-row items-center justify-around bg-gray-50/80 rounded-2xl p-6 backdrop-blur-sm">
                <div className="h-32 w-32 flex-shrink-0 relative">
                   {meals.length > 0 ? (
                     <NutritionChart data={totals} />
                   ) : (
                     <div className="absolute inset-0 rounded-full border-4 border-gray-200 border-dashed flex items-center justify-center text-xs text-gray-400">
                       等待数据
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
        <div className="bg-red-50 p-4 rounded-2xl flex items-start gap-3 text-red-700 border border-red-100 animate-shake">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-bold">操作失败</p>
            <p className="mt-1 opacity-90">{error}</p>
            {error.includes("Key") && (
              <button onClick={handleResetKey} className="mt-2 text-emerald-700 font-bold underline">
                点此重新选择有效的 API Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* 用餐部分 */}
      <div>
        <MealSection slot={MealType.MORNING} title="早餐" subtitle="开启元气满满的一天" meals={meals} onAdd={handleFileSelect} onDelete={deleteMeal} loading={loadingSlot === MealType.MORNING} />
        <MealSection slot={MealType.NOON} title="午餐" subtitle="补充能量，继续奋斗" meals={meals} onAdd={handleFileSelect} onDelete={deleteMeal} loading={loadingSlot === MealType.NOON} />
        <MealSection slot={MealType.EVENING} title="晚餐" subtitle="轻松享受，健康收尾" meals={meals} onAdd={handleFileSelect} onDelete={deleteMeal} loading={loadingSlot === MealType.EVENING} />
      </div>

      {/* 建议面板 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-white p-3 rounded-2xl shadow-sm text-blue-600">
               <FileText className="h-6 w-6" />
             </div>
             <div>
               <h3 className="font-bold text-gray-900 text-lg">AI 深度健康分析</h3>
               <p className="text-sm text-gray-500">基于今日 {meals.length} 顿膳食生成</p>
             </div>
          </div>
          
          {meals.length > 0 && !dailyReport && !reportLoading && (
            <button 
              onClick={handleGenerateReport}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl transition-all shadow-md font-bold"
            >
              <Sparkles className="h-4 w-4" />
              智能生成建议
            </button>
          )}

          {reportLoading && (
             <div className="flex items-center gap-2 text-blue-600 bg-white/50 px-5 py-2.5 rounded-2xl">
               <Loader2 className="h-4 w-4 animate-spin" />
               <span className="text-sm font-bold">思考中...</span>
             </div>
          )}
        </div>

        {dailyReport && (
          <div className="px-6 pb-6 animate-slide-up">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-50">
              <h4 className="text-xl font-bold text-gray-800 mb-2">{dailyReport.title}</h4>
              <p className="text-gray-600 leading-relaxed mb-4">{dailyReport.shortSummary}</p>
              
              {showReportDetails && (
                <div className="mt-6 pt-6 border-t border-gray-100 prose prose-sm max-w-none prose-blue animate-fade-in text-gray-700">
                  <ReactMarkdown>{dailyReport.detailedAdvice}</ReactMarkdown>
                </div>
              )}

              <button 
                onClick={() => setShowReportDetails(!showReportDetails)}
                className="mt-2 flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showReportDetails ? <>收起详细分析 <ChevronUp className="h-4 w-4" /></> : <>查看详细营养建议 <ChevronDown className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />
    </div>
  );
};

// 抽取子组件
const MealSection = ({ slot, title, subtitle, meals, onAdd, onDelete, loading }: any) => {
  const slotMeals = meals.filter((m: any) => m.type === slot);
  const totalCal = slotMeals.reduce((acc: number, m: any) => acc + m.calories, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            {title} {slotMeals.length > 0 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </h3>
          <p className="text-[10px] text-gray-400 font-medium">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-600">{totalCal} kcal</span>
          <button onClick={() => onAdd(slot)} disabled={loading} className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 transition-colors shadow-sm">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {slotMeals.length === 0 && !loading && (
          <div onClick={() => onAdd(slot)} className="text-center py-6 text-xs text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
             添加食物记录
          </div>
        )}
        {slotMeals.map((meal: any) => (
          <div key={meal.id} className="flex gap-4 p-3 bg-white rounded-2xl border border-gray-50 shadow-sm relative group animate-slide-up">
            <img src={meal.image} className="w-16 h-16 object-cover rounded-xl bg-gray-50" />
            <div className="flex-1 min-w-0">
               <div className="flex justify-between">
                 <h4 className="font-bold text-gray-800 text-sm truncate pr-4">{meal.foodItems.join(', ')}</h4>
                 <span className="text-xs font-bold text-emerald-600">{meal.calories} kcal</span>
               </div>
               <div className="flex gap-2 mt-1">
                 <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-bold">P: {meal.protein}g</span>
                 <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold">C: {meal.carbs}g</span>
                 <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-bold">F: {meal.fat}g</span>
               </div>
            </div>
            <button onClick={() => onDelete(meal.id)} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 animate-pulse">
            <div className="w-16 h-16 bg-emerald-100/50 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-emerald-100/50 rounded w-1/2" />
              <div className="h-2 bg-emerald-100/50 rounded w-1/4" />
            </div>
            <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

const MacroRow = ({ label, value, color, total }: any) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${color} ring-2 ring-white shadow-sm`}></div>
        <span className="text-sm text-gray-600 font-bold">{label}</span>
      </div>
      <div className="flex items-center gap-3">
         <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
            <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
         </div>
         <span className="font-bold text-gray-900 w-10 text-right text-xs">{value}g</span>
      </div>
    </div>
  );
};

export default Analyzer;
