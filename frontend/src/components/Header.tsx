// src/components/Header.tsx
import React from "react";

const Header: React.FC = () => {
  return (
    <div className="w-full max-w-4xl rounded-xl shadow-sm border border-gray-200 p-6 bg-white mb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          Medical Report Generator
        </h1>
        <span className="text-xs text-gray-500">v1.0</span>
      </div>
    </div>
  );
};

export default Header;
