import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axiosConfig';
import { toast } from 'react-toastify';

const WorkflowSettings = ({ columns, onClose, onWorkflowUpdated }) => {
    const [selectedColId, setSelectedColId] = useState('');
    const [allowedIds, setAllowedIds] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (selectedColId) {
            const col = columns.find(c => String(c.id || c.Id) === String(selectedColId));

            console.log("Dữ liệu Cột nhận được từ C#:", col);

            const rawIds = col?.allowedNextColumnIds || col?.AllowedNextColumnIds || [];

            setAllowedIds(rawIds.map(id => String(id)));
        } else {
            setAllowedIds([]);
        }
    }, [selectedColId, columns]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCheckboxChange = (colIdStr) => {
        setAllowedIds(prev =>
            prev.includes(colIdStr) ? prev.filter(id => id !== colIdStr) : [...prev, colIdStr]
        );
    };

    const handleSave = async () => {
        if (!selectedColId) return;
        setIsSaving(true);
        try {
            await axios.put(`/api/v1/columns/${selectedColId}/workflow`, allowedIds);
            toast.success("✅ Đã chốt luồng di chuyển thành công!");
            if (onWorkflowUpdated) onWorkflowUpdated();
        } catch (error) {
            toast.error(error.response?.data?.message || "❌ Lỗi khi lưu cấu hình!");
        } finally {
            setIsSaving(false);
        }
    };

    const selectedColTitle = columns.find(c => String(c.id || c.Id) === String(selectedColId))?.title ||
        columns.find(c => String(c.id || c.Id) === String(selectedColId))?.Title;

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px',
            color: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s ease-out'
        }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .wf-checkbox:checked + div { background: #0c66e4; border-color: #0c66e4; }
                .wf-checkbox:checked + div::after { content: '✔'; color: white; font-size: 12px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
                .custom-scroll::-webkit-scrollbar { width: 6px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
                `}
            </style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ padding: '8px', background: 'rgba(106, 176, 255, 0.1)', borderRadius: '10px', color: '#6ab0ff', fontSize: '18px' }}>⚙️</span>
                    Thiết lập Luồng công việc
                </h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '24px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>×</button>
            </div>

            {/* BƯỚC 1: CUSTOM DROPDOWN */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ background: '#6ab0ff', color: '#0f172a', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%', fontSize: '12px' }}>1</span>
                    Khi thẻ công việc đang ở cột:
                </label>

                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <div
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.3)', border: isDropdownOpen ? '1px solid #6ab0ff' : '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', boxShadow: isDropdownOpen ? '0 0 0 3px rgba(106,176,255,0.1)' : 'none' }}
                    >
                        <span style={{ color: selectedColId ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: selectedColId ? 'bold' : 'normal' }}>
                            {selectedColTitle || '--- Chọn một trạng thái ---'}
                        </span>
                        <span style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', color: 'rgba(255,255,255,0.5)' }}>▼</span>
                    </div>

                    {isDropdownOpen && (
                        <div className="custom-scroll" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                            {columns.map(col => (
                                <div
                                    key={col.id || col.Id}
                                    onClick={() => { setSelectedColId(String(col.id || col.Id)); setIsDropdownOpen(false); }}
                                    style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background 0.2s', background: String(selectedColId) === String(col.id || col.Id) ? 'rgba(106, 176, 255, 0.1)' : 'transparent', color: String(selectedColId) === String(col.id || col.Id) ? '#6ab0ff' : '#fff', fontWeight: String(selectedColId) === String(col.id || col.Id) ? 'bold' : 'normal', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                    onMouseEnter={e => { if (String(selectedColId) !== String(col.id || col.Id)) e.target.style.background = 'rgba(255,255,255,0.05)' }}
                                    onMouseLeave={e => { if (String(selectedColId) !== String(col.id || col.Id)) e.target.style.background = 'transparent' }}
                                >
                                    {col.title || col.Title}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* BƯỚC 2: CHỌN ĐÍCH ĐẾN (ÉP KIỂU STRING ĐỂ SO SÁNH) */}
            {selectedColId && (
                <div style={{ marginBottom: '32px', animation: 'fadeIn 0.3s ease-out' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                        <span style={{ background: '#27c93f', color: '#0f172a', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%', fontSize: '12px' }}>2</span>
                        Chỉ được phép kéo thẻ sang các cột sau:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {columns.filter(c => String(c.id || c.Id) !== String(selectedColId)).map(col => {
                            const colIdStr = String(col.id || col.Id);
                            const isChecked = allowedIds.includes(colIdStr);
                            return (
                                <label key={colIdStr} style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '12px', borderRadius: '10px', background: isChecked ? 'rgba(106, 176, 255, 0.05)' : 'transparent', border: isChecked ? '1px solid rgba(106, 176, 255, 0.2)' : '1px solid transparent', transition: 'all 0.2s', _hover: { background: 'rgba(255,255,255,0.02)' } }}>
                                    <div style={{ position: 'relative', width: '22px', height: '22px' }}>
                                        <input
                                            type="checkbox"
                                            className="wf-checkbox"
                                            checked={isChecked}
                                            onChange={() => handleCheckboxChange(colIdStr)}
                                            style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }}
                                        />
                                        <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.3)', borderRadius: '6px', transition: 'all 0.2s', zIndex: 1 }}></div>
                                    </div>
                                    <span style={{ fontSize: '15px', fontWeight: isChecked ? 'bold' : '500', color: isChecked ? '#fff' : 'rgba(255,255,255,0.6)', transition: 'color 0.2s' }}>{col.title || col.Title}</span>
                                </label>
                            )
                        })}
                        {columns.length <= 1 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>Bảng này chưa có cột đích nào khác để di chuyển.</div>}
                    </div>
                </div>
            )}

            {/* BƯỚC 3: NÚT LƯU */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {onClose && <button onClick={onClose} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background = 'transparent'}>Hủy bỏ</button>}
                <button
                    onClick={handleSave}
                    disabled={!selectedColId || isSaving}
                    style={{ padding: '12px 30px', background: !selectedColId ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #0c66e4, #4A9FFF)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: !selectedColId ? 'not-allowed' : 'pointer', boxShadow: !selectedColId ? 'none' : '0 10px 20px rgba(12, 102, 228, 0.4)', transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (selectedColId && !isSaving) e.target.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { if (selectedColId && !isSaving) e.target.style.transform = 'translateY(0)' }}
                >
                    {isSaving ? 'Đang lưu...' : 'Lưu quy trình'}
                </button>
            </div>
        </div>
    );
};

export default WorkflowSettings;