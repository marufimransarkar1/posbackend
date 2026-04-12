import express from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, searchByBarcode, uploadProductImage } from '../controllers/productController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();
router.use(protect);
router.route('/').get(getProducts).post(authorize('admin', 'manager'), createProduct);
router.route('/:id').get(getProduct).put(authorize('admin', 'manager'), updateProduct).delete(authorize('admin'), deleteProduct);
router.get('/barcode/:barcode', searchByBarcode);
router.post('/:id/upload', authorize('admin', 'manager'), upload.single('image'), uploadProductImage);
export default router;
