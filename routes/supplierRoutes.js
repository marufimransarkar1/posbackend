import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/entityControllers.js';
const router = express.Router();
router.use(protect);
router.route('/').get(getSuppliers).post(authorize('admin', 'manager'), createSupplier);
router.route('/:id').put(authorize('admin', 'manager'), updateSupplier).delete(authorize('admin'), deleteSupplier);
export default router;
