import multer, { FileFilterCallback } from 'multer';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import path from 'path';
import { Request } from 'express';

const createFileUploadMiddleware = () => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const allowedTypes = ['.js', '.py', '.ts', '.jsx', '.tsx'];
      const fileExt = path.extname(file.originalname).toLowerCase();

      if (allowedTypes.includes(fileExt)) {
        cb(null, true);
      } else {
        cb(new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Only javascript files are allowed'));
      }
    },
  });

  return upload.array('codeFiles', 10);
};

export default createFileUploadMiddleware;
