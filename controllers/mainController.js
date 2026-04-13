import asyncHandler from 'express-async-handler';
import { Purchase, Expense, ExpenseCategory, StockAdjustment, Settings } from '../models/index.js';
import { Customer, Supplier } from '../models/entities.js';
import { Sale } from '../models/index.js';
import Product from '../models/Product.js';

// ─── Purchases ───────────────────────────────────────────────────────────────
const genRef = async () => {
  const count = await Purchase.countDocuments();
  return `PO-${String(count + 1).padStart(6, '0')}`;
};

export const createPurchase = asyncHandler(async (req, res) => {
  const { items, supplierId, tax, shipping, note } = req.body;
  let subtotal = 0;
  const purchaseItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const itemSubtotal = item.unitCost * item.quantity;
    subtotal += itemSubtotal;
    purchaseItems.push({ product: product._id, name: product.name, quantity: item.quantity, unitCost: item.unitCost, subtotal: itemSubtotal });
  }

  const total = subtotal + (tax || 0) + (shipping || 0);
  const purchase = await Purchase.create({
    referenceNo: await genRef(),
    supplier: supplierId || null,
    items: purchaseItems,
    subtotal,
    tax: tax || 0,
    shipping: shipping || 0,
    total,
    due: total,
    note,
    receivedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: purchase });
});

export const receivePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase || purchase.status === 'received') throw new Error('Cannot receive this purchase');

  for (const item of purchase.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity }, $set: { costPrice: item.unitCost } });
  }

  purchase.status = 'received';
  await purchase.save();
  res.json({ success: true, data: purchase, message: 'Purchase received' });
});

export const getPurchases = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const [purchases, total] = await Promise.all([
    Purchase.find().populate('supplier', 'name').populate('receivedBy', 'name')
      .sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Purchase.countDocuments(),
  ]);
  res.json({ success: true, data: purchases, total, page, pages: Math.ceil(total / limit) });
});

// ─── Expenses ────────────────────────────────────────────────────────────────
export const getExpenses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.startDate) filter.date = { $gte: new Date(req.query.startDate) };
  if (req.query.endDate) filter.date = { ...filter.date, $lte: new Date(req.query.endDate) };

  const [expenses, total] = await Promise.all([
    Expense.find(filter).populate('category', 'name').populate('createdBy', 'name')
      .sort('-date').skip((page - 1) * limit).limit(limit),
    Expense.countDocuments(filter),
  ]);
  res.json({ success: true, data: expenses, total, page, pages: Math.ceil(total / limit) });
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: expense });
});

export const getExpenseCategories = asyncHandler(async (req, res) => {
  const cats = await ExpenseCategory.find().sort('name');
  res.json({ success: true, data: cats });
});

export const createExpenseCategory = asyncHandler(async (req, res) => {
  const cat = await ExpenseCategory.create(req.body);
  res.status(201).json({ success: true, data: cat });
});

// ─── Stock Adjustment ────────────────────────────────────────────────────────
export const adjustStock = asyncHandler(async (req, res) => {
  const { productId, type, quantity, reason } = req.body;
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const previousStock = product.stock;
  const newStock = type === 'increase' ? previousStock + quantity : previousStock - quantity;
  if (newStock < 0) throw new Error('Stock cannot go below 0');

  await Product.findByIdAndUpdate(productId, { stock: newStock });

  const adj = await StockAdjustment.create({
    product: productId,
    type,
    quantity,
    reason,
    previousStock,
    newStock,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: adj });
});

export const getStockAdjustments = asyncHandler(async (req, res) => {
  const adjs = await StockAdjustment.find()
    .populate('product', 'name sku').populate('createdBy', 'name')
    .sort('-createdAt').limit(100);
  res.json({ success: true, data: adjs });
});

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todaySales, monthSales, totalProducts, lowStockCount, totalCustomers] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: today }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ $expr: { $lte: ['$stock', '$reorderLevel'] }, stock: { $gt: 0 } }),
    Customer.countDocuments(),
  ]);

  // Last 7 days sales chart data
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const salesChart = await Sale.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo }, status: 'completed' } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$total' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Top products
  const topProducts = await Sale.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: monthStart } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', name: { $first: '$items.name' }, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.subtotal' } } },
    { $sort: { totalRevenue: -1 } },
    { $limit: 5 },
  ]);

  res.json({
    success: true,
    data: {
      today: todaySales[0] || { total: 0, count: 0 },
      month: monthSales[0] || { total: 0, count: 0 },
      totalProducts,
      lowStockCount,
      totalCustomers,
      salesChart,
      topProducts,
    },
  });
});

// ─── Reports ─────────────────────────────────────────────────────────────────
export const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  const matchFilter = { status: 'completed' };
  if (startDate) matchFilter.createdAt = { $gte: new Date(startDate) };
  if (endDate) matchFilter.createdAt = { ...matchFilter.createdAt, $lte: new Date(endDate) };

  const formatMap = { day: '%Y-%m-%d', week: '%Y-%U', month: '%Y-%m' };
  const report = await Sale.aggregate([
    { $match: matchFilter },
    { $group: { _id: { $dateToString: { format: formatMap[groupBy], date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 }, profit: { $sum: { $subtract: ['$total', '$subtotal'] } } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data: report });
});

export const getProfitReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchFilter = { status: 'completed' };
  if (startDate) matchFilter.createdAt = { $gte: new Date(startDate) };
  if (endDate) matchFilter.createdAt = { ...matchFilter.createdAt, $lte: new Date(endDate) };

  const [sales, expenses, purchases] = await Promise.all([
    Sale.aggregate([{ $match: matchFilter }, { $group: { _id: null, revenue: { $sum: '$total' } } }]),
    Expense.aggregate([
      { $match: startDate ? { date: { $gte: new Date(startDate), $lte: new Date(endDate || Date.now()) } } : {} },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Purchase.aggregate([
      { $match: { status: 'received' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);

  const revenue = sales[0]?.revenue || 0;
  const totalExpenses = expenses[0]?.total || 0;
  const cogs = purchases[0]?.total || 0;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - totalExpenses;

  res.json({ success: true, data: { revenue, cogs, grossProfit, totalExpenses, netProfit } });
});

// ─── Settings ────────────────────────────────────────────────────────────────
export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();
  Object.assign(settings, req.body);
  await settings.save();
  res.json({ success: true, data: settings });
});