// src/components/files/FileList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getEntityFiles, deleteFile, FileMetadata } from '@/lib/firebase/storage';
import { DocumentIcon, PhotoIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface FileListProps {
  entityType: 'group' | 'plan' | 'task';
  entityId: string;
  onFileDeleted?: () => void;
}

export default function FileList({ entityType, entityId, onFileDeleted }: FileListProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const fetchFiles = async () => {
      if (!user) return;
      
      try {
        const fetchedFiles = await getEntityFiles(entityType, entityId);
        setFiles(fetchedFiles);
      } catch (err) {
        console.error('Error fetching files:', err);
        setError('Failed to load files');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFiles();
  }, [user, entityType, entityId]);
  
  const handleDeleteFile = async (fileId: string) => {
    if (!user) return;
    
    setDeleting(prev => ({ ...prev, [fileId]: true }));
    
    try {
      await deleteFile(fileId, user.uid);
      
      // Update local state
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
      // Call the callback if provided
      if (onFileDeleted) {
        onFileDeleted();
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    } finally {
      setDeleting(prev => ({ ...prev, [fileId]: false }));
    }
  };
  
  const getFileIcon = (file: FileMetadata) => {
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
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-red-600 py-4">
        {error}
      </div>
    );
  }
  
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2">No files uploaded yet</p>
      </div>
    );
  }
  
  return (
    <ul className="divide-y divide-gray-200">
      {files.map((file) => (
        <li key={file.id} className="py-4">
          <div className="flex items-center space-x-4">
            {getFileIcon(file)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <div className="flex items-center text-xs text-gray-500">
                <span>{formatFileSize(file.size)}</span>
                <span className="mx-1">•</span>
                <span>Uploaded by {file.uploadedByName}</span>
                <span className="mx-1">•</span>
                <span>
                  {file.uploadedAt && format(file.uploadedAt.toDate ? file.uploadedAt.toDate() : new Date(file.uploadedAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                title="Download"
                download={file.name}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </a>
              
              {user && (user.uid === file.uploadedBy) && (
                <button
                  type="button"
                  onClick={() => handleDeleteFile(file.id)}
                  disabled={deleting[file.id]}
                  className={`
                    p-2 rounded-full
                    ${deleting[file.id]
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                    }
                  `}
                  title="Delete"
                >
                  {deleting[file.id] ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                  ) : (
                    <TrashIcon className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}