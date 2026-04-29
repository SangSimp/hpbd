import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BoardList = () => {
    const [boards, setBoards] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 💡 Thêm State cho Tab phân loại

    let globalRole = 'member';
    let currentUserId = null; // Lấy ID để biết bảng nào của mình
    try {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            Object.keys(payload).forEach(key => {
                if (key.toLowerCase().includes('role')) {
                    globalRole = String(payload[key]).toLowerCase();
                }
            });
            currentUserId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub || payload.id;
        }
    } catch (e) {
        console.error("Lỗi đọc quyền từ Token:", e);
    }
    const isReadOnly = globalRole === 'viewer';

    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const response = await axios.get('/api/v1/boards');
                setBoards(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error("Lỗi tải danh sách bảng:", error);
                toast.error("❌ Không thể tải danh sách dự án.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchBoards();
    }, []);

    const handleCreateBoard = async () => {
        if (!newBoardTitle.trim()) {
            toast.warning("⚠️ Vui lòng nhập tiêu đề bảng!");
            return;
        }
        try {
            const response = await axios.post('/api/v1/boards', { title: newBoardTitle });
            setBoards([...boards, response.data]);
            setNewBoardTitle('');
            setIsCreating(false);
            toast.success("🎉 Tạo dự án thành công!");
        } catch (error) {
            console.error("Lỗi tạo bảng:", error);
            toast.error("❌ Có lỗi xảy ra khi tạo bảng.");
        }
    };

    const handleDeleteBoard = async (e, boardId, boardTitle) => {
        e.preventDefault();
        e.stopPropagation();

        if (window.confirm(`⚠️ Sếp có chắc chắn muốn xóa vĩnh viễn dự án "${boardTitle}" không? Hành động này sẽ xóa sạch dữ liệu và không thể hoàn tác!`)) {
            try {
                await axios.delete(`/api/v1/boards/${boardId}`);
                setBoards(boards.filter(b => (b.id || b.Id) !== boardId));
                toast.success("🗑️ Đã dọn dẹp dự án thành công!");
            } catch (error) {
                console.error("Lỗi xóa bảng:", error);
                toast.error(error.response?.data?.message || "❌ Có lỗi xảy ra khi xóa dự án.");
            }
        }
    };

    // 💡 LOGIC LỌC THEO TAB & TÌM KIẾM
    const filteredBoards = boards.filter(board => {
        // Lọc theo Tab
        const ownerId = board.ownerId || board.OwnerId;
        const memberIds = board.memberIds || board.MemberIds || [];

        let matchTab = true;
        if (activeTab === 'mine') matchTab = ownerId === currentUserId;
        if (activeTab === 'shared') matchTab = memberIds.includes(currentUserId) && ownerId !== currentUserId;

        // Lọc theo thanh Tìm kiếm
        const matchSearch = (board.title || board.Title || '').toLowerCase().includes(searchQuery.toLowerCase());

        return matchTab && matchSearch;
    });

    return (
        <div style={{ padding: '40px 30px', minHeight: '100%', backgroundColor: 'transparent', fontFamily: 'var(--sans)' }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                
                .board-card {
                    background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 24px;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;
                    min-height: 200px; box-sizing: border-box; text-decoration: none; color: white; position: relative; overflow: hidden;
                }
                .board-card::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%); opacity: 0; transition: opacity 0.3s; z-index: 1;
                }
                .board-card:hover {
                    transform: translateY(-8px); border-color: rgba(106, 176, 255, 0.5); box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
                .board-card:hover::before { opacity: 1; }

                .create-card {
                    background: rgba(12, 102, 228, 0.1); border: 2px dashed rgba(106, 176, 255, 0.4);
                    display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;
                    color: #6ab0ff; transition: all 0.3s ease;
                }
                .create-card:hover {
                    background: rgba(12, 102, 228, 0.2); border-color: #6ab0ff; color: #fff; border-style: solid;
                    box-shadow: 0 10px 30px rgba(12, 102, 228, 0.2);
                }

                .filter-tab {
                    padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
                    background: transparent; color: rgba(255,255,255,0.5); border: 1px solid transparent; transition: all 0.2s;
                }
                .filter-tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
                .filter-tab.active { background: rgba(106, 176, 255, 0.15); color: #6ab0ff; border: 1px solid rgba(106, 176, 255, 0.3); }

                .input-glass {
                    width: 100%; padding: 12px 16px; background: rgba(0, 0, 0, 0.3); 
                    border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; color: #fff; 
                    font-size: 15px; transition: all 0.3s ease; box-sizing: border-box; outline: none; margin-bottom: 16px;
                }
                .input-glass:focus { border-color: #6ab0ff; background: rgba(0, 0, 0, 0.5); box-shadow: 0 0 0 3px rgba(106, 176, 255, 0.15); }

                .btn-submit {
                    background: linear-gradient(135deg, #4A9FFF, #0c66e4); border: none; color: #fff; padding: 10px;
                    border-radius: 8px; font-weight: bold; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; flex: 1; font-size: 14px;
                }
                .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(12, 102, 228, 0.4); }
                
                .btn-cancel {
                    background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 10px;
                    border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s; flex: 1; font-size: 14px;
                }
                .btn-cancel:hover { background: rgba(255,255,255,0.2); }

                .grid-container {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;
                    animation: fadeIn 0.6s ease-out forwards;
                }
                `}
            </style>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* HEADER & THANH TÌM KIẾM */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '24px', animation: 'fadeIn 0.5s ease-out' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            📋 Quản lý Bảng
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>
                            Toàn bộ dự án và không gian làm việc của bạn nằm ở đây.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, maxWidth: '500px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm dự án..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff',
                                    fontSize: '15px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#6ab0ff'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                            />
                        </div>
                    </div>
                </div>

                {/* 💡 MENU TABS PHÂN LOẠI DỰ ÁN */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                    <button className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>🌟 Tất cả dự án</button>
                    <button className={`filter-tab ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => setActiveTab('mine')}>👑 Dự án của tôi</button>
                    <button className={`filter-tab ${activeTab === 'shared' ? 'active' : ''}`} onClick={() => setActiveTab('shared')}>🤝 Được mời tham gia</button>
                </div>

                {/* KHU VỰC HIỂN THỊ DANH SÁCH BẢNG */}
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: '#6ab0ff' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '40px', width: '40px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"></path></svg>
                    </div>
                ) : (
                    <div className="grid-container">
                        {!isReadOnly && activeTab !== 'shared' && (
                            <>
                                {/* Nút Tạo Bảng Mới */}
                                {!isCreating ? (
                                    <div className="board-card create-card" onClick={() => setIsCreating(true)}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(106, 176, 255, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', marginBottom: '8px' }}>+</div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Tạo bảng mới</h3>
                                    </div>
                                ) : (
                                    <div className="board-card" style={{ background: 'rgba(30, 41, 59, 0.9)', cursor: 'default', border: '1px solid #6ab0ff' }}>
                                        <div style={{ position: 'relative', zIndex: 2 }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>Khởi tạo dự án</h3>
                                            <input
                                                autoFocus
                                                value={newBoardTitle}
                                                onChange={(e) => setNewBoardTitle(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                                                placeholder="Nhập tiêu đề bảng..."
                                                className="input-glass"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 2 }}>
                                            <button onClick={handleCreateBoard} className="btn-submit">Tạo mới</button>
                                            <button onClick={() => { setIsCreating(false); setNewBoardTitle(''); }} className="btn-cancel">Hủy</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                            {filteredBoards.map(board => {
                                const bgImg = board.backgroundUrl || board.BackgroundUrl;

                                // 💡 LẤY DỮ LIỆU NHÂN SỰ THẬT 100%
                                const ownerId = board.ownerId || board.OwnerId;
                                const memberIds = board.memberIds || board.MemberIds || [];

                                // Gộp Chủ bảng và Thành viên lại, lọc bỏ những giá trị rỗng/trùng nhau
                                const allMembers = [ownerId, ...memberIds].filter(Boolean);
                                const uniqueMembers = [...new Set(allMembers)];

                                const memberCount = uniqueMembers.length;
                                // Chỉ cắt tối đa 2 người đầu tiên ra để hiện avatar
                                const displayMembers = uniqueMembers.slice(0, 2);

                                return (
                                    <Link
                                        to={`/d/boards/${board.id || board.Id}`}
                                        key={board.id || board.Id}
                                        className="board-card"
                                        style={{
                                            backgroundImage: bgImg ? `url(${bgImg})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }}
                                    >
                                        {bgImg && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.95))', zIndex: 0 }}></div>}

                                        {!isReadOnly && (board.ownerId === currentUserId || board.OwnerId === currentUserId) && (
                                            <button
                                                onClick={(e) => handleDeleteBoard(e, board.id || board.Id, board.title || board.Title)}
                                                style={{
                                                    position: 'absolute', top: '12px', right: '12px', zIndex: 10,
                                                    background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444',
                                                    border: 'none', borderRadius: '8px', width: '32px', height: '32px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(4px)'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                                                title="Xóa dự án này"
                                            >
                                                🗑️
                                            </button>
                                        )}

                                        <div style={{ position: 'relative', zIndex: 2 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', marginBottom: '16px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>📊</div>
                                            </div>
                                            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{board.title || board.Title}</h3>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                                                Tạo ngày: {new Date(board.createdAt || board.CreatedAt).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>

                                            {/* 💡 CỤM AVATAR DÙNG DATA THẬT */}
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {displayMembers.map((memberId, idx) => (
                                                    <img
                                                        key={memberId}
                                                        src={`https://api.dicebear.com/7.x/micah/svg?seed=${memberId}`}
                                                        alt="Avatar"
                                                        style={{
                                                            width: 28, height: 28, borderRadius: '50%',
                                                            border: '2px solid #0f172a',
                                                            backgroundColor: idx === 0 ? '#6ab0ff' : '#ffbd2e', // Tô màu nền cho bớt đơn điệu
                                                            objectFit: 'cover',
                                                            marginLeft: idx > 0 ? '-10px' : '0'
                                                        }}
                                                        title="Thành viên"
                                                    />
                                                ))}

                                                {/* Phần còn dư thì cộng dồn vào vòng tròn */}
                                                {memberCount > 2 && (
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #0f172a', marginLeft: '-10px', backgroundColor: '#334155', color: '#fff', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        +{memberCount - 2}
                                                    </div>
                                                )}
                                            </div>

                                            <span style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}>→</span>
                                        </div>
                                    </Link>
                                );
                            })}

                        {filteredBoards.length === 0 && !isCreating && boards.length > 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.5)' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔍</div>
                                <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>Không tìm thấy dự án nào</h3>
                                <p style={{ margin: 0 }}>Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="dark" />
        </div>
    );
};

export default BoardList;