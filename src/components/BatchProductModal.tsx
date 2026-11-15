import React, { useState } from 'react';
import type { Product, Currency, ExpensePayer } from '../types/accounting';

export interface BatchItemRow {
  id: string;
  name: string;
  code?: string;
  category: string;
  unit: string;
  quantity: string;
  unitCost: string;
  shippingShare: string;
  landedCost: string;
  sellingPrice: string;
  marginPercent: string;
}

interface BatchProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  defaultCurrency?: Currency;
  onSaveBatch: (items: Omit<Product, 'id' | 'createdAt'>[]) => void;
}

export const BatchProductModal: React.FC<BatchProductModalProps> = ({
  isOpen,
  onClose,
  categories,
  defaultCurrency = 'USD',
  onSaveBatch,
}) => {
  const defaultCategories = [
    'ألواح بلكسي وروماك ومواد خام',
    'مواد طباعة وبودرة',
    'أعلام وسواري',
    'دروع تكريمية وكرستال',
    'ستاندات وإعلانات',
    'دفاتر ومطبوعات',
    'بضائع عامة'
  ];
  const allCategoryOptions = Array.from(new Set([...defaultCategories, ...categories]));

  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [paidBy, setPaidBy] = useState<ExpensePayer>('abc');
  const [totalShipping, setTotalShipping] = useState('');
  const [rows, setRows] = useState<BatchItemRow[]>([
    {
      id: 'row_1',
      name: '',
      category: allCategoryOptions[0] || 'بضائع عامة',
      unit: 'قطعة',
      quantity: '10',
      unitCost: '',
      shippingShare: '0',
      landedCost: '',
      sellingPrice: '',
      marginPercent: '40'
    },
    {
      id: 'row_2',
      name: '',
      category: allCategoryOptions[0] || 'بضائع عامة',
      unit: 'قطعة',
      quantity: '10',
      unitCost: '',
      shippingShare: '0',
      landedCost: '',
      sellingPrice: '',
      marginPercent: '40'
    },
    {
      id: 'row_3',
      name: '',
      category: allCategoryOptions[0] || 'بضائع عامة',
      unit: 'قطعة',
      quantity: '10',
      unitCost: '',
      shippingShare: '0',
      landedCost: '',
      sellingPrice: '',
      marginPercent: '40'
    }
  ]);

  if (!isOpen) return null;

  const currSym = currency === 'SYP' ? 'ل.س' : '$';

  // Add a single row
  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: '',
        category: allCategoryOptions[0] || 'بضائع عامة',
        unit: 'قطعة',
        quantity: '10',
        unitCost: '',
        shippingShare: '0',
        landedCost: '',
        sellingPrice: '',
        marginPercent: '40'
      }
    ]);
  };

  // Add multiple empty rows
  const handleAddMultipleRows = (count: number) => {
    const newItems: BatchItemRow[] = Array.from({ length: count }, (_, i) => ({
      id: `row_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
      name: '',
      category: allCategoryOptions[0] || 'بضائع عامة',
      unit: 'قطعة',
      quantity: '10',
      unitCost: '',
      shippingShare: '0',
      landedCost: '',
      sellingPrice: '',
      marginPercent: '40'
    }));
    setRows(prev => [...prev, ...newItems]);
  };

  // Remove a row
  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Update row field
  const handleUpdateRow = (id: string, field: keyof BatchItemRow, val: string) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: val };

      const cost = parseFloat(field === 'unitCost' ? val : updated.unitCost) || 0;
      const ship = parseFloat(field === 'shippingShare' ? val : updated.shippingShare) || 0;
      const landed = cost + ship;
      updated.landedCost = landed > 0 ? String(Math.round(landed * 1000) / 1000) : '';

      if (field === 'unitCost' || field === 'shippingShare' || field === 'marginPercent') {
        const margin = parseFloat(field === 'marginPercent' ? val : updated.marginPercent) || 0;
        if (landed > 0) {
          updated.sellingPrice = String(Math.round(landed * (1 + margin / 100) * 100) / 100);
        }
      } else if (field === 'sellingPrice') {
        const sell = parseFloat(val) || 0;
        if (landed > 0 && sell > 0) {
          updated.marginPercent = String(Math.round(((sell - landed) / landed) * 100));
        }
      }

      return updated;
    }));
  };

  // Distribute shipping across items proportionally to quantity
  const handleDistributeShipping = () => {
    const totalShip = parseFloat(totalShipping) || 0;
    if (totalShip <= 0) {
      alert('يرجى كتابة مبلغ أجور الشحن الإجمالية أولاً');
      return;
    }
    const totalUnits = rows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
    if (totalUnits <= 0) {
      alert('يرجى تحديد كميات البضائع لتوزيع الشحن عليها بنجاح');
      return;
    }
    const perUnitShip = totalShip / totalUnits;
    setRows(prev => prev.map(row => {
      const cost = parseFloat(row.unitCost) || 0;
      const landed = cost + perUnitShip;
      const margin = parseFloat(row.marginPercent) || 40;
      return {
        ...row,
        shippingShare: String(Math.round(perUnitShip * 1000) / 1000),
        landedCost: String(Math.round(landed * 1000) / 1000),
        sellingPrice: String(Math.round(landed * (1 + margin / 100) * 100) / 100)
      };
    }));
  };

  // Apply unified profit margin
  const handleApplyUnifiedMargin = (margin: number) => {
    setRows(prev => prev.map(row => {
      const landed = parseFloat(row.landedCost) || (parseFloat(row.unitCost) || 0);
      return {
        ...row,
        marginPercent: String(margin),
        sellingPrice: landed > 0 ? String(Math.round(landed * (1 + margin / 100) * 100) / 100) : row.sellingPrice
      };
    }));
  };

  // Calculations for summary
  const validRowsCount = rows.filter(r => r.name.trim() !== '').length;
  const totalUnitsCount = rows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
  const totalPurchaseCost = rows.reduce((sum, r) => {
    const q = parseFloat(r.quantity) || 0;
    const c = parseFloat(r.unitCost) || 0;
    return sum + (q * c);
  }, 0);
  const totalShipAmt = parseFloat(totalShipping) || 0;
  const totalLandedCapital = totalPurchaseCost + totalShipAmt;
  const totalExpectedRevenue = rows.reduce((sum, r) => {
    const q = parseFloat(r.quantity) || 0;
    const s = parseFloat(r.sellingPrice) || 0;
    return sum + (q * s);
  }, 0);
  const totalExpectedProfit = totalExpectedRevenue - totalLandedCapital;

  // Save all items to stock
  const handleSave = () => {
    const validRows = rows.filter(r => r.name.trim() !== '');
    if (validRows.length === 0) {
      alert('يرجى كتابة اسم صنف واحد على الأقل في الفاتورة');
      return;
    }

    const itemsToCreate: Omit<Product, 'id' | 'createdAt'>[] = validRows.map(r => {
      const cost = parseFloat(r.landedCost) || (parseFloat(r.unitCost) || 0);
      const sell = parseFloat(r.sellingPrice) || cost;
      const qty = parseFloat(r.quantity) || 1;
      const ship = parseFloat(r.shippingShare) || 0;

      return {
        name: r.name.trim(),
        code: r.code ? r.code.trim() : `PRD-${Math.floor(100 + Math.random() * 900)}`,
        category: r.category.trim() || 'بضائع عامة',
        unit: r.unit || 'قطعة',
        currency,
        currencySymbol: currSym,
        costPrice: Math.round(cost * 100) / 100,
        sellingPrice: Math.round(sell * 100) / 100,
        quantity: qty,
        minQuantityAlert: 5,
        paidBy,
        supplier: supplier.trim() || undefined,
        purchaseInvoiceRef: invoiceRef.trim() || undefined,
        shippingCost: ship > 0 ? ship : undefined,
        notes: [
          supplier.trim() ? `المورد: ${supplier.trim()}` : '',
          invoiceRef.trim() ? `فاتورة: ${invoiceRef.trim()}` : '',
          `تاريخ الشراء: ${date}`
        ].filter(Boolean).join(' | ') || undefined
      };
    });

    onSaveBatch(itemsToCreate);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1100px', width: '96%', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.7rem' }}>📑</span>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.25rem' }}>
                تسجيل فاتورة بضاعة جديدة (إدخال متعدد وسريع)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                أدخل كامل أصناف فاتورة الشراء دفعة واحدة، ووزّع الشحن بدقة، واحسب الكلفة الواقفة وسعر البيع بنقرة واحدة
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Invoice Header Details */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem', color: '#334155' }}>
                🏢 اسم المورد / التاجر
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="مثال: شركة النور للبلكسي..."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem', color: '#334155' }}>
                📄 رقم الفاتورة / مرجع الشحنة
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="مثال: INV-2026-88"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem', color: '#334155' }}>
                📅 تاريخ الفاتورة
              </label>
              <input 
                type="date" 
                className="form-input" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem', color: '#334155' }}>
                💱 عملة الفاتورة
              </label>
              <select 
                className="form-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                <option value="USD">دولار أمريكي ($)</option>
                <option value="SYP">ليرة سورية (ل.س)</option>
              </select>
            </div>

            {/* Who Paid for this Invoice */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem', color: '#334155' }}>
                💳 من دفع قيمة هذه الفاتورة؟ (لتسوية حساب الشركاء تلقائياً)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPaidBy('abc')}
                  style={{
                    padding: '0.55rem',
                    borderRadius: '7px',
                    border: paidBy === 'abc' ? '2px solid #475569' : '1px solid #cbd5e1',
                    backgroundColor: paidBy === 'abc' ? '#f1f5f9' : 'white',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  🏢 صندوق الشركة
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy('amjad')}
                  style={{
                    padding: '0.55rem',
                    borderRadius: '7px',
                    border: paidBy === 'amjad' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: paidBy === 'amjad' ? '#eff6ff' : 'white',
                    color: '#1d4ed8',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  👤 الشريك أمجد
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy('nour')}
                  style={{
                    padding: '0.55rem',
                    borderRadius: '7px',
                    border: paidBy === 'nour' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    backgroundColor: paidBy === 'nour' ? '#f0fdf4' : 'white',
                    color: '#15803d',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  👤 الشريك نور
                </button>
              </div>
            </div>

            {/* Total Shipping Distribution */}
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.35rem', color: '#b45309' }}>
                  🚚 أجور الشحن / التوصيل الإجمالية للفاتورة ({currSym})
                </label>
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  className="form-input" 
                  placeholder="مثال: 50"
                  value={totalShipping}
                  onChange={(e) => setTotalShipping(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleDistributeShipping}
                style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap', borderColor: '#f59e0b', color: '#b45309', fontWeight: 800 }}
              >
                ⚡ توزيع الشحن على الأصناف
              </button>
            </div>
          </div>

          {/* Quick Margins Preset Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e40af' }}>
              🎯 تطبيق هامش ربح موحد على كافة أصناف الفاتورة:
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[25, 30, 40, 50, 75, 100].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleApplyUnifiedMargin(m)}
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.78rem',
                    borderRadius: '5px',
                    border: '1px solid #93c5fd',
                    backgroundColor: 'white',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  +{m}%
                </button>
              ))}
            </div>
          </div>

          {/* Items Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'right' }}>
                  <th style={{ padding: '0.6rem 0.4rem', width: '35px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '0.6rem 0.5rem', minWidth: '170px' }}>اسم البضاعة / المنتج *</th>
                  <th style={{ padding: '0.6rem 0.5rem', minWidth: '130px' }}>التصنيف</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '75px' }}>الوحدة</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '85px' }}>الكمية</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '95px' }}>سعر الشراء ({currSym})</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '85px', color: '#b45309' }}>الشحن للقطعة</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '95px', color: '#0369a1', fontWeight: 800 }}>الكلفة الواقفة</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '75px' }}>هامش %</th>
                  <th style={{ padding: '0.6rem 0.5rem', width: '95px', color: '#15803d', fontWeight: 800 }}>سعر البيع ({currSym})</th>
                  <th style={{ padding: '0.6rem 0.4rem', width: '40px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>

                    {/* Name */}
                    <td style={{ padding: '0.4rem' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                        placeholder="اسم الصنف..." 
                        value={row.name}
                        onChange={(e) => handleUpdateRow(row.id, 'name', e.target.value)}
                      />
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.4rem' }}>
                      <select 
                        className="form-select"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        value={row.category}
                        onChange={(e) => handleUpdateRow(row.id, 'category', e.target.value)}
                      >
                        {allCategoryOptions.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>

                    {/* Unit */}
                    <td style={{ padding: '0.4rem' }}>
                      <select 
                        className="form-select"
                        style={{ padding: '0.35rem 0.35rem', fontSize: '0.8rem' }}
                        value={row.unit}
                        onChange={(e) => handleUpdateRow(row.id, 'unit', e.target.value)}
                      >
                        <option value="قطعة">قطعة</option>
                        <option value="متر">متر</option>
                        <option value="لوح">لوح</option>
                        <option value="رول">رول</option>
                        <option value="علبة">علبة</option>
                        <option value="كرتونة">كرتونة</option>
                        <option value="طقم">طقم</option>
                        <option value="درزن">درزن</option>
                        <option value="كغ">كغ</option>
                      </select>
                    </td>

                    {/* Quantity */}
                    <td style={{ padding: '0.4rem' }}>
                      <input 
                        type="number" 
                        step="any"
                        min="0"
                        className="form-input" 
                        style={{ padding: '0.35rem 0.4rem', fontSize: '0.82rem', textAlign: 'center', fontWeight: 700 }}
                        value={row.quantity}
                        onChange={(e) => handleUpdateRow(row.id, 'quantity', e.target.value)}
                      />
                    </td>

                    {/* Unit Buy Cost */}
                    <td style={{ padding: '0.4rem' }}>
                      <input 
                        type="number" 
                        step="any"
                        min="0"
                        className="form-input" 
                        style={{ padding: '0.35rem 0.4rem', fontSize: '0.82rem', textAlign: 'center' }}
                        placeholder="0.00"
                        value={row.unitCost}
                        onChange={(e) => handleUpdateRow(row.id, 'unitCost', e.target.value)}
                      />
                    </td>

                    {/* Shipping share */}
                    <td style={{ padding: '0.4rem' }}>
                      <input 
                        type="number" 
                        step="any"
                        min="0"
                        className="form-input" 
                        style={{ padding: '0.35rem 0.4rem', fontSize: '0.82rem', textAlign: 'center', color: '#b45309' }}
                        placeholder="0"
                        value={row.shippingShare}
                        onChange={(e) => handleUpdateRow(row.id, 'shippingShare', e.target.value)}
                      />
                    </td>

                    {/* Landed Cost (Readonly / Auto) */}
                    <td style={{ padding: '0.4rem', textAlign: 'center', fontWeight: 800, color: '#0284c7' }}>
                      {row.landedCost ? `${currSym} ${Number(row.landedCost).toFixed(2)}` : '-'}
                    </td>

                    {/* Margin % */}
                    <td style={{ padding: '0.4rem' }}>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        style={{ padding: '0.35rem 0.35rem', fontSize: '0.82rem', textAlign: 'center' }}
                        value={row.marginPercent}
                        onChange={(e) => handleUpdateRow(row.id, 'marginPercent', e.target.value)}
                      />
                    </td>

                    {/* Selling Price */}
                    <td style={{ padding: '0.4rem' }}>
                      <input 
                        type="number" 
                        step="any"
                        min="0"
                        className="form-input" 
                        style={{ padding: '0.35rem 0.4rem', fontSize: '0.82rem', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}
                        placeholder="0.00"
                        value={row.sellingPrice}
                        onChange={(e) => handleUpdateRow(row.id, 'sellingPrice', e.target.value)}
                      />
                    </td>

                    {/* Remove */}
                    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: rows.length <= 1 ? '#cbd5e1' : '#ef4444',
                          cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '1.1rem',
                          padding: '2px 6px'
                        }}
                        title="حذف السطر"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Row Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleAddRow}
              style={{ fontSize: '0.85rem', fontWeight: 800 }}
            >
              ➕ إضافة صنف إضافي
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleAddMultipleRows(5)}
              style={{ fontSize: '0.85rem' }}
            >
              ➕ إضافة 5 أسطر سريعة
            </button>
          </div>

          {/* Financial Summary Dashboard Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: '#0f172a',
            borderRadius: '10px',
            color: 'white'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>أصناف جاهزة للإدراج</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                {validRowsCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>صنف</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>إجمالي عدد القطع</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                {totalUnitsCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>قطعة</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>إجمالي شراء البضاعة</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#cbd5e1' }}>
                {currSym} {totalPurchaseCost.toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>أجور الشحن الإجمالية</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
                {currSym} {totalShipAmt.toFixed(2)}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #334155', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>إجمالي رأس المال المجمد</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f59e0b' }}>
                {currSym} {totalLandedCapital.toFixed(2)}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #334155', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>إجمالي قيمة المبيعات المتوقعة</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#4ade80' }}>
                {currSym} {totalExpectedRevenue.toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: '#86efac' }}>الأرباح الصافية المتوقعة</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: totalExpectedProfit >= 0 ? '#22c55e' : '#f87171' }}>
                +{currSym} {totalExpectedProfit.toFixed(2)}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '2px solid #e2e8f0', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            سيتم ربط مدفوعات هذه الفاتورة بحساب: <strong>{paidBy === 'amjad' ? 'الشريك أمجد' : paidBy === 'nour' ? 'الشريك نور' : 'صندوق الشركة'}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              إلغاء
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSave}
              style={{ padding: '0.7rem 1.5rem', fontSize: '0.95rem', fontWeight: 800, backgroundColor: '#16a34a', borderColor: '#16a34a' }}
            >
              💾 حفظ وترحيل جميع البضائع للمخزن ({validRowsCount} صنف)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
