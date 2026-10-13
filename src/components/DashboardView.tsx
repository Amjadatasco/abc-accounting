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
  const { metrics, invoices, journalEntries, companySettings, markInvoicePaid } = useAccounting();
  const curr = companySettings.currencySymbol || '$';

  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid');

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

      {/* Red Test Banner */}
      <div style={{
        textAlign: 'center',
        padding: '1.5rem',
        margin: '1.5rem 0',
        backgroundColor: '#fee2e2',
        border: '3px dashed #ef4444',
        borderRadius: '12px'
      }}>
        <h1 style={{
          color: '#dc2626',
          fontSize: '3.5rem',
          fontWeight: 900,
          margin: 0,
          letterSpacing: '2px'
        }}>
          تجربة
        </h1>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderRight: '4px solid var(--primary-color)' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي الإيرادات</span>
            <span className="badge badge-blue">السنة المالية</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--primary-color)' }}>
            {curr} {metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>مبيعات وخدمات محققة</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid var(--warning-color)' }}>
          <div className="stat-header">
            <span className="stat-title">إجمالي المصروفات</span>
            <span className="badge badge-orange">مصاريف وتشغيل</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--text-dark)' }}>
            {curr} {metrics.totalExpenses.toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>تكاليف تشغيلية ورواتب ومشتريات</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: `4px solid ${metrics.netProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}` }}>
          <div className="stat-header">
            <span className="stat-title">صافي الربح التقديري</span>
            <span className={`badge ${metrics.netProfit >= 0 ? 'badge-green' : 'badge-red'}`}>
              {metrics.netProfit >= 0 ? 'أرباح نشاط' : 'عجز مالي'}
            </span>
          </div>
          <div className="stat-value" style={{ color: metrics.netProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {curr} {metrics.netProfit.toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>هامش الربح: {metrics.totalRevenue > 0 ? ((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1) : 0}%</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderRight: '4px solid #06b6d4' }}>
          <div className="stat-header">
            <span className="stat-title">السيولة النقدية (البنوك والصندوق)</span>
            <span className="badge badge-blue">رصيد متاح</span>
          </div>
          <div className="stat-value" style={{ color: '#0891b2' }}>
            {curr} {metrics.cashAndBank.toLocaleString()}
          </div>
          <div className="stat-footer">
            <span>أموال متوفرة في الحسابات الجارية</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ backgroundColor: '#fcfdfd' }}>
          <div className="stat-header">
            <span className="stat-title">مستحقات على العملاء (الذمم المدينة)</span>
            <span className="badge badge-orange">{unpaidInvoices.length} فواتير</span>
          </div>
          <div className="stat-value" style={{ fontSize: '1.45rem', color: '#b45309' }}>
            {curr} {metrics.accountsReceivable.toLocaleString()}
          </div>
          <div className="stat-footer">
            <a href="#invoices" onClick={(e) => { e.preventDefault(); onNavigate('invoices'); }} style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
              متابعة فواتير التحصيل ←
            </a>
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

        {/* Responsive Bar Chart Simulation */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 180, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          {[
            { month: 'مايو', rev: 28000, exp: 19000 },
            { month: 'يونيو', rev: 35000, exp: 22000 },
            { month: 'يوليو', rev: 32000, exp: 20000 },
            { month: 'أغسطس', rev: 41000, exp: 26000 },
            { month: 'سبتمبر', rev: metrics.totalRevenue, exp: metrics.totalExpenses },
          ].map((bar, idx) => {
            const maxVal = Math.max(metrics.totalRevenue, 50000);
            const revHeight = Math.min(150, Math.max(20, (bar.rev / maxVal) * 150));
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
