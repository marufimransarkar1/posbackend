import asyncHandler from 'express-async-handler';
import { Sale } from '../models/index.js';
import Product from '../models/Product.js';
import { Customer } from '../models/entities.js';
import { Settings } from '../models/index.js';

const generateInvoiceNo = async () => {
  const settings = await Settings.findOne();
  const prefix = settings?.invoicePrefix || 'INV';
  const count = await Sale.countDocuments();
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
};

export const createSale = asyncHandler(async (req, res) => {
  const { items, customerId, discount, paymentMethod, amountPaid, note } = req.body;

  let subtotal = 0, tax = 0;
  const saleItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

    const itemTax = (product.sellingPrice * item.quantity * (product.taxRate / 100));
    const itemSubtotal = product.sellingPrice * item.quantity - (item.discount || 0);
    subtotal += itemSubtotal;
    tax += itemTax;

    saleItems.push({
      product: product._id,
      name: product.name,
      barcode: product.barcode,
      quantity: item.quantity,
      unitPrice: product.sellingPrice,
      discount: item.discount || 0,
      taxRate: product.taxRate,
      subtotal: itemSubtotal,
    });

    // Reduce stock
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
  }

  const total = subtotal + tax - (discount || 0);
  const change = amountPaid - total;

  const sale = await Sale.create({
    invoiceNo: await generateInvoiceNo(),
    customer: customerId || null,
    items: saleItems,
    subtotal,
    discount: discount || 0,
    tax,
    total,
    amountPaid,
    change: Math.max(0, change),
    paymentMethod,
    note,
    cashier: req.user._id,
  });

  // Update customer loyalty points
  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { loyaltyPoints: Math.floor(total), totalPurchase: total },
    });
  }

  await sale.populate('customer cashier items.product');
  res.status(201).json({ success: true, data: sale });
});

export const getSales = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filter = {};

  if (req.query.search) filter.invoiceNo = { $regex: req.query.search, $options: 'i' };
  if (req.query.startDate) filter.createdAt = { $gte: new Date(req.query.startDate) };
  if (req.query.endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.endDate) };
  if (req.query.status) filter.status = req.query.status;

  const [sales, total] = await Promise.all([
    Sale.find(filter).populate('customer', 'name phone').populate('cashier', 'name')
      .sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Sale.countDocuments(filter),
  ]);

  res.json({ success: true, data: sales, total, page, pages: Math.ceil(total / limit) });
});

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customer cashier items.product');
  if (!sale) { res.status(404); throw new Error('Sale not found'); }
  res.json({ success: true, data: sale });
});

export const refundSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) { res.status(404); throw new Error('Sale not found'); }
  if (sale.status === 'refunded') throw new Error('Sale already refunded');

  // Restore stock
  for (const item of sale.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  }

  sale.status = 'refunded';
  await sale.save();
  res.json({ success: true, data: sale, message: 'Sale refunded successfully' });
});


// Add this to your salesController.js

export const getSalePrint = asyncHandler(async (req, res) => {
  // 1. Fetch Sale and Global Settings in parallel
  const [sale, settings] = await Promise.all([
    Sale.findById(req.params.id)
      .populate('customer')
      .populate('cashier', 'name')
      .populate('items.product'),
    Settings.findOne()
  ]);

  if (!sale) {
    res.status(404);
    throw new Error('Sale not found');
  }

  // 2. Destructure Settings with fallbacks
  const {
    businessName = 'RETAIL STORE',
    address = '',
    phone = '',
    currencySymbol = '$',
    receiptFooter = 'Please keep this receipt for your records.'
  } = settings || {};

  const { invoiceNo, createdAt, total, amountPaid, change, items, customer, subtotal, tax } = sale;

  // 3. Generate the Template
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ${invoiceNo}</title>
        <style>
          /* MONARCH ENVELOPE SPECIFIC CSS */
          @page {
            size: 3.87in 7.5in;
            margin: 0;
          }

          body {
            font-family: 'Courier New', Courier, monospace;
            width: 3.87in;
            margin: 0;
            padding: 0.3in;
            box-sizing: border-box;
            color: #000;
            font-size: 12px;
            line-height: 1.4;
          }

          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          
          .header { margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h2 { margin: 0; font-size: 18px; }
          
          .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          
          hr { border: 0; border-top: 1px dashed #000; margin: 10px 0; }
          
          .item-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .item-table th { border-bottom: 1px solid #000; text-align: left; }
          .item-table td { padding: 4px 0; vertical-align: top; }
          
          .totals-section { margin-left: auto; width: 70%; }
          .total-line { font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
          
          .footer { margin-top: 30px; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }
          
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <h2 class="uppercase">${businessName}</h2>
          <div>${address}</div>
          <div>Tel: ${phone}</div>
        </div>

        <div class="info-row">
          <span class="bold">Invoice:</span>
          <span>${invoiceNo}</span>
        </div>
        <div class="info-row">
          <span class="bold">Date:</span>
          <span>${new Date(createdAt).toLocaleString()}</span>
        </div>

        <hr>

        <div class="bold uppercase">Bill To:</div>
        ${customer ? `
          <div>${customer.name}</div>
          ${customer.phone ? `<div>${customer.phone}</div>` : ''}
          ${customer.address ? `<div>${customer.address}</div>` : ''}
        ` : `<div>Walk-in Customer</div>`}

        <hr>

        <table class="item-table">
          <thead>
            <tr>
              <th width="60%">Item</th>
              <th width="10%" class="text-center">Qty</th>
              <th width="30%" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${currencySymbol}${item.subtotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <hr>

        <div class="totals-section">
          <div class="info-row">
            <span>Subtotal:</span>
            <span>${currencySymbol}${subtotal.toFixed(2)}</span>
          </div>
          <div class="info-row">
            <span>Tax:</span>
            <span>${currencySymbol}${tax.toFixed(2)}</span>
          </div>
          <div class="info-row bold total-line">
            <span>TOTAL:</span>
            <span>${currencySymbol}${total.toFixed(2)}</span>
          </div>
          <div class="info-row" style="margin-top: 10px;">
            <span>Paid:</span>
            <span>${currencySymbol}${amountPaid.toFixed(2)}</span>
          </div>
          <div class="info-row">
            <span>Change:</span>
            <span>${currencySymbol}${change.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer text-center">
          <p class="bold">Cashier: ${sale.cashier?.name || 'Admin'}</p>
          <p>${receiptFooter}</p>
          <p style="font-size: 8px; color: #666;">Generated by ${businessName} POS</p>
        </div>

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => { window.close(); }, 700);
          };
        </script>
      </body>
    </html>
  `;

  res.send(html);
});