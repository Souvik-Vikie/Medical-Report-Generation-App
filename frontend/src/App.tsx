// src/App.tsx
import React, { useState } from "react";
import Header from "./components/Header";
import ImageUploader from "./components/ImageUploader";
import ReportViewer from "./components/ReportViewer";
import PatientForm, { PatientData } from "./components/PatientForm";
import Modal from "./components/Modal";
import { uploadImageForReport } from "./api";
import { generateMedicalReportPDF } from "./utils/pdfGenerator";

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [patientData, setPatientData] = useState<PatientData>({
    name: '',
    age: '',
    sex: '',
    caseHistory: '',
    symptoms: '',
    referringDoctor: ''
  });

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
        patientData: patientData,
        doctorName: patientData.referringDoctor || "Medical AI Assistant"
      });
      showCustomModal("Success", "PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      showCustomModal("Error", "Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="flex flex-col items-center">
        <Header />

        {/* Main Content Area */}
        <div className="w-full max-w-7xl mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Patient Form */}
            <div className="lg:col-span-1">
              <PatientForm
                onDataChange={setPatientData}
                disabled={isLoading}
              />
            </div>

            {/* Right Column - X-ray Upload and Report */}
            <div className="lg:col-span-2 space-y-6">
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