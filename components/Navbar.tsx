import React from 'react';
import { Camera, MessageCircle, Utensils } from 'lucide-react';
import { AppMode } from '../types';

interface NavbarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentMode, setMode }) => {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Utensils className="h-8 w-8 text-emerald-600" />
            <span className="ml-2 text-xl font-bold text-gray-800">膳食智囊</span>
          </div>
          <div className="flex space-x-4 items-center">
            <button
              onClick={() => setMode(AppMode.ANALYZER)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentMode === AppMode.ANALYZER
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Camera className="h-4 w-4 mr-2" />
              拍照分析
            </button>
            <button
              onClick={() => setMode(AppMode.CHAT)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentMode === AppMode.CHAT
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              AI 咨询
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
