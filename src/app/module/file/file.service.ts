import {
  DeleteResult,
  FileMetadata,
  FileStorageService,
  HealthCheckResult,
  MetadataResult,
  ProviderName,
  RetrievalResult,
  StorageFactory,
  StorageProvider,
  UploadedFile,
  UploadResult,
} from './file.interface';

import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import config from '../../../config';
import { createClient } from '@supabase/supabase-js';

// ===== FILE SERVICE LOGIC =====
export const createFileStorageService = (storageFactory: StorageFactory): FileStorageService => {
  const uploadFile = async (
    file: UploadedFile,
    metadata: FileMetadata = {} as FileMetadata,
    providerName?: ProviderName,
  ): Promise<UploadResult> => {
    const provider = storageFactory.getProvider(providerName);

    try {
      const result = await provider.upload(file, metadata);

      return {
        ...result,
        provider: provider.provider,
      };
    } catch (error: any) {
      console.error(`Upload failed with ${provider.provider}:`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  };

  const retrieveFile = async (
    fileId: string,
    providerName?: ProviderName,
  ): Promise<RetrievalResult> => {
    const provider = storageFactory.getProvider(providerName);

    try {
      const result = await provider.retrieve(fileId);

      return {
        ...result,
        provider: provider.provider,
        fromCache: false,
      };
    } catch (error: any) {
      console.error(`Retrieval failed with ${provider.provider}:`, error);
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  };

  const deleteFile = async (fileId: string, providerName?: ProviderName): Promise<DeleteResult> => {
    const provider = storageFactory.getProvider(providerName);

    try {
      const result = await provider.delete(fileId);

      return result;
    } catch (error: any) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  };

  const fileExists = async (fileId: string, providerName?: ProviderName): Promise<boolean> => {
    const provider = storageFactory.getProvider(providerName);
    return provider.exists(fileId);
  };

  const getFileMetadata = async (
    fileId: string,
    providerName?: ProviderName,
  ): Promise<MetadataResult | null> => {
    const provider = storageFactory.getProvider(providerName);
    const result = await provider.getMetadata(fileId);

    return result;
  };

  const retrieveMultipleFiles = async (
    fileIds: string[],
    providerName?: ProviderName,
  ): Promise<RetrievalResult[]> => {
    const promises = fileIds.map((id) => retrieveFile(id, providerName));
    return Promise.allSettled(promises).then((results) =>
      results
        .filter(
          (result): result is PromiseFulfilledResult<RetrievalResult> =>
            result.status === 'fulfilled',
        )
        .map((result) => result.value),
    );
  };

  const switchProvider = (
    newProviderName: ProviderName,
  ): { switched: boolean; provider: string } => {
    // Validates that provider exists
    const provider = storageFactory.getProvider(newProviderName);
    return {
      switched: true,
      provider: provider.provider,
    };
  };

  const healthCheck = async (providerName?: ProviderName): Promise<HealthCheckResult> => {
    return storageFactory.healthCheck(providerName);
  };

  const getActiveProvider = (): string => {
    return storageFactory.getProvider().provider;
  };

  return {
    uploadFile,
    retrieveFile,
    deleteFile,
    fileExists,
    getFileMetadata,
    retrieveMultipleFiles,
    switchProvider,
    healthCheck,
    getActiveProvider,
  };
};

// ===== INTERNAL USE FUNC =====

// ===== GRIDFS PROVIDER =====
export const createGridFSProvider = (): StorageProvider => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB is not connected yet');
  }

  const db = mongoose.connection.db;
  const bucket = new GridFSBucket(db, { bucketName: config.gridfs?.dbName });

  const upload = async (
    file: UploadedFile,
    metadata: FileMetadata = {} as FileMetadata,
  ): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(file.originalname, {
        metadata: {
          ...metadata,
          uploadedAt: new Date(),
          mimeType: file.mimetype,
          originalSize: file.size,
        },
      });

      uploadStream.on('finish', () => {
        resolve({
          fileId: uploadStream.id.toString(),
          filename: file.originalname,
          size: uploadStream.writableLength,
          provider: 'gridfs',
        });
      });

      uploadStream.on('error', (error: Error) => reject(error));
      uploadStream.end(file.buffer);
    });
  };

  const retrieve = async (fileId: string): Promise<RetrievalResult> => {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      try {
        const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

        downloadStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            content: buffer.toString('utf8'),
            buffer,
            provider: 'gridfs',
          });
        });
        downloadStream.on('error', (error: Error) => reject(error));
      } catch (error) {
        reject(error);
      }
    });
  };

  const deleteFile = async (fileId: string): Promise<DeleteResult> => {
    try {
      await bucket.delete(new mongoose.Types.ObjectId(fileId));
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to delete file: ${err.message}`);
    }
  };

  const exists = async (fileId: string): Promise<boolean> => {
    try {
      const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
      return files.length > 0;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  const getMetadata = async (fileId: string): Promise<MetadataResult | null> => {
    try {
      const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
      const file = files[0];

      if (!file) return null;

      return {
        fileId: file._id.toString(),
        filename: file.filename,
        size: file.length,
        uploadedAt: file.uploadDate,
        metadata: file.metadata as FileMetadata,
        provider: 'gridfs',
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  return {
    upload,
    retrieve,
    delete: deleteFile,
    exists,
    getMetadata,
    provider: 'gridfs',
  };
};

// ===== SUPABASE PROVIDER =====
export const createSupabaseProvider = (
  supabaseUrl: string,
  supabaseKey?: string,
  bucketName: string = 'code-files',
): StorageProvider => {
  const supabase = createClient(supabaseUrl, supabaseKey as string);

  const upload = async (
    file: UploadedFile,
    metadata: FileMetadata = {} as FileMetadata,
  ): Promise<UploadResult> => {
    const fileName = `${metadata.userId}/${Date.now()}-${file.originalname}`;

    const { data, error } = await supabase.storage.from(bucketName).upload(fileName, file.buffer, {
      contentType: file.mimetype,
      metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString(),
        originalSize: file.size.toString(),
      },
    });

    if (error) throw new ApiError(httpStatus.NOT_FOUND, `Supabase upload failed: ${error.message}`);

    return {
      fileId: data.path,
      filename: file.originalname,
      size: file.size,
      provider: 'supabase',
    };
  };

  const retrieve = async (fileId: string): Promise<RetrievalResult> => {
    const { data, error } = await supabase.storage.from(bucketName).download(fileId);

    if (error)
      throw new ApiError(httpStatus.NOT_FOUND, `Supabase retrieval failed: ${error.message}`);

    const content = await data.text();
    const buffer = Buffer.from(await data.arrayBuffer());

    return {
      content,
      buffer,
      provider: 'supabase',
    };
  };

  const deleteFile = async (fileId: string): Promise<DeleteResult> => {
    const { error } = await supabase.storage.from(bucketName).remove([fileId]);

    if (error)
      throw new ApiError(httpStatus.NOT_FOUND, `Supabase deletion failed: ${error.message}`);

    return { success: true, message: 'File deleted from Supabase' };
  };

  const exists = async (fileId: string): Promise<boolean> => {
    try {
      const pathParts = fileId.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');

      const { data, error } = await supabase.storage.from(bucketName).list(folderPath);

      if (error) return false;

      return data.some((file: any) => file.name === fileName);
    } catch {
      return false;
    }
  };

  const getMetadata = async (fileId: string): Promise<MetadataResult | null> => {
    try {
      // Supabase doesn't have direct metadata API, so we'll implement a workaround
      const pathParts = fileId.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');

      const { data, error } = await supabase.storage.from(bucketName).list(folderPath);

      if (error) return null;

      const fileInfo = data.find((file: any) => file.name === fileName);

      if (!fileInfo) return null;

      return {
        fileId,
        filename: fileInfo.name,
        size: fileInfo.metadata?.size || 0,
        uploadedAt: new Date(fileInfo.created_at),
        provider: 'supabase',
      };
    } catch {
      return null;
    }
  };

  return {
    upload,
    retrieve,
    delete: deleteFile,
    exists,
    getMetadata,
    provider: 'supabase',
  };
};

// ===== AWS S3 PROVIDER [OPTIONAL] =====
