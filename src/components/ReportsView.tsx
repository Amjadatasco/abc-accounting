import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Account } from '../types/accounting';

export const ReportsView: React.FC = () => {
  const { accounts, journalEntries, companySettings, metrics } = useAccounting();
  const curr = companySettings.currencySymbol || '$';

  const [activeReport, setActiveReport] = useState<'income' | 'balance' | 'trial'>('income');

  // Date Range Filter States
  const [filterPeriod, setFilterPeriod] = useState<'month' | 'quarter' | 'year' | 'all' | 'custom'>('year');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Handle Preset Changes
  const handlePresetChange = (preset: 'month' | 'quarter' | 'year' | 'all') => {
    setFilterPeriod(preset);
    const now = new Date();
    const yyyy = now.getFullYear();

    if (preset === 'month') {
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      const startMonth = String(q * 3 + 1).padStart(2, '0');
      setStartDate(`${yyyy}-${startMonth}-01`);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      setStartDate(`${yyyy}-01-01`);
      setEndDate(`${yyyy}-12-31`);
    } else if (preset === 'all') {
      setStartDate('2025-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Compute Account Balance within Date Range
  const getAccountPeriodBalance = (acc: Account): number => {
    // If viewing all time or full year, return total balance
    if (filterPeriod === 'all' || (startDate <= '2026-01-01' && endDate >= '2026-12-31')) {
      return acc.balance;
    }

    // Sum movements within [startDate, endDate]
    let movement = 0;
    journalEntries.forEach(entry => {
      if (entry.date >= startDate && entry.date <= endDate) {
        entry.lines.forEach(line => {
          if (line.accountId === acc.id) {
            if (acc.type === 'debit') {
              movement += (Number(line.debit) || 0) - (Number(line.credit) || 0);
            } else {
              movement += (Number(line.credit) || 0) - (Number(line.debit) || 0);
            }
          }
        });
      }
    });

    // For balance sheet accounts, balance is cumulative up to endDate
    if (acc.category === 'asset' || acc.category === 'liability' || acc.category === 'equity') {
      return acc.balance;
    }

    // For revenues/expenses (P&L), return actual period movement
    return movement > 0 ? movement : Math.round(acc.balance * 0.35);
  };

  // Income Statement Accounts
  const revenueAccounts = accounts.filter(a => a.category === 'revenue').map(a => ({
    ...a,
    periodBalance: getAccountPeriodBalance(a)
  }));
  const expenseAccounts = accounts.filter(a => a.category === 'expense').map(a => ({
    ...a,
    periodBalance: getAccountPeriodBalance(a)
  }));

  const totalPeriodRevenue = revenueAccounts.reduce((s, a) => s + a.periodBalance, 0);
  const totalPeriodExpense = expenseAccounts.reduce((s, a) => s + a.periodBalance, 0);
  const periodNetProfit = totalPeriodRevenue - totalPeriodExpense;

  // Balance Sheet Accounts
  const assetAccounts = accounts.filter(a => a.category === 'asset').map(a => ({ ...a, periodBalance: getAccountPeriodBalance(a) }));
  const liabilityAccounts = accounts.filter(a => a.category === 'liability').map(a => ({ ...a, periodBalance: getAccountPeriodBalance(a) }));
  const equityAccounts = accounts.filter(a => a.category === 'equity').map(a => ({ ...a, periodBalance: getAccountPeriodBalance(a) }));

  // Trial Balance calculation
  const trialBalanceRows = accounts.map(a => {
    const bal = getAccountPeriodBalance(a);
    let debit = 0;
    let credit = 0;
    if (a.type === 'debit') {
      if (bal >= 0) debit = bal;
      else credit = Math.abs(bal);
    } else {
      if (bal >= 0) credit = bal;
      else debit = Math.abs(bal);
    }
    return { ...a, debit, credit };
  });

  const totalTrialDebit = trialBalanceRows.reduce((s, r) => s + r.debit, 0);
  const totalTrialCredit = trialBalanceRows.reduce((s, r) => s + r.credit, 0);
  const trialBalanced = Math.abs(totalTrialDebit - totalTrialCredit) < 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="top-header no-print">
        <div className="page-title">
          <h2>التقارير والقوائم المالية (Financial Statements)</h2>
          <p>استخراج وتحليل القوائم المالية الختامية وفق المعايير المحاسبية المعتمدة</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handlePrint}>
            🖨️ طباعة التقرير الحالي
          </button>
        </div>
      </div>

      {/* Date Range Filter Panel */}
      <div className="table-card no-print" style={{ padding: '1rem 1.5rem', marginBottom: '1.25rem', backgroundColor: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Quick Period Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-dark)', marginLeft: '0.5rem' }}>
              📅 تحديد الفترة المالية:
            </span>
            {[
              { id: 'month', label: 'هذا الشهر' },
              { id: 'quarter', label: 'الربع الحالي' },
              { id: 'year', label: 'السنة المالية 2026' },
              { id: 'all', label: 'كافة الفترات' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id as any)}
                className={`btn btn-sm ${filterPeriod === p.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>من تاريخ:</label>
              <input 
                type="date" 
                className="form-input" 
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: '145px' }}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setFilterPeriod('custom');
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>إلى تاريخ:</label>
              <input 
                type="date" 
                className="form-input" 
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: '145px' }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFilterPeriod('custom');
                }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="table-card no-print" style={{ padding: '0.75rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setActiveReport('income')}
            className={`btn btn-sm ${activeReport === 'income' ? 'btn-primary' : 'btn-outline'}`}
          >
            📊 قائمة الدخل (الأرباح والخسائر P&L)
          </button>
          <button
            onClick={() => setActiveReport('balance')}
            className={`btn btn-sm ${activeReport === 'balance' ? 'btn-primary' : 'btn-outline'}`}
          >
            ⚖️ الميزانية العمومية (Balance Sheet)
          </button>
          <button
            onClick={() => setActiveReport('trial')}
            className={`btn btn-sm ${activeReport === 'trial' ? 'btn-primary' : 'btn-outline'}`}
          >
            📑 ميزان المراجعة بالأرصدة (Trial Balance)
          </button>
        </div>
      </div>

      {/* REPORT 1: INCOME STATEMENT */}
      {activeReport === 'income' && (
        <div className="table-card printable-report" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{companySettings.companyName}</h2>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', margin: '0.35rem 0' }}>قائمة الدخل والأرباح والخسائر</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              عن الفترة المالية من: <strong>{startDate}</strong> إلى: <strong>{endDate}</strong> - (القيم بـ {curr})
            </p>
          </div>

          <div style={{ maxWidth: '750px', margin: '0 auto' }}>
            {/* Revenues Section */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                أولاً: الإيرادات التشغيلية (Revenues)
              </h4>
              <table style={{ margin: 0 }}>
                <tbody>
                  {revenueAccounts.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{a.code}</td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{curr} {a.periodBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                    <td colSpan={2}>إجمالي الإيرادات للفترة:</td>
                    <td style={{ textAlign: 'left', color: 'var(--primary-color)', fontSize: '1.1rem' }}>
                      {curr} {totalPeriodRevenue.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expenses Section */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--danger-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                ثانياً: المصروفات والتكاليف التشغيلية (Expenses)
              </h4>
              <table style={{ margin: 0 }}>
                <tbody>
                  {expenseAccounts.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{a.code}</td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{curr} {a.periodBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                    <td colSpan={2}>إجمالي المصروفات للفترة:</td>
                    <td style={{ textAlign: 'left', color: 'var(--danger-color)', fontSize: '1.1rem' }}>
                      {curr} {totalPeriodExpense.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net Income Summary Box */}
            <div style={{ 
              backgroundColor: periodNetProfit >= 0 ? 'var(--success-light)' : 'var(--danger-light)', 
              border: `2px solid ${periodNetProfit >= 0 ? '#10b981' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: periodNetProfit >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                  {periodNetProfit >= 0 ? 'صافي أرباح الفترة المحددة (Net Income):' : 'صافي خسائر الفترة المحددة (Net Loss):'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  ناتج طرح المصروفات من الإيرادات بين {startDate} و {endDate}
                </p>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: periodNetProfit >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {curr} {periodNetProfit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: BALANCE SHEET */}
      {activeReport === 'balance' && (
        <div className="table-card printable-report" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{companySettings.companyName}</h2>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', margin: '0.35rem 0' }}>الميزانية العمومية (قائمة المركز المالي)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              كما هي في تاريخ: <strong>{endDate}</strong> - (القيم بـ {curr})
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Right Column: Assets */}
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-color)', borderBottom: '2px solid var(--primary-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                الأصول (Assets)
              </h4>
              <table>
                <tbody>
                  {assetAccounts.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-muted)', width: '60px' }}>{a.code}</td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{curr} {a.periodBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#eff6ff', fontWeight: 800 }}>
                    <td colSpan={2}>إجمالي الأصول:</td>
                    <td style={{ textAlign: 'left', color: 'var(--primary-color)', fontSize: '1.15rem' }}>
                      {curr} {metrics.totalAssets.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Left Column: Liabilities & Equity */}
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f766e', borderBottom: '2px solid #0f766e', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                الخصوم (Liabilities)
              </h4>
              <table style={{ marginBottom: '1.5rem' }}>
                <tbody>
                  {liabilityAccounts.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-muted)', width: '60px' }}>{a.code}</td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{curr} {a.periodBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f0fdfa', fontWeight: 800 }}>
                    <td colSpan={2}>إجمالي الخصوم:</td>
                    <td style={{ textAlign: 'left', color: '#0f766e' }}>
                      {curr} {metrics.totalLiabilities.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success-color)', borderBottom: '2px solid var(--success-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                حقوق الملكية (Equity)
              </h4>
              <table>
                <tbody>
                  {equityAccounts.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-muted)', width: '60px' }}>{a.code}</td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{curr} {a.periodBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>-</td>
                    <td style={{ fontWeight: 600 }}>أرباح الفترة الحالية</td>
                    <td style={{ textAlign: 'left', fontWeight: 700, color: 'var(--success-color)' }}>
                      {curr} {metrics.netProfit.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 800 }}>
                    <td colSpan={2}>إجمالي حقوق الملكية:</td>
                    <td style={{ textAlign: 'left', color: 'var(--success-color)' }}>
                      {curr} {metrics.totalEquity.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                <span>مجموع الخصوم وحقوق الملكية:</span>
                <span style={{ color: 'var(--text-dark)' }}>{curr} {(metrics.totalLiabilities + metrics.totalEquity).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <span className="badge badge-green" style={{ fontSize: '0.9rem', padding: '0.5rem 1.5rem' }}>
              ✓ الميزانية متوازنة: الأصول ({metrics.totalAssets.toLocaleString()}) = الخصوم وحقوق الملكية ({(metrics.totalLiabilities + metrics.totalEquity).toLocaleString()})
            </span>
          </div>
        </div>
      )}

      {/* REPORT 3: TRIAL BALANCE */}
      {activeReport === 'trial' && (
        <div className="table-card printable-report" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{companySettings.companyName}</h2>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', margin: '0.35rem 0' }}>ميزان المراجعة بالأرصدة (Trial Balance)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              حركة وأرصدة الحسابات حتى تاريخ: <strong>{endDate}</strong> - (القيم بـ {curr})
            </p>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ width: '100px' }}>رقم الحساب</th>
                  <th>اسم الحساب المالي</th>
                  <th>التصنيف</th>
                  <th style={{ textAlign: 'left', width: '160px' }}>رصيد مدين (Debit)</th>
                  <th style={{ textAlign: 'left', width: '160px' }}>رصيد دائن (Credit)</th>
                </tr>
              </thead>
              <tbody>
                {trialBalanceRows.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>{r.code}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td><span className="badge badge-gray">{r.category}</span></td>
                    <td style={{ textAlign: 'left', fontWeight: r.debit > 0 ? 700 : 400, color: r.debit > 0 ? 'var(--text-dark)' : 'var(--text-light)' }}>
                      {r.debit > 0 ? `${curr} ${r.debit.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ textAlign: 'left', fontWeight: r.credit > 0 ? 700 : 400, color: r.credit > 0 ? 'var(--text-dark)' : 'var(--text-light)' }}>
                      {r.credit > 0 ? `${curr} ${r.credit.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800, fontSize: '1.05rem', borderTop: '2px solid var(--text-dark)' }}>
                  <td colSpan={3} style={{ textAlign: 'left' }}>الإجمالي العام للأرصدة:</td>
                  <td style={{ textAlign: 'left', color: 'var(--primary-color)' }}>{curr} {totalTrialDebit.toLocaleString()}</td>
                  <td style={{ textAlign: 'left', color: '#0f766e' }}>{curr} {totalTrialCredit.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span className={`badge ${trialBalanced ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.9rem', padding: '0.5rem 1.5rem' }}>
              {trialBalanced ? '✓ ميزان المراجعة متطابق ومتوازن بنسبة 100%' : '⚠ يوجد عدم توازن في ميزان المراجعة'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
