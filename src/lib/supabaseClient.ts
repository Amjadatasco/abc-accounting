import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Keys for local storage override so user can configure via UI directly
const STORAGE_SUPABASE_URL = 'abc_accounting_supabase_url';
const STORAGE_SUPABASE_ANON_KEY = 'abc_accounting_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'storage' | 'none';
}

export function getSupabaseConfig(): SupabaseConfig {
  // 1. Check environment variables (e.g. from Vercel or .env)
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey && !envUrl.includes('your_supabase')) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  // 2. Check local storage override
  if (typeof window !== 'undefined') {
    const storedUrl = (localStorage.getItem(STORAGE_SUPABASE_URL) || '').trim();
    const storedKey = (localStorage.getItem(STORAGE_SUPABASE_ANON_KEY) || '').trim();

    if (storedUrl && storedKey) {
      return {
        url: storedUrl,
        anonKey: storedKey,
        isConfigured: true,
        source: 'storage',
      };
    }
  }

  // 3. Built-in defaults for ABC Accounting project
  const defaultUrl = 'https://culjxczwajggjbgylfh.supabase.co';
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bGpqeGV6d2FqZ2dpYmd5bGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzM1MTQsImV4cCI6MjEwNzQ0OTUxNH0.f4hJ4H9AO3CXbcRfEv_w9VCqGyhMiNgEPdYSyRuJniU';

  return {
    url: defaultUrl,
    anonKey: defaultKey,
    isConfigured: true,
    source: 'env',
  };
}

let activeClient: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    activeClient = null;
    return null;
  }

  // Reuse existing client if credentials haven't changed
  if (activeClient && currentUrl === config.url && currentKey === config.anonKey) {
    return activeClient;
  }

  try {
    currentUrl = config.url;
    currentKey = config.anonKey;
    activeClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    return activeClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    activeClient = null;
    return null;
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_SUPABASE_URL, url.trim());
    localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, anonKey.trim());
    currentUrl = '';
    currentKey = '';
    activeClient = null;
    return true;
  } catch (err) {
    console.error('Failed to save Supabase config:', err);
    return false;
  }
}

export function clearSupabaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_SUPABASE_URL);
  localStorage.removeItem(STORAGE_SUPABASE_ANON_KEY);
  currentUrl = '';
  currentKey = '';
  activeClient = null;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = createClient(url.trim(), anonKey.trim());
    // Quick probe query to check connectivity
    const { error } = await testClient.from('accounting_invoices').select('id').limit(1);
    
    if (error) {
      // If table doesn't exist yet, but connection succeeded (error code 42P01 in postgres)
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          message: 'تم الاتصال بخادم Supabase بنجاح! تحتاج الآن فقط لتشغيل كود الـ SQL لإنشاء الجداول.',
        };
      }
      return {
        success: false,
        message: `خطأ في الاتصال: ${error.message} (رمز: ${error.code || 'غير معروف'})`,
      };
    }

    return {
      success: true,
      message: 'تم الاتصال بقاعدة بيانات Supabase بنجاح والجداول جاهزة ومتزامنة! ✓',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `فشل الاتصال: ${err?.message || 'تأكد من صحة الرابط ومفتاح Anon'}`,
    };
  }
}
