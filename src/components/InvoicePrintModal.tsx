import React, { useState } from 'react';
import type { Invoice } from '../types/accounting';
import { useAccounting } from '../context/AccountingContext';

interface InvoicePrintModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const { companySettings, contacts } = useAccounting();
  const curr = invoice.currencySymbol || (invoice.currency === 'SYP' ? 'ل.س' : (companySettings.currencySymbol || '$'));
  const customer = contacts.find(c => c.id === invoice.customerId);

  // Document Title Options (default: فاتورة مبيعات)
  const [docTitle, setDocTitle] = useState<'فاتورة مبيعات' | 'أمر تشغيل وطباعة' | 'عرض سعر' | 'فاتورة ضريبية'>('فاتورة مبيعات');
  const [showWorkType, setShowWorkType] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const hasTax = (invoice.taxAmount && invoice.taxAmount > 0) || invoice.items.some(i => i.taxRate && i.taxRate > 0);
  const remaining = invoice.totalAmount - (invoice.paidAmount || 0);

  // Clean label for work type (no technical jargon)
  const getWorkTypeLabel = (source?: string) => {
    switch (source) {
      case 'uv': return 'طباعة مسطحة UV';
      case 'dtf': return 'طباعة حرارية DTF';
      case 'laser': return 'حفر وقص ليزر';
      case 'press': return 'كبس حراري';
      case 'regular_print': return 'طباعة ورقية';
      case 'external': return 'تنفيذ وتجهيز إعلاني';
      default: return null;
    }
  };

  const workTypeClean = getWorkTypeLabel(invoice.productionSource);

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg" style={{ maxWidth: '850px' }}>
        {/* Modal Controls Header */}
        <div className="modal-header no-print">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              معاينة وطباعة الفاتورة ({invoice.invoiceNumber})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              فاتورة مخصصة لأعمال الطباعة والإعلان
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Quick Switch for Document Title */}
            <select
              className="form-select"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value as any)}
              style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem', fontWeight: 700 }}
              title="تغيير عنوان السند المطبوع"
            >
              <option value="فاتورة مبيعات">📄 فاتورة مبيعات</option>
              <option value="أمر تشغيل وطباعة">🖨️ أمر تشغيل وطباعة</option>
              <option value="عرض سعر">🏷️ عرض سعر</option>
              <option value="فاتورة ضريبية">🏛️ فاتورة ضريبية</option>
            </select>

            {workTypeClean && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', cursor: 'pointer', userSelect: 'none', backgroundColor: '#f1f5f9', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                <input 
                  type="checkbox" 
                  checked={showWorkType} 
                  onChange={(e) => setShowWorkType(e.target.checked)}
                />
                <span>إظهار بند التنفيذ</span>
              </label>
            )}

            <button className="btn btn-sm btn-primary" onClick={handlePrint} style={{ fontWeight: 800 }}>
              🖨️ طباعة / تصدير PDF
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Private Internal Notes Banner (Visible only on screen, NEVER in print) */}
        {invoice.internalNotes && invoice.internalNotes.trim() && (
          <div className="no-print" style={{ 
            margin: '1rem 1.5rem 0', 
            padding: '0.75rem 1rem', 
            backgroundColor: '#fffbeb', 
            border: '1.5px solid #fde68a', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e' }}>
                ملاحظات داخلية خاصة بك (سرية للإدارة فقط — لن تظهر للعميل في الفاتورة المطبوعة نهائياً):
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309', marginTop: '0.2rem' }}>
                {invoice.internalNotes}
              </div>
            </div>
          </div>
        )}

        {/* Printable Invoice Body */}
        <div className="modal-body printable-invoice" style={{ padding: '2.5rem', backgroundColor: 'white' }}>
          
          {/* Header Row: Company Brand & Invoice Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--primary-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img 
                src={companySettings.logoUrl || '/abc_logo.jpg'} 
                alt="ABC Logo" 
                style={{ width: '85px', height: '85px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '4px', backgroundColor: 'white' }} 
              />
              <div>
                <h1 style={{ fontSize: '1.55rem', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '0.15rem' }}>
                  {companySettings.companyName || 'ABC للطباعة والإعلان'}
                </h1>
                <p style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 600 }}>
                  {companySettings.tagline || 'خدمات الطباعة والإعلان والدعاية'}
                </p>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                  {companySettings.phone && <span>📞 {companySettings.phone}</span>}
                  {companySettings.address && <span>📍 {companySettings.address}</span>}
                  {companySettings.commercialRecord ? <span>س.ت: {companySettings.commercialRecord}</span> : null}
                  {companySettings.taxNumber ? <span>الرقم الضريبي: {companySettings.taxNumber}</span> : null}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ 
                display: 'inline-block', 
                backgroundColor: 'var(--primary-color)', 
                color: 'white', 
                padding: '0.4rem 1.25rem', 
                borderRadius: '6px', 
                fontWeight: 900, 
                fontSize: '1.15rem',
                marginBottom: '0.5rem',
                letterSpacing: '0.3px'
              }}>
                {docTitle}
              </div>
              <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-dark)', margin: '0.15rem 0' }}>
                {invoice.invoiceNumber}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                التاريخ: {invoice.date}
              </p>
              {invoice.dueDate && invoice.dueDate !== invoice.date && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  الاستحقاق: {invoice.dueDate}
                </p>
              )}
            </div>
          </div>

          {/* Customer Details & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <div>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>فاتورة إلى العميل:</h4>
              <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-dark)', marginBottom: '0.2rem' }}>
                {invoice.customerName}
              </p>
              {customer?.phone && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>الهاتف: {customer.phone}</p>}
              {customer?.address && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>العنوان: {customer.address}</p>}
              {customer?.taxNumber && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>الرقم الضريبي: {customer.taxNumber}</p>}
              
              {showWorkType && workTypeClean && (
                <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>بند التنفيذ:</span>
                  <span style={{ fontWeight: 700, color: '#0369a1' }}>
                    {workTypeClean}
                  </span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ marginBottom: '0.35rem' }}>
                <span className={`badge ${invoice.status === 'paid' ? 'badge-green' : invoice.status === 'partial' ? 'badge-orange' : 'badge-red'}`} style={{ fontSize: '0.88rem', padding: '0.35rem 0.85rem', fontWeight: 800 }}>
                  {invoice.status === 'paid' ? 'مسددة بالكامل ✓' : invoice.status === 'partial' ? 'مسددة جزئياً' : 'آجلة (غير مسددة)'}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                المسدد: <strong style={{ color: 'var(--text-dark)' }}>{curr} {Number(invoice.paidAmount || 0).toLocaleString()}</strong>
              </p>
              {remaining > 0 && (
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--danger-color)', fontWeight: 700 }}>
                  المتبقي: {curr} {remaining.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <table style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>بيان الخدمة / الصنف / المقاس</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>الكمية</th>
                  <th style={{ width: '120px', textAlign: 'left' }}>السعر الفردي</th>
                  {hasTax && <th style={{ width: '90px', textAlign: 'center' }}>الضريبة %</th>}
                  <th style={{ width: '130px', textAlign: 'left' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.description}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ textAlign: 'left' }}>{curr} {item.unitPrice.toLocaleString()}</td>
                    {hasTax && <td style={{ textAlign: 'center' }}>{item.taxRate || 0}%</td>}
                    <td style={{ textAlign: 'left', fontWeight: 800 }}>{curr} {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1.5rem', gap: '1.5rem' }}>
            <div style={{ flex: 1, maxWidth: '55%' }}>
              {invoice.notes && invoice.notes.trim() ? (
                <div style={{ padding: '0.85rem 1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                  <strong style={{ color: 'var(--text-dark)', display: 'block', marginBottom: '0.25rem' }}>
                    شروط وملاحظات:
                  </strong>
                  <p style={{ margin: 0, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {invoice.notes}
                  </p>
                </div>
              ) : null}
            </div>

            <div style={{ width: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>المجموع:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{curr} {invoice.subtotal.toLocaleString()}</span>
              </div>

              {hasTax && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span>ضريبة القيمة المضافة:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{curr} {invoice.taxAmount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '2px solid var(--border-color)', borderBottom: '2px solid var(--border-color)', margin: '0.5rem 0', fontSize: '1.15rem', fontWeight: 900 }}>
                <span>الإجمالي الكلي:</span>
                <span style={{ color: 'var(--primary-color)' }}>{curr} {invoice.totalAmount.toLocaleString()}</span>
              </div>

              {invoice.paidAmount > 0 && remaining > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.88rem', color: 'var(--success-color)', fontWeight: 700 }}>
                  <span>المسدد:</span>
                  <span>{curr} {invoice.paidAmount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.92rem', color: remaining > 0 ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 800 }}>
                <span>{remaining > 0 ? 'المتبقي المستحق:' : 'حالة الحساب:'}</span>
                <span>{remaining > 0 ? `${curr} ${remaining.toLocaleString()}` : 'خالص بالكامل ✓'}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <div>
              <p>توقيع المستلم: ...............................</p>
            </div>
            <div>
              <p>ختم واعتماد المنشأة: ...............................</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer no-print">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إغلاق
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ fontWeight: 800 }}>
            🖨️ طباعة الفاتورة الآن
          </button>
        </div>
      </div>
    </div>
  );
};
