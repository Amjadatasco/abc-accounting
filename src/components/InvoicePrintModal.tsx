import React from 'react';
import type { Invoice } from '../types/accounting';
import { getProductionSourceDetails } from '../types/accounting';
import { useAccounting } from '../context/AccountingContext';

interface InvoicePrintModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const { companySettings, contacts } = useAccounting();
  const curr = invoice.currencySymbol || (invoice.currency === 'SYP' ? 'ل.س' : (companySettings.currencySymbol || '$'));

  const customer = contacts.find(c => c.id === invoice.customerId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg" style={{ maxWidth: '850px' }}>
        <div className="modal-header no-print">
          <h3>معاينة الفاتورة الضريبية ({invoice.invoiceNumber})</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-sm btn-primary" onClick={handlePrint}>
              🖨️ طباعة الفاتورة / تصدير PDF
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body printable-invoice" style={{ padding: '2.5rem', backgroundColor: 'white' }}>
          {/* Header Row: Company Brand & Invoice Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--primary-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img 
                src={companySettings.logoUrl || '/abc_logo.jpg'} 
                alt="ABC Logo" 
                style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '4px' }} 
              />
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-dark)' }}>{companySettings.companyName}</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{companySettings.tagline}</p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  <span>س.ت: {companySettings.commercialRecord}</span> | <span>الرقم الضريبي: {companySettings.taxNumber}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ 
                display: 'inline-block', 
                backgroundColor: 'var(--primary-color)', 
                color: 'white', 
                padding: '0.35rem 1rem', 
                borderRadius: '6px', 
                fontWeight: 800, 
                fontSize: '1.1rem',
                marginBottom: '0.5rem'
              }}>
                فاتورة ضريبية
              </div>
              <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-dark)' }}>{invoice.invoiceNumber}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>التاريخ: {invoice.date}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الاستحقاق: {invoice.dueDate}</p>
            </div>
          </div>

          {/* Customer Details & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>فاتورة إلى العميل:</h4>
              <p style={{ fontWeight: 800, fontSize: '1rem' }}>{invoice.customerName}</p>
              {customer?.taxNumber && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الرقم الضريبي: {customer.taxNumber}</p>}
              {customer?.phone && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الهاتف: {customer.phone}</p>}
              {customer?.address && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>العنوان: {customer.address}</p>}
              {invoice.productionSource && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>بند التنفيذ:</span>
                  <span style={{ fontWeight: 700, color: getProductionSourceDetails(invoice.productionSource).badgeColor }}>
                    {getProductionSourceDetails(invoice.productionSource).icon} {getProductionSourceDetails(invoice.productionSource).label}
                  </span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>حالة السداد:</h4>
              <span className={`badge ${invoice.status === 'paid' ? 'badge-green' : invoice.status === 'partial' ? 'badge-orange' : 'badge-red'}`} style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                {invoice.status === 'paid' ? 'مدفوعة بالكامل ✓' : invoice.status === 'partial' ? 'مدفوعة جزئياً' : 'غير مسددة (معلقة)'}
              </span>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                المسدد: <strong>{curr} {invoice.paidAmount.toLocaleString()}</strong>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ width: '40px' }}>#</th>
                  <th>بيان الخدمة / الصنف</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>الكمية</th>
                  <th style={{ width: '120px', textAlign: 'left' }}>السعر الفردي</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>الضريبة %</th>
                  <th style={{ width: '130px', textAlign: 'left' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.description}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'left' }}>{curr} {item.unitPrice.toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>{item.taxRate}%</td>
                    <td style={{ textAlign: 'left', fontWeight: 700 }}>{curr} {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1.5rem' }}>
            <div style={{ maxWidth: '50%' }}>
              {invoice.notes && (
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <strong>ملاحظات وشروط:</strong>
                  <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>{invoice.notes}</p>
                </div>
              )}
            </div>

            <div style={{ width: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>المجموع الفرعي:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{curr} {invoice.subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>ضريبة القيمة المضافة:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{curr} {invoice.taxAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '2px solid var(--border-color)', borderBottom: '2px solid var(--border-color)', margin: '0.5rem 0', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>الإجمالي الكلي:</span>
                <span style={{ color: 'var(--primary-color)' }}>{curr} {invoice.totalAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.9rem', color: 'var(--danger-color)', fontWeight: 700 }}>
                <span>المتبقي المستحق:</span>
                <span>{curr} {(invoice.totalAmount - invoice.paidAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div>
              <p>توقيع المستلم: ...............................</p>
            </div>
            <div>
              <p>ختم واعتماد الشركة: ...............................</p>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            إغلاق
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            🖨️ طباعة الفاتورة الآن
          </button>
        </div>
      </div>
    </div>
  );
};
