import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Currency, ExpensePayer, ExpenseBill } from '../types/accounting';

export const ExpensesView: React.FC = () => {
  const { expenses, accounts, contacts, addExpense, updateExpense, deleteExpense, addContact } = useAccounting();

  // Sub-pages / Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'abc' | 'amjad' | 'nour' | 'reconciliation'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseBill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Form
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>('USD');
  const expCurrSym = expenseCurrency === 'SYP' ? 'ل.س' : '$';
  const [paidBy, setPaidBy] = useState<ExpensePayer>('abc');
  const [exchangeRate, setExchangeRate] = useState<string>(() => localStorage.getItem('last_dollar_rate') || '14800');
  const [vendorName, setVendorName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'sham_cash' | 'credit'>('sham_cash');
  const [status, setStatus] = useState<'paid' | 'unpaid'>('paid');
  const [notes, setNotes] = useState('');

  const expenseAccounts = accounts.filter(a => a.category === 'expense');
  const vendors = contacts.filter(c => c.type === 'vendor' || c.type === 'both');

  const currentRateNum = parseFloat(exchangeRate) || 14800;
  const currentAmountNum = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = vendorName.trim();
    if (!accountId || !amount || !nameTrimmed) {
      alert('يرجى تحديد اسم المورد، وحساب المصروف، والمبلغ.');
      return;
    }

    // Auto-save vendor if not already in contacts
    const existingVendor = contacts.find(c => c.name.trim().toLowerCase() === nameTrimmed.toLowerCase());
    const finalVendorId = existingVendor?.id || `cnt_${Date.now()}`;

    if (!existingVendor) {
      addContact({
        name: nameTrimmed,
        type: 'vendor',
        phone: 'غير مسجل',
        balance: 0
      });
    }

    const finalAmount = parseFloat(amount) || 0;
    const finalRate = parseFloat(exchangeRate) || 14800;
    const finalEquivalent = expenseCurrency === 'USD'
      ? finalAmount * finalRate
      : finalRate > 0 ? finalAmount / finalRate : 0;

    if (editingExpense) {
      updateExpense({
        ...editingExpense,
        vendorId: finalVendorId,
        vendorName: nameTrimmed,
        accountId,
        date,
        amount: finalAmount,
        taxAmount: parseFloat(taxAmount) || 0,
        currency: expenseCurrency,
        currencySymbol: expCurrSym,
        exchangeRate: finalRate,
        equivalentAmount: finalEquivalent,
        paymentMethod,
        paidBy,
        status,
        notes
      });
    } else {
      const billNumber = `EXP-2026-${String(expenses.length + 1).padStart(3, '0')}`;
      addExpense({
        billNumber,
        vendorId: finalVendorId,
        vendorName: nameTrimmed,
        accountId,
        date,
        amount: finalAmount,
        taxAmount: parseFloat(taxAmount) || 0,
        currency: expenseCurrency,
        currencySymbol: expCurrSym,
        exchangeRate: finalRate,
        equivalentAmount: finalEquivalent,
        paymentMethod,
        paidBy,
        status,
        notes
      });
    }

    localStorage.setItem('last_dollar_rate', String(finalRate));

    // Reset
    setEditingExpense(null);
    setExpenseCurrency('USD');
    setPaidBy('abc');
    setVendorName('');
    setAccountId('');
    setAmount('');
    setTaxAmount('0');
    setNotes('');
    setIsModalOpen(false);
  };

  // Base date and search filter (Search by billNumber, vendorName, notes, amount, or equivalent)
  const baseFilteredExpenses = expenses.filter(exp => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      const matchesDate = (!filterStartDate || exp.date >= filterStartDate) && (!filterEndDate || exp.date <= filterEndDate);
      return matchesDate;
    }

    const matchesText = exp.billNumber.toLowerCase().includes(term) ||
      exp.vendorName.toLowerCase().includes(term) ||
      (exp.notes && exp.notes.toLowerCase().includes(term));

    // Support searching by exact or partial price/amount (e.g. 500, 6200, 15000, 7400)
    const matchesAmount = String(exp.amount).includes(term) ||
      (exp.equivalentAmount && String(Math.round(exp.equivalentAmount)).includes(term));

    const matchesSearch = matchesText || matchesAmount;
    const matchesDate = (!filterStartDate || exp.date >= filterStartDate) && (!filterEndDate || exp.date <= filterEndDate);
    return matchesSearch && matchesDate;
  });

  // Per-payer groupings
  const abcExpenses = baseFilteredExpenses.filter(e => (e.paidBy || 'abc') === 'abc');
  const amjadExpenses = baseFilteredExpenses.filter(e => e.paidBy === 'amjad');
  const nourExpenses = baseFilteredExpenses.filter(e => e.paidBy === 'nour');

  // Unified equivalent helpers based on the transaction day's rate
  const getUnifiedUSD = (e: any) => {
    const rate = e.exchangeRate || 14800;
    if ((e.currency || 'USD') === 'USD') return e.amount;
    return rate > 0 ? e.amount / rate : 0;
  };

  const getUnifiedSYP = (e: any) => {
    const rate = e.exchangeRate || 14800;
    if ((e.currency || 'USD') === 'SYP') return e.amount;
    return e.amount * rate;
  };

  // Amounts
  const totalUSD = baseFilteredExpenses.filter(e => (e.currency || 'USD') === 'USD').reduce((s, e) => s + e.amount, 0);
  const totalSYP = baseFilteredExpenses.filter(e => (e.currency || 'USD') === 'SYP').reduce((s, e) => s + e.amount, 0);
  const totalUnifiedUSD = baseFilteredExpenses.reduce((s, e) => s + getUnifiedUSD(e), 0);
  const totalUnifiedSYP = baseFilteredExpenses.reduce((s, e) => s + getUnifiedSYP(e), 0);

  const abcUSD = abcExpenses.filter(e => (e.currency || 'USD') === 'USD').reduce((s, e) => s + e.amount, 0);
  const abcSYP = abcExpenses.filter(e => (e.currency || 'USD') === 'SYP').reduce((s, e) => s + e.amount, 0);
  const abcUnifiedUSD = abcExpenses.reduce((s, e) => s + getUnifiedUSD(e), 0);
  const abcUnifiedSYP = abcExpenses.reduce((s, e) => s + getUnifiedSYP(e), 0);

  const amjadUSD = amjadExpenses.filter(e => (e.currency || 'USD') === 'USD').reduce((s, e) => s + e.amount, 0);
  const amjadSYP = amjadExpenses.filter(e => (e.currency || 'USD') === 'SYP').reduce((s, e) => s + e.amount, 0);
  const amjadUnifiedUSD = amjadExpenses.reduce((s, e) => s + getUnifiedUSD(e), 0);
  const amjadUnifiedSYP = amjadExpenses.reduce((s, e) => s + getUnifiedSYP(e), 0);

  const nourUSD = nourExpenses.filter(e => (e.currency || 'USD') === 'USD').reduce((s, e) => s + e.amount, 0);
  const nourSYP = nourExpenses.filter(e => (e.currency || 'USD') === 'SYP').reduce((s, e) => s + e.amount, 0);
  const nourUnifiedUSD = nourExpenses.reduce((s, e) => s + getUnifiedUSD(e), 0);
  const nourUnifiedSYP = nourExpenses.reduce((s, e) => s + getUnifiedSYP(e), 0);

  // Active table list with Sorting
  const rawList = activeTab === 'abc' 
    ? abcExpenses 
    : activeTab === 'amjad' 
    ? amjadExpenses 
    : activeTab === 'nour' 
    ? nourExpenses 
    : baseFilteredExpenses;

  const displayExpenses = [...rawList].sort((a, b) => {
    if (sortBy === 'newest') {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return dateDiff !== 0 ? dateDiff : b.billNumber.localeCompare(a.billNumber);
    }
    if (sortBy === 'oldest') {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateDiff !== 0 ? dateDiff : a.billNumber.localeCompare(b.billNumber);
    }
    if (sortBy === 'highest') {
      return getUnifiedUSD(b) - getUnifiedUSD(a);
    }
    if (sortBy === 'lowest') {
      return getUnifiedUSD(a) - getUnifiedUSD(b);
    }
    return 0;
  });

  const getPayerBadge = (payer?: ExpensePayer) => {
    switch (payer) {
      case 'amjad':
        return (
          <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800 }}>
            👤 أمجد
          </span>
        );
      case 'nour':
        return (
          <span style={{ backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800 }}>
            👤 نور
          </span>
        );
      case 'abc':
      default:
        return (
          <span style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800 }}>
            🏢 شركة ABC
          </span>
        );
    }
  };

  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setExpenseCurrency('USD');
    if (activeTab === 'amjad') {
      setPaidBy('amjad');
    } else if (activeTab === 'nour') {
      setPaidBy('nour');
    } else {
      setPaidBy('abc');
    }
    setVendorName('');
    setAccountId('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setTaxAmount('0');
    setPaymentMethod('sham_cash');
    setStatus('paid');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleEditExpense = (exp: ExpenseBill) => {
    setEditingExpense(exp);
    setExpenseCurrency(exp.currency || 'USD');
    setPaidBy(exp.paidBy || 'abc');
    setExchangeRate(String(exp.exchangeRate || 14800));
    setVendorName(exp.vendorName || '');
    setAccountId(exp.accountId || '');
    setDate(exp.date || new Date().toISOString().split('T')[0]);
    setAmount(String(exp.amount || ''));
    setTaxAmount(String(exp.taxAmount || 0));
    setPaymentMethod(exp.paymentMethod || 'sham_cash');
    setStatus(exp.status || 'paid');
    setNotes(exp.notes || '');
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="top-header no-print">
        <div className="page-title">
          <h2>المشتريات والمصروفات وجرد الشركاء</h2>
          <p>تسجيل فواتير المشتريات ومتابعة مصاريف الشركاء (أمجد ونور) والشركة ومقارنتها بالإجمالي</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddExpenseModal} style={{ fontWeight: 800 }}>
            <span>+</span> تسجيل مصروف أو فاتورة شراء
          </button>
        </div>
      </div>

      {/* Sub-pages / Tabs Navigation */}
      <div className="no-print" style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.25rem', 
        backgroundColor: 'white', 
        padding: '0.6rem 0.85rem', 
        borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button 
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('all')}
          style={{ fontWeight: 800, padding: '0.45rem 1rem' }}
        >
          📊 كافة المصروفات (الكل: {baseFilteredExpenses.length})
        </button>

        <button 
          className={`btn btn-sm ${activeTab === 'abc' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('abc')}
          style={{ fontWeight: 800, padding: '0.45rem 1rem' }}
        >
          🏢 مصاريف شركة ABC ({abcExpenses.length})
        </button>

        <button 
          className={`btn btn-sm ${activeTab === 'amjad' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('amjad')}
          style={{ fontWeight: 800, padding: '0.45rem 1rem' }}
        >
          👤 مصاريف أمجد ({amjadExpenses.length})
        </button>

        <button 
          className={`btn btn-sm ${activeTab === 'nour' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('nour')}
          style={{ fontWeight: 800, padding: '0.45rem 1rem' }}
        >
          👤 مصاريف نور ({nourExpenses.length})
        </button>

        <button 
          className={`btn btn-sm ${activeTab === 'reconciliation' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('reconciliation')}
          style={{ fontWeight: 800, padding: '0.45rem 1rem', marginRight: 'auto', backgroundColor: activeTab === 'reconciliation' ? 'var(--primary-color)' : '#f8fafc' }}
        >
          ⚖️ كشف الجرد والمقارنة الشاملة
        </button>
      </div>

      {/* Comparative Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        
        {/* Total Overall */}
        <div 
          className="stat-card" 
          onClick={() => setActiveTab('all')}
          style={{ 
            padding: '1rem 1.15rem', 
            borderRight: '4px solid #0284c7', 
            cursor: 'pointer',
            backgroundColor: activeTab === 'all' ? '#f0f9ff' : 'white'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title" style={{ fontWeight: 800 }}>المجموع الإجمالي العام</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{baseFilteredExpenses.length} سند</span>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المجموع الموحد:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7' }}>
                $ {Math.round(totalUnifiedUSD).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem' }}>
              <span>بالدولار: <strong>$ {totalUSD.toLocaleString()}</strong></span>
              <span>بالسوري: <strong>{totalSYP.toLocaleString()} ل.س</strong></span>
            </div>
          </div>
        </div>

        {/* ABC Company Card */}
        <div 
          className="stat-card" 
          onClick={() => setActiveTab('abc')}
          style={{ 
            padding: '1rem 1.15rem', 
            borderRight: '4px solid #64748b', 
            cursor: 'pointer',
            backgroundColor: activeTab === 'abc' ? '#f8fafc' : 'white'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title" style={{ fontWeight: 800 }}>🏢 مصاريف شركة ABC</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{abcExpenses.length} سند</span>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المجموع الموحد:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#334155' }}>
                $ {Math.round(abcUnifiedUSD).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem' }}>
              <span>بالدولار: <strong>$ {abcUSD.toLocaleString()}</strong></span>
              <span>بالسوري: <strong>{abcSYP.toLocaleString()} ل.س</strong></span>
            </div>
          </div>
        </div>

        {/* Amjad Card */}
        <div 
          className="stat-card" 
          onClick={() => setActiveTab('amjad')}
          style={{ 
            padding: '1rem 1.15rem', 
            borderRight: '4px solid #2563eb', 
            cursor: 'pointer',
            backgroundColor: activeTab === 'amjad' ? '#eff6ff' : 'white'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title" style={{ fontWeight: 800, color: '#1d4ed8' }}>👤 مصاريف أمجد</span>
            <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>{amjadExpenses.length} سند</span>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المجموع الموحد:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>
                $ {Math.round(amjadUnifiedUSD).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem' }}>
              <span>بالدولار: <strong>$ {amjadUSD.toLocaleString()}</strong></span>
              <span>بالسوري: <strong>{amjadSYP.toLocaleString()} ل.س</strong> <span style={{ color: '#16a34a' }}>($ {Math.round(amjadSYP / 130).toLocaleString()})</span></span>
            </div>
          </div>
        </div>

        {/* Nour Card */}
        <div 
          className="stat-card" 
          onClick={() => setActiveTab('nour')}
          style={{ 
            padding: '1rem 1.15rem', 
            borderRight: '4px solid #9333ea', 
            cursor: 'pointer',
            backgroundColor: activeTab === 'nour' ? '#faf5ff' : 'white'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title" style={{ fontWeight: 800, color: '#7e22ce' }}>👤 مصاريف نور</span>
            <span style={{ fontSize: '0.75rem', color: '#9333ea' }}>{nourExpenses.length} سند</span>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المجموع الموحد:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#9333ea' }}>
                $ {Math.round(nourUnifiedUSD).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem' }}>
              <span>بالدولار: <strong>$ {nourUSD.toLocaleString()}</strong></span>
              <span>بالسوري: <strong>{nourSYP.toLocaleString()} ل.س</strong></span>
            </div>
          </div>
        </div>

      </div>

      {/* Dedicated Dollar Rate & Currency Reconciliation Card for the 3 Partner/Company Pages */}
      {(activeTab === 'abc' || activeTab === 'amjad' || activeTab === 'nour') && (() => {
        const activeName = activeTab === 'amjad' ? 'أمجد' : activeTab === 'nour' ? 'نور' : 'شركة ABC';
        const activeColor = activeTab === 'amjad' ? '#2563eb' : activeTab === 'nour' ? '#9333ea' : '#334155';
        const activeBg = activeTab === 'amjad' ? '#eff6ff' : activeTab === 'nour' ? '#faf5ff' : '#f8fafc';
        const activeBorder = activeTab === 'amjad' ? '#bfdbfe' : activeTab === 'nour' ? '#e9d5ff' : '#cbd5e1';
        const activeUSD = activeTab === 'amjad' ? amjadUSD : activeTab === 'nour' ? nourUSD : abcUSD;
        const activeSYP = activeTab === 'amjad' ? amjadSYP : activeTab === 'nour' ? nourSYP : abcSYP;
        const activeUniUSD = activeTab === 'amjad' ? amjadUnifiedUSD : activeTab === 'nour' ? nourUnifiedUSD : abcUnifiedUSD;
        const activeUniSYP = activeTab === 'amjad' ? amjadUnifiedSYP : activeTab === 'nour' ? nourUnifiedSYP : abcUnifiedSYP;

        return (
          <div className="table-card no-print" style={{ 
            padding: '1.25rem 1.5rem', 
            marginBottom: '1.5rem', 
            backgroundColor: activeBg, 
            borderColor: activeBorder,
            borderWidth: '2px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: activeColor, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>💵 جرد وحسابات سعر صرف الدولار لحساب {activeName}</span>
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  يوضح بالضبط كم كان سعر الليرة السورية عند كل دفعة مع توحيد الإجمالي لسهولة المخالصة والجرد العادل
                </p>
              </div>

              {/* Today's Exchange Rate Box */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.6rem', 
                backgroundColor: 'white', 
                padding: '0.5rem 0.85rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1.5px solid var(--border-color)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                  سعر صرف الدولار اليوم:
                </span>
                <input 
                  type="number"
                  style={{ 
                    width: '110px', 
                    padding: '0.25rem 0.5rem', 
                    fontWeight: 800, 
                    textAlign: 'center', 
                    borderRadius: '4px', 
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem'
                  }}
                  value={exchangeRate}
                  onChange={(e) => {
                    setExchangeRate(e.target.value);
                    localStorage.setItem('last_dollar_rate', e.target.value);
                  }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>ل.س / $</span>
              </div>
            </div>

            {/* Unified reconciliation cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
              <div style={{ backgroundColor: 'white', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  المدفوع نقداً بالدولار ($):
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: activeColor }}>
                  $ {activeUSD.toLocaleString()}
                </span>
              </div>

              <div style={{ backgroundColor: 'white', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  المدفوع نقداً بالليرة السورية (ل.س):
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: activeColor }}>
                  {activeSYP.toLocaleString()} ل.س
                </span>
              </div>

              <div style={{ backgroundColor: 'white', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: `2px solid ${activeColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: activeColor }}>
                    ⭐ الإجمالي الموحد بالدولار ($):
                  </span>
                </div>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: activeColor }}>
                  $ {activeUniUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                  (يحول ما دُفع بالسوري إلى دولار بسعر يومه)
                </span>
              </div>

              <div style={{ backgroundColor: 'white', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: `2px solid ${activeColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: activeColor }}>
                    ⭐ الإجمالي الموحد بالسوري (ل.س):
                  </span>
                </div>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: activeColor }}>
                  {Math.round(activeUniSYP).toLocaleString()} ل.س
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                  (يحول ما دُفع بالدولار إلى سوري بسعر يومه)
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Special View: Partners Reconciliation Report */}
      {activeTab === 'reconciliation' && (
        <div className="table-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                ⚖️ كشف جرد ومقارنة المصروفات بين الشركاء والشركة
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                تفصيل دقيق يوضح مساهمة كل طرف والمبالغ المدفوعة بالدولار والليرة السورية
              </p>
            </div>
            <button 
              className="btn btn-sm btn-outline no-print" 
              onClick={() => window.print()}
              style={{ fontWeight: 700 }}
            >
              🖨️ طباعة تقرير الجرد
            </button>
          </div>

          <div className="table-responsive" style={{ marginBottom: '1.5rem' }}>
            <table>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th>الطرف / المسدد</th>
                  <th style={{ textAlign: 'center' }}>عدد السندات</th>
                  <th style={{ textAlign: 'left' }}>المدفوع نقداً ($)</th>
                  <th style={{ textAlign: 'left' }}>المدفوع نقداً (ل.س)</th>
                  <th style={{ textAlign: 'left', backgroundColor: '#f0fdf4', color: '#166534' }}>⭐ المعادل الموحد ($)</th>
                  <th style={{ textAlign: 'left', backgroundColor: '#fefce8', color: '#854d0e' }}>⭐ المعادل الموحد (ل.س)</th>
                  <th style={{ textAlign: 'center', backgroundColor: '#f0fdf4', color: '#166534' }}>النسبة الشاملة %</th>
                  <th>طبيعة المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 800 }}>🏢 شركة ABC</td>
                  <td style={{ textAlign: 'center' }}>{abcExpenses.length}</td>
                  <td style={{ textAlign: 'left', fontWeight: 700, color: '#334155' }}>$ {abcUSD.toLocaleString()}</td>
                  <td style={{ textAlign: 'left', fontWeight: 700, color: '#334155' }}>{abcSYP.toLocaleString()} ل.س</td>
                  <td style={{ textAlign: 'left', fontWeight: 800, color: '#166534', backgroundColor: '#f0fdf4' }}>
                    $ {abcUnifiedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'left', fontWeight: 800, color: '#854d0e', backgroundColor: '#fefce8' }}>
                    {Math.round(abcUnifiedSYP).toLocaleString()} ل.س
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#166534', backgroundColor: '#f0fdf4' }}>
                    {totalUnifiedUSD > 0 ? ((abcUnifiedUSD / totalUnifiedUSD) * 100).toFixed(1) : 0} %
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>أموال وخزينة الشركة المباشرة</td>
                </tr>

                <tr style={{ backgroundColor: '#eff6ff' }}>
                  <td style={{ fontWeight: 800, color: '#1d4ed8' }}>👤 أمجد</td>
                  <td style={{ textAlign: 'center' }}>{amjadExpenses.length}</td>
                  <td style={{ textAlign: 'left', fontWeight: 700, color: '#1d4ed8' }}>$ {amjadUSD.toLocaleString()}</td>
                  <td style={{ textAlign: 'left', fontWeight: 700, color: '#1d4ed8' }}>{amjadSYP.toLocaleString()} ل.س</td>
                  <td style={{ textAlign: 'left', fontWeight: 800, color: '#1d4ed8', backgroundColor: '#dbeafe' }}>
                    $ {amjadUnifiedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'left', fontWeight: 800, color: '#1e40af', backgroundColor: '#eff6ff' }}>
                    {Math.round(amjadUnifiedSYP).toLocaleString()} ل.س
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8', backgroundColor: '#dbeafe' }}>
                    {totalUnifiedUSD > 0 ? ((amjadUnifiedUSD / totalUnifiedUSD) * 100).toFixed(1) : 0} %
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>دفعه أمجد (مستحق له بذمة الشركة)</td>
                </tr>

                <tr style={{ backgroundColor: '#faf5ff' }}>
                  <td style={{ fontWeight: 800, color: '#7e22ce' }}>👤 نور</td>
                  <td style={{ textAlign: 'center' }}>{nourExpenses.length}</td>
                  <td style={{ textAlign: 'left', fontWeight: 700, color: '#7e22ce' }}>$ {nourUSD.toLocaleString()}</td>
                  <td style={{ textAlign: 'left', fontWeight: 700, color: '#7e22ce' }}>{nourSYP.toLocaleString()} ل.س</td>
                  <td style={{ textAlign: 'left', fontWeight: 800, color: '#7e22ce', backgroundColor: '#f3e8ff' }}>
                    $ {nourUnifiedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'left', fontWeight: 800, color: '#6b21a8', backgroundColor: '#faf5ff' }}>
                    {Math.round(nourUnifiedSYP).toLocaleString()} ل.س
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#7e22ce', backgroundColor: '#f3e8ff' }}>
                    {totalUnifiedUSD > 0 ? ((nourUnifiedUSD / totalUnifiedUSD) * 100).toFixed(1) : 0} %
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#7e22ce', fontWeight: 600 }}>دفعه نور (مستحق له بذمة الشركة)</td>
                </tr>

                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800, borderTop: '2px solid var(--border-color)' }}>
                  <td>المجموع العام للمصروفات</td>
                  <td style={{ textAlign: 'center' }}>{baseFilteredExpenses.length}</td>
                  <td style={{ textAlign: 'left', color: 'var(--primary-color)' }}>$ {totalUSD.toLocaleString()}</td>
                  <td style={{ textAlign: 'left', color: 'var(--primary-color)' }}>{totalSYP.toLocaleString()} ل.س</td>
                  <td style={{ textAlign: 'left', color: 'var(--primary-color)', backgroundColor: '#e2e8f0' }}>
                    $ {totalUnifiedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'left', color: 'var(--primary-color)', backgroundColor: '#e2e8f0' }}>
                    {Math.round(totalUnifiedSYP).toLocaleString()} ل.س
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--primary-color)', backgroundColor: '#e2e8f0' }}>100 %</td>
                  <td style={{ fontSize: '0.8rem' }}>إجمالي التكاليف المسجلة بالمعادل الموحد</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Visual Percentage Breakdown Bar */}
          <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800 }}>
              📊 التوزيع النسبي للمصروفات:
            </h4>

            {/* Unified Bar */}
            {totalUnifiedUSD > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', backgroundColor: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem', fontWeight: 800 }}>
                  <span style={{ color: 'var(--primary-color)' }}>⭐ التوزيع الموحد الشامل (محسوب بدقة بسعر صرف يوم الدفع لكل سند):</span>
                  <span>
                    شركة ABC: {((abcUnifiedUSD / totalUnifiedUSD) * 100).toFixed(1)}% | أمجد: {((amjadUnifiedUSD / totalUnifiedUSD) * 100).toFixed(1)}% | نور: {((nourUnifiedUSD / totalUnifiedUSD) * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ display: 'flex', height: '16px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  <div style={{ width: `${(abcUnifiedUSD / totalUnifiedUSD) * 100}%`, backgroundColor: '#475569' }} title={`شركة ABC: $${abcUnifiedUSD.toFixed(1)}`} />
                  <div style={{ width: `${(amjadUnifiedUSD / totalUnifiedUSD) * 100}%`, backgroundColor: '#2563eb' }} title={`أمجد: $${amjadUnifiedUSD.toFixed(1)}`} />
                  <div style={{ width: `${(nourUnifiedUSD / totalUnifiedUSD) * 100}%`, backgroundColor: '#9333ea' }} title={`نور: $${nourUnifiedUSD.toFixed(1)}`} />
                </div>
              </div>
            )}

            {/* USD Bar */}
            {totalUSD > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem', fontWeight: 700 }}>
                  <span>توزيع مبالغ الدولار (${totalUSD.toLocaleString()}):</span>
                  <span>
                    شركة ABC: {((abcUSD / totalUSD) * 100).toFixed(0)}% | أمجد: {((amjadUSD / totalUSD) * 100).toFixed(0)}% | نور: {((nourUSD / totalUSD) * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  <div style={{ width: `${(abcUSD / totalUSD) * 100}%`, backgroundColor: '#64748b' }} title={`شركة ABC: $${abcUSD}`} />
                  <div style={{ width: `${(amjadUSD / totalUSD) * 100}%`, backgroundColor: '#2563eb' }} title={`أمجد: $${amjadUSD}`} />
                  <div style={{ width: `${(nourUSD / totalUSD) * 100}%`, backgroundColor: '#9333ea' }} title={`نور: $${nourUSD}`} />
                </div>
              </div>
            )}

            {/* SYP Bar */}
            {totalSYP > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem', fontWeight: 700 }}>
                  <span>توزيع مبالغ الليرة السورية ({totalSYP.toLocaleString()} ل.س):</span>
                  <span>
                    شركة ABC: {((abcSYP / totalSYP) * 100).toFixed(0)}% | أمجد: {((amjadSYP / totalSYP) * 100).toFixed(0)}% | نور: {((nourSYP / totalSYP) * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  <div style={{ width: `${(abcSYP / totalSYP) * 100}%`, backgroundColor: '#64748b' }} title={`شركة ABC: ${abcSYP} ل.س`} />
                  <div style={{ width: `${(amjadSYP / totalSYP) * 100}%`, backgroundColor: '#2563eb' }} title={`أمجد: ${amjadSYP} ل.س`} />
                  <div style={{ width: `${(nourSYP / totalSYP) * 100}%`, backgroundColor: '#9333ea' }} title={`نور: ${nourSYP} ل.س`} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="table-card no-print" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          
          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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

          {/* Sorting & Search Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: '1', justifyContent: 'flex-end', minWidth: '280px' }}>
            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>الترتيب:</span>
              <select 
                className="form-select"
                style={{ width: 'auto', minWidth: '150px', padding: '0.35rem 0.65rem', fontSize: '0.82rem', fontWeight: 600 }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">🕒 الأحدث أولاً</option>
                <option value="oldest">🕰️ الأقدم أولاً</option>
                <option value="highest">💰 الأعلى سعراً</option>
                <option value="lowest">🏷️ الأقل سعراً</option>
              </select>
            </div>

            {/* Search Input */}
            <div style={{ flex: '1', minWidth: '220px', maxWidth: '340px', position: 'relative' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="🔍 بحث بالاسم، البيان، أو السعر..."
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px 6px'
                  }}
                  title="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="table-card">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>
              {activeTab === 'amjad' 
                ? '👤 سجل مصاريف أمجد' 
                : activeTab === 'nour' 
                ? '👤 سجل مصاريف نور' 
                : activeTab === 'abc' 
                ? '🏢 سجل مصاريف شركة ABC' 
                : 'سجل المصروفات وفواتير المشتريات'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({displayExpenses.length} سند)</span>
          </div>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>رقم السند</th>
                <th>التاريخ</th>
                <th>الجهة الدافعة</th>
                <th>المورد / المستفيد</th>
                <th>بند المصروف</th>
                <th>طريقة الدفع</th>
                <th style={{ textAlign: 'center' }}>العملة</th>
                <th style={{ textAlign: 'left' }}>المبلغ الإجمالي</th>
                <th style={{ textAlign: 'left' }}>سعر الصرف والمعادل</th>
                <th style={{ textAlign: 'center' }}>الحالة</th>
                <th style={{ textAlign: 'center' }} className="no-print">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {displayExpenses.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    لا توجد مصروفات مسجلة في هذا القسم حالياً.
                  </td>
                </tr>
              ) : (
                displayExpenses.map(exp => {
                  const acc = accounts.find(a => a.id === exp.accountId);
                  const expSym = exp.currencySymbol || (exp.currency === 'SYP' ? 'ل.س' : '$');
                  const isSyp = exp.currency === 'SYP';

                  return (
                    <tr key={exp.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>{exp.billNumber}</td>
                      <td style={{ fontSize: '0.85rem' }}>{exp.date}</td>
                      <td>{getPayerBadge(exp.paidBy)}</td>
                      <td style={{ fontWeight: 600 }}>{exp.vendorName}</td>
                      <td>
                        <span className="badge badge-gray">{acc ? acc.name : 'مصروف تشغيلي'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {exp.paymentMethod === 'sham_cash' ? '📱 محفظة شام كاش' : exp.paymentMethod === 'bank' ? '🏦 تحويل بنكي' : exp.paymentMethod === 'cash' ? '💵 نقداً (صندوق)' : '📋 آجل (ذمم)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ backgroundColor: isSyp ? '#f0fdf4' : '#eff6ff', color: isSyp ? '#166534' : '#1e40af', border: `1px solid ${isSyp ? '#bbf7d0' : '#bfdbfe'}`, fontSize: '0.75rem', fontWeight: 700 }}>
                          {isSyp ? '🇸🇾 سوري' : '💵 دولار'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'left', fontWeight: 800 }}>
                        {expSym} {exp.amount.toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 700, color: '#854d0e' }}>
                          1$ = {exp.exchangeRate ? exp.exchangeRate.toLocaleString() : '14,800'} ل.س
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {isSyp ? (
                            <>يعادل: $ {(exp.equivalentAmount || (exp.amount / (exp.exchangeRate || 14800))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                          ) : (
                            <>يعادل: {Math.round(exp.equivalentAmount || (exp.amount * (exp.exchangeRate || 14800))).toLocaleString()} ل.س</>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${exp.status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                          {exp.status === 'paid' ? 'مدفوع' : 'مستحق'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} className="no-print">
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button 
                            className="btn btn-sm btn-outline" 
                            style={{ color: '#2563eb', borderColor: '#bfdbfe', fontWeight: 800, padding: '0.25rem 0.65rem' }}
                            onClick={() => handleEditExpense(exp)}
                            title="تعديل هذا القيد / المصروف"
                          >
                            ✏️ تعديل
                          </button>
                          <button 
                            className="btn btn-sm btn-outline" 
                            style={{ color: 'var(--danger-color)', borderColor: '#fecaca', padding: '0.25rem 0.65rem' }}
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف السند ${exp.billNumber} (${exp.vendorName})؟`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            title="حذف هذا السند"
                          >
                            حذف
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

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {editingExpense ? `✏️ تعديل بيانات القيد / المصروف (${editingExpense.billNumber})` : 'تسجيل مصروف أو فاتورة مشتريات'}
              </h3>
              <button className="modal-close" onClick={() => { setIsModalOpen(false); setEditingExpense(null); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Currency Selection for Expense */}
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.15rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-dark)', display: 'block' }}>
                      عملة المصروف / الشراء (صرف / دفع):
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      حدد العملة التي تم الدفع أو الشراء بها
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${expenseCurrency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.45rem 1.1rem', fontWeight: 800, fontSize: '0.85rem' }}
                      onClick={() => setExpenseCurrency('USD')}
                    >
                      💵 دولار أمريكي ($)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${expenseCurrency === 'SYP' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.45rem 1.1rem', fontWeight: 800, fontSize: '0.85rem' }}
                      onClick={() => setExpenseCurrency('SYP')}
                    >
                      🇸🇾 ليرة سورية (ل.س)
                    </button>
                  </div>
                </div>

                {/* Payer Selection Box: ABC, Amjad, Nour */}
                <div style={{ 
                  marginBottom: '1.25rem', 
                  padding: '1rem 1.15rem', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1.5px solid var(--border-color)' 
                }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-dark)', display: 'block', marginBottom: '0.2rem' }}>
                      👤 الجهة المسددة للمصروف (من دفع المبلغ؟) *
                    </label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      حدد مصدر دفع المبلغ لحساب الجرد بين الشركاء وخزينة الشركة
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                    {/* Option: ABC */}
                    <div 
                      onClick={() => setPaidBy('abc')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: paidBy === 'abc' ? '2px solid #475569' : '1.5px solid var(--border-color)',
                        backgroundColor: paidBy === 'abc' ? '#f1f5f9' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: paidBy === 'abc' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                          🏢 شركة ABC
                        </span>
                        <input 
                          type="radio" 
                          name="paidBy" 
                          checked={paidBy === 'abc'} 
                          onChange={() => setPaidBy('abc')} 
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'block' }}>
                        أموال وخزينة الشركة المباشرة
                      </span>
                    </div>

                    {/* Option: Amjad */}
                    <div 
                      onClick={() => setPaidBy('amjad')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: paidBy === 'amjad' ? '2px solid #2563eb' : '1.5px solid var(--border-color)',
                        backgroundColor: paidBy === 'amjad' ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: paidBy === 'amjad' ? '0 2px 4px rgba(37,99,235,0.1)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1d4ed8' }}>
                          👤 أمجد
                        </span>
                        <input 
                          type="radio" 
                          name="paidBy" 
                          checked={paidBy === 'amjad'} 
                          onChange={() => setPaidBy('amjad')} 
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.73rem', color: '#2563eb', display: 'block' }}>
                        دفعها أمجد من حسابه الخاص
                      </span>
                    </div>

                    {/* Option: Nour */}
                    <div 
                      onClick={() => setPaidBy('nour')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: paidBy === 'nour' ? '2px solid #9333ea' : '1.5px solid var(--border-color)',
                        backgroundColor: paidBy === 'nour' ? '#faf5ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: paidBy === 'nour' ? '0 2px 4px rgba(147,51,234,0.1)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#7e22ce' }}>
                          👤 نور
                        </span>
                        <input 
                          type="radio" 
                          name="paidBy" 
                          checked={paidBy === 'nour'} 
                          onChange={() => setPaidBy('nour')} 
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.73rem', color: '#9333ea', display: 'block' }}>
                        دفعه نور من حسابه الخاص
                      </span>
                    </div>
                  </div>
                </div>

                {/* Today's Dollar Exchange Rate Box in Modal */}
                <div style={{
                  marginBottom: '1.25rem',
                  padding: '0.9rem 1.15rem',
                  backgroundColor: '#fefce8',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid #fde047'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: currentAmountNum > 0 ? '0.65rem' : 0 }}>
                    <div>
                      <label style={{ fontWeight: 800, fontSize: '0.92rem', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <span>💵 سعر صرف الدولار اليوم (مقابل الليرة السورية) *</span>
                      </label>
                      <span style={{ fontSize: '0.76rem', color: '#a16207' }}>
                        لمعرفة سعر الصرف في هذا اليوم بدقة ولتسهيل جرد ومطابقة حسابات الشركاء لاحقاً
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        style={{ 
                          width: '130px', 
                          fontWeight: 800, 
                          textAlign: 'center', 
                          fontSize: '1rem', 
                          backgroundColor: 'white',
                          borderColor: '#fde047'
                        }}
                        value={exchangeRate} 
                        onChange={(e) => {
                          setExchangeRate(e.target.value);
                          localStorage.setItem('last_dollar_rate', e.target.value);
                        }}
                        placeholder="14800"
                        required
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#854d0e' }}>ل.س / $</span>
                    </div>
                  </div>

                  {/* Live Conversion Notice */}
                  {currentAmountNum > 0 && (
                    <div style={{
                      padding: '0.5rem 0.85rem',
                      backgroundColor: 'white',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #fde047',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.84rem',
                      fontWeight: 700
                    }}>
                      <span style={{ color: '#713f12' }}>
                        {expenseCurrency === 'USD' ? '🇸🇾 المعادل بالليرة السورية:' : '💵 المعادل بالدولار الأمريكي:'}
                      </span>
                      <span style={{ color: '#854d0e', fontSize: '0.95rem', fontWeight: 800 }}>
                        {expenseCurrency === 'USD' 
                          ? `${(currentAmountNum * currentRateNum).toLocaleString()} ل.س`
                          : `$ ${(currentRateNum > 0 ? currentAmountNum / currentRateNum : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">اسم المورد / الجهة المستلمة (اكتب الاسم أو اختره) *</label>
                  <input 
                    type="text" 
                    list="vendors-datalist" 
                    className="form-input" 
                    required 
                    placeholder="اكتب اسم المورد (مثال: مطبعة الشام، مورد أحبار... يُحفظ تلقائياً)" 
                    value={vendorName} 
                    onChange={(e) => setVendorName(e.target.value)} 
                  />
                  <datalist id="vendors-datalist">
                    {vendors.map(v => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ✨ اكتب أي مورد جديد هنا وسيتم إدراجه وحفظه تلقائياً في قائمة الموردين للمرات القادمة.
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">بند المصروف (من شجرة الحسابات) *</label>
                    <select 
                      className="form-select" 
                      required 
                      value={accountId} 
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      <option value="">-- اختر حساب المصروف --</option>
                      {expenseAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ السند *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">المبلغ الإجمالي ({expCurrSym}) *</label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      className="form-input" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                    />
                    {currentAmountNum > 0 && (
                      <span style={{ fontSize: '0.76rem', color: '#854d0e', fontWeight: 700, marginTop: '0.3rem', display: 'block' }}>
                        ⚡ يعادل: {expenseCurrency === 'USD' 
                          ? `${(currentAmountNum * currentRateNum).toLocaleString()} ل.س` 
                          : `$ ${(currentRateNum > 0 ? currentAmountNum / currentRateNum : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} (بسعر صرف {currentRateNum.toLocaleString()} ل.س)
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">طريقة السداد *</label>
                    <select 
                      className="form-select" 
                      value={paymentMethod} 
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                    >
                      <option value="sham_cash">📱 محفظة شام كاش (Sham Cash)</option>
                      <option value="cash">نقداً من الخزينة (Cash)</option>
                      <option value="bank">حساب بنكي (Bank Transfer)</option>
                      <option value="credit">آجل على الحساب (Payable)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">حالة السند *</label>
                    <select 
                      className="form-select" 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value as any)}
                    >
                      <option value="paid">مدفوع ومسدد بالكامل</option>
                      <option value="unpaid">مستحق السداد (غير مدفوع)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">الضريبة المضمنة ({expCurrSym})</label>
                    <input 
                      type="number" 
                      step="any" 
                      className="form-input" 
                      value={taxAmount} 
                      onChange={(e) => setTaxAmount(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">شرح وتفاصيل المصروف</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2} 
                    placeholder="ملاحظات حول سبب الصرف أو أرقام الفواتير الورقية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => { setIsModalOpen(false); setEditingExpense(null); }}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  {editingExpense ? '💾 حفظ التعديلات' : 'حفظ وترحيل المصروف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
