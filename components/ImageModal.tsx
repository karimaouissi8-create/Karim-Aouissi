import React from 'react';
import Spinner from './Spinner';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  isLoading: boolean;
  error: string | null;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageSrc, isLoading, error }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
    >
      <div 
        className="bg-gray-900 rounded-lg p-4 max-w-lg w-full m-4 relative border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-2 left-2 text-white bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center"
          aria-label="Close"
        >&times;</button>
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          {isLoading && (
            <div>
                <Spinner />
                <p id="image-modal-title" className="mt-2 text-white">جار إنشاء الصورة...</p>
            </div>
          )}
          {error && <p className="text-red-500">{error}</p>}
          {imageSrc && (
            <img 
              src={imageSrc} 
              alt="Generated illustration" 
              className="max-w-full max-h-[80vh] rounded-md" 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;