// src/components/Header.tsx
import React from "react";
import { Activity, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <div className="w-full max-w-7xl rounded-xl shadow-lg border border-gray-200 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-lg shadow-md">
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              MedAI X-Ray Analyzer
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              AI-Powered Medical Image Analysis & Report Generation
            </p>
          </div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
          <span className="text-xs text-white font-semibold">v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
