// src/components/files/FileUploader.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { uploadFile, FileMetadata } from '@/lib/firebase/storage';
import { DocumentIcon, PhotoIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FileUploaderProps {
  entityType: 'group' | 'plan' | 'task';
  entityId: string;
  onUploadComplete?: (file: FileMetadata) => void;
}

export default function FileUploader({ entityType, entityId, onUploadComplete }: FileUploaderProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Reset input to allow uploading the same file again
      e.target.value = '';
    }
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const uploadFiles = async () => {
    if (!user || files.length === 0) return;
    
    setUploading(true);
    setUploadError(null);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create a unique key for this file in the progress tracking object
        const progressKey = `${Date.now()}_${i}`;
        
        try {
          // Upload the file and track progress
          const uploadedFile = await uploadFile(
            file,
            entityType,
            entityId,
            user.uid,
            user.displayName || 'User',
            (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                [progressKey]: progress
              }));
            }
          );
          
          // Call the callback if provided
          if (onUploadComplete) {
            onUploadComplete(uploadedFile);
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          setUploadError(`Failed to upload ${file.name}`);
        }
      }
      
      // Clear the files list after upload attempts
      setFiles([]);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };
  
  const getFileIcon = (file: File) => {
    const type = file.type.split('/')[0];
    
    switch (type) {
      case 'image':
        return <PhotoIcon className="h-8 w-8 text-blue-500" />;
      case 'video':
        return <FilmIcon className="h-8 w-8 text-purple-500" />;
      case 'audio':
        return <MusicalNoteIcon className="h-8 w-8 text-pink-500" />;
      case 'text':
        return <DocumentTextIcon className="h-8 w-8 text-gray-500" />;
      default:
        return <DocumentIcon className="h-8 w-8 text-gray-500" />;
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (!user) return null;
  
  return (
    <div className="mb-4">
      {/* File Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 
          ${files.length > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          cursor-pointer text-center transition-colors
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          disabled={uploading}
        />
        
        {files.length === 0 ? (
          <div>
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Drop files here, or click to select files
            </p>
            <p className="text-xs text-gray-500">
              (Supports files up to 50MB)
            </p>
          </div>
        ) : (
          <div className="text-left">
            <p className="text-sm font-medium text-blue-600 mb-2">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </p>
            
            {/* File List */}
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="relative">
                  <div className="flex items-center space-x-3 bg-white p-2 rounded-md shadow-sm">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {uploadError && (
        <div className="mt-2 text-sm text-red-600">
          {uploadError}
        </div>
      )}
      
      {/* Upload Button */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={uploadFiles}
          disabled={files.length === 0 || uploading}
          className={`
            inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
            ${files.length === 0 || uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          `}
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            'Upload Files'
          )}
        </button>
      </div>
    </div>
  );
}