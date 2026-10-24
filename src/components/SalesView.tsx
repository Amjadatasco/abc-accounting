import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Invoice, Currency, ProductionSource } from '../types/accounting';
import { PRODUCTION_SOURCES, getProductionSourceDetails } from '../types/accounting';
import { InvoicePrintModal } from './InvoicePrintModal';

interface SalesViewProps {
  onOpenNewInvoiceModal?: () => void;
  initialSource?: ProductionSource;
  modalTrigger?: number;
}

export const SalesView: React.FC<SalesViewProps> = ({ initialSource, modalTrigger }) => {
  const { invoices, contacts, products, addInvoice, markInvoicePaid, deleteInvoice, addContact } = useAccounting();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCurrency, setFilterCurrency] = useState<'all' | 'USD' | 'SYP'>('all');
  const [filterType, setFilterType] = useState<'all' | 'service' | 'product'>('all');
  const [filterSource, setFilterSource] = useState<'all' | ProductionSource>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  // New Sale Form
  const [saleType, setSaleType] = useState<'service' | 'product'>('service');
  const [productionSource, setProductionSource] = useState<ProductionSource>(initialSource || 'uv');

  React.useEffect(() => {
    if (initialSource) {
      setProductionSource(initialSource);
    }
  }, [initialSource]);

  React.useEffect(() => {
    if (modalTrigger && modalTrigger > 0) {
      setIsModalOpen(true);
    }
  }, [modalTrigger]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [customerName, setCustomerName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalAmountInput, setTotalAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'sham_cash' | 'cash' | 'bank' | 'credit'>('sham_cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('paid');
  const [partialAmount, setPartialAmount] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const currSym = currency === 'SYP' ? 'ل.س' : '$';

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    if (!id) return;
    const p = products.find(prod => prod.id === id);
    if (p) {
      setItemDescription(p.name);
      setCurrency(p.currency);
      setUnitPrice(String(p.sellingPrice));
      const q = parseFloat(quantity) || 1;
      setTotalAmountInput(formatNumberClean(p.sellingPrice * q));
    }
  };

  // Smart Bidirectional Calculation:
  // When quantity changes: update total if unitPrice exists, or update unitPrice if total exists
  // When unitPrice changes: update total
  // When total changes: update unitPrice
  const formatNumberClean = (num: number): string => {
    if (isNaN(num) || !isFinite(num)) return '';
    const rounded = Math.round(num * 10000) / 10000;
    return String(rounded);
  };

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const q = parseFloat(val);
    const p = parseFloat(unitPrice);
    const t = parseFloat(totalAmountInput);
    if (q > 0) {
      if (unitPrice !== '' && !isNaN(p) && p > 0) {
        setTotalAmountInput(formatNumberClean(q * p));
      } else if (totalAmountInput !== '' && !isNaN(t) && t > 0) {
        setUnitPrice(formatNumberClean(t / q));
      }
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const p = parseFloat(val);
    const q = parseFloat(quantity) || 1;
    if (val !== '' && !isNaN(p) && p >= 0 && q > 0) {
      setTotalAmountInput(formatNumberClean(q * p));
    } else if (val === '') {
      setTotalAmountInput('');
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setTotalAmountInput(val);
    const t = parseFloat(val);
    const q = parseFloat(quantity) || 1;
    if (val !== '' && !isNaN(t) && t >= 0 && q > 0) {
      setUnitPrice(formatNumberClean(t / q));
    } else if (val === '') {
      setUnitPrice('');
    }
  };

  // Preset services & products for fast 1-click selection
  const servicePresets = [
    'طباعة كتب ومجلات',
    'طباعة بروشورات وفلايرات',
    'كروت عمل شخصية (Business Cards)',
    'تصميم هوية بصرية وشعار',
    'طباعة لافتة رول اب (Rollup)',
    'طباعة ستيكرات وليبل وتغليف',
    'خدمات تصوير وتوثيق'
  ];

  const productPresets = [
    'رول ورق كوشيه فاخر',
    'كرتون ورق تصوير A4',
    'أحبار طباعة ليزرية',
    'دفاتر وسجلات فواتير جاهزة',
    'علب كرتونية وتغليف جاهز'
  ];

  const customers = contacts.filter(c => c.type === 'customer' || c.type === 'both');

  const handleSubmit = (e: React.FormEvent, printImmediately = false) => {
    e.preventDefault();
    const custTrimmed = customerName.trim();
    const itemTrimmed = itemDescription.trim();
    const qtyNum = parseFloat(quantity) || 1;
    let priceNum = parseFloat(unitPrice) || 0;
    let totalNum = parseFloat(totalAmountInput) || 0;

    if (totalNum <= 0 && priceNum > 0) {
      totalNum = qtyNum * priceNum;
    } else if (priceNum <= 0 && totalNum > 0) {
      priceNum = totalNum / qtyNum;
    }

    if (!custTrimmed) {
      alert('يرجى تحديد أو كتابة اسم العميل');
      return;
    }
    if (!itemTrimmed) {
      alert('يرجى كتابة أو اختيار بيان الخدمة أو المنتج المباع');
      return;
    }
    if (totalNum <= 0) {
      alert('يرجى إدخال السعر الفردي أو المبلغ الإجمالي بشكل صحيح أكبر من الصفر');
      return;
    }

    // Check stock warning if selling a product
    if (saleType === 'product' && selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod && qtyNum > prod.quantity) {
        if (!confirm(`تنبيه: الكمية المطلوبة (${qtyNum}) أكبر من المتوفر حالياً بالمخزن (${prod.quantity} ${prod.unit || 'قطعة'}). هل ترغب في متابعة البيع وتخفيض الرصيد؟`)) {
          return;
        }
      }
    }

    // Auto-save customer if new
    const existingCust = contacts.find(c => c.name.trim().toLowerCase() === custTrimmed.toLowerCase());
    const finalCustomerId = existingCust?.id || `cnt_${Date.now()}`;

    if (!existingCust) {
      addContact({
        name: custTrimmed,
        type: 'customer',
        phone: 'غير مسجل',
        balance: 0,
        currency,
        currencySymbol: currSym
      });
    }

    const totalAmount = totalNum;
    let paidAmount = 0;
    let finalStatus: 'paid' | 'partial' | 'unpaid' = 'paid';

    if (paymentMethod === 'credit') {
      finalStatus = 'unpaid';
      paidAmount = 0;
    } else if (paymentStatus === 'paid') {
      finalStatus = 'paid';
      paidAmount = totalAmount;
    } else if (paymentStatus === 'unpaid') {
      finalStatus = 'unpaid';
      paidAmount = 0;
    } else {
      finalStatus = 'partial';
      paidAmount = parseFloat(partialAmount) || 0;
    }

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const newSaleData: Omit<Invoice, 'id' | 'createdAt'> = {
      invoiceNumber,
      customerId: finalCustomerId,
      customerName: custTrimmed,
      date: saleDate,
      dueDate: saleDate,
      items: [
        {
          id: `item_${Date.now()}`,
          productId: saleType === 'product' && selectedProductId ? selectedProductId : undefined,
          description: itemTrimmed,
          quantity: qtyNum,
          unitPrice: priceNum,
          taxRate: 0,
          total: totalAmount,
          productionSource
        }
      ],
      subtotal: totalAmount,
      taxAmount: 0,
      totalAmount,
      currency,
      currencySymbol: currSym,
      saleType,
      productionSource,
      paymentMethod,
      status: finalStatus,
      paidAmount,
      notes: notes || (saleType === 'service' ? `تقديم خدمة: ${itemTrimmed}` : `بيع منتج: ${itemTrimmed}`)
    };

    addInvoice(newSaleData);

    if (printImmediately) {
      setPrintingInvoice({
        ...newSaleData,
        id: `inv_${Date.now()}`,
        createdAt: new Date().toISOString()
      });
    }

    // Reset Form
    setCustomerName('');
    setItemDescription('');
    setSelectedProductId('');
    setProductionSource('uv');
    setQuantity('1');
    setUnitPrice('');
    setTotalAmountInput('');
    setPartialAmount('');
    setNotes('');
    setIsModalOpen(false);
  };

  // Filter Sales list
  const filteredSales = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.items.some(it => it.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (inv.notes && inv.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCurrency = filterCurrency === 'all' || (inv.currency || 'USD') === filterCurrency;
    const matchesType = filterType === 'all' || (inv.saleType || 'service') === filterType;
    const matchesSource = filterSource === 'all' || (inv.productionSource || 'general') === filterSource;
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'paid' && inv.status === 'paid') ||
                          (filterStatus === 'unpaid' && inv.status !== 'paid');
    const matchesDate = (!filterStartDate || inv.date >= filterStartDate) && (!filterEndDate || inv.date <= filterEndDate);

    return matchesSearch && matchesCurrency && matchesType && matchesSource && matchesStatus && matchesDate;
  });

  // KPI Calculations
  const salesUSD = invoices.filter(i => (i.currency || 'USD') === 'USD');
  const salesSYP = invoices.filter(i => (i.currency || 'USD') === 'SYP');

  const totalUSD = salesUSD.reduce((s, i) => s + i.totalAmount, 0);
  const paidUSD = salesUSD.reduce((s, i) => s + i.paidAmount, 0);
  const unpaidUSD = totalUSD - paidUSD;

  const totalSYP = salesSYP.reduce((s, i) => s + i.totalAmount, 0);
  const paidSYP = salesSYP.reduce((s, i) => s + i.paidAmount, 0);
  const unpaidSYP = totalSYP - paidSYP;

  // Source-based revenue breakdown
  const uvSales = invoices.filter(i => (i.productionSource || 'general') === 'uv');
  const dtfSales = invoices.filter(i => (i.productionSource || 'general') === 'dtf');
  const extSales = invoices.filter(i => (i.productionSource || 'general') === 'external');

  const uvUSD = uvSales.filter(i => (i.currency || 'USD') === 'USD').reduce((s, i) => s + i.totalAmount, 0);
  const uvSYP = uvSales.filter(i => (i.currency || 'USD') === 'SYP').reduce((s, i) => s + i.totalAmount, 0);

  const dtfUSD = dtfSales.filter(i => (i.currency || 'USD') === 'USD').reduce((s, i) => s + i.totalAmount, 0);
  const dtfSYP = dtfSales.filter(i => (i.currency || 'USD') === 'SYP').reduce((s, i) => s + i.totalAmount, 0);

  const extUSD = extSales.filter(i => (i.currency || 'USD') === 'USD').reduce((s, i) => s + i.totalAmount, 0);
  const extSYP = extSales.filter(i => (i.currency || 'USD') === 'SYP').reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div>
      {/* Top Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>سجل المبيعات والخدمات (Sales & Services)</h2>
          <p>تسجيل مبيعات الخدمات والمنتجات اليومية بسهولة وسرعة مع إدارة التحصيل الفوري والآجل</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => { setSaleType('product'); setSelectedProductId(''); setProductionSource('general'); setIsModalOpen(true); }}
            style={{ padding: '0.65rem 1.15rem', fontSize: '0.9rem', fontWeight: 800, backgroundColor: '#059669', borderColor: '#059669' }}
          >
            <span>📦</span> بيع بضاعة من المخزن
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => { setSaleType('service'); setSelectedProductId(''); setProductionSource('uv'); setIsModalOpen(true); }}
            style={{ padding: '0.65rem 1.15rem', fontSize: '0.9rem', fontWeight: 800 }}
          >
            <span>🛠️</span> بيع خدمة أو طباعة
          </button>
        </div>
      </div>

      {/* Main KPI Stats Row */}
      <div className="stats-grid" style={{ marginBottom: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="stat-card" style={{ borderRight: '4px solid #2563eb' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي المبيعات بالدولار</span>
            <span className="badge badge-blue">💵 USD ($)</span>
          </div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            $ {totalUSD.toLocaleString()}
          </div>
          <div className="stat-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--success-color)' }}>المحصل: $ {paidUSD.toLocaleString()}</span>
            {unpaidUSD > 0 && <span style={{ color: 'var(--danger-color)' }}>آجل: $ {unpaidUSD.toLocaleString()}</span>}
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #16a34a' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي المبيعات بالليرة السورية</span>
            <span className="badge badge-green">🇸🇾 SYP (ل.س)</span>
          </div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {totalSYP.toLocaleString()} <span style={{ fontSize: '1rem' }}>ل.س</span>
          </div>
          <div className="stat-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--success-color)' }}>المحصل: {paidSYP.toLocaleString()} ل.س</span>
            {unpaidSYP > 0 && <span style={{ color: 'var(--danger-color)' }}>آجل: {unpaidSYP.toLocaleString()} ل.س</span>}
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #64748b' }}>
          <div className="stat-header">
            <span className="stat-title">عدد العمليات المسجلة</span>
            <span className="badge badge-gray">{invoices.length} عملية</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--text-dark)' }}>
            {invoices.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>مبيعات</span>
          </div>
          <div className="stat-footer">
            <span>تشمل مبيعات الخدمات والمنتجات للعملاء</span>
          </div>
        </div>
      </div>

      {/* Production Source Revenue Breakdown Cards (Quick Filters) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        <div 
          onClick={() => setFilterSource(filterSource === 'uv' ? 'all' : 'uv')}
          style={{ 
            padding: '0.85rem 1.15rem', 
            backgroundColor: filterSource === 'uv' ? '#ede9fe' : '#faf5ff', 
            border: `2px solid ${filterSource === 'uv' ? '#7c3aed' : '#ddd6fe'}`, 
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filterSource === 'uv' ? '0 3px 8px rgba(124,58,237,0.18)' : 'none'
          }}
          title="انقر لتصفية مبيعات ماكينة الـ UV"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontWeight: 800, color: '#6d28d9', fontSize: '0.95rem' }}>🖨️ ماكينة UV</span>
            <span className="badge" style={{ backgroundColor: '#ede9fe', color: '#6d28d9', fontSize: '0.75rem', fontWeight: 800 }}>{uvSales.length} مبيعات</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#5b21b6' }}>
            $ {uvUSD.toLocaleString()} {uvSYP > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7c3aed' }}>+ {uvSYP.toLocaleString()} ل.س</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7c3aed', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>طباعة مسطحة / أسطح صلبة</span>
            {filterSource === 'uv' && <strong style={{ color: '#6d28d9' }}>محدد ✓</strong>}
          </div>
        </div>

        <div 
          onClick={() => setFilterSource(filterSource === 'dtf' ? 'all' : 'dtf')}
          style={{ 
            padding: '0.85rem 1.15rem', 
            backgroundColor: filterSource === 'dtf' ? '#d1fae5' : '#f0fdf4', 
            border: `2px solid ${filterSource === 'dtf' ? '#059669' : '#a7f3d0'}`, 
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filterSource === 'dtf' ? '0 3px 8px rgba(5,150,105,0.18)' : 'none'
          }}
          title="انقر لتصفية مبيعات ماكينة الـ DTF"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontWeight: 800, color: '#047857', fontSize: '0.95rem' }}>👕 ماكينة DTF</span>
            <span className="badge" style={{ backgroundColor: '#d1fae5', color: '#047857', fontSize: '0.75rem', fontWeight: 800 }}>{dtfSales.length} مبيعات</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#065f46' }}>
            $ {dtfUSD.toLocaleString()} {dtfSYP > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>+ {dtfSYP.toLocaleString()} ل.س</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>طباعة أقمشة وملابس وتيشرتات</span>
            {filterSource === 'dtf' && <strong style={{ color: '#047857' }}>محدد ✓</strong>}
          </div>
        </div>

        <div 
          onClick={() => setFilterSource(filterSource === 'external' ? 'all' : 'external')}
          style={{ 
            padding: '0.85rem 1.15rem', 
            backgroundColor: filterSource === 'external' ? '#fef3c7' : '#fffbeb', 
            border: `2px solid ${filterSource === 'external' ? '#d97706' : '#fde68a'}`, 
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filterSource === 'external' ? '0 3px 8px rgba(217,119,6,0.18)' : 'none'
          }}
          title="انقر لتصفية مبيعات المصدر الخارجي"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontWeight: 800, color: '#b45309', fontSize: '0.95rem' }}>🌐 مصدر خارجي</span>
            <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 800 }}>{extSales.length} مبيعات</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#92400e' }}>
            $ {extUSD.toLocaleString()} {extSYP > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706' }}>+ {extSYP.toLocaleString()} ل.س</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>تنفيذ ورش ومطابع خارجية (Outsource)</span>
            {filterSource === 'external' && <strong style={{ color: '#b45309' }}>محدد ✓</strong>}
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="table-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Filters Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Currency Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>العملة:</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  className={`btn btn-sm ${filterCurrency === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterCurrency('all')}
                >
                  الكل
                </button>
                <button 
                  className={`btn btn-sm ${filterCurrency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterCurrency('USD')}
                >
                  💵 دولار
                </button>
                <button 
                  className={`btn btn-sm ${filterCurrency === 'SYP' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterCurrency('SYP')}
                >
                  🇸🇾 سوري
                </button>
              </div>
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>النوع:</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterType('all')}
                >
                  الكل
                </button>
                <button 
                  className={`btn btn-sm ${filterType === 'service' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterType('service')}
                >
                  🛠️ خدمات
                </button>
                <button 
                  className={`btn btn-sm ${filterType === 'product' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterType('product')}
                >
                  📦 بضائع ومنتجات
                </button>
              </div>
            </div>

            {/* Production Source Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>المصدر:</span>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                <button 
                  className={`btn btn-sm ${filterSource === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterSource('all')}
                >
                  الكل
                </button>
                <button 
                  className={`btn btn-sm ${filterSource === 'uv' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '0.25rem 0.55rem', 
                    fontSize: '0.75rem',
                    ...(filterSource === 'uv' ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed' } : {})
                  }}
                  onClick={() => setFilterSource('uv')}
                >
                  🖨️ UV
                </button>
                <button 
                  className={`btn btn-sm ${filterSource === 'dtf' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '0.25rem 0.55rem', 
                    fontSize: '0.75rem',
                    ...(filterSource === 'dtf' ? { backgroundColor: '#059669', borderColor: '#059669' } : {})
                  }}
                  onClick={() => setFilterSource('dtf')}
                >
                  👕 DTF
                </button>
                <button 
                  className={`btn btn-sm ${filterSource === 'press' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '0.25rem 0.55rem', 
                    fontSize: '0.75rem',
                    ...(filterSource === 'press' ? { backgroundColor: '#dc2626', borderColor: '#dc2626' } : {})
                  }}
                  onClick={() => setFilterSource('press')}
                >
                  ♨️ مكبس
                </button>
                <button 
                  className={`btn btn-sm ${filterSource === 'laser' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '0.25rem 0.55rem', 
                    fontSize: '0.75rem',
                    ...(filterSource === 'laser' ? { backgroundColor: '#b45309', borderColor: '#b45309' } : {})
                  }}
                  onClick={() => setFilterSource('laser')}
                >
                  ⚡ ليزر
                </button>
                <button 
                  className={`btn btn-sm ${filterSource === 'regular_print' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '0.25rem 0.55rem', 
                    fontSize: '0.75rem',
                    ...(filterSource === 'regular_print' ? { backgroundColor: '#0369a1', borderColor: '#0369a1' } : {})
                  }}
                  onClick={() => setFilterSource('regular_print')}
                >
                  📄 عادية
                </button>
                <button 
                  className={`btn btn-sm ${filterSource === 'external' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '0.25rem 0.55rem', 
                    fontSize: '0.75rem',
                    ...(filterSource === 'external' ? { backgroundColor: '#c2410c', borderColor: '#c2410c' } : {})
                  }}
                  onClick={() => setFilterSource('external')}
                >
                  🌐 خارجي
                </button>
                <button 
                  className={`btn btn-sm ${filterSource === 'general' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '0.25rem 0.55rem', 
                    fontSize: '0.75rem',
                    ...(filterSource === 'general' ? { backgroundColor: '#475569', borderColor: '#475569' } : {})
                  }}
                  onClick={() => setFilterSource('general')}
                >
                  📦 عامة
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>السداد:</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterStatus('all')}
                >
                  الكل
                </button>
                <button 
                  className={`btn btn-sm ${filterStatus === 'paid' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterStatus('paid')}
                >
                  مسدد ✓
                </button>
                <button 
                  className={`btn btn-sm ${filterStatus === 'unpaid' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setFilterStatus('unpaid')}
                >
                  آجل (ديون)
                </button>
              </div>
            </div>

            {/* Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>من:</span>
              <input 
                type="date" 
                className="form-input" 
                style={{ width: '130px', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>إلى:</span>
              <input 
                type="date" 
                className="form-input" 
                style={{ width: '130px', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
              {(filterStartDate || filterEndDate || filterCurrency !== 'all' || filterType !== 'all' || filterSource !== 'all' || filterStatus !== 'all') && (
                <button 
                  className="btn btn-sm btn-outline" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterCurrency('all');
                    setFilterType('all');
                    setFilterSource('all');
                    setFilterStatus('all');
                  }}
                >
                  ✕ مسح الفلتر
                </button>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ width: '260px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="بحث بالعميل، الخدمة، المنتج..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Sales Records Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>سجل المبيعات والخدمات ({filteredSales.length})</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            يتم تحديث الأرصدة والحسابات المحاسبية تلقائياً مع كل عملية بيع
          </span>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>رقم العملية</th>
                <th style={{ width: '95px' }}>التاريخ</th>
                <th style={{ width: '120px', textAlign: 'center' }}>بند التنفيذ</th>
                <th style={{ width: '85px', textAlign: 'center' }}>النوع</th>
                <th>الخدمة / المنتج المباع</th>
                <th>العميل</th>
                <th>طريقة الدفع</th>
                <th style={{ textAlign: 'center', width: '90px' }}>العملة</th>
                <th style={{ textAlign: 'left', width: '125px' }}>المبلغ الإجمالي</th>
                <th style={{ textAlign: 'center', width: '105px' }}>حالة السداد</th>
                <th style={{ textAlign: 'center', width: '130px' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد عمليات مبيعات مطابقة لمعايير البحث. انقر على "+ تسجيل بيع خدمة أو منتج جديد" لإضافة مبيعات جديدة.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const saleSym = sale.currencySymbol || (sale.currency === 'SYP' ? 'ل.س' : '$');
                  const isSyp = sale.currency === 'SYP';
                  const remaining = sale.totalAmount - sale.paidAmount;
                  const firstItem = sale.items[0]?.description || sale.notes || 'خدمة مبيعات';
                  const srcInfo = getProductionSourceDetails(sale.productionSource);

                  return (
                    <tr key={sale.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>
                        {sale.invoiceNumber}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{sale.date}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: srcInfo.badgeBg, 
                            color: srcInfo.badgeColor, 
                            border: `1px solid ${srcInfo.badgeBorder}`,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {srcInfo.icon} {srcInfo.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${sale.saleType === 'product' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '0.75rem' }}>
                          {sale.saleType === 'product' ? '📦 منتج' : '🛠️ خدمة'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {firstItem}
                        {sale.items.length > 1 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.3rem' }}>+{sale.items.length - 1} بنود</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{sale.customerName}</td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {sale.paymentMethod === 'sham_cash' ? '📱 شام كاش' :
                           sale.paymentMethod === 'cash' ? '💵 كاش (صندوق)' :
                           sale.paymentMethod === 'bank' ? '🏦 تحويل بنكي' : '📋 آجل (دين)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ backgroundColor: isSyp ? '#f0fdf4' : '#eff6ff', color: isSyp ? '#166534' : '#1e40af', border: `1px solid ${isSyp ? '#bbf7d0' : '#bfdbfe'}`, fontSize: '0.75rem', fontWeight: 700 }}>
                          {isSyp ? '🇸🇾 سوري' : '💵 دولار'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'left', fontWeight: 800 }}>
                        {saleSym} {sale.totalAmount.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${sale.status === 'paid' ? 'badge-green' : sale.status === 'partial' ? 'badge-orange' : 'badge-red'}`}>
                          {sale.status === 'paid' ? 'مسددة ✓' : sale.status === 'partial' ? 'مسدد جزئياً' : 'معلقة (آجل)'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-sm btn-outline" 
                            title="طباعة إيصال / فاتورة"
                            onClick={() => setPrintingInvoice(sale)}
                          >
                            🖨️
                          </button>
                          {remaining > 0 && (
                            <button 
                              className="btn btn-sm btn-primary" 
                              title="تسجيل سداد وتحصيل"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                if (confirm(`هل تريد تأكيد سداد المبلغ المتبقي (${saleSym} ${remaining.toLocaleString()}) للعميل ${sale.customerName}؟`)) {
                                  markInvoicePaid(sale.id);
                                }
                              }}
                            >
                              سداد
                            </button>
                          )}
                          <button 
                            className="btn btn-sm btn-outline" 
                            style={{ color: 'var(--danger-color)', borderColor: '#fecaca', padding: '0.2rem 0.45rem' }}
                            title="حذف"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف عملية البيع ${sale.invoiceNumber}؟`)) {
                                deleteInvoice(sale.id);
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

      {/* Quick Sale Registration Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🛒</span>
                <div>
                  <h3 style={{ margin: 0 }}>تسجيل عملية بيع جديدة (خدمة أو منتج)</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>إدخال سريع وسلس مع الحفظ الفوري للعميل والحسابات</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="modal-body">
                
                {/* 1. Currency Selection Bar */}
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.15rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-dark)', display: 'block' }}>
                      عملة البيع والتحصيل:
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      حدد عملة تسعير هذه العملية
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${currency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.5rem 1.25rem', fontWeight: 800, fontSize: '0.9rem' }}
                      onClick={() => setCurrency('USD')}
                    >
                      💵 دولار أمريكي ($)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${currency === 'SYP' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.5rem 1.25rem', fontWeight: 800, fontSize: '0.9rem' }}
                      onClick={() => setCurrency('SYP')}
                    >
                      🇸🇾 ليرة سورية (ل.س)
                    </button>
                  </div>
                </div>

                {/* 2. Sale Type Toggle */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>نوع البيع:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className={`btn ${saleType === 'service' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      onClick={() => { setSaleType('service'); if (productionSource === 'general') setProductionSource('uv'); }}
                    >
                      <span>🛠️</span> تقديم خدمة (طباعة / تصميم / تنفيذ)
                    </button>
                    <button
                      type="button"
                      className={`btn ${saleType === 'product' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      onClick={() => setSaleType('product')}
                    >
                      <span>📦</span> بيع منتج جاهز (ورق / أحبار / رول / كروت)
                    </button>
                  </div>
                </div>

                {/* 2.5 Production Source Selection */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <span>🏭 بند ومصدر تنفيذ المبيعات *</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      (حدد الماكينة أو المصدر المنفذ للعملية)
                    </span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                    {PRODUCTION_SOURCES.map(src => {
                      const isSelected = productionSource === src.id;
                      return (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => setProductionSource(src.id)}
                          style={{
                            padding: '0.7rem 0.85rem',
                            borderRadius: '8px',
                            textAlign: 'right',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            transition: 'all 0.15s ease-in-out',
                            backgroundColor: isSelected ? src.badgeBg : '#ffffff',
                            color: isSelected ? src.badgeColor : 'var(--text-dark)',
                            border: `2px solid ${isSelected ? src.badgeColor : '#e2e8f0'}`,
                            boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                              {src.icon} {src.label}
                            </span>
                            {isSelected && <span style={{ fontSize: '0.9rem', fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: isSelected ? src.badgeColor : 'var(--text-muted)', lineHeight: 1.3 }}>
                            {src.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Customer & Date Row */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">العميل المستفيد (اكتب الاسم أو اختره) *</label>
                    <input 
                      type="text" 
                      list="sales-customers-datalist" 
                      className="form-input" 
                      required 
                      placeholder="اكتب اسم العميل (يُحفظ تلقائياً في دليل العملاء)..." 
                      value={customerName} 
                      onChange={(e) => setCustomerName(e.target.value)} 
                    />
                    <datalist id="sales-customers-datalist">
                      {customers.map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ✨ اكتب أي اسم عميل جديد وسيتم حفظه فوراً في قائمة العملاء.
                    </span>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">تاريخ العملية *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={saleDate} 
                      onChange={(e) => setSaleDate(e.target.value)} 
                    />
                  </div>
                </div>

                {/* 4. Product Selection or Service Description */}
                {saleType === 'product' && (
                  <div className="form-group" style={{ marginBottom: '1rem', padding: '0.85rem 1rem', backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius-md)' }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>📦 اختر البضاعة من المخزن</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>
                        (يتم خصم الكمية من صفحة البضائع تلقائياً)
                      </span>
                    </label>
                    <select
                      className="form-select"
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      style={{ fontWeight: 700, backgroundColor: '#ffffff', borderColor: '#86efac' }}
                    >
                      <option value="">-- اختر البضاعة من قائمة المخزن (لتعبئة السعر وخصم الكمية) --</option>
                      {products.map(p => {
                        const sym = p.currencySymbol || (p.currency === 'SYP' ? 'ل.س' : '$');
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} (المتوفر: {p.quantity} {p.unit || 'قطعة'} — السعر: {sym} {p.sellingPrice.toLocaleString()})
                          </option>
                        );
                      })}
                    </select>

                    {selectedProduct && (
                      <div style={{ marginTop: '0.6rem', padding: '0.45rem 0.65rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #dcfce7', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          الرصيد المتوفر بالمخزن: <strong style={{ color: selectedProduct.quantity > (selectedProduct.minQuantityAlert || 5) ? '#16a34a' : '#d97706', fontSize: '0.95rem' }}>{selectedProduct.quantity} {selectedProduct.unit || 'قطعة'}</strong>
                          {selectedProduct.category && <span style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }}>({selectedProduct.category})</span>}
                        </div>
                        {parseFloat(quantity) > selectedProduct.quantity && (
                          <span style={{ color: '#dc2626', fontWeight: 800 }}>
                            ⚠️ الكمية المطلوبة أكبر من المتوفر بالمخزن!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    {saleType === 'service' ? 'بيان الخدمة المقدمة للعميل *' : 'بيان الصنف أو المنتج المباع *'}
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder={saleType === 'service' ? 'مثال: طباعة 1000 بروشور مطوي وجهين، تصميم شعار...' : 'مثال: 5 كراتين ورق تصوير A4، رول بنر 80 جرام...'}
                    value={itemDescription} 
                    onChange={(e) => setItemDescription(e.target.value)} 
                  />

                  {/* Fast 1-Click Preset Buttons */}
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>اختيارات سريعة:</span>
                    {(saleType === 'service' ? servicePresets : productPresets).map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '15px' }}
                        onClick={() => {
                          setItemDescription(preset);
                          const matchingP = products.find(p => p.name.includes(preset) || preset.includes(p.name));
                          if (matchingP) handleProductSelect(matchingP.id);
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Quantity, Price, & Editable Live Total (Bidirectional Smart Calculation) */}
                <div style={{ padding: '1.1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'flex-start' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800 }}>الكمية (العدد) *</label>
                      <input 
                        type="number" 
                        min="0.001" 
                        step="any"
                        className="form-input" 
                        required 
                        value={quantity} 
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        عدد القطع أو الوحدات
                      </span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800 }}>السعر الفردي ({currSym})</label>
                      <input 
                        type="number" 
                        step="any" 
                        min="0"
                        className="form-input" 
                        placeholder="0.00"
                        value={unitPrice} 
                        onChange={(e) => handleUnitPriceChange(e.target.value)}
                        style={{ fontWeight: 800, fontSize: '1rem' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        سعر القطعة الواحدة
                      </span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800, color: 'var(--primary-color)' }}>
                        المبلغ الإجمالي النهائي ({currSym}) *
                      </label>
                      <input 
                        type="number" 
                        step="any" 
                        min="0"
                        className="form-input" 
                        placeholder="0.00"
                        value={totalAmountInput} 
                        onChange={(e) => handleTotalAmountChange(e.target.value)}
                        style={{ 
                          fontWeight: 900, 
                          color: 'var(--primary-color)', 
                          fontSize: '1.15rem', 
                          backgroundColor: '#eff6ff', 
                          borderColor: '#93c5fd',
                          boxShadow: '0 1px 3px rgba(37,99,235,0.08)'
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 700, marginTop: '0.25rem', display: 'block' }}>
                        قيمة العملية الإجمالية
                      </span>
                    </div>
                  </div>

                  {/* Smart helper banner */}
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem' }}>
                    <span style={{ color: '#166534', fontWeight: 600 }}>
                      💡 <strong>حساب ذكي وتلقائي:</strong> يمكنك كتابة <u>المبلغ الإجمالي</u> مع العدد وسيحسب النظام السعر الفردي تلقائياً، أو العكس تماماً!
                    </span>
                    {parseFloat(totalAmountInput) > 0 && (
                      <span style={{ fontWeight: 900, color: '#15803d', fontSize: '0.9rem' }}>
                        المجموع: {currSym} {parseFloat(totalAmountInput).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Payment Method & Status */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">طريقة استلام المبلغ (التحصيل) *</label>
                    <select 
                      className="form-select" 
                      value={paymentMethod} 
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setPaymentMethod(val);
                        if (val === 'credit') {
                          setPaymentStatus('unpaid');
                        } else if (paymentStatus === 'unpaid') {
                          setPaymentStatus('paid');
                        }
                      }}
                    >
                      <option value="sham_cash">📱 محفظة شام كاش (Sham Cash)</option>
                      <option value="cash">💵 نقداً كاش (صندوق الخزينة)</option>
                      <option value="bank">🏦 تحويل بنكي (حساب جاري)</option>
                      <option value="credit">📋 بيع آجل (دين على ذمة العميل)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">حالة استلام الدفعة *</label>
                    <select 
                      className="form-select" 
                      value={paymentStatus} 
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      disabled={paymentMethod === 'credit'}
                    >
                      <option value="paid">✓ تم استلام المبلغ بالكامل فوراً</option>
                      <option value="partial">⚖️ تم استلام دفعة جزئية (مقدمة)</option>
                      <option value="unpaid">⏳ لم يُستلم بعد (آجل بالكامل)</option>
                    </select>
                  </div>

                  {paymentStatus === 'partial' && paymentMethod !== 'credit' && (
                    <div className="form-group">
                      <label className="form-label">المبلغ المستلم فعلياً ({currSym}) *</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        required 
                        placeholder="0.00"
                        value={partialAmount} 
                        onChange={(e) => setPartialAmount(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 7. Notes */}
                <div className="form-group">
                  <label className="form-label">ملاحظات إضافية (شروط تسليم، تفاصيل المقاس أو اللون...)</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2} 
                    placeholder="أي تعليمات إضافية عن العملية..."
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={(e) => handleSubmit(e, true)}
                    style={{ fontWeight: 700 }}
                  >
                    🖨️ حفظ وطباعة الفاتورة
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontWeight: 800 }}>
                    💾 حفظ عملية البيع فورا
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {printingInvoice && (
        <InvoicePrintModal 
          invoice={printingInvoice} 
          onClose={() => setPrintingInvoice(null)} 
        />
      )}
    </div>
  );
};
