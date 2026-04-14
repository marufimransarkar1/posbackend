import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, checkCustomerPhone } from '../controllers/entityControllers.js';
const router = express.Router();
router.use(protect);
router.get('/customers/check-phone', checkCustomerPhone);
router.route('/').get(getCustomers).post(createCustomer);
router.route('/:id').put(updateCustomer).delete(authorize('admin', 'manager'), deleteCustomer);
export default router;
