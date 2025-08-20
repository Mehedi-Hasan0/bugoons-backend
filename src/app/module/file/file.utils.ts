// ===== BASE STORAGE PROVIDER FACTORY =====

import config from '../../../config';
import ApiError from '../../../errors/ApiError';
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
import { createFileStorageService, createGridFSProvider } from './file.service';
import httpStatus from 'http-status';

export const createStorageProvider = (config: any): StorageProvider => ({
  upload: async (file: UploadedFile, metadata?: FileMetadata): Promise<UploadResult> => {
    throw new Error('Upload method not implemented');
  },
  retrieve: async (fileId: string): Promise<RetrievalResult> => {
    throw new Error('Retrieve method not implemented');
  },
  delete: async (fileId: string): Promise<DeleteResult> => {
    throw new Error('Delete method not implemented');
  },
  exists: async (fileId: string): Promise<boolean> => {
    throw new Error('Exists method not implemented');
  },
  getMetadata: async (fileId: string): Promise<MetadataResult | null> => {
    throw new Error('GetMetadata method not implemented');
  },
  provider: 'base',
});

// ===== STORAGE FACTORY =====
export const createStorageFactory = (): StorageFactory => {
  const providers = new Map<ProviderName, () => StorageProvider>();

  const registerProvider = (name: ProviderName, providerFactory: () => StorageProvider): void => {
    providers.set(name, providerFactory);
  };

  const getProvider = (providerName?: ProviderName): StorageProvider => {
    const name = providerName || (config.defaultProvider as ProviderName);
    const providerFactory = providers.get(name);

    if (!providerFactory) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Storage provider '${name}' not found. Available: ${Array.from(providers.keys()).join(', ')}`,
      );
    }

    return providerFactory();
  };

  const listProviders = (): ProviderName[] => {
    return Array.from(providers.keys());
  };

  const healthCheck = async (providerName?: ProviderName): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const provider = getProvider(providerName);

    try {
      // Test with a dummy file ID that shouldn't exist
      await provider.exists('health-check-dummy-file-id-' + Date.now());

      return {
        provider: provider.provider,
        status: 'healthy',
        timestamp: new Date(),
        latency: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        provider: provider.provider,
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
        latency: Date.now() - startTime,
      };
    }
  };

  // Auto-register providers based on config
  if (config.gridfs?.mongoClient) {
    registerProvider('gridfs', () => createGridFSProvider());
  }

  //   if (config.supabase?.url) {
  //     registerProvider('supabase', () =>
  //       createSupabaseProvider(config.supabase!.url, config.supabase!.key, config.supabase!.bucket)
  //     );
  //   }

  return {
    registerProvider,
    getProvider,
    listProviders,
    healthCheck,
  };
};

// ===== INITIALIZATION FUNCTION =====
export const initializeStorageSystem = async (): Promise<{
  fileStorageService: FileStorageService;
  storageFactory: StorageFactory;
}> => {
  const storageFactory = createStorageFactory(); // Default return 'gridfs' factory. If we want supabase we have change it inside the factory function
  const fileStorageService = createFileStorageService(storageFactory);

  return {
    fileStorageService,
    storageFactory,
  };
};
