import { Router } from 'express';
import { addressController } from '../controllers/address.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator.js';
import { uuidParamSchema } from '../validators/common.validator.js';

export const addressRouter = Router();
addressRouter.use(authenticate);
addressRouter.get('/', asyncHandler(addressController.list));
addressRouter.get('/:id', validate(uuidParamSchema, 'params'), asyncHandler(addressController.find));
addressRouter.post('/', validate(createAddressSchema), asyncHandler(addressController.create));
addressRouter.patch('/:id', validate(uuidParamSchema, 'params'), validate(updateAddressSchema), asyncHandler(addressController.update));
addressRouter.delete('/:id', validate(uuidParamSchema, 'params'), asyncHandler(addressController.remove));
