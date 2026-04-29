import React from 'react';
import TopBar from '../components/TopBar';
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'; 

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const token = localStorage.getItem('jwt_token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { fullName: 'Người dùng' };

    const navLinks = [
        { path: '/d', icon: '📊', label: 'Tổng quan' },
        { path: '/d/boards', icon: '📋', label: 'Quản lý Bảng' },
        { path: '/d/calendar', icon: '📅', label: 'Lịch tiến độ' },
        { path: '/d/members', icon: '👥', label: 'Nhân sự' },
        { path: '/d/analytics', icon: '📈', label: 'Thống kê' },
        { path: '/d/profile', icon: '🧑‍💻', label: 'Hồ sơ cá nhân' },
        { path: '/d/settings', icon: '⚙️', label: 'Cài đặt hệ thống' },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#0f172a', color: '#fff', overflow: 'hidden', fontFamily: 'var(--sans)', position: 'relative' }}>
            <style>
                {`
                .sidebar-link {
                    padding: 14px 20px; color: rgba(255,255,255,0.6); text-decoration: none; font-weight: 600;
                    border-radius: 12px; transition: all 0.3s ease; display: flex; align-items: center; gap: 12px;
                    margin-bottom: 8px; font-size: 15px; border: 1px solid transparent;
                }
                .sidebar-link:hover {
                    background: rgba(255,255,255,0.05); color: #fff; transform: translateX(4px);
                }
                .sidebar-link.active {
                    background: linear-gradient(135deg, rgba(74, 159, 255, 0.15) 0%, rgba(12, 102, 228, 0.15) 100%);
                    color: #6ab0ff; border: 1px solid rgba(106, 176, 255, 0.3); box-shadow: 0 4px 15px rgba(12, 102, 228, 0.1);
                }
                .btn-logout {
                    width: 100%; padding: 14px; background: rgba(255, 95, 86, 0.1); color: #ff5f56;
                    border: 1px solid rgba(255, 95, 86, 0.2); border-radius: 12px; cursor: pointer;
                    font-weight: bold; display: flex; justify-content: center; align-items: center; gap: 10px; transition: all 0.3s ease; font-size: 15px;
                }
                .btn-logout:hover {
                    background: rgba(255, 95, 86, 0.2); transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255, 95, 86, 0.2); color: #fff;
                }
                
                /* Tùy chỉnh thanh cuộn siêu mỏng */
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
                `}
            </style>

            {/* --- LỚP NỀN VŨ TRỤ CHUNG --- */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(12, 102, 228, 0.15) 0%, transparent 60%)', zIndex: 2 }}></div>

            {/* --- SIDEBAR KÍNH MỜ --- */}
            <aside style={{
                width: '280px', height: '100%', zIndex: 10, position: 'relative',
                background: 'rgba(30, 41, 59, 0.4)', borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', boxShadow: '5px 0 30px rgba(0,0,0,0.2)'
            }}>
                <Link to="/" style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.8} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                    <div style={{ background: 'linear-gradient(135deg, #4A9FFF 0%, #0c66e4 100%)', minWidth: '38px', height: '38px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '16px', color: '#fff', boxShadow: '0 4px 10px rgba(12, 102, 228, 0.4)' }}>SK</div>
                    <span style={{ fontWeight: '800', fontSize: '22px', letterSpacing: '-0.5px', color: '#fff' }}>Smart Kanban</span>
                </Link>

                <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '12px' }}>Menu chính</div>
                    {navLinks.map((link) => {
                        const isActive = link.path === '/d' ? location.pathname === '/d' : location.pathname.includes(link.path);
                        return (
                            <Link key={link.path} to={link.path} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                                <span style={{ fontSize: '20px' }}>{link.icon}</span> {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Link to="/" className="sidebar-link" style={{ background: 'rgba(255,255,255,0.05)', marginBottom: '16px', justifyContent: 'center' }}>
                        <span style={{ fontSize: '18px' }}>🌍</span> Về trang chủ (Website)
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #8777D9, #6ab0ff)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '18px', color: '#fff', boxShadow: '0 4px 10px rgba(135, 119, 217, 0.3)' }}>
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: '#fff' }}>{user.fullName}</div>
                            <div style={{ fontSize: '12px', color: '#6ab0ff', fontWeight: '600', marginTop: '2px' }}>Workspace</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-logout">
                        <span style={{ fontSize: '18px' }}>🚪</span> Đăng xuất
                    </button>
                </div>
            </aside>

            {/* --- KHU VỰC NỘI DUNG BÊN PHẢI --- */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 10, position: 'relative' }}>
                <TopBar />

                <main style={{ flex: 1, overflow: 'auto', position: 'relative', scrollBehavior: 'smooth' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;