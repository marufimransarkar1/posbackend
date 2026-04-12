import mongoose from 'mongoose';

// ─── Sale ───────────────────────────────────────────────────────────────────
const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  barcode: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
});

const saleSchema = new mongoose.Schema({
  invoiceNo: { type: String, unique: true, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  change: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'mobile_banking', 'mixed'], default: 'cash' },
  status: { type: String, enum: ['completed', 'refunded', 'partial_refund'], default: 'completed' },
  note: String,
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Sale = mongoose.model('Sale', saleSchema);

// ─── Purchase ────────────────────────────────────────────────────────────────
const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  quantity: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  subtotal: { type: Number, required: true },
});

const purchaseSchema = new mongoose.Schema({
  referenceNo: { type: String, unique: true, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  items: [purchaseItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  status: { type: String, enum: ['ordered', 'received', 'cancelled'], default: 'ordered' },
  note: String,
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Purchase = mongoose.model('Purchase', purchaseSchema);

// ─── Expense ─────────────────────────────────────────────────────────────────
const expenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
}, { timestamps: true });

export const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory' },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Expense = mongoose.model('Expense', expenseSchema);

// ─── Stock Adjustment ────────────────────────────────────────────────────────
const stockAdjSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['increase', 'decrease'], required: true },
  quantity: { type: Number, required: true },
  reason: { type: String },
  previousStock: { type: Number },
  newStock: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const StockAdjustment = mongoose.model('StockAdjustment', stockAdjSchema);

// ─── Settings ────────────────────────────────────────────────────────────────
const settingsSchema = new mongoose.Schema({
  appName: { type: String, default: 'POS System' },
  businessName: String,
  address: String,
  phone: String,
  email: String,
  logo: String,
  currency: { type: String, default: 'BDT' },
  currencySymbol: { type: String, default: ' ৳' },
  taxRate: { type: Number, default: 0 },
  taxName: { type: String, default: 'VAT' },
  invoicePrefix: { type: String, default: 'INV' },
  theme: { type: String, default: 'light' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  loyaltyPointsPerUnit: { type: Number, default: 1 },
  receiptFooter: String,
}, { timestamps: true });

export const Settings = mongoose.model('Settings', settingsSchema);

// ─── License Verification ────────────────────────────────────────────────────
const licenseSchema = new mongoose.Schema({
  installationId: { type: String, required: true, unique: true },
  frontendUrl: String,
  valid: { type: Boolean, default: false },
  expiresAt: Date,
  plan: { type: String, default: 'basic' },
  lastChecked: { type: Date, default: Date.now },
  features: { type: Map, of: Boolean },
}, { timestamps: true });

export const License = mongoose.model('License', licenseSchema);
