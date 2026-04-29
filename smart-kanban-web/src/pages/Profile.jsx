import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const generateHeatmap = () => {
    return Array.from({ length: 60 }).map(() => Math.floor(Math.random() * 5)); 
};

const Profile = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { fullName: 'Sếp Trung', email: 'trung@smartkanban.vn' };

    const [profileData, setProfileData] = useState({
        fullName: user.fullName || user.name || 'Sếp Trung',
        email: user.email || 'trung@smartkanban.vn',
        phone: '0987 654 321',
        role: 'C# Full Stack Developer',
        bio: 'Đam mê Clean Architecture & Onion. Đang xây dựng hệ thống Smart Kanban với MongoDB.',
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${user.fullName || 'Trung'}`,
        joinedAt: 'Tháng 1, 2026',
        skills: ['C#', '.NET Core', 'MongoDB', 'ReactJS', 'SignalR']
    });

    const [passwords, setPasswords] = useState({ current: '', newPass: '', confirmPass: '' });
    const [twoFactorAuth, setTwoFactorAuth] = useState(true);
    const [apiTokens, setApiTokens] = useState([
        { id: 1, name: 'Trello Sync Script', created: '2 ngày trước', lastUsed: 'Vừa xong' }
    ]);
    const [notifications, setNotifications] = useState({ emailAssigned: true, emailMentioned: true, emailDeadline: true, pushUpdates: false });
    const [integrations, setIntegrations] = useState({ github: true, slack: false, drive: true });
    const [heatmapData] = useState(generateHeatmap());

    // --- STATES ĐIỀU KHIỂN ---
    const [activeTab, setActiveTab] = useState('profile'); 
    const [isSaving, setIsSaving] = useState(false);

    // --- HÀM XỬ LÝ LOGIC ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData({ ...profileData, [name]: value });
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswords({ ...passwords, [name]: value });
    };

    const handleToggleNotification = (key) => {
        setNotifications({ ...notifications, [key]: !notifications[key] });
        toast.info('Đã cập nhật tùy chọn thông báo!', { autoClose: 1500 });
    };

    const handleToggleIntegration = (app) => {
        setIntegrations({ ...integrations, [app]: !integrations[app] });
        toast.success(`Đã ${!integrations[app] ? 'kết nối' : 'ngắt kết nối'} với ${app.toUpperCase()}!`, { autoClose: 1500 });
    };

    const handleGenerateToken = () => {
        toast.info('⏳ Đang khởi tạo mã Token mới...');
        setTimeout(() => {
            setApiTokens([{ id: Date.now(), name: 'New API Token', created: 'Vừa xong', lastUsed: 'Chưa sử dụng' }, ...apiTokens]);
            toast.success('🔑 Đã tạo Personal Access Token thành công!');
        }, 1000);
    };

    const handleSaveProfile = (e) => {
        e.preventDefault();
        if (!profileData.fullName.trim()) {
            toast.warning('⚠️ Tên hiển thị không được để trống!');
            return;
        }
        setIsSaving(true);
        setTimeout(() => {
            const updatedUser = { ...user, fullName: profileData.fullName, name: profileData.fullName };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setIsSaving(false);
            toast.success('🎉 Đã lưu thông tin hồ sơ thành công!');
        }, 1000);
    };

    const handleUpdatePassword = (e) => {
        e.preventDefault();
        if (passwords.newPass !== passwords.confirmPass) {
            toast.error('❌ Mật khẩu xác nhận không khớp!');
            return;
        }
        setIsSaving(true);
        setTimeout(() => {
            setPasswords({ current: '', newPass: '', confirmPass: '' });
            setIsSaving(false);
            toast.success('🔒 Đã đổi mật khẩu an toàn!');
        }, 1000);
    };

    const getHeatmapColor = (level) => {
        const colors = ['rgba(255,255,255,0.05)', '#0e4429', '#006d32', '#26a641', '#39d353'];
        return colors[level] || colors[0];
    };

    return (
        <div style={{ padding: '40px 30px', minHeight: '100%', backgroundColor: 'transparent', fontFamily: 'var(--sans)', overflowX: 'hidden' }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .glass-panel { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                
                .input-glass { width: 100%; padding: 12px 16px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; color: #fff; font-size: 14px; transition: all 0.3s ease; box-sizing: border-box; outline: none; }
                .input-glass:focus { border-color: #6ab0ff; box-shadow: 0 0 0 3px rgba(106, 176, 255, 0.15); background: rgba(0,0,0,0.5); }
                .input-glass:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .btn-primary { background: linear-gradient(135deg, #0c66e4, #4A9FFF); border: none; color: #fff; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center;}
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(12, 102, 228, 0.4); }

                .btn-outline { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s;}
                .btn-outline:hover { background: rgba(255,255,255,0.1); border-color: #6ab0ff; color: #6ab0ff; }

                /* CSS Cho Sidebar Menu */
                .menu-item { width: 100%; text-align: left; padding: 14px 20px; background: transparent; border: none; color: rgba(255,255,255,0.6); font-weight: 600; font-size: 15px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
                .menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
                .menu-item.active { background: rgba(106, 176, 255, 0.15); color: #6ab0ff; border: 1px solid rgba(106, 176, 255, 0.2); }

                /* CSS Toggle Switch */
                .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .toggle-switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .3s; border-radius: 24px; border: 1px solid rgba(255,255,255,0.2); }
                .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
                input:checked + .slider { background-color: #27c93f; border-color: #27c93f; }
                input:checked + .slider:before { transform: translateX(20px); }

                .device-item { display: flex; justify-content: space-between; alignItems: center; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .device-item:last-child { border-bottom: none; padding-bottom: 0; }

                .integration-card { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; margin-bottom: 16px;}
                .integration-card:hover { border-color: rgba(106, 176, 255, 0.4); background: rgba(255,255,255,0.02); }
                `}
            </style>

            <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>

                {/* TIÊU ĐỀ TRANG */}
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', margin: '0 0 8px 0' }}>
                        ⚙️ Cài đặt tài khoản
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>
                        Quản lý hồ sơ công khai, tích hợp hệ thống và bảo mật cá nhân.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>

                    {/* CỘT TRÁI: MENU ĐIỀU HƯỚNG */}
                    <div style={{ flex: '1 1 280px', maxWidth: '320px' }}>
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            {/* Khu vực Avatar Mini */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '24px', marginBottom: '24px' }}>
                                <img src={profileData.avatarUrl} alt="Avatar" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />
                                <div style={{ overflow: 'hidden' }}>
                                    <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '18px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{profileData.fullName}</h3>
                                    <p style={{ margin: 0, color: '#6ab0ff', fontSize: '13px', fontWeight: '600' }}>{profileData.role}</p>
                                </div>
                            </div>

                            {/* Danh sách Menu */}
                            <nav>
                                <button className={`menu-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                                    <span>👤</span> Hồ sơ & Kỹ năng
                                </button>
                                <button className={`menu-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
                                    <span>🔔</span> Cài đặt thông báo
                                </button>
                                <button className={`menu-item ${activeTab === 'integrations' ? 'active' : ''}`} onClick={() => setActiveTab('integrations')}>
                                    <span>🔗</span> Tích hợp ứng dụng
                                </button>
                                <button className={`menu-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
                                    <span>🛡️</span> Bảo mật & API Token
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* CỘT PHẢI: KHU VỰC NỘI DUNG (FORMS) */}
                    <div style={{ flex: '2 1 500px' }}>
                        <div className="glass-panel" style={{ minHeight: '600px' }}>

                            {/* ============================== */}
                            {/* TAB 1: HỒ SƠ & KỸ NĂNG */}
                            {/* ============================== */}
                            {activeTab === 'profile' && (
                                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>Hồ sơ công khai</h2>

                                    <form onSubmit={handleSaveProfile}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Họ và tên</label>
                                                <input type="text" name="fullName" value={profileData.fullName} onChange={handleInputChange} className="input-glass" required />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Email (Tài khoản)</label>
                                                <input type="email" value={profileData.email} className="input-glass" disabled />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Chức danh / Vai trò</label>
                                                <input type="text" name="role" value={profileData.role} onChange={handleInputChange} className="input-glass" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Số điện thoại</label>
                                                <input type="text" name="phone" value={profileData.phone} onChange={handleInputChange} className="input-glass" />
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '24px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Giới thiệu ngắn (Bio)</label>
                                            <textarea name="bio" value={profileData.bio} onChange={handleInputChange} className="input-glass" rows="3" style={{ resize: 'none' }}></textarea>
                                        </div>

                                        {/* Hiển thị Kỹ năng */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <label style={{ display: 'block', marginBottom: '12px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Công nghệ sử dụng (Tech Stack)</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {profileData.skills.map((skill, idx) => (
                                                    <span key={idx} style={{ background: 'rgba(106, 176, 255, 0.1)', border: '1px solid rgba(106, 176, 255, 0.3)', color: '#6ab0ff', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                                                        {skill}
                                                    </span>
                                                ))}
                                                <button type="button" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.3)', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer' }}>+ Thêm</button>
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', marginBottom: '40px' }}>
                                            <button type="submit" className="btn-primary" disabled={isSaving}>
                                                {isSaving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                                            </button>
                                        </div>
                                    </form>

                                    {/* BIỂU ĐỒ HEATMAP ĐÓNG GÓP ĐƯỢC CHUYỂN VÀO ĐÂY */}
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ color: '#fff', fontSize: '16px', margin: 0 }}>📊 Tần suất hoạt động</h3>
                                            <span style={{ color: '#27c93f', fontSize: '13px', fontWeight: 'bold', background: 'rgba(39, 201, 63, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>318 Cống hiến</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: '6px' }}>
                                            {heatmapData.map((level, idx) => (
                                                <div key={idx} title={`Hoạt động mức ${level}`} style={{ width: '100%', aspectRatio: '1/1', backgroundColor: getHeatmapColor(level), borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============================== */}
                            {/* TAB 2: CÀI ĐẶT THÔNG BÁO */}
                            {/* ============================== */}
                            {activeTab === 'notifications' && (
                                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>Thông báo Email</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                                        {[
                                            { id: 'emailAssigned', title: 'Task mới được giao', desc: 'Nhận email khi có người phân công công việc cho bạn.' },
                                            { id: 'emailMentioned', title: 'Có người nhắc tên (@mention)', desc: 'Nhận email khi ai đó @tag tên bạn trong bình luận.' },
                                            { id: 'emailDeadline', title: 'Cảnh báo Deadline', desc: 'Gửi email nhắc nhở trước 24h khi task sắp quá hạn.' }
                                        ].map(item => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ color: '#fff', fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{item.title}</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{item.desc}</div>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" checked={notifications[item.id]} onChange={() => handleToggleNotification(item.id)} />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>

                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>Thông báo Trình duyệt</h2>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ color: '#fff', fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>Cập nhật theo thời gian thực (Push)</div>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Hiển thị popup nhỏ ở góc màn hình khi có cập nhật mới.</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={notifications.pushUpdates} onChange={() => handleToggleNotification('pushUpdates')} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* ============================== */}
                            {/* TAB 3: TÍCH HỢP ỨNG DỤNG */}
                            {/* ============================== */}
                            {activeTab === 'integrations' && (
                                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 8px 0' }}>Tích hợp Hệ sinh thái</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '24px' }}>Kết nối tài khoản của bạn với các công cụ phát triển phổ biến.</p>

                                    <div className="integration-card">
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div style={{ width: '48px', height: '48px', background: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🐙</div>
                                            <div>
                                                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>GitHub</div>
                                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Tự động gắn link Commit và Pull Request vào Task.</div>
                                            </div>
                                        </div>
                                        <button className={integrations.github ? "btn-outline" : "btn-primary"} onClick={() => handleToggleIntegration('github')} style={{ borderColor: integrations.github ? '#ef4444' : '', color: integrations.github ? '#ef4444' : '' }}>
                                            {integrations.github ? 'Ngắt kết nối' : 'Kết nối'}
                                        </button>
                                    </div>

                                    <div className="integration-card">
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div style={{ width: '48px', height: '48px', background: '#4A154B', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💬</div>
                                            <div>
                                                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Slack</div>
                                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Gửi thông báo trực tiếp vào kênh Chat của đội ngũ.</div>
                                            </div>
                                        </div>
                                        <button className={integrations.slack ? "btn-outline" : "btn-primary"} onClick={() => handleToggleIntegration('slack')} style={{ borderColor: integrations.slack ? '#ef4444' : '', color: integrations.slack ? '#ef4444' : '' }}>
                                            {integrations.slack ? 'Ngắt kết nối' : 'Kết nối'}
                                        </button>
                                    </div>

                                    <div className="integration-card">
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div style={{ width: '48px', height: '48px', background: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📁</div>
                                            <div>
                                                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Google Drive</div>
                                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Đính kèm trực tiếp tài liệu vào thẻ Kanban.</div>
                                            </div>
                                        </div>
                                        <button className={integrations.drive ? "btn-outline" : "btn-primary"} onClick={() => handleToggleIntegration('drive')} style={{ borderColor: integrations.drive ? '#ef4444' : '', color: integrations.drive ? '#ef4444' : '' }}>
                                            {integrations.drive ? 'Ngắt kết nối' : 'Kết nối'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ============================== */}
                            {/* TAB 4: MẬT KHẨU, 2FA & API */}
                            {/* ============================== */}
                            {activeTab === 'security' && (
                                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>

                                    {/* 2FA */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(106, 176, 255, 0.05)', border: '1px solid rgba(106, 176, 255, 0.2)', padding: '20px', borderRadius: '16px', marginBottom: '32px' }}>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            <div style={{ fontSize: '28px' }}>🔐</div>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>Xác thực 2 bước (2FA)</div>
                                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Tăng cường bảo mật bằng mã OTP điện thoại.</div>
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={twoFactorAuth} onChange={() => { setTwoFactorAuth(!twoFactorAuth); toast.success('Đã cập nhật trạng thái 2FA!'); }} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    {/* Đổi mật khẩu */}
                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>Đổi mật khẩu</h2>
                                    <form onSubmit={handleUpdatePassword} style={{ maxWidth: '400px', marginBottom: '40px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Mật khẩu hiện tại</label>
                                                <input type="password" name="current" value={passwords.current} onChange={handlePasswordChange} className="input-glass" required />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Mật khẩu mới</label>
                                                <input type="password" name="newPass" value={passwords.newPass} onChange={handlePasswordChange} className="input-glass" required />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Xác nhận mật khẩu mới</label>
                                                <input type="password" name="confirmPass" value={passwords.confirmPass} onChange={handlePasswordChange} className="input-glass" required />
                                            </div>
                                            <button type="submit" className="btn-primary" disabled={isSaving} style={{ marginTop: '8px' }}>
                                                {isSaving ? '⏳ Đang xử lý...' : 'Cập nhật mật khẩu'}
                                            </button>
                                        </div>
                                    </form>

                                    {/* Quản lý API Token */}
                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        Mã truy cập API (Tokens)
                                        <button className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={handleGenerateToken}>+ Tạo Token Mới</button>
                                    </h2>
                                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '40px' }}>
                                        {apiTokens.map(token => (
                                            <div key={token.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div>
                                                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{token.name}</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Tạo lúc: {token.created} • Dùng lần cuối: {token.lastUsed}</div>
                                                </div>
                                                <button style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>Thu hồi</button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Lịch sử thiết bị */}
                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>Thiết bị đã đăng nhập</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div className="device-item">
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '24px' }}>💻</span>
                                                <div>
                                                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>Windows • Chrome</div>
                                                    <div style={{ color: '#27c93f', fontSize: '12px' }}>Thiết bị hiện tại</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="device-item">
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '24px', opacity: 0.6 }}>📱</span>
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>iPhone 14 Pro • Safari</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Hoạt động 2 ngày trước</div>
                                                </div>
                                            </div>
                                            <button style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>Đăng xuất</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="dark" />
        </div>
    );
};

export default Profile;