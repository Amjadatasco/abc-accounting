import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { CompanySettings } from '../types/accounting';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig, 
  testSupabaseConnection 
} from '../lib/supabaseClient';
import { SUPABASE_SETUP_SQL } from '../data/supabaseSql';

export const SettingsView: React.FC = () => {
  const { 
    companySettings, 
    updateCompanySettings, 
    exportDataJSON, 
    importDataJSON, 
    resetToDefaultData,
    cloudSyncStatus,
    cloudSyncMessage,
    isCloudEnabled,
    refreshFromCloud,
    pushAllToCloud
  } = useAccounting();

  const [formData, setFormData] = useState<CompanySettings>(companySettings);
  const [successMsg, setSuccessMsg] = useState('');
  const [importError, setImportError] = useState('');

  // Supabase Cloud Configuration state
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.anonKey);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudTestMsg, setCloudTestMsg] = useState('');
  const [cloudTestSuccess, setCloudTestSuccess] = useState<boolean | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleChange = (field: keyof CompanySettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings(formData);
    setSuccessMsg('تم حفظ وتحديث إعدادات الشركة بنجاح! ✓');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleConnectCloud = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setCloudTestMsg('يرجى كتابة رابط المشروع ومفتاح Anon أولاً.');
      setCloudTestSuccess(false);
      return;
    }
    setIsTestingCloud(true);
    setCloudTestMsg('جاري فحص الاتصال بخادم Supabase...');
    const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setIsTestingCloud(false);
    setCloudTestMsg(res.message);
    setCloudTestSuccess(res.success);

    if (res.success) {
      saveSupabaseConfig(supabaseUrl, supabaseKey);
      await refreshFromCloud();
    }
  };

  const handleDisconnectCloud = () => {
    if (confirm('هل أنت متأكد من رغبتك في قطع الاتصال السحابي والعودة للتخزين المحلي؟')) {
      clearSupabaseConfig();
      setSupabaseUrl('');
      setSupabaseKey('');
      setCloudTestMsg('');
      setCloudTestSuccess(null);
      window.location.reload();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleExportBackup = () => {
    const json = exportDataJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ABC_Accounting_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importDataJSON(content);
        if (ok) {
          alert('تم استرجاع النسخة الاحتياطية وتحديث كافة السجلات المحاسبية بنجاح! ✓');
        } else {
          setImportError('ملف النسخة الاحتياطية غير صالح أو تالف.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="top-header">
        <div className="page-title">
          <h2>إعدادات النظام والشركة (Settings)</h2>
          <p>تخصيص بيانات المنشأة، العملات المالية، والنسخ الاحتياطي للبيانات</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '0.9rem 1.25rem', backgroundColor: 'var(--success-light)', color: 'var(--success-text)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>
          {successMsg}
        </div>
      )}

      {/* Grid of Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        
        {/* Company Profile Form */}
        <div className="table-card" style={{ padding: '1.75rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            بيانات المنشأة الرسمية (تظهر في الفواتير والتقارير)
          </h3>

          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">اسم الشركة أو المنشأة *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                value={formData.companyName} 
                onChange={(e) => handleChange('companyName', e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">شعار أو وصف النشاط</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.tagline} 
                onChange={(e) => handleChange('tagline', e.target.value)} 
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الرقم الضريبي (VAT Number)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.taxNumber} 
                  onChange={(e) => handleChange('taxNumber', e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم السجل التجاري</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.commercialRecord} 
                  onChange={(e) => handleChange('commercialRecord', e.target.value)} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">رقم الهاتف الرسمي</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.phone} 
                  onChange={(e) => handleChange('phone', e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={formData.email} 
                  onChange={(e) => handleChange('email', e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">العنوان الوطني / المقر الرئيسي</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.address} 
                onChange={(e) => handleChange('address', e.target.value)} 
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">اسم العملة</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="دولار أمريكي، ريال سعودي، درهم إماراتي..."
                  value={formData.currency} 
                  onChange={(e) => handleChange('currency', e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">رمز العملة المختصر *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="مثال: $ أو ر.س أو د.إ أو ل.س"
                  value={formData.currencySymbol} 
                  onChange={(e) => handleChange('currencySymbol', e.target.value)} 
                />
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                حفظ التعديلات
              </button>
            </div>
          </form>
        </div>

        {/* Data Management & Backup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Supabase Cloud Connection Card */}
          <div className="table-card" style={{ padding: '1.75rem', marginBottom: 0, border: isCloudEnabled ? '2px solid #10b981' : '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>☁️</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  الربط السحابي (Supabase Database)
                </h3>
              </div>
              <span style={{ 
                padding: '0.3rem 0.75rem', 
                borderRadius: '999px', 
                fontSize: '0.75rem', 
                fontWeight: 800,
                backgroundColor: isCloudEnabled ? '#dcfce7' : '#f1f5f9',
                color: isCloudEnabled ? '#15803d' : '#64748b',
                border: `1px solid ${isCloudEnabled ? '#86efac' : '#cbd5e1'}`
              }}>
                {cloudSyncStatus === 'connected' ? '🟢 متصل بالسحابة' : cloudSyncStatus === 'syncing' ? '🔄 جاري المزامنة...' : isCloudEnabled ? '🟢 مفعل سحابياً' : '⚪ تخزين محلي (Offline)'}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: cloudSyncMessage ? '0.5rem' : '1.25rem' }}>
              {isCloudEnabled 
                ? '✓ النظام مربوط بسحابة Supabase. أي فاتورة أو عملية بيع تُحفظ فوراً في السيرفر وتتزامن بين هاتفك وحاسوبك تلقائياً.' 
                : 'اربط منظومة المحاسبة بحسابك في Supabase ليتم حفظ بياناتك سحابياً والوصول إليها من أي جهاز أو هاتف بأمان تام.'}
            </p>

            {cloudSyncMessage && (
              <p style={{ fontSize: '0.8rem', color: isCloudEnabled ? '#15803d' : 'var(--text-muted)', marginBottom: '1.25rem', fontWeight: 600 }}>
                {cloudSyncMessage}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  رابط مشروع Supabase (Project URL) *
                </label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://xxxxxxxxxxxx.supabase.co" 
                  value={supabaseUrl} 
                  onChange={(e) => setSupabaseUrl(e.target.value)} 
                  style={{ direction: 'ltr', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  مفتاح Anon العام (Anon Public API Key) *
                </label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                  value={supabaseKey} 
                  onChange={(e) => setSupabaseKey(e.target.value)} 
                  style={{ direction: 'ltr', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {cloudTestMsg && (
              <div style={{ 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: '1rem', 
                fontSize: '0.85rem', 
                fontWeight: 700,
                backgroundColor: cloudTestSuccess ? '#dcfce7' : '#fee2e2',
                color: cloudTestSuccess ? '#15803d' : '#b91c1c',
                border: `1px solid ${cloudTestSuccess ? '#86efac' : '#fca5a5'}`
              }}>
                {cloudTestMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleConnectCloud}
                  disabled={isTestingCloud}
                  style={{ flex: 1, minWidth: '160px', fontWeight: 800 }}
                >
                  {isTestingCloud ? 'جاري الفحص...' : '🔗 فحص وحفظ الاتصال السحابي'}
                </button>

                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowSqlModal(true)}
                  style={{ fontWeight: 700 }}
                >
                  📋 كود الـ SQL للجداول
                </button>
              </div>

              {isCloudEnabled && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline" 
                    onClick={() => refreshFromCloud()}
                    style={{ flex: 1 }}
                  >
                    🔄 مزامنة وسحب الآن
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline" 
                    onClick={() => pushAllToCloud()}
                    style={{ flex: 1 }}
                  >
                    ⬆️ رفع البيانات الحالية
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline" 
                    onClick={handleDisconnectCloud}
                    style={{ color: 'var(--danger-color)' }}
                  >
                    قطع الاتصال
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              💡 <strong>أين تجد هذه البيانات؟</strong> ادخل على <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>لوحة تحكم Supabase</a> ثم اختر مشروعك ← اضغط <strong>Project Settings</strong> ← اضغط <strong>API</strong> وانسخ الـ URL والـ anon public key.
            </div>
          </div>

          <div className="table-card" style={{ padding: '1.75rem', marginBottom: 0 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              النسخ الاحتياطي واستعادة البيانات
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              جميع فواتيرك وقيودك المالية يتم حفظها تلقائياً داخل متصفحك. للحفاظ على بياناتك أو نقلها لجهاز آخر، يمكنك تنزيل نسخة احتياطية مشفرة.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={handleExportBackup} style={{ justifyContent: 'flex-start' }}>
                💾 تنزيل نسخة احتياطية كاملة (JSON Backup)
              </button>

              <label className="btn btn-outline" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                📂 استرجاع نسخة سابقة من ملف
                <input type="file" accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
              </label>

              {importError && (
                <p style={{ color: 'var(--danger-color)', fontSize: '0.8rem', fontWeight: 600 }}>{importError}</p>
              )}
            </div>
          </div>

          <div className="table-card" style={{ padding: '1.75rem', marginBottom: 0, borderColor: '#fecaca' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger-color)', marginBottom: '0.75rem', borderBottom: '1px solid #fee2e2', paddingBottom: '0.75rem' }}>
              إعادة ضبط البيانات (Reset)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              إعادة تعيين كافة السجلات لشجرة الحسابات والبيانات الأولية الافتراضية. استخدم هذا الخيار إذا أردت بدء تجربة جديدة.
            </p>

            <button 
              className="btn btn-danger" 
              onClick={async () => {
                if (confirm('تحذير: هل أنت متأكد من رغبتك في تصفير كافة البيانات وبدء صفحة جديدة تماماً؟ سيتم حذف جميع الفواتير والمصروفات والعملاء.')) {
                  await resetToDefaultData();
                  alert('تم تصفير البيانات بنجاح! البرنامج الآن فارغ وجاهز.');
                  window.location.reload();
                }
              }}
            >
              🗑️ تصفير كافة البيانات والبدء من الصفر
            </button>
          </div>

        </div>

      </div>

      {/* Supabase SQL Setup Modal */}
      {showSqlModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>📋</span>
                <h3 style={{ margin: 0 }}>كود SQL لإنشاء جداول Supabase</h3>
              </div>
              <button className="modal-close" onClick={() => setShowSqlModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: '#166534' }}>
                <strong>📌 خطوات التفعيل السريعة (تأخذ دقيقة واحدة فقط):</strong>
                <ol style={{ margin: '0.5rem 0 0', paddingRight: '1.25rem', lineHeight: '1.7' }}>
                  <li>اضغط على زر <strong>"نسخ الكود بالكامل"</strong> أدناه.</li>
                  <li>افتح مشروعك في <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', fontWeight: 700 }}>Supabase Dashboard</a>.</li>
                  <li>من القائمة الجانبية في Supabase اضغط على <strong>SQL Editor</strong>.</li>
                  <li>ألصق الكود واضغط على زر <strong>Run</strong> الأخضر.</li>
                  <li>مبروك! أصبحت الجداول جاهزة فوراً لربط الفواتير والحسابات.</li>
                </ol>
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleCopySql}
                  style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, fontWeight: 800 }}
                >
                  {copiedSql ? '✓ تم النسخ بنجاح!' : '📋 نسخ كود SQL بالكامل'}
                </button>
                <pre style={{ 
                  backgroundColor: '#0f172a', 
                  color: '#e2e8f0', 
                  padding: '1.25rem', 
                  borderRadius: 'var(--radius-md)', 
                  maxHeight: '350px', 
                  overflow: 'auto', 
                  direction: 'ltr', 
                  textAlign: 'left',
                  fontSize: '0.8rem',
                  fontFamily: 'Consolas, Monaco, monospace',
                  lineHeight: '1.5'
                }}>
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowSqlModal(false)}>
                إغلاق
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCopySql}>
                {copiedSql ? '✓ تم النسخ!' : '📋 نسخ الكود والبدء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
