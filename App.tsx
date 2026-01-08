
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Analyzer from './components/Analyzer';
import ChatInterface from './components/ChatInterface';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.ANALYZER);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar currentMode={mode} setMode={setMode} />
      
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {mode === AppMode.ANALYZER ? (
          <Analyzer />
        ) : (
          <ChatInterface />
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-6 text-center text-gray-400 text-xs">
        <p>© 2024 膳食智囊 - 您的个人 AI 营养伴侣</p>
      </footer>
    </div>
  );
};

export default App;
