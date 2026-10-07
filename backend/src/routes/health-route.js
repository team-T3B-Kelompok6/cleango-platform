import { Router } from 'express';

import { getHealth } from '../controller/health-controller.js';

const healthRouter = Router();

healthRouter.get('/', getHealth);

export default healthRouter;

