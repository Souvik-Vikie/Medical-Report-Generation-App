import React, { useState } from 'react';
import { User, Calendar, FileText } from 'lucide-react';

export interface PatientData {
  name: string;
  age: string;
  sex: string;
  caseHistory: string;
  symptoms: string;
  referringDoctor: string;
}

interface PatientFormProps {
  onDataChange: (data: PatientData) => void;
  disabled?: boolean;
}

const PatientForm: React.FC<PatientFormProps> = ({ onDataChange, disabled = false }) => {
  const [formData, setFormData] = useState<PatientData>({
    name: '',
    age: '',
    sex: '',
    caseHistory: '',
    symptoms: '',
    referringDoctor: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <div className="bg-blue-100 p-2 rounded-lg">
          <User className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Patient Information</h2>
      </div>

      <form className="space-y-5">
        {/* Patient Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            Patient Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Enter full name"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            required
          />
        </div>

        {/* Age and Sex Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className="block text-sm font-semibold text-gray-700 mb-2">
              Age <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              disabled={disabled}
              placeholder="Age"
              min="0"
              max="150"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div>
            <label htmlFor="sex" className="block text-sm font-semibold text-gray-700 mb-2">
              Sex <span className="text-red-500">*</span>
            </label>
            <select
              id="sex"
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              disabled={disabled}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white cursor-pointer"
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Referring Doctor */}
        <div>
          <label htmlFor="referringDoctor" className="block text-sm font-semibold text-gray-700 mb-2">
            Referring Doctor
          </label>
          <input
            type="text"
            id="referringDoctor"
            name="referringDoctor"
            value={formData.referringDoctor}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Dr. Name"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Symptoms */}
        <div>
          <label htmlFor="symptoms" className="block text-sm font-semibold text-gray-700 mb-2">
            Current Symptoms
          </label>
          <textarea
            id="symptoms"
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Describe current symptoms..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Case History */}
        <div>
          <label htmlFor="caseHistory" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Medical History
          </label>
          <textarea
            id="caseHistory"
            name="caseHistory"
            value={formData.caseHistory}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Previous medical history, chronic conditions, medications, allergies..."
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-2">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">Information Note</p>
              <p className="text-xs text-blue-700 mt-1">
                This data will be included in the generated medical report PDF. Please ensure all required fields are filled accurately.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
