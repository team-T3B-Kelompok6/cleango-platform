import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { getAuditLogs } from '../controller/audit.controller.js';

export const auditRouter = Router();
auditRouter.use(authenticate, requireAdmin);
auditRouter.get('/', getAuditLogs);
