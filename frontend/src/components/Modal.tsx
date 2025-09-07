// src/components/Modal.tsx
import React from "react";

type ModalProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

const Modal: React.FC<ModalProps> = ({ open, title, message, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
            {message}
          </p>
        </div>
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
