// src/components/ReportViewer.tsx
import React from "react";

type Props = {
  report?: string;
  error?: string;
};

const ReportViewer: React.FC<Props> = ({ report, error }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-700">Generated Report</h2>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-h-[600px] overflow-y-auto">
        {error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : report ? (
          <div className="p-2">
            <p className="text-gray-700 whitespace-pre-wrap">{report}</p>
          </div>
        ) : (
          <p className="text-center text-gray-500">
            The generated report will appear here.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReportViewer;
