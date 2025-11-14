// src/components/ReportViewer.tsx
import React from "react";
import { Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

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
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">AI Analysis Report</h2>
        </div>
        {report && !error && (
          <button
            onClick={onDownloadPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md font-semibold"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        )}
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <p className="text-red-600 font-semibold text-lg mb-2">Error Occurred</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        ) : report ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium text-sm">Analysis completed successfully</span>
            </div>
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{report}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="bg-gray-200 p-4 rounded-full mb-4">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-lg mb-2">No Report Generated Yet</p>
            <p className="text-gray-400 text-sm max-w-md">
              Upload an X-ray image and click "Generate AI Report" to see the analysis results here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportViewer;