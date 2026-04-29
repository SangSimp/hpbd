import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from '../api/axiosConfig';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HubConnectionBuilder } from '@microsoft/signalr';

const Members = () => {
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [editingRoleFor, setEditingRoleFor] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [boards, setBoards] = useState([]);
    const [selectedBoardId, setSelectedBoardId] = useState('');
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : { fullName: 'Sếp', id: '1' };
    // 💡 BỘ ĐỊNH VỊ POP-UP BAY THEO CHUỘT
    const [customTooltip, setCustomTooltip] = useState({ show: false, x: 0, y: 0, board: '', col: '', isDone: false });
    // 💡 BỘ MÁY DỊCH THỜI GIAN (ĐÃ CÀI BỘ LỌC CHỐNG XUYÊN KHÔNG)
    const formatLastActive = (dateString) => {
        if (!dateString) return 'Chưa có dữ liệu';

        const d = new Date(dateString);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) {
            return 'Chưa có dữ liệu';
        }

        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    };

    let globalRole = 'member';
    try {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            Object.keys(payload).forEach(key => {
                if (key.toLowerCase().includes('role')) globalRole = String(payload[key]).toLowerCase();
            });
        }
    } catch { /* empty */ }
    const isAdmin = globalRole === 'admin';
    const location = useLocation(); // 💡 Khởi tạo công cụ đọc URL
    const navigate = useNavigate();

    // 💡 TỰ ĐỘNG BẮT ĐUÔI URL VÀ BẬT MODAL NHÂN VIÊN
    // 💡 TỰ ĐỘNG BẬT MODAL VÀ DỌN DẸP URL
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const viewUserId = queryParams.get('viewUserId');

        if (viewUserId && members.length > 0) {
            const targetUser = members.find(m => String(m.id) === String(viewUserId));

            if (targetUser) {
                setSelectedMember(targetUser); // Bật Modal

                // 💡 Bật xong thì lén xóa cái đuôi ?viewUserId=... đi cho URL sạch đẹp
                // Và để tránh trường hợp Modal tự bật lại khi danh sách nhân sự load ngầm
                navigate(location.pathname, { replace: true });
            } else {
                toast.warning("🕵️‍♂️ Không tìm thấy thông tin chi tiết của nhân viên này!");
                navigate(location.pathname, { replace: true });
            }
        }
    }, [location.search, members, navigate, location.pathname]);
    useEffect(() => {
        let isMounted = true;
        let connection = null;

        const initializePage = async () => {
            try {
                // 🚗 BƯỚC 1: CHỜ API TẢI XONG DANH SÁCH NHÂN VIÊN TRƯỚC (Rất quan trọng)
                const response = await axios.get('/api/v1/users');
                let loadedMembers = response.data.map(u => ({
                    id: u.id || u.Id,
                    name: u.name || u.fullName || u.FullName || 'Không tên',
                    email: u.email || u.Email,
                    role: u.role || u.Role || 'member',
                    position: u.position || u.Position || 'Nhân viên',
                    status: 'offline', // Mặc định ai cũng offline
                    joinedAt: u.joinedAt || new Date().toISOString().split('T')[0],
                    lastActive: (u.lastActive || u.LastActive || u.updatedAt || u.UpdatedAt) ? formatLastActive(u.lastActive || u.LastActive || u.updatedAt || u.UpdatedAt) : 'Chưa có dữ liệu',
                    phone: u.phone || 'Chưa cập nhật',
                    department: u.department || 'Chưa phân bổ',
                    tasks: u.tasks || u.Tasks || 0,
                    completedTasks: u.completedTasks || u.CompletedTasks || [],
                    doingTasks: u.doingTasks || u.DoingTasks || [],
                    bio: 'Thành viên hệ thống Smart Kanban'
                }));

                // 🚀 BƯỚC 2: BẬT SIGNAL-R LÊN
                let rawToken = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
                let myToken = rawToken.replace(/['"]+/g, '');

                connection = new HubConnectionBuilder()
                    .withUrl("http://localhost:5078/hubs/kanban", { accessTokenFactory: () => myToken })
                    .withAutomaticReconnect()
                    .build();

                await connection.start();

                // 🎯 BƯỚC 3: HỎI XEM AI ĐANG ONLINE VÀ ĐẬP VÀO DANH SÁCH VỪA TẢI XONG
                const onlineUserIds = await connection.invoke("GetOnlineUsers");
                const onlineIdsStr = onlineUserIds.map(id => String(id)); // Chuyển hết sang chuỗi cho chắc ăn

                loadedMembers = loadedMembers.map(m =>
                    onlineIdsStr.includes(String(m.id)) ? { ...m, status: 'online', lastActive: 'Đang hoạt động' } : m
                );

                // 💡 BƯỚC 4: LƯU VÀO GIAO DIỆN (Làm 1 lần duy nhất để không bị đè dữ liệu)
                if (isMounted) {
                    setMembers(loadedMembers);
                    setIsLoading(false);
                }

                // 📡 BƯỚC 5: CẮM ĂNG-TEN NGHE SỰ KIỆN TỪ BÂY GIỜ TRỞ ĐI
                connection.on("UserOnline", (userId) => {
                    if (isMounted) setMembers(prev => prev.map(m => String(m.id) === String(userId) ? { ...m, status: 'online', lastActive: 'Đang hoạt động' } : m));
                });

                connection.on("UserOffline", (userId) => {
                    if (isMounted) setMembers(prev => prev.map(m => String(m.id) === String(userId) ? { ...m, status: 'offline', lastActive: formatLastActive(new Date().toISOString()) } : m));
                });

            } catch (error) {
                console.error("Lỗi khởi tạo trang Nhân sự:", error);
                toast.error("❌ Lỗi đồng bộ dữ liệu nhân sự!");
                if (isMounted) setIsLoading(false);
            }
        };

        initializePage(); // Bắt đầu chạy luồng tuần tự

        return () => {
            isMounted = false;
            if (connection) connection.stop().catch(e => console.error(e));
        };
    }, []);

    useEffect(() => {
        const fetchMyBoards = async () => {
            try {
                const response = await axios.get('/api/v1/boards');
                const myBoards = Array.isArray(response.data) ? response.data : [];
                setBoards(myBoards);
                if (myBoards.length > 0) setSelectedBoardId(myBoards[0].id || myBoards[0].Id);
            } catch (error) { console.error("Lỗi lấy Bảng:", error); }
        };
        fetchMyBoards();
    }, []);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) { toast.warning("⚠️ Vui lòng nhập Email!"); return; }
        if (!selectedBoardId) { toast.warning("⚠️ Chưa chọn Dự án!"); return; }

        setIsInviting(true);
        try {
            let rawToken = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
            let myToken = rawToken.replace(/['"]+/g, '');
            const response = await axios.post(`http://localhost:5078/api/v1/boards/${selectedBoardId}/invite`, {
                email: inviteEmail, role: inviteRole
            }, { headers: { Authorization: `Bearer ${myToken}` } });

            const newMember = {
                id: response.data.userId, name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole, position: 'Nhân viên',
                status: 'offline', joinedAt: new Date().toISOString().split('T')[0], lastActive: 'Chưa truy cập', phone: 'Chưa cập nhật', department: 'Chưa phân bổ', tasks: 0, bio: 'Thành viên mới.'
            };
            setMembers(prev => [...prev, newMember]);
            setInviteEmail('');
            toast.success(`🎉 Đã cấp quyền cho ${inviteEmail}!`);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Lỗi máy chủ khi mời thành viên!";
            toast.error(`❌ ${errorMsg}`);
        } finally { setIsInviting(false); }
    };

    const handleCopyInviteLink = () => {
        const fakeLink = `https://smartkanban.vn/invite/join?token=${Math.random().toString(36).substr(2, 9)}`;
        navigator.clipboard.writeText(fakeLink);
        toast.success("📋 Đã copy Link Mời!");
    };

    const handleRemoveMember = (id, name, e) => {
        if (e) e.stopPropagation();
        if (id === currentUser.id) { toast.error("❌ Không thể tự đuổi chính mình!"); return; }
        if (window.confirm(`⚠️ Có chắc chắn muốn đuổi "${name}" khỏi hệ thống?`)) {
            setMembers(members.filter(m => m.id !== id));
            if (selectedMember && selectedMember.id === id) setSelectedMember(null);
            toast.success(`👋 Đã xóa ${name}.`);
        }
    };

    const handleChangeRole = async (id, newRole, name, e) => {
        if (e) e.stopPropagation();
        const toastId = toast.loading("⏳ Đang lưu quyền...");
        try {
            await axios.put(`/api/v1/users/${id}/role`, { role: newRole });
            setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m));
            setEditingRoleFor(null);
            if (selectedMember && selectedMember.id === id) setSelectedMember({ ...selectedMember, role: newRole });
            toast.update(toastId, { render: `🔄 Đã cấp quyền [${newRole.toUpperCase()}] cho ${name}.`, type: "success", isLoading: false, autoClose: 3000 });
        } catch {
            toast.update(toastId, { render: "❌ Lỗi: Không thể đổi quyền!", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    const handleUpdatePosition = async (id, newPosition, name, e) => {
        if (e) e.stopPropagation();
        const toastId = toast.loading("⏳ Đang cập nhật chức vụ...");
        try {
            await axios.put(`/api/v1/users/${id}/position`, { position: newPosition });
            setMembers(members.map(m => m.id === id ? { ...m, position: newPosition } : m));
            if (selectedMember && selectedMember.id === id) setSelectedMember({ ...selectedMember, position: newPosition });
            toast.update(toastId, { render: `✅ Đã cập nhật chức vụ [${newPosition}] cho ${name}.`, type: "success", isLoading: false, autoClose: 3000 });
        } catch {
            toast.update(toastId, { render: "❌ Lỗi: Không thể cập nhật chức vụ!", type: "error", isLoading: false, autoClose: 3000 });
        }
    };

    const filteredMembers = members.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchTab = activeTab === 'all' || m.role === activeTab;
        return matchSearch && matchTab;
    });

    const totalMembers = members.length;
    const onlineMembers = members.filter(m => m.status === 'online').length;
    const adminMembers = members.filter(m => m.role === 'admin').length;

    const renderMemberDetailModal = () => {
        if (!selectedMember) return null;
        const portalRoot = document.getElementById('root') || document.body;
        const roleColor = selectedMember.role === 'admin' ? '#ef4444' : selectedMember.role === 'member' ? '#6ab0ff' : '#ffbd2e';
        const roleName = selectedMember.role === 'admin' ? 'Quản trị viên' : selectedMember.role === 'member' ? 'Thành viên' : 'Người xem';

        return createPortal(
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setSelectedMember(null)}>
                <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(24px)', width: '600px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                    <div style={{ height: '120px', background: `linear-gradient(135deg, ${roleColor}40 0%, rgba(30, 41, 59, 0) 100%)`, position: 'relative' }}>
                        <button onClick={() => setSelectedMember(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', cursor: 'pointer', color: '#fff', transition: 'all 0.2s', backdropFilter: 'blur(5px)' }} onMouseEnter={e => { e.target.style.backgroundColor = '#ef4444'; e.target.style.borderColor = '#ef4444'; }} onMouseLeave={e => { e.target.style.backgroundColor = 'rgba(0,0,0,0.4)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}>✖</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-60px', position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                            {/* 💡 ĐỔI SANG MICAH VÀ THÊM NỀN XANH CHO MODAL */}
                            <img src={`https://api.dicebear.com/7.x/micah/svg?seed=${selectedMember.id}`} alt="avatar" style={{ width: '120px', height: '120px', borderRadius: '30px', backgroundColor: '#0c66e4', border: '4px solid rgba(30, 41, 59, 1)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', objectFit: 'cover' }} />                            <div className={selectedMember.status === 'online' ? 'status-dot-online' : 'status-dot-offline'} style={{ width: '20px', height: '20px', position: 'absolute', bottom: '4px', right: '4px', borderWidth: '3px' }} title={selectedMember.status}></div>
                        </div>
                    </div>
                    {/* 💡 Bật thanh cuộn và giới hạn chiều cao 70vh */}
                    <div style={{ padding: '20px 32px 32px 32px', textAlign: 'center', overflowY: 'auto', maxHeight: '70vh' }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#fff', fontWeight: '900' }}>{selectedMember.name}</h2>

                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <span style={{ color: roleColor, background: `${roleColor}15`, padding: '6px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', border: `1px solid ${roleColor}50`, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {roleName}
                            </span>
                            <span style={{ color: '#fff', background: `rgba(255,255,255,0.1)`, padding: '6px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', border: `1px solid rgba(255,255,255,0.2)`, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {selectedMember.position}
                            </span>
                        </div>

                        <p style={{ margin: '0 0 30px 0', color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontStyle: 'italic', lineHeight: '1.6' }}>"{selectedMember.bio}"</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>📧 Email</div>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500', wordBreak: 'break-all' }}>{selectedMember.email}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>📞 Điện thoại</div>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{selectedMember.phone}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>🏢 Phòng ban</div>
                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{selectedMember.department}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>⚡ Trạng thái</div>
                                <div style={{ color: selectedMember.status === 'online' ? '#27c93f' : 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: '500' }}>{selectedMember.lastActive}</div>
                            </div>
                        </div>
                        {/* 💡 BÁO CÁO CÔNG VIỆC DÀNH CHO ADMIN */}
                        {isAdmin && (
                            <div style={{ marginTop: '24px', textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h4 style={{ margin: '0 0 16px 0', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📊 Báo cáo công việc chi tiết
                                </h4>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

                                    {/* CỘT 1: ĐÃ HOÀN THÀNH */}
                                    <div style={{ flex: 1, background: 'rgba(39, 201, 63, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(39, 201, 63, 0.2)' }}>
                                        <div style={{ color: '#27c93f', fontWeight: 'bold', marginBottom: '12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>✅ ĐÃ HOÀN THÀNH</span>
                                            <span style={{ background: 'rgba(39, 201, 63, 0.2)', padding: '2px 8px', borderRadius: '10px' }}>{selectedMember.completedTasks?.length || 0}</span>
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: '16px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: '1.6', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                                            {selectedMember.completedTasks?.length > 0 ? (
                                                selectedMember.completedTasks.map((t, i) => (
                                                    <li key={`done-${i}`}
                                                        style={{ marginBottom: '8px' }}
                                                        // 💡 CẢM BIẾN ĐÃ ĐƯỢC CHUYỂN LÊN THẺ LI
                                                        onMouseEnter={(e) => setCustomTooltip({
                                                            show: true, x: e.clientX, y: e.clientY,
                                                            board: t.boardName || t.BoardName || 'Chưa rõ dự án',
                                                            col: t.columnName || t.ColumnName || 'Chưa rõ cột',
                                                            isDone: true
                                                        })}
                                                        onMouseMove={(e) => setCustomTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                                                        onMouseLeave={() => setCustomTooltip({ show: false, x: 0, y: 0, board: '', col: '', isDone: false })}
                                                    >
                                                        {t.boardId || t.BoardId ? (
                                                            <Link
                                                                to={`/d/boards/${t.boardId || t.BoardId}`}
                                                                style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', borderBottom: '1px dashed rgba(255,255,255,0.3)', transition: 'all 0.2s', display: 'inline-block' }}
                                                                onMouseEnter={e => { e.target.style.color = '#27c93f'; e.target.style.borderColor = '#27c93f'; }}
                                                                onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.9)'; e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                                                            >
                                                                {t.title || t.Title || t}
                                                            </Link>
                                                        ) : (
                                                            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{t.title || t.Title || t}</span>
                                                        )}
                                                    </li>
                                                ))
                                            ) : (<li style={{ listStyle: 'none', marginLeft: '-16px', opacity: 0.5, fontStyle: 'italic' }}>Chưa có task nào.</li>)}
                                        </ul>
                                    </div>

                                    {/* CỘT 2: ĐANG TIẾN HÀNH */}
                                    <div style={{ flex: 1, background: 'rgba(106, 176, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(106, 176, 255, 0.2)' }}>
                                        <div style={{ color: '#6ab0ff', fontWeight: 'bold', marginBottom: '12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>⏳ ĐANG TIẾN HÀNH</span>
                                            <span style={{ background: 'rgba(106, 176, 255, 0.2)', padding: '2px 8px', borderRadius: '10px' }}>{selectedMember.doingTasks?.length || 0}</span>
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: '16px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: '1.6', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                                            {selectedMember.doingTasks?.length > 0 ? (
                                                selectedMember.doingTasks.map((t, i) => (
                                                    <li key={`doing-${i}`}
                                                        style={{ marginBottom: '8px' }}
                                                        // 💡 CẢM BIẾN ĐÃ ĐƯỢC CHUYỂN LÊN THẺ LI
                                                        onMouseEnter={(e) => setCustomTooltip({
                                                            show: true, x: e.clientX, y: e.clientY,
                                                            board: t.boardName || t.BoardName || 'Chưa rõ dự án',
                                                            col: t.columnName || t.ColumnName || 'Chưa rõ cột',
                                                            isDone: false
                                                        })}
                                                        onMouseMove={(e) => setCustomTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                                                        onMouseLeave={() => setCustomTooltip({ show: false, x: 0, y: 0, board: '', col: '', isDone: false })}
                                                    >
                                                        {t.boardId || t.BoardId ? (
                                                            <Link
                                                                to={`/d/boards/${t.boardId || t.BoardId}`}
                                                                style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', borderBottom: '1px dashed rgba(255,255,255,0.3)', transition: 'all 0.2s', display: 'inline-block' }}
                                                                onMouseEnter={e => { e.target.style.color = '#6ab0ff'; e.target.style.borderColor = '#6ab0ff'; }}
                                                                onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.9)'; e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                                                            >
                                                                {t.title || t.Title || t}
                                                            </Link>
                                                        ) : (
                                                            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{t.title || t.Title || t}</span>
                                                        )}
                                                    </li>
                                                ))
                                            ) : (<li style={{ listStyle: 'none', marginLeft: '-16px', opacity: 0.5, fontStyle: 'italic' }}>Đang rảnh rỗi.</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* 💡 BẢN ĐỒ POP-UP TOÀN CẦU (Nằm ngoài cùng để chống cắt xén tuyệt đối) */}
                    {customTooltip.show && (
                        <div style={{
                            position: 'fixed', top: customTooltip.y + 15, left: customTooltip.x + 15,
                            backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: '12px', borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)',
                            zIndex: 9999999, width: 'max-content', minWidth: '180px', backdropFilter: 'blur(10px)',
                            pointerEvents: 'none', animation: 'fadeIn 0.1s ease-out'
                        }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 'bold' }}>Nằm trong dự án</div>
                            <div style={{ fontSize: '13px', color: '#fff', fontWeight: 'bold', marginBottom: '8px', marginTop: '2px' }}>📁 {customTooltip.board}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 'bold' }}>Trạng thái cột</div>
                            <div style={{ fontSize: '13px', color: customTooltip.isDone ? '#27c93f' : '#6ab0ff', fontWeight: 'bold', marginTop: '2px' }}>
                                {customTooltip.isDone ? '✅ ' : '📋 '}{customTooltip.col}
                            </div>
                        </div>
                    )}
                </div>
            </div>,
            portalRoot
        );
    };

    return (
        <div style={{ padding: '40px 30px', minHeight: '100%', backgroundColor: 'transparent', fontFamily: 'var(--sans)' }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(39, 201, 63, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(39, 201, 63, 0); } 100% { box-shadow: 0 0 0 0 rgba(39, 201, 63, 0); } }
                .glass-panel { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; transition: transform 0.3s, box-shadow 0.3s; }
                .stat-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; flex: 1; min-width: 200px; display: flex; align-items: center; gap: 16px; transition: all 0.3s ease; animation: fadeIn 0.5s ease-out forwards; }
                .stat-box:hover { background: rgba(255,255,255,0.08); transform: translateY(-3px); border-color: rgba(106, 176, 255, 0.3); }
                
                .member-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 24px; transition: all 0.3s; display: flex; flex-direction: column; gap: 16px; position: relative; overflow: visible; animation: fadeIn 0.5s ease-out forwards; cursor: pointer; }
                .member-card:hover { transform: translateY(-4px); border-color: rgba(106, 176, 255, 0.5); box-shadow: 0 10px 25px rgba(0,0,0,0.3); background: rgba(255,255,255,0.06); }
                
                .input-glass { width: 100%; padding: 12px 16px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; color: #fff; font-size: 14px; transition: all 0.3s ease; box-sizing: border-box; outline: none; }
                .input-glass:focus { border-color: #6ab0ff; box-shadow: 0 0 0 3px rgba(106, 176, 255, 0.15); background: rgba(0,0,0,0.5); }
                .btn-primary { background: linear-gradient(135deg, #0c66e4, #4A9FFF); border: none; color: #fff; padding: 12px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(12, 102, 228, 0.3); display: flex; align-items: center; gap: 8px;}
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(12, 102, 228, 0.5); }
                .btn-outline { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 12px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;}
                .btn-outline:hover { background: rgba(255,255,255,0.1); border-color: #6ab0ff; color: #6ab0ff; }
                .btn-danger { background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 6px 12px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px; }
                .btn-danger:hover { background: #ef4444; color: #fff; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); }
                .status-dot-online { width: 14px; height: 14px; border-radius: 50%; background-color: #27c93f; border: 2px solid #0f172a; animation: pulseGlow 2s infinite; }
                .status-dot-offline { width: 14px; height: 14px; border-radius: 50%; background-color: rgba(255,255,255,0.3); border: 2px solid #0f172a; }
                .tab-btn { background: transparent; border: none; color: rgba(255,255,255,0.5); font-weight: bold; padding: 8px 16px; cursor: pointer; transition: all 0.2s; border-radius: 8px; font-size: 14px; border: 1px solid transparent; }
                .tab-btn.active { background: rgba(106, 176, 255, 0.15); color: #6ab0ff; border-color: rgba(106, 176, 255, 0.3); }
                .tab-btn:hover:not(.active) { color: #fff; background: rgba(255,255,255,0.05); }
                `}
            </style>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '30px', animation: 'fadeIn 0.5s ease-out' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>👥 Quản lý Nhân sự</h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>Kiểm soát quyền và chức vụ truy cập của thành viên.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
                    <div className="stat-box" style={{ animationDelay: '0.1s' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(106, 176, 255, 0.1)', color: '#6ab0ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>👥</div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{totalMembers}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: '600' }}>Tổng thành viên</div>
                        </div>
                    </div>
                    <div className="stat-box" style={{ animationDelay: '0.2s' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(39, 201, 63, 0.1)', color: '#27c93f', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>🟢</div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{onlineMembers}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: '600' }}>Đang Online</div>
                        </div>
                    </div>
                    <div className="stat-box" style={{ animationDelay: '0.3s' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>🛡️</div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{adminMembers}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: '600' }}>Quản trị viên</div>
                        </div>
                    </div>
                </div>

                {isInviting && (
                    <div className="glass-panel" style={{ marginBottom: '30px', animation: 'fadeIn 0.3s ease-out', border: '1px solid rgba(106, 176, 255, 0.4)', boxShadow: '0 10px 30px rgba(12, 102, 228, 0.15)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🚀</span> Cấp quyền truy cập Workspace</h3>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            <input
                                autoFocus
                                type="email"
                                placeholder="Nhập Email đồng đội..."
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => setIsEmailFocused(false)}
                                className="input-glass"
                                style={{ width: '100%' }}
                                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            />

                            {/* 💡 BẢNG DROPDOWN HIỂN THỊ GỢI Ý */}
                            {isEmailFocused && inviteEmail.trim() !== '' && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(106, 176, 255, 0.4)', borderRadius: '10px',
                                    marginTop: '4px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    maxHeight: '180px', overflowY: 'auto'
                                }}>
                                    {members
                                        .map(m => m.email)
                                        // Lọc ra email có chứa chữ sếp đang gõ VÀ không trùng khớp 100% với ô input
                                        .filter(email => email.toLowerCase().includes(inviteEmail.toLowerCase()) && email.toLowerCase() !== inviteEmail.toLowerCase())
                                        .map((email, index) => (
                                            <div
                                                key={index}
                                                // ⚠️ LƯU Ý: Phải dùng onMouseDown thay vì onClick để nó chạy trước khi ô Input bị mất focus (onBlur)
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setInviteEmail(email);
                                                    setIsEmailFocused(false);
                                                }}
                                                style={{
                                                    padding: '10px 16px', cursor: 'pointer', color: '#fff', fontSize: '14px',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={e => e.target.style.background = 'rgba(106, 176, 255, 0.2)'}
                                                onMouseLeave={e => e.target.style.background = 'transparent'}
                                            >
                                                {/* 💡 Bôi đậm phần chữ người dùng đang gõ (Nâng cao UX) */}
                                                {email.split(new RegExp(`(${inviteEmail})`, 'gi')).map((part, i) =>
                                                    part.toLowerCase() === inviteEmail.toLowerCase()
                                                        ? <strong key={i} style={{ color: '#6ab0ff' }}>{part}</strong>
                                                        : part
                                                )}
                                            </div>
                                        ))
                                    }
                                    {/* Báo hiệu nếu không tìm thấy ai khớp */}
                                    {members.filter(m => m.email.toLowerCase().includes(inviteEmail.toLowerCase())).length === 0 && (
                                        <div style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontStyle: 'italic' }}>
                                            Không tìm thấy người này trong hệ thống.
                                        </div>
                                    )}
                                </div>
                            )}
                            <select value={selectedBoardId} onChange={(e) => setSelectedBoardId(e.target.value)} className="input-glass" style={{ flex: '1 1 180px', cursor: 'pointer', appearance: 'none' }}>
                                {boards.length === 0 ? <option value="" style={{ background: '#0f172a' }}>Chưa có dự án nào</option> : boards.map(b => <option key={b.id || b.Id} value={b.id || b.Id} style={{ background: '#0f172a' }}>📁 {b.title || b.Title}</option>)}
                            </select>
                            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input-glass" style={{ flex: '1 1 150px', cursor: 'pointer', appearance: 'none' }}>
                                <option value="admin" style={{ background: '#0f172a' }}>🛡️ Quản trị viên</option>
                                <option value="member" style={{ background: '#0f172a' }}>✍️ Thành viên</option>
                                <option value="viewer" style={{ background: '#0f172a' }}>👁️ Chỉ xem</option>
                            </select>
                            <button className="btn-primary" style={{ flex: '0 0 auto' }} onClick={handleInvite}>✉️ Gửi thư mời</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Hoặc gửi liên kết trực tiếp:</span>
                            <button className="btn-outline" onClick={handleCopyInviteLink}>🔗 Copy Link Mời</button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', background: 'rgba(30, 41, 59, 0.4)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Tất cả ({totalMembers})</button>
                        <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin ({adminMembers})</button>
                        <button className={`tab-btn ${activeTab === 'member' ? 'active' : ''}`} onClick={() => setActiveTab('member')}>Member</button>
                        <button className={`tab-btn ${activeTab === 'viewer' ? 'active' : ''}`} onClick={() => setActiveTab('viewer')}>Viewer</button>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', minWidth: '250px' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>🔍</span>
                            <input type="text" placeholder="Tìm tên, email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-glass" style={{ paddingLeft: '42px', borderRadius: '10px' }} />
                        </div>
                        {isAdmin && (
                            <button className="btn-primary" style={{ padding: '12px 16px' }} onClick={() => setIsInviting(!isInviting)}>
                                {isInviting ? '✖ Đóng' : '➕ Thêm người'}
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0', color: '#6ab0ff' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '40px', width: '40px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"></path></svg>
                        <p>Đang đồng bộ dữ liệu nhân sự...</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {filteredMembers.map((member, index) => {
                            const roleColor = member.role === 'admin' ? '#ef4444' : member.role === 'member' ? '#6ab0ff' : '#ffbd2e';
                            const roleName = member.role === 'admin' ? 'Admin' : member.role === 'member' ? 'Member' : 'Viewer';

                            return (
                                <div key={member.id} className="member-card" style={{ animationDelay: `${index * 0.1}s`, zIndex: editingRoleFor === member.id ? 99999 : 1, position: 'relative' }} onClick={() => setSelectedMember(member)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ position: 'relative' }}>
                                            {/* 💡 ĐỔI SANG LÒ MICAH VÀ ĐỔ NỀN XANH */}
                                            <img src={`https://api.dicebear.com/7.x/micah/svg?seed=${member.id}`} alt="avatar" style={{ width: '64px', height: '64px', borderRadius: '18px', backgroundColor: '#0c66e4', border: '1px solid rgba(255,255,255,0.05)', objectFit: 'cover' }} />
                                            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px' }}>
                                                <div className={member.status === 'online' ? 'status-dot-online' : 'status-dot-offline'} title={member.status === 'online' ? 'Đang trực tuyến' : 'Ngoại tuyến'}></div>
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {member.name}
                                                {member.id === currentUser.id && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>You</span>}
                                            </h3>
                                            <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.6)', fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>✉️ {member.email}</p>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                                <p style={{ margin: 0, color: member.status === 'online' ? '#27c93f' : 'rgba(255,255,255,0.4)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {member.status === 'online' ? '⚡' : '🕒'} {member.lastActive}
                                                </p>

                                                {/* 💡 HUY HIỆU ĐÓNG GÓP TẠI ĐÂY */}
                                                <span style={{ background: 'rgba(106, 176, 255, 0.15)', color: '#6ab0ff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid rgba(106, 176, 255, 0.3)', whiteSpace: 'nowrap' }} title="Số công việc đang phụ trách">
                                                    🎯 {member.tasks || 0} Task
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ color: roleColor, background: `${roleColor}15`, padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: `1px solid ${roleColor}50`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{roleName}</span>
                                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.15)', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>{member.position}</span>
                                        </div>
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Gia nhập: {member.joinedAt}</span>
                                    </div>
                                    {isAdmin && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', marginTop: '4px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingRoleFor(editingRoleFor === member.id ? null : member.id); }} style={{ background: 'transparent', border: 'none', color: '#6ab0ff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0' }}>⚙️ Đổi quyền {editingRoleFor === member.id ? '▴' : '▾'}</button>
                                                    {editingRoleFor === member.id && (
                                                        <div style={{ position: 'absolute', top: '100%', left: 0, background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px', width: '140px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                                                            <button onClick={(e) => handleChangeRole(member.id, 'admin', member.name, e)} style={{ background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s', fontSize: '12px' }} onMouseEnter={e => e.target.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={e => e.target.style.background = 'transparent'}>🛡️ Admin</button>
                                                            <button onClick={(e) => handleChangeRole(member.id, 'member', member.name, e)} style={{ background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s', fontSize: '12px' }} onMouseEnter={e => e.target.style.background = 'rgba(106, 176, 255, 0.2)'} onMouseLeave={e => e.target.style.background = 'transparent'}>✍️ Member</button>
                                                            <button onClick={(e) => handleChangeRole(member.id, 'viewer', member.name, e)} style={{ background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s', fontSize: '12px' }} onMouseEnter={e => e.target.style.background = 'rgba(255, 189, 46, 0.2)'} onMouseLeave={e => e.target.style.background = 'transparent'}>👁️ Viewer</button>
                                                        </div>
                                                    )}
                                                </div>

                                                <select
                                                    value={member.position}
                                                    onChange={(e) => handleUpdatePosition(member.id, e.target.value, member.name, e)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '4px 8px', borderRadius: '6px', outline: 'none', cursor: 'pointer', fontSize: '12px', maxWidth: '110px' }}
                                                >
                                                    <option value="Nhân viên" style={{ background: '#0f172a' }}>Nhân viên</option>
                                                    <option value="Trưởng nhóm" style={{ background: '#0f172a' }}>Trưởng nhóm</option>
                                                    <option value="Quản lý dự án" style={{ background: '#0f172a' }}>QL Dự án</option>
                                                    <option value="Giám đốc" style={{ background: '#0f172a' }}>Giám đốc</option>
                                                    <option value="Chủ tịch" style={{ background: '#0f172a' }}>Chủ tịch</option>
                                                    <option value="CEO" style={{ background: '#0f172a' }}>CEO</option>
                                                </select>
                                            </div>
                                            <button className="btn-danger" onClick={(e) => handleRemoveMember(member.id, member.name, e)}>Đuổi cổ</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredMembers.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.5)' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🕵️‍♂️</div>
                                <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>Không tìm thấy nhân sự</h3>
                                <p style={{ margin: 0 }}>Có thể chưa có nhân sự nào được thêm vào hệ thống.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {renderMemberDetailModal()}
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="dark" />
        </div>
    );
};

export default Members;