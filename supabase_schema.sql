-- ================================================================
-- مخطّط قاعدة بيانات منظومة المحاسبة الذكية (ABC Accounting ERP)
-- نفّذ هذا الكود في Supabase -> SQL Editor -> Run
-- ================================================================

-- 1. جدول إعدادات المنشأة (Company Settings)
CREATE TABLE IF NOT EXISTS public.accounting_settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. جدول دليل الحسابات والشجرة المحاسبية (Chart of Accounts)
CREATE TABLE IF NOT EXISTS public.accounting_accounts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول العملاء والموردين (Contacts)
CREATE TABLE IF NOT EXISTS public.accounting_contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    phone TEXT,
    currency TEXT DEFAULT 'USD',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. جدول فواتير المبيعات والخدمات (Invoices & Sales)
CREATE TABLE IF NOT EXISTS public.accounting_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    currency TEXT DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid',
    sale_type TEXT DEFAULT 'service',
    payment_method TEXT DEFAULT 'cash',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. جدول المصروفات والمشتريات (Expenses & Bills)
CREATE TABLE IF NOT EXISTS public.accounting_expenses (
    id TEXT PRIMARY KEY,
    bill_number TEXT NOT NULL,
    vendor_id TEXT,
    vendor_name TEXT NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. جدول قيود اليومية المحاسبية المزدوجة (Journal Entries)
CREATE TABLE IF NOT EXISTS public.accounting_journal (
    id TEXT PRIMARY KEY,
    entry_number TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    currency_symbol TEXT DEFAULT '$',
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فهارس للبحث السريع وتصفية التواريخ
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.accounting_invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_currency ON public.accounting_invoices(currency);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.accounting_expenses(date);
CREATE INDEX IF NOT EXISTS idx_journal_date ON public.accounting_journal(date);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON public.accounting_contacts(name);

-- تفعيل ميزة الأمان على مستوى السجلات (Row Level Security - RLS)
ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول الكامل المفتوح للمفتاح العام (Anon Access Policies)
-- تسمح لتطبيق الويب بالقراءة والكتابة والتعديل والحذف بسلاسة
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access settings" ON public.accounting_settings;
    CREATE POLICY "Public access settings" ON public.accounting_settings FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access accounts" ON public.accounting_accounts;
    CREATE POLICY "Public access accounts" ON public.accounting_accounts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access contacts" ON public.accounting_contacts;
    CREATE POLICY "Public access contacts" ON public.accounting_contacts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access invoices" ON public.accounting_invoices;
    CREATE POLICY "Public access invoices" ON public.accounting_invoices FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access expenses" ON public.accounting_expenses;
    CREATE POLICY "Public access expenses" ON public.accounting_expenses FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access journal" ON public.accounting_journal;
    CREATE POLICY "Public access journal" ON public.accounting_journal FOR ALL USING (true) WITH CHECK (true);
END $$;
