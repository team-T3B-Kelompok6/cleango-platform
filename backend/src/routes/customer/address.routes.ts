import { Router } from 'express';
import {
  createAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  updateAddress,
} from '../../controller/customer/address.controller.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

export const customerAddressRouter = Router();
customerAddressRouter.use(authenticate, requireCustomer);
customerAddressRouter.get('/', listAddresses);
customerAddressRouter.get('/:id', getAddress);
customerAddressRouter.post('/', createAddress);
customerAddressRouter.patch('/:id', updateAddress);
customerAddressRouter.delete('/:id', deleteAddress);
