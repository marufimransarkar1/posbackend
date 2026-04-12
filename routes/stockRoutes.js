import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { adjustStock, getStockAdjustments } from '../controllers/mainController.js';
const router = express.Router();
router.use(protect);
router.route('/adjust').post(authorize('admin', 'manager', 'warehouse'), adjustStock);
router.route('/adjustments').get(getStockAdjustments);
export default router;
