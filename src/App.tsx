import { useState } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { DashboardView } from './components/DashboardView';
import { SalesView } from './components/SalesView';
import { AccountsView } from './components/AccountsView';
import { JournalView } from './components/JournalView';
import { InvoicesView } from './components/InvoicesView';
import { ExpensesView } from './components/ExpensesView';
import { ContactsView } from './components/ContactsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'invoices' | 'expenses' | 'contacts' | 'journal' | 'accounts' | 'reports' | 'settings'>('dashboard');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { companySettings, invoices, journalEntries, isCloudEnabled } = useAccounting();
  const unpaidCount = invoices.filter(i => i.status !== 'paid').length;

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
    { id: 'sales', label: 'المبيعات والخدمات', icon: '🛒' },
    { id: 'invoices', label: 'فواتير المبيعات', icon: '🧾', badge: unpaidCount > 0 ? unpaidCount : undefined, badgeColor: 'badge-orange' },
    { id: 'expenses', label: 'المصروفات والمشتريات', icon: '💳' },
    { id: 'contacts', label: 'العملاء والموردون', icon: '👥' },
    { id: 'journal', label: 'قيود اليومية', icon: '📑', badge: journalEntries.length },
    { id: 'accounts', label: 'دليل الحسابات', icon: '🌳' },
    { id: 'reports', label: 'التقارير والقوائم المالية', icon: '📈' },
    { id: 'settings', label: 'إعدادات المنشأة', icon: '⚙️' }
  ];

  const handleNavClick = (tabId: any) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false); // Close sidebar automatically on mobile selection
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-topbar no-print">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="القائمة الرئيسية"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className="mobile-brand">
          <img 
            src={companySettings.logoUrl || '/abc_logo.jpg'} 
            alt="ABC Logo" 
            className="mobile-logo" 
          />
          <span className="mobile-title">محاسب ABC</span>
        </div>

        <div className="mobile-status-dot" title={isCloudEnabled ? 'سحابي متصل' : 'محلي'}>
          <span className={`status-pill ${isCloudEnabled ? 'online' : 'offline'}`}>
            {isCloudEnabled ? '🟢' : '⚪'}
          </span>
        </div>
      </header>

      {/* Mobile Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-backdrop no-print" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar no-print ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img 
            src={companySettings.logoUrl || '/abc_logo.jpg'} 
            alt="ABC Logo" 
            className="sidebar-logo" 
          />
          <div className="sidebar-title">
            <h1>محاسب ABC</h1>
            <p>{companySettings.tagline || 'الإدارة المالية الشاملة'}</p>
          </div>
        </div>

        {/* Cloud Status Indicator */}
        <div 
          style={{ 
            margin: '0.25rem 0.5rem 0.75rem', 
            padding: '0.45rem 0.75rem', 
            borderRadius: '6px', 
            backgroundColor: isCloudEnabled ? '#f0fdf4' : '#f8fafc', 
            border: `1px solid ${isCloudEnabled ? '#bbf7d0' : '#e2e8f0'}`, 
            fontSize: '0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '0.4rem',
            userSelect: 'none'
          }}
        >
          <span style={{ color: isCloudEnabled ? '#15803d' : '#64748b', fontWeight: 800 }}>
            {isCloudEnabled ? '🟢 سحابي (متصل ومحفوظ)' : '⚪ محلي (Offline)'}
          </span>
        </div>

        <nav className="nav-menu">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`badge ${item.badgeColor || 'badge-blue'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', fontWeight: 800 }}
            onClick={() => handleNavClick('sales')}
          >
            🛒 + تسجيل بيع جديد
          </button>
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem' }}
            onClick={() => {
              handleNavClick('invoices');
              setIsInvoiceModalOpen(true);
            }}
          >
            + فاتورة ضريبية مفصلة
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardView 
            onNavigate={(tab) => setActiveTab(tab as any)}
            onOpenNewInvoice={() => setActiveTab('sales')}
            onOpenNewJournal={() => {
              setActiveTab('journal');
              setIsJournalModalOpen(true);
            }}
          />
        )}

        {activeTab === 'sales' && <SalesView />}

        {activeTab === 'accounts' && <AccountsView />}

        {activeTab === 'journal' && (
          <JournalView 
            isModalOpen={isJournalModalOpen}
            onOpenModal={() => setIsJournalModalOpen(true)}
            onCloseModal={() => setIsJournalModalOpen(false)}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView 
            isModalOpen={isInvoiceModalOpen}
            onOpenModal={() => setIsInvoiceModalOpen(true)}
            onCloseModal={() => setIsInvoiceModalOpen(false)}
          />
        )}

        {activeTab === 'expenses' && <ExpensesView />}

        {activeTab === 'contacts' && <ContactsView />}

        {activeTab === 'reports' && <ReportsView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};

function App() {
  return (
    <AccountingProvider>
      <MainApp />
    </AccountingProvider>
  );
}

export default App;
