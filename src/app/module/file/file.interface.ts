export interface FileMetadata {
  userId: string;
  fileType: 'code' | 'document' | 'other';
  language?: string;
  purpose?: 'review' | 'refactor' | 'history'; // TODO: will change it later
  mimeType?: string;
  uploadedAt?: Date;
  [key: string]: any;
}

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  fileId: string;
  filename: string;
  size: number;
  url?: string;
  provider?: string;
}

export interface RetrievalResult {
  content: string;
  buffer: Buffer;
  provider?: string;
  fromCache?: boolean;
}

export interface DeleteResult {
  success: boolean;
  message?: string;
}

export interface ExistsResult {
  exists: boolean;
  fileId: string;
}

export interface MetadataResult {
  fileId: string;
  filename?: string;
  size?: number;
  uploadedAt?: Date;
  metadata?: FileMetadata;
  provider?: string;
}

export interface HealthCheckResult {
  provider: string;
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  error?: string;
  latency?: number;
}

// STORAGE PROVIDER INTERFACE
export interface StorageProvider {
  upload: (file: UploadedFile, metadata?: FileMetadata) => Promise<UploadResult>;
  retrieve: (fileId: string) => Promise<RetrievalResult>;
  delete: (fileId: string) => Promise<DeleteResult>;
  exists: (fileId: string) => Promise<boolean>;
  getMetadata: (fileId: string) => Promise<MetadataResult | null>;
  provider: string;
}

export type ProviderName = 'gridfs' | 'supabase';

export interface StorageFactory {
  registerProvider: (name: ProviderName, providerFactory: () => StorageProvider) => void;
  getProvider: (providerName?: ProviderName) => StorageProvider;
  listProviders: () => ProviderName[];
  healthCheck: (providerName?: ProviderName) => Promise<HealthCheckResult>;
}

export interface FileStorageService {
  uploadFile: (
    file: UploadedFile,
    metadata?: FileMetadata,
    providerName?: ProviderName,
  ) => Promise<UploadResult>;
  retrieveFile: (fileId: string, providerName?: ProviderName) => Promise<RetrievalResult>;
  deleteFile: (fileId: string, providerName?: ProviderName) => Promise<DeleteResult>;
  fileExists: (fileId: string, providerName?: ProviderName) => Promise<boolean>;
  getFileMetadata: (fileId: string, providerName?: ProviderName) => Promise<MetadataResult | null>;
  retrieveMultipleFiles: (
    fileIds: string[],
    providerName?: ProviderName,
  ) => Promise<RetrievalResult[]>;
  switchProvider: (newProviderName: ProviderName) => { switched: boolean; provider: string };
  healthCheck: (providerName?: ProviderName) => Promise<HealthCheckResult>;
  getActiveProvider: () => string;
}
