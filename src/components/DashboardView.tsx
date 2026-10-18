import React from 'react';
import { useAccounting } from '../context/AccountingContext';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenNewInvoice: () => void;
  onOpenNewJournal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  onNavigate, 
  onOpenNewInvoice, 
  onOpenNewJournal 
}) => {
  const { metrics, invoices, expenses, journalEntries, companySettings, markInvoicePaid } = useAccounting();
  const curr = companySettings.currencySymbol || '$';

  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid');

  // Compute live actual metrics from registered invoices & expenses
  const actualRevenue = invoices.reduce((sum, inv) => {
    return sum + (Number(inv.totalAmount) || 0);
  }, 0);

  // Unified expenses in USD (converting SYP at transaction rate e.g. 130 or 14800)
  const actualExpensesUSD = expenses.reduce((sum, exp) => {
    if ((exp.currency || 'USD') === 'USD') return sum + (Number(exp.amount) || 0);
    const rate = exp.exchangeRate || 130;
    return sum + (rate > 0 ? (Number(exp.amount) || 0) / rate : 0);
  }, 0);

  const actualExpensesSYP = expenses
    .filter(exp => (exp.currency || 'USD') === 'SYP')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  const amjadTotalUSD = expenses
    .filter(exp => exp.paidBy === 'amjad')
    .reduce((sum, exp) => {
      if ((exp.currency || 'USD') === 'USD') return sum + (Number(exp.amount) || 0);
      const rate = exp.exchangeRate || 130;
      return sum + (rate > 0 ? (Number(exp.amount) || 0) / rate : 0);
    }, 0);

  const nourTotalUSD = expenses
    .filter(exp => exp.paidBy === 'nour')
    .reduce((sum, exp) => {
      if ((exp.currency || 'USD') === 'USD') return sum + (Number(exp.amount) || 0);
      const rate = exp.exchangeRate || 130;
      return sum + (rate > 0 ? (Number(exp.amount) || 0) / rate : 0);
    }, 0);

  const netProfit = actualRevenue - actualExpensesUSD;

  return (
    <div>
      {/* Top Header */}
      <div className="top-header">
        <div className="page-title">
          <h2>لوحة المعلومات المالية</h2>
          <p>نظرة عامة على الوضع المالي والسيولة النقدية لـ {companySettings.companyName}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={onOpenNewJournal}>
            <span>+</span> قيد يومية جديد
          </button>
          <button className="btn btn-primary" onClick={onOpenNewInvoice}>
            <span>+</span> إنشاء فاتورة مبيعات
          </button>
        </div>
      </div>


      {/* Main KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderRight: '4px solid var(--primary-color)' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي الإيرادات والمبيعات</span>
            <span className="badge badge-blue">سنة 2026</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--primary-color)' }}>
            {curr} {actualRevenue.toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>{invoices.length} عمليات بيع مسجلة</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid var(--warning-color)' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي المصروفات والتجهيزات</span>
            <span className="badge badge-orange">{expenses.length} سندات</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--text-dark)' }}>
            {curr} {Math.round(actualExpensesUSD).toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>{actualExpensesSYP > 0 ? `منها ${actualExpensesSYP.toLocaleString()} ل.س` : 'تكاليف تشغيلية وتأسيس'}</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #2563eb' }}>
          <div className="stat-header">
            <span className="stat-title">👤 مستحقات الشريك أمجد</span>
            <span className="badge badge-blue">مصاريف مدفوعة</span>
          </div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {curr} {Math.round(amjadTotalUSD).toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>6,200 $ + 123,950 ل.س (953 $)</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #16a34a' }}>
          <div className="stat-header">
            <span className="stat-title">👤 مستحقات الشريك نور</span>
            <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>مصاريف مدفوعة</span>
          </div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {curr} {Math.round(nourTotalUSD).toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>ماكينات + تجهيز المحل</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ backgroundColor: '#fcfdfd' }}>
          <div className="stat-header">
            <span className="stat-title">صافي نتيجة النشاط</span>
            <span className={`badge ${netProfit >= 0 ? 'badge-green' : 'badge-red'}`}>
              {netProfit >= 0 ? 'فائض أرباح' : 'عجز مرحلة تأسيس'}
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.45rem', color: netProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {curr} {Math.round(netProfit).toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>{netProfit < 0 ? 'مصاريف تجهيز وتأسيس مبدئية' : 'صافي ربح محقق'}</span>
          </div>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#fcfdfd' }}>
          <div className="stat-header">
            <span className="stat-title">التزامات للموردين (الذمم الدائنة)</span>
            <span className="badge badge-gray">مستحق السداد</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.45rem', color: '#475569' }}>
            {curr} {metrics.accountsPayable.toLocaleString()}
          </div>
          <div className="stat-footer">
            <a href="#expenses" onClick={(e) => { e.preventDefault(); onNavigate('expenses'); }} style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
              مراجعة الموردين والمصروفات ←
            </a>
          </div>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#fcfdfd' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي حقوق الملكية والأصول</span>
            <span className="badge badge-green">الميزانية</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.45rem', color: 'var(--text-dark)' }}>
            {curr} {metrics.totalAssets.toLocaleString()}
          </div>
          <div className="stat-footer">
            <a href="#reports" onClick={(e) => { e.preventDefault(); onNavigate('reports'); }} style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
              عرض الميزانية العمومية ←
            </a>
          </div>
        </div>
      </div>

      {/* Visual Revenue vs Expense Chart (Pure SVG) */}
      <div className="table-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>مقارنة الإيرادات بالمصروفات الشهرية</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>مؤشر تدفق السيولة والربحية التشغيلية</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 12, height: 12, backgroundColor: 'var(--primary-color)', borderRadius: 3 }}></span> الإيرادات
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 12, height: 12, backgroundColor: '#64748b', borderRadius: 3 }}></span> المصروفات
            </span>
          </div>
        </div>

        {/* Responsive Bar Chart Simulation based on actual 2026 data */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 180, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          {[
            { 
              month: 'يناير 2026', 
              rev: invoices.filter(i => i.date?.startsWith('2026-01')).reduce((s, i) => s + (Number(i.totalAmount) || 0), 0), 
              exp: expenses.filter(e => e.date?.startsWith('2026-01')).reduce((s, e) => {
                if ((e.currency || 'USD') === 'USD') return s + (Number(e.amount) || 0);
                const rate = e.exchangeRate || 130;
                return s + (rate > 0 ? (Number(e.amount) || 0) / rate : 0);
              }, 0) 
            },
            { 
              month: 'فبراير 2026', 
              rev: invoices.filter(i => i.date?.startsWith('2026-02')).reduce((s, i) => s + (Number(i.totalAmount) || 0), 0), 
              exp: expenses.filter(e => e.date?.startsWith('2026-02')).reduce((s, e) => {
                if ((e.currency || 'USD') === 'USD') return s + (Number(e.amount) || 0);
                const rate = e.exchangeRate || 130;
                return s + (rate > 0 ? (Number(e.amount) || 0) / rate : 0);
              }, 0) 
            },
            { 
              month: 'مارس 2026', 
              rev: invoices.filter(i => i.date?.startsWith('2026-03')).reduce((s, i) => s + (Number(i.totalAmount) || 0), 0), 
              exp: expenses.filter(e => e.date?.startsWith('2026-03')).reduce((s, e) => {
                if ((e.currency || 'USD') === 'USD') return s + (Number(e.amount) || 0);
                const rate = e.exchangeRate || 130;
                return s + (rate > 0 ? (Number(e.amount) || 0) / rate : 0);
              }, 0) 
            },
            { 
              month: 'إجمالي التأسيس', 
              rev: actualRevenue, 
              exp: actualExpensesUSD 
            },
          ].map((bar, idx) => {
            const maxVal = Math.max(actualExpensesUSD, actualRevenue, 1000);
            const revHeight = Math.min(150, Math.max(10, (bar.rev / maxVal) * 150));
            const expHeight = Math.min(150, Math.max(15, (bar.exp / maxVal) * 150));

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '15%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 150 }}>
                  <div 
                    title={`إيرادات: ${bar.rev.toLocaleString()}`} 
                    style={{ 
                      width: '18px', 
                      height: `${revHeight}px`, 
                      backgroundColor: 'var(--primary-color)', 
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} 
                  />
                  <div 
                    title={`مصروفات: ${bar.exp.toLocaleString()}`} 
                    style={{ 
                      width: '18px', 
                      height: `${expHeight}px`, 
                      backgroundColor: '#64748b', 
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} 
                  />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{bar.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Section: Unpaid Invoices & Recent Journal Entries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Unpaid Invoices Alerts */}
        <div className="table-card" style={{ marginBottom: 0 }}>
          <div className="table-header">
            <h3>فواتير مبيعات قيد التحصيل ({unpaidInvoices.length})</h3>
            <button className="btn btn-sm btn-outline" onClick={() => onNavigate('invoices')}>
              عرض كل الفواتير
            </button>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>المبلغ المستحق</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {unpaidInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      لا توجد فواتير معلقة. جميع الفواتير مسددة بالكامل! 🎉
                    </td>
                  </tr>
                ) : (
                  unpaidInvoices.slice(0, 5).map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 700 }}>{inv.invoiceNumber}</td>
                      <td>{inv.customerName}</td>
                      <td style={{ fontWeight: 700, color: 'var(--danger-color)' }}>
                        {curr} {(inv.totalAmount - inv.paidAmount).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.dueDate}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-primary" 
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => markInvoicePaid(inv.id)}
                        >
                          تسجيل سداد
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Journal Entries */}
        <div className="table-card" style={{ marginBottom: 0 }}>
          <div className="table-header">
            <h3>أحدث قيود اليومية المحاسبية</h3>
            <button className="btn btn-sm btn-outline" onClick={() => onNavigate('journal')}>
              سجل القيود
            </button>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>رقم القيد</th>
                  <th>التاريخ</th>
                  <th>البيان</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.slice(0, 5).map(je => {
                  const total = je.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
                  return (
                    <tr key={je.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{je.entryNumber}</td>
                      <td style={{ fontSize: '0.8rem' }}>{je.date}</td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={je.notes}>
                        {je.notes}
                      </td>
                      <td style={{ fontWeight: 700 }}>{curr} {total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
