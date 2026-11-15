import React, { useState } from 'react';
import type { Product, Currency, ExpensePayer } from '../types/accounting';

interface LandedCostCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  defaultCurrency?: Currency;
  onSaveProduct: (productData: Omit<Product, 'id' | 'createdAt'>) => void;
}

export const LandedCostCalculatorModal: React.FC<LandedCostCalculatorModalProps> = ({
  isOpen,
  onClose,
  categories,
  defaultCurrency = 'USD',
  onSaveProduct,
}) => {
  // Mode: package / carton or unit
  const [mode, setMode] = useState<'package' | 'unit'>('package');

  // Product info
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState(categories[0] || 'بضائع عامة');
  const [unit, setUnit] = useState('قطعة');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [paidBy, setPaidBy] = useState<ExpensePayer>('abc');

  // Package mode inputs
  const [packageUnits, setPackageUnits] = useState('50'); // عدد القطع بالكرتونة
  const [packageCost, setPackageCost] = useState('100'); // سعر الكرتونة

  // Unit mode inputs
  const [unitQty, setUnitQty] = useState('10');
  const [unitBuyPrice, setUnitBuyPrice] = useState('2.00');

  // Overhead & Shipping
  const [shippingCost, setShippingCost] = useState('10'); // مصاريف شحن ونقل إضافية

  // Profit target
  const [targetMargin, setTargetMargin] = useState('40'); // %
  const [customSellingPrice, setCustomSellingPrice] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const currSym = currency === 'SYP' ? 'ل.س' : '$';

  // Computations
  const totalUnits = mode === 'package' ? (parseFloat(packageUnits) || 1) : (parseFloat(unitQty) || 1);
  const basePurchaseTotal = mode === 'package' 
    ? (parseFloat(packageCost) || 0) 
    : (totalUnits * (parseFloat(unitBuyPrice) || 0));
  
  const shippingTotal = parseFloat(shippingCost) || 0;
  const totalLandedCapital = basePurchaseTotal + shippingTotal;
  
  // Landed cost per unit (الكلفة الواقفة للقطعة الواحدة)
  const landedUnitCost = totalUnits > 0 ? (totalLandedCapital / totalUnits) : 0;
  const shippingPerUnit = totalUnits > 0 ? (shippingTotal / totalUnits) : 0;
  const baseUnitCost = totalUnits > 0 ? (basePurchaseTotal / totalUnits) : 0;

  // Selling price & profit
  const marginNum = parseFloat(targetMargin) || 0;
  const autoCalculatedSell = landedUnitCost * (1 + marginNum / 100);
  const finalSellPrice = customSellingPrice !== '' ? (parseFloat(customSellingPrice) || 0) : autoCalculatedSell;
  
  const unitProfit = finalSellPrice - landedUnitCost;
  const effectiveMargin = landedUnitCost > 0 ? (unitProfit / landedUnitCost) * 100 : 0;
  const totalPotentialProfit = unitProfit * totalUnits;

  const handleApplyMargin = (pct: number) => {
    setTargetMargin(String(pct));
    setCustomSellingPrice('');
  };

  const handleSaveToStock = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = productName.trim() || `صنف جديد (${category})`;

    onSaveProduct({
      name: finalName,
      code: `PRD-${Math.floor(100 + Math.random() * 900)}`,
      category,
      unit,
      currency,
      currencySymbol: currSym,
      costPrice: Math.round(landedUnitCost * 100) / 100,
      sellingPrice: Math.round(finalSellPrice * 100) / 100,
      quantity: totalUnits,
      minQuantityAlert: 5,
      paidBy,
      packageQuantity: mode === 'package' ? parseFloat(packageUnits) || undefined : undefined,
      packagePrice: mode === 'package' ? parseFloat(packageCost) || undefined : undefined,
      shippingCost: shippingTotal > 0 ? Math.round(shippingPerUnit * 100) / 100 : undefined,
      notes: `حاسبة التكلفة الواقفة: شراء ${currSym}${basePurchaseTotal} + شحن ${currSym}${shippingTotal} = إجمالي ${currSym}${totalLandedCapital}`
    });

    setSuccessMessage(`✓ تمت إضافة "${finalName}" بنجاح إلى المخزن برصيد ${totalUnits} ${unit} وتكلفة واقفة ${currSym} ${landedUnitCost.toFixed(2)}!`);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1800);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg" style={{ maxWidth: '820px', maxHeight: '92vh', overflowY: 'auto' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🧮</span>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.2rem' }}>
                حاسبة كلفة البضاعة الواقفة والتسعير الذكي
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                احسب بدقة كم متوقفة عليك البضاعة بالكرتونة والشحن، وحدد سعر البيع وهامش الربح وأدرجها بالمخزن فوراً
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {successMessage ? (
          <div style={{
            margin: '2rem 1.5rem',
            padding: '1.5rem',
            backgroundColor: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#166534'
          }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 0.5rem' }}>تم الترحيل للمخزن بنجاح!</h4>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSaveToStock}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '1rem' }}>
              
              {/* 1. Mode Switcher (Package vs Unit) */}
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1'
              }}>
                <label className="form-label" style={{ fontWeight: 800, color: '#334155', marginBottom: '0.5rem' }}>
                  طريقة شراء وتوريد البضاعة:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setMode('package')}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: mode === 'package' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                      backgroundColor: mode === 'package' ? '#eff6ff' : '#ffffff',
                      color: mode === 'package' ? '#1d4ed8' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>📦</span> شراء بالكرتونة / العبوة / الشروة (جملة)
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('unit')}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: mode === 'unit' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                      backgroundColor: mode === 'unit' ? '#eff6ff' : '#ffffff',
                      color: mode === 'unit' ? '#1d4ed8' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🏷️</span> شراء بالقطعة الفردية (مفرد)
                  </button>
                </div>
              </div>

              {/* 2. Purchase Cost & Quantities Grid */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#fffbeb',
                borderRadius: '10px',
                border: '1.5px solid #fde68a'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>💰</span> بيانات الشراء الأساسية ومصاريف الوصول:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  {mode === 'package' ? (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, color: '#78350f' }}>
                          عدد القطع داخل الكرتونة *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          className="form-input"
                          required
                          value={packageUnits}
                          onChange={(e) => setPackageUnits(e.target.value)}
                          placeholder="50"
                          style={{ fontWeight: 800, textAlign: 'center', fontSize: '1.05rem', backgroundColor: '#ffffff' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '3px', display: 'block' }}>
                          كم حبة في العبوة؟
                        </span>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, color: '#78350f' }}>
                          سعر شراء الكرتونة بالكامل ({currSym}) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input"
                          required
                          value={packageCost}
                          onChange={(e) => setPackageCost(e.target.value)}
                          placeholder="100.00"
                          style={{ fontWeight: 900, fontSize: '1.05rem', backgroundColor: '#ffffff', color: '#92400e' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '3px', display: 'block' }}>
                          سعر فاتورة العبوة
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, color: '#78350f' }}>
                          الكمية المشتراة (عدد القطع) *
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          className="form-input"
                          required
                          value={unitQty}
                          onChange={(e) => setUnitQty(e.target.value)}
                          placeholder="10"
                          style={{ fontWeight: 800, textAlign: 'center', fontSize: '1.05rem', backgroundColor: '#ffffff' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '3px', display: 'block' }}>
                          إجمالي الوحدات
                        </span>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, color: '#78350f' }}>
                          سعر شراء القطعة الواحدة ({currSym}) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-input"
                          required
                          value={unitBuyPrice}
                          onChange={(e) => setUnitBuyPrice(e.target.value)}
                          placeholder="2.00"
                          style={{ fontWeight: 900, fontSize: '1.05rem', backgroundColor: '#ffffff', color: '#92400e' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '3px', display: 'block' }}>
                          سعر الشراء الفردي
                        </span>
                      </div>
                    </>
                  )}

                  {/* Shipping Overhead */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#78350f' }}>
                      أجور شحن ونقل إضافية ({currSym})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value)}
                      placeholder="0.00"
                      style={{ fontWeight: 800, fontSize: '1.05rem', backgroundColor: '#ffffff' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '3px', display: 'block' }}>
                      شحن، جمارك، عتالة، تحويل
                    </span>
                  </div>

                  {/* Currency */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#78350f' }}>
                      عملة التسعير *
                    </label>
                    <select
                      className="form-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                      style={{ fontWeight: 800, height: '42px', backgroundColor: '#ffffff' }}
                    >
                      <option value="USD">💵 دولار أمريكي ($)</option>
                      <option value="SYP">🇸🇾 ليرة سورية (ل.س)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Product Details to save */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📦</span> بيانات الصنف المراد حفظه في المخزن:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '0.85rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">اسم البضاعة أو الصنف *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="مثال: لوح بلكسي حليبي 20×15، قاعدة علم فضية..."
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">التصنيف *</label>
                    <input
                      type="text"
                      list="calc-categories-datalist"
                      className="form-input"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                    <datalist id="calc-categories-datalist">
                      {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">وحدة القياس</label>
                    <select
                      className="form-select"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <option value="قطعة">قطعة</option>
                      <option value="كرتونة">كرتونة</option>
                      <option value="رول">رول</option>
                      <option value="لوح">لوح</option>
                      <option value="علبة">علبة</option>
                      <option value="طرد">طرد</option>
                    </select>
                  </div>
                </div>

                {/* Who paid */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>من دفع تكلفة الشراء؟ *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaidBy('abc')}
                      style={{
                        padding: '0.45rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: paidBy === 'abc' ? '2px solid #475569' : '1px solid #cbd5e1',
                        backgroundColor: paidBy === 'abc' ? '#f1f5f9' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: '#334155'
                      }}
                    >
                      🏢 صندوق الشركة
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidBy('amjad')}
                      style={{
                        padding: '0.45rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: paidBy === 'amjad' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: paidBy === 'amjad' ? '#eff6ff' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: '#1d4ed8'
                      }}
                    >
                      👤 الشريك أمجد
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidBy('nour')}
                      style={{
                        padding: '0.45rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: paidBy === 'nour' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        backgroundColor: paidBy === 'nour' ? '#f0fdf4' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: '#15803d'
                      }}
                    >
                      👤 الشريك نور
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Target Margin & Selling Price Assistant */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#eff6ff',
                borderRadius: '10px',
                border: '1.5px solid #bfdbfe'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🎯 تحديد هامش الربح وسعر البيع المقترح:</span>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                    اختر نسبة الربح المطلوبة وسيحسب النظام سعر البيع بدقة
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e3a8a' }}>نسب أرباح سريعة:</span>
                  {[20, 30, 40, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyMargin(pct)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: targetMargin === String(pct) && customSellingPrice === '' ? '2px solid #2563eb' : '1px solid #93c5fd',
                        backgroundColor: targetMargin === String(pct) && customSellingPrice === '' ? '#2563eb' : '#ffffff',
                        color: targetMargin === String(pct) && customSellingPrice === '' ? '#ffffff' : '#1d4ed8'
                      }}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#1e40af' }}>
                      نسبة هامش الربح المستهدفة (%)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      value={targetMargin}
                      onChange={(e) => {
                        setTargetMargin(e.target.value);
                        setCustomSellingPrice('');
                      }}
                      placeholder="40"
                      style={{ fontWeight: 800, fontSize: '1.05rem', backgroundColor: '#ffffff' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#1e40af' }}>
                      أو سعر بيع مخصص للقطعة ({currSym})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      value={customSellingPrice}
                      onChange={(e) => setCustomSellingPrice(e.target.value)}
                      placeholder={autoCalculatedSell > 0 ? autoCalculatedSell.toFixed(2) : '0.00'}
                      style={{ fontWeight: 800, fontSize: '1.05rem', backgroundColor: '#ffffff', color: '#1e40af' }}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Live Synthesis Results Board */}
              <div style={{
                padding: '1.25rem',
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📊 النتيجة المالية الشاملة (كلفة البضاعة الواقفة والأرباح):
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  
                  {/* Landed unit cost */}
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block' }}>💼 الكلفة الواقفة للقطعة:</span>
                    <strong style={{ fontSize: '1.35rem', color: '#fbbf24', display: 'block', marginTop: '2px' }}>
                      {currSym} {landedUnitCost.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      (شراء: {baseUnitCost.toFixed(2)} + شحن: {shippingPerUnit.toFixed(2)})
                    </span>
                  </div>

                  {/* Selling price */}
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block' }}>🏷️ سعر البيع المقترح:</span>
                    <strong style={{ fontSize: '1.35rem', color: '#38bdf8', display: 'block', marginTop: '2px' }}>
                      {currSym} {finalSellPrice.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      هامش الربح: {Math.round(effectiveMargin)}%
                    </span>
                  </div>

                  {/* Unit profit */}
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block' }}>📈 صافي ربح القطعة:</span>
                    <strong style={{ fontSize: '1.35rem', color: unitProfit >= 0 ? '#4ade80' : '#f87171', display: 'block', marginTop: '2px' }}>
                      {unitProfit >= 0 ? '+' : ''}{currSym} {unitProfit.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      لكل 1 {unit}
                    </span>
                  </div>

                  {/* Total frozen capital */}
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block' }}>💰 إجمالي رأس المال:</span>
                    <strong style={{ fontSize: '1.35rem', color: '#e2e8f0', display: 'block', marginTop: '2px' }}>
                      {currSym} {totalLandedCapital.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      لإجمالي {totalUnits} {unit}
                    </span>
                  </div>

                  {/* Total potential profit */}
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'block' }}>🚀 الأرباح المتوقعة:</span>
                    <strong style={{ fontSize: '1.35rem', color: '#4ade80', display: 'block', marginTop: '2px' }}>
                      +{currSym} {totalPotentialProfit.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      عند بيع كامل الكمية
                    </span>
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                إلغاء
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ 
                  fontWeight: 900, 
                  backgroundColor: '#059669', 
                  borderColor: '#059669',
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>📥</span> حفظ وإدراج في المخزن مباشرة
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
