import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Product, Currency } from '../types/accounting';

export const ProductsView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, adjustProductStock } = useAccounting();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<'all' | 'USD' | 'SYP'>('all');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('قطعة');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minQuantityAlert, setMinQuantityAlert] = useState('5');
  const [notes, setNotes] = useState('');

  // Extract unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Preset categories
  const defaultCategories = ['مواد طباعة وبودرة', 'أعلام وسواري', 'دروع تكريمية وكرستال', 'ستاندات وإعلانات', 'دفاتر ومطبوعات', 'بضائع عامة'];
  const allCategoryOptions = Array.from(new Set([...defaultCategories, ...categories]));

  // KPI Computations
  const totalItemsCount = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  const totalCostUSD = products
    .filter(p => p.currency === 'USD')
    .reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.costPrice) || 0)), 0);

  const totalCostSYP = products
    .filter(p => p.currency === 'SYP')
    .reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.costPrice) || 0)), 0);

  const lowStockProducts = products.filter(p => {
    const q = Number(p.quantity) || 0;
    const min = p.minQuantityAlert !== undefined ? p.minQuantityAlert : 5;
    return q > 0 && q <= min;
  });

  const outOfStockProducts = products.filter(p => (Number(p.quantity) || 0) <= 0);

  // Filter products list
  const filteredProducts = products.filter(p => {
    const q = Number(p.quantity) || 0;
    const min = p.minQuantityAlert !== undefined ? p.minQuantityAlert : 5;

    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesCurrency = selectedCurrency === 'all' || p.currency === selectedCurrency;

    let matchesStatus = true;
    if (selectedStatus === 'in_stock') matchesStatus = q > min;
    else if (selectedStatus === 'low_stock') matchesStatus = q > 0 && q <= min;
    else if (selectedStatus === 'out_of_stock') matchesStatus = q <= 0;

    return matchesSearch && matchesCategory && matchesCurrency && matchesStatus;
  });

  // Open modal for new product
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCode(`PRD-${Math.floor(100 + Math.random() * 900)}`);
    setCategory(allCategoryOptions[0] || 'بضائع عامة');
    setUnit('قطعة');
    setCurrency('USD');
    setCostPrice('');
    setSellingPrice('');
    setQuantity('10');
    setMinQuantityAlert('5');
    setNotes('');
    setIsProductModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code || '');
    setCategory(p.category || 'بضائع عامة');
    setUnit(p.unit || 'قطعة');
    setCurrency(p.currency);
    setCostPrice(String(p.costPrice || ''));
    setSellingPrice(String(p.sellingPrice || ''));
    setQuantity(String(p.quantity || '0'));
    setMinQuantityAlert(String(p.minQuantityAlert !== undefined ? p.minQuantityAlert : 5));
    setNotes(p.notes || '');
    setIsProductModalOpen(true);
  };

  // Submit product (add or update)
  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      alert('يرجى إدخال اسم البضاعة / المنتج');
      return;
    }

    const costNum = parseFloat(costPrice) || 0;
    const sellNum = parseFloat(sellingPrice) || 0;
    const qtyNum = parseFloat(quantity) || 0;
    const minAlertNum = parseFloat(minQuantityAlert) || 0;
    const sym = currency === 'SYP' ? 'ل.س' : '$';

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: nameTrimmed,
        code: code.trim() || undefined,
        category: category.trim() || 'عام',
        unit: unit.trim() || 'قطعة',
        currency,
        currencySymbol: sym,
        costPrice: costNum,
        sellingPrice: sellNum,
        quantity: qtyNum,
        minQuantityAlert: minAlertNum,
        notes: notes.trim() || undefined,
      });
    } else {
      addProduct({
        name: nameTrimmed,
        code: code.trim() || undefined,
        category: category.trim() || 'عام',
        unit: unit.trim() || 'قطعة',
        currency,
        currencySymbol: sym,
        costPrice: costNum,
        sellingPrice: sellNum,
        quantity: qtyNum,
        minQuantityAlert: minAlertNum,
        notes: notes.trim() || undefined,
      });
    }

    setIsProductModalOpen(false);
  };

  // Handle Quick Stock Adjust
  const handleOpenAdjustModal = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustType('add');
    setAdjustQuantity('');
    setAdjustReason('استلام بضاعة جديدة (وارد)');
    setIsAdjustModalOpen(true);
  };

  const handleSubmitAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('يرجى إدخال كمية صحيحة أكبر من الصفر');
      return;
    }

    const delta = adjustType === 'add' ? qty : -qty;
    adjustProductStock(adjustingProduct.id, delta, adjustReason || 'تسوية مخزون يدوية');
    setIsAdjustModalOpen(false);
  };

  const handleDelete = (id: string, prodName: string) => {
    if (confirm(`هل أنت متأكد من حذف البضاعة "${prodName}" من قائمة المنتجات؟`)) {
      deleteProduct(id);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>📦 إدارة البضائع والمنتجات (المخزون)</h2>
          <p>سجل البضائع والمواد المتوفرة بالمخزن مع التتبع التلقائي للكميات والمبيعات</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <span>+</span> إضافة بضاعة جديدة
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderRight: '4px solid #3b82f6' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي أصناف البضائع</span>
            <span className="badge badge-blue">سجل المواد</span>
          </div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {totalItemsCount} <span style={{ fontSize: '1rem', fontWeight: 600 }}>صنف</span>
          </div>
          <div className="stat-footer">
            <span>إجمالي الكميات: <strong>{totalStockUnits.toLocaleString()}</strong> وحدة</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #10b981' }}>
          <div className="stat-header">
            <span className="stat-title">القيمة الإجمالية للمخزون (تكلفة)</span>
            <span className="badge badge-green">رأس مال البضاعة</span>
          </div>
          <div className="stat-value" style={{ color: '#059669', fontSize: '1.45rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span>$ {Math.round(totalCostUSD).toLocaleString()}</span>
            {totalCostSYP > 0 && (
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#16a34a' }}>
                + {Math.round(totalCostSYP).toLocaleString()} ل.س
              </span>
            )}
          </div>
          <div className="stat-footer">
            <span>قيمة البضاعة المخزنة بناءً على سعر الشراء</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #f59e0b' }}>
          <div className="stat-header">
            <span className="stat-title">تنبيهات نقص المخزون</span>
            <span className={`badge ${lowStockProducts.length > 0 ? 'badge-orange' : 'badge-green'}`}>
              {lowStockProducts.length > 0 ? 'أوشكت على النفاد' : 'المخزون آمن'}
            </span>
          </div>
          <div className="stat-value" style={{ color: lowStockProducts.length > 0 ? '#d97706' : '#10b981' }}>
            {lowStockProducts.length} <span style={{ fontSize: '1rem', fontWeight: 600 }}>أصناف</span>
          </div>
          <div className="stat-footer">
            <span>أصناف وصلت للحد الأدنى وتتطلب إعادة طلب</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #ef4444' }}>
          <div className="stat-header">
            <span className="stat-title">بضائع نافدة (رصيد صفر)</span>
            <span className={`badge ${outOfStockProducts.length > 0 ? 'badge-red' : 'badge-green'}`}>
              {outOfStockProducts.length > 0 ? 'تحتاج توريد' : 'لا يوجد نافد'}
            </span>
          </div>
          <div className="stat-value" style={{ color: outOfStockProducts.length > 0 ? '#dc2626' : '#6b7280' }}>
            {outOfStockProducts.length} <span style={{ fontSize: '1rem', fontWeight: 600 }}>أصناف</span>
          </div>
          <div className="stat-footer">
            <span>أصناف رصيدها 0 لا يمكن بيعها حتى وصول كمية</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          
          {/* Search Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>🔍 بحث في البضائع</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="اسم البضاعة، الكود، التصنيف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>📁 التصنيف</label>
            <select 
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">كافة التصنيفات ({products.length})</option>
              {allCategoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>📊 حالة الرصيد</label>
            <select 
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
            >
              <option value="all">كافة الحالات</option>
              <option value="in_stock">متوفر بوفرة</option>
              <option value="low_stock">⚠️ أوشك على النفاد ({lowStockProducts.length})</option>
              <option value="out_of_stock">❌ نافد من المخزن ({outOfStockProducts.length})</option>
            </select>
          </div>

          {/* Currency Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>💵 العملة</label>
            <select 
              className="form-select"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as any)}
            >
              <option value="all">كافة العملات</option>
              <option value="USD">دولار أمريكي ($)</option>
              <option value="SYP">ليرة سورية (ل.س)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Products Table Card */}
      <div className="table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
            قائمة البضائع المخزنة ({filteredProducts.length})
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            💡 عند بيع أي بضاعة من شاشة المبيعات، ستنقص الكمية من هنا تلقائياً!
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📦</span>
            <h4>لا توجد بضائع مطابقة للبحث أو التصفية</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              يمكنك إضافة أول بضاعة عبر النقر على زر "+ إضافة بضاعة جديدة" بالأعلى.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>كود البضاعة</th>
                  <th>اسم البضاعة / الصنف</th>
                  <th>التصنيف</th>
                  <th>الكمية بالمخزن</th>
                  <th>سعر التكلفة</th>
                  <th>سعر البيع</th>
                  <th>هامش الربح</th>
                  <th>قيمة المخزون</th>
                  <th style={{ textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const q = Number(p.quantity) || 0;
                  const min = p.minQuantityAlert !== undefined ? p.minQuantityAlert : 5;
                  const cost = Number(p.costPrice) || 0;
                  const sell = Number(p.sellingPrice) || 0;
                  const sym = p.currencySymbol || (p.currency === 'SYP' ? 'ل.س' : '$');
                  const profitUnit = sell - cost;
                  const profitMargin = cost > 0 ? Math.round((profitUnit / cost) * 100) : 0;
                  const totalVal = q * cost;

                  const isOut = q <= 0;
                  const isLow = q > 0 && q <= min;

                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {p.code || '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{p.name}</div>
                        {p.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {p.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                          {p.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '1rem', 
                            fontWeight: 900, 
                            color: isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a' 
                          }}>
                            {q.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {p.unit || 'قطعة'}
                          </span>
                          {isOut ? (
                            <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>نافد</span>
                          ) : isLow ? (
                            <span className="badge badge-orange" style={{ fontSize: '0.7rem' }}>منخفض</span>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {sym} {cost.toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                        {sym} {sell.toLocaleString()}
                      </td>
                      <td>
                        {profitUnit > 0 ? (
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.85rem' }}>
                            +{profitMargin}% ({sym} {profitUnit.toLocaleString()})
                          </span>
                        ) : profitUnit < 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>
                            خسارة ({sym} {profitUnit.toLocaleString()})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0%</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: '#334155' }}>
                        {sym} {totalVal.toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          {/* Quick Adjust Button */}
                          <button 
                            className="btn btn-sm btn-outline" 
                            onClick={() => handleOpenAdjustModal(p)}
                            title="تعديل سريع للرصيد (+ / - وارد أو صادر)"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
                          >
                            ➕/➖ وارد
                          </button>

                          {/* Edit Button */}
                          <button 
                            className="btn btn-sm btn-outline" 
                            onClick={() => handleOpenEditModal(p)}
                            title="تعديل بيانات البضاعة"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            ✏️ تعديل
                          </button>

                          {/* Delete Button */}
                          <button 
                            className="btn btn-sm btn-outline" 
                            onClick={() => handleDelete(p.id, p.name)}
                            title="حذف البضاعة"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger-color)' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-md">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>
                {editingProduct ? '✏️ تعديل بيانات البضاعة' : '📦 إضافة صنف بضاعة جديد إلى المخزن'}
              </h3>
              <button className="modal-close" onClick={() => setIsProductModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmitProduct}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">اسم البضاعة أو الصنف *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="مثال: رول ورق كوشيه 150 جرام، كرتون تغليف وسط..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">كود / باركود البضاعة (اختياري)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="PRD-101"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">التصنيف *</label>
                    <input 
                      type="text" 
                      list="categories-datalist"
                      className="form-input" 
                      required
                      placeholder="اختر أو اكتب تصنيفاً..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                    <datalist id="categories-datalist">
                      {allCategoryOptions.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">وحدة القياس</label>
                    <select 
                      className="form-select"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <option value="قطعة">قطعة (Pcs)</option>
                      <option value="كرتونة">كرتونة (Box)</option>
                      <option value="رول">رول (Roll)</option>
                      <option value="علبة">علبة (Pack)</option>
                      <option value="دفتر">دفتر (Booklet)</option>
                      <option value="متر">متر (Meter)</option>
                      <option value="كيلوغرام">كيلوغرام (Kg)</option>
                      <option value="طرد">طرد / شوال</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">عملة التسعير *</label>
                    <select 
                      className="form-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                    >
                      <option value="USD">دولار أمريكي ($)</option>
                      <option value="SYP">ليرة سورية (ل.س)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">سعر التكلفة (سعر الشراء) *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      className="form-input" 
                      required
                      placeholder="0.00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">سعر البيع الافتراضي للزبون *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      className="form-input" 
                      required
                      placeholder="0.00"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">الكمية المتوفرة حالياً بالمخزن *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      className="form-input" 
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تنبيه عند انخفاض الكمية عن</label>
                    <input 
                      type="number" 
                      min="0"
                      className="form-input" 
                      value={minQuantityAlert}
                      onChange={(e) => setMinQuantityAlert(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات ومواصفات إضافية</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2}
                    placeholder="أي تفاصيل خاصة بالمقاس، المورد، أو مكان التخزين..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsProductModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'حفظ التعديلات' : 'إضافة البضاعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm">
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>
                ➕/➖ تعديل رصيد: {adjustingProduct.name}
              </h3>
              <button className="modal-close" onClick={() => setIsAdjustModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmitAdjust}>
              <div className="modal-body">
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  الرصيد الحالي بالمخزن: <strong style={{ color: 'var(--primary-color)', fontSize: '1.1rem' }}>{adjustingProduct.quantity}</strong> {adjustingProduct.unit || 'قطعة'}
                </div>

                <div className="form-group">
                  <label className="form-label">نوع العملية *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => { setAdjustType('add'); setAdjustReason('استلام بضاعة جديدة (وارد)'); }}
                      style={{ fontSize: '0.85rem' }}
                    >
                      ➕ إضافة وارد (زيادة)
                    </button>
                    <button 
                      type="button" 
                      className={`btn ${adjustType === 'subtract' ? 'btn-danger' : 'btn-outline'}`}
                      onClick={() => { setAdjustType('subtract'); setAdjustReason('سحب بضاعة / تسوية جرد أو تلف'); }}
                      style={{ fontSize: '0.85rem' }}
                    >
                      ➖ سحب / تسوية (نقصان)
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الكمية المراد {adjustType === 'add' ? 'إضافتها' : 'خصمها'} *</label>
                  <input 
                    type="number" 
                    step="any"
                    min="1"
                    className="form-input" 
                    required 
                    placeholder="أدخل الكمية..."
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">سبب التعديل</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>

                {adjustQuantity && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', marginTop: '0.5rem' }}>
                    الرصيد الجديد سيصبح: {adjustType === 'add' ? (adjustingProduct.quantity + (parseFloat(adjustQuantity) || 0)) : Math.max(0, adjustingProduct.quantity - (parseFloat(adjustQuantity) || 0))} {adjustingProduct.unit || 'قطعة'}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsAdjustModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  تأكيد تحديث الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
