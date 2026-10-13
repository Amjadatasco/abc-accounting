import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { AccountCategory } from '../types/accounting';

export const AccountsView: React.FC = () => {
  const { accounts, addAccount, deleteAccount, companySettings } = useAccounting();
  const curr = companySettings.currencySymbol || '$';

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AccountCategory>('asset');
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [parentId, setParentId] = useState('');
  const [balance, setBalance] = useState('0');

  const filteredAccounts = accounts.filter(acc => {
    const matchesCat = activeCategory === 'all' || acc.category === activeCategory;
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          acc.code.includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    addAccount({
      code,
      name,
      category,
      type,
      parentId: parentId || null,
      balance: parseFloat(balance) || 0,
      isSystem: false
    });

    // Reset
    setCode('');
    setName('');
    setBalance('0');
    setIsModalOpen(false);
  };

  const getCategoryBadge = (cat: AccountCategory) => {
    switch (cat) {
      case 'asset': return <span className="badge badge-blue">أصول (1000)</span>;
      case 'liability': return <span className="badge badge-orange">خصوم (2000)</span>;
      case 'equity': return <span className="badge badge-green">حقوق ملكية (3000)</span>;
      case 'revenue': return <span className="badge badge-green">إيرادات (4000)</span>;
      case 'expense': return <span className="badge badge-red">مصروفات (5000)</span>;
    }
  };

  return (
    <div>
      <div className="top-header">
        <div className="page-title">
          <h2>دليل الحسابات (شجرة الحسابات)</h2>
          <p>تنظيم وتبويب الحسابات المالية وفقاً للمعايير المحاسبية المعتمدة</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <span>+</span> إضافة حساب جديد
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'كافة الحسابات' },
              { id: 'asset', label: 'الأصول (1)' },
              { id: 'liability', label: 'الخصوم (2)' },
              { id: 'equity', label: 'حقوق الملكية (3)' },
              { id: 'revenue', label: 'الإيرادات (4)' },
              { id: 'expense', label: 'المصروفات (5)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`btn btn-sm ${activeCategory === tab.id ? 'btn-primary' : 'btn-outline'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ width: '260px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="بحث برقم الحساب أو الاسم..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>قائمة الحسابات المسجلة ({filteredAccounts.length})</h3>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>رقم الحساب</th>
                <th>اسم الحساب</th>
                <th>التصنيف المالي</th>
                <th>طبيعة الحساب</th>
                <th style={{ textAlign: 'left' }}>الرصيد المالي الحالي</th>
                <th style={{ width: '90px' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(acc => {
                const isParent = !acc.parentId;
                return (
                  <tr key={acc.id} style={{ backgroundColor: isParent ? '#f8fafc' : undefined }}>
                    <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>
                      {acc.code}
                    </td>
                    <td style={{ fontWeight: isParent ? 800 : 500, paddingRight: isParent ? '1.25rem' : '2.5rem' }}>
                      {!isParent && <span style={{ color: 'var(--text-light)', marginLeft: '0.4rem' }}>↳</span>}
                      {acc.name}
                    </td>
                    <td>{getCategoryBadge(acc.category)}</td>
                    <td>
                      <span className="badge badge-gray">
                        {acc.type === 'debit' ? 'مدين بطبيعته' : 'دائن بطبيعته'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'left', fontWeight: 800, fontSize: '0.95rem', color: acc.balance < 0 ? 'var(--danger-color)' : 'var(--text-dark)' }}>
                      {curr} {acc.balance.toLocaleString()}
                    </td>
                    <td>
                      {!acc.isSystem ? (
                        <button 
                          className="btn btn-sm btn-outline" 
                          style={{ color: 'var(--danger-color)', borderColor: '#fecaca' }}
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف الحساب "${acc.name}"؟`)) {
                              deleteAccount(acc.id);
                            }
                          }}
                        >
                          حذف
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>نظامي</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>إضافة حساب مالي جديد</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">رقم الحساب (الكود) *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="مثال: 1150 أو 5700" 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">اسم الحساب *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="مثال: حساب بنك الراجحي أو مصاريف سفر" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">التصنيف المحاسبي الرئيسي *</label>
                    <select 
                      className="form-select" 
                      value={category} 
                      onChange={(e) => {
                        const newCat = e.target.value as AccountCategory;
                        setCategory(newCat);
                        // set default nature based on category
                        if (newCat === 'asset' || newCat === 'expense') {
                          setType('debit');
                        } else {
                          setType('credit');
                        }
                      }}
                    >
                      <option value="asset">1 - الأصول (Assets)</option>
                      <option value="liability">2 - الخصوم (Liabilities)</option>
                      <option value="equity">3 - حقوق الملكية (Equity)</option>
                      <option value="revenue">4 - الإيرادات (Revenues)</option>
                      <option value="expense">5 - المصروفات (Expenses)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">طبيعة الحساب *</label>
                    <select 
                      className="form-select" 
                      value={type} 
                      onChange={(e) => setType(e.target.value as 'debit' | 'credit')}
                    >
                      <option value="debit">مدين (Debit)</option>
                      <option value="credit">دائن (Credit)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">الحساب الرئيسي (الأب اختياري)</label>
                    <select 
                      className="form-select" 
                      value={parentId} 
                      onChange={(e) => setParentId(e.target.value)}
                    >
                      <option value="">-- بدون أب (حساب رئيسي) --</option>
                      {accounts.filter(a => a.category === category).map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">الرصيد الافتتاحي</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={balance} 
                      onChange={(e) => setBalance(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
