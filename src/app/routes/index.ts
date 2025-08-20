import express from 'express';
import { UserRoutes } from '../module/user/user.route';
import { FileRoutes } from '../module/file/file.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/files',
    route: FileRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
