import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Invoice, Quotation, ProductionSource } from '../types/accounting';
import { InvoicePrintModal } from './InvoicePrintModal';
import { QuotationPrintModal } from './QuotationPrintModal';

interface ExternalSourcesViewProps {
  onNavigateToSalesWithSource?: (source: ProductionSource) => void;
  onNavigateToQuotations?: () => void;
  onNavigateToInvoices?: () => void;
}

export const ExternalSourcesView: React.FC<ExternalSourcesViewProps> = ({
  onNavigateToSalesWithSource,
  onNavigateToQuotations,
  onNavigateToInvoices
}) => {
  const { 
    invoices, 
    contacts, 
    accounts,
    addInvoice, 
    addExpense,
    addQuotation, 
    addContact 
  } = useAccounting();

  // Exchange Rate resolution (supports 141.5 shorthand -> 14,150 SYP / $)
  const [exchangeRateInput, setExchangeRateInput] = useState<string>(() => {
    return localStorage.getItem('last_dollar_rate') || '14150';
  });

  const effectiveRate = useMemo(() => {
    let r = parseFloat(exchangeRateInput) || 14150;
    if (r < 500) r = r * 100;
    return r;
  }, [exchangeRateInput]);

  const handleRateChange = (val: string) => {
    setExchangeRateInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const full = num < 500 ? num * 100 : num;
      localStorage.setItem('last_dollar_rate', String(full));
    }
  };

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<'flex' | 'led' | 'orders'>('flex');

  // Customer info for instant invoice/quote modal
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionModalMode, setActionModalMode] = useState<'invoice' | 'quotation'>('invoice');
  const [actionSourceType, setActionSourceType] = useState<'flex' | 'led'>('flex');

  // Print Modals
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [printingQuotation, setPrintingQuotation] = useState<Quotation | null>(null);

  // -------------------------------------------------------------
  // 1. FLEX 190 STATE & CALCULATOR
  // -------------------------------------------------------------
  // Roll width is permanently 190 cm (1.90 m)
  const FLEX_ROLL_WIDTH_M = 1.90;
  
  const [flexCalcMode, setFlexCalcMode] = useState<'dimensions' | 'linear'>('dimensions');
  const [flexWidthCm, setFlexWidthCm] = useState<number>(300);
  const [flexHeightCm, setFlexHeightCm] = useState<number>(190);
  const [flexQuantity, setFlexQuantity] = useState<number>(1);
  const [flexLinearMeters, setFlexLinearMeters] = useState<number>(5);

  // Supplier: مطبعة القاضي أو مطبعة الشام
  const [flexSupplier, setFlexSupplier] = useState<'مطبعة القاضي' | 'مطبعة الشام' | string>('مطبعة القاضي');
  const [customFlexSupplier, setCustomFlexSupplier] = useState<string>('');

  // Cost: $2.5 per m² / meter (رأس مال)
  const [flexCostPerM2, setFlexCostPerM2] = useState<number>(2.5);

  // Finishing & Extras
  const [hasEyelets, setHasEyelets] = useState<boolean>(true);
  const [eyeletSpacingCm] = useState<number>(50);
  const [eyeletPricePerUnit, setEyeletPricePerUnit] = useState<number>(0.15); // $0.15 per ring

  const [hasIronFrame, setHasIronFrame] = useState<boolean>(false);
  const [ironFramePricePerM, setIronFramePricePerM] = useState<number>(8.0); // $8 per perimeter meter

  const [hasInstallation, setHasInstallation] = useState<boolean>(false);
  const [installationCost, setInstallationCost] = useState<number>(15.0); // $15 flat

  // Profit Margin
  const [flexProfitPct, setFlexProfitPct] = useState<number>(40);
  const [flexProfitFixed, setFlexProfitFixed] = useState<string>('');

  // Flex Math Calculations
  const flexCalculations = useMemo(() => {
    let areaM2 = 0;
    let perimeterM = 0;
    let desc = '';

    if (flexCalcMode === 'dimensions') {
      const wM = (flexWidthCm || 0) / 100;
      const hM = (flexHeightCm || 0) / 100;
      const qty = flexQuantity || 1;
      areaM2 = wM * hM * qty;
      perimeterM = 2 * (wM + hM) * qty;
      desc = `طباعة فلكس 190 (${flexWidthCm}×${flexHeightCm} سم) - عدد ${qty}`;
    } else {
      const lm = flexLinearMeters || 1;
      areaM2 = lm * FLEX_ROLL_WIDTH_M;
      perimeterM = 2 * (lm + FLEX_ROLL_WIDTH_M);
      desc = `طباعة فلكس 190 بالمتر الجر (${lm} متر طولي × عرض 1.90م)`;
    }

    // Material & Print Base Cost
    const baseMaterialCost = areaM2 * (flexCostPerM2 || 2.5);

    // Finishing Cost
    let eyeletCount = 0;
    let eyeletTotalCost = 0;
    if (hasEyelets && perimeterM > 0) {
      eyeletCount = Math.max(4, Math.round((perimeterM * 100) / (eyeletSpacingCm || 50)));
      eyeletTotalCost = eyeletCount * (eyeletPricePerUnit || 0.15);
    }

    const frameTotalCost = hasIronFrame ? perimeterM * (ironFramePricePerM || 8.0) : 0;
    const installCost = hasInstallation ? (installationCost || 0) : 0;

    const totalCostUsd = baseMaterialCost + eyeletTotalCost + frameTotalCost + installCost;
    const totalCostSyp = totalCostUsd * effectiveRate;

    // Selling Price
    let salePriceUsd = 0;
    const fixedNum = parseFloat(flexProfitFixed);
    if (!isNaN(fixedNum) && fixedNum > 0) {
      salePriceUsd = totalCostUsd + fixedNum;
    } else {
      salePriceUsd = totalCostUsd * (1 + (flexProfitPct || 40) / 100);
    }

    const salePriceSyp = salePriceUsd * effectiveRate;
    const netProfitUsd = salePriceUsd - totalCostUsd;
    const netProfitSyp = netProfitUsd * effectiveRate;
    const salePerM2Usd = areaM2 > 0 ? (salePriceUsd / areaM2) : 0;

    return {
      areaM2,
      perimeterM,
      desc,
      baseMaterialCost,
      eyeletCount,
      eyeletTotalCost,
      frameTotalCost,
      installCost,
      totalCostUsd,
      totalCostSyp,
      salePriceUsd,
      salePriceSyp,
      netProfitUsd,
      netProfitSyp,
      salePerM2Usd
    };
  }, [
    flexCalcMode, flexWidthCm, flexHeightCm, flexQuantity, flexLinearMeters,
    flexCostPerM2, hasEyelets, eyeletSpacingCm, eyeletPricePerUnit,
    hasIronFrame, ironFramePricePerM, hasInstallation, installationCost,
    flexProfitPct, flexProfitFixed, effectiveRate
  ]);

  // -------------------------------------------------------------
  // 2. LED DISPLAY SCREENS (P10) STATE & CALCULATOR
  // -------------------------------------------------------------
  // Standard P10 Module Specs: 32 cm width, 16 cm height, $16.50 cost
  const MODULE_WIDTH_CM = 32;
  const MODULE_HEIGHT_CM = 16;
  const MODULE_PIXELS_X = 32;
  const MODULE_PIXELS_Y = 16;
  const DEFAULT_MODULE_PRICE = 16.5;

  // Selected Modules count
  const [ledModulesX, setLedModulesX] = useState<number>(4); // default 4 * 32 = 128 cm
  const [ledModulesY, setLedModulesY] = useState<number>(2); // default 2 * 16 = 32 cm
  const [ledColor, setLedColor] = useState<'red' | 'green'>('red'); // أحمر أو أخضر
  const [ledModulePrice, setLedModulePrice] = useState<number>(DEFAULT_MODULE_PRICE);

  // System Components Costs
  const [ledPowerSupplyPrice, setLedPowerSupplyPrice] = useState<number>(10.0); // $10 per 5V 40A
  const [ledControlCardPrice, setLedControlCardPrice] = useState<number>(15.0); // $15 Wi-Fi / USB
  const [ledFramePricePerM, setLedFramePricePerM] = useState<number>(8.0); // $8 per perimeter meter
  const [ledAssemblyLabor, setLedAssemblyLabor] = useState<number>(15.0); // Cables, waterproofing, labor

  // Profit Margin
  const [ledProfitPct, setLedProfitPct] = useState<number>(35);
  const [ledProfitFixed, setLedProfitFixed] = useState<string>('');

  // Popular LED Screen Presets
  const popularLedPresets = [
    { label: '96 × 32 سم (6 شرائح)', x: 3, y: 2, tag: 'فوق الباب والمحلات الصغيرة' },
    { label: '128 × 32 سم (8 شرائح)', x: 4, y: 2, tag: 'المقاس الأكثر طلباً بالسوق' },
    { label: '160 × 32 سم (10 شرائح)', x: 5, y: 2, tag: 'واجهة واضحة لافتة' },
    { label: '192 × 32 سم (12 شريحة)', x: 6, y: 2, tag: 'شريط عريض طويل' },
    { label: '96 × 48 سم (9 شرائح)', x: 3, y: 3, tag: 'مربعة مدمجة 3 أسطر' },
    { label: '128 × 48 سم (12 شريحة)', x: 4, y: 3, tag: 'ارتفاع ممتاز متعدد الأسطر' },
    { label: '160 × 48 سم (15 شريحة)', x: 5, y: 3, tag: 'واجهة إعلانية مميزة' },
    { label: '192 × 48 سم (18 شريحة)', x: 6, y: 3, tag: 'حجم متوسط للشركات' },
    { label: '128 × 64 سم (16 شريحة)', x: 4, y: 4, tag: 'شاشة إعلانية ضخمة مربعة' },
    { label: '192 × 64 سم (24 شريحة)', x: 6, y: 4, tag: 'لوحة رئيسية للواجهات' },
    { label: '256 × 64 سم (32 شريحة)', x: 8, y: 4, tag: 'لوحة طرقية ومجمعات' },
    { label: '320 × 96 سم (60 شريحة)', x: 10, y: 6, tag: 'شاشة عملاقة للمستشفيات والمراكز' }
  ];

  // LED Screen Math Calculations
  const ledCalculations = useMemo(() => {
    const totalModules = (ledModulesX || 1) * (ledModulesY || 1);
    const widthCm = (ledModulesX || 1) * MODULE_WIDTH_CM;
    const heightCm = (ledModulesY || 1) * MODULE_HEIGHT_CM;
    const widthM = widthCm / 100;
    const heightM = heightCm / 100;
    const perimeterM = 2 * (widthM + heightM);
    const resolutionX = (ledModulesX || 1) * MODULE_PIXELS_X;
    const resolutionY = (ledModulesY || 1) * MODULE_PIXELS_Y;

    // Power Supplies: 1 power supply per 4 modules
    const powerSuppliesCount = Math.max(1, Math.ceil(totalModules / 4));
    const powerSuppliesCost = powerSuppliesCount * (ledPowerSupplyPrice || 10.0);

    // Modules Cost
    const modulesCost = totalModules * (ledModulePrice || DEFAULT_MODULE_PRICE);

    // Controller Card (1 card)
    const controlCardCost = ledControlCardPrice || 15.0;

    // Aluminum Frame
    const frameCost = perimeterM * (ledFramePricePerM || 8.0);

    // Assembly, Cables & Sealing
    const assemblyCost = ledAssemblyLabor || 15.0;

    // Total Cost
    const totalCostUsd = modulesCost + powerSuppliesCost + controlCardCost + frameCost + assemblyCost;
    const totalCostSyp = totalCostUsd * effectiveRate;

    // Selling Price
    let salePriceUsd = 0;
    const fixedNum = parseFloat(ledProfitFixed);
    if (!isNaN(fixedNum) && fixedNum > 0) {
      salePriceUsd = totalCostUsd + fixedNum;
    } else {
      salePriceUsd = totalCostUsd * (1 + (ledProfitPct || 35) / 100);
    }

    const salePriceSyp = salePriceUsd * effectiveRate;
    const netProfitUsd = salePriceUsd - totalCostUsd;
    const netProfitSyp = netProfitUsd * effectiveRate;

    // Power Wattage estimation (~20W max per P10 module)
    const maxWatts = totalModules * 20;
    const avgWatts = Math.round(maxWatts * 0.45);

    const desc = `شاشة عرض ليد متحركة P10 (${widthCm}×${heightCm} سم) - لون ${ledColor === 'red' ? 'أحمر' : 'أخضر'} - ${totalModules} شريحة`;

    return {
      totalModules,
      widthCm,
      heightCm,
      widthM,
      heightM,
      perimeterM,
      resolutionX,
      resolutionY,
      powerSuppliesCount,
      powerSuppliesCost,
      modulesCost,
      controlCardCost,
      frameCost,
      assemblyCost,
      totalCostUsd,
      totalCostSyp,
      salePriceUsd,
      salePriceSyp,
      netProfitUsd,
      netProfitSyp,
      maxWatts,
      avgWatts,
      desc
    };
  }, [
    ledModulesX, ledModulesY, ledColor, ledModulePrice,
    ledPowerSupplyPrice, ledControlCardPrice, ledFramePricePerM,
    ledAssemblyLabor, ledProfitPct, ledProfitFixed, effectiveRate
  ]);

  // -------------------------------------------------------------
  // 3. EXTERNAL ORDERS STATS & FILTERED LIST
  // -------------------------------------------------------------
  const [ordersFilterSupplier, setOrdersFilterSupplier] = useState<string>('all');
  const [ordersSearch, setOrdersSearch] = useState<string>('');

  const externalInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const isExt = inv.productionSource === 'external' || inv.saleType === 'external';
      if (!isExt) return false;

      if (ordersFilterSupplier !== 'all') {
        const sup = (inv.externalSupplierName || '').trim();
        if (ordersFilterSupplier === 'kadi' && !sup.includes('القاضي')) return false;
        if (ordersFilterSupplier === 'sham' && !sup.includes('الشام')) return false;
        if (ordersFilterSupplier === 'led' && !inv.items.some(it => it.description.includes('ليد') || it.description.includes('LED'))) return false;
        if (ordersFilterSupplier === 'other' && (sup.includes('القاضي') || sup.includes('الشام'))) return false;
      }

      if (ordersSearch.trim()) {
        const q = ordersSearch.toLowerCase();
        const matchesName = (inv.customerName || '').toLowerCase().includes(q);
        const matchesNum = (inv.invoiceNumber || '').toLowerCase().includes(q);
        const matchesItem = inv.items.some(it => it.description.toLowerCase().includes(q));
        const matchesSup = (inv.externalSupplierName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesItem && !matchesSup) return false;
      }

      return true;
    });
  }, [invoices, ordersFilterSupplier, ordersSearch]);

  const externalStats = useMemo(() => {
    let totalSalesUsd = 0;
    let totalCostUsd = 0;
    let count = 0;

    invoices.forEach(inv => {
      const isExt = inv.productionSource === 'external' || inv.saleType === 'external';
      if (!isExt) return;
      count++;
      const sale = inv.currency === 'SYP' ? (inv.totalAmount / (inv.exchangeRate || effectiveRate)) : inv.totalAmount;
      totalSalesUsd += sale;
      const cost = inv.externalCost 
        ? (inv.currency === 'SYP' ? (inv.externalCost / (inv.exchangeRate || effectiveRate)) : inv.externalCost)
        : (sale * 0.65);
      totalCostUsd += cost;
    });

    const netProfitUsd = totalSalesUsd - totalCostUsd;
    return {
      count,
      totalSalesUsd,
      totalCostUsd,
      netProfitUsd,
      totalSalesSyp: totalSalesUsd * effectiveRate,
      netProfitSyp: netProfitUsd * effectiveRate
    };
  }, [invoices, effectiveRate]);

  // -------------------------------------------------------------
  // ACTIONS: Create Invoice or Quotation directly from calculations
  // -------------------------------------------------------------
  const handleOpenActionModal = (sourceType: 'flex' | 'led', mode: 'invoice' | 'quotation') => {
    setActionSourceType(sourceType);
    setActionModalMode(mode);
    setIsActionModalOpen(true);
  };

  const handleExecuteAction = (e: React.FormEvent) => {
    e.preventDefault();
    const custName = selectedCustomer.trim() || 'زبون نقدي - خارجي';
    const isFlex = actionSourceType === 'flex';
    const calc = isFlex ? flexCalculations : ledCalculations;
    const finalSupplier = isFlex 
      ? (flexSupplier === 'أخرى' ? (customFlexSupplier.trim() || 'مطبعة خارجية') : flexSupplier)
      : 'ورشة تجميع شاشات ليد (ABC)';

    const today = new Date().toISOString().split('T')[0];
    const itemDesc = calc.desc + (orderNotes ? ` - ملاحظات: ${orderNotes}` : '');
    const unitPrice = calc.salePriceUsd;
    const totalAmount = calc.salePriceUsd;
    const extCost = calc.totalCostUsd;

    // Check / Add Contact if new
    const existingContact = contacts.find(c => c.name.toLowerCase() === custName.toLowerCase());
    const custId = existingContact ? existingContact.id : `cust_${Date.now()}`;
    if (!existingContact && custName !== 'زبون نقدي - خارجي') {
      addContact({
        name: custName,
        phone: customerPhone.trim(),
        type: 'customer',
        balance: 0,
        currency: 'USD'
      });
    }

    if (actionModalMode === 'invoice') {
      const invNum = `INV-EXT-${Date.now().toString().slice(-5)}`;
      const newInvoice: Invoice = {
        id: `inv_${Date.now()}`,
        invoiceNumber: invNum,
        customerId: custId,
        customerName: custName,
        date: today,
        dueDate: today,
        currency: 'USD',
        currencySymbol: '$',
        exchangeRate: effectiveRate,
        saleType: 'external',
        productionSource: 'external',
        externalSupplierName: finalSupplier,
        externalCost: extCost,
        externalPaymentMethod: 'cash',
        externalStatus: 'paid',
        status: 'paid',
        paymentMethod: 'cash',
        subtotal: totalAmount,
        taxAmount: 0,
        totalAmount: totalAmount,
        paidAmount: totalAmount,
        notes: `تنفيذ خارجي عبر ${finalSupplier}. ${orderNotes ? `ملاحظات: ${orderNotes}` : ''}${customerPhone ? ` - هاتف: ${customerPhone}` : ''}`,
        createdAt: new Date().toISOString(),
        items: [
          {
            id: `item_ext_${Date.now()}`,
            description: itemDesc,
            quantity: 1,
            unitPrice: unitPrice,
            taxRate: 0,
            total: totalAmount,
            productionSource: 'external'
          }
        ]
      };

      addInvoice(newInvoice);

      // Auto-record purchase/expense bill for the external workshop
      const outsourceAcc = accounts.find(a => a.id === 'acc_5150' || a.name.includes('خارجية')) || accounts[0];
      if (outsourceAcc && extCost > 0) {
        addExpense({
          billNumber: `EXP-OUT-${Date.now().toString().slice(-5)}`,
          vendorName: finalSupplier,
          accountId: outsourceAcc.id,
          amount: extCost,
          taxAmount: 0,
          date: today,
          currency: 'USD',
          currencySymbol: '$',
          exchangeRate: effectiveRate,
          paymentMethod: 'cash',
          status: 'paid',
          notes: `تكلفة تنفيذ خارجي للفاتورة ${invNum} (${itemDesc}) لدى ${finalSupplier}`
        });
      }

      setIsActionModalOpen(false);
      setPrintingInvoice(newInvoice);
    } else {
      // Create Quotation
      const quoteNum = `QUO-EXT-${Date.now().toString().slice(-5)}`;
      const newQuote = addQuotation({
        quotationNumber: quoteNum,
        customerName: custName,
        customerPhone: customerPhone.trim(),
        date: today,
        validUntil: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
        currency: 'USD',
        currencySymbol: '$',
        exchangeRate: effectiveRate,
        status: 'draft',
        items: [
          {
            id: `q_item_${Date.now()}`,
            description: itemDesc,
            quantity: 1,
            unitPrice: unitPrice,
            taxRate: 0,
            total: totalAmount,
            productionSource: 'external'
          }
        ],
        subtotal: totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: totalAmount,
        notes: `عرض سعر رسمي - صلاحية العرض 14 يوماً. المواصفات: ${isFlex ? 'خامة فلكس 190 سم أصلية' : `شاشة ليد P10 لون ${ledColor === 'red' ? 'أحمر' : 'أخضر'} مقاومة للعوامل الجوية`}`
      });

      setIsActionModalOpen(false);
      setPrintingQuotation(newQuote);
    }
  };

  return (
    <div className="external-sources-view">
      {/* 1. Header & Quick Switchers */}
      <div className="view-header flex jb ai-center" style={{ flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <div className="flex ai-center gap-10">
            <span style={{ fontSize: '1.8rem' }}>🌐</span>
            <div>
              <h1 className="view-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                مصادر خارجية وتنفيذ خارجي (Outsource)
              </h1>
              <p className="view-subtitle" style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                حاسبة دقيقة لطباعة الفلكس 190 (مطبعة القاضي / مطبعة الشام) وشاشات عرض ليد P10 مع الربط المحاسبي
              </p>
            </div>
          </div>
        </div>

        {/* Currency & Market Rate Badge */}
        <div className="flex ai-center gap-12">
          <div style={{
            background: 'linear-gradient(135deg, #fffdf2 0%, #fff9db 100%)',
            border: '1.5px solid #ffd43b',
            borderRadius: '10px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 8px rgba(245,159,0,0.1)'
          }}>
            <span style={{ fontSize: '1.2rem' }}>💵</span>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b03a0a' }}>سعر الصرف المعتمد للعمليات</div>
              <div className="flex ai-center gap-6" style={{ marginTop: '2px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1a1d2e', direction: 'ltr' }}>1$ =</span>
                <input
                  type="text"
                  value={exchangeRateInput}
                  onChange={(e) => handleRateChange(e.target.value)}
                  style={{
                    width: '90px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid #fab005',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    background: '#ffffff'
                  }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#b03a0a' }}>ل.س</span>
              </div>
            </div>
          </div>

          {onNavigateToSalesWithSource && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onNavigateToSalesWithSource('external')}
              style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🛒</span>
              <span>شاشة المبيعات العامة</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '22px'
      }}>
        <div className="metric-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div className="flex jb ai-center">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>إجمالي مبيعات الخارجي</span>
            <span style={{ fontSize: '1.2rem' }}>🛒</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
            $ {externalStats.totalSalesUsd.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', marginTop: '4px' }}>
            {externalStats.totalSalesSyp.toLocaleString()} ل.س
          </div>
        </div>

        <div className="metric-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div className="flex jb ai-center">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>تكلفة الورش والمطابع</span>
            <span style={{ fontSize: '1.2rem' }}>🏭</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626', marginTop: '6px' }}>
            $ {externalStats.totalCostUsd.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>
            رأس المال المدفوع للشركاء
          </div>
        </div>

        <div className="metric-card" style={{ background: '#ffffff', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '16px', backgroundColor: '#f0fdf4' }}>
          <div className="flex jb ai-center">
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534' }}>صافي أرباح الوساطة</span>
            <span style={{ fontSize: '1.2rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a', marginTop: '6px' }}>
            $ {externalStats.netProfitUsd.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
            {externalStats.netProfitSyp.toLocaleString()} ل.س
          </div>
        </div>

        <div className="metric-card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div className="flex jb ai-center">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>عدد الطلبيات المسجلة</span>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#3b82f6', marginTop: '6px' }}>
            {externalStats.count} طلبية
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>
            فلكس وبنرات وشاشات ليد
          </div>
        </div>
      </div>

      {/* 3. Sub-Tabs Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '20px',
        paddingBottom: '2px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveSubTab('flex')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.98rem',
            fontWeight: 800,
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: activeSubTab === 'flex' ? '#ea580c' : '#64748b',
            borderBottom: activeSubTab === 'flex' ? '3px solid #ea580c' : '3px solid transparent',
            backgroundColor: activeSubTab === 'flex' ? '#fff7ed' : 'transparent',
            transition: 'all 0.15s ease'
          }}
        >
          <span>🏷️</span>
          <span>حاسبة طباعة فلكس 190 (القاضي والشام)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('led')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.98rem',
            fontWeight: 800,
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: activeSubTab === 'led' ? '#2563eb' : '#64748b',
            borderBottom: activeSubTab === 'led' ? '3px solid #2563eb' : '3px solid transparent',
            backgroundColor: activeSubTab === 'led' ? '#eff6ff' : 'transparent',
            transition: 'all 0.15s ease'
          }}
        >
          <span>💡</span>
          <span>شاشات عرض ليد (P10 - أحمر / أخضر)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '0.98rem',
            fontWeight: 800,
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: activeSubTab === 'orders' ? '#059669' : '#64748b',
            borderBottom: activeSubTab === 'orders' ? '3px solid #059669' : '3px solid transparent',
            backgroundColor: activeSubTab === 'orders' ? '#ecfdf5' : 'transparent',
            transition: 'all 0.15s ease'
          }}
        >
          <span>📋</span>
          <span>سجل طلبيات ومستحقات الورش ({externalInvoices.length})</span>
        </button>

        {onNavigateToQuotations && (
          <button
            onClick={onNavigateToQuotations}
            style={{
              marginRight: 'auto',
              padding: '6px 14px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📄</span>
            <span>كل عروض الأسعار</span>
          </button>
        )}

        {onNavigateToInvoices && (
          <button
            onClick={onNavigateToInvoices}
            style={{
              padding: '6px 14px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🧾</span>
            <span>كل الفواتير</span>
          </button>
        )}
      </div>

      {/* =========================================================
          SUB-TAB 1: FLEX 190 CALCULATOR
          ========================================================= */}
      {activeSubTab === 'flex' && (
        <div className="flex-calculator-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(320px, 1fr)', gap: '20px' }}>
          
          {/* Left / Main Inputs Card */}
          <div className="card" style={{ background: '#ffffff', border: '1.5px solid #fed7aa', borderRadius: '14px', padding: '22px', boxShadow: '0 4px 15px rgba(234,88,12,0.05)' }}>
            <div className="flex jb ai-center" style={{ borderBottom: '1.5px solid #fed7aa', paddingBottom: '12px', marginBottom: '18px' }}>
              <div className="flex ai-center gap-10">
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900 }}>
                  🏷️
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#9a3412' }}>مواصفات وتكلفة طباعة الفلكس 190</h2>
                  <span style={{ fontSize: '0.78rem', color: '#7c2d12', fontWeight: 600 }}>رول عرض 190 سم جاهز من مطبعة القاضي أو الشام</span>
                </div>
              </div>
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                🔒 عرض الرول: 1.90 م ثابت
              </span>
            </div>

            {/* 1. Supplier Selector */}
            <div style={{ marginBottom: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e', display: 'block', marginBottom: '8px' }}>
                🏭 المطبعة المنفذة (المصدر الخارجي):
              </label>
              <div className="flex gap-10" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFlexSupplier('مطبعة القاضي')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1.5px solid',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    borderColor: flexSupplier === 'مطبعة القاضي' ? '#ea580c' : '#cbd5e1',
                    background: flexSupplier === 'مطبعة القاضي' ? '#ea580c' : '#ffffff',
                    color: flexSupplier === 'مطبعة القاضي' ? '#ffffff' : '#334155'
                  }}
                >
                  🏢 مطبعة القاضي
                </button>

                <button
                  type="button"
                  onClick={() => setFlexSupplier('مطبعة الشام')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1.5px solid',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    borderColor: flexSupplier === 'مطبعة الشام' ? '#ea580c' : '#cbd5e1',
                    background: flexSupplier === 'مطبعة الشام' ? '#ea580c' : '#ffffff',
                    color: flexSupplier === 'مطبعة الشام' ? '#ffffff' : '#334155'
                  }}
                >
                  🏢 مطبعة الشام
                </button>

                <button
                  type="button"
                  onClick={() => setFlexSupplier('أخرى')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1.5px solid',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    borderColor: flexSupplier === 'أخرى' ? '#ea580c' : '#cbd5e1',
                    background: flexSupplier === 'أخرى' ? '#ea580c' : '#ffffff',
                    color: flexSupplier === 'أخرى' ? '#ffffff' : '#334155'
                  }}
                >
                  ➕ ورشة أخرى
                </button>
              </div>

              {flexSupplier === 'أخرى' && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="اكتب اسم الورشة أو المطبعة الخارجية..."
                    value={customFlexSupplier}
                    onChange={(e) => setCustomFlexSupplier(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                  />
                </div>
              )}
            </div>

            {/* 2. Calculation Mode Toggle */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setFlexCalcMode('dimensions')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: flexCalcMode === 'dimensions' ? '#ffffff' : 'transparent',
                    color: flexCalcMode === 'dimensions' ? '#ea580c' : '#64748b',
                    boxShadow: flexCalcMode === 'dimensions' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  📐 حسب أبعاد اللوحة (عرض × ارتفاع)
                </button>
                <button
                  type="button"
                  onClick={() => setFlexCalcMode('linear')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: flexCalcMode === 'linear' ? '#ffffff' : 'transparent',
                    color: flexCalcMode === 'linear' ? '#ea580c' : '#64748b',
                    boxShadow: flexCalcMode === 'linear' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  🎞️ حسب المتر الطولي الجر (رول 190سم)
                </button>
              </div>
            </div>

            {/* 3. Dimension Inputs */}
            {flexCalcMode === 'dimensions' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    العرض (سم)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={flexWidthCm}
                    onChange={(e) => setFlexWidthCm(Math.max(1, parseFloat(e.target.value) || 0))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{(flexWidthCm / 100).toFixed(2)} متر</span>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    الارتفاع (سم)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={flexHeightCm}
                    onChange={(e) => setFlexHeightCm(Math.max(1, parseFloat(e.target.value) || 0))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{(flexHeightCm / 100).toFixed(2)} متر</span>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    الكمية (عدد اللوحات)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={flexQuantity}
                    onChange={(e) => setFlexQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>نسخة</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  عدد الأمتار الطولية الجر (رول 190 سم):
                </label>
                <div className="flex gap-10 ai-center">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    className="form-control"
                    value={flexLinearMeters}
                    onChange={(e) => setFlexLinearMeters(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    style={{ width: '140px', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 800, fontSize: '1.1rem' }}
                  />
                  <span style={{ fontWeight: 800, color: '#475569' }}>متر طولي (جر)</span>
                </div>

                {/* Preset meter buttons */}
                <div className="flex gap-6 mt-8" style={{ flexWrap: 'wrap', marginTop: '8px' }}>
                  {[1, 2, 3, 5, 10, 15, 20, 30, 50].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFlexLinearMeters(m)}
                      style={{
                        padding: '4px 10px',
                        background: flexLinearMeters === m ? '#ea580c' : '#f1f5f9',
                        color: flexLinearMeters === m ? '#ffffff' : '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {m} م
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Base Material Price Input ($2.5 default) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  سعر رأس مال الفلكس والطباعة ($ / م²)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={flexCostPerM2}
                    onChange={(e) => setFlexCostPerM2(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 800 }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '8px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                    $/م² (افتراضي 2.5)
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  المساحة الإجمالية المحسوبة
                </label>
                <div style={{ padding: '8px 12px', background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontWeight: 900, color: '#0f172a' }}>
                  {flexCalculations.areaM2.toFixed(2)} م² (محيط {flexCalculations.perimeterM.toFixed(1)} م)
                </div>
              </div>
            </div>

            {/* 4. Finishing Options */}
            <div style={{ marginBottom: '18px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '10px' }}>
                🪡 خيارات التجهيز والتشطيب:
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Eyelets */}
                <div className="flex ai-center gap-10">
                  <label className="flex ai-center gap-8" style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={hasEyelets}
                      onChange={(e) => setHasEyelets(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>تني ودعس حلقات معدنية داير ما يدور (كل {eyeletSpacingCm} سم)</span>
                  </label>
                  {hasEyelets && (
                    <div className="flex ai-center gap-6" style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800 }}>
                      <span>(+{flexCalculations.eyeletCount} حلقة = ${flexCalculations.eyeletTotalCost.toFixed(2)})</span>
                      <input
                        type="number"
                        step="0.05"
                        value={eyeletPricePerUnit}
                        onChange={(e) => setEyeletPricePerUnit(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        title="سعر الحلقة الواحدة ($)"
                      />
                      <span>$/حلقة</span>
                    </div>
                  )}
                </div>

                {/* Iron Frame */}
                <div className="flex ai-center gap-10">
                  <label className="flex ai-center gap-8" style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={hasIronFrame}
                      onChange={(e) => setHasIronFrame(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>شاسيه حديد / إطار صندوق مع إضاءة</span>
                  </label>
                  {hasIronFrame && (
                    <div className="flex ai-center gap-6" style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800 }}>
                      <span>(+${flexCalculations.frameTotalCost.toFixed(2)})</span>
                      <input
                        type="number"
                        step="1"
                        value={ironFramePricePerM}
                        onChange={(e) => setIronFramePricePerM(parseFloat(e.target.value) || 0)}
                        style={{ width: '55px', padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        title="سعر متر المحيط للشاسيه ($)"
                      />
                      <span>$/متر محيط</span>
                    </div>
                  )}
                </div>

                {/* Installation */}
                <div className="flex ai-center gap-10">
                  <label className="flex ai-center gap-8" style={{ cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={hasInstallation}
                      onChange={(e) => setHasInstallation(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>أجور تركيب ورفع اللوحة في الموقع</span>
                  </label>
                  {hasInstallation && (
                    <div className="flex ai-center gap-6" style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800 }}>
                      <input
                        type="number"
                        step="5"
                        value={installationCost}
                        onChange={(e) => setInstallationCost(parseFloat(e.target.value) || 0)}
                        style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        title="أجور التركيب ($)"
                      />
                      <span>$</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Profit Margin */}
            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '10px', padding: '14px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#9a3412', display: 'block', marginBottom: '8px' }}>
                📈 هامش الربح المطلوب:
              </label>
              <div className="flex gap-12 ai-center">
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: '#7c2d12', fontWeight: 700 }}>نسبة مئوية (%)</span>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={flexProfitPct}
                    onChange={(e) => {
                      setFlexProfitPct(parseFloat(e.target.value) || 0);
                      setFlexProfitFixed('');
                    }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 800 }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: '#7c2d12', fontWeight: 700 }}>أو ربح مقطوع ($)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 20"
                    className="form-control"
                    value={flexProfitFixed}
                    onChange={(e) => {
                      setFlexProfitFixed(e.target.value);
                      if (e.target.value) setFlexProfitPct(0);
                    }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 800 }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right / Pricing & Summary Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{
              background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(15,23,42,0.15)'
            }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  كشف تسعيرة الفلكس 190
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '4px 0 0', color: '#ffffff' }}>
                  {flexSupplier === 'أخرى' ? (customFlexSupplier || 'مطبعة خارجية') : flexSupplier}
                </h3>
              </div>

              {/* Cost breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                <div className="flex jb">
                  <span style={{ color: '#94a3b8' }}>تكلفة الفلكس والطباعة ({flexCalculations.areaM2.toFixed(2)} م²):</span>
                  <strong style={{ color: '#f1f5f9' }}>$ {flexCalculations.baseMaterialCost.toFixed(2)}</strong>
                </div>

                {hasEyelets && (
                  <div className="flex jb">
                    <span style={{ color: '#94a3b8' }}>حلقات التثبيت ({flexCalculations.eyeletCount} حلقة):</span>
                    <strong style={{ color: '#f1f5f9' }}>$ {flexCalculations.eyeletTotalCost.toFixed(2)}</strong>
                  </div>
                )}

                {hasIronFrame && (
                  <div className="flex jb">
                    <span style={{ color: '#94a3b8' }}>شاسيه وإطار حديد:</span>
                    <strong style={{ color: '#f1f5f9' }}>$ {flexCalculations.frameTotalCost.toFixed(2)}</strong>
                  </div>
                )}

                {hasInstallation && (
                  <div className="flex jb">
                    <span style={{ color: '#94a3b8' }}>أجور التركيب الميداني:</span>
                    <strong style={{ color: '#f1f5f9' }}>$ {flexCalculations.installCost.toFixed(2)}</strong>
                  </div>
                )}

                <div className="flex jb" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>إجمالي رأس المال والتكلفة عليك:</span>
                  <strong style={{ color: '#f87171', fontSize: '1.05rem' }}>$ {flexCalculations.totalCostUsd.toFixed(2)}</strong>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.74rem', color: '#94a3b8' }}>
                  ({Math.round(flexCalculations.totalCostSyp).toLocaleString()} ل.س)
                </div>
              </div>

              {/* Sale Price Highlight */}
              <div style={{
                background: 'rgba(249, 115, 22, 0.12)',
                border: '2px solid #f97316',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fdba74' }}>سعر البيع النهائي للزبون</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', margin: '4px 0' }}>
                  $ {flexCalculations.salePriceUsd.toFixed(2)}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>
                  {Math.round(flexCalculations.salePriceSyp).toLocaleString()} ل.س
                </div>
                <div style={{ fontSize: '0.72rem', color: '#fed7aa', marginTop: '6px' }}>
                  (يعادل $ {flexCalculations.salePerM2Usd.toFixed(2)} / م² شامل التجهيز)
                </div>
              </div>

              {/* Net Profit */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1.5px solid #22c55e',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 700 }}>صافي ربحك في الطلبية</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4ade80' }}>
                    + $ {flexCalculations.netProfitUsd.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontWeight: 800, color: '#86efac', fontSize: '0.85rem' }}>
                  + {Math.round(flexCalculations.netProfitSyp).toLocaleString()} ل.س
                </div>
              </div>

              {/* Direct Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenActionModal('flex', 'invoice')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ea580c',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(234,88,12,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🛒</span>
                  <span>تسجيل كعملية بيع وفاتورة فورية</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenActionModal('flex', 'quotation')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    background: 'transparent',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>📋</span>
                  <span>إصدار عرض سعر رسمي للزبون</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* =========================================================
          SUB-TAB 2: LED DISPLAY SCREENS (P10) CALCULATOR
          ========================================================= */}
      {activeSubTab === 'led' && (
        <div className="led-calculator-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(320px, 1fr)', gap: '20px' }}>
          
          {/* Left / Setup & Hardware Card */}
          <div className="card" style={{ background: '#ffffff', border: '1.5px solid #bfdbfe', borderRadius: '14px', padding: '22px', boxShadow: '0 4px 15px rgba(37,99,235,0.05)' }}>
            <div className="flex jb ai-center" style={{ borderBottom: '1.5px solid #bfdbfe', paddingBottom: '12px', marginBottom: '18px' }}>
              <div className="flex ai-center gap-10">
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900 }}>
                  💡
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#1e40af' }}>شاشات عرض ليد متحركة (P10 Outdoor)</h2>
                  <span style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600 }}>
                    مضاعفات 16 سم ارتفاع × مضاعفات 32 سم عرض — شريحة 16.5$
                  </span>
                </div>
              </div>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                شريحة P10: 32×16 سم
              </span>
            </div>

            {/* 1. LED Color Selector (أحمر أو أخضر) */}
            <div style={{ marginBottom: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                🎨 لون إضاءة شريحة الليد (سعر رأس المال: $16.5):
              </label>
              <div className="flex gap-12">
                <button
                  type="button"
                  onClick={() => setLedColor('red')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid',
                    cursor: 'pointer',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    borderColor: ledColor === 'red' ? '#dc2626' : '#cbd5e1',
                    background: ledColor === 'red' ? '#fef2f2' : '#ffffff',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: ledColor === 'red' ? '0 2px 8px rgba(220,38,38,0.2)' : 'none'
                  }}
                >
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span>
                  <span>🔴 لون أحمر (Red)</span>
                  {ledColor === 'red' && <span>✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setLedColor('green')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid',
                    cursor: 'pointer',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    borderColor: ledColor === 'green' ? '#16a34a' : '#cbd5e1',
                    background: ledColor === 'green' ? '#f0fdf4' : '#ffffff',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: ledColor === 'green' ? '0 2px 8px rgba(22,163,74,0.2)' : 'none'
                  }}
                >
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                  <span>🟢 لون أخضر (Green)</span>
                  {ledColor === 'green' && <span>✓</span>}
                </button>
              </div>
            </div>

            {/* 2. Popular Screen Size Presets (1-Click) */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                ⚡ المقاسات الأكثر طلباً وشيوعاً بالسوق (نقرة واحدة):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {popularLedPresets.map((p, idx) => {
                  const isSelected = ledModulesX === p.x && ledModulesY === p.y;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLedModulesX(p.x);
                        setLedModulesY(p.y);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid',
                        borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        color: isSelected ? '#1e40af' : '#334155',
                        cursor: 'pointer',
                        textAlign: 'right',
                        boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.15)' : 'none'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>{p.label}</div>
                      <div style={{ fontSize: '0.68rem', color: isSelected ? '#2563eb' : '#64748b', marginTop: '2px' }}>{p.tag}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Custom Modules Multiplier */}
            <div style={{ background: '#f1f5f9', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                📐 تحديد المقاس المخصص بحسب الشرائح:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    عدد شرائح العرض (مضاعفات 32 سم)
                  </span>
                  <div className="flex gap-8 ai-center mt-4">
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={ledModulesX}
                      onChange={(e) => setLedModulesX(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 800 }}
                    />
                    <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.85rem' }}>
                      = {ledCalculations.widthCm} سم عرض
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    عدد شرائح الارتفاع (مضاعفات 16 سم)
                  </span>
                  <div className="flex gap-8 ai-center mt-4">
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={ledModulesY}
                      onChange={(e) => setLedModulesY(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 800 }}
                    />
                    <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.85rem' }}>
                      = {ledCalculations.heightCm} سم ارتفاع
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Size & Resolution Badge */}
              <div style={{
                marginTop: '12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>المقاس الصافي: </span>
                  <strong style={{ color: '#0f172a' }}>{ledCalculations.widthCm} × {ledCalculations.heightCm} سم</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>إجمالي الشرائح: </span>
                  <strong style={{ color: '#2563eb' }}>{ledCalculations.totalModules} شريحة</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>دقة البكسل: </span>
                  <strong style={{ color: '#059669' }}>{ledCalculations.resolutionX} × {ledCalculations.resolutionY} Pixel</strong>
                </div>
              </div>
            </div>

            {/* 4. Hardware & Assembly Costs Breakdown */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                🔩 مكونات ومستلزمات المنظومة وتكاليفها:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div className="flex jb">
                    <span style={{ color: '#64748b', fontWeight: 700 }}>الشرائح ({ledCalculations.totalModules} × ${ledModulePrice})</span>
                    <input
                      type="number"
                      step="0.5"
                      value={ledModulePrice}
                      onChange={(e) => setLedModulePrice(parseFloat(e.target.value) || 0)}
                      style={{ width: '50px', padding: '1px 3px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      title="سعر الشريحة الواحدة ($)"
                    />
                  </div>
                  <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', marginTop: '2px' }}>$ {ledCalculations.modulesCost.toFixed(2)}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div className="flex jb">
                    <span style={{ color: '#64748b', fontWeight: 700 }}>الباور سبلاي ({ledCalculations.powerSuppliesCount} قطع × ${ledPowerSupplyPrice})</span>
                    <input
                      type="number"
                      step="1"
                      value={ledPowerSupplyPrice}
                      onChange={(e) => setLedPowerSupplyPrice(parseFloat(e.target.value) || 0)}
                      style={{ width: '45px', padding: '1px 3px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      title="سعر الباور سبلاي ($)"
                    />
                  </div>
                  <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', marginTop: '2px' }}>$ {ledCalculations.powerSuppliesCost.toFixed(2)}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div className="flex jb">
                    <span style={{ color: '#64748b', fontWeight: 700 }}>كرت التحكم Wi-Fi / USB</span>
                    <input
                      type="number"
                      step="1"
                      value={ledControlCardPrice}
                      onChange={(e) => setLedControlCardPrice(parseFloat(e.target.value) || 0)}
                      style={{ width: '45px', padding: '1px 3px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      title="سعر كرت التحكم ($)"
                    />
                  </div>
                  <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', marginTop: '2px' }}>$ {ledCalculations.controlCardCost.toFixed(2)}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div className="flex jb">
                    <span style={{ color: '#64748b', fontWeight: 700 }}>شاسيه وفريم ({ledCalculations.perimeterM.toFixed(1)}م)</span>
                    <input
                      type="number"
                      step="1"
                      value={ledFramePricePerM}
                      onChange={(e) => setLedFramePricePerM(parseFloat(e.target.value) || 0)}
                      style={{ width: '45px', padding: '1px 3px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      title="سعر المتر المحيط للفريم ($)"
                    />
                  </div>
                  <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', marginTop: '2px' }}>$ {ledCalculations.frameCost.toFixed(2)}</div>
                </div>
              </div>

              {/* Assembly labor */}
              <div className="flex jb ai-center mt-8" style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>كابلات، سيليكون عزل ضد المطر، وأجور التجميع والبرمجة:</span>
                <div className="flex ai-center gap-6">
                  <input
                    type="number"
                    step="1"
                    value={ledAssemblyLabor}
                    onChange={(e) => setLedAssemblyLabor(parseFloat(e.target.value) || 0)}
                    style={{ width: '55px', padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <strong style={{ color: '#0f172a' }}>$</strong>
                </div>
              </div>
            </div>

            {/* 5. Profit Margin */}
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '10px', padding: '14px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af', display: 'block', marginBottom: '8px' }}>
                📈 هامش الربح المطلوب للشاشة:
              </label>
              <div className="flex gap-12 ai-center">
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 700 }}>نسبة مئوية (%)</span>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={ledProfitPct}
                    onChange={(e) => {
                      setLedProfitPct(parseFloat(e.target.value) || 0);
                      setLedProfitFixed('');
                    }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 800 }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 700 }}>أو ربح مقطوع ($)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 50"
                    className="form-control"
                    value={ledProfitFixed}
                    onChange={(e) => {
                      setLedProfitFixed(e.target.value);
                      if (e.target.value) setLedProfitPct(0);
                    }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 800 }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right / Pricing & Summary Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{
              background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(15,23,42,0.15)'
            }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  كشف مواصفات وتكلفة الشاشة
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '4px 0 0', color: '#ffffff' }}>
                  شاشة {ledCalculations.widthCm}×{ledCalculations.heightCm} سم ({ledColor === 'red' ? '🔴 أحمر' : '🟢 أخضر'})
                </h3>
              </div>

              {/* Hardware items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '0.84rem', marginBottom: '16px' }}>
                <div className="flex jb">
                  <span style={{ color: '#94a3b8' }}>شرائح P10 ({ledCalculations.totalModules} حبة):</span>
                  <strong style={{ color: '#f1f5f9' }}>$ {ledCalculations.modulesCost.toFixed(2)}</strong>
                </div>

                <div className="flex jb">
                  <span style={{ color: '#94a3b8' }}>باور سبلاي 5V ({ledCalculations.powerSuppliesCount} قطع):</span>
                  <strong style={{ color: '#f1f5f9' }}>$ {ledCalculations.powerSuppliesCost.toFixed(2)}</strong>
                </div>

                <div className="flex jb">
                  <span style={{ color: '#94a3b8' }}>كرت تحكم Wi-Fi:</span>
                  <strong style={{ color: '#f1f5f9' }}>$ {ledCalculations.controlCardCost.toFixed(2)}</strong>
                </div>

                <div className="flex jb">
                  <span style={{ color: '#94a3b8' }}>شاسيه وفريم خارجي:</span>
                  <strong style={{ color: '#f1f5f9' }}>$ {ledCalculations.frameCost.toFixed(2)}</strong>
                </div>

                <div className="flex jb">
                  <span style={{ color: '#94a3b8' }}>تجميع وبرمجة وعزل:</span>
                  <strong style={{ color: '#f1f5f9' }}>$ {ledCalculations.assemblyCost.toFixed(2)}</strong>
                </div>

                <div className="flex jb" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>إجمالي رأس المال والتكلفة عليك:</span>
                  <strong style={{ color: '#f87171', fontSize: '1.05rem' }}>$ {ledCalculations.totalCostUsd.toFixed(2)}</strong>
                </div>
                <div style={{ textAlign: 'left', fontSize: '0.74rem', color: '#94a3b8' }}>
                  ({Math.round(ledCalculations.totalCostSyp).toLocaleString()} ل.س)
                </div>
              </div>

              {/* Sale Price Highlight */}
              <div style={{
                background: 'rgba(37, 99, 235, 0.18)',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#93c5fd' }}>سعر بيع الشاشة للزبون</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', margin: '4px 0' }}>
                  $ {ledCalculations.salePriceUsd.toFixed(2)}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fde047' }}>
                  {Math.round(ledCalculations.salePriceSyp).toLocaleString()} ل.س
                </div>
              </div>

              {/* Net Profit */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1.5px solid #22c55e',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 700 }}>صافي أرباح تصنيع الشاشة</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4ade80' }}>
                    + $ {ledCalculations.netProfitUsd.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontWeight: 800, color: '#86efac', fontSize: '0.85rem' }}>
                  + {Math.round(ledCalculations.netProfitSyp).toLocaleString()} ل.س
                </div>
              </div>

              {/* Direct Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenActionModal('led', 'invoice')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🛒</span>
                  <span>تسجيل كعملية بيع وفاتورة فورية</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenActionModal('led', 'quotation')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    background: 'transparent',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>📋</span>
                  <span>إصدار عرض سعر رسمي للزبون</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* =========================================================
          SUB-TAB 3: ORDERS & WORKSHOP LEDGER
          ========================================================= */}
      {activeSubTab === 'orders' && (
        <div className="orders-ledger-layout">
          <div className="card" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
            
            {/* Filters Bar */}
            <div className="flex jb ai-center" style={{ flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setOrdersFilterSupplier('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    borderColor: ordersFilterSupplier === 'all' ? '#ea580c' : '#cbd5e1',
                    background: ordersFilterSupplier === 'all' ? '#ea580c' : '#ffffff',
                    color: ordersFilterSupplier === 'all' ? '#ffffff' : '#475569'
                  }}
                >
                  الكل ({externalInvoices.length})
                </button>

                <button
                  type="button"
                  onClick={() => setOrdersFilterSupplier('kadi')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    borderColor: ordersFilterSupplier === 'kadi' ? '#ea580c' : '#cbd5e1',
                    background: ordersFilterSupplier === 'kadi' ? '#ea580c' : '#ffffff',
                    color: ordersFilterSupplier === 'kadi' ? '#ffffff' : '#475569'
                  }}
                >
                  مطبعة القاضي
                </button>

                <button
                  type="button"
                  onClick={() => setOrdersFilterSupplier('sham')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    borderColor: ordersFilterSupplier === 'sham' ? '#ea580c' : '#cbd5e1',
                    background: ordersFilterSupplier === 'sham' ? '#ea580c' : '#ffffff',
                    color: ordersFilterSupplier === 'sham' ? '#ffffff' : '#475569'
                  }}
                >
                  مطبعة الشام
                </button>

                <button
                  type="button"
                  onClick={() => setOrdersFilterSupplier('led')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    borderColor: ordersFilterSupplier === 'led' ? '#2563eb' : '#cbd5e1',
                    background: ordersFilterSupplier === 'led' ? '#2563eb' : '#ffffff',
                    color: ordersFilterSupplier === 'led' ? '#ffffff' : '#475569'
                  }}
                >
                  شاشات ليد
                </button>

                <button
                  type="button"
                  onClick={() => setOrdersFilterSupplier('other')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    borderColor: ordersFilterSupplier === 'other' ? '#475569' : '#cbd5e1',
                    background: ordersFilterSupplier === 'other' ? '#475569' : '#ffffff',
                    color: ordersFilterSupplier === 'other' ? '#ffffff' : '#475569'
                  }}
                >
                  ورش أخرى
                </button>
              </div>

              {/* Search Box */}
              <div>
                <input
                  type="text"
                  placeholder="بحث في الفواتير أو العميل أو الورشة..."
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
                />
              </div>
            </div>

            {/* Orders Table */}
            {externalInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🌐</span>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>لا توجد طلبيات تنفيذ خارجي مسجلة بعد</p>
                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>استخدم حاسبة الفلكس 190 أو شاشات الليد في الأعلى لتسجيل أول طلبية</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                      <th style={{ padding: '10px 12px' }}>الفاتورة</th>
                      <th style={{ padding: '10px 12px' }}>التاريخ</th>
                      <th style={{ padding: '10px 12px' }}>الزبون</th>
                      <th style={{ padding: '10px 12px' }}>البيان والتفاصيل</th>
                      <th style={{ padding: '10px 12px' }}>المطبعة / الورشة المنفذة</th>
                      <th style={{ padding: '10px 12px' }}>تكلفة الورشة</th>
                      <th style={{ padding: '10px 12px' }}>سعر البيع</th>
                      <th style={{ padding: '10px 12px' }}>صافي الربح</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {externalInvoices.map((inv) => {
                      const saleUsd = inv.currency === 'SYP' ? (inv.totalAmount / (inv.exchangeRate || effectiveRate)) : inv.totalAmount;
                      const costUsd = inv.externalCost 
                        ? (inv.currency === 'SYP' ? (inv.externalCost / (inv.exchangeRate || effectiveRate)) : inv.externalCost)
                        : (saleUsd * 0.65);
                      const profitUsd = saleUsd - costUsd;

                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#2563eb' }}>
                            {inv.invoiceNumber}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {inv.date}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                            {inv.customerName}
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '240px' }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {inv.items.map(it => it.description).join(' + ')}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 800
                            }}>
                              🏭 {inv.externalSupplierName || 'مطبعة خارجية'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 800 }}>
                            $ {costUsd.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 900, color: '#0f172a' }}>
                            $ {saleUsd.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 900 }}>
                            + $ {profitUsd.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setPrintingInvoice(inv)}
                              style={{
                                padding: '4px 10px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              🧾 طباعة
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: Quick Customer & Action Form
          ========================================================= */}
      {isActionModalOpen && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            direction: 'rtl'
          }}>
            <div className="flex jb ai-center" style={{ borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div className="flex ai-center gap-8">
                <span style={{ fontSize: '1.4rem' }}>{actionModalMode === 'invoice' ? '🛒' : '📋'}</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  {actionModalMode === 'invoice' ? 'تسجيل فاتورة بيع خارجي' : 'إصدار عرض سعر رسمي'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAction}>
              {/* Order summary pill */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>تفاصيل الصنف:</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {actionSourceType === 'flex' ? flexCalculations.desc : ledCalculations.desc}
                </div>
                <div className="flex jb mt-8" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>إجمالي الفاتورة للزبون:</span>
                  <strong style={{ color: '#ea580c', fontSize: '1rem' }}>
                    $ {(actionSourceType === 'flex' ? flexCalculations.salePriceUsd : ledCalculations.salePriceUsd).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Customer Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  اسم العميل أو الزبون *
                </label>
                <input
                  type="text"
                  required
                  list="contacts-list"
                  placeholder="اكتب اسم العميل أو اختره من القائمة..."
                  className="form-control"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontWeight: 700 }}
                />
                <datalist id="contacts-list">
                  {contacts.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              {/* Customer Phone */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  رقم الهاتف للتواصل
                </label>
                <input
                  type="text"
                  placeholder="09..."
                  className="form-control"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1', direction: 'ltr' }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  ملاحظات إضافية (تظهر بالفاتورة / عرض السعر)
                </label>
                <input
                  type="text"
                  placeholder="مثال: جاهز للاستلام غداً بعد الظهر..."
                  className="form-control"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-10">
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: actionModalMode === 'invoice' ? '#ea580c' : '#2563eb',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  {actionModalMode === 'invoice' ? '💾 حفظ الفاتورة وطباعتها' : '📄 توليد عرض السعر وطباعته'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>
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

      {/* Quotation Print Modal */}
      {printingQuotation && (
        <QuotationPrintModal
          quotation={printingQuotation}
          onClose={() => setPrintingQuotation(null)}
        />
      )}

    </div>
  );
};
