import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);

    // --- MOCK DATA ---
    const [workspace, setWorkspace] = useState({
        name: 'Smart Kanban Workspace',
        shortName: 'SKW',
        description: 'Không gian làm việc chính cho dự án Trello Clone. Áp dụng Clean Architecture & MongoDB.',
        visibility: 'private'
    });

    const [appearance, setAppearance] = useState({
        theme: 'glass',
        compactMode: false,
        showCardCovers: true
    });

    const auditLogs = [
        { id: 1, user: 'Sếp Trung', action: 'Đã thay đổi quyền hiển thị Workspace thành Riêng tư', time: '10 phút trước' },
        { id: 2, user: 'Hoàng Nam', action: 'Đã tạo bảng mới "API Services"', time: '2 giờ trước' },
        { id: 3, user: 'Hệ thống', action: 'Đã gia hạn gói Pro thành công', time: '1 ngày trước' },
        { id: 4, user: 'Minh Thư', action: 'Đã xóa thẻ "Thiết kế Logo cũ"', time: '2 ngày trước' },
    ];

    // --- HÀM XỬ LÝ LOGIC ---
    const handleWorkspaceChange = (e) => {
        const { name, value } = e.target;
        setWorkspace({ ...workspace, [name]: value });
    };

    const handleSaveGeneral = (e) => {
        e.preventDefault();
        if (!workspace.name.trim()) {
            toast.warning('⚠️ Tên Không gian làm việc không được để trống!');
            return;
        }
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('🎉 Đã lưu cấu hình Workspace thành công!');
        }, 1000);
    };

    const handleToggleAppearance = (key) => {
        setAppearance({ ...appearance, [key]: !appearance[key] });
        toast.info('Đã cập nhật giao diện hiển thị.', { autoClose: 1500 });
    };

    const handleDeleteWorkspace = () => {
        const confirmText = prompt(`CẢNH BÁO: Hành động này không thể hoàn tác! Vui lòng gõ "${workspace.name}" để xác nhận xóa:`);
        if (confirmText === workspace.name) {
            toast.error('🔥 Không gian làm việc đang bị xóa... (Mô phỏng API)');
        } else if (confirmText !== null) {
            toast.warning('❌ Xác nhận sai. Đã hủy thao tác xóa.');
        }
    };

    return (
        <div style={{ padding: '40px 30px', minHeight: '100%', backgroundColor: 'transparent', fontFamily: 'var(--sans)', overflowX: 'hidden' }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .glass-panel { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                
                .input-glass { width: 100%; padding: 12px 16px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; color: #fff; font-size: 14px; transition: all 0.3s ease; box-sizing: border-box; outline: none; }
                .input-glass:focus { border-color: #6ab0ff; box-shadow: 0 0 0 3px rgba(106, 176, 255, 0.15); background: rgba(0,0,0,0.5); }
                
                .btn-primary { background: linear-gradient(135deg, #0c66e4, #4A9FFF); border: none; color: #fff; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;}
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(12, 102, 228, 0.4); }

                .btn-danger-outline { background: transparent; border: 2px solid #ef4444; color: #ef4444; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
                .btn-danger-outline:hover { background: #ef4444; color: #fff; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); }

                .menu-item { width: 100%; text-align: left; padding: 14px 20px; background: transparent; border: none; color: rgba(255,255,255,0.6); font-weight: 600; font-size: 15px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
                .menu-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
                .menu-item.active { background: rgba(106, 176, 255, 0.15); color: #6ab0ff; border: 1px solid rgba(106, 176, 255, 0.2); }

                .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .toggle-switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .3s; border-radius: 24px; border: 1px solid rgba(255,255,255,0.2); }
                .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
                input:checked + .slider { background-color: #27c93f; border-color: #27c93f; }
                input:checked + .slider:before { transform: translateX(20px); }

                .theme-card { border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; text-align: center; color: rgba(255,255,255,0.6); font-weight: bold; background: rgba(0,0,0,0.2); }
                .theme-card:hover { border-color: rgba(255,255,255,0.3); }
                .theme-card.active { border-color: #6ab0ff; color: #fff; background: rgba(106, 176, 255, 0.1); box-shadow: 0 4px 15px rgba(106, 176, 255, 0.2); }

                .progress-track { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-top: 8px; }
                .progress-fill { height: 100%; border-radius: 10px; transition: width 0.5s ease-out; }
                `}
            </style>

            <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>

                {/* TIÊU ĐỀ TRANG */}
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', margin: '0 0 8px 0' }}>
                        ⚙️ Cài đặt Hệ thống
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>
                        Quản lý Không gian làm việc, gói cước và theo dõi nhật ký hoạt động.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>

                    {/* CỘT TRÁI: MENU ĐIỀU HƯỚNG */}
                    <div style={{ flex: '1 1 280px', maxWidth: '320px' }}>
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '24px', marginBottom: '24px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'linear-gradient(135deg, #8777D9, #0c66e4)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', fontWeight: 'bold', color: '#fff', boxShadow: '0 4px 10px rgba(12, 102, 228, 0.3)' }}>
                                    {workspace.shortName}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '16px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{workspace.name}</h3>
                                    <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', color: '#ffbd2e', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>★ Gói PRO</span>
                                </div>
                            </div>

                            <nav>
                                <button className={`menu-item ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
                                    <span>🏢</span> Tổng quan
                                </button>
                                <button className={`menu-item ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
                                    <span>🎨</span> Hiển thị & Giao diện
                                </button>
                                <button className={`menu-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
                                    <span>💳</span> Gói cước & Tài nguyên
                                </button>
                                <button className={`menu-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
                                    <span>🕵️‍♂️</span> Nhật ký kiểm toán
                                </button>
                                <button className={`menu-item ${activeTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveTab('advanced')}>
                                    <span>⚠️</span> Vùng nguy hiểm
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* CỘT PHẢI: KHU VỰC NỘI DUNG (FORMS) */}
                    <div style={{ flex: '2 1 600px' }}>
                        <div className="glass-panel" style={{ minHeight: '600px' }}>

                            {/* TAB 1: TỔNG QUAN WORKSPACE */}
                            {activeTab === 'general' && (
                                <form onSubmit={handleSaveGeneral} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>Cấu hình Không gian làm việc</h2>

                                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Tên Workspace</label>
                                            <input type="text" name="name" value={workspace.name} onChange={handleWorkspaceChange} className="input-glass" placeholder="Tên dự án hoặc công ty..." required />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Tên viết tắt</label>
                                            <input type="text" name="shortName" value={workspace.shortName} onChange={handleWorkspaceChange} className="input-glass" maxLength={4} />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Mô tả ngắn</label>
                                        <textarea name="description" value={workspace.description} onChange={handleWorkspaceChange} className="input-glass" rows="3" style={{ resize: 'none' }}></textarea>
                                    </div>

                                    <div style={{ marginBottom: '32px' }}>
                                        <label style={{ display: 'block', marginBottom: '12px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>Quyền hiển thị mặc định</label>
                                        <select name="visibility" value={workspace.visibility} onChange={handleWorkspaceChange} className="input-glass" style={{ cursor: 'pointer', appearance: 'none' }}>
                                            <option value="private" style={{ background: '#0f172a' }}>🔒 Riêng tư (Chỉ thành viên được mời mới nhìn thấy)</option>
                                            <option value="public" style={{ background: '#0f172a' }}>🌐 Công khai (Bất kỳ ai có link đều có thể xem)</option>
                                        </select>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                                        <button type="submit" className="btn-primary" disabled={isSaving}>
                                            {isSaving ? '⏳ Đang lưu...' : '💾 Lưu cấu hình'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* TAB 2: GIAO DIỆN & HIỂN THỊ */}
                            {activeTab === 'appearance' && (
                                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>Tùy chỉnh Giao diện</h2>

                                    <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '16px' }}>Theme tổng thể</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                                        <div className={`theme-card ${appearance.theme === 'glass' ? 'active' : ''}`} onClick={() => setAppearance({ ...appearance, theme: 'glass' })}>
                                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌌</div>
                                            Kính mờ
                                        </div>
                                        <div className={`theme-card ${appearance.theme === 'dark' ? 'active' : ''}`} onClick={() => toast.info('Tính năng đang phát triển')}>
                                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌙</div>
                                            Tối (Dark)
                                        </div>
                                        <div className={`theme-card ${appearance.theme === 'light' ? 'active' : ''}`} onClick={() => toast.info('Chói mắt lắm, sếp đừng xài 😂')}>
                                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>☀️</div>
                                            Sáng (Light)
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>Tùy chọn Bảng Kanban</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Chế độ thu gọn (Compact Mode)</div>
                                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Thu nhỏ font chữ và khoảng cách để xem được nhiều task hơn.</div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input type="checkbox" checked={appearance.compactMode} onChange={() => handleToggleAppearance('compactMode')} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Hiển thị ảnh bìa thẻ (Card Covers)</div>
                                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Tắt đi nếu sếp muốn Board tải nhanh hơn.</div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input type="checkbox" checked={appearance.showCardCovers} onChange={() => handleToggleAppearance('showCardCovers')} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: GÓI CƯỚC & TÀI NGUYÊN (MỚI) */}
                            {activeTab === 'billing' && (
                                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                                        <h2 style={{ fontSize: '20px', color: '#fff', margin: 0 }}>Gói cước & Tài nguyên</h2>
                                        <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#ffbd2e', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Smart Kanban PRO</span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#fff', marginBottom: '8px', fontWeight: '600' }}>
                                                <span>Dung lượng lưu trữ đính kèm</span>
                                                <span>4.2 GB / 10 GB</span>
                                            </div>
                                            <div className="progress-track"><div className="progress-fill" style={{ width: '42%', backgroundColor: '#6ab0ff' }}></div></div>
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#fff', marginBottom: '8px', fontWeight: '600' }}>
                                                <span>Số lượng Board (Bảng)</span>
                                                <span>12 / Không giới hạn</span>
                                            </div>
                                            <div className="progress-track"><div className="progress-fill" style={{ width: '15%', backgroundColor: '#27c93f' }}></div></div>
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#fff', marginBottom: '8px', fontWeight: '600' }}>
                                                <span>Số lượng Thành viên</span>
                                                <span>5 / 50</span>
                                            </div>
                                            <div className="progress-track"><div className="progress-fill" style={{ width: '10%', backgroundColor: '#8777D9' }}></div></div>
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(106, 176, 255, 0.05)', border: '1px solid rgba(106, 176, 255, 0.2)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ color: '#fff', fontSize: '16px', margin: '0 0 8px 0' }}>Chu kỳ thanh toán</h4>
                                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0 }}>Gói Pro của sếp sẽ tự động gia hạn vào ngày <strong>15/12/2026</strong>.</p>
                                        </div>
                                        <button className="btn-primary" onClick={() => toast.info('Chuyển hướng đến cổng thanh toán Stripe...')}>
                                            💳 Quản lý thanh toán
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: NHẬT KÝ KIỂM TOÁN (MỚI) */}
                            {activeTab === 'audit' && (
                                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                                        <h2 style={{ fontSize: '20px', color: '#fff', margin: 0 }}>Nhật ký kiểm toán (Audit Logs)</h2>
                                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => toast.success('Đã tải CSV Nhật ký!')}>📥 Xuất CSV</button>
                                    </div>

                                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                                        {auditLogs.map((log) => (
                                            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div>
                                                    <div style={{ color: '#fff', fontSize: '14px', marginBottom: '4px', lineHeight: '1.4' }}>
                                                        <strong style={{ color: '#6ab0ff' }}>{log.user}</strong>: {log.action}
                                                    </div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', display: 'flex', gap: '12px' }}>
                                                        <span>🕒 {log.time}</span>
                                                        <span>🌐 IP: 192.168.1.xxx</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB 5: VÙNG NGUY HIỂM (DANGER ZONE) */}
                            {activeTab === 'advanced' && (
                                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <h2 style={{ fontSize: '20px', color: '#ef4444', margin: '0 0 24px 0', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '16px' }}>⚠️ Vùng Nguy Hiểm (Danger Zone)</h2>

                                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                            <div>
                                                <h4 style={{ color: '#fff', fontSize: '16px', margin: '0 0 8px 0' }}>Chuyển quyền sở hữu Workspace</h4>
                                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0 }}>Giao lại toàn quyền quản trị cho một thành viên khác.</p>
                                            </div>
                                            <button className="btn-danger-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => toast.info('Tính năng đang phát triển')}>Chuyển quyền</button>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h4 style={{ color: '#ef4444', fontSize: '16px', margin: '0 0 8px 0' }}>Xóa Không gian làm việc</h4>
                                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0, maxWidth: '300px', lineHeight: '1.5' }}>
                                                    Một khi đã xóa, <strong>TOÀN BỘ</strong> dữ liệu, dự án, bảng Kanban và cấu hình sẽ biến mất vĩnh viễn. Hành động này không thể khôi phục!
                                                </p>
                                            </div>
                                            <button className="btn-danger-outline" onClick={handleDeleteWorkspace}>🗑️ Xóa vĩnh viễn</button>
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

export default Settings;