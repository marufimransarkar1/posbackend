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
  // Fetch sale and settings in parallel
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

  const {
    businessName = 'RETAIL STORE',
    address = '',
    phone = '',
    email: businessEmail = '',
    currencySymbol = '$',
    receiptFooter = 'Thank you for your purchase!',
    taxName = 'TAX'
  } = settings || {};

  const { invoiceNo, createdAt, total, amountPaid, change, items, customer, subtotal, tax, paymentMethod } = sale;

  const formatPhone = (phoneNumber) => {
    if (!phoneNumber) return '';
    const str = String(phoneNumber).trim();
    // Bangladeshi mobile: 11 digits starting with '01'
    if (/^01[0-9]{9}$/.test(str) && !str.startsWith('+88')) {
      return '+88' + str;
    }
    return str;
  };

  const customerPhone = customer?.phone ? formatPhone(customer.phone) : '';

  // Format date nicely
  const saleDate = new Date(createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${invoiceNo}</title>
        <meta charset="UTF-8">
        <style>
          /* Monarch Envelope (3.87 x 7.5 inches) */
          @page {
            size: 3.87in 7.5in;
            margin: 0;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            width: 3.87in;
            min-height: 7.5in;
            margin: 0 auto;
            padding: 0.25in 0.2in;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.3;
            color: #1e1e1e;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: 700; }
          .uppercase { text-transform: uppercase; letter-spacing: 0.3px; }
          .text-muted { color: #5a5a5a; }

          /* Header */
          .store-header {
            text-align: center;
            margin-bottom: 18px;
            border-bottom: 2px dashed #ccc;
            padding-bottom: 12px;
          }
          .store-name {
            font-size: 20px;
            font-weight: 800;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
          }
          .store-details {
            font-size: 10px;
            color: #444;
          }

          /* Invoice Info */
          .flex-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .invoice-label {
            font-weight: 700;
          }

          /* Divider */
          .divider {
            border-top: 1px dashed #aaa;
            margin: 12px 0;
          }

          /* Customer Section */
          .section-title {
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            margin-bottom: 5px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 3px;
          }
          .customer-details {
            margin-bottom: 10px;
          }
          .customer-details div {
            margin-bottom: 2px;
          }

          /* Items Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }
          .items-table th {
            text-align: left;
            padding: 6px 0 3px 0;
            border-bottom: 1px solid #000;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
          }
          .items-table td {
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
            vertical-align: top;
          }
          .items-table tr:last-child td {
            border-bottom: none;
          }
          .item-name {
            font-weight: 600;
          }
          .item-meta {
            font-size: 9px;
            color: #666;
          }

          /* Totals */
          .totals-container {
            margin-top: 8px;
            border-top: 2px solid #000;
            padding-top: 8px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .total-row.grand-total {
            font-size: 16px;
            font-weight: 800;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px solid #000;
          }

          /* Payment */
          .payment-box {
            background: #f5f5f5;
            padding: 8px;
            margin: 12px 0;
            border-radius: 4px;
          }

          /* Footer */
          .footer {
            margin-top: 25px;
            text-align: center;
            font-size: 9px;
            color: #555;
            border-top: 1px dashed #ccc;
            padding-top: 12px;
          }

          /* Print Optimization */
          @media print {
            body {
              padding: 0.25in 0.2in;
              background: white;
            }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <!-- Store Header -->
        <div class="store-header">
          <div class="store-name uppercase">${businessName}</div>
          ${address ? `<div class="store-details">${address}</div>` : ''}
          ${phone ? `<div class="store-details">Tel: ${phone}</div>` : ''}
          ${businessEmail ? `<div class="store-details">${businessEmail}</div>` : ''}
        </div>

        <!-- Invoice Metadata -->
        <div class="flex-row">
          <span class="invoice-label">INVOICE #:</span>
          <span class="bold">${invoiceNo}</span>
        </div>
        <div class="flex-row">
          <span class="invoice-label">DATE:</span>
          <span>${saleDate}</span>
        </div>
        <div class="flex-row">
          <span class="invoice-label">PAYMENT:</span>
          <span class="uppercase">${paymentMethod.replace('_', ' ')}</span>
        </div>

        <div class="divider"></div>

        <!-- Customer -->
        <div class="section-title">Bill To</div>
        <div class="customer-details">
          ${customer ? `
            <div class="bold">${customer.name}</div>
            ${customerPhone ? `<div>📞 ${customerPhone}</div>` : ''}
            ${customer.email ? `<div>✉️ ${customer.email}</div>` : ''}
            ${customer.address ? `<div class="text-muted">${customer.address}</div>` : ''}
          ` : `<div>Walk-in Customer</div>`}
        </div>

        <div class="divider"></div>

        <!-- Items -->
        <table class="items-table">
          <thead>
            <tr>
              <th width="55%">Item</th>
              <th width="10%" class="text-center">Qty</th>
              <th width="35%" class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>
                  <div class="item-name">${item.name}</div>
                  <div class="item-meta">${currencySymbol}${item.unitPrice.toFixed(2)} each</div>
                  ${item.discount > 0 ? `<div class="item-meta" style="color:#c00;">Disc: -${currencySymbol}${item.discount.toFixed(2)}</div>` : ''}
                </td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${currencySymbol}${item.subtotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-container">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${currencySymbol}${subtotal.toFixed(2)}</span>
          </div>
          ${tax > 0 ? `
          <div class="total-row">
            <span>${taxName} (Incl.)</span>
            <span>${currencySymbol}${tax.toFixed(2)}</span>
          </div>
          ` : ''}
          ${sale.discount > 0 ? `
          <div class="total-row" style="color:#c00;">
            <span>Discount</span>
            <span>-${currencySymbol}${sale.discount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>TOTAL</span>
            <span>${currencySymbol}${total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Payment Details -->
        <div class="payment-box">
          <div class="flex-row">
            <span>Amount Paid</span>
            <span class="bold">${currencySymbol}${amountPaid.toFixed(2)}</span>
          </div>
          <div class="flex-row">
            <span>Change</span>
            <span class="bold">${currencySymbol}${change.toFixed(2)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div>Cashier: ${sale.cashier?.name || 'Admin'}</div>
          <div style="margin-top: 8px;">${receiptFooter}</div>
          <div style="margin-top: 10px; font-size: 8px; color: #888;">
            ${new Date().toLocaleDateString()}
          </div>
        </div>

        <script>
          window.onload = () => {
            window.print();
            // setTimeout(() => { window.close(); }, 1000);
          };
        </script>
      </body>
    </html>
  `;

  res.send(html);
});