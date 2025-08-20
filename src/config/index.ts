import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
  },

  defaultProvider: process.env.STORAGE_PROVIDER || 'gridfs',

  gridfs: process.env.MONGODB_URI
    ? {
        mongoClient: process.env.MONGODB_URI,
        dbName: process.env.DB_NAME || 'bugoons-v1',
      }
    : null,

  supabase: process.env.SUPABASE_URL
    ? {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY,
        bucket: process.env.SUPABASE_BUCKET || 'code-files',
      }
    : null,

  s3: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.S3_BUCKET_NAME,
      }
    : null,
};
