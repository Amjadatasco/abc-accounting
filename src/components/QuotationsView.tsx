import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Quotation, QuotationItem, QuotationStatus, Currency, ProductionSource } from '../types/accounting';
import { PRODUCTION_SOURCES, getProductionSourceDetails } from '../types/accounting';
import { QuotationPrintModal } from './QuotationPrintModal';

interface QuotationsViewProps {
  onNavigateToInvoices?: () => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({ onNavigateToInvoices }) => {
  const { 
    quotations, 
    contacts, 
    addQuotation, 
    updateQuotation, 
    deleteQuotation, 
    convertQuotationToInvoice,
    addContact 
  } = useAccounting();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [printingQuotation, setPrintingQuotation] = useState<Quotation | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<'all' | 'USD' | 'SYP'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState('7');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [exchangeRate, setExchangeRate] = useState<string>(() => localStorage.getItem('last_dollar_rate') || '14800');
  const [productionSource, setProductionSource] = useState<ProductionSource>('uv');
  const [status, setStatus] = useState<QuotationStatus>('draft');
  const [deliveryTime, setDeliveryTime] = useState('خلال 2 إلى 4 أيام عمل من تاريخ اعتماد التصميم النهائي');
  const [paymentTerms, setPaymentTerms] = useState('50% دفعة مقدمة عند تثبيت الطلب، و50% عند الاستلام');
  const [notes, setNotes] = useState('الأسعار تشمل تجهيز البروفات والطباعة وفق المواصفات المذكورة، ولا تشمل أجور الشحن والتوصيل الخارجي إلا في حال الاتفاق.');
  const [internalNotes, setInternalNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');

  // Multi-items state
  const [items, setItems] = useState<Omit<QuotationItem, 'id'>[]>([
    { description: '', quantity: 1, unitPrice: 0, unit: 'قطعة', total: 0, productionSource: 'uv', notes: '' }
  ]);

  const currSym = currency === 'SYP' ? 'ل.س' : '$';
  const currentRateNum = parseFloat(exchangeRate) || 14800;

  // Presets for quick suggestions
  const servicePresets = [
    'طباعة لوحة فلكس وبنر عالي الدقة مع حلقات تثبيت',
    'طباعة كروت شخصية فاخرة وسلوفان مطفي مع سبوت UV',
    'طباعة ألبسة وتيشيرتات DTF حراري ألوان كاملة',
    'درع تكريمي فاخر كريستال شفاف مع نقش ليزر وعلبة مخمل',
    'لوحة حروف بارزة أكريليك وزنكور مع إضاءة LED داخلية',
    'طباعة بروشورات ومجلات وبوسترات كميات',
    'أكياس كرتون مطبوعة فاخرة مع مسكة حبل وسلوفان',
    'أعلام قماش حريرية وساريات مكتبية معدنية'
  ];

  // Helper calculations
  const calculateValidUntil = (startDateStr: string, daysStr: string): string => {
    try {
      const d = new Date(startDateStr);
      const days = parseInt(daysStr) || 7;
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return startDateStr;
    }
  };

  const handleItemChange = (index: number, field: keyof Omit<QuotationItem, 'id'>, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(String(field === 'quantity' ? value : current.quantity)) || 0;
      const p = parseFloat(String(field === 'unitPrice' ? value : current.unitPrice)) || 0;
      current.total = Math.round(q * p * 100) / 100;
    }
    
    updated[index] = current;
    setItems(updated);
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { description: '', quantity: 1, unitPrice: 0, unit: 'قطعة', total: 0, productionSource, notes: '' }
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const discountNum = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal - discountNum);

  const openNewQuotationModal = () => {
    setEditingQuotation(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCompany('');
    setCustomerAddress('');
    setQuotationDate(new Date().toISOString().split('T')[0]);
    setValidityDays('7');
    setCurrency('USD');
    setExchangeRate(localStorage.getItem('last_dollar_rate') || '14800');
    setProductionSource('uv');
    setStatus('draft');
    setDeliveryTime('خلال 2 إلى 4 أيام عمل من تاريخ اعتماد التصميم النهائي');
    setPaymentTerms('50% دفعة مقدمة عند تثبيت الطلب، و50% عند الاستلام');
    setNotes('الأسعار تشمل تجهيز البروفات والطباعة وفق المواصفات المذكورة، ولا تشمل أجور الشحن والتوصيل الخارجي.');
    setInternalNotes('');
    setDiscountAmount('0');
    setItems([
      { description: '', quantity: 1, unitPrice: 0, unit: 'قطعة', total: 0, productionSource: 'uv', notes: '' }
    ]);
    setIsModalOpen(true);
  };

  const handleEditQuotation = (quote: Quotation) => {
    setEditingQuotation(quote);
    setCustomerName(quote.customerName || '');
    setCustomerPhone(quote.customerPhone || '');
    setCustomerCompany(quote.customerCompany || '');
    setCustomerAddress(quote.customerAddress || '');
    setQuotationDate(quote.date || new Date().toISOString().split('T')[0]);
    setValidityDays(String(quote.validityDays || 7));
    setCurrency(quote.currency || 'USD');
    setExchangeRate(String(quote.exchangeRate || localStorage.getItem('last_dollar_rate') || 14800));
    setProductionSource(quote.productionSource || 'uv');
    setStatus(quote.status || 'draft');
    setDeliveryTime(quote.deliveryTime || '');
    setPaymentTerms(quote.paymentTerms || '');
    setNotes(quote.notes || '');
    setInternalNotes(quote.internalNotes || '');
    setDiscountAmount(String(quote.discountAmount || 0));
    setItems(
      quote.items && quote.items.length > 0
        ? quote.items.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            unit: it.unit || 'قطعة',
            total: it.total,
            productionSource: it.productionSource || quote.productionSource || 'uv',
            notes: it.notes || ''
          }))
        : [{ description: '', quantity: 1, unitPrice: 0, unit: 'قطعة', total: 0, productionSource: 'uv', notes: '' }]
    );
    setIsModalOpen(true);
  };

  const handleCustomerSelect = (name: string) => {
    setCustomerName(name);
    const existing = contacts.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      if (existing.phone && existing.phone !== 'غير مسجل') setCustomerPhone(existing.phone);
      if (existing.company) setCustomerCompany(existing.company);
      if (existing.address) setCustomerAddress(existing.address);
    }
  };

  const handleSubmit = (e: React.FormEvent, printImmediately = false) => {
    e.preventDefault();
    const custTrimmed = customerName.trim();
    if (!custTrimmed) {
      alert('يرجى تحديد أو كتابة اسم العميل / الجهة الطالبة لعرض السعر.');
      return;
    }

    const validItems = items.filter(it => it.description.trim() !== '');
    if (validItems.length === 0) {
      alert('يرجى إدخال بند واحد على الأقل في عرض السعر.');
      return;
    }

    if (grandTotal <= 0) {
      alert('يرجى التأكد من إدخال كميات وأسعار صحيحة للبنود.');
      return;
    }

    // Auto-save contact if new
    const existingCust = contacts.find(c => c.name.trim().toLowerCase() === custTrimmed.toLowerCase());
    let finalCustId = existingCust?.id;
    if (!existingCust) {
      finalCustId = `cnt_${Date.now()}`;
      addContact({
        name: custTrimmed,
        type: 'customer',
        phone: customerPhone.trim() || 'غير مسجل',
        company: customerCompany.trim(),
        address: customerAddress.trim(),
        balance: 0,
        currency,
        currencySymbol: currSym
      });
    }

    const finalRate = parseFloat(exchangeRate) || 14800;
    const finalEquivalent = currency === 'USD' 
      ? grandTotal * finalRate 
      : finalRate > 0 ? grandTotal / finalRate : 0;

    const validUntil = calculateValidUntil(quotationDate, validityDays);
    const quotationNumber = editingQuotation 
      ? editingQuotation.quotationNumber 
      : `QUO-2026-${String(quotations.length + 1).padStart(3, '0')}`;

    const quotationItems: QuotationItem[] = validItems.map((it, idx) => ({
      ...it,
      id: `qitem_${Date.now()}_${idx}`
    }));

    const quoteData: Omit<Quotation, 'id' | 'createdAt'> = {
      quotationNumber,
      customerId: finalCustId,
      customerName: custTrimmed,
      customerPhone: customerPhone.trim(),
      customerCompany: customerCompany.trim(),
      customerAddress: customerAddress.trim(),
      date: quotationDate,
      validUntil,
      validityDays: parseInt(validityDays) || 7,
      items: quotationItems,
      subtotal,
      discountAmount: discountNum,
      taxAmount: 0,
      totalAmount: grandTotal,
      currency,
      currencySymbol: currSym,
      exchangeRate: finalRate,
      equivalentAmount: Math.round(finalEquivalent * 100) / 100,
      productionSource,
      status,
      deliveryTime: deliveryTime.trim(),
      paymentTerms: paymentTerms.trim(),
      notes: notes.trim(),
      internalNotes: internalNotes.trim()
    };

    let savedQuote: Quotation;
    if (editingQuotation) {
      savedQuote = {
        ...editingQuotation,
        ...quoteData,
        id: editingQuotation.id,
        createdAt: editingQuotation.createdAt,
        updatedAt: new Date().toISOString()
      };
      updateQuotation(savedQuote);
    } else {
      savedQuote = addQuotation(quoteData);
    }

    localStorage.setItem('last_dollar_rate', String(finalRate));
    setIsModalOpen(false);

    if (printImmediately) {
      setPrintingQuotation(savedQuote);
    }
  };

  const handleConvert = (quote: Quotation) => {
    if (confirm(`هل ترغب في تحويل عرض السعر (${quote.quotationNumber}) للعميل (${quote.customerName}) إلى فاتورة بيع فعلية؟\nسيتم تسجيل الفاتورة وتثبيت المبالغ بالذمة.`)) {
      const newInv = convertQuotationToInvoice(quote.id);
      if (newInv) {
        alert(`تم تحويل عرض السعر بنجاح إلى الفاتورة رقم: ${newInv.invoiceNumber}`);
        if (onNavigateToInvoices) {
          onNavigateToInvoices();
        }
      }
    }
  };

  // Filtered List
  const filteredQuotations = quotations.filter(q => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || 
      q.quotationNumber.toLowerCase().includes(term) ||
      q.customerName.toLowerCase().includes(term) ||
      (q.customerCompany && q.customerCompany.toLowerCase().includes(term)) ||
      (q.customerPhone && q.customerPhone.includes(term)) ||
      q.items.some(i => i.description.toLowerCase().includes(term));

    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchesCurrency = filterCurrency === 'all' || (q.currency || 'USD') === filterCurrency;
    const matchesDate = (!filterStartDate || q.date >= filterStartDate) && (!filterEndDate || q.date <= filterEndDate);

    return matchesSearch && matchesStatus && matchesCurrency && matchesDate;
  });

  // KPI calculations
  const totalCount = quotations.length;
  const acceptedCount = quotations.filter(q => q.status === 'accepted').length;
  const convertedCount = quotations.filter(q => q.status === 'converted').length;
  const pendingCount = quotations.filter(q => q.status === 'sent' || q.status === 'draft').length;

  const totalUSD = quotations.filter(q => (q.currency || 'USD') === 'USD').reduce((s, q) => s + q.totalAmount, 0);
  const totalSYP = quotations.filter(q => (q.currency || 'USD') === 'SYP').reduce((s, q) => s + q.totalAmount, 0);

  return (
    <div>
      {/* Top Header */}
      <div className="top-header no-print">
        <div className="page-title">
          <h2>📋 عروض الأسعار (Quotations & Offers)</h2>
          <p>إعداد عروض الأسعار التقديرية للعملاء، طباعتها على ورق رسمي مع شعار ABC، ومتابعة اعتمادها وتحويلها إلى فواتير</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openNewQuotationModal} style={{ padding: '0.65rem 1.4rem', fontWeight: 800 }}>
            <span>+</span> إنشاء عرض سعر جديد
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid no-print" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">إجمالي عروض الأسعار</span>
          <span className="stat-value">{totalCount} عرض</span>
          <span className="stat-subtext" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>
            {totalUSD.toLocaleString()} $ + {totalSYP.toLocaleString()} ل.س
          </span>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #16a34a' }}>
          <span className="stat-label">عروض معتمدة ومقبولة ✓</span>
          <span className="stat-value" style={{ color: '#16a34a' }}>{acceptedCount}</span>
          <span className="stat-subtext">تمت موافقة العميل عليها</span>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #7c3aed' }}>
          <span className="stat-label">محولة لفواتير مبيعات 🔄</span>
          <span className="stat-value" style={{ color: '#7c3aed' }}>{convertedCount}</span>
          <span className="stat-subtext">أصبحت مبيعات وفواتير فعلية</span>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #d97706' }}>
          <span className="stat-label">بانتظار الرد / مسودة ⏳</span>
          <span className="stat-value" style={{ color: '#d97706' }}>{pendingCount}</span>
          <span className="stat-subtext">عروض قيد المتابعة مع الزبائن</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-card no-print" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'كافة العروض' },
              { id: 'accepted', label: 'المعتمدة ✓' },
              { id: 'converted', label: 'المحولة لفواتير 🔄' },
              { id: 'sent', label: 'تم الإرسال 🟡' },
              { id: 'draft', label: 'مسودة ⚪' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${filterStatus === tab.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', fontWeight: 700 }}
                onClick={() => setFilterStatus(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Currency & Date & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button 
                type="button"
                className={`btn btn-sm ${filterCurrency === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
                onClick={() => setFilterCurrency('all')}
              >
                الكل
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${filterCurrency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
                onClick={() => setFilterCurrency('USD')}
              >
                💵 $
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${filterCurrency === 'SYP' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
                onClick={() => setFilterCurrency('SYP')}
              >
                🇸🇾 ل.س
              </button>
            </div>

            {/* Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>من:</span>
              <input 
                type="date" 
                className="form-input"
                style={{ padding: '0.25rem 0.4rem', fontSize: '0.78rem', width: '125px' }}
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>إلى:</span>
              <input 
                type="date" 
                className="form-input"
                style={{ padding: '0.25rem 0.4rem', fontSize: '0.78rem', width: '125px' }}
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
              {(filterStartDate || filterEndDate || filterStatus !== 'all' || filterCurrency !== 'all') && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.74rem' }}
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterStatus('all');
                    setFilterCurrency('all');
                  }}
                >
                  ✕ مسح
                </button>
              )}
            </div>

            <div style={{ width: '220px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="🔍 بحث بالعميل، الصنف، الرقم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>قائمة عروض الأسعار ({filteredQuotations.length})</h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            انقر على زر 🖨️ لطباعة ورقة عرض السعر الرسمية المعتمدة مع شعار ABC
          </span>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>رقم العرض</th>
                <th style={{ width: '110px' }}>التاريخ</th>
                <th style={{ width: '110px' }}>الصلاحية</th>
                <th>العميل / المنشأة</th>
                <th>بيان البنود والمواصفات</th>
                <th style={{ width: '85px', textAlign: 'center' }}>العملة</th>
                <th style={{ width: '130px', textAlign: 'left' }}>الإجمالي</th>
                <th style={{ width: '120px', textAlign: 'center' }}>الحالة</th>
                <th style={{ width: '180px', textAlign: 'center' }} className="no-print">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                    <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>لا توجد عروض أسعار مسجلة تطابق خيارات البحث.</p>
                    <p style={{ fontSize: '0.85rem', margin: '0.35rem 0 1rem' }}>ابدأ الآن بإنشاء عرض سعر احترافي وأرسله لزبائنك مع شعار وتفاصيل شركتك.</p>
                    <button className="btn btn-primary btn-sm" onClick={openNewQuotationModal} style={{ fontWeight: 800 }}>
                      + إنشاء أول عرض سعر الآن
                    </button>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map(quote => {
                  const qSym = quote.currencySymbol || (quote.currency === 'SYP' ? 'ل.س' : '$');
                  const isSyp = quote.currency === 'SYP';
                  const firstItem = quote.items && quote.items[0];
                  const srcInfo = getProductionSourceDetails(quote.productionSource);

                  return (
                    <tr key={quote.id}>
                      <td style={{ fontWeight: 800, color: '#0284c7' }}>
                        {quote.quotationNumber}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{quote.date}</td>
                      <td style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 600 }}>
                        {quote.validUntil}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div>{quote.customerName}</div>
                        {quote.customerCompany && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            🏢 {quote.customerCompany}
                          </div>
                        )}
                        {quote.customerPhone && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            📞 {quote.customerPhone}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {firstItem?.description || 'بنود عرض السعر'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                          <span 
                            className="badge" 
                            style={{ 
                              backgroundColor: srcInfo.badgeBg, 
                              color: srcInfo.badgeColor, 
                              border: `1px solid ${srcInfo.badgeBorder}`, 
                              fontSize: '0.7rem', 
                              padding: '0.1rem 0.4rem' 
                            }}
                          >
                            {srcInfo.icon} {srcInfo.label}
                          </span>
                          {quote.items.length > 1 && (
                            <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700 }}>
                              +{quote.items.length - 1} بنود إضافية
                            </span>
                          )}
                        </div>
                        {quote.deliveryTime && (
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.15rem' }}>
                            ⏱️ تسليم: {quote.deliveryTime}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ backgroundColor: isSyp ? '#f0fdf4' : '#eff6ff', color: isSyp ? '#166534' : '#1e40af', border: `1px solid ${isSyp ? '#bbf7d0' : '#bfdbfe'}`, fontSize: '0.75rem', fontWeight: 700 }}>
                          {isSyp ? '🇸🇾 سوري' : '💵 دولار'}
                        </span>
                        {quote.exchangeRate && (
                          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            1$={Number(quote.exchangeRate).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'left', fontWeight: 900 }}>
                        <div>{qSym} {quote.totalAmount.toLocaleString()}</div>
                        {quote.exchangeRate ? (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>
                            {isSyp 
                              ? `≈ $ ${(quote.totalAmount / quote.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`
                              : `≈ ${Math.round(quote.totalAmount * quote.exchangeRate).toLocaleString()} ل.س`
                            }
                          </div>
                        ) : null}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="badge"
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            backgroundColor: quote.status === 'accepted' ? '#f0fdf4' : quote.status === 'converted' ? '#faf5ff' : quote.status === 'sent' ? '#fefce8' : '#f1f5f9',
                            color: quote.status === 'accepted' ? '#166534' : quote.status === 'converted' ? '#7c3aed' : quote.status === 'sent' ? '#854d0e' : '#475569',
                            border: `1px solid ${quote.status === 'accepted' ? '#bbf7d0' : quote.status === 'converted' ? '#ddd6fe' : quote.status === 'sent' ? '#fde047' : '#cbd5e1'}`
                          }}
                        >
                          {quote.status === 'accepted' ? 'مقبول ✓' :
                           quote.status === 'converted' ? 'محول لفاتورة 🔄' :
                           quote.status === 'sent' ? 'مرسل 🟡' :
                           quote.status === 'rejected' ? 'مرفوض ✕' : 'مسودة ⚪'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="no-print">
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            title="معاينة وطباعة ورقة عرض السعر"
                            style={{ padding: '0.25rem 0.55rem', color: '#0284c7', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
                            onClick={() => setPrintingQuotation(quote)}
                          >
                            🖨️ طباعة
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            title="تعديل العرض"
                            style={{ padding: '0.25rem 0.55rem', color: '#1d4ed8', borderColor: '#bfdbfe', backgroundColor: '#eff6ff', fontWeight: 700 }}
                            onClick={() => handleEditQuotation(quote)}
                          >
                            ✏️
                          </button>

                          {quote.status !== 'converted' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              title="تحويل إلى فاتورة مبيعات فعلية"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', backgroundColor: '#7c3aed', borderColor: '#6d28d9' }}
                              onClick={() => handleConvert(quote)}
                            >
                              🔄 تحويل
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            title="حذف"
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--danger-color)', borderColor: '#fecaca' }}
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف عرض السعر (${quote.quotationNumber}) للعميل (${quote.customerName})؟`)) {
                                deleteQuotation(quote.id);
                              }
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Quotation Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg" style={{ maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>📋</span>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {editingQuotation ? `تعديل عرض السعر (${editingQuotation.quotationNumber})` : 'إنشاء عرض سعر جديد للعميل'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    تسجيل البنود والأسعار والمواصفات لإصدار ورقة عرض سعر رسمية مع شعار ABC
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="modal-body">
                
                {/* Currency & Exchange Rate Bar */}
                <div style={{ 
                  marginBottom: '1.25rem', 
                  padding: '1rem 1.15rem', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1.5px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-dark)', display: 'block' }}>
                        عملة التسعير وعرض السعر:
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        حدد العملة التي سيتم كتابة العرض بها (دولار أمريكي أو ليرة سورية)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${currency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.45rem 1.25rem', fontWeight: 800, fontSize: '0.9rem' }}
                        onClick={() => setCurrency('USD')}
                      >
                        💵 دولار أمريكي ($)
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${currency === 'SYP' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.45rem 1.25rem', fontWeight: 800, fontSize: '0.9rem' }}
                        onClick={() => setCurrency('SYP')}
                      >
                        🇸🇾 ليرة سورية (ل.س)
                      </button>
                    </div>
                  </div>

                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fefce8',
                    borderRadius: '8px',
                    border: '1.5px solid #fde047',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#854d0e', margin: 0 }}>
                        💵 سعر صرف الدولار اليوم (مقابل الليرة السورية):
                      </label>
                      <span style={{ fontSize: '0.76rem', color: '#a16207', display: 'block' }}>
                        لتثبيت معادل المبلغ بدقة في ورقة عرض السعر
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        style={{ 
                          width: '135px', 
                          fontWeight: 800, 
                          textAlign: 'center', 
                          fontSize: '1rem', 
                          backgroundColor: 'white',
                          borderColor: '#fde047',
                          color: '#854d0e'
                        }}
                        value={exchangeRate} 
                        onChange={(e) => {
                          setExchangeRate(e.target.value);
                          localStorage.setItem('last_dollar_rate', e.target.value);
                        }}
                        placeholder="14800"
                        required
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#854d0e' }}>ل.س / $</span>
                    </div>
                  </div>
                </div>

                {/* Customer Details Row */}
                <div style={{ marginBottom: '1.25rem', padding: '1rem 1.15rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    👤 بيانات العميل أو المنشأة المستفيدة
                  </h4>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">اسم العميل / الجهة الطالبة *</label>
                      <input 
                        type="text" 
                        list="contacts-quotation-list"
                        className="form-input" 
                        required
                        placeholder="اكتب اسم العميل أو اختر من القائمة"
                        value={customerName}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                      />
                      <datalist id="contacts-quotation-list">
                        {contacts.map(c => (
                          <option key={c.id} value={c.name}>{c.company ? `(${c.company})` : ''}</option>
                        ))}
                      </datalist>
                    </div>

                    <div className="form-group">
                      <label className="form-label">الشركة أو المنشأة (إن وجدت)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="اسم الشركة، المحل، المكتب..."
                        value={customerCompany}
                        onChange={(e) => setCustomerCompany(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">رقم الهاتف / واتساب</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="مثال: +963 9xx xxx xxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">العنوان أو المدينة</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="مثال: إدلب - سرمدا - باب الهوى..."
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Dates & Source Row */}
                <div className="form-row" style={{ marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">تاريخ إصدار العرض *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required
                      value={quotationDate}
                      onChange={(e) => setQuotationDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">صلاحية العرض (أيام) *</label>
                    <select 
                      className="form-select"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                    >
                      <option value="3">صالح لمدة 3 أيام</option>
                      <option value="7">صالح لمدة 7 أيام (أسبوع)</option>
                      <option value="15">صالح لمدة 15 يوماً (أسبوعان)</option>
                      <option value="30">صالح لمدة 30 يوماً (شهر)</option>
                    </select>
                    <span style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '0.2rem', display: 'block', fontWeight: 600 }}>
                      ينتهي بتاريخ: {calculateValidUntil(quotationDate, validityDays)}
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">بند التنفيذ الأساسي</label>
                    <select 
                      className="form-select"
                      value={productionSource}
                      onChange={(e) => setProductionSource(e.target.value as ProductionSource)}
                    >
                      {PRODUCTION_SOURCES.map(src => (
                        <option key={src.id} value={src.id}>
                          {src.icon} {src.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">حالة العرض</label>
                    <select 
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                    >
                      <option value="draft">⚪ مسودة داخلية</option>
                      <option value="sent">🟡 تم الإرسال للعميل</option>
                      <option value="accepted">🟢 معتمد ومقبول من العميل</option>
                      <option value="rejected">🔴 مرفوض</option>
                    </select>
                  </div>
                </div>

                {/* Items Dynamic Section */}
                <div style={{ marginBottom: '1.25rem', padding: '1.1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1.5px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                        📦 بنود وتفاصيل ومواصفات عرض السعر ({items.length})
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        أدخل تفاصيل الخدمات والمقاسات والمواصفات بدقة
                      </span>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-primary"
                      onClick={addItem}
                      style={{ padding: '0.4rem 0.9rem', fontWeight: 800 }}
                    >
                      + إضافة بند جديد
                    </button>
                  </div>

                  {/* Preset quick pills */}
                  <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.45rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>اقتراحات سريعة:</span>
                    {servicePresets.slice(0, 4).map((p, idx) => (
                      <button 
                        key={idx}
                        type="button" 
                        onClick={() => {
                          const lastIdx = items.length - 1;
                          if (!items[lastIdx].description) {
                            handleItemChange(lastIdx, 'description', p);
                          } else {
                            setItems([...items, { description: p, quantity: 1, unitPrice: 0, unit: 'قطعة', total: 0, productionSource, notes: '' }]);
                          }
                        }}
                        style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '15px', padding: '0.2rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        + {p.split(' ')[0]} {p.split(' ')[1]} {p.split(' ')[2] || ''}
                      </button>
                    ))}
                  </div>

                  {/* Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {items.map((item, idx) => (
                      <div 
                        key={idx}
                        style={{
                          backgroundColor: 'white',
                          padding: '0.85rem 1rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0284c7' }}>
                            البند #{idx + 1}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✕ حذف هذا البند
                            </button>
                          )}
                        </div>

                        <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                          <div className="form-group" style={{ flex: 3 }}>
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>بيان الخدمة أو الصنف والمقاس *</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              required
                              placeholder="مثال: طباعة أوفست كروت شخصية وجهين مع سلفان مطفي..."
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>الوحدة</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="قطعة، متر، طقم..."
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>الكمية *</label>
                            <input 
                              type="number" 
                              step="any"
                              className="form-input" 
                              required
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>السعر الإفرادي ({currSym}) *</label>
                            <input 
                              type="number" 
                              step="any"
                              className="form-input" 
                              required
                              placeholder="0.00"
                              value={item.unitPrice || ''}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>إجمالي البند ({currSym})</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              readOnly
                              style={{ backgroundColor: '#f8fafc', fontWeight: 800, color: '#0284c7' }}
                              value={item.total.toLocaleString()}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0, marginTop: '0.35rem' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="مواصفات إضافية لهذا البند (اختياري: سماكة، ألوان، تفاصيل التشطيب...)"
                            value={item.notes || ''}
                            onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                            style={{ fontSize: '0.78rem' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terms and Notes Row */}
                <div className="form-row" style={{ marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">⏱️ مدة الجاهزية والتسليم</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="مثال: خلال 3 أيام عمل من اعتماد البروفة..."
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">💳 شروط وطريقة الدفع</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="مثال: 50% مقدم و50% عند التسليم..."
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">📌 شروط وملاحظات تظهر للعميل في ورقة العرض</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="شروط التسليم، مواصفات فنية عامة، تعليمات فحص البضاعة..."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">🔒 ملاحظات داخلية خاصة (لا تظهر للعميل)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="تكلفة الورشة، هوامش ربح، تذكير داخلي..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                  />
                </div>

                {/* Totals Summary */}
                <div style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>المجموع الفرعي:</span>
                      <strong style={{ display: 'block', fontSize: '1rem' }}>{currSym} {subtotal.toLocaleString()}</strong>
                    </div>

                    <div style={{ width: '120px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>خصم إضافي ({currSym}):</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block' }}>الإجمالي النهائي لعرض السعر:</span>
                    <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0284c7' }}>
                      {currSym} {grandTotal.toLocaleString()}
                    </span>
                    {grandTotal > 0 && (
                      <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'block', marginTop: '0.15rem' }}>
                        {currency === 'USD' 
                          ? `≈ ${Math.round(grandTotal * currentRateNum).toLocaleString()} ل.س` 
                          : `≈ $ ${(currentRateNum > 0 ? grandTotal / currentRateNum : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={(e) => handleSubmit(e, true)}
                    style={{ fontWeight: 700, borderColor: '#0284c7', color: '#0284c7' }}
                  >
                    🖨️ حفظ وعرض الورقة للطباعة
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.6rem', fontWeight: 800 }}>
                    💾 {editingQuotation ? 'حفظ التعديلات' : 'حفظ عرض السعر'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Quotation Modal */}
      {printingQuotation && (
        <QuotationPrintModal 
          quotation={printingQuotation} 
          onClose={() => setPrintingQuotation(null)} 
        />
      )}
    </div>
  );
};
