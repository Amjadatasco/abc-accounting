import type { Account, Contact, Invoice, JournalEntry, ExpenseBill, CompanySettings } from '../types/accounting';

export const initialCompanySettings: CompanySettings = {
  companyName: 'شركة ABC للخدمات والتجارة',
  tagline: 'أنظمة وإدارة الأعمال الذكية',
  taxNumber: '300123456700003',
  commercialRecord: '1010456789',
  phone: '+966 50 123 4567',
  email: 'info@abc-company.com',
  address: 'شارع الملك فهد، الرياض، المملكة العربية السعودية',
  currency: 'دولار أمريكي',
  currencySymbol: '$',
  logoUrl: '/abc_logo.jpg'
};

export const initialAccounts: Account[] = [
  // 1000 - الأصول (Assets)
  { id: 'acc_1000', code: '1000', name: 'الأصول', category: 'asset', type: 'debit', balance: 0, isSystem: true },
  { id: 'acc_1100', code: '1100', name: 'الأصول المتداولة', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1000', isSystem: true },
  { id: 'acc_1110', code: '1110', name: 'الصندوق النقدية (الخزينة)', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1100' },
  { id: 'acc_1120', code: '1120', name: 'الحساب البنكي الرئيسي', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1100' },
  { id: 'acc_1125', code: '1125', name: 'محفظة شام كاش (Sham Cash)', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1100' },
  { id: 'acc_1130', code: '1130', name: 'العملاء (المدينون)', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1100' },
  { id: 'acc_1140', code: '1140', name: 'مخزون البضائع', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1100' },
  { id: 'acc_1200', code: '1200', name: 'الأصول الثابتة', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1000', isSystem: true },
  { id: 'acc_1210', code: '1210', name: 'الأجهزة والمعدات المكتبية', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1200' },
  { id: 'acc_1220', code: '1220', name: 'وسائل النقل والسيارات', category: 'asset', type: 'debit', balance: 0, parentId: 'acc_1200' },

  // 2000 - الخصوم (Liabilities)
  { id: 'acc_2000', code: '2000', name: 'الخصوم', category: 'liability', type: 'credit', balance: 0, isSystem: true },
  { id: 'acc_2100', code: '2100', name: 'الخصوم المتداولة', category: 'liability', type: 'credit', balance: 0, parentId: 'acc_2000', isSystem: true },
  { id: 'acc_2110', code: '2110', name: 'الموردون (الدائنون)', category: 'liability', type: 'credit', balance: 0, parentId: 'acc_2100' },
  { id: 'acc_2120', code: '2120', name: 'ضريبة القيمة المضافة المستحقة', category: 'liability', type: 'credit', balance: 0, parentId: 'acc_2100' },
  { id: 'acc_2130', code: '2130', name: 'مصروفات ورواتب مستحقة', category: 'liability', type: 'credit', balance: 0, parentId: 'acc_2100' },

  // 3000 - حقوق الملكية (Equity)
  { id: 'acc_3000', code: '3000', name: 'حقوق الملكية', category: 'equity', type: 'credit', balance: 0, isSystem: true },
  { id: 'acc_3100', code: '3100', name: 'رأس المال المدفوع', category: 'equity', type: 'credit', balance: 0, parentId: 'acc_3000' },
  { id: 'acc_3200', code: '3200', name: 'الأرباح المبقاة (المرحلة)', category: 'equity', type: 'credit', balance: 0, parentId: 'acc_3000' },

  // 4000 - الإيرادات (Revenues)
  { id: 'acc_4000', code: '4000', name: 'الإيرادات', category: 'revenue', type: 'credit', balance: 0, isSystem: true },
  { id: 'acc_4100', code: '4100', name: 'إيرادات المبيعات والخدمات', category: 'revenue', type: 'credit', balance: 0, parentId: 'acc_4000' },
  { id: 'acc_4200', code: '4200', name: 'إيرادات أخرى متنوعة', category: 'revenue', type: 'credit', balance: 0, parentId: 'acc_4000' },

  // 5000 - المصروفات (Expenses)
  { id: 'acc_5000', code: '5000', name: 'المصروفات', category: 'expense', type: 'debit', balance: 0, isSystem: true },
  { id: 'acc_5100', code: '5100', name: 'تكلفة المبيعات والمشتريات', category: 'expense', type: 'debit', balance: 0, parentId: 'acc_5000' },
  { id: 'acc_5200', code: '5200', name: 'رواتب وأجور الموظفين', category: 'expense', type: 'debit', balance: 0, parentId: 'acc_5000' },
  { id: 'acc_5300', code: '5300', name: 'إيجار المقر والمستودع', category: 'expense', type: 'debit', balance: 0, parentId: 'acc_5000' },
  { id: 'acc_5400', code: '5400', name: 'فواتير الكهرباء والمياه والإنترنت', category: 'expense', type: 'debit', balance: 0, parentId: 'acc_5000' },
  { id: 'acc_5500', code: '5500', name: 'مصاريف تسويق ودعاية', category: 'expense', type: 'debit', balance: 0, parentId: 'acc_5000' },
  { id: 'acc_5600', code: '5600', name: 'ضيافة ونثريات مكتبية', category: 'expense', type: 'debit', balance: 0, parentId: 'acc_5000' }
];

export const initialContacts: Contact[] = [];

export const initialInvoices: Invoice[] = [];

export const initialExpenses: ExpenseBill[] = [];

export const initialJournalEntries: JournalEntry[] = [];

