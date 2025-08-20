// ===== TYPE GUARDS & VALIDATORS =====

import { FileMetadata } from './file.interface';

export const isValidFileType = (filename: string): boolean => {
  const allowedExtensions = ['.js', '.py', '.ts', '.jsx', '.tsx', '.vue', '.svelte'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(ext);
};

export const validateFileSize = (size: number, maxSize: number = 5 * 1024 * 1024): boolean => {
  return size <= maxSize; // Default 5MB
};

export const sanitizeMetadata = (metadata: Partial<FileMetadata>): FileMetadata => {
  return {
    userId: metadata.userId || 'anonymous',
    fileType: metadata.fileType || 'code',
    language: metadata.language || 'javascript',
    purpose: metadata.purpose || 'review',
    uploadedAt: new Date(),
    ...metadata,
  };
};
