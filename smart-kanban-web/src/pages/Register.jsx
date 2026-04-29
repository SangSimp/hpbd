import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axiosConfig'; 
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Register = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await axios.post('/api/v1/auth/register', {
                fullName,
                email,
                password
            });

            toast.success('🎉 Đăng ký thành công! Vui lòng đăng nhập.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            if (err.response && err.response.status === 400) {
                toast.error(`❌ ${err.response.data.message || 'Dữ liệu không hợp lệ.'}`);
            } else {
                toast.error('❌ Lỗi kết nối đến máy chủ.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', overflowY: 'auto', fontFamily: 'var(--sans)' }}>
            <style>
                {`
                @keyframes rotateBorder { 100% { transform: rotate(360deg); } }
                @keyframes fadeInCard { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                .login-glass-card {
                    position: relative; z-index: 10; width: 100%; 
                    background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 48px 40px;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.5); box-sizing: border-box;
                    animation: fadeInCard 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .input-glass {
                    width: 100%; padding: 14px 16px 14px 44px; background: rgba(0, 0, 0, 0.3) !important; 
                    border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 12px; color: #fff !important; 
                    font-size: 15px; transition: all 0.3s ease; box-sizing: border-box; outline: none;
                }
                .input-glass::placeholder { color: rgba(255,255,255,0.4); }
                .input-glass:focus { border-color: #6ab0ff !important; background: rgba(0, 0, 0, 0.5) !important; box-shadow: 0 0 0 3px rgba(106, 176, 255, 0.15); }

                .input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); font-size: 18px; pointer-events: none; }

                .btn-energy {
                    position: relative; width: 100%; padding: 16px; border-radius: 12px; background: transparent; color: #fff; 
                    font-weight: 800; font-size: 16px; border: none; cursor: pointer; overflow: hidden; transition: transform 0.2s; z-index: 1;
                    display: flex; justify-content: center; align-items: center; gap: 10px; box-shadow: 0 10px 20px rgba(12, 102, 228, 0.2);
                }
                .btn-energy::before {
                    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: conic-gradient(transparent, transparent, transparent, #6ab0ff);
                    animation: rotateBorder 3s linear infinite; z-index: -2;
                }
                .btn-energy::after {
                    content: ''; position: absolute; inset: 2px; background: linear-gradient(135deg, #0c66e4, #4A9FFF); border-radius: 10px; z-index: -1; transition: background 0.3s;
                }
                .btn-energy:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(12, 102, 228, 0.4); }
                .btn-energy:not(:disabled):hover::after { background: linear-gradient(135deg, #4A9FFF, #6ab0ff); }
                .btn-energy:disabled { opacity: 0.7; cursor: not-allowed; }

                @media (max-width: 900px) { .hide-on-mobile { display: none !important; } }
                `}
            </style>

            {/* --- LỚP NỀN VŨ TRỤ --- */}
            <div style={{ position: 'fixed', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }}></div>
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', zIndex: 1 }}></div>
            <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(12, 102, 228, 0.15) 0%, transparent 60%)', zIndex: 2 }}></div>

            {/* --- HEADER ĐỒNG BỘ --- */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', zIndex: 100, transition: 'all 0.3s ease',
                background: scrolled ? 'rgba(15, 23, 42, 0.8)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
            }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
                    <div style={{ background: 'linear-gradient(135deg, #4A9FFF 0%, #0c66e4 100%)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '14px' }}>SK</div>
                    <span style={{ fontWeight: '700', fontSize: '18px', letterSpacing: '-0.5px' }}>Smart Kanban</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <Link to="/" className="hide-on-mobile" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '15px', fontWeight: '600', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>Trang chủ</Link>
                    <Link to="/login" style={{ background: '#fff', color: '#0f172a', padding: '10px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', transition: 'transform 0.2s' }}>Đăng nhập</Link>
                </div>
            </header>

            {/* --- KHU VỰC ĐĂNG KÝ CHÍNH --- */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 20px 40px 20px', position: 'relative', zIndex: 10 }}>
                <div style={{ width: '100%', maxWidth: '420px' }}>

                    <Link to="/login" style={{ display: 'inline-block', marginBottom: '16px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}>
                        ← Quay lại Đăng nhập
                    </Link>

                    <div className="login-glass-card">
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>Tạo tài khoản mới</h2>
                            <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Bắt đầu hành trình nâng cao năng suất</p>
                        </div>

                        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Họ và tên</label>
                                <div style={{ position: 'relative' }}>
                                    <span className="input-icon">👤</span>
                                    <input
                                        type="text" className="input-glass" placeholder="Nguyễn Văn A"
                                        value={fullName} onChange={(e) => setFullName(e.target.value)}
                                        required disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <span className="input-icon">✉️</span>
                                    <input
                                        type="email" className="input-glass" placeholder="name@company.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        required disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mật khẩu</label>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <span className="input-icon">🔒</span>
                                    <input
                                        type={showPassword ? "text" : "password"} className="input-glass" placeholder="••••••••"
                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                        required disabled={isLoading} minLength="6"
                                    />
                                    <button
                                        type="button" onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '5px', fontSize: '16px' }}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-energy" disabled={isLoading} style={{ marginTop: '8px' }}>
                                {isLoading ? (
                                    <><svg style={{ animation: 'spin 1s linear infinite', height: '20px', width: '20px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"></path></svg>
                                        Đang xử lý...</>
                                ) : 'Tạo tài khoản'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                            Đã có tài khoản? <Link to="/login" style={{ color: '#fff', fontWeight: 'bold', textDecoration: 'none' }}>Đăng nhập ngay</Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* --- FOOTER --- */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 20px', position: 'relative', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
                        <div style={{ background: 'linear-gradient(135deg, #4A9FFF 0%, #0c66e4 100%)', color: '#fff', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', fontWeight: '900' }}>SK</div>
                        <span style={{ fontWeight: 'bold' }}>Smart Kanban 2026</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '10px' }}>Đồ án Thực tập Full-stack.</div>
                </div>
            </footer>

            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="dark" />
        </div>
    );
};

export default Register;