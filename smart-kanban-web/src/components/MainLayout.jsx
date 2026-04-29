import React from 'react';
import NotificationBell from '../components/NotificationBell';

const MainLayout = ({ children }) => {
    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-primary)', fontFamily: 'var(--sans)', transition: 'background-color 0.3s ease' }}>

            {/* 1. THANH SIDEBAR BÊN TRÁI */}
            <div style={{ width: '60px', backgroundColor: 'var(--bg-header)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '20px', zIndex: 10, transition: 'all 0.3s ease' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#ff5722', borderRadius: '4px' }}></div>
                <div style={{ width: '24px', height: '24px', backgroundColor: 'var(--bg-column)', borderRadius: '50%' }}></div>
                <div style={{ width: '24px', height: '24px', backgroundColor: 'var(--bg-column)', borderRadius: '50%' }}></div>
                <div style={{ width: '24px', height: '24px', backgroundColor: 'var(--bg-column)', borderRadius: '50%' }}></div>
            </div>

            {/* 2. KHU VỰC NỘI DUNG CHÍNH */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* 2.1. Thanh Header trên cùng */}
                <div style={{ height: '50px', backgroundColor: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', transition: 'all 0.3s ease' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '2px' }}>MADAM</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <input
                            placeholder="Tìm nhân viên, tài liệu..."
                            style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', width: '220px', outline: 'none', transition: 'all 0.3s ease' }}
                        />
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text-secondary)', paddingRight: '10px' }}>17:38</div>

                        <NotificationBell />

                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--avatar-bg)', color: 'var(--avatar-text)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                            TR
                        </div>
                    </div>
                </div>

                {/* 2.2. Thanh Menu Tab (Tác vụ, Đang thực hiện...) */}
                <div style={{ height: '45px', backgroundColor: 'var(--bg-header)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '30px', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', transition: 'all 0.3s ease' }}>
                    <span style={{ color: 'var(--color-accent)', borderBottom: '3px solid var(--color-accent)', paddingBottom: '11px', paddingTop: '14px' }}>
                        Tác vụ <span style={{ background: '#ff4d4f', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '10px' }}>8</span>
                    </span>
                    <span style={{ cursor: 'pointer' }}>Đang thực hiện</span>
                    <span style={{ cursor: 'pointer' }}>Đang hỗ trợ</span>
                    <span style={{ cursor: 'pointer' }}>Dự án</span>
                </div>

                {/* 2.3. BẢNG KANBAN */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {children}
                </div>

            </div>
        </div>
    );
};

export default MainLayout;