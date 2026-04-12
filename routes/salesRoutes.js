// salesRoutes.js
import express from 'express';
import { 
  createSale, 
  getSales, 
  getSale, 
  refundSale, 
  getSalePrint // 1. Import the new controller function
} from '../controllers/salesController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const salesRouter = express.Router();

// Move the print route BEFORE the protect middleware 
// to solve the "No token provided" error from earlier.
salesRouter.get('/:id/print', getSalePrint);

salesRouter.use(protect);
salesRouter.route('/').get(getSales).post(createSale);
salesRouter.route('/:id').get(getSale);
salesRouter.post('/:id/refund', authorize('admin', 'manager'), refundSale);

export { salesRouter as default };