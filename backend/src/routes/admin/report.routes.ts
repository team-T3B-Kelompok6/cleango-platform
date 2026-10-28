import { Router } from 'express';
import {
  acknowledgeAlert,
  getAlerts,
  getSummary,
  resolveAlert,
} from '../../controller/admin/report.controller.js';

export const adminReportRouter = Router();
adminReportRouter.get('/summary', getSummary);
adminReportRouter.get('/alerts', getAlerts);
adminReportRouter.patch('/alerts/:id/acknowledge', acknowledgeAlert);
adminReportRouter.patch('/alerts/:id/resolve', resolveAlert);
