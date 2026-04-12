import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/entityControllers.js';
const router = express.Router();
router.use(protect, authorize('admin'));
router.route('/').get(getUsers).post(createUser);
router.route('/:id').put(updateUser).delete(deleteUser);
export default router;
