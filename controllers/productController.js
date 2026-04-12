import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';

const buildQuery = (query) => {
  const filter = {};
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };
  if (query.category) filter.category = query.category;
  if (query.brand) filter.brand = query.brand;
  if (query.status === 'low_stock') filter.$expr = { $lte: ['$stock', '$reorderLevel'] };
  if (query.status === 'out_of_stock') filter.stock = 0;
  if (query.barcode) filter.barcode = query.barcode;
  return filter;
};

export const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filter = buildQuery(req.query);
  const sort = req.query.sort || '-createdAt';

  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name').populate('brand', 'name')
      .sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, data: products, total, page, pages: Math.ceil(total / limit) });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category brand');
  if (!product) { res.status(404); throw new Error('Product not found'); }
  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) { res.status(404); throw new Error('Product not found'); }
  res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }
  res.json({ success: true, message: 'Product deleted' });
});

export const searchByBarcode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ barcode: req.params.barcode }).populate('category brand');
  if (!product) { res.status(404); throw new Error('Product not found'); }
  res.json({ success: true, data: product });
});

export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('No file uploaded'); }
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { image: req.file.path },
    { new: true }
  );
  res.json({ success: true, data: product });
});
