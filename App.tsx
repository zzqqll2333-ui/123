
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Analyzer from './components/Analyzer';
import ChatInterface from './components/ChatInterface';
import { AppMode } from './types';
import { Key, Sparkles, ShieldCheck, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.ANALYZER);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // Check if an API key is available or selected
  useEffect(() => {
    const checkKey = async () => {
      // 1. Check if an environment variable exists and is not an empty string
      const envKey = process.env.API_KEY;
      if (envKey && envKey.trim().length > 0) {
        setHasKey(true);
        return;
      }
      
      // 2. If no env key, check if we're in the AI Studio environment and have a selector
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // 3. Fallback: If not in AI Studio and no env key, assume we need to prompt or fail
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // Immediately assume key is available to update UI after selection
        setHasKey(true);
      } catch (err) {
        console.error("Key selection failed", err);
      }
    } else {
      alert("当前环境不支持自动 Key 选择。请在部署平台配置 API_KEY 环境变量。");
    }
  };

  // Unconfigured state: Show onboarding / connection UI
  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-6 animate-fade-in">
          <div className="inline-flex p-4 bg-emerald-100 rounded-full text-emerald-600">
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
              <p>当前缺少有效的 API Key 访问权限。</p>
            </div>
            {!window.aistudio && (
              <div className="flex items-start gap-3 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p><strong>注意：</strong>请在您的项目设置中添加 <code>API_KEY</code> 环境变量。</p>
              </div>
            )}
          </div>

          {window.aistudio && (
            <button
              onClick={handleOpenKeySelector}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95"
            >
              <ExternalLink className="h-5 w-5" />
              连接 Google Gemini 服务
            </button>
          )}
          
          <div className="pt-2 text-[10px] text-gray-400">
            连接后，您的 API Key 将用于调用 Gemini 接口。
            <br />
            了解更多：<a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline">计费文档</a>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (hasKey === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <p className="text-gray-500 font-medium">初始化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar currentMode={mode} setMode={setMode} />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {mode === AppMode.ANALYZER ? <Analyzer /> : <ChatInterface />}
      </main>
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-gray-400 text-xs">
        <p>© 2024 膳食智囊 - 您的个人 AI 营养伴侣</p>
      </footer>
    </div>
  );
};

export default App;
