import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import axios from '../api/axiosConfig'; 
import NotificationBell from '../components/NotificationBell';
import 'react-toastify/dist/ReactToastify.css';

const TopBar = () => {

    const [isCommandOpen, setIsCommandOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUserPanelOpen, setIsUserPanelOpen] = useState(false); 

    const navigate = useNavigate();
    const inputRef = useRef(null);
    const userPanelRef = useRef(null); 

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { fullName: 'Sếp Trung' };

    const [dynamicSearchData, setDynamicSearchData] = useState([]);
    // 1. Khai báo state để nhớ màu nền
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Ưu tiên load từ bộ nhớ, nếu không có thì mặc định cho Dark
        return localStorage.getItem('theme') !== 'light';
    });

    // 2. Tự động đổi màu toàn website khi bấm nút
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark-theme');
            document.documentElement.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }

        // 💡 Bắn tín hiệu để các trang khác (như trang Lịch, trang Bảng) tự động cập nhật theo
        window.dispatchEvent(new Event('themeChange'));
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);
    useEffect(() => {
        const fetchGlobalData = async () => {
            try {
                // Gọi 2 API cùng lúc cho lẹ
                const [boardsRes, usersRes] = await Promise.all([
                    axios.get('/api/v1/boards'),
                    axios.get('/api/v1/users')
                ]);

                const fetchedBoards = Array.isArray(boardsRes.data) ? boardsRes.data : [];
                const fetchedUsers = Array.isArray(usersRes.data) ? usersRes.data : [];

                // 1. Ép kiểu dữ liệu Bảng (Boards)
                const boardItems = fetchedBoards.map(b => ({
                    icon: '📊',
                    title: b.title || b.Title,
                    type: 'Dự án',
                    path: `/d/boards/${b.id || b.Id}`,
                    keywords: 'du an board project bang'
                }));

                // 2. Ép kiểu dữ liệu Nhân sự (Users)
                const userItems = fetchedUsers.map(u => {
                    const safeId = u.id || u.Id || u._id; // 💡 Đảm bảo lấy được ID
                    return {
                        icon: '👤',
                        title: u.fullName || u.FullName || u.name,
                        type: 'Nhân sự',
                        path: `/d/members?viewUserId=${safeId}`, // 💡 Truyền ID an toàn
                        keywords: `nhan su member user ${u.email || u.Email || ''}`
                    };
                });

                setDynamicSearchData([...boardItems, ...userItems]);
            } catch (error) {
                console.error("Lỗi lấy dữ liệu Global Search:", error);
            }
        };
        fetchGlobalData();
    }, []);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsCommandOpen(true);
            }
            if (e.key === 'Escape') {
                setIsCommandOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isCommandOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCommandOpen]);

    // BẮT SỰ KIỆN CLICK RA NGOÀI ĐỂ ĐÓNG MENU
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userPanelRef.current && !userPanelRef.current.contains(event.target)) {
                setIsUserPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // HÀM ĐĂNG XUẤT 
    const handleLogout = () => {
        // 💡 Xóa sạch sành sanh mọi dấu vết cũ
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Đẩy về trang đăng nhập
        window.location.href = '/login';
    };

    const searchData = [
        { icon: '🏠', title: 'Tổng quan hệ thống', type: 'Page', path: '/d', keywords: 'home dashboard tong quan he thong trang chu' },
        { icon: '📝', title: 'Quản lý Bảng Kanban', type: 'Page', path: '/d/boards', keywords: 'board kanban bang quan ly task cong viec' },
        { icon: '📅', title: 'Lịch tiến độ', type: 'Page', path: '/d/calendar', keywords: 'calendar lich tien do thoi gian ngay thang' },
        { icon: '👥', title: 'Quản lý Nhân sự', type: 'Page', path: '/d/members', keywords: 'members nhan su team thanh vien nguoi dung' },
        { icon: '📊', title: 'Báo cáo & Thống kê', type: 'Page', path: '/d/analytics', keywords: 'analytics report thong ke bao cao bieu do chart' },
        { icon: '👤', title: 'Hồ sơ cá nhân', type: 'Page', path: '/d/profile', keywords: 'profile ho so ca nhan thong tin user' },
        { icon: '⚙️', title: 'Cài đặt hệ thống', type: 'Settings', path: '/d/settings', keywords: 'settings cai dat he thong tuy chinh cấu hình' }
    ];

    // 💡 GỘP MENU TĨNH VÀ DỮ LIỆU ĐỘNG THÀNH 1 DANH SÁCH DUY NHẤT
    const masterSearchList = [...searchData, ...dynamicSearchData];

    // 💡 LỌC TRÊN DANH SÁCH TỔNG (Giới hạn hiển thị 8 kết quả cho đỡ tràn màn hình)
    const mockSearchResults = masterSearchList.filter(item =>
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.keywords && item.keywords.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 8);

    const handleNavigate = (title, path) => {
        setIsCommandOpen(false);
        setSearchQuery('');
        toast.success(`🚀 Đang chuyển đến: ${title}`);
        navigate(path);
    };
    const getRoleName = () => {
        try {
            const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
            if (!token) return '✍️ Thành viên (Member)';

            const payload = JSON.parse(atob(token.split('.')[1]));

            console.log("🔍 [Debug] Chi tiết vé Token:", payload);

            let role = 'member'; 
 
            Object.keys(payload).forEach(key => {
                if (key.toLowerCase().includes('role')) {
                    role = payload[key]; 
                }
            });

            const finalRole = String(role).toLowerCase();

            if (finalRole === 'admin') return '🛡️ Quản trị viên (Admin)';
            if (finalRole === 'viewer') return '👁️ Người xem (Viewer)';

            if (finalRole === 'user' || finalRole === 'member') return '✍️ Thành viên (Member)';

            return '✍️ Thành viên (Member)';
        } catch (e) {
            console.error("Lỗi khi đọc thẻ Token:", e);
            return '✍️ Thành viên (Member)';
        }
    };
    return (
        <div style={{ padding: '16px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 50, fontFamily: 'var(--sans)' }}>
            <style>
                {`
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                
                .search-trigger { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; gap: 40px; cursor: pointer; transition: all 0.2s; font-size: 13px; }
                .search-trigger:hover { background: rgba(255,255,255,0.1); border-color: rgba(106, 176, 255, 0.5); color: #fff; }
                .shortcut-key { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #fff; }

                /* CSS CHO BẢNG MENU NGƯỜI DÙNG */
                .user-dropdown { position: absolute; top: 55px; right: 0; width: 240px; background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); animation: slideDown 0.2s ease-out; overflow: hidden; z-index: 100; display: flex; flex-direction: column; }
                .user-menu-item { padding: 12px 20px; display: flex; align-items: center; gap: 12px; transition: all 0.2s; cursor: pointer; color: rgba(255,255,255,0.8); font-size: 14px; text-decoration: none; border: none; background: transparent; width: 100%; text-align: left; font-weight: 500; font-family: inherit;}
                .user-menu-item:hover { background: rgba(106, 176, 255, 0.1); color: #fff; }
                
                /* Tùy chỉnh riêng cho nút Đăng xuất */
                .user-menu-item.danger { color: #ef4444; border-top: 1px solid rgba(255,255,255,0.08); padding: 14px 20px; }
                .user-menu-item.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                `}
            </style>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    👋 Xin chào, <span style={{ color: '#fff' }}>{user.fullName || user.name || 'Sếp Trung'}</span>
                </div>
            </div>

            <button className="search-trigger" onClick={() => setIsCommandOpen(true)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🔍 Tìm kiếm dự án, task, thành viên...</span>
                <span className="shortcut-key">Ctrl K</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

                <NotificationBell />

                {/* KHU VỰC AVATAR & BẢNG ĐIỀU KHIỂN (USER PANEL) */}
                <div style={{ position: 'relative' }} ref={userPanelRef}>
                    {/* AVATAR CLICK TRIGGER */}
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        onClick={() => setIsUserPanelOpen(!isUserPanelOpen)}
                        title="Tài khoản"
                    >

                        <img
                            src={`https://api.dicebear.com/7.x/micah/svg?seed=${user.id || user.Id || user._id || user.fullName}`}
                            alt="Avatar"
                            style={{
                                width: '38px', height: '38px',
                                borderRadius: '50%',
                                border: '2px solid rgba(255,255,255,0.2)',
                                backgroundColor: '#0c66e4', /* Màu nền xanh giống y hệt thẻ Task */
                                transition: 'border-color 0.2s',
                                objectFit: 'cover'
                            }}

                        />
                        {/* 💡 NÚT CÔNG TẮC DARK/LIGHT TOÀN CẦU */}
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                border: '1px solid',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                color: isDarkMode ? '#fff' : '#1e293b',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                transition: 'all 0.3s ease',
                                marginRight: '16px' // Đẩy ra xa cái Avatar một xíu
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            {isDarkMode ? '☀️ Sáng' : '🌙 Tối'}
                        </button>
                    </div>
                   
                    {/* DROPDOWN BẢNG ĐIỀU KHIỂN */}
                    {isUserPanelOpen && (
                        <div className="user-dropdown">
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>{user.fullName || 'Sếp Trung'}</div>
                                <div style={{ color: '#6ab0ff', fontSize: '12px', fontWeight: '600' }}>{getRoleName()}</div>
                            </div>
                            <div style={{ padding: '8px 0' }}>
                                <button className="user-menu-item" onClick={() => { setIsUserPanelOpen(false); navigate('/d/profile'); }}>
                                    <span style={{ fontSize: '18px' }}>🧑‍💻</span> Hồ sơ cá nhân
                                </button>
                                <button className="user-menu-item" onClick={() => { setIsUserPanelOpen(false); navigate('/d/settings'); }}>
                                    <span style={{ fontSize: '18px' }}>⚙️</span> Cài đặt hệ thống
                                </button>
                                <button className="user-menu-item" onClick={() => { setIsUserPanelOpen(false); navigate('/'); }}>
                                    <span style={{ fontSize: '18px' }}>🌍</span> Về trang chủ
                                </button>
                            </div>
                            <button className="user-menu-item danger" onClick={handleLogout}>
                                <span style={{ fontSize: '18px' }}>🚪</span> Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL COMMAND PALETTE DÙNG PORTAL */}
            {isCommandOpen && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', paddingTop: '100px' }} onClick={() => setIsCommandOpen(false)}>
                    <style>
                        {`
                        @keyframes fadeInModal { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                        .command-palette-modal { width: 100%; max-width: 600px; background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); animation: fadeInModal 0.2s ease-out; display: flex; flex-direction: column; max-height: 80vh; margin: 0 20px; }
                        .command-input { width: 100%; padding: 20px 24px; font-size: 18px; color: #fff; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.1); outline: none; font-family: var(--sans); }
                        .command-input::placeholder { color: rgba(255,255,255,0.3); }
                        .search-result-item { padding: 12px 24px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.7); }
                        .search-result-item:hover { background: rgba(106, 176, 255, 0.1); color: #fff; }
                        .search-result-type { font-size: 11px; padding: 2px 8px; background: rgba(255,255,255,0.1); border-radius: 10px; color: #6ab0ff; }
                        `}
                    </style>
                    <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)' }}>🔍</span>
                            <input
                                ref={inputRef}
                                type="text"
                                className="command-input"
                                placeholder="Gõ tên trang cần tìm (vd: profile, setting, ho so)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>ESC để đóng</span>
                        </div>

                        <div style={{ padding: '16px 0', overflowY: 'auto', flex: 1 }}>
                            <div style={{ padding: '0 24px', fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                {searchQuery ? 'Kết quả tìm kiếm' : 'Gợi ý chuyển trang'}
                            </div>

                            {mockSearchResults.length > 0 ? (
                                mockSearchResults.map((item, idx) => (
                                    <div key={idx} className="search-result-item" onClick={() => handleNavigate(item.title, item.path)}>
                                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                                        <span style={{ flex: 1, fontSize: '15px', fontWeight: '500' }}>{item.title}</span>
                                        <span className="search-result-type">{item.type}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>↵</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>👻</div>
                                    Không tìm thấy kết quả nào cho "{searchQuery}"
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TopBar;