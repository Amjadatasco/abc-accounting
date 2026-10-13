import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import type { JournalLine, Currency } from '../types/accounting';

interface JournalViewProps {
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  onOpenModal?: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  isModalOpen: externalModalOpen,
  onCloseModal: externalCloseModal,
  onOpenModal: externalOpenModal
}) => {
  const { journalEntries, accounts, addJournalEntry } = useAccounting();

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setModalOpen = (open: boolean) => {
    if (externalCloseModal && !open) externalCloseModal();
    else if (externalOpenModal && open) externalOpenModal();
    else setInternalModalOpen(open);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  // New Entry Form State
  const [entryCurrency, setEntryCurrency] = useState<Currency>('USD');
  const entryCurrSym = entryCurrency === 'SYP' ? 'ل.س' : '$';
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', accountName: '', accountCode: '', description: '', debit: 0, credit: 0 },
    { accountId: '', accountName: '', accountCode: '', description: '', debit: 0, credit: 0 }
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  const handleAccountChange = (index: number, accId: string) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return;
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name
    };
    setLines(newLines);
  };

  const handleLineValueChange = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { accountId: '', accountName: '', accountCode: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Check if any row has missing account
    const hasEmptyAccount = lines.some(l => !l.accountId);
    if (hasEmptyAccount) {
      setErrorMsg('يرجى تحديد الحساب المالي لجميع أسطر القيد.');
      return;
    }

    const nextNumber = `JE-2026-${String(journalEntries.length + 1).padStart(3, '0')}`;
    const result = addJournalEntry({
      entryNumber: nextNumber,
      date: entryDate,
      reference,
      notes,
      currency: entryCurrency,
      currencySymbol: entryCurrSym,
      lines: lines.map(l => ({
        ...l,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0
      }))
    });

    if (!result.success) {
      setErrorMsg(result.error || 'حدث خطأ أثناء حفظ القيد.');
      return;
    }

    // Reset & close
    setEntryCurrency('USD');
    setReference('');
    setNotes('');
    setLines([
      { accountId: '', accountName: '', accountCode: '', description: '', debit: 0, credit: 0 },
      { accountId: '', accountName: '', accountCode: '', description: '', debit: 0, credit: 0 }
    ]);
    setModalOpen(false);
  };

  const filteredEntries = journalEntries.filter(je => {
    const matchesSearch = je.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          je.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (je.reference && je.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDate = (!filterStartDate || je.date >= filterStartDate) && (!filterEndDate || je.date <= filterEndDate);
    return matchesSearch && matchesDate;
  });

  return (
    <div>
      <div className="top-header">
        <div className="page-title">
          <h2>دفتر قيود اليومية (Journal Entries)</h2>
          <p>تسجيل ومتابعة القيود المحاسبية بنظام القيد المزدوج المتوازن</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <span>+</span> قيد يومية يدوي جديد
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="table-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
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

          <div style={{ width: '280px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="بحث برقم القيد، البيان، المرجع..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="table-card">
        <div className="table-header">
          <h3>سجل الحركات والقيود</h3>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>رقم القيد</th>
                <th style={{ width: '110px' }}>التاريخ</th>
                <th style={{ width: '110px' }}>رقم المرجع</th>
                <th>البيان والملاحظات</th>
                <th style={{ textAlign: 'center', width: '110px' }}>العملة</th>
                <th style={{ textAlign: 'left', width: '140px' }}>إجمالي القيد</th>
                <th style={{ width: '100px' }}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(je => {
                const total = je.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
                const isExpanded = selectedEntry === je.id;
                const jeSym = je.currencySymbol || (je.currency === 'SYP' ? 'ل.س' : '$');
                const isSyp = je.currency === 'SYP';

                return (
                  <React.Fragment key={je.id}>
                    <tr>
                      <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>{je.entryNumber}</td>
                      <td style={{ fontSize: '0.85rem' }}>{je.date}</td>
                      <td>
                        {je.reference ? (
                          <span className="badge badge-gray">{je.reference}</span>
                        ) : (
                          <span style={{ color: 'var(--text-light)' }}>-</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500 }}>{je.notes}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ backgroundColor: isSyp ? '#f0fdf4' : '#eff6ff', color: isSyp ? '#166534' : '#1e40af', border: `1px solid ${isSyp ? '#bbf7d0' : '#bfdbfe'}`, fontSize: '0.75rem', fontWeight: 700 }}>
                          {isSyp ? '🇸🇾 سوري' : '💵 دولار'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'left', fontWeight: 800 }}>
                        {jeSym} {total.toLocaleString()}
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline" 
                          onClick={() => setSelectedEntry(isExpanded ? null : je.id)}
                        >
                          {isExpanded ? 'إخفاء' : 'عرض الأطراف'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Lines View */}
                    {isExpanded && (
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td colSpan={7} style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            <table style={{ margin: 0, fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                  <th>رقم الحساب</th>
                                  <th>اسم الحساب</th>
                                  <th>شرح السطر</th>
                                  <th style={{ textAlign: 'left', width: '130px' }}>مدين ({jeSym})</th>
                                  <th style={{ textAlign: 'left', width: '130px' }}>دائن ({jeSym})</th>
                                </tr>
                              </thead>
                              <tbody>
                                {je.lines.map((line, idx) => (
                                  <tr key={idx}>
                                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{line.accountCode}</td>
                                    <td style={{ fontWeight: 600 }}>{line.accountName}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{line.description || '-'}</td>
                                    <td style={{ textAlign: 'left', fontWeight: line.debit > 0 ? 700 : 400, color: line.debit > 0 ? 'var(--primary-color)' : 'var(--text-light)' }}>
                                      {line.debit > 0 ? `${jeSym} ${line.debit.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ textAlign: 'left', fontWeight: line.credit > 0 ? 700 : 400, color: line.credit > 0 ? '#b45309' : 'var(--text-light)' }}>
                                      {line.credit > 0 ? `${jeSym} ${line.credit.toLocaleString()}` : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Journal Entry Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>تسجيل قيد يومية يدوي (Double-Entry)</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    {errorMsg}
                  </div>
                )}

                {/* Currency Selection for Journal Entry */}
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.15rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-dark)', display: 'block' }}>
                      عملة القيد المحاسبي (مدين / دائن):
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      حدد العملة التي سيتم تسجيل القيد وإثبات الحسابات بها
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${entryCurrency === 'USD' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.45rem 1.1rem', fontWeight: 800, fontSize: '0.85rem' }}
                      onClick={() => setEntryCurrency('USD')}
                    >
                      💵 دولار أمريكي ($)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${entryCurrency === 'SYP' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.45rem 1.1rem', fontWeight: 800, fontSize: '0.85rem' }}
                      onClick={() => setEntryCurrency('SYP')}
                    >
                      🇸🇾 ليرة سورية (ل.س)
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">تاريخ القيد *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={entryDate} 
                      onChange={(e) => setEntryDate(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم المرجع (سند / شيك / عقد)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="مثال: CHQ-9988" 
                      value={reference} 
                      onChange={(e) => setReference(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">البيان العام للقيد *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="شرح موجز للعملية المالية..." 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                  />
                </div>

                <div style={{ marginTop: '1.5rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>أسطر القيد (أطراف الحسابات)</h4>
                  <button type="button" className="btn btn-sm btn-outline" onClick={addLine}>
                    + إضافة سطر إضافي
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ margin: 0 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ width: '35%' }}>الحساب المالي</th>
                        <th>شرح السطر</th>
                        <th style={{ width: '140px' }}>مدين ({entryCurrSym})</th>
                        <th style={{ width: '140px' }}>دائن ({entryCurrSym})</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td>
                            <select 
                              className="form-select" 
                              required 
                              value={line.accountId}
                              onChange={(e) => handleAccountChange(idx, e.target.value)}
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                            >
                              <option value="">-- اختر الحساب --</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name} ({acc.category})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="بيان فرعي..."
                              value={line.description}
                              onChange={(e) => handleLineValueChange(idx, 'description', e.target.value)}
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              step="any" 
                              className="form-input" 
                              value={line.debit || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleLineValueChange(idx, 'debit', val);
                                if (val > 0) handleLineValueChange(idx, 'credit', 0);
                              }}
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem', fontWeight: 700 }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              step="any" 
                              className="form-input" 
                              value={line.credit || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleLineValueChange(idx, 'credit', val);
                                if (val > 0) handleLineValueChange(idx, 'debit', 0);
                              }}
                              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem', fontWeight: 700 }}
                            />
                          </td>
                          <td>
                            {lines.length > 2 && (
                              <button 
                                type="button" 
                                onClick={() => removeLine(idx)}
                                style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '1.1rem' }}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan={2} style={{ textAlign: 'left' }}>الإجمالي:</td>
                        <td style={{ color: 'var(--primary-color)' }}>{entryCurrSym} {totalDebit.toLocaleString()}</td>
                        <td style={{ color: '#b45309' }}>{entryCurrSym} {totalCredit.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Balance validation alert */}
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem 1rem', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: isBalanced ? 'var(--success-light)' : 'var(--danger-light)',
                  color: isBalanced ? 'var(--success-text)' : 'var(--danger-text)',
                  border: `1px solid ${isBalanced ? '#a7f3d0' : '#fecaca'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  <span>
                    {isBalanced 
                      ? '✓ القيد متوازن محاسبياً (المدين = الدائن)' 
                      : `⚠ القيد غير متوازن! الفارق: ${entryCurrSym} ${difference.toLocaleString()}`}
                  </span>
                  <span>المدين: {entryCurrSym} {totalDebit.toLocaleString()} | الدائن: {entryCurrSym} {totalCredit.toLocaleString()}</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={!isBalanced}>
                  ترحيل وحفظ القيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
