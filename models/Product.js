import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, unique: true, sparse: true },
  barcode: { type: String, unique: true, sparse: true },
  description: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  unit: { type: String, default: 'pcs' },
  costPrice: { type: Number, required: true, default: 0 },
  sellingPrice: { type: Number, required: true, default: 0 },
  taxRate: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  expiryDate: { type: Date },
  image: { type: String },
  isActive: { type: Boolean, default: true },
  tags: [String],
}, { timestamps: true });

productSchema.virtual('stockStatus').get(function () {
  if (this.stock <= 0) return 'out_of_stock';
  if (this.stock <= this.reorderLevel) return 'low_stock';
  return 'in_stock';
});

productSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Product', productSchema);
