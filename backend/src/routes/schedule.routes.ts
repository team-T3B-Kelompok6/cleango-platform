import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  getSchedules,
  updateSchedule,
} from '../controller/schedule.controller.js';

export const scheduleRouter = Router();
scheduleRouter.use(authenticate, requireAdmin);
scheduleRouter.get('/', getSchedules);
scheduleRouter.get('/:id', getSchedule);
scheduleRouter.post('/', createSchedule);
scheduleRouter.patch('/:id', updateSchedule);
scheduleRouter.delete('/:id', deleteSchedule);
