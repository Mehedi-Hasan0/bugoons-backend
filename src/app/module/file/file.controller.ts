import { NextFunction, Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { UploadedFile } from './file.interface';

const uploadFiles = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as UploadedFile[];
    console.log('hit', files);
  } catch (error) {
    next(error);
  }
});

export const FileController = {
  uploadFiles,
};
