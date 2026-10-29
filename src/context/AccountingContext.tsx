import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  Account, 
  JournalEntry, 
  Invoice, 
  ExpenseBill, 
  Contact, 
  CompanySettings,
  Currency,
  Product,
  Asset
} from '../types/accounting';
import { 
  initialAccounts, 
  initialContacts, 
  initialInvoices, 
  initialExpenses, 
  initialJournalEntries, 
  initialCompanySettings,
  initialProducts,
  initialAssets
} from '../data/initialData';

import { 
  getSupabaseClient, 
  getSupabaseConfig 
} from '../lib/supabaseClient';

export interface CurrencyMetrics {
  revenue: number;
  expenses: number;
  netProfit: number;
  receivables: number;
  payables: number;
  invoicesCount: number;
  expensesCount: number;
}

interface AccountingContextType {
  accounts: Account[];
  journalEntries: JournalEntry[];
  invoices: Invoice[];
  expenses: ExpenseBill[];
  contacts: Contact[];
  products: Product[];
  assets: Asset[];
  companySettings: CompanySettings;
  
  // Cloud Sync
  cloudSyncStatus: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
  cloudSyncMessage: string;
  isCloudEnabled: boolean;
  refreshFromCloud: () => Promise<void>;
  pushAllToCloud: () => Promise<boolean>;

  // Actions
  addAccount: (account: Omit<Account, 'id'>) => void;
  deleteAccount: (id: string) => boolean;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  markInvoicePaid: (id: string, accountId?: string) => void;
  deleteInvoice: (id: string) => void;
  addExpense: (expense: Omit<ExpenseBill, 'id' | 'createdAt'>) => void;
  updateExpense: (expense: ExpenseBill) => void;
  deleteExpense: (id: string) => void;
  updateJournalEntry: (entry: JournalEntry) => { success: boolean; error?: string };
  deleteJournalEntry: (id: string) => void;
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (id: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  adjustProductStock: (productId: string, deltaQuantity: number, reason?: string) => void;
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => void;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void;
  updateCompanySettings: (settings: CompanySettings) => void;
  resetToDefaultData: () => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;

  // Financial Computations
  metrics: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    cashAndBank: number;
    accountsReceivable: number;
    accountsPayable: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  };
  metricsByCurrency: {
    USD: CurrencyMetrics;
    SYP: CurrencyMetrics;
  };
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

const STORAGE_KEY = 'abc_accounting_erp_data_v6';

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
    if (!saved) return initialAccounts;
    try {
      const parsed: Account[] = JSON.parse(saved);
      const existingCodes = new Set(parsed.map(a => a.code));
      const missing = initialAccounts.filter(a => !existingCodes.has(a.code));
      if (missing.length > 0) {
        const merged = [...parsed, ...missing];
        localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    } catch {
      return initialAccounts;
    }
  });

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_journal`);
    return saved ? JSON.parse(saved) : initialJournalEntries;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_invoices`);
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [expenses, setExpenses] = useState<ExpenseBill[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
    if (!saved) return initialExpenses;
    try {
      const parsed: ExpenseBill[] = JSON.parse(saved);
      const initialMap = new Map(initialExpenses.map(e => [e.id, e]));
      const updated = parsed.map(exp => {
        const init = initialMap.get(exp.id);
        if (init && (exp.accountId === 'acc_5600' || exp.accountId === 'acc_5400' || !exp.accountId) && init.accountId !== exp.accountId) {
          return { ...exp, accountId: init.accountId };
        }
        return exp;
      });
      const existingIds = new Set(updated.map(e => e.id));
      const missing = initialExpenses.filter(e => !existingIds.has(e.id));
      const finalExpenses = missing.length > 0 ? [...updated, ...missing] : updated;
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(finalExpenses));
      return finalExpenses;
    } catch {
      return initialExpenses;
    }
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_contacts`);
    return saved ? JSON.parse(saved) : initialContacts;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const oldIds = new Set(['prd_001', 'prd_002', 'prd_003', 'prd_004', 'prd_005']);
    const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
    if (!saved) return initialProducts.filter(p => !oldIds.has(p.id));
    try {
      const parsed: Product[] = JSON.parse(saved);
      const cleaned = parsed.filter(p => !oldIds.has(p.id));
      const existingIds = new Set(cleaned.map(p => p.id));
      const missing = initialProducts.filter(p => !oldIds.has(p.id) && !existingIds.has(p.id));
      const finalProducts = missing.length > 0 ? [...cleaned, ...missing] : cleaned;
      localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(finalProducts));
      return finalProducts;
    } catch {
      return initialProducts.filter(p => !oldIds.has(p.id));
    }
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_assets`);
    if (!saved) return initialAssets;
    try {
      const parsed: Asset[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map(a => a.id));
      const missing = initialAssets.filter(a => !existingIds.has(a.id));
      if (missing.length > 0) {
        const merged = [...parsed, ...missing];
        localStorage.setItem(`${STORAGE_KEY}_assets`, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    } catch {
      return initialAssets;
    }
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
    return saved ? JSON.parse(saved) : initialCompanySettings;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_journal`, JSON.stringify(journalEntries));
  }, [journalEntries]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_invoices`, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_contacts`, JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
    syncProductsToCloud(products);
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_assets`, JSON.stringify(assets));
    syncAssetsToCloud(assets);
  }, [assets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(companySettings));
  }, [companySettings]);

  // Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'>('disconnected');
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string>('');
  const [isCloudEnabled, setIsCloudEnabled] = useState<boolean>(() => getSupabaseConfig().isConfigured);

  // Background Cloud Sync Helpers (Non-blocking optimistic updates)
  const syncProductsToCloud = async (productsList: Product[]) => {
    try {
      const client = getSupabaseClient();
      if (!client) return;
      await client.from('accounting_settings').upsert({
        id: 'inventory_products',
        data: productsList,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('Failed to sync products to cloud:', err);
    }
  };

  const syncAssetsToCloud = async (assetsList: Asset[]) => {
    try {
      const client = getSupabaseClient();
      if (!client) return;
      await client.from('accounting_settings').upsert({
        id: 'fixed_assets',
        data: assetsList,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('Failed to sync assets to cloud:', err);
    }
  };

  // Background Cloud Sync Helpers (Non-blocking optimistic updates)
  const syncRowToCloud = async (table: string, payload: any) => {
    try {
      const client = getSupabaseClient();
      if (!client) return;
      const { error } = await client.from(table).upsert(payload);
      if (error) console.warn(`Supabase upsert to ${table} error:`, error.message);
    } catch (err: any) {
      console.warn(`Supabase upsert to ${table} exception:`, err);
    }
  };

  const deleteRowFromCloud = async (table: string, id: string) => {
    try {
      const client = getSupabaseClient();
      if (!client) return;
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) console.warn(`Supabase delete from ${table} error:`, error.message);
    } catch (err: any) {
      console.warn(`Supabase delete from ${table} exception:`, err);
    }
  };

  // Push all local data to Supabase
  const pushAllToCloud = async (): Promise<boolean> => {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      setCloudSyncStatus('syncing');
      setCloudSyncMessage('جاري رفع ومزامنة البيانات في السحابة...');

      // Settings
      await client.from('accounting_settings').upsert({
        id: 'default',
        data: companySettings,
        updated_at: new Date().toISOString(),
      });

      // Accounts
      if (accounts.length > 0) {
        await client.from('accounting_accounts').upsert(
          accounts.map(a => ({
            id: a.id,
            code: a.code,
            name: a.name,
            category: a.category,
            data: a,
            updated_at: new Date().toISOString(),
          }))
        );
      }

      // Contacts
      if (contacts.length > 0) {
        await client.from('accounting_contacts').upsert(
          contacts.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            phone: c.phone || '',
            currency: c.currency || 'USD',
            data: c,
            updated_at: new Date().toISOString(),
          }))
        );
      }

      // Invoices
      if (invoices.length > 0) {
        await client.from('accounting_invoices').upsert(
          invoices.map(inv => ({
            id: inv.id,
            invoice_number: inv.invoiceNumber,
            customer_id: inv.customerId,
            customer_name: inv.customerName,
            date: inv.date,
            due_date: inv.dueDate,
            currency: inv.currency || 'USD',
            currency_symbol: inv.currencySymbol || '$',
            total_amount: inv.totalAmount,
            paid_amount: inv.paidAmount,
            status: inv.status,
            sale_type: inv.saleType || 'service',
            payment_method: inv.paymentMethod || 'cash',
            data: inv,
            updated_at: new Date().toISOString(),
          }))
        );
      }

      // Expenses
      if (expenses.length > 0) {
        await client.from('accounting_expenses').upsert(
          expenses.map(exp => ({
            id: exp.id,
            bill_number: exp.billNumber,
            vendor_id: exp.vendorId,
            vendor_name: exp.vendorName,
            date: exp.date,
            category: exp.accountId,
            currency: exp.currency || 'USD',
            currency_symbol: exp.currencySymbol || '$',
            total_amount: exp.amount,
            paid_amount: exp.status === 'paid' ? exp.amount : 0,
            status: exp.status,
            data: exp,
            updated_at: new Date().toISOString(),
          }))
        );
      }

      // Journal
      if (journalEntries.length > 0) {
        await client.from('accounting_journal').upsert(
          journalEntries.map(j => ({
            id: j.id,
            entry_number: j.entryNumber,
            date: j.date,
            description: j.notes || j.entryNumber,
            currency: j.currency || 'USD',
            currency_symbol: j.currencySymbol || '$',
            total_amount: j.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0),
            data: j,
            updated_at: new Date().toISOString(),
          }))
        );
      }

      // Products
      if (products.length > 0) {
        await client.from('accounting_settings').upsert({
          id: 'inventory_products',
          data: products,
          updated_at: new Date().toISOString(),
        });
      }

      // Fixed Assets
      if (assets.length > 0) {
        await client.from('accounting_settings').upsert({
          id: 'fixed_assets',
          data: assets,
          updated_at: new Date().toISOString(),
        });
      }

      setIsCloudEnabled(true);
      setCloudSyncStatus('connected');
      setCloudSyncMessage('تم حفظ ومزامنة كافة البيانات السحابية بنجاح! ✓');
      return true;
    } catch (err: any) {
      console.error('Push all to cloud failed:', err);
      setCloudSyncStatus('error');
      setCloudSyncMessage(`فشل الرفع: ${err?.message || 'خطأ'}`);
      return false;
    }
  };

  // Pull & bidirectional smart merge from Supabase
  const refreshFromCloud = async () => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      setIsCloudEnabled(false);
      setCloudSyncStatus('disconnected');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setIsCloudEnabled(false);
      setCloudSyncStatus('disconnected');
      return;
    }

    try {
      setCloudSyncStatus('syncing');
      setCloudSyncMessage('جاري الاتصال واستيراد البيانات من السحابة...');

      const [invRes, expRes, conRes, jrnRes, accRes, setRes] = await Promise.all([
        client.from('accounting_invoices').select('*').order('date', { ascending: false }),
        client.from('accounting_expenses').select('*').order('date', { ascending: false }),
        client.from('accounting_contacts').select('*'),
        client.from('accounting_journal').select('*').order('date', { ascending: false }),
        client.from('accounting_accounts').select('*').order('code', { ascending: true }),
        client.from('accounting_settings').select('*'),
      ]);

      const getLocal = <T,>(key: string, fallback: T): T => {
        try {
          const item = localStorage.getItem(`${STORAGE_KEY}_${key}`);
          return item ? JSON.parse(item) : fallback;
        } catch {
          return fallback;
        }
      };

      const localInvoices = getLocal<Invoice[]>('invoices', invoices);
      const localExpenses = getLocal<ExpenseBill[]>('expenses', expenses);
      const localContacts = getLocal<Contact[]>('contacts', contacts);
      const localProducts = getLocal<Product[]>('products', products);
      const localAssets = getLocal<Asset[]>('assets', assets);
      const localJournal = getLocal<JournalEntry[]>('journal', journalEntries);
      const localAccounts = getLocal<Account[]>('accounts', accounts);
      const localSettings = getLocal<CompanySettings>('settings', companySettings);

      // 1. Invoices smart sync
      const cloudInvoices = (invRes.data || []).map(r => r.data as Invoice);
      const cloudInvIds = new Set(cloudInvoices.map(i => i.id));
      const extraLocalInvoices = localInvoices.filter(i => !cloudInvIds.has(i.id));

      if (extraLocalInvoices.length > 0) {
        await client.from('accounting_invoices').upsert(
          extraLocalInvoices.map(inv => ({
            id: inv.id,
            invoice_number: inv.invoiceNumber,
            customer_id: inv.customerId || null,
            customer_name: inv.customerName,
            date: inv.date,
            due_date: inv.dueDate || null,
            currency: inv.currency || 'USD',
            currency_symbol: inv.currencySymbol || '$',
            total_amount: inv.totalAmount,
            paid_amount: inv.paidAmount,
            status: inv.status,
            sale_type: inv.saleType || 'service',
            payment_method: inv.paymentMethod || 'cash',
            data: inv,
            updated_at: new Date().toISOString(),
          }))
        );
      }
      const finalInvoices = [...cloudInvoices, ...extraLocalInvoices];
      if (finalInvoices.length > 0 || cloudInvoices.length > 0) {
        setInvoices(finalInvoices);
      }

      // 2. Expenses smart sync
      const initialExpenseMap = new Map(initialExpenses.map(e => [e.id, e]));
      let needsCloudUpdate = false;
      const cloudExpenses = (expRes.data || []).map(r => {
        const exp = r.data as ExpenseBill;
        const init = initialExpenseMap.get(exp.id);
        if (init && (exp.accountId === 'acc_5600' || exp.accountId === 'acc_5400' || !exp.accountId) && init.accountId !== exp.accountId) {
          needsCloudUpdate = true;
          return { ...exp, accountId: init.accountId };
        }
        return exp;
      });
      const cloudExpIds = new Set(cloudExpenses.map(e => e.id));
      const extraLocalExpenses = localExpenses.filter(e => !cloudExpIds.has(e.id));

      if (extraLocalExpenses.length > 0 || needsCloudUpdate) {
        const toUpsert = [
          ...extraLocalExpenses,
          ...(needsCloudUpdate ? cloudExpenses.filter(e => initialExpenseMap.has(e.id)) : [])
        ];
        if (toUpsert.length > 0) {
          await client.from('accounting_expenses').upsert(
            toUpsert.map(exp => ({
              id: exp.id,
              bill_number: exp.billNumber,
              vendor_id: exp.vendorId || null,
              vendor_name: exp.vendorName,
              date: exp.date,
              category: exp.accountId,
              currency: exp.currency || 'USD',
              currency_symbol: exp.currencySymbol || '$',
              total_amount: exp.amount,
              paid_amount: exp.status === 'paid' ? exp.amount : 0,
              status: exp.status,
              data: exp,
              updated_at: new Date().toISOString(),
            }))
          );
        }
      }
      const finalExpenses = [...cloudExpenses, ...extraLocalExpenses];
      if (finalExpenses.length > 0 || cloudExpenses.length > 0) {
        setExpenses(finalExpenses);
      }

      // 3. Contacts smart sync
      const cloudContacts = (conRes.data || []).map(r => r.data as Contact);
      const cloudConIds = new Set(cloudContacts.map(c => c.id));
      const extraLocalContacts = localContacts.filter(c => !cloudConIds.has(c.id));

      if (extraLocalContacts.length > 0) {
        await client.from('accounting_contacts').upsert(
          extraLocalContacts.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            phone: c.phone || '',
            currency: c.currency || 'USD',
            data: c,
            updated_at: new Date().toISOString(),
          }))
        );
      }
      const finalContacts = [...cloudContacts, ...extraLocalContacts];
      if (finalContacts.length > 0 || cloudContacts.length > 0) {
        setContacts(finalContacts);
      }

      // 4. Products smart sync
      const oldProdIds = new Set(['prd_001', 'prd_002', 'prd_003', 'prd_004', 'prd_005']);
      const productsRow = (setRes.data || []).find((r: any) => r.id === 'inventory_products');
      const rawCloudProducts = (productsRow?.data as Product[]) || [];
      const cloudProducts = rawCloudProducts.filter(p => !oldProdIds.has(p.id));
      const cleanLocalProducts = localProducts.filter(p => !oldProdIds.has(p.id));
      const cloudProdIds = new Set(cloudProducts.map(p => p.id));
      const extraLocalProducts = cleanLocalProducts.filter(p => !cloudProdIds.has(p.id));

      const mergedProd = [...cloudProducts, ...extraLocalProducts];
      await client.from('accounting_settings').upsert({
        id: 'inventory_products',
        data: mergedProd,
        updated_at: new Date().toISOString(),
      });
      setProducts(mergedProd);

      // 5. Journal smart sync
      const cloudJournal = (jrnRes.data || []).map(r => r.data as JournalEntry);
      const cloudJrnIds = new Set(cloudJournal.map(j => j.id));
      const extraLocalJournal = localJournal.filter(j => !cloudJrnIds.has(j.id));

      if (extraLocalJournal.length > 0) {
        await client.from('accounting_journal').upsert(
          extraLocalJournal.map(j => ({
            id: j.id,
            entry_number: j.entryNumber,
            date: j.date,
            description: j.notes || j.entryNumber,
            currency: j.currency || 'USD',
            currency_symbol: j.currencySymbol || '$',
            total_amount: j.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0),
            data: j,
            updated_at: new Date().toISOString(),
          }))
        );
      }
      const finalJournal = [...cloudJournal, ...extraLocalJournal];
      if (finalJournal.length > 0 || cloudJournal.length > 0) {
        setJournalEntries(finalJournal);
      }

      // 6. Accounts sync
      const cloudAccounts = (accRes.data || []).map(r => r.data as Account);
      if (cloudAccounts.length > 0) {
        setAccounts(cloudAccounts);
      } else if (localAccounts.length > 0) {
        await client.from('accounting_accounts').upsert(
          localAccounts.map(a => ({
            id: a.id,
            code: a.code,
            name: a.name,
            category: a.category,
            data: a,
            updated_at: new Date().toISOString(),
          }))
        );
      }

      // 7. Settings sync
      const settingsRow = (setRes.data || []).find((r: any) => r.id === 'default');
      if (settingsRow && settingsRow.data) {
        setCompanySettings(settingsRow.data as CompanySettings);
      } else {
        await client.from('accounting_settings').upsert({
          id: 'default',
          data: localSettings,
          updated_at: new Date().toISOString(),
        });
      }

      // 8. Fixed Assets smart sync
      const assetsRow = (setRes.data || []).find((r: any) => r.id === 'fixed_assets');
      const cloudAssets = (assetsRow?.data as Asset[]) || [];
      const cloudAssetIds = new Set(cloudAssets.map(a => a.id));
      const extraLocalAssets = localAssets.filter(a => !cloudAssetIds.has(a.id));

      if (extraLocalAssets.length > 0) {
        const mergedAst = [...cloudAssets, ...extraLocalAssets];
        await client.from('accounting_settings').upsert({
          id: 'fixed_assets',
          data: mergedAst,
          updated_at: new Date().toISOString(),
        });
        setAssets(mergedAst);
      } else if (cloudAssets.length > 0) {
        setAssets(cloudAssets);
      } else if (localAssets.length > 0) {
        await client.from('accounting_settings').upsert({
          id: 'fixed_assets',
          data: localAssets,
          updated_at: new Date().toISOString(),
        });
      }

      setIsCloudEnabled(true);
      setCloudSyncStatus('connected');
      setCloudSyncMessage('متصل بسحابة Supabase ومحدّث بالكامل ✓');
    } catch (err: any) {
      console.error('Error syncing with Supabase:', err);
      setCloudSyncStatus('error');
      setCloudSyncMessage(`خطأ في المزامنة: ${err?.message || 'تعذر الاتصال'}`);
    }
  };

  useEffect(() => {
    refreshFromCloud();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFromCloud();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);


  // Add Account
  const addAccount = (newAcc: Omit<Account, 'id'>) => {
    const id = `acc_${Date.now()}`;
    const accountObj = { ...newAcc, id };
    setAccounts(prev => [...prev, accountObj]);
    syncRowToCloud('accounting_accounts', {
      id,
      code: accountObj.code,
      name: accountObj.name,
      category: accountObj.category,
      data: accountObj,
      updated_at: new Date().toISOString(),
    });
  };

  const deleteAccount = (id: string): boolean => {
    const target = accounts.find(a => a.id === id);
    if (!target || target.isSystem) return false;
    setAccounts(prev => prev.filter(a => a.id !== id));
    deleteRowFromCloud('accounting_accounts', id);
    return true;
  };

  // Add Journal Entry (with Double-Entry Balance Check)
  const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt'>): { success: boolean; error?: string } => {
    const totalDebit = entry.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { 
        success: false, 
        error: `القيد غير متوازن! مجموع المدين (${totalDebit.toLocaleString()}) يجب أن يساوي مجموع الدائن (${totalCredit.toLocaleString()}). الفارق: ${Math.abs(totalDebit - totalCredit)}` 
      };
    }

    if (totalDebit <= 0) {
      return { success: false, error: 'يجب أن يحتوي القيد على مبالغ أكبر من الصفر.' };
    }

    const currency: Currency = entry.currency || 'USD';
    const currencySymbol = entry.currencySymbol || (currency === 'SYP' ? 'ل.س' : '$');

    const newEntry: JournalEntry = {
      ...entry,
      currency,
      currencySymbol,
      id: `entry_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setJournalEntries(prev => [newEntry, ...prev]);
    syncRowToCloud('accounting_journal', {
      id: newEntry.id,
      entry_number: newEntry.entryNumber,
      date: newEntry.date,
      description: newEntry.notes || newEntry.entryNumber,
      currency: newEntry.currency,
      currency_symbol: newEntry.currencySymbol,
      total_amount: totalDebit,
      data: newEntry,
      updated_at: new Date().toISOString(),
    });

    // Update account balances directly
    setAccounts(prev => prev.map(acc => {
      let change = 0;
      entry.lines.forEach(l => {
        if (l.accountId === acc.id) {
          if (acc.type === 'debit') {
            change += (Number(l.debit) || 0) - (Number(l.credit) || 0);
          } else {
            change += (Number(l.credit) || 0) - (Number(l.debit) || 0);
          }
        }
      });
      if (change !== 0) {
        const updatedAcc = { ...acc, balance: acc.balance + change };
        syncRowToCloud('accounting_accounts', {
          id: updatedAcc.id,
          code: updatedAcc.code,
          name: updatedAcc.name,
          category: updatedAcc.category,
          data: updatedAcc,
          updated_at: new Date().toISOString(),
        });
        return updatedAcc;
      }
      return acc;
    }));

    return { success: true };
  };

  // Product Actions
  const addProduct = (prodData: Omit<Product, 'id' | 'createdAt'>) => {
    const id = `prd_${Date.now()}`;
    const newProduct: Product = {
      ...prodData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };
    setProducts(prev => {
      const updated = [newProduct, ...prev];
      syncProductsToCloud(updated);
      return updated;
    });
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === updatedProduct.id ? { ...updatedProduct, updatedAt: new Date().toISOString() } : p);
      syncProductsToCloud(updated);
      return updated;
    });
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      syncProductsToCloud(updated);
      return updated;
    });
  };

  const adjustProductStock = (productId: string, deltaQuantity: number, _reason?: string) => {
    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.id === productId) {
          const newQty = Math.max(0, (Number(p.quantity) || 0) + deltaQuantity);
          return { ...p, quantity: newQty, updatedAt: new Date().toISOString() };
        }
        return p;
      });
      syncProductsToCloud(updated);
      return updated;
    });
  };

  // Asset Actions
  const addAsset = (assetData: Omit<Asset, 'id' | 'createdAt'>) => {
    const id = `ast_${Date.now()}`;
    const newAsset: Asset = {
      ...assetData,
      id,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setAssets(prev => {
      const updated = [newAsset, ...prev];
      syncAssetsToCloud(updated);
      return updated;
    });
  };

  const updateAsset = (updatedAsset: Asset) => {
    setAssets(prev => {
      const updated = prev.map(a => a.id === updatedAsset.id ? updatedAsset : a);
      syncAssetsToCloud(updated);
      return updated;
    });
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => {
      const updated = prev.filter(a => a.id !== id);
      syncAssetsToCloud(updated);
      return updated;
    });
  };

  // Add Invoice
  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const currency: Currency = invoiceData.currency || 'USD';
    const currencySymbol = invoiceData.currencySymbol || (currency === 'SYP' ? 'ل.س' : '$');

    const newInvoice: Invoice = {
      ...invoiceData,
      currency,
      currencySymbol,
      id: `inv_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setInvoices(prev => [newInvoice, ...prev]);
    syncRowToCloud('accounting_invoices', {
      id: newInvoice.id,
      invoice_number: newInvoice.invoiceNumber,
      customer_id: newInvoice.customerId,
      customer_name: newInvoice.customerName,
      date: newInvoice.date,
      due_date: newInvoice.dueDate,
      currency: newInvoice.currency || 'USD',
      currency_symbol: newInvoice.currencySymbol || '$',
      total_amount: newInvoice.totalAmount,
      paid_amount: newInvoice.paidAmount,
      status: newInvoice.status,
      sale_type: newInvoice.saleType || 'service',
      payment_method: newInvoice.paymentMethod || 'cash',
      data: newInvoice,
      updated_at: new Date().toISOString(),
    });

    // Deduct stock for products sold in this invoice
    newInvoice.items.forEach(item => {
      if (item.productId && item.quantity > 0) {
        adjustProductStock(item.productId, -item.quantity, `خصم مبيعات فاتورة ${newInvoice.invoiceNumber}`);
      }
    });

    // Update contact balance if unpaid or partial
    const remaining = newInvoice.totalAmount - newInvoice.paidAmount;
    if (remaining > 0) {
      setContacts(prev => prev.map(c => 
        c.id === newInvoice.customerId ? { ...c, balance: c.balance + remaining } : c
      ));
    }

    // Post automatic journal entry for sales
    const salesAcc = accounts.find(a => a.code === '4100') || accounts.find(a => a.category === 'revenue');
    const paymentAcc = newInvoice.paymentMethod === 'sham_cash'
      ? (accounts.find(a => a.code === '1125') || accounts.find(a => a.name.includes('شام كاش')) || accounts.find(a => a.code === '1110'))
      : newInvoice.paymentMethod === 'bank'
      ? (accounts.find(a => a.code === '1120') || accounts.find(a => a.code === '1110'))
      : (accounts.find(a => a.code === '1110') || accounts.find(a => a.code === '1120'));
    const arAcc = accounts.find(a => a.code === '1130');

    if (salesAcc) {
      const lines = [];
      if (newInvoice.paidAmount > 0 && paymentAcc) {
        const methodLabel = newInvoice.paymentMethod === 'sham_cash' ? 'محفظة شام كاش' : newInvoice.paymentMethod === 'bank' ? 'حساب بنكي' : 'نقدي (خزينة)';
        lines.push({
          accountId: paymentAcc.id,
          accountCode: paymentAcc.code,
          accountName: paymentAcc.name,
          description: `تحصيل ${methodLabel} - مبيعات ${newInvoice.invoiceNumber}`,
          debit: newInvoice.paidAmount,
          credit: 0
        });
      }
      if (remaining > 0 && arAcc) {
        lines.push({
          accountId: arAcc.id,
          accountCode: arAcc.code,
          accountName: arAcc.name,
          description: `مستحق عملاء - فاتورة ${newInvoice.invoiceNumber}`,
          debit: remaining,
          credit: 0
        });
      }
      lines.push({
        accountId: salesAcc.id,
        accountCode: salesAcc.code,
        accountName: salesAcc.name,
        description: `إيراد مبيعات فاتورة ${newInvoice.invoiceNumber}`,
        debit: 0,
        credit: newInvoice.totalAmount
      });

      if (lines.length >= 2) {
        addJournalEntry({
          entryNumber: `JE-INV-${newInvoice.invoiceNumber}`,
          date: newInvoice.date,
          reference: newInvoice.invoiceNumber,
          notes: `إثبات مبيعات الفاتورة ${newInvoice.invoiceNumber} للعميل ${newInvoice.customerName} (${currencySymbol})`,
          currency,
          currencySymbol,
          lines
        });
      }
    }
  };

  const markInvoicePaid = (id: string, depositAccountId?: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      const unpaidAmount = inv.totalAmount - inv.paidAmount;
      if (unpaidAmount <= 0) return inv;

      // Update customer balance
      setContacts(cList => cList.map(c => 
        c.id === inv.customerId ? { ...c, balance: Math.max(0, c.balance - unpaidAmount) } : c
      ));

      // Post journal entry
      const bankAcc = depositAccountId 
        ? accounts.find(a => a.id === depositAccountId) 
        : (accounts.find(a => a.code === '1120') || accounts.find(a => a.code === '1110'));
      const arAcc = accounts.find(a => a.code === '1130');
      const invSym = inv.currencySymbol || (inv.currency === 'SYP' ? 'ل.س' : '$');

      if (bankAcc && arAcc) {
        addJournalEntry({
          entryNumber: `JE-PAY-${inv.invoiceNumber}`,
          date: new Date().toISOString().split('T')[0],
          reference: inv.invoiceNumber,
          notes: `سداد مستحق الفاتورة ${inv.invoiceNumber} بالكامل (${invSym})`,
          currency: inv.currency || 'USD',
          currencySymbol: invSym,
          lines: [
            {
              accountId: bankAcc.id,
              accountCode: bankAcc.code,
              accountName: bankAcc.name,
              description: `إيداع تحصيل فاتورة ${inv.invoiceNumber}`,
              debit: unpaidAmount,
              credit: 0
            },
            {
              accountId: arAcc.id,
              accountCode: arAcc.code,
              accountName: arAcc.name,
              description: `إقفال ذمة العميل ${inv.customerName}`,
              debit: 0,
              credit: unpaidAmount
            }
          ]
        });
      }

      const updatedInv = {
        ...inv,
        status: 'paid' as const,
        paidAmount: inv.totalAmount
      };
      syncRowToCloud('accounting_invoices', {
        id: updatedInv.id,
        invoice_number: updatedInv.invoiceNumber,
        customer_id: updatedInv.customerId,
        customer_name: updatedInv.customerName,
        date: updatedInv.date,
        due_date: updatedInv.dueDate,
        currency: updatedInv.currency || 'USD',
        currency_symbol: updatedInv.currencySymbol || '$',
        total_amount: updatedInv.totalAmount,
        paid_amount: updatedInv.paidAmount,
        status: updatedInv.status,
        sale_type: updatedInv.saleType || 'service',
        payment_method: updatedInv.paymentMethod || 'cash',
        data: updatedInv,
        updated_at: new Date().toISOString(),
      });
      return updatedInv;
    }));
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      // Restore product stock if any items had productId
      inv.items.forEach(item => {
        if (item.productId && item.quantity > 0) {
          adjustProductStock(item.productId, item.quantity, `استرجاع مخزون بسبب حذف الفاتورة ${inv.invoiceNumber}`);
        }
      });
    }
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    deleteRowFromCloud('accounting_invoices', id);
  };

  // Add Expense
  const addExpense = (expData: Omit<ExpenseBill, 'id' | 'createdAt'>) => {
    const currency: Currency = expData.currency || 'USD';
    const currencySymbol = expData.currencySymbol || (currency === 'SYP' ? 'ل.س' : '$');
    const paidBy = expData.paidBy || 'abc';

    const newExp: ExpenseBill = {
      ...expData,
      currency,
      currencySymbol,
      paidBy,
      id: `exp_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setExpenses(prev => [newExp, ...prev]);
    syncRowToCloud('accounting_expenses', {
      id: newExp.id,
      bill_number: newExp.billNumber,
      vendor_id: newExp.vendorId,
      vendor_name: newExp.vendorName,
      date: newExp.date,
      category: newExp.accountId,
      currency: newExp.currency,
      currency_symbol: newExp.currencySymbol,
      total_amount: newExp.amount,
      paid_amount: newExp.status === 'paid' ? newExp.amount : 0,
      status: newExp.status,
      data: newExp,
      updated_at: new Date().toISOString(),
    });

    // Update vendor balance if unpaid
    if (newExp.status === 'unpaid' && newExp.vendorId) {
      setContacts(prev => prev.map(c => 
        c.id === newExp.vendorId ? { ...c, balance: c.balance + newExp.amount } : c
      ));
    }

    // Post journal entry
    const expAcc = accounts.find(a => a.id === newExp.accountId) || accounts.find(a => a.category === 'expense');
    const paymentAcc = newExp.paymentMethod === 'cash' 
      ? (accounts.find(a => a.code === '1110') || accounts.find(a => a.code === '1120'))
      : newExp.paymentMethod === 'sham_cash'
      ? (accounts.find(a => a.code === '1125') || accounts.find(a => a.name.includes('شام كاش')) || accounts.find(a => a.code === '1110'))
      : (accounts.find(a => a.code === '1120') || accounts.find(a => a.code === '1110'));
    const apAcc = accounts.find(a => a.code === '2110');

    if (expAcc) {
      const creditAcc = newExp.status === 'paid' ? paymentAcc : apAcc;
      if (creditAcc) {
        const payerLabel = newExp.paidBy === 'amjad' ? 'بواسطة أمجد' : newExp.paidBy === 'nour' ? 'بواسطة نور' : 'شركة ABC';
        addJournalEntry({
          entryNumber: `JE-${newExp.billNumber}`,
          date: newExp.date,
          reference: newExp.billNumber,
          notes: `تسجيل مصروف: ${newExp.notes || newExp.vendorName} [${payerLabel}] (${currencySymbol})`,
          currency,
          currencySymbol,
          lines: [
            {
              accountId: expAcc.id,
              accountCode: expAcc.code,
              accountName: expAcc.name,
              description: newExp.notes || 'مصروف تشغيلي',
              debit: newExp.amount,
              credit: 0
            },
            {
              accountId: creditAcc.id,
              accountCode: creditAcc.code,
              accountName: creditAcc.name,
              description: newExp.status === 'paid' 
                ? (newExp.paidBy === 'amjad' ? 'تسديد من أمجد (حساب خاص)' : newExp.paidBy === 'nour' ? 'تسديد من نور (حساب خاص)' : 'تسديد من خزينة الشركة')
                : `التزام مستحق للمورد ${newExp.vendorName}`,
              debit: 0,
              credit: newExp.amount
            }
          ]
        });
      }
    }
  };

  const updateExpense = (updatedExp: ExpenseBill) => {
    setExpenses(prev => prev.map(e => e.id === updatedExp.id ? updatedExp : e));
    syncRowToCloud('accounting_expenses', {
      id: updatedExp.id,
      bill_number: updatedExp.billNumber,
      vendor_id: updatedExp.vendorId,
      vendor_name: updatedExp.vendorName,
      date: updatedExp.date,
      category: updatedExp.accountId,
      currency: updatedExp.currency,
      currency_symbol: updatedExp.currencySymbol,
      total_amount: updatedExp.amount,
      paid_amount: updatedExp.status === 'paid' ? updatedExp.amount : 0,
      status: updatedExp.status,
      data: updatedExp,
      updated_at: new Date().toISOString(),
    });

    // Also update corresponding journal entry if exists
    const jeIndex = journalEntries.findIndex(j => j.reference === updatedExp.billNumber || j.entryNumber === `JE-${updatedExp.billNumber}`);
    const expAcc = accounts.find(a => a.id === updatedExp.accountId) || accounts.find(a => a.category === 'expense');
    const paymentAcc = updatedExp.paymentMethod === 'cash' 
      ? (accounts.find(a => a.code === '1110') || accounts.find(a => a.code === '1120'))
      : updatedExp.paymentMethod === 'sham_cash'
      ? (accounts.find(a => a.code === '1125') || accounts.find(a => a.name.includes('شام كاش')) || accounts.find(a => a.code === '1110'))
      : (accounts.find(a => a.code === '1120') || accounts.find(a => a.code === '1110'));
    const apAcc = accounts.find(a => a.code === '2110');
    const creditAcc = updatedExp.status === 'paid' ? paymentAcc : apAcc;

    if (jeIndex !== -1 && expAcc && creditAcc) {
      const existingJE = journalEntries[jeIndex];
      const payerLabel = updatedExp.paidBy === 'amjad' ? 'بواسطة أمجد' : updatedExp.paidBy === 'nour' ? 'بواسطة نور' : 'شركة ABC';
      const updatedJE: JournalEntry = {
        ...existingJE,
        date: updatedExp.date,
        notes: `تسجيل مصروف: ${updatedExp.notes || updatedExp.vendorName} [${payerLabel}] (${updatedExp.currencySymbol || '$'})`,
        currency: updatedExp.currency,
        currencySymbol: updatedExp.currencySymbol,
        lines: [
          {
            accountId: expAcc.id,
            accountCode: expAcc.code,
            accountName: expAcc.name,
            description: updatedExp.notes || 'مصروف تشغيلي',
            debit: updatedExp.amount,
            credit: 0
          },
          {
            accountId: creditAcc.id,
            accountCode: creditAcc.code,
            accountName: creditAcc.name,
            description: updatedExp.status === 'paid' 
              ? (updatedExp.paidBy === 'amjad' ? 'تسديد من أمجد (حساب خاص)' : updatedExp.paidBy === 'nour' ? 'تسديد من نور (حساب خاص)' : 'تسديد من خزينة الشركة')
              : `التزام مستحق للمورد ${updatedExp.vendorName}`,
            debit: 0,
            credit: updatedExp.amount
          }
        ]
      };

      setJournalEntries(prev => prev.map((j, idx) => idx === jeIndex ? updatedJE : j));
      syncRowToCloud('accounting_journal', {
        id: updatedJE.id,
        entry_number: updatedJE.entryNumber,
        date: updatedJE.date,
        reference: updatedJE.reference,
        notes: updatedJE.notes,
        currency: updatedJE.currency || 'USD',
        currency_symbol: updatedJE.currencySymbol || '$',
        total_debit: updatedExp.amount,
        total_credit: updatedExp.amount,
        data: updatedJE,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const deleteExpense = (id: string) => {
    const target = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    deleteRowFromCloud('accounting_expenses', id);

    if (target) {
      const matchingJE = journalEntries.find(j => j.reference === target.billNumber || j.entryNumber === `JE-${target.billNumber}`);
      if (matchingJE) {
        setJournalEntries(prev => prev.filter(j => j.id !== matchingJE.id));
        deleteRowFromCloud('accounting_journal', matchingJE.id);
      }
    }
  };

  const updateJournalEntry = (updated: JournalEntry): { success: boolean; error?: string } => {
    const totalDebit = updated.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = updated.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      return { success: false, error: 'القيد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن.' };
    }

    setJournalEntries(prev => prev.map(j => j.id === updated.id ? updated : j));
    syncRowToCloud('accounting_journal', {
      id: updated.id,
      entry_number: updated.entryNumber,
      date: updated.date,
      reference: updated.reference,
      notes: updated.notes,
      currency: updated.currency || 'USD',
      currency_symbol: updated.currencySymbol || '$',
      total_debit: totalDebit,
      total_credit: totalCredit,
      data: updated,
      updated_at: new Date().toISOString(),
    });
    return { success: true };
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(j => j.id !== id));
    deleteRowFromCloud('accounting_journal', id);
  };

  // Contacts
  const addContact = (contactData: Omit<Contact, 'id' | 'createdAt'>) => {
    const newContact: Contact = {
      ...contactData,
      id: `cnt_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setContacts(prev => [...prev, newContact]);
    syncRowToCloud('accounting_contacts', {
      id: newContact.id,
      name: newContact.name,
      type: newContact.type,
      phone: newContact.phone || '',
      currency: newContact.currency || 'USD',
      data: newContact,
      updated_at: new Date().toISOString(),
    });
  };

  const updateContact = (updated: Contact) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
    syncRowToCloud('accounting_contacts', {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      phone: updated.phone || '',
      currency: updated.currency || 'USD',
      data: updated,
      updated_at: new Date().toISOString(),
    });
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    deleteRowFromCloud('accounting_contacts', id);
  };

  const updateCompanySettings = (settings: CompanySettings) => {
    setCompanySettings(settings);
    syncRowToCloud('accounting_settings', {
      id: 'default',
      data: settings,
      updated_at: new Date().toISOString(),
    });
  };

  const resetToDefaultData = async () => {
    setAccounts(initialAccounts);
    setJournalEntries([]);
    setInvoices([]);
    setExpenses([]);
    setContacts([]);
    setProducts(initialProducts);
    setAssets(initialAssets);
    setCompanySettings(initialCompanySettings);
    localStorage.removeItem(`${STORAGE_KEY}_accounts`);
    localStorage.removeItem(`${STORAGE_KEY}_journal`);
    localStorage.removeItem(`${STORAGE_KEY}_invoices`);
    localStorage.removeItem(`${STORAGE_KEY}_expenses`);
    localStorage.removeItem(`${STORAGE_KEY}_contacts`);
    localStorage.removeItem(`${STORAGE_KEY}_products`);
    localStorage.removeItem(`${STORAGE_KEY}_assets`);
    localStorage.removeItem(`${STORAGE_KEY}_settings`);

    // Wipe from cloud if configured
    const client = getSupabaseClient();
    if (client) {
      try {
        await Promise.all([
          client.from('accounting_invoices').delete().neq('id', '___none___'),
          client.from('accounting_expenses').delete().neq('id', '___none___'),
          client.from('accounting_contacts').delete().neq('id', '___none___'),
          client.from('accounting_journal').delete().neq('id', '___none___'),
          client.from('accounting_accounts').delete().neq('id', '___none___'),
        ]);
        // Reset products and assets in cloud
        await client.from('accounting_settings').upsert([
          {
            id: 'inventory_products',
            data: initialProducts,
            updated_at: new Date().toISOString(),
          },
          {
            id: 'fixed_assets',
            data: initialAssets,
            updated_at: new Date().toISOString(),
          }
        ]);
        // Re-upload zeroed accounts
        await client.from('accounting_accounts').upsert(
          initialAccounts.map(a => ({
            id: a.id,
            code: a.code,
            name: a.name,
            category: a.category,
            data: a,
            updated_at: new Date().toISOString(),
          }))
        );
      } catch (e) {
        console.warn('Error clearing cloud data:', e);
      }
    }
  };


  const exportDataJSON = () => {
    const fullBackup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      companySettings,
      accounts,
      journalEntries,
      invoices,
      expenses,
      contacts,
      products,
      assets
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  const importDataJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.accounts && data.journalEntries) {
        setAccounts(data.accounts);
        setJournalEntries(data.journalEntries);
        if (data.invoices) setInvoices(data.invoices);
        if (data.expenses) setExpenses(data.expenses);
        if (data.contacts) setContacts(data.contacts);
        if (data.products) setProducts(data.products);
        if (data.assets) setAssets(data.assets);
        if (data.companySettings) setCompanySettings(data.companySettings);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Metrics computation
  const totalRevenue = accounts
    .filter(a => a.category === 'revenue')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalExpenses = accounts
    .filter(a => a.category === 'expense')
    .reduce((sum, a) => sum + a.balance, 0);

  const netProfit = totalRevenue - totalExpenses;

  const cashAndBank = accounts
    .filter(a => ['1110', '1120', '1125'].includes(a.code) || a.name.includes('شام كاش'))
    .reduce((sum, a) => sum + a.balance, 0);

  const accountsReceivable = invoices
    .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

  const accountsPayable = contacts
    .filter(c => c.type === 'vendor' || c.type === 'both')
    .reduce((sum, c) => sum + c.balance, 0);

  const totalAssets = accounts
    .filter(a => a.category === 'asset')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter(a => a.category === 'liability')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalEquity = accounts
    .filter(a => a.category === 'equity')
    .reduce((sum, a) => sum + a.balance, 0) + netProfit;

  const getMetricsForCurrency = (curr: Currency): CurrencyMetrics => {
    const invList = invoices.filter(inv => (inv.currency || 'USD') === curr);
    const expList = expenses.filter(exp => (exp.currency || 'USD') === curr);

    const revenue = invList.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const expenseTotal = expList.reduce((sum, exp) => sum + exp.amount, 0);
    const profit = revenue - expenseTotal;
    const receivables = invList.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);
    const payables = expList.filter(exp => exp.status === 'unpaid').reduce((sum, exp) => sum + exp.amount, 0);

    return {
      revenue,
      expenses: expenseTotal,
      netProfit: profit,
      receivables,
      payables,
      invoicesCount: invList.length,
      expensesCount: expList.length
    };
  };

  const metricsByCurrency = {
    USD: getMetricsForCurrency('USD'),
    SYP: getMetricsForCurrency('SYP')
  };

  return (
    <AccountingContext.Provider value={{
      accounts,
      journalEntries,
      invoices,
      expenses,
      contacts,
      products,
      assets,
      companySettings,
      cloudSyncStatus,
      cloudSyncMessage,
      isCloudEnabled,
      refreshFromCloud,
      pushAllToCloud,
      addAccount,
      deleteAccount,
      addJournalEntry,
      addInvoice,
      markInvoicePaid,
      deleteInvoice,
      addExpense,
      updateExpense,
      deleteExpense,
      updateJournalEntry,
      deleteJournalEntry,
      addContact,
      updateContact,
      deleteContact,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustProductStock,
      addAsset,
      updateAsset,
      deleteAsset,
      updateCompanySettings,
      resetToDefaultData,
      exportDataJSON,
      importDataJSON,
      metrics: {
        totalRevenue,
        totalExpenses,
        netProfit,
        cashAndBank,
        accountsReceivable,
        accountsPayable,
        totalAssets,
        totalLiabilities,
        totalEquity
      },
      metricsByCurrency
    }}>
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
