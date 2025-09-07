// src/components/ImageUploader.tsx
import React, { useMemo, useState } from "react";

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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-700">Upload X-ray Image</h2>
      <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
        <input
          type="file"
          accept="image/*"
          id="image-upload"
          onChange={handleChange}
          className="hidden"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <div className="p-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors">
            {/* upload icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
        </label>

        {image ? (
          <div className="text-center">
            <p className="text-sm text-gray-700 font-medium">{image.name}</p>
            <img
              src={previewUrl}
              alt="Preview"
              className="mt-4 max-h-48 rounded-lg shadow-md"
            />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Drag & drop your file here, or click to browse
          </p>
        )}
      </div>

      <div className="pt-2">
        <button
          onClick={handleClick}
          disabled={!image || busy}
          className="w-full py-3 px-6 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? "Generating..." : "Generate Report"}
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
