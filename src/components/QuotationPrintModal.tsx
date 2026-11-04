import React from 'react';
import type { Quotation } from '../types/accounting';
import { useAccounting } from '../context/AccountingContext';

interface QuotationPrintModalProps {
  quotation: Quotation;
  onClose: () => void;
}

export const QuotationPrintModal: React.FC<QuotationPrintModalProps> = ({ quotation, onClose }) => {
  const { companySettings } = useAccounting();
  const curr = quotation.currencySymbol || (quotation.currency === 'SYP' ? 'ل.س' : '$');
  const isSyp = quotation.currency === 'SYP';

  React.useEffect(() => {
    document.body.classList.add('has-print-modal');
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, []);

  const handlePrint = () => {
    const printArea = document.getElementById('quotation-printable-area');
    if (!printArea) {
      window.print();
      return;
    }

    try {
      const existingIframe = document.getElementById('print-quotation-iframe');
      if (existingIframe) existingIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'print-quotation-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>عرض سعر ${quotation.quotationNumber} - ${companySettings.companyName || 'ABC للطباعة والإعلان'}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            body {
              direction: rtl;
              padding: 24px;
              background-color: #ffffff;
              color: #0f172a;
              line-height: 1.5;
              font-size: 13px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border-bottom: 1px solid #cbd5e1;
            }
            .badge {
              display: inline-block;
              border-radius: 4px;
              font-weight: 800;
            }
            @media print {
              body {
                padding: 15px !important;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 350);
    } catch {
      window.print();
    }
  };

  const copyWhatsAppSummary = () => {
    const itemsText = quotation.items.map((it, idx) => 
      `▫️ ${idx + 1}. *${it.description}* - كمية: ${it.quantity} ${it.unit || ''} بسعر: ${curr} ${it.unitPrice.toLocaleString()} = ${curr} ${it.total.toLocaleString()}`
    ).join('\n');

    const summary = `*عرض سعر من ${companySettings.companyName || 'ABC للطباعة والإعلان'}* 📋\n` +
      `رقم العرض: *${quotation.quotationNumber}*\n` +
      `التاريخ: ${quotation.date} | الصلاحية: حتى ${quotation.validUntil}\n` +
      `مقدم للسادة: *${quotation.customerName}*${quotation.customerCompany ? ` (${quotation.customerCompany})` : ''}\n\n` +
      `*تفاصيل البنود والأسعار:*\n${itemsText}\n\n` +
      `*الإجمالي النهائي:* *${curr} ${quotation.totalAmount.toLocaleString()}*` +
      (quotation.exchangeRate ? `\n(يعادل: ${isSyp ? `$ ${(quotation.totalAmount / quotation.exchangeRate).toFixed(2)}` : `${Math.round(quotation.totalAmount * quotation.exchangeRate).toLocaleString()} ل.س`} بسعر صرف 1$ = ${quotation.exchangeRate.toLocaleString()} ل.س)` : '') +
      (quotation.deliveryTime ? `\n\n⏱️ *مدة التسليم:* ${quotation.deliveryTime}` : '') +
      (quotation.paymentTerms ? `\n💳 *شروط الدفع:* ${quotation.paymentTerms}` : '') +
      (quotation.notes ? `\n📌 *ملاحظات:* ${quotation.notes}` : '') +
      `\n\nللتواصل والاستفسار: ${companySettings.phone || '+963995688838'}`;

    navigator.clipboard.writeText(summary);
    alert('تم نسخ ملخص عرض السعر بنجاح! يمكنك الآن لصقه مباشرة في واتساب للعميل.');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg" style={{ maxWidth: '850px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        
        {/* Controls Header */}
        <div className="modal-header no-print" style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>معاينة وطباعة ورقة عرض السعر</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {quotation.quotationNumber} - {quotation.customerName}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn btn-sm btn-outline"
              onClick={copyWhatsAppSummary}
              style={{ fontWeight: 700, borderColor: '#86efac', color: '#166534', backgroundColor: '#f0fdf4' }}
              title="نسخ صيغة منسقة للواتساب"
            >
              📱 نسخ للواتساب
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-primary"
              onClick={handlePrint}
              style={{ fontWeight: 800, padding: '0.45rem 1.15rem' }}
            >
              🖨️ طباعة عرض السعر
            </button>
            <button className="modal-close" onClick={onClose} style={{ marginRight: '0.35rem' }}>×</button>
          </div>
        </div>

        {/* Printable Paper Body */}
        <div style={{ overflowY: 'auto', padding: '1.5rem', backgroundColor: '#e2e8f0', flex: 1 }}>
          <div 
            id="quotation-printable-area"
            style={{
              backgroundColor: '#ffffff',
              maxWidth: '794px', // A4 ratio width
              margin: '0 auto',
              padding: '2.2rem 2.4rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
              borderRadius: '4px',
              color: '#0f172a',
              lineHeight: 1.5,
              fontSize: '13px'
            }}
          >
            {/* Header: Company Info & Quotation Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0284c7', paddingBottom: '1.25rem', marginBottom: '1.4rem' }}>
              
              {/* Logo & Company Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                <img 
                  src={companySettings.logoUrl || '/abc_logo.jpg'} 
                  alt="ABC Logo" 
                  style={{ 
                    width: '90px', 
                    height: '90px', 
                    objectFit: 'contain', 
                    borderRadius: '8px', 
                    border: '1.5px solid #e2e8f0', 
                    padding: '4px', 
                    backgroundColor: 'white' 
                  }} 
                />
                <div>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.2rem' }}>
                    {companySettings.companyName || 'ABC للطباعة والإعلان'}
                  </h1>
                  <p style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 700, margin: 0 }}>
                    {companySettings.tagline || 'خدمات الطباعة والإعلان والدعاية والتنفيذ'}
                  </p>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    {companySettings.phone && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>📞</span>
                        <span dir="ltr">{companySettings.phone}</span>
                      </span>
                    )}
                    {companySettings.address && <span>📍 {companySettings.address}</span>}
                    {companySettings.email && <span>✉️ {companySettings.email}</span>}
                  </div>
                </div>
              </div>

              {/* Quotation Badge & Meta */}
              <div style={{ textAlign: 'left', minWidth: '200px' }}>
                <div style={{ 
                  display: 'inline-block', 
                  backgroundColor: '#0284c7', 
                  color: 'white', 
                  padding: '0.45rem 1.4rem', 
                  borderRadius: '6px', 
                  fontWeight: 900, 
                  fontSize: '1.25rem',
                  letterSpacing: '0.5px',
                  marginBottom: '0.45rem'
                }}>
                  عرض سعر
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.35rem' }}>
                  PRICE QUOTATION
                </div>
                <p style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', margin: '0.15rem 0' }}>
                  {quotation.quotationNumber}
                </p>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                  التاريخ: <strong>{quotation.date}</strong>
                </p>
                <p style={{ fontSize: '0.82rem', color: '#b45309', margin: '0.15rem 0', fontWeight: 700 }}>
                  صالح لغاية: {quotation.validUntil}
                </p>
              </div>
            </div>

            {/* Client Info Card */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.2fr 0.8fr', 
              gap: '1.25rem', 
              padding: '0.9rem 1.25rem', 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px', 
              marginBottom: '1.35rem', 
              border: '1px solid #e2e8f0' 
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>
                  عرض سعر مقدم إلى السادة:
                </span>
                <p style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0284c7', margin: 0 }}>
                  {quotation.customerName}
                </p>
                {quotation.customerCompany && (
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0.15rem 0' }}>
                    🏢 المنشأة: {quotation.customerCompany}
                  </p>
                )}
                {quotation.customerPhone && (
                  <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0.15rem 0' }}>
                    📞 الهاتف: {quotation.customerPhone}
                  </p>
                )}
                {quotation.customerAddress && (
                  <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                    📍 العنوان: {quotation.customerAddress}
                  </p>
                )}
              </div>

              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                  حالة العرض:
                </span>
                <div>
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: '0.82rem', 
                      padding: '0.25rem 0.75rem', 
                      fontWeight: 800,
                      backgroundColor: quotation.status === 'accepted' ? '#f0fdf4' : quotation.status === 'converted' ? '#faf5ff' : '#eff6ff',
                      color: quotation.status === 'accepted' ? '#166534' : quotation.status === 'converted' ? '#7c3aed' : '#1d4ed8',
                      border: `1px solid ${quotation.status === 'accepted' ? '#bbf7d0' : quotation.status === 'converted' ? '#ddd6fe' : '#bfdbfe'}`
                    }}
                  >
                    {quotation.status === 'accepted' ? 'معتمد ومقبول ✓' :
                     quotation.status === 'converted' ? 'تم تحويله لفاتورة بيع ✓' :
                     quotation.status === 'rejected' ? 'مرفوض' :
                     quotation.status === 'sent' ? 'تم تقديمه للعميل' : 'مسودة'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ width: '40px', textAlign: 'center', padding: '0.65rem 0.5rem', fontWeight: 800, fontSize: '0.82rem' }}>#</th>
                    <th style={{ textAlign: 'right', padding: '0.65rem 0.75rem', fontWeight: 800, fontSize: '0.82rem' }}>بيان الخدمة / الصنف / المواصفات الفنية</th>
                    <th style={{ width: '80px', textAlign: 'center', padding: '0.65rem 0.5rem', fontWeight: 800, fontSize: '0.82rem' }}>الوحدة</th>
                    <th style={{ width: '75px', textAlign: 'center', padding: '0.65rem 0.5rem', fontWeight: 800, fontSize: '0.82rem' }}>الكمية</th>
                    <th style={{ width: '120px', textAlign: 'left', padding: '0.65rem 0.75rem', fontWeight: 800, fontSize: '0.82rem' }}>السعر الإفرادي</th>
                    <th style={{ width: '130px', textAlign: 'left', padding: '0.65rem 0.75rem', fontWeight: 800, fontSize: '0.82rem' }}>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, idx) => {
                    return (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '0.65rem 0.5rem' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.description}</div>
                          {item.notes && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                              🔹 {item.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                          {item.unit || 'قطعة'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, padding: '0.65rem 0.5rem' }}>
                          {item.quantity}
                        </td>
                        <td style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontWeight: 600 }}>
                          {curr} {item.unitPrice.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'left', fontWeight: 800, color: '#0284c7', padding: '0.65rem 0.75rem' }}>
                          {curr} {item.total.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
              
              {/* Terms and notes on the right */}
              <div style={{ flex: 1 }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.9rem 1.1rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                  <h4 style={{ margin: '0 0 0.45rem', fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                    📌 الشروط والأحكام وملاحظات العرض:
                  </h4>
                  
                  {quotation.deliveryTime && (
                    <p style={{ margin: '0.2rem 0', color: '#334155' }}>
                      ⏱️ <strong>مدة الجاهزية والتسليم:</strong> {quotation.deliveryTime}
                    </p>
                  )}
                  
                  {quotation.paymentTerms && (
                    <p style={{ margin: '0.2rem 0', color: '#334155' }}>
                      💳 <strong>طريقة وشروط الدفع:</strong> {quotation.paymentTerms}
                    </p>
                  )}

                  <p style={{ margin: '0.2rem 0', color: '#334155' }}>
                    ⏳ <strong>صلاحية العرض:</strong> صالح حتى تاريخ <strong>{quotation.validUntil}</strong> ويخضع لتوافر المواد وسعر الصرف.
                  </p>

                  {quotation.notes && quotation.notes.trim() && (
                    <div style={{ marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px dashed #cbd5e1', color: '#475569', whiteSpace: 'pre-wrap' }}>
                      {quotation.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Totals Box on the left */}
              <div style={{ width: '270px', backgroundColor: '#f8fafc', padding: '0.9rem 1.1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.88rem', color: '#64748b' }}>
                  <span>المجموع الفرعي:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{curr} {quotation.subtotal.toLocaleString()}</span>
                </div>

                {quotation.discountAmount && quotation.discountAmount > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.88rem', color: '#16a34a', fontWeight: 700 }}>
                    <span>خصم ممنوح:</span>
                    <span>- {curr} {quotation.discountAmount.toLocaleString()}</span>
                  </div>
                ) : null}

                {quotation.taxAmount && quotation.taxAmount > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.88rem', color: '#64748b' }}>
                    <span>ضريبة:</span>
                    <span style={{ fontWeight: 700 }}>{curr} {quotation.taxAmount.toLocaleString()}</span>
                  </div>
                ) : null}

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.65rem 0', 
                  borderTop: '2px solid #cbd5e1', 
                  borderBottom: '2px solid #cbd5e1', 
                  margin: '0.45rem 0', 
                  fontSize: '1.2rem', 
                  fontWeight: 900 
                }}>
                  <span style={{ color: '#0f172a' }}>الإجمالي الكلي:</span>
                  <span style={{ color: '#0284c7' }}>{curr} {quotation.totalAmount.toLocaleString()}</span>
                </div>

                {quotation.exchangeRate ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.78rem', color: '#64748b' }}>
                      <span>سعر الصرف المعتمد:</span>
                      <span>1$ = {quotation.exchangeRate.toLocaleString()} ل.س</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.85rem', color: '#0369a1', fontWeight: 800 }}>
                      <span>{isSyp ? 'المعادل بالدولار:' : 'المعادل بالليرة السورية:'}</span>
                      <span>
                        {isSyp 
                          ? `$ ${(quotation.totalAmount / quotation.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                          : `${Math.round(quotation.totalAmount * quotation.exchangeRate).toLocaleString()} ل.س`
                        }
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Official Signatures & Acceptance */}
            <div style={{ 
              marginTop: '2.5rem', 
              paddingTop: '1.25rem', 
              borderTop: '1.5px dashed #cbd5e1', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              fontSize: '0.82rem', 
              color: '#475569' 
            }}>
              <div style={{ width: '42%' }}>
                <p style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                  موافقة واعتماد العميل:
                </p>
                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0 0 1.5rem' }}>
                  أوافق على الأسعار والمواصفات والشروط الواردة في هذا العرض
                </p>
                <p>الاسم والتوقيع: .......................................</p>
                <p style={{ marginTop: '0.4rem' }}>التاريخ: ...... / ...... / 2026 م</p>
              </div>

              <div style={{ width: '42%', textAlign: 'left' }}>
                <p style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                  إدارة شركة ABC للطباعة والإعلان:
                </p>
                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0 0 1.5rem' }}>
                  شاكرين ثقتكم واختياركم لخدماتنا
                </p>
                <p>الختم والاعتماد: .......................................</p>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer no-print" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            يمكنك حفظ الورقة كملف <strong>PDF</strong> أو طباعتها مباشرة على ورق A4
          </div>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              إغلاق
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ fontWeight: 800, padding: '0.55rem 1.4rem' }}>
              🖨️ طباعة عرض السعر الآن
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
