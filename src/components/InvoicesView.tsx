import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Invoice, InvoiceItem, Currency } from '../types/accounting';
import { InvoicePrintModal } from './InvoicePrintModal';

interface InvoicesViewProps {
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  onOpenModal?: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  isModalOpen: externalModalOpen,
  onCloseModal: externalCloseModal,
  onOpenModal: externalOpenModal
}) => {
  const { invoices, contacts, addInvoice, markInvoicePaid, deleteInvoice, addContact } = useAccounting();

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setModalOpen = (open: boolean) => {
    if (externalCloseModal && !open) externalCloseModal();
    else if (externalOpenModal && open) externalOpenModal();
    else setInternalModalOpen(open);
  };

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  // New Invoice Form
  const [invoiceCurrency, setInvoiceCurrency] = useState<Currency>('USD');
  const formCurrSym = invoiceCurrency === 'SYP' ? 'ل.س' : '$';
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    { description: '', quantity: 1, unitPrice: 0, taxRate: 0, total: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [initialPaid, setInitialPaid] = useState('0');

  const customers = contacts.filter(c => c.type === 'customer' || c.type === 'both');

  const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id'> | 'lineTotal', value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'lineTotal') {
      const tot = parseFloat(value) || 0;
      const qty = Number(item.quantity) || 1;
      const taxRate = Number(item.taxRate) || 0;
      const sub = taxRate > 0 ? tot / (1 + taxRate / 100) : tot;
      item.unitPrice = qty > 0 ? Math.round((sub / qty) * 10000) / 10000 : 0;
      item.total = tot;
    } else {
      (item as any)[field] = value;
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const sub = qty * price;
      const tax = sub * (taxRate / 100);
      item.total = Math.round((sub + tax) * 10000) / 10000;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
  const totalTax = items.reduce((sum, item) => {
    const sub = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sum + (sub * ((Number(item.taxRate) || 0) / 100));
  }, 0);
  const grandTotal = subtotal + totalTax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = customerNameInput.trim();
    if (!nameTrimmed) {
      alert('يرجى كتابة أو اختيار اسم العميل');
      return;
    }

    // Check if customer exists in contacts, otherwise auto-save them!
    const existingCust = contacts.find(c => c.name.trim().toLowerCase() === nameTrimmed.toLowerCase());
    let finalCustomerId = existingCust?.id || `cnt_${Date.now()}`;

    if (!existingCust) {
      addContact({
        name: nameTrimmed,
        type: 'customer',
        phone: 'غير مسجل',
        balance: 0
      });
    }

    const invoiceNumber = `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    const paid = parseFloat(initialPaid) || 0;
    const status = paid >= grandTotal ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');

    addInvoice({
      invoiceNumber,
      customerId: finalCustomerId,
      customerName: nameTrimmed,
      date,
      dueDate,
      items: items.map((it, idx) => ({ ...it, id: `item_${idx}_${Date.now()}` })),
      subtotal,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      currency: invoiceCurrency,
      currencySymbol: formCurrSym,
      status,
      paidAmount: paid,
      notes
    });

    // Reset
    setInvoiceCurrency('USD');
    setCustomerNameInput('');
    setItems([{ description: '', quantity: 1, unitPrice: 0, taxRate: 0, total: 0 }]);
    setNotes('');
    setInitialPaid('0');
    setModalOpen(false);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesFilter = filterStatus === 'all' || inv.status === filterStatus;
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = (!filterStartDate || inv.date >= filterStartDate) && (!filterEndDate || inv.date <= filterEndDate);
    return matchesFilter && matchesSearch && matchesDate;
  });

  return (
    <div>
      <div className="top-header">
        <div className="page-title">
          <h2>إدارة فواتير المبيعات (Invoices)</h2>
          <p>إنشاء ومتابعة الفواتير الضريبية وتحصيل المستحقات من العملاء</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <span>+</span> إنشاء فاتورة مبيعات جديدة
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="table-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { id: 'all', label: 'كافة الفواتير' },
              { id: 'paid', label: 'المسددة بالكامل' },
              { id: 'unpaid', label: 'غير المسددة' },
              { id: 'partial', label: 'مسددة جزئياً' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`btn btn-sm ${filterStatus === tab.id ? 'btn-primary' : 'btn-outline'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>من:</span>
              <input 
                type="date" 
                className="form-input" 
                style={{ width: '135px', padding: '0.35rem 0.45rem', fontSize: '0.8rem' }}
                value={filterStartDate} 
                onChange={(e) => setFilterStartDate(e.target.value)} 
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>إلى:</span>
              <input 
                type="date" 
                className="form-input" 
                style={{ width: '135px', padding: '0.35rem 0.45rem', fontSize: '0.8rem' }}
                value={filterEndDate} 
                onChange={(e) => setFilterEndDate(e.target.value)} 
              />
              {(filterStartDate || filterEndDate) && (
                <button 
                  className="btn btn-sm btn-outline" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} 
                  onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                >
                  ✕ مسح
                </button>
              )}
            </div>

            <div style={{ width: '230px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="بحث برقم الفاتورة أو العميل..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="table-card">
        <div className="table-header">
          <h3>سجل فواتير المبيعات ({filteredInvoices.length})</h3>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>تاريخ الإصدار</th>
                <th>تاريخ الاستحقاق</th>
                <th style={{ textAlign: 'center' }}>العملة</th>
                <th style={{ textAlign: 'left' }}>الإجمالي</th>
                <th style={{ textAlign: 'left' }}>المتبقي</th>
                <th style={{ textAlign: 'center' }}>الحالة</th>
                <th style={{ textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const remaining = inv.totalAmount - inv.paidAmount;
                const invSym = inv.currencySymbol || (inv.currency === 'SYP' ? 'ل.س' : '$');
                const isSyp = inv.currency === 'SYP';

                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>
                      {inv.invoiceNumber}
                    </td>
                    <td style={{ fontWeight: 600 }}>{inv.customerName}</td>
                    <td style={{ fontSize: '0.85rem' }}>{inv.date}</td>
                    <td style={{ fontSize: '0.85rem', color: remaining > 0 ? '#b45309' : 'var(--text-muted)' }}>
                      {inv.dueDate}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ backgroundColor: isSyp ? '#f0fdf4' : '#eff6ff', color: isSyp ? '#166534' : '#1e40af', border: `1px solid ${isSyp ? '#bbf7d0' : '#bfdbfe'}`, fontSize: '0.75rem', fontWeight: 700 }}>
                        {isSyp ? '🇸🇾 سوري' : '💵 دولار'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'left', fontWeight: 800 }}>
                      {invSym} {inv.totalAmount.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'left', fontWeight: 700, color: remaining > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                      {remaining > 0 ? `${invSym} ${remaining.toLocaleString()}` : '0 ✓'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${inv.status === 'paid' ? 'badge-green' : inv.status === 'partial' ? 'badge-orange' : 'badge-red'}`}>
                        {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partial' ? 'جزئي' : 'معلقة'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-sm btn-outline" 
                          title="معاينة وطباعة الفاتورة"
                          onClick={() => setPrintingInvoice(inv)}
                        >
                          🖨️ طباعة
                        </button>
                        {remaining > 0 && (
                          <button 
                            className="btn btn-sm btn-primary" 
                            title="تسجيل سداد الفاتورة"
                            onClick={() => {
                              if (confirm(`هل تريد تأكيد سداد المبلغ المتبقي (${invSym} ${remaining.toLocaleString()}) للفاتورة ${inv.invoiceNumber}؟`)) {
                                markInvoicePaid(inv.id);
                              }
                            }}
                          >
                            سداد
                          </button>
                        )}
                        <button 
                          className="btn btn-sm btn-outline" 
                          style={{ color: 'var(--danger-color)', borderColor: '#fecaca' }}
                          title="حذف الفاتورة"
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف الفاتورة ${inv.invoiceNumber}؟`)) {
                              deleteInvoice(inv.id);
                            }
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {printingInvoice && (
        <InvoicePrintModal 
          invoice={printingInvoice} 
          onClose={() => setPrintingInvoice(null)} 
        />
      )}

      {/* New Invoice Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>إنشاء فاتورة مبيعات جديدة</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Currency Selection for Invoice */}
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.15rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-dark)', display: 'block' }}>
                      عملة الفاتورة (بيع / تسعير / تحصيل):
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      اختر العملة المحددة لهذه الفاتورة (دولار أمريكي أو ليرة سورية)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${invoiceCurrency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.45rem 1.1rem', fontWeight: 800, fontSize: '0.85rem' }}
                      onClick={() => setInvoiceCurrency('USD')}
                    >
                      💵 دولار أمريكي ($)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${invoiceCurrency === 'SYP' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.45rem 1.1rem', fontWeight: 800, fontSize: '0.85rem' }}
                      onClick={() => setInvoiceCurrency('SYP')}
                    >
                      🇸🇾 ليرة سورية (ل.س)
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">العميل المستفيد (اكتب اسم العميل أو اختره) *</label>
                    <input 
                      type="text" 
                      list="customers-datalist" 
                      className="form-input" 
                      required 
                      placeholder="اكتب اسم العميل (يُحفظ تلقائياً في الدليل)..." 
                      value={customerNameInput} 
                      onChange={(e) => setCustomerNameInput(e.target.value)} 
                    />
                    <datalist id="customers-datalist">
                      {customers.map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ✨ اكتب أي اسم عميل جديد وسيتم حفظه تلقائياً في قاعدة بيانات العملاء.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ الإصدار *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ الاستحقاق *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>بنود الفاتورة والخدمات ({formCurrSym})</h4>
                  <button type="button" className="btn btn-sm btn-outline" onClick={addItem}>
                    + إضافة بند آخر
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ margin: 0 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ width: '40%' }}>بيان الصنف أو الخدمة</th>
                        <th style={{ width: '90px' }}>الكمية</th>
                        <th style={{ width: '130px' }}>السعر ({formCurrSym})</th>
                        <th style={{ width: '90px' }}>الضريبة %</th>
                        <th style={{ width: '130px' }}>الإجمالي ({formCurrSym})</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <input 
                              type="text" 
                              className="form-input" 
                              required 
                              placeholder="وصف الخدمة أو المنتج..."
                              value={it.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min="1" 
                              required 
                              className="form-input" 
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem', textAlign: 'center' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              step="any" 
                              required 
                              className="form-input" 
                              value={it.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem', fontWeight: 700 }}
                            />
                          </td>
                          <td>
                            <select 
                              className="form-select" 
                              value={it.taxRate}
                              onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                              style={{ padding: '0.45rem 0.4rem', fontSize: '0.8rem' }}
                            >
                              <option value="0">0% (معفاة / بدون ضريبة - الأكثر شيوعاً في سوريا)</option>
                              <option value="1">1% (رسم طابع / إنفاق مخفض)</option>
                              <option value="2">2% (رسم إنفاق استهلاكي للطباعة)</option>
                              <option value="5">5% (ضريبة مبيعات عامة ودعاية)</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="number" 
                              step="any" 
                              className="form-input" 
                              placeholder="0.00"
                              value={it.total || ''}
                              onChange={(e) => handleItemChange(idx, 'lineTotal', e.target.value)}
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-color)', backgroundColor: '#eff6ff' }}
                            />
                          </td>
                          <td>
                            {items.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeItem(idx)}
                                style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '1.1rem' }}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 280px', gap: '1.25rem', marginTop: '1.25rem', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                        <span>المبلغ المسدد / دفعة مقدمة ({formCurrSym}):</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                          (اتركه 0 إذا كانت الفاتورة آجلة بالكامل)
                        </span>
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        min="0"
                        className="form-input" 
                        placeholder="0.00"
                        value={initialPaid} 
                        onChange={(e) => setInitialPaid(e.target.value)} 
                        style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-color)' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label className="form-label">ملاحظات وشروط الفاتورة</label>
                      <textarea 
                        className="form-textarea" 
                        rows={2} 
                        placeholder="أي تفاصيل أو شروط تسليم، طريقة الدفع..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  {/* Summary Calculation Box */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span className="text-muted">المجموع الفرعي:</span>
                      <strong>{formCurrSym} {subtotal.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span className="text-muted">ضريبة القيمة المضافة:</span>
                      <strong>{formCurrSym} {totalTax.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '2px solid var(--border-color)', fontSize: '1.05rem', fontWeight: 800 }}>
                      <span>الإجمالي النهائي:</span>
                      <span style={{ color: 'var(--primary-color)' }}>{formCurrSym} {grandTotal.toLocaleString()}</span>
                    </div>

                    {parseFloat(initialPaid) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
                        <span>المسدد مقدماً:</span>
                        <span>{formCurrSym} {(parseFloat(initialPaid) || 0).toLocaleString()}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.9rem', fontWeight: 800, color: (grandTotal - (parseFloat(initialPaid) || 0)) > 0 ? '#b45309' : '#16a34a' }}>
                      <span>المتبقي (آجل / ذمة):</span>
                      <span>{formCurrSym} {Math.max(0, grandTotal - (parseFloat(initialPaid) || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  عملة الفاتورة: <strong>{invoiceCurrency === 'USD' ? '💵 دولار أمريكي ($)' : '🇸🇾 ليرة سورية (ل.س)'}</strong>
                </span>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.5rem', fontWeight: 800 }}>
                    💾 حفظ وإصدار الفاتورة
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
