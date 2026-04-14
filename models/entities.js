import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  image: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  logo: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Brand = mongoose.model('Brand', brandSchema);

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  address: { type: String },
  loyaltyPoints: { type: Number, default: 0 },
  totalPurchase: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Customer = mongoose.model('Customer', customerSchema);

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true },
  phone: { type: String },
  address: { type: String },
  company: { type: String },
  taxNumber: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Supplier = mongoose.model('Supplier', supplierSchema);
