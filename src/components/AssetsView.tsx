import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Asset, Currency, ProductionSource } from '../types/accounting';

interface AssetsViewProps {
  onNavigateToSalesWithSource?: (source: ProductionSource) => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({ onNavigateToSalesWithSource }) => {
  const { assets, invoices, addAsset, updateAsset, deleteAsset } = useAccounting();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'printers' | 'heat_press' | 'laser' | 'equipment' | 'other'>('all');

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<'printers' | 'heat_press' | 'laser' | 'equipment' | 'other'>('printers');
  const [productionSourceKey, setProductionSourceKey] = useState<ProductionSource>('dtf');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [status, setStatus] = useState<'active' | 'maintenance' | 'standby'>('active');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingAsset(null);
    setName('');
    setCode(`AST-${Date.now().toString().slice(-4)}`);
    setCategory('printers');
    setProductionSourceKey('dtf');
    setPurchasePrice('');
    setCurrency('USD');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setSupplier('مطبعة الفؤاد للطباعة والإعلان');
    setInvoiceRef('');
    setStatus('active');
    setDescription('');
    setSerialNumber('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (ast: Asset) => {
    setEditingAsset(ast);
    setName(ast.name);
    setCode(ast.code);
    setCategory(ast.category);
    setProductionSourceKey(ast.productionSourceKey || 'general');
    setPurchasePrice(String(ast.purchasePrice));
    setCurrency(ast.currency || 'USD');
    setPurchaseDate(ast.purchaseDate || new Date().toISOString().split('T')[0]);
    setSupplier(ast.supplier || '');
    setInvoiceRef(ast.invoiceRef || '');
    setStatus(ast.status);
    setDescription(ast.description || '');
    setSerialNumber(ast.serialNumber || '');
    setNotes(ast.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      alert('يرجى إدخال اسم الأصل أو الماكينة');
      return;
    }

    const priceNum = parseFloat(purchasePrice) || 0;
    const currSym = currency === 'SYP' ? 'ل.س' : '$';

    if (editingAsset) {
      updateAsset({
        ...editingAsset,
        name: nameTrimmed,
        code: code.trim() || editingAsset.code,
        category,
        productionSourceKey,
        purchasePrice: priceNum,
        currency,
        currencySymbol: currSym,
        purchaseDate,
        supplier: supplier.trim(),
        invoiceRef: invoiceRef.trim(),
        status,
        description: description.trim(),
        serialNumber: serialNumber.trim(),
        notes: notes.trim()
      });
    } else {
      addAsset({
        name: nameTrimmed,
        code: code.trim() || `AST-${Date.now().toString().slice(-4)}`,
        category,
        productionSourceKey,
        purchasePrice: priceNum,
        currency,
        currencySymbol: currSym,
        purchaseDate,
        supplier: supplier.trim(),
        invoiceRef: invoiceRef.trim(),
        status,
        description: description.trim(),
        serialNumber: serialNumber.trim(),
        notes: notes.trim()
      });
    }

    setIsModalOpen(false);
  };

  // Helper to compute live print jobs and revenue per machine
  const getAssetPerformance = (ast: Asset) => {
    const key = ast.productionSourceKey;
    // Find all invoices that used this machine
    const matchingInvoices = invoices.filter(inv => {
      if (inv.assetId && inv.assetId === ast.id) return true;
      if (key && inv.productionSource === key) return true;
      return false;
    });

    const jobsCount = matchingInvoices.length;
    const printedQty = matchingInvoices.reduce((sum, inv) => {
      const itemsSum = inv.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      return sum + itemsSum;
    }, 0);

    const revenueUSD = matchingInvoices
      .filter(i => (i.currency || 'USD') === 'USD')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const revenueSYP = matchingInvoices
      .filter(i => (i.currency || 'USD') === 'SYP')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const costRecoveryUSD = ast.purchasePrice > 0 ? Math.min(100, Math.round((revenueUSD / ast.purchasePrice) * 100)) : 100;

    return {
      jobsCount,
      printedQty,
      revenueUSD,
      revenueSYP,
      costRecoveryUSD
    };
  };

  // Filtered Assets list
  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.supplier && a.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (a.notes && a.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = filterCategory === 'all' || a.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  // KPI Calculations
  const totalAssetsCostUSD = assets
    .filter(a => (a.currency || 'USD') === 'USD')
    .reduce((s, a) => s + a.purchasePrice, 0);

  const activeMachinesCount = assets.filter(a => a.status === 'active').length;

  const totalAllPrintJobs = assets.reduce((sum, a) => sum + getAssetPerformance(a).jobsCount, 0);
  const totalAllMachineRevenueUSD = assets.reduce((sum, a) => sum + getAssetPerformance(a).revenueUSD, 0);

  return (
    <div>
      {/* Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>الأصول الثابتة والماكينات (Fixed Assets & Machines)</h2>
          <p>إدارة الماكينات والطابعات والمكابس الحرارية وإحصاء عدد مرات الطباعة والتشغيل عليها ومتابعة استرداد قيمتها</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddModal} style={{ fontWeight: 800 }}>
            <span>➕</span> تسجيل أصل أو ماكينة جديدة
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="stat-card" style={{ borderRight: '4px solid #7c3aed' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي الاستثمار في الأصول</span>
            <span className="badge badge-purple" style={{ backgroundColor: '#ede9fe', color: '#6d28d9', fontWeight: 800 }}>
              🏢 أصول رأسمالية
            </span>
          </div>
          <div className="stat-value" style={{ color: '#6d28d9' }}>
            $ {totalAssetsCostUSD.toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>تشمل طابعات الـ DTF ومكابس الحرارة وماكينات الـ UV</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #059669' }}>
          <div className="stat-header">
            <span className="stat-title">الماكينات العاملة والجاهزة</span>
            <span className="badge badge-green">🟢 نشطة</span>
          </div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {activeMachinesCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ماكينات</span>
          </div>
          <div className="stat-footer">
            <span>من إجمالي {assets.length} أصول مسجلة في الورشة</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #2563eb' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي عمليات الطباعة المنفذة</span>
            <span className="badge badge-blue">📊 عداد التشغيل</span>
          </div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {totalAllPrintJobs} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>عملية طباعة</span>
          </div>
          <div className="stat-footer">
            <span>يتم إحصاء العمليات تلقائياً فور تسجيل أي بيع</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #d97706' }}>
          <div className="stat-header">
            <span className="stat-title">إيرادات الماكينات المحققة</span>
            <span className="badge badge-orange">💵 إنتاجية</span>
          </div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            $ {totalAllMachineRevenueUSD.toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>عائد المبيعات المتولد من تشغيل الطابعات والمكابس</span>
          </div>
        </div>
      </div>

      {/* Production Machines Performance Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-dark)' }}>
              🖨️ عدادات وأداء ماكينات الطباعة والإنتاج
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              تتبّع دقيق لكل ماكينة: كم مرة طُبعت عليها، كمية القطع المنتجة، وإجمالي الإيراد ونسبة تغطية التكلفة
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {assets.map(ast => {
            const perf = getAssetPerformance(ast);
            const isDtf = ast.productionSourceKey === 'dtf';
            const isUv = ast.productionSourceKey === 'uv';
            const isLaser = ast.productionSourceKey === 'laser' || ast.category === 'laser';
            const isPress = ast.productionSourceKey === 'press';
            const isRegularPrint = ast.productionSourceKey === 'regular_print';

            const cardBorder = isDtf ? '#a7f3d0' : isUv ? '#ddd6fe' : isLaser ? '#fde68a' : isPress ? '#fecaca' : isRegularPrint ? '#bae6fd' : '#e2e8f0';
            const cardBg = isDtf ? '#f0fdf4' : isUv ? '#faf5ff' : isLaser ? '#fffbeb' : isPress ? '#fef2f2' : isRegularPrint ? '#f0f9ff' : '#ffffff';
            const titleColor = isDtf ? '#047857' : isUv ? '#6d28d9' : isLaser ? '#b45309' : isPress ? '#b91c1c' : isRegularPrint ? '#0369a1' : '#334155';
            const icon = isDtf ? '👕' : isUv ? '🖨️' : isLaser ? '⚡' : isPress ? '♨️' : isRegularPrint ? '📄' : '⚙️';

            return (
              <div 
                key={ast.id}
                style={{
                  backgroundColor: cardBg,
                  border: `2px solid ${cardBorder}`,
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <div>
                  {/* Top Header of Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: titleColor }}>
                          {ast.name}
                        </h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          <span>كود: {ast.code}</span> • <span>شراء: {ast.purchaseDate}</span>
                        </div>
                      </div>
                    </div>
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: ast.status === 'active' ? '#dcfce7' : '#fef3c7',
                        color: ast.status === 'active' ? '#15803d' : '#b45309',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}
                    >
                      {ast.status === 'active' ? 'جاهزة للعمل ✓' : 'قيد الصيانة ⚠️'}
                    </span>
                  </div>

                  {/* Purchase Cost & Supplier */}
                  <div style={{ padding: '0.6rem 0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: `1px solid ${cardBorder}`, marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>تكلفة الشراء: </span>
                      <strong style={{ color: 'var(--text-dark)', fontSize: '0.95rem' }}>$ {ast.purchasePrice.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>المورد: </span>
                      <span style={{ fontWeight: 600 }}>{ast.supplier || 'مطبعة الفؤاد'}</span>
                    </div>
                  </div>

                  {/* Machine Live Production Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        🔢 عداد مرات الطباعة
                      </span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: titleColor }}>
                        {perf.jobsCount}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>عملية مسجلة</span>
                    </div>

                    <div style={{ padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        📦 القطع المطبوعة
                      </span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb' }}>
                        {perf.printedQty}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>قطعة منتجة</span>
                    </div>
                  </div>

                  {/* Revenue Generated & Cost Recovery */}
                  <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>إيرادات الماكينة:</span>
                      <strong style={{ color: '#16a34a', fontSize: '1rem' }}>
                        $ {perf.revenueUSD.toLocaleString()} {perf.revenueSYP > 0 && `+ ${perf.revenueSYP.toLocaleString()} ل.س`}
                      </strong>
                    </div>

                    {ast.purchasePrice > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <span>استرداد قيمة الماكينة (ROI):</span>
                          <strong>{perf.costRecoveryUSD}%</strong>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${perf.costRecoveryUSD}%`, 
                              height: '100%', 
                              backgroundColor: perf.costRecoveryUSD >= 100 ? '#16a34a' : titleColor,
                              transition: 'width 0.3s ease'
                            }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', borderTop: `1px solid ${cardBorder}`, paddingTop: '0.75rem' }}>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => openEditModal(ast)}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    ✏️ تعديل الأصل
                  </button>
                  {ast.productionSourceKey && onNavigateToSalesWithSource && (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => onNavigateToSalesWithSource(ast.productionSourceKey!)}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', fontWeight: 700 }}
                    >
                      🛒 بيع بواسطة هذه الماكينة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Table */}
      <div className="table-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>الفئة:</span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button 
                className={`btn btn-sm ${filterCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => setFilterCategory('all')}
              >
                الكل ({assets.length})
              </button>
              <button 
                className={`btn btn-sm ${filterCategory === 'printers' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => setFilterCategory('printers')}
              >
                🖨️ طابعات رقمية
              </button>
              <button 
                className={`btn btn-sm ${filterCategory === 'heat_press' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => setFilterCategory('heat_press')}
              >
                ♨️ مكابس حرارية
              </button>
              <button 
                className={`btn btn-sm ${filterCategory === 'laser' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => setFilterCategory('laser')}
              >
                ⚡ ماكينات ليزر
              </button>
              <button 
                className={`btn btn-sm ${filterCategory === 'equipment' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => setFilterCategory('equipment')}
              >
                ⚙️ أجهزة ومعدات
              </button>
            </div>
          </div>

          <div style={{ width: '260px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="بحث بالماكينة، الكود، المورد..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>قائمة الأصول والماكينات المسجلة ({filteredAssets.length})</h3>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>كود الأصل</th>
                <th>اسم الماكينة / الأصل</th>
                <th style={{ width: '130px', textAlign: 'center' }}>الفئة</th>
                <th>المورد / مصدر الشراء</th>
                <th style={{ width: '100px' }}>تاريخ الشراء</th>
                <th style={{ textAlign: 'left', width: '120px' }}>سعر الشراء</th>
                <th style={{ textAlign: 'center', width: '110px' }}>مرات الطباعة</th>
                <th style={{ textAlign: 'center', width: '100px' }}>الحالة</th>
                <th style={{ textAlign: 'center', width: '110px' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد أصول مطابقة لمعايير البحث. انقر على "+ تسجيل أصل أو ماكينة جديدة" لإضافة أصولك.
                  </td>
                </tr>
              ) : (
                filteredAssets.map(ast => {
                  const perf = getAssetPerformance(ast);
                  const isSyp = ast.currency === 'SYP';
                  const sym = ast.currencySymbol || (isSyp ? 'ل.س' : '$');

                  return (
                    <tr key={ast.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>
                        {ast.code}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {ast.name}
                        {ast.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ast.description}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                          {ast.category === 'printers' ? '🖨️ طابعات' :
                           ast.category === 'heat_press' ? '♨️ مكابس' :
                           ast.category === 'equipment' ? '⚙️ معدات' : '📦 أخرى'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{ast.supplier || 'غير محدد'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{ast.purchaseDate}</td>
                      <td style={{ textAlign: 'left', fontWeight: 800 }}>
                        {sym} {ast.purchasePrice.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.8rem' }}>
                          {perf.jobsCount} عملية
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: ast.status === 'active' ? '#dcfce7' : '#fef3c7',
                            color: ast.status === 'active' ? '#15803d' : '#b45309'
                          }}
                        >
                          {ast.status === 'active' ? 'نشط ✓' : 'صيانة'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-sm btn-outline" 
                            title="تعديل"
                            onClick={() => openEditModal(ast)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn btn-sm btn-outline" 
                            style={{ color: 'var(--danger-color)', borderColor: '#fecaca' }}
                            title="حذف"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف الأصل ${ast.name} (${ast.code})؟`)) {
                                deleteAsset(ast.id);
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

      {/* Add / Edit Asset Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{editingAsset ? '✏️' : '➕'}</span>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {editingAsset ? 'تعديل بيانات الأصل / الماكينة' : 'تسجيل أصل أو ماكينة طباعة جديدة'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    تسجيل الماكينات ومتابعة استهلاكها وإحصاء عدد مرات الطباعة
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">اسم الأصل أو الماكينة *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="مثال: طابعة ألبسة DTF، مكبس حراري 8*1، ماكينة UV..." 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">كود الأصل (رمز تعريفي)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="AST-101" 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">فئة الأصل *</label>
                    <select 
                      className="form-select" 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value as any)}
                    >
                      <option value="printers">🖨️ طابعات رقمية ومكتبية (DTF / UV / عادية)</option>
                      <option value="laser">⚡ ماكينات ليزر وقص ونقش</option>
                      <option value="heat_press">♨️ مكابس حرارية وتثبيت</option>
                      <option value="equipment">⚙️ أجهزة ومعدات ورشة مساندة</option>
                      <option value="other">📦 أصول ومعدات أخرى</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">بند ومصدر التنفيذ المرتبط عند البيع *</label>
                    <select 
                      className="form-select" 
                      value={productionSourceKey} 
                      onChange={(e) => setProductionSourceKey(e.target.value as any)}
                    >
                      <option value="dtf">👕 ماكينة الـ DTF (طباعة ألبسة وأقمشة)</option>
                      <option value="uv">🖨️ ماكينة الـ UV (طباعة مسطحة وأسطح صلبة)</option>
                      <option value="laser">⚡ ماكينة ليزر صغيرة (قص ونقش وحفر)</option>
                      <option value="press">♨️ مكبس حراري 8*1</option>
                      <option value="regular_print">📄 طابعة عادية (طباعة ورق ومستندات)</option>
                      <option value="general">📦 عام / بدون طباعة</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">سعر وتكلفة الشراء *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      className="form-input" 
                      required 
                      placeholder="0.00" 
                      value={purchasePrice} 
                      onChange={(e) => setPurchasePrice(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">عملة الشراء *</label>
                    <select 
                      className="form-select" 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value as any)}
                    >
                      <option value="USD">💵 دولار أمريكي ($)</option>
                      <option value="SYP">🇸🇾 ليرة سورية (ل.س)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ الشراء أو التوريد *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={purchaseDate} 
                      onChange={(e) => setPurchaseDate(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">المورد أو البائع</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="مثال: مطبعة الفؤاد، سرمدا، باب الهوى..." 
                      value={supplier} 
                      onChange={(e) => setSupplier(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم فاتورة الشراء أو السند</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="INV/2026/01017" 
                      value={invoiceRef} 
                      onChange={(e) => setInvoiceRef(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">حالة الماكينة *</label>
                    <select 
                      className="form-select" 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value as any)}
                    >
                      <option value="active">🟢 تعمل بكفاءة وجاهزة للإنتاج</option>
                      <option value="maintenance">🟡 قيد الصيانة أو استبدال قطع</option>
                      <option value="standby">⚪ في وضع الاستعداد الاحتياطي</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">المواصفات والوصف الفني</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="مثال: رأسي طباعة XP 600، عرض طباعة 60 سم، فرن تسخين مدمج..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات إضافية (ضمان، صيانة دورية، قطع غيار...)</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2} 
                    placeholder="أي تعليمات أو ملاحظات إضافية..." 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.6rem', fontWeight: 800 }}>
                  💾 حفظ بيانات الأصل والماكينة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
