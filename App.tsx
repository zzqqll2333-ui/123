import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Analyzer from './components/Analyzer';
import ChatInterface from './components/ChatInterface';
import { AppMode } from './types';
import { Key, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.ANALYZER);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // 检查是否已经选择了 API Key
  useEffect(() => {
    const checkKey = async () => {
      // 如果环境变量已经有了 Key (Vercel 预设)，则直接进入
      if (process.env.API_KEY) {
        setHasKey(true);
        return;
      }
      
      // 否则检查 window.aistudio 状态
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // 如果不在特殊环境下，假设已有（或由环境变量提供）
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // 触发选择后直接进入，避免竞态条件
      setHasKey(true);
    }
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-6">
          <div className="inline-flex p-4 bg-emerald-100 rounded-full text-emerald-600 animate-float">
            <ShieldCheck className="h-10 w-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">欢迎使用膳食智囊</h1>
            <p className="text-gray-500 text-sm">
              为了开启 AI 营养分析功能，我们需要连接您的 Google Gemini 服务。
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-start gap-3 text-xs text-gray-600">
              <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p>我们将使用 <strong>Gemini 3 Pro</strong> 为您提供精准的卡路里估算。</p>
            </div>
            <div className="flex items-start gap-3 text-xs text-gray-600">
              <Key className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p>请选择一个已启用计费（Paid Project）的 API Key 以确保服务稳定。</p>
            </div>
          </div>

          <button
            onClick={handleOpenKeySelector}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-emerald-200 flex items-center justify-center gap-2"
          >
            <Key className="h-5 w-5" />
            连接 API Key
          </button>

          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 transition-colors"
          >
            查看计费说明文档 <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  // 加载状态显示
  if (hasKey === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm font-medium">初始化安全连接...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar currentMode={mode} setMode={setMode} />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {mode === AppMode.ANALYZER ? (
          <Analyzer />
        ) : (
          <ChatInterface />
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>© 2024 膳食智囊. Powered by Gemini 3 Pro Vision.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
