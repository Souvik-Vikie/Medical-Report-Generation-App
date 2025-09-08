// src/components/ReportViewer.tsx
import React from "react";
import { Download } from "lucide-react";

type Props = {
  report?: string;
  error?: string;
  uploadedImage?: File | null;
  onDownloadPDF?: () => void;
};

const ReportViewer: React.FC<Props> = ({ 
  report, 
  error, 
  uploadedImage, 
  onDownloadPDF 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-700">Generated Report</h2>
        {report && !error && (
          <button
            onClick={onDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            Download PDF
          </button>
        )}
      </div>
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