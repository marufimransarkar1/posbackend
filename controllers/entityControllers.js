import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { Customer, Supplier } from '../models/entities.js';

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort('-createdAt');
  res.json({ success: true, data: users });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, ...updateData } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!user) { res.status(404); throw new Error('User not found'); }
  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted' });
});

// ─── Customers ───────────────────────────────────────────────────────────────
export const getCustomers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filter = {};
  if (req.query.search) filter.$or = [
    { name: { $regex: req.query.search, $options: 'i' } },
    { phone: { $regex: req.query.search, $options: 'i' } },
  ];
  const [customers, total] = await Promise.all([
    Customer.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Customer.countDocuments(filter),
  ]);
  res.json({ success: true, data: customers, total, page, pages: Math.ceil(total / limit) });
});

export const checkCustomerPhone = asyncHandler(async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number required' });
  }
  const existing = await Customer.findOne({ phone });
  res.json({ success: true, exists: !!existing });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create(req.body);
  res.status(201).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!customer) { res.status(404); throw new Error('Customer not found'); }
  res.json({ success: true, data: customer });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await Customer.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Customer deleted' });
});

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const getSuppliers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filter = {};
  if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Supplier.countDocuments(filter),
  ]);
  res.json({ success: true, data: suppliers, total, page, pages: Math.ceil(total / limit) });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ success: true, data: supplier });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
  res.json({ success: true, data: supplier });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  await Supplier.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Supplier deleted' });
});
