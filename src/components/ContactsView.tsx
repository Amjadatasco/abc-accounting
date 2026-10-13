import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { Contact, Currency } from '../types/accounting';

export const ContactsView: React.FC = () => {
  const { contacts, invoices, addContact, companySettings } = useAccounting();
  const curr = companySettings.currencySymbol || '$';

  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatementContact, setSelectedStatementContact] = useState<Contact | null>(null);

  // Form
  const [contactCurrency, setContactCurrency] = useState<Currency>('USD');
  const contactCurrSym = contactCurrency === 'SYP' ? 'ل.س' : '$';
  const [name, setName] = useState('');
  const [type, setType] = useState<'customer' | 'vendor' | 'both'>('customer');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');

  const filteredContacts = contacts.filter(c => {
    const matchesType = filterType === 'all' || c.type === filterType || c.type === 'both';
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          c.phone.includes(searchTerm);
    return matchesType && matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    addContact({
      name,
      type,
      company: company || undefined,
      phone,
      email: email || undefined,
      taxNumber: taxNumber || undefined,
      address: address || undefined,
      currency: contactCurrency,
      currencySymbol: contactCurrSym,
      balance: parseFloat(initialBalance) || 0
    });

    setContactCurrency('USD');
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setTaxNumber('');
    setAddress('');
    setInitialBalance('0');
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="top-header">
        <div className="page-title">
          <h2>دليل العملاء والموردين (Contacts)</h2>
          <p>إدارة جهات التعامل ومتابعة الذمم والأرصدة المستحقة</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <span>+</span> إضافة جهة تعامل جديدة
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="table-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { id: 'all', label: 'كافة جهات التعامل' },
              { id: 'customer', label: 'العملاء فقط' },
              { id: 'vendor', label: 'الموردون فقط' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`btn btn-sm ${filterType === tab.id ? 'btn-primary' : 'btn-outline'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ width: '280px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="بحث بالاسم، الشركة، الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>سجل جهات التعامل ({filteredContacts.length})</h3>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>الاسم / جهة الاتصال</th>
                <th>التصنيف</th>
                <th>اسم الشركة أو المؤسسة</th>
                <th>رقم الهاتف</th>
                <th>الرقم الضريبي</th>
                <th style={{ textAlign: 'left' }}>الرصيد المالي الحالي</th>
                <th style={{ textAlign: 'center' }}>كشف الحساب</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td>
                    <span className={`badge ${c.type === 'customer' ? 'badge-blue' : c.type === 'vendor' ? 'badge-orange' : 'badge-green'}`}>
                      {c.type === 'customer' ? 'عميل' : c.type === 'vendor' ? 'مورد' : 'عميل ومورد'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.company || '-'}</td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{c.phone}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.taxNumber || '-'}</td>
                  <td style={{ textAlign: 'left', fontWeight: 800, color: c.balance > 0 ? (c.type === 'customer' ? 'var(--danger-color)' : 'var(--text-dark)') : 'var(--success-color)' }}>
                    {c.currencySymbol || (c.currency === 'SYP' ? 'ل.س' : '$')} {c.balance.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => setSelectedStatementContact(c)}
                    >
                      كشف حساب 📄
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Statement Modal */}
      {selectedStatementContact && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>كشف حساب: {selectedStatementContact.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-outline no-print" onClick={() => window.print()}>
                  🖨️ طباعة الكشف
                </button>
                <button className="modal-close no-print" onClick={() => setSelectedStatementContact(null)}>×</button>
              </div>
            </div>

            <div className="modal-body printable-report">
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ fontWeight: 800 }}>{selectedStatementContact.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedStatementContact.company}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>الهاتف: {selectedStatementContact.phone}</p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>الرصيد القائم:</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    {selectedStatementContact.currencySymbol || (selectedStatementContact.currency === 'SYP' ? 'ل.س' : '$')} {selectedStatementContact.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem' }}>حركات وفواتير العميل</h4>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th>رقم الفاتورة / المستند</th>
                      <th>التاريخ</th>
                      <th>الاستحقاق</th>
                      <th style={{ textAlign: 'left' }}>القيمة</th>
                      <th style={{ textAlign: 'left' }}>المسدد</th>
                      <th style={{ textAlign: 'left' }}>المتبقي</th>
                      <th style={{ textAlign: 'center' }}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.filter(inv => inv.customerId === selectedStatementContact.id).map(inv => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{inv.invoiceNumber}</td>
                        <td>{inv.date}</td>
                        <td>{inv.dueDate}</td>
                        <td style={{ textAlign: 'left', fontWeight: 700 }}>{curr} {inv.totalAmount.toLocaleString()}</td>
                        <td style={{ textAlign: 'left', color: 'var(--success-color)' }}>{curr} {inv.paidAmount.toLocaleString()}</td>
                        <td style={{ textAlign: 'left', fontWeight: 700, color: 'var(--danger-color)' }}>{curr} {(inv.totalAmount - inv.paidAmount).toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${inv.status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                            {inv.status === 'paid' ? 'مسدد' : 'معلق'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {invoices.filter(inv => inv.customerId === selectedStatementContact.id).length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                          لا توجد فواتير سابقة مسجلة لهذا العميل.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button type="button" className="btn btn-outline" onClick={() => setSelectedStatementContact(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>إضافة عميل أو مورد جديد</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">الاسم الكامل *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="مثال: م. خالد المنصور" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع جهة التعامل *</label>
                    <select 
                      className="form-select" 
                      value={type} 
                      onChange={(e) => setType(e.target.value as any)}
                    >
                      <option value="customer">عميل (مشتري لخدماتنا)</option>
                      <option value="vendor">مورد (بائع لنا بضائع/خدمات)</option>
                      <option value="both">عميل ومورد معاً</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">اسم الشركة أو المؤسسة</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="مثال: شركة التطوير الحديثة" 
                      value={company} 
                      onChange={(e) => setCompany(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم الهاتف *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="+966 5x xxx xxxx" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="contact@company.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الرقم الضريبي (إن وجد)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="15 خانة" 
                      value={taxNumber} 
                      onChange={(e) => setTaxNumber(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">العنوان الوطني / المدينة</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="الرياض، حي السليمانية" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الرصيد الافتتاحي المستحق ({curr})</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={initialBalance} 
                      onChange={(e) => setInitialBalance(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  حفظ جهة التعامل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
