import express from 'express';
import asyncHandler from 'express-async-handler';
import { Brand } from '../models/entities.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(asyncHandler(async (req, res) => {
    const brands = await Brand.find({ isActive: true }).sort('name');
    res.json({ success: true, data: brands });
  }))
  .post(authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const brand = await Brand.create(req.body);
    res.status(201).json({ success: true, data: brand });
  }));

router.route('/:id')
  .put(authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: brand });
  }))
  .delete(authorize('admin'), asyncHandler(async (req, res) => {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Brand deleted' });
  }));

export default router;
