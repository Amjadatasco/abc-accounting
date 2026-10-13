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

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage e.g. 15 or 0
  total: number;
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
