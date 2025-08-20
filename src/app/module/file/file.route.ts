import express from 'express';
import createFileUploadMiddleware from '../../middlewares/createFileUploadMiddleware';
import { FileController } from './file.controller';

const router = express.Router();

const uploadMiddleware = createFileUploadMiddleware();

router.post('/upload', uploadMiddleware, FileController.uploadFiles);

export const FileRoutes = router;
