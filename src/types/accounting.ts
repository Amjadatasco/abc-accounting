export type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  type: 'debit' | 'credit';
  balance: number;
  description?: string;
  parentId?: string | null;
  isSystem?: boolean;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
}

export type Currency = 'USD' | 'SYP';

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  reference?: string;
  notes: string;
  currency?: Currency;
  currencySymbol?: string;
  lines: JournalLine[];
  createdAt: string;
}

export type ProductionSource = 'uv' | 'dtf' | 'external' | 'general';

export interface ProductionSourceInfo {
  id: ProductionSource;
  label: string;
  icon: string;
  description: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
}

export const PRODUCTION_SOURCES: ProductionSourceInfo[] = [
  {
    id: 'uv',
    label: 'ماكينة UV',
    icon: '🖨️',
    description: 'طباعة مسطحة / أسطح صلبة وأكريليك وخشب وهدايا',
    badgeBg: '#ede9fe',
    badgeColor: '#6d28d9',
    badgeBorder: '#c4b5fd'
  },
  {
    id: 'dtf',
    label: 'ماكينة DTF',
    icon: '👕',
    description: 'طباعة حرارية للملابس والأقمشة والتيشرتات والأعلام',
    badgeBg: '#d1fae5',
    badgeColor: '#047857',
    badgeBorder: '#6ee7b7'
  },
  {
    id: 'external',
    label: 'مصدر خارجي',
    icon: '🌐',
    description: 'تنفيذ لدى ورش ومطابع خارجية أو موردين معتمدين',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    badgeBorder: '#fcd34d'
  },
  {
    id: 'general',
    label: 'بضاعة عامة / أخرى',
    icon: '📦',
    description: 'مبيعات المخزن الجاهزة أو خدمات عامة متنوعة',
    badgeBg: '#f1f5f9',
    badgeColor: '#475569',
    badgeBorder: '#cbd5e1'
  }
];

export const getProductionSourceDetails = (source?: ProductionSource): ProductionSourceInfo => {
  return PRODUCTION_SOURCES.find(s => s.id === source) || PRODUCTION_SOURCES[3];
};

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage e.g. 15 or 0
  total: number;
  productionSource?: ProductionSource;
}

export interface Product {
  id: string;
  name: string;
  code?: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  currency: Currency;
  currencySymbol: string;
  quantity: number; // Current stock available
  minQuantityAlert?: number; // Low stock threshold
  unit?: string; // قطعة, كرتونة, رول, متر, إلخ
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency?: Currency;
  currencySymbol?: string;
  saleType?: 'service' | 'product';
  productionSource?: ProductionSource;
  paymentMethod?: 'cash' | 'bank' | 'sham_cash' | 'credit';
  status: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
  notes?: string;
  createdAt: string;
}

export type ExpensePayer = 'abc' | 'amjad' | 'nour';

export interface ExpenseBill {
  id: string;
  billNumber: string;
  vendorId?: string;
  vendorName: string;
  accountId: string; // expense account
  date: string;
  amount: number;
  taxAmount: number;
  currency?: Currency;
  currencySymbol?: string;
  exchangeRate?: number; // سعر صرف 1 دولار مقابل الليرة السورية في هذا اليوم (مثلاً 14800 ل.س)
  equivalentAmount?: number; // المبلغ المعادل بالعملة المقابلة
  paymentMethod: 'cash' | 'bank' | 'sham_cash' | 'credit';
  paidBy?: ExpensePayer; // 'abc' = Company Funds, 'amjad' = Amjad, 'nour' = Nour
  status: 'paid' | 'unpaid';
  notes?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  type: 'customer' | 'vendor' | 'both';
  name: string;
  company?: string;
  phone: string;
  email?: string;
  taxNumber?: string;
  address?: string;
  currency?: Currency;
  currencySymbol?: string;
  balance: number; // positive = owes us (receivable) or we owe them (payable)
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  taxNumber: string;
  commercialRecord: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  currencySymbol: string;
  logoUrl?: string;
}
