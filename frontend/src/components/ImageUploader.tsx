// src/components/ImageUploader.tsx
import React, { useMemo, useState } from "react";
import { Upload, FileImage, Loader2 } from 'lucide-react';

type Props = {
  onGenerate: (file: File) => Promise<void>;
  busy?: boolean;
  onErrorClear?: () => void;
};

const ImageUploader: React.FC<Props> = ({ onGenerate, busy, onErrorClear }) => {
  const [image, setImage] = useState<File | null>(null);

  const previewUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : ""),
    [image]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onErrorClear?.();
    const file = e.target.files?.[0] || null;
    setImage(file);
  };

  const handleClick = async () => {
    if (!image) return;
    await onGenerate(image);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <div className="bg-green-100 p-2 rounded-lg">
          <FileImage className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Upload X-Ray Image</h2>
      </div>

      <div className="space-y-4">
        <div className="relative flex flex-col items-center gap-4 p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-blue-50 hover:border-blue-400 transition-all duration-300">
          <input
            type="file"
            accept="image/*"
            id="image-upload"
            onChange={handleChange}
            disabled={busy}
            className="hidden"
          />
          <label
            htmlFor="image-upload"
            className={`cursor-pointer ${busy ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <div className="p-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 transition-all duration-200">
              <Upload className="h-10 w-10" />
            </div>
          </label>

          {image ? (
            <div className="text-center w-full">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm mb-3">
                <FileImage className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-700 font-medium">{image.name}</p>
              </div>
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt="X-Ray Preview"
                  className="max-h-64 w-auto mx-auto rounded-lg shadow-lg border-2 border-gray-200 group-hover:border-blue-400 transition-all"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all" />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 font-medium mb-1">
                Click to upload or drag & drop
              </p>
              <p className="text-gray-400 text-sm">
                Supported: JPG, PNG, JPEG (Max 10MB)
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleClick}
          disabled={!image || busy}
          className="w-full py-3.5 px-6 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing X-Ray...
            </>
          ) : (
            <>
              <FileImage className="w-5 h-5" />
              Generate AI Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
