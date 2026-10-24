import { Router, raw } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  dispatchAssignment,
  getAdminTaskBoard,
  getCleanerPhoto,
  getCleanerTask,
  postCleanerEvent,
  postCleanerPhoto,
  resendAdminLink,
  revokeOrderLink,
} from '../controller/cleaner-task.controller.js';

export const cleanerTaskRouter = Router();
cleanerTaskRouter.get('/', getCleanerTask);
cleanerTaskRouter.post('/events', postCleanerEvent);
cleanerTaskRouter.post(
  '/photos',
  raw({ type: ['image/png', 'image/jpeg'], limit: '2mb' }),
  postCleanerPhoto,
);
cleanerTaskRouter.get('/photos/:id', getCleanerPhoto);

export function adminCleanerTaskRoutes(router: Router): void {
  router.get('/cleaner-tasks', authenticate, requireAdmin, getAdminTaskBoard);
  router.post('/cleaner-tasks', authenticate, requireAdmin, resendAdminLink);
  router.post(
    '/orders/:id/cleaner-tasks',
    authenticate,
    requireAdmin,
    dispatchAssignment,
  );
  router.delete(
    '/orders/:id/cleaner-tasks',
    authenticate,
    requireAdmin,
    revokeOrderLink,
  );
}