import { Router } from 'express';
import {
  createFaq,
  deleteFaq,
  getFaq,
  getFaqs,
  updateFaq,
} from '../controller/faq.controller.js';
export const faqRouter = Router();
faqRouter.get('/', getFaqs);
faqRouter.get('/:id', getFaq);
faqRouter.post('/', createFaq);
faqRouter.patch('/:id', updateFaq);
faqRouter.delete('/:id', deleteFaq);
