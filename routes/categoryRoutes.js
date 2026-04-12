import express from 'express';
import asyncHandler from 'express-async-handler';
import { Category } from '../models/entities.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(asyncHandler(async (req, res) => {
    const cats = await Category.find({ isActive: true }).sort('name');
    res.json({ success: true, data: cats });
  }))
  .post(authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const cat = await Category.create(req.body);
    res.status(201).json({ success: true, data: cat });
  }));

router.route('/:id')
  .put(authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: cat });
  }))
  .delete(authorize('admin'), asyncHandler(async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  }));

export default router;
