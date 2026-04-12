import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getExpenses, createExpense, getExpenseCategories, createExpenseCategory } from '../controllers/mainController.js';

const router = express.Router();
router.use(protect);
router.route('/').get(getExpenses).post(createExpense);
router.route('/categories').get(getExpenseCategories).post(authorize('admin', 'manager'), createExpenseCategory);
export default router;
