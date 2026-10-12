import { Router } from 'express';
import {
  createStaff,
  deleteStaff,
  getStaff,
  getStaffList,
  updateStaff,
} from '../controller/staff.controller.js';
export const staffRouter = Router();
staffRouter.get('/', getStaffList);
staffRouter.get('/:id', getStaff);
staffRouter.post('/', createStaff);
staffRouter.patch('/:id', updateStaff);
staffRouter.delete('/:id', deleteStaff);
