import { RawSheetResponse } from '../types/sales';

interface StoreSeed {
  city: string;
  province: string;
  weight: number;
  recentMomentum: number; // < 1 simulates decline/underperformance
  discountBias: number;
}

interface ProductSeed {
  name: string;
  category: string;
  unitPrice: number;
}

const STORES: StoreSeed[] = [
  { city: 'Toronto', province: 'ON', weight: 1.45, recentMomentum: 1.12, discountBias: 0.08 },
  { city: 'Vancouver', province: 'BC', weight: 1.25, recentMomentum: 1.09, discountBias: 0.09 },
  { city: 'Montreal', province: 'QC', weight: 1.15, recentMomentum: 1.04, discountBias: 0.11 },
  { city: 'Calgary', province: 'AB', weight: 0.95, recentMomentum: 0.98, discountBias: 0.10 },
  { city: 'Ottawa', province: 'ON', weight: 0.85, recentMomentum: 1.05, discountBias: 0.07 },
  { city: 'Winnipeg', province: 'MB', weight: 0.52, recentMomentum: 0.74, discountBias: 0.16 },
];

const PRODUCTS: ProductSeed[] = [
  { name: 'Nordic 4K Smart TV 55"', category: 'Electronics', unitPrice: 649.0 },
  { name: 'Aurora Noise-Cancelling Headphones', category: 'Electronics', unitPrice: 189.0 },
  { name: 'Maple Wireless Mechanical Keyboard', category: 'Electronics', unitPrice: 119.0 },
  { name: 'Boreal Espresso Machine', category: 'Home & Living', unitPrice: 329.0 },
  { name: 'Cedar Cast-Iron Dutch Oven', category: 'Home & Living', unitPrice: 139.0 },
  { name: 'Linen Duvet Cover Set', category: 'Home & Living', unitPrice: 115.0 },
  { name: 'Organic Maple Syrup 1L', category: 'Grocery', unitPrice: 18.5 },
  { name: 'Artisan Roast Coffee Beans 1kg', category: 'Grocery', unitPrice: 24.0 },
  { name: 'Prairie Wildflower Honey 750g', category: 'Grocery', unitPrice: 14.5 },
  { name: 'Alpine Insulated Parka', category: 'Apparel', unitPrice: 245.0 },
  { name: 'Merino Wool Crewneck Sweater', category: 'Apparel', unitPrice: 98.0 },
  { name: 'Everyday Stretch Chino', category: 'Apparel', unitPrice: 74.0 },
  { name: 'Trailblazer Carbon Trekking Poles', category: 'Sports & Outdoors', unitPrice: 89.0 },
  { name: 'Glacier 35L Hiking Pack', category: 'Sports & Outdoors', unitPrice: 149.0 },
  { name: 'Lakeview Yoga Mat Pro', category: 'Sports & Outdoors', unitPrice: 64.0 },
];

const SALESPEOPLE = [
  { name: 'Claire Tremblay', storePref: 'Montreal', skill: 1.25 },
  { name: 'Marcus Chen', storePref: 'Toronto', skill: 1.35 },
  { name: 'Priya Patel', storePref: 'Toronto', skill: 1.18 },
  { name: 'Liam O\'Connor', storePref: 'Vancouver', skill: 1.22 },
  { name: 'Sophia Gagnon', storePref: 'Ottawa', skill: 1.05 },
  { name: 'Noah Kowalski', storePref: 'Calgary', skill: 0.96 },
  { name: 'Hannah Brooks', storePref: 'Vancouver', skill: 1.10 },
  { name: 'Devon Sinclair', storePref: 'Winnipeg', skill: 0.78 },
];

const PAYMENT_METHODS = ['Credit Card', 'Debit', 'Mobile Pay', 'Cash'];
const DISCOUNT_TIERS = [0, 0, 0, 0.05, 0.05, 0.1, 0.1, 0.15, 0.2, 0.25];

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function buildSampleSheetResponse(): RawSheetResponse {
  const rand = mulberry32(20261125);
  const rows: Record<string, unknown>[] = [];

  // Span 14 months ending 2026-11-18 so YoY, MoM, and all date presets have rich data
  const startDate = Date.UTC(2025, 8, 1); // 2025-09-01
  const endDate = Date.UTC(2026, 10, 18); // 2026-11-18
  const totalDays = Math.round((endDate - startDate) / 86_400_000);

  let txSeq = 1001;
  let orderSeq = 5001;

  for (let i = 0; i < 320; i++) {
    const dayOffset = Math.floor(rand() * (totalDays + 1));
    const d = new Date(startDate + dayOffset * 86_400_000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const isRecent = dayOffset > totalDays * 0.65;

    // Weighted store pick
    const storeRoll = rand() * STORES.reduce((acc, s) => acc + s.weight * (isRecent ? s.recentMomentum : 1), 0);
    let cumulative = 0;
    let store = STORES[0];
    for (const s of STORES) {
      cumulative += s.weight * (isRecent ? s.recentMomentum : 1);
      if (storeRoll <= cumulative) {
        store = s;
        break;
      }
    }

    // Pick salesperson mostly aligned with store
    const localPeople = SALESPEOPLE.filter((p) => p.storePref === store.city);
    const spPool = localPeople.length > 0 && rand() < 0.78 ? localPeople : SALESPEOPLE;
    const sp = spPool[Math.floor(rand() * spPool.length)];

    // Pick order size (1 or 2 line items per order occasionally)
    const orderId = `ORD-${orderSeq++}`;
    const lineItems = rand() < 0.22 ? 2 : 1;

    for (let li = 0; li < lineItems; li++) {
      const prod = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
      // Higher discount tier tends to correlate with slightly higher quantity in sample data
      let discountRate = DISCOUNT_TIERS[Math.floor(rand() * DISCOUNT_TIERS.length)];
      if (store.city === 'Winnipeg' && rand() < 0.45) {
        discountRate = 0.2;
      }
      if (prod.category === 'Grocery' && discountRate > 0.15) {
        discountRate = 0.1;
      }

      const baseQty = prod.category === 'Grocery' ? 2 + Math.floor(rand() * 5) : 1 + Math.floor(rand() * 3);
      const discountBoost = discountRate >= 0.15 ? 1 + Math.floor(rand() * 2) : 0;
      const quantity = baseQty + discountBoost;

      const unitPrice = prod.unitPrice;
      const grossSales = round2(quantity * unitPrice);
      const discountAmount = round2(grossSales * discountRate);
      const salesAmount = round2(grossSales - discountAmount);

      const channel = rand() < (store.city === 'Winnipeg' ? 0.28 : 0.38) ? 'Online' : 'In-Store';
      const paymentMethod =
        channel === 'Online'
          ? rand() < 0.75
            ? 'Credit Card'
            : 'Mobile Pay'
          : PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)];

      rows.push({
        'Transaction ID': `TX-${txSeq++}`,
        'Date (yyyy-mm-dd)': dateStr,
        Product: prod.name,
        Category: prod.category,
        Quantity: quantity,
        'Unit Price (CAD)': unitPrice,
        'Discount Rate (0 to 1, so 0.1 means 10%)': discountRate,
        'Gross Sales': grossSales,
        'Discount Amount': discountAmount,
        'Sales Amount (net of discount)': salesAmount,
        'Store (a city)': store.city,
        Province: store.province,
        Country: 'Canada',
        'Sales Channel (In-Store or Online)': channel,
        'Payment Method': paymentMethod,
        Salesperson: sp.name,
        'Order ID': orderId,
      });
    }
  }

  return {
    ok: true,
    sheet: 'Metro Superstore (Sample)',
    updatedAt: '2026-11-18T17:30:00.000Z',
    rowCount: rows.length,
    headers: Object.keys(rows[0]),
    rows,
  };
}
