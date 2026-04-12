import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getSettings, updateSettings } from '../controllers/mainController.js';
const router = express.Router();
router.use(protect);
router.route('/').get(getSettings).put(authorize('admin'), updateSettings);
export default router;
