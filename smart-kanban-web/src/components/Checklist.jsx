import React, { useState } from 'react';

const Checklist = ({ items = [], setItems, isReadOnly }) => {
    const [newItemTitle, setNewItemTitle] = useState('');
    const totalItems = items.length;
    const completedItems = items.filter(item => item.isCompleted || item.IsCompleted).length;
    const progressPercentage = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

    const handleAddItem = (e) => {
        if (e.key === 'Enter' && newItemTitle.trim()) {
            const validObjectId = [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            setItems([...items, { id: validObjectId, title: newItemTitle, isCompleted: false }]);
            setNewItemTitle('');
        }
    };

    const toggleItem = (id) => {
        if (isReadOnly) return;
        setItems(items.map(item => (item.id === id || item.Id === id) ? { ...item, isCompleted: !(item.isCompleted || item.IsCompleted) } : item));
    };

    const deleteItem = (id) => setItems(items.filter(item => (item.id !== id && item.Id !== id)));
    const progressBarColor = progressPercentage === 100 ? '#20c997' : 'var(--color-accent)';

    return (
        <div style={{ marginBottom: '36px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '18px' }}>☑️</span>
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px' }}>Danh sách công việc con</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', width: '36px', fontWeight: 'bold' }}>
                    {progressPercentage}%
                </span>
                <div style={{ flex: 1, height: '10px', backgroundColor: 'var(--bg-column)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPercentage}%`, backgroundColor: progressBarColor, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease' }}></div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {items.map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', transition: 'border-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                        <input type="checkbox" checked={item.isCompleted || item.IsCompleted || false} onChange={() => toggleItem(item.id || item.Id)} disabled={isReadOnly} style={{ width: '18px', height: '18px', cursor: isReadOnly ? 'default' : 'pointer', accentColor: 'var(--color-accent)', marginTop: '2px' }} />
                        <span style={{ flex: 1, fontSize: '15px', lineHeight: '1.4', color: (item.isCompleted || item.IsCompleted) ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: (item.isCompleted || item.IsCompleted) ? 'line-through' : 'none', transition: 'all 0.2s ease', wordBreak: 'break-word' }}>
                            {item.title || item.Title}
                        </span>
                        {!isReadOnly && (
                            <button onClick={() => deleteItem(item.id || item.Id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', padding: '0 4px', lineHeight: '1' }} title="Xóa">×</button>
                        )}
                    </div>
                ))}
            </div>

            {!isReadOnly && (
                <input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} onKeyDown={handleAddItem} placeholder="+ Thêm một mục con... (Nhấn Enter để lưu)" style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.border = '1px solid var(--color-accent)'} onBlur={(e) => e.target.style.border = '1px solid var(--border-color)'} />
            )}
        </div>
    );
};

export default Checklist;