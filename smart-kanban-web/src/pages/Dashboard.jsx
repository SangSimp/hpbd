import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Dashboard = () => {
    const [boards, setBoards] = useState([]);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : { fullName: 'Sếp Trung' };

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
            toast.success("🎉 Tạo không gian làm việc thành công!");
        } catch (error) {
            console.error("Lỗi tạo bảng:", error);
            toast.error("❌ Có lỗi xảy ra khi tạo bảng.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: 'var(--sans)' }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                
                .board-card {
                    background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 24px;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; display: flex; flex-direction: column; justify-content: space-between;
                    min-height: 160px; box-sizing: border-box; text-decoration: none; color: white; position: relative; overflow: hidden;
                }
                .board-card::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%); opacity: 0; transition: opacity 0.3s;
                }
                .board-card:hover {
                    transform: translateY(-8px); border-color: rgba(106, 176, 255, 0.5); box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
                .board-card:hover::before { opacity: 1; }

                .create-card {
                    background: rgba(255, 255, 255, 0.02); border: 2px dashed rgba(255, 255, 255, 0.2);
                    display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;
                    color: rgba(255, 255, 255, 0.6);
                }
                .create-card:hover {
                    background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.4); color: #fff;
                }

                .input-glass {
                    width: 100%; padding: 12px 16px; background: rgba(0, 0, 0, 0.3); 
                    border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; color: #fff; 
                    font-size: 15px; transition: all 0.3s ease; box-sizing: border-box; outline: none; margin-bottom: 16px;
                }
                .input-glass:focus { border-color: #6ab0ff; background: rgba(0, 0, 0, 0.5); box-shadow: 0 0 0 3px rgba(106, 176, 255, 0.15); }

                .btn-submit {
                    background: linear-gradient(135deg, #4A9FFF, #0c66e4); border: none; color: #fff; padding: 12px;
                    border-radius: 10px; font-weight: bold; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; flex: 1; font-size: 14px;
                }
                .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(12, 102, 228, 0.4); }
                
                .btn-cancel {
                    background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 12px;
                    border-radius: 10px; font-weight: bold; cursor: pointer; transition: background 0.2s; flex: 1; font-size: 14px;
                }
                .btn-cancel:hover { background: rgba(255,255,255,0.2); }

                .btn-logout {
                    background: rgba(255, 95, 86, 0.1); color: #ff5f56; border: 1px solid rgba(255, 95, 86, 0.3);
                    padding: 8px 20px; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 14px;
                }
                .btn-logout:hover { background: #ff5f56; color: #fff; box-shadow: 0 4px 12px rgba(255, 95, 86, 0.3); }

                .grid-container {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;
                    animation: fadeIn 0.6s ease-out forwards;
                }
                `}
            </style>

            <div style={{ position: 'fixed', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }}></div>
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', zIndex: 1 }}></div>

            {/* HEADER TỔNG */}
            <header style={{
                position: 'relative', zIndex: 10, height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 40px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(16px)'
            }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
                    <div style={{ background: 'linear-gradient(135deg, #4A9FFF 0%, #0c66e4 100%)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '14px' }}>SK</div>
                    <span style={{ fontWeight: '700', fontSize: '18px', letterSpacing: '-0.5px' }}>Smart Kanban</span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#fff' }}>
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: '14px' }} className="hide-on-mobile">{user.fullName || 'User'}</span>
                    </div>
                    <button onClick={handleLogout} className="btn-logout">Đăng xuất</button>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main style={{ position: 'relative', zIndex: 10, flex: 1, padding: '40px 20px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>Không gian làm việc</h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>Quản lý các dự án và tiến độ công việc của bạn.</p>
                    </div>

                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: '#6ab0ff' }}>
                            <svg style={{ animation: 'spin 1s linear infinite', height: '40px', width: '40px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"></path></svg>
                        </div>
                    ) : (
                        <div className="grid-container">
                            {/* Khối Tạo Bảng Mới */}
                            {!isCreating ? (
                                <div className="board-card create-card" onClick={() => setIsCreating(true)}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>+</div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Tạo bảng mới</h3>
                                </div>
                            ) : (
                                <div className="board-card" style={{ background: 'rgba(30, 41, 59, 0.9)', cursor: 'default' }}>
                                    <div>
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
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={handleCreateBoard} className="btn-submit">Khởi tạo</button>
                                        <button onClick={() => { setIsCreating(false); setNewBoardTitle(''); }} className="btn-cancel">Hủy</button>
                                    </div>
                                </div>
                            )}

                            {/* Render Danh sách Bảng */}
                            {boards.map(board => (
                                <Link to={`/boards/${board.id || board.Id}`} key={board.id || board.Id} className="board-card">
                                    <div>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', marginBottom: '16px' }}>
                                            📊
                                        </div>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#fff' }}>{board.title || board.Title}</h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }}></span> Đang hoạt động
                                        </p>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Cập nhật gần đây</span>
                                        <span style={{ color: '#6ab0ff', fontSize: '18px' }}>→</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <ToastContainer style={{ zIndex: 999999 }} position="top-right" autoClose={3000} />
        </div>
    );
};

export default Dashboard;