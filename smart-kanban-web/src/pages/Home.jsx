import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from '../api/axiosConfig';

const LIVE_MESSAGES = ["⚡ Có người vừa kéo thẻ sang Hoàn thành", "🤖 AI vừa tự động tạo 5 checklist", "☁️ File Bài_Hát_Mới.mp3 vừa được đính kèm", "🔥 Đội nhóm vừa đạt mốc 100 công việc!"];
const DYNAMIC_PHRASES = ["Giải phóng tư duy.", "Tối đa năng suất.", "Kết nối đội nhóm."];

const SpotlightCard = ({ children, style = {}, className = "" }) => {
    const cardRef = useRef(null);
    const [overlayStyle, setOverlayStyle] = useState({ opacity: 0 });
    const [transformStyle, setTransformStyle] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const { left, top, width, height } = cardRef.current.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        const centerX = width / 2;
        const centerY = height / 2;
        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;

        setOverlayStyle({
            opacity: 1,
            background: `radial-gradient(${width * 0.8}px circle at ${x}px ${y}px, rgba(106, 176, 255, 0.15), transparent 80%)`,
        });
        setTransformStyle(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
    };

    const handleMouseLeave = () => {
        setOverlayStyle({ opacity: 0 });
        setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');
    };

    return (
        <div
            ref={cardRef} className={`bento-card ${className}`}
            style={{ ...style, transform: transformStyle }}
            onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, transition: 'opacity 0.2s ease', pointerEvents: 'none', ...overlayStyle }} />
            <div style={{ position: 'relative', zIndex: 2, height: '100%' }}>{children}</div>
        </div>
    );
};

const RevealOnScroll = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            }, { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return <div ref={ref} className={`reveal-up ${isVisible ? 'visible' : ''}`}>{children}</div>;
};

const AnimatedCounter = ({ end, duration = 2000, suffix = "" }) => {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !hasStarted) setHasStarted(true);
        });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [hasStarted]);

    useEffect(() => {
        if (hasStarted) {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                setCount(Math.floor(easeOutQuart * end));
                if (progress < 1) window.requestAnimationFrame(step);
            };
            window.requestAnimationFrame(step);
        }
    }, [hasStarted, end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
};

const LiveNotification = () => {
    const [msgIndex, setMsgIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setMsgIndex(prev => (prev + 1) % LIVE_MESSAGES.length);
                setVisible(true);
            }, 500);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            position: 'fixed', bottom: '30px', left: '30px', zIndex: 999,
            background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)',
            padding: '12px 20px', borderRadius: '16px', color: '#fff', fontSize: '13px', fontWeight: '500',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)', transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
            opacity: visible ? 1 : 0, transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'
        }}>
            {LIVE_MESSAGES[msgIndex]}
        </div>
    );
};

const ParticleBackground = () => {
    const [particles] = useState(() => {
        return Array.from({ length: 40 }).map(() => ({
            size: Math.random() * 4 + 1,
            left: Math.random() * 100,
            duration: Math.random() * 15 + 10,
            delay: Math.random() * 15
        }));
    });

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
            {particles.map((p, i) => (
                <div key={i} style={{
                    position: 'absolute', bottom: '-20px', left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`,
                    background: 'rgba(106, 176, 255, 0.4)', borderRadius: '50%', boxShadow: '0 0 10px rgba(106,176,255,0.8)',
                    animation: `particleUp ${p.duration}s ${p.delay}s linear infinite`
                }} />
            ))}
        </div>
    );
};

// ==========================================
// 🚀 COMPONENT CHÍNH TRANG HOME
// ==========================================
const Home = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeFaq, setActiveFaq] = useState(null);
    const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

    const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
    const userPanelRef = useRef(null);

    const [systemStats, setSystemStats] = useState({ users: 5000, boards: 145 });

    useEffect(() => {
        const fetchPublicStats = async () => {
            try {
                const response = await axios.get('/api/v1/admin/public/statistics');
                if (response.data) {
                    setSystemStats({
                        users: response.data.totalUsers || 5000,
                        boards: response.data.totalBoards || 145
                    });
                }
            } catch {
                console.log("Đang dùng số liệu ảo vì API C# chưa mở public.");
            }
        };
        fetchPublicStats();
    }, []);

    useEffect(() => {
        const handleGlobalMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, []);

    const [displayText, setDisplayText] = useState("");
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentPhrase = DYNAMIC_PHRASES[phraseIndex];
        const timer = setTimeout(() => {
            if (!isDeleting) {
                setDisplayText(currentPhrase.substring(0, displayText.length + 1));
                if (displayText === currentPhrase) setTimeout(() => setIsDeleting(true), 2000);
            } else {
                setDisplayText(currentPhrase.substring(0, displayText.length - 1));
                if (displayText === "") {
                    setIsDeleting(false);
                    setPhraseIndex((prev) => (prev + 1) % DYNAMIC_PHRASES.length);
                }
            }
        }, isDeleting ? 50 : 100);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, phraseIndex]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
            const totalScroll = document.documentElement.scrollTop;
            const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            setScrollProgress(totalScroll / windowHeight);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userPanelRef.current && !userPanelRef.current.contains(event.target)) {
                setIsUserPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        toast.info('Đã đăng xuất tài khoản!');
        setIsUserPanelOpen(false);
        navigate('/login');
    };

    const partnerLogos = ["Microsoft", "Google", "FPT Software", "VNG Corp", "Viettel", "MoMo", "Microsoft", "Google", "FPT Software"];
    const faqs = [
        { q: "Hệ thống Smart Kanban có miễn phí không?", a: "Hoàn toàn miễn phí cho sinh viên và các đội nhóm nhỏ dưới 10 người. Bạn có thể sử dụng đầy đủ các tính năng kéo thả và realtime." },
        { q: "Dữ liệu của tôi có được bảo mật?", a: "Tuyệt đối an toàn. Hệ thống backend C# sử dụng mã hóa mật khẩu BCrypt, xác thực JWT và lưu trữ file trên hạ tầng Cloudinary bảo mật cao." },
        { q: "Trợ lý AI Gemini hoạt động như thế nào?", a: "Khi bạn tạo một thẻ công việc phức tạp, AI sẽ tự động phân tích ngữ cảnh và đề xuất một danh sách (checklist) các bước nhỏ cần làm để hoàn thành công việc đó." },
    ];
    const integrations = [
        { icon: "👾", name: "Discord", color: "#5865F2" },
        { icon: "🐙", name: "GitHub", color: "#333" },
        { icon: "☁️", name: "Google Drive", color: "#34A853" },
        { icon: "💬", name: "Slack", color: "#E01E5A" },
        { icon: "🎨", name: "Figma", color: "#F24E1E" }
    ];
    const templates = [
        { icon: "💻", title: "Phát triển Phần mềm", desc: "Quản lý bug, tính năng và lộ trình cho team Dev (C#, React)." },
        { icon: "🎬", title: "Sản xuất Nội dung", desc: "Lên kịch bản, quay dựng video và sáng tác âm nhạc chuyên nghiệp." },
        { icon: "🏃‍♂️", title: "Kế hoạch Tập luyện", desc: "Theo dõi thực đơn hàng ngày, bài tập HIIT 20 phút giảm mỡ hiệu quả." }
    ];

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    return (
        <div style={styles.container}>
            <style>
                {`
                @keyframes float { 0%, 100% { transform: translateY(0px) rotateY(-5deg) rotateX(5deg); } 50% { transform: translateY(-15px) rotateY(-5deg) rotateX(5deg); } }
                @keyframes floatSoft { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
                @keyframes particleUp { 0% { transform: translateY(0) scale(0); opacity: 0; } 20% { opacity: 1; scale: 1; } 80% { opacity: 1; } 100% { transform: translateY(-100vh) scale(0); opacity: 0; } }
                @keyframes rotateBorder { 100% { transform: rotate(360deg); } }
                @keyframes slideDownUser { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                
                .floating-glass { animation: float 6s ease-in-out infinite; }
                .reveal-up { opacity: 0; transform: translateY(50px); transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
                .reveal-up.visible { opacity: 1; transform: translateY(0); }
                
                .bento-card { 
                    position: relative; background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; overflow: hidden; 
                    transition: border-color 0.3s, box-shadow 0.3s, transform 0.15s ease-out; 
                }
                .bento-card:hover { border-color: rgba(255, 255, 255, 0.3); box-shadow: 0 15px 40px rgba(0,0,0,0.5); z-index: 10; }
                .bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1200px; margin: 0 auto; }
                
                .faq-answer { max-height: 0; overflow: hidden; transition: all 0.4s ease; }
                .faq-answer.open { max-height: 200px; padding-top: 16px; }
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .marquee-content { display: inline-flex; gap: 60px; animation: marquee 30s linear infinite; }
                .marquee-content:hover { animation-play-state: paused; }
                @keyframes blink { 50% { opacity: 0; } }
                .typing-cursor { display: inline-block; width: 3px; height: 1em; background-color: #6ab0ff; margin-left: 4px; animation: blink 1s step-end infinite; vertical-align: middle; }
                
                .integration-icon { animation: floatSoft 4s ease-in-out infinite; transition: transform 0.3s; cursor: pointer; }
                .integration-icon:hover { transform: scale(1.1) !important; }

                .timeline-line { width: 2px; background: linear-gradient(180deg, transparent, #0c66e4, #b8c4ff, transparent); position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); }
                .timeline-dot { width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 0 20px #0c66e4; position: absolute; left: -7px; top: 20px; z-index: 2; }
                
                .author-card::after {
                    content: ''; position: absolute; top: 0; left: -200%; width: 150%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                    transform: skewX(-20deg); transition: 0.8s;
                }
                .author-card:hover::after { left: 200%; }
                
                .btn-energy {
                    position: relative; padding: 18px 40px; border-radius: 40px; background: #fff; color: #0c66e4; 
                    font-weight: 800; font-size: 16px; text-decoration: none; display: inline-block; overflow: hidden;
                    box-shadow: 0 10px 30px rgba(12, 102, 228, 0.4); transition: transform 0.2s; z-index: 1;
                }
                .btn-energy::before {
                    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: conic-gradient(transparent, transparent, transparent, #6ab0ff);
                    animation: rotateBorder 3s linear infinite; z-index: -2;
                }
                .btn-energy::after { content: ''; position: absolute; inset: 3px; background: #fff; border-radius: 40px; z-index: -1; }
                .btn-energy:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(12, 102, 228, 0.6); }

                .play-btn:hover { transform: scale(1.1); box-shadow: 0 0 30px rgba(255,255,255,0.4); }

                /* DROPDOWN USER PANEL CHUẨN DASHBOARD */
                .user-dropdown-home { position: absolute; top: 50px; right: 0; width: 240px; background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); animation: slideDownUser 0.2s ease-out; overflow: hidden; z-index: 1000; display: flex; flex-direction: column; }
                .user-menu-item-home { padding: 12px 20px; display: flex; align-items: center; gap: 12px; transition: all 0.2s; cursor: pointer; color: rgba(255,255,255,0.8); font-size: 14px; text-decoration: none; border: none; background: transparent; width: 100%; text-align: left; font-weight: 500; font-family: inherit;}
                .user-menu-item-home:hover { background: rgba(106, 176, 255, 0.1); color: #fff; }
                .user-menu-item-home.danger { color: #ef4444; border-top: 1px solid rgba(255,255,255,0.08); padding: 14px 20px; }
                .user-menu-item-home.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .user-clickable-group { border-radius: 10px; padding: 4px 8px; transition: all 0.2s; position: relative; }
                .user-clickable-group:hover { background: rgba(255,255,255,0.08); outline: 2px solid rgba(106, 176, 255, 0.3); }

                @media (max-width: 900px) { 
                    .bento-grid { grid-template-columns: 1fr; } .bento-span-2 { grid-column: span 1 !important; } 
                    .hide-on-mobile { display: none !important; } .hero-content { flex-direction: column; text-align: center; } 
                    .hero-left { align-items: center !important; } .hero-title { font-size: 40px !important; } 
                    .pricing-grid, .vs-grid, .template-grid { flex-direction: column; } 
                    .timeline-line { left: 20px; } .timeline-item { width: 100% !important; padding-left: 50px !important; text-align: left !important; left: 0 !important;}
                }
                `}
            </style>

            <ParticleBackground />

            <div style={{
                position: 'fixed', top: mousePos.y, left: mousePos.x, width: '600px', height: '600px',
                background: 'radial-gradient(circle, rgba(106, 176, 255, 0.08) 0%, transparent 60%)',
                transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 2, transition: 'all 0.1s ease-out'
            }} />

            <div style={styles.backgroundWrapper}><div style={styles.backgroundOverlay}></div></div>
            <div style={{ position: 'fixed', top: 0, left: 0, height: '3px', background: 'linear-gradient(90deg, #0c66e4, #b8c4ff)', width: `${scrollProgress * 100}%`, zIndex: 1001 }} />

            <LiveNotification />

            <header style={{ ...styles.header, background: scrolled ? 'rgba(15, 23, 42, 0.8)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent' }}>
                <div style={styles.headerContent}>
                    <div style={styles.logoGroup}><div style={styles.logoIcon}>SK</div><span style={styles.logoText}>Smart Kanban</span></div>
                    <nav className="hide-on-mobile" style={styles.navLinks}>
                        <a href="#features" style={styles.link}>Tính năng</a>
                        <a href="#templates" style={styles.link}>Giải pháp</a>
                        <a href="#roadmap" style={styles.link}>Lộ trình</a>
                    </nav>
                    <div style={styles.authGroup}>
                        {user ? (
                            <div style={{ position: 'relative' }} ref={userPanelRef}>
                                <div
                                    className="user-clickable-group"
                                    onClick={() => setIsUserPanelOpen(!isUserPanelOpen)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #8777D9, #6ab0ff)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(12, 102, 228, 0.3)' }}>
                                        {user.fullName?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span className="hide-on-mobile" style={{ transition: 'opacity 0.2s' }}>{user.fullName}</span>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>▼</span>
                                </div>

                                {isUserPanelOpen && (
                                    <div className="user-dropdown-home">
                                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>{user.fullName}</div>
                                            <div style={{ color: '#6ab0ff', fontSize: '12px', fontWeight: '600' }}>Workspace</div>
                                        </div>
                                        <div style={{ padding: '8px 0' }}>
                                            <Link to="/d" className="user-menu-item-home" onClick={() => setIsUserPanelOpen(false)}>
                                                <span style={{ fontSize: '18px' }}>🚀</span> Vào Dashboard
                                            </Link>
                                            <Link to="/d/profile" className="user-menu-item-home" onClick={() => setIsUserPanelOpen(false)}>
                                                <span style={{ fontSize: '18px' }}>🧑‍💻</span> Hồ sơ cá nhân
                                            </Link>
                                            <Link to="/d/settings" className="user-menu-item-home" onClick={() => setIsUserPanelOpen(false)}>
                                                <span style={{ fontSize: '18px' }}>⚙️</span> Cài đặt hệ thống
                                            </Link>
                                        </div>
                                        <button className="user-menu-item-home danger" onClick={handleLogout}>
                                            <span style={{ fontSize: '18px' }}>🚪</span> Đăng xuất
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="hide-on-mobile" style={styles.link}>Đăng nhập</Link>
                                <Link to="/register" style={styles.btnPrimarySmall}>Bắt đầu miễn phí</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main style={{ paddingTop: '80px', position: 'relative', zIndex: 3 }}>
                <div style={styles.heroSection}>
                    <div className="hero-content" style={styles.content}>
                        <div className="hero-left" style={styles.leftColumn}>
                            <RevealOnScroll>
                                <div style={styles.badge}>🚀 Phiên bản 2.0 đã ra mắt</div>
                                <h1 className="hero-title" style={styles.title}>
                                    Sắp xếp công việc.<br />
                                    <span style={styles.gradientText}>{displayText}<span className="typing-cursor"></span></span>
                                </h1>
                                <p style={styles.subtitle}>Nền tảng quản lý dự án tốc độ cao, tích hợp AI thông minh và đồng bộ thời gian thực. Giúp đội nhóm của bạn hoàn thành mục tiêu nhanh gấp 3 lần.</p>
                                <div style={{ marginTop: '20px' }}>
                                    <Link to={user ? "/d" : "/register"} className="btn-energy">Trải nghiệm ngay ➔</Link>
                                </div>
                            </RevealOnScroll>
                        </div>
                        <div style={styles.rightColumn}>
                            <RevealOnScroll>
                                <div className="floating-glass" style={styles.glassBoard}>
                                    <div style={styles.boardHeader}>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>Smart Kanban - Dự án Q1</span>
                                    </div>
                                    <div style={styles.columns}>
                                        <div style={styles.column}>
                                            <div style={styles.colHeader}>Cần làm</div>
                                            <div style={styles.card}>Kéo thả Realtime ⚡</div>
                                            <div style={styles.card}>Thẻ 3D Parallax 🎮</div>
                                        </div>
                                        <div style={styles.column}>
                                            <div style={styles.colHeader}>Đang làm</div>
                                            <div style={{ ...styles.card, borderLeft: '3px solid #f5cd47' }}>Tích hợp Gemini AI <span style={{ float: 'right' }}>🤖</span></div>
                                        </div>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>

                <RevealOnScroll>
                    <div style={{ padding: '40px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px', marginBottom: '40px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>
                                    <AnimatedCounter end={systemStats.users} suffix="+" />
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tài khoản hoạt động</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>
                                    <AnimatedCounter end={systemStats.boards} suffix="+" />
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Dự án đang chạy</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}><AnimatedCounter end={99} duration={2500} suffix=".9%" /></div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Thời gian Uptime</div>
                            </div>
                        </div>
                        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                            <div className="marquee-content">
                                {partnerLogos.map((logo, index) => <div key={index} style={{ fontSize: '24px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>{logo}</div>)}
                            </div>
                        </div>
                    </div>
                </RevealOnScroll>

                <div style={{ ...styles.section, backgroundColor: 'rgba(255,255,255,0.01)' }}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Tại sao chọn Smart Kanban?</h2>
                            <p style={styles.sectionSubtitle}>Chúng tôi không chỉ là một bảng tính. Chúng tôi là một cỗ máy năng suất.</p>
                        </div>
                        <div className="vs-grid" style={{ display: 'flex', gap: '30px', maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
                            <div style={{ flex: 1, background: 'rgba(255, 95, 86, 0.05)', border: '1px solid rgba(255, 95, 86, 0.2)', borderRadius: '20px', padding: '40px' }}>
                                <h3 style={{ fontSize: '20px', color: '#ff5f56', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><span>❌</span> Công cụ cũ rích</h3>
                                <ul style={{ listStyle: 'none', padding: 0, color: 'rgba(255,255,255,0.6)', lineHeight: '2.5' }}>
                                    <li>Phải F5 liên tục để xem ai đang làm gì</li>
                                    <li>Tự viết Checklist thủ công tốn thời gian</li>
                                    <li>Giao diện cục mịch, chậm chạp</li>
                                    <li>Mất tiền để đính kèm file lớn</li>
                                </ul>
                            </div>
                            <div style={{ flex: 1, background: 'linear-gradient(180deg, rgba(39, 201, 63, 0.1) 0%, rgba(39, 201, 63, 0.02) 100%)', border: '1px solid rgba(39, 201, 63, 0.4)', borderRadius: '20px', padding: '40px', boxShadow: '0 10px 30px rgba(39, 201, 63, 0.1)' }}>
                                <h3 style={{ fontSize: '20px', color: '#27c93f', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><span>✅</span> Smart Kanban</h3>
                                <ul style={{ listStyle: 'none', padding: 0, color: '#fff', lineHeight: '2.5', fontWeight: '500' }}>
                                    <li>Đồng bộ Realtime siêu tốc với SignalR</li>
                                    <li>AI Gemini tự động sinh Checklist thông minh</li>
                                    <li>Giao diện Glassmorphism mượt mà, bay bổng</li>
                                    <li>Lưu trữ miễn phí trên Cloudinary</li>
                                </ul>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>

                <div id="showreel" style={{ ...styles.section, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Trải nghiệm thực tế</h2>
                            <p style={styles.sectionSubtitle}>Xem cách Smart Kanban biến sự hỗn loạn thành trật tự chỉ trong nháy mắt.</p>
                        </div>
                        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
                            <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', aspectRatio: '16/9', background: '#111' }}>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, rgba(12, 102, 228, 0.2), rgba(184, 196, 255, 0.1))' }}>
                                    <div className="play-btn" onClick={() => toast.info('Chức năng đang hoàn thiện...')} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}>
                                        <span style={{ marginLeft: '5px', fontSize: '30px' }}>▶</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>

                <div id="templates" style={styles.section}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Bảng mẫu cho mọi nhu cầu</h2>
                            <p style={styles.sectionSubtitle}>Bắt đầu ngay với các không gian làm việc được thiết kế sẵn cho từng mục tiêu cụ thể.</p>
                        </div>
                        <div className="template-grid" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                            {templates.map((tpl, i) => (
                                <SpotlightCard key={i} style={{ flex: '1 1 300px', padding: '30px' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>{tpl.icon}</div>
                                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>{tpl.title}</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>{tpl.desc}</p>
                                    <Link to={user ? "/d" : "/register"} style={{ display: 'inline-block', marginTop: '20px', color: '#6ab0ff', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>Sử dụng mẫu này →</Link>
                                </SpotlightCard>
                            ))}
                        </div>
                    </RevealOnScroll>
                </div>

                <div id="features" style={{ ...styles.section, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Sức mạnh ẩn sau sự tối giản.</h2>
                            <p style={styles.sectionSubtitle}>Mọi công cụ bạn cần, được đặt đúng chỗ với sức mạnh từ Cloud & AI.</p>
                        </div>
                        <div className="bento-grid">
                            <SpotlightCard style={{ padding: '40px', gridColumn: 'span 2' }}>
                                <div style={styles.bentoIcon}>⚡</div>
                                <h3 style={styles.bentoTitle}>Đồng bộ thời gian thực (Real-time)</h3>
                                <p style={styles.bentoDesc}>Kiến trúc SignalR giúp mọi thao tác hiển thị ngay lập tức trên mọi thiết bị.</p>
                            </SpotlightCard>
                            <SpotlightCard style={{ padding: '40px', gridColumn: 'span 1' }}>
                                <div style={styles.bentoIcon}>🧠</div>
                                <h3 style={styles.bentoTitle}>Trợ lý AI Gemini</h3>
                                <p style={styles.bentoDesc}>Phân tách công việc phức tạp thành Checklist chi tiết chỉ với 1 cú click.</p>
                            </SpotlightCard>
                            <SpotlightCard style={{ padding: '40px', gridColumn: 'span 1' }}>
                                <div style={styles.bentoIcon}>☁️</div>
                                <h3 style={styles.bentoTitle}>Lưu trữ Cloudinary</h3>
                                <p style={styles.bentoDesc}>Quản lý file đính kèm an toàn tuyệt đối trên hạ tầng đám mây toàn cầu.</p>
                            </SpotlightCard>
                            <SpotlightCard style={{ padding: '40px', gridColumn: 'span 2' }}>
                                <div style={styles.bentoIcon}>⏰</div>
                                <h3 style={styles.bentoTitle}>Robot nhắc việc ngầm</h3>
                                <p style={styles.bentoDesc}>Hệ thống Background Service hoạt động 24/7 gửi cảnh báo trễ hạn tự động.</p>
                            </SpotlightCard>
                        </div>
                    </RevealOnScroll>
                </div>

                <div id="integrations" style={styles.section}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Kết nối quy trình làm việc</h2>
                            <p style={styles.sectionSubtitle}>Smart Kanban không hoạt động cô lập. Nó là trung tâm kết nối mọi công cụ yêu thích của bạn.</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap', padding: '20px' }}>
                            {integrations.map((app, i) => (
                                <div key={i} className="integration-icon" style={{
                                    background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '20px 40px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '12px',
                                    animationDelay: `${i * 0.2}s`, boxShadow: `0 10px 30px ${app.color}20`
                                }}>
                                    <span style={{ fontSize: '32px' }}>{app.icon}</span>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{app.name}</span>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>
                </div>

                <div id="tech-stack" style={{ ...styles.section, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Kiến trúc công nghệ tối tân</h2>
                            <p style={styles.sectionSubtitle}>Sức mạnh C# .NET 8 kết hợp cùng ReactJS cho hiệu năng tuyệt đối.</p>
                        </div>
                        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                            <div style={{ background: '#2d2d2d', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
                                <span style={{ marginLeft: '10px', color: '#888', fontSize: '12px', fontFamily: 'monospace' }}>KanbanHub.cs</span>
                            </div>
                            <div style={{ padding: '24px', fontFamily: 'Consolas, monospace', color: '#d4d4d4', fontSize: '15px', lineHeight: '1.6', overflowX: 'auto' }}>
                                <span style={{ color: '#569cd6' }}>public class</span> <span style={{ color: '#4ec9b0' }}>KanbanHub</span> : <span style={{ color: '#4ec9b0' }}>Hub</span><br />
                                {`{`}<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#569cd6' }}>public async</span> <span style={{ color: '#4ec9b0' }}>Task</span> <span style={{ color: '#dcdcaa' }}>MoveCard</span>(<span style={{ color: '#4ec9b0' }}>string</span> cardId, <span style={{ color: '#4ec9b0' }}>string</span> destColId)<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;{`{`}<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#6a9955' }}>// Xử lý đồng bộ dữ liệu siêu tốc bằng SignalR</span><br />
                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#c586c0' }}>await</span> Clients.Others.<span style={{ color: '#dcdcaa' }}>SendAsync</span>(<span style={{ color: '#ce9178' }}>"CardMoved"</span>, cardId, destColId);<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;{`}`}<br />
                                {`}`}
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>

                <div id="roadmap" style={styles.section}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Lộ trình phát triển</h2>
                            <p style={styles.sectionSubtitle}>Chúng tôi không ngừng nâng cấp để mang lại trải nghiệm tốt nhất.</p>
                        </div>
                        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto', padding: '40px 0' }}>
                            <div className="timeline-line"></div>
                            {[
                                { date: "Q1 2026", title: "Ra mắt v1.0", desc: "Xây dựng core Backend C# và tính năng kéo thả cơ bản.", status: "done" },
                                { date: "Q2 2026", title: "Smart Kanban 2.0 (Hiện tại)", desc: "Tích hợp SignalR Realtime, UI Glassmorphism & AI Gemini.", status: "active" },
                                { date: "Q3 2026", title: "Mobile App", desc: "Đưa trải nghiệm kéo thả lên iOS và Android bằng React Native.", status: "future" },
                            ].map((item, idx) => (
                                <div key={idx} className="timeline-item" style={{ position: 'relative', width: '50%', padding: '20px 40px', left: idx % 2 === 0 ? 0 : '50%', textAlign: idx % 2 === 0 ? 'right' : 'left', boxSizing: 'border-box' }}>
                                    <div className="timeline-dot" style={{ left: idx % 2 === 0 ? 'auto' : '-8px', right: idx % 2 === 0 ? '-8px' : 'auto', background: item.status === 'done' ? '#27c93f' : item.status === 'active' ? '#0c66e4' : '#555', boxShadow: item.status === 'active' ? '0 0 20px #0c66e4' : 'none' }}></div>
                                    <div style={{ color: item.status === 'active' ? '#6ab0ff' : 'rgba(255,255,255,0.5)', fontWeight: 'bold', marginBottom: '8px' }}>{item.date}</div>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: item.status === 'future' ? 'rgba(255,255,255,0.4)' : '#fff' }}>{item.title}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>
                </div>

                <div style={{ ...styles.section, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Đội ngũ phát triển</h2>
                            <p style={styles.sectionSubtitle}>Dự án được xây dựng bằng tất cả đam mê.</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <SpotlightCard className="author-card" style={{ padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', background: 'linear-gradient(145deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #4A9FFF, #0c66e4)', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '40px' }}>👨‍💻</div>
                                <h3 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '5px' }}>Trung</h3>
                                <p style={{ color: '#6ab0ff', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Full-Stack Developer • Giáp Thân 2004 🐒</p>
                                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '24px' }}>
                                    Niềm đam mê xây dựng các hệ thống Web tối ưu. Chịu trách nhiệm toàn bộ từ kiến trúc Backend C# .NET đến trải nghiệm UI/UX trên ReactJS.
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '12px' }}>C# .NET</span>
                                    <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '12px' }}>ReactJS</span>
                                    <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '12px' }}>MongoDB</span>
                                </div>
                            </SpotlightCard>
                        </div>
                    </RevealOnScroll>
                </div>

                <div id="pricing" style={styles.section}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Đầu tư cho năng suất</h2>
                            <p style={styles.sectionSubtitle}>Chọn gói phù hợp với quy mô đội nhóm của bạn.</p>
                        </div>
                        <div className="pricing-grid" style={{ display: 'flex', gap: '30px', maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
                            <div style={styles.pricingCard}>
                                <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Gói Sinh Viên</h3>
                                <div style={{ fontSize: '40px', fontWeight: '900', marginBottom: '20px' }}>0đ <span style={{ fontSize: '16px', fontWeight: 'normal', color: 'rgba(255,255,255,0.5)' }}>/mãi mãi</span></div>
                                <ul style={styles.pricingFeatures}>
                                    <li>✓ Không giới hạn Bảng & Kéo thả</li>
                                    <li>✓ Thêm tối đa 10 thành viên/bảng</li>
                                    <li>✓ Đồng bộ Real-time</li>
                                </ul>
                                <Link to={user ? "/d" : "/register"} style={styles.pricingBtnFree}>Bắt đầu ngay</Link>
                            </div>
                            <div style={styles.pricingCardPro}>
                                <div style={styles.proBadge}>PHỔ BIẾN NHẤT</div>
                                <h3 style={{ fontSize: '24px', marginBottom: '10px', color: '#6ab0ff' }}>Gói Pro</h3>
                                <div style={{ fontSize: '40px', fontWeight: '900', marginBottom: '20px' }}>99k <span style={{ fontSize: '16px', fontWeight: 'normal', color: 'rgba(255,255,255,0.5)' }}>/tháng</span></div>
                                <ul style={styles.pricingFeatures}>
                                    <li>✓ Mọi tính năng của gói Sinh Viên</li>
                                    <li>✓ Kích hoạt Trợ lý AI Gemini</li>
                                    <li>✓ Cảnh báo trễ hạn qua Email</li>
                                </ul>
                                <button style={styles.pricingBtnPro}>Sắp ra mắt</button>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>

                <div id="faq" style={{ ...styles.section, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <RevealOnScroll>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Câu hỏi thường gặp</h2>
                        </div>
                        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px', marginBottom: '100px' }}>
                            {faqs.map((faq, index) => (
                                <div key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '20px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '600', fontSize: '18px' }} onClick={() => setActiveFaq(activeFaq === index ? null : index)}>
                                        {faq.q}
                                        <span style={{ transform: activeFaq === index ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.3s', fontSize: '24px', color: '#6ab0ff', fontWeight: '300' }}>+</span>
                                    </div>
                                    <div className={`faq-answer ${activeFaq === index ? 'open' : ''}`}>
                                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>{faq.a}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
                            <div style={styles.finalCtaBox}>
                                <h2 style={styles.finalCtaTitle}>Sẵn sàng nâng cao năng suất?</h2>
                                <p style={styles.finalCtaDesc}>Hàng ngàn công việc đã được quản lý hiệu quả. Tham gia cộng đồng Smart Kanban ngay hôm nay, hoàn toàn miễn phí.</p>
                                <Link to={user ? "/d" : "/register"} className="btn-energy">Tạo tài khoản miễn phí</Link>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </main>

            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '60px 20px', position: 'relative', zIndex: 3, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
                        <div style={{ background: 'linear-gradient(135deg, #4A9FFF 0%, #0c66e4 100%)', color: '#fff', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', fontWeight: '900' }}>SK</div>
                        <span style={{ fontWeight: 'bold' }}>Smart Kanban 2026</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '10px' }}>Đồ án Thực tập Full-stack. Phát triển bởi Sếp Trung.</div>
                </div>
            </footer>
        </div>
    );
};

const styles = {
    container: { backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'var(--sans)', color: '#fff', position: 'relative', overflowX: 'hidden' },
    backgroundWrapper: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' },
    backgroundOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' },
    header: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, transition: 'all 0.3s ease' },
    headerContent: { maxWidth: '1200px', margin: '0 auto', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' },
    logoGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoIcon: { background: 'linear-gradient(135deg, #4A9FFF 0%, #0c66e4 100%)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '14px' },
    logoText: { fontWeight: '700', fontSize: '18px', letterSpacing: '-0.5px' },
    navLinks: { display: 'flex', gap: '30px' },
    authGroup: { display: 'flex', alignItems: 'center', gap: '20px' },
    link: { color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '14px', fontWeight: '600', transition: 'color 0.2s' },
    btnPrimarySmall: { background: '#fff', color: '#0f172a', padding: '10px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: '700', textDecoration: 'none' },
    heroSection: { position: 'relative', zIndex: 1, minHeight: '80vh', display: 'flex', alignItems: 'center' },
    content: { display: 'flex', alignItems: 'center', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', gap: '60px' },
    leftColumn: { flex: '1 1 500px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
    badge: { padding: '6px 16px', background: 'rgba(106, 176, 255, 0.1)', border: '1px solid rgba(106, 176, 255, 0.2)', borderRadius: '20px', fontSize: '13px', fontWeight: '600', marginBottom: '24px', color: '#6ab0ff' },
    title: { fontSize: 'clamp(44px, 5vw, 64px)', fontWeight: '900', marginBottom: '24px', lineHeight: '1.1', letterSpacing: '-1.5px', minHeight: '2.3em' },
    gradientText: { background: 'linear-gradient(135deg, #fff 0%, #6ab0ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', position: 'relative' },
    subtitle: { fontSize: '18px', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '40px', maxWidth: '550px' },
    btnGroup: { display: 'flex', gap: '16px' },
    rightColumn: { flex: '1 1 400px', perspective: '1000px' },
    glassBoard: { width: '100%', maxWidth: '500px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', transform: 'rotateY(-10deg) rotateX(5deg)' },
    boardHeader: { borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    columns: { display: 'flex', gap: '16px' },
    column: { flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' },
    colHeader: { color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600' },
    card: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '8px', fontSize: '13px', color: '#fff', fontWeight: '500' },
    section: { position: 'relative', zIndex: 1, padding: '100px 20px' },
    sectionHeader: { textAlign: 'center', marginBottom: '60px', padding: '0 20px' },
    sectionTitle: { fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: '800', marginBottom: '16px', letterSpacing: '-1px' },
    sectionSubtitle: { fontSize: '18px', color: 'rgba(255,255,255,0.6)' },
    bentoIcon: { width: '56px', height: '56px', background: 'rgba(106, 176, 255, 0.1)', color: '#6ab0ff', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', marginBottom: '24px' },
    bentoTitle: { fontSize: '22px', fontWeight: '700', marginBottom: '12px' },
    bentoDesc: { fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.7' },
    pricingCard: { flex: 1, background: 'rgba(30, 41, 59, 0.7)', borderRadius: '24px', padding: '40px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' },
    pricingCardPro: { flex: 1, background: 'linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(12,102,228,0.2) 100%)', borderRadius: '24px', padding: '40px', border: '1px solid #4A9FFF', position: 'relative', display: 'flex', flexDirection: 'column' },
    proBadge: { position: 'absolute', top: '-15px', right: '30px', background: 'linear-gradient(135deg, #4A9FFF 0%, #0c66e4 100%)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#fff' },
    pricingFeatures: { listStyle: 'none', padding: 0, margin: '0 0 40px 0', color: 'rgba(255,255,255,0.8)', lineHeight: '2.2', flex: 1 },
    pricingBtnFree: { display: 'block', textAlign: 'center', padding: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', transition: 'background 0.2s' },
    pricingBtnPro: { width: '100%', padding: '14px', background: '#fff', border: 'none', borderRadius: '12px', color: '#0c66e4', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.8 },
    finalCtaBox: { width: '100%', maxWidth: '1000px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '30px', padding: '60px 20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)' },
    finalCtaTitle: { fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: '900', marginBottom: '20px', color: '#fff', letterSpacing: '-1px' },
    finalCtaDesc: { fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto' },
};

export default Home;