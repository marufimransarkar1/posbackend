import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getSalesReport, getProfitReport } from '../controllers/mainController.js';
const router = express.Router();
router.use(protect, authorize('admin', 'manager'));
router.get('/sales', getSalesReport);
router.get('/profit', getProfitReport);
export default router;
