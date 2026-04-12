import express from 'express';
import { createPurchase, getPurchases, receivePurchase } from '../controllers/mainController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
const router = express.Router();
router.use(protect);
router.route('/').get(getPurchases).post(authorize('admin', 'manager'), createPurchase);
router.post('/:id/receive', authorize('admin', 'manager', 'warehouse'), receivePurchase);
export default router;
