// src/App.tsx
import React, { useState } from "react";
import Header from "./components/Header";
import ImageUploader from "./components/ImageUploader";
import ReportViewer from "./components/ReportViewer";
import Modal from "./components/Modal";
import { uploadImageForReport } from "./api";
import { generateMedicalReportPDF } from "./utils/pdfGenerator";

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const showCustomModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };
  const closeCustomModal = () => setShowModal(false);

  const clearError = () => setError("");

  const handleGenerate = async (file: File) => {
    setIsLoading(true);
    setError("");
    setReport("");
    setUploadedImage(file); // Store the uploaded image

    try {
      const data = await uploadImageForReport(file);
      if (data.error) {
        setError(data.error);
        showCustomModal("Report Generation Failed", data.error);
      } else {
        setReport(data.report || "");
        showCustomModal("Success", "Report generated successfully!");
      }
    } catch (e: any) {
      const msg =
        e?.message ||
        "Failed to connect to the backend API or an internal error occurred.";
      setError(msg);
      showCustomModal("Error", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) {
      showCustomModal("Error", "No report available to download.");
      return;
    }

    try {
      await generateMedicalReportPDF({
        report,
        image: uploadedImage || undefined,
        patientName: "Patient", // You can make this configurable
        doctorName: "Medical AI Assistant"
      });
      showCustomModal("Success", "PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      showCustomModal("Error", "Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex flex-col items-center">
        <Header />
        <div className="w-full max-w-4xl rounded-xl shadow-lg border border-gray-200 p-8 bg-white">
          <div className="grid md:grid-cols-2 gap-8">
            <ImageUploader
              onGenerate={handleGenerate}
              busy={isLoading}
              onErrorClear={clearError}
            />
            <ReportViewer 
              report={report} 
              error={error}
              uploadedImage={uploadedImage}
              onDownloadPDF={handleDownloadPDF}
            />
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        title={modalTitle}
        message={modalMessage}
        onClose={closeCustomModal}
      />
    </div>
  );
};

export default App;