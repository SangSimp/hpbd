import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DashboardOverview = () => {
    const [recentBoards, setRecentBoards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState('today');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState('Người dùng');
    const [isBoss, setIsBoss] = useState(false);
    const [realPosition, setRealPosition] = useState('Nhân viên');

    const [dashboardStats, setDashboardStats] = useState({
        activeBoards: 0, completedTasks: 0, dueSoonTasks: 0, performanceRate: 0, totalTasks: 0,
        chartData: [], productivityData: [], teamWorkload: [], myTasks: [], recentActivities: []
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // 💡 LOGIC LẤY CHỨC VỤ THẬT TỪ DATABASE (BỎ QUA TOKEN)
    useEffect(() => {
        const fetchRealUserRole = async () => {
            try {
                const userStr = localStorage.getItem('user');
                let tempName = 'Người dùng';
                let tempId = null;
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    tempName = userObj.fullName || userObj.FullName || userObj.name || 'Người dùng';
                    tempId = userObj.id || userObj.Id;
                }
                setDisplayName(tempName);

                const res = await axios.get('/api/v1/users');
                const myProfile = res.data.find(u => u.id === tempId || u.name === tempName);

                if (myProfile && myProfile.position) {
                    setRealPosition(myProfile.position);
                    const posLower = myProfile.position.toLowerCase();
                    if (posLower.includes('giám đốc') || posLower.includes('chủ tịch') || posLower.includes('ceo')) {
                        setIsBoss(true);
                    }
                }
            } catch (error) {
                console.error("Lỗi xác thực chức vụ:", error);
            }
        };
        fetchRealUserRole();
    }, []);

    useEffect(() => {
        const fetchBoardsAndStats = async () => {
            try {
                const response = await axios.get('/api/v1/boards');
                const allBoards = Array.isArray(response.data) ? response.data : [];
                const recentIds = JSON.parse(localStorage.getItem('recent_boards') || '[]');
                let sortedBoards = [];
                recentIds.forEach(id => {
                    const board = allBoards.find(b => String(b.id || b.Id) === String(id));
                    if (board) sortedBoards.push(board);
                });
                const unclickedBoards = allBoards.filter(b => !recentIds.includes(String(b.id || b.Id))).reverse();
                sortedBoards = [...sortedBoards, ...unclickedBoards];
                setRecentBoards(sortedBoards.slice(0, 3));

                const statRes = await axios.get('/api/v1/boards/dashboard-stats');
                const stats = statRes.data;

                let dynamicChartData = [
                    { name: 'Cần làm', value: stats.todoTasks, color: '#6ab0ff' },
                    { name: 'Đang tiến hành', value: stats.doingTasks, color: '#ffbd2e' },
                    { name: 'Chờ duyệt', value: stats.reviewTasks, color: '#8777D9' },
                    { name: 'Hoàn thành', value: stats.completedTasks, color: '#27c93f' }
                ];
                if (stats.totalTasks === 0) dynamicChartData = [{ name: 'Chưa có task', value: 1, color: 'rgba(255,255,255,0.1)' }];

                setDashboardStats({ ...stats, chartData: dynamicChartData });
            } catch (error) {
                console.error("Lỗi tải bảng & thống kê:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBoardsAndStats();
    }, []);

    const triggerDownload = (content, fileName, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowExportMenu(false);
    };

    const handleExportTXT = () => {
        const reportContent = `==================================================\nBÁO CÁO TIẾN ĐỘ TUẦN - SMART KANBAN\n==================================================\nNgày xuất: ${currentTime.toLocaleDateString('vi-VN')} | Người xuất: ${displayName} (${realPosition})\n--------------------------------------------------\n1. TỔNG QUAN:\n- Dự án đang chạy: ${dashboardStats.activeBoards}\n- Tổng Tasks: ${dashboardStats.totalTasks}\n- Đã xong: ${dashboardStats.completedTasks}\n- Hiệu suất: ${dashboardStats.performanceRate}%\n\n2. CHI TIẾT TRẠNG THÁI:\n${dashboardStats.chartData.map(c => `- ${c.name}: ${c.value} task`).join('\n')}\n\n3. TÌNH TRẠNG NHÂN SỰ:\n${dashboardStats.teamWorkload.map(t => `- ${t.name}: đang làm ${t.tasks} việc`).join('\n')}\n==================================================`;
        triggerDownload(reportContent, `Bao_Cao_${new Date().getTime()}.txt`, 'text/plain;charset=utf-8');
        toast.success("📝 Đã xuất báo cáo dạng TXT!");
    };

    const handleExportCSV = () => {
        let csvContent = "\uFEFFMục thống kê,Giá trị\n";
        csvContent += `Dự án đang chạy,${dashboardStats.activeBoards}\n`;
        csvContent += `Tổng Tasks,${dashboardStats.totalTasks}\n`;
        csvContent += `Tasks hoàn thành,${dashboardStats.completedTasks}\n`;
        csvContent += `Sắp trễ hạn,${dashboardStats.dueSoonTasks}\n`;
        csvContent += `Hiệu suất (%),${dashboardStats.performanceRate}\n\n`;
        csvContent += "Trạng thái Task,Số lượng\n";
        dashboardStats.chartData.forEach(c => { csvContent += `${c.name},${c.value}\n`; });
        csvContent += "\nNhân sự,Số lượng Task đang đảm nhận\n";
        dashboardStats.teamWorkload.forEach(t => { csvContent += `${t.name},${t.tasks}\n`; });
        triggerDownload(csvContent, `Bao_Cao_${new Date().getTime()}.csv`, 'text/csv;charset=utf-8');
        toast.success("📊 Đã xuất báo cáo CSV cho Excel!");
    };

    const handleExportJSON = () => {
        const jsonContent = JSON.stringify(dashboardStats, null, 2);
        triggerDownload(jsonContent, `Data_Export_${new Date().getTime()}.json`, 'application/json');
        toast.success("📋 Đã trích xuất dữ liệu thô JSON!");
    };

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = currentTime.toLocaleDateString('vi-VN', options);
    const timeString = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const filteredTasks = (dashboardStats.myTasks || []).filter(task => {
        if (!task.dueDate) return activeTab === 'upcoming';
        const due = new Date(task.dueDate).setHours(0, 0, 0, 0);
        const today = new Date().setHours(0, 0, 0, 0);
        if (activeTab === 'overdue') return due < today;
        if (activeTab === 'today') return due === today;
        return due > today;
    });

    const maxWorkload = Math.max(...(dashboardStats.teamWorkload || []).map(m => m.tasks), 5);

    return (
        <div style={{ padding: '40px 30px', minHeight: '100%', backgroundColor: 'transparent', fontFamily: 'var(--sans)', overflowX: 'hidden' }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes gradientFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                
                .glass-panel { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; transition: transform 0.3s, box-shadow 0.3s; }
                .glass-panel:hover { border-color: rgba(106, 176, 255, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }

                .stat-card { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; flex: 1; min-width: 200px; display: flex; align-items: center; gap: 16px; transition: transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease; animation: fadeIn 0.6s ease-out forwards; }
                .stat-card:hover { transform: translateY(-5px); background: rgba(30, 41, 59, 0.6); border-color: rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }

                .quick-action-btn { padding: 10px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; backdrop-filter: blur(10px); }
                .quick-action-btn:hover { background: rgba(255,255,255,0.15); transform: translateY(-2px); border-color: #6ab0ff; }
                .quick-action-btn.primary { background: linear-gradient(135deg, #0c66e4, #4A9FFF); border: none; box-shadow: 0 4px 15px rgba(12, 102, 228, 0.3); }
                .quick-action-btn.primary:hover { background: linear-gradient(135deg, #4A9FFF, #6ab0ff); box-shadow: 0 6px 20px rgba(12, 102, 228, 0.5); }

                .export-menu-btn { width: 100%; background: transparent; border: none; color: #fff; text-align: left; padding: 10px 16px; border-radius: 8px; cursor: pointer; transition: background 0.2s; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .export-menu-btn:hover { background: rgba(255,255,255,0.1); color: #6ab0ff; }

                .board-card-mini { background: rgba(255,255,255,0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 16px; transition: all 0.3s; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; height: 120px; text-decoration: none; color: white; position: relative; overflow: hidden; }
                .board-card-mini::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%); opacity: 0; transition: opacity 0.3s; z-index: 1; }
                .board-card-mini:hover { transform: translateY(-4px); border-color: rgba(106, 176, 255, 0.5); box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
                .board-card-mini:hover::before { opacity: 1; }

                .task-list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; }
                .task-list-item:hover { background: rgba(255,255,255,0.03); }
                .task-list-item:last-child { border-bottom: none; }

                .activity-feed-item { position: relative; padding-left: 20px; padding-bottom: 16px; }
                .activity-feed-item::before { content: ''; position: absolute; left: 4px; top: 6px; bottom: -6px; width: 2px; background: rgba(255,255,255,0.1); }
                .activity-feed-item:last-child::before { display: none; }
                .activity-feed-item::after { content: ''; position: absolute; left: -1px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: #0c66e4; border: 2px solid #0f172a; box-shadow: 0 0 8px #0c66e4; }

                .ai-banner { background: linear-gradient(-45deg, #0c66e4, #8777D9, #4A9FFF, #0c66e4); background-size: 400% 400%; animation: gradientFlow 10s ease infinite; }
                .tab-btn { background: transparent; border: none; color: rgba(255,255,255,0.5); font-weight: 600; padding: 6px 12px; cursor: pointer; transition: all 0.2s; border-radius: 6px; font-size: 13px; }
                .tab-btn.active { background: rgba(106, 176, 255, 0.2); color: #6ab0ff; }
                .tab-btn:hover:not(.active) { color: #fff; background: rgba(255,255,255,0.05); }

                .progress-track { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-top: 8px; }
                .progress-fill { height: 100%; border-radius: 10px; transition: width 0.5s ease-out; }
                `}
            </style>

            <div style={{ maxWidth: '1350px', margin: '0 auto' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '24px', animation: 'fadeIn 0.5s ease-out' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isBoss ? `👋 Chào sếp, ${displayName}!` : `👋 Xin chào, ${displayName}!`}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>
                            Hệ thống đã sẵn sàng. Chúc {isBoss ? 'sếp' : 'bạn'} một ngày làm việc hiệu quả!
                        </p>
                    </div>
                    <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.8)' }}>
                        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>{timeString}</div>
                        <div style={{ fontSize: '14px', color: '#6ab0ff', fontWeight: '500' }}>{dateString}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', animation: 'fadeIn 0.5s ease-out 0.1s both', position: 'relative', zIndex: 100 }}>
                    <Link to="/d/boards" style={{ textDecoration: 'none' }}><button className="quick-action-btn primary"><span>➕</span> Tạo Bảng Mới</button></Link>
                    <Link to="/d/members" style={{ textDecoration: 'none' }}><button className="quick-action-btn"><span>👥</span> Mời Thành Viên</button></Link>

                    <div style={{ position: 'relative' }}>
                        <button className="quick-action-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
                            <span>📥</span> Xuất Báo Cáo Tuần {showExportMenu ? '▴' : '▾'}
                        </button>

                        {showExportMenu && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', width: '220px', boxShadow: '0 15px 35px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', padding: '4px 16px 8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px', fontWeight: 'bold' }}>Chọn định dạng</div>
                                <button className="export-menu-btn" onClick={handleExportTXT}>📝 Xuất file TXT (Đọc nhanh)</button>
                                <button className="export-menu-btn" onClick={handleExportCSV}>📊 Xuất file CSV (Cho Excel)</button>
                                <button className="export-menu-btn" onClick={handleExportJSON}>📋 Xuất file JSON (Raw Data)</button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                    <div className="stat-card" style={{ animationDelay: '0.1s' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(106, 176, 255, 0.1)', color: '#6ab0ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px' }}>📁</div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{dashboardStats.activeBoards}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Dự án đang chạy</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ animationDelay: '0.2s' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(39, 201, 63, 0.1)', color: '#27c93f', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px' }}>✅</div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{dashboardStats.completedTasks}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Task hoàn thành</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ animationDelay: '0.3s' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 95, 86, 0.1)', color: '#ff5f56', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px' }}>⏰</div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{dashboardStats.dueSoonTasks}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Sắp trễ hạn</div>
                        </div>
                    </div>
                    <div className="stat-card" style={{ animationDelay: '0.4s' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 189, 46, 0.1)', color: '#ffbd2e', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px' }}>🔥</div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {dashboardStats.performanceRate}% <span style={{ fontSize: '12px', color: '#27c93f', background: 'rgba(39, 201, 63, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>Hiệu suất</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Hoàn thành task</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '24px' }}>
                    <div className="glass-panel" style={{ flex: '1 1 300px', animation: 'fadeIn 0.6s ease-out 0.2s both', opacity: 0 }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🍩</span> Phân bổ công việc</h2>
                        <div style={{ height: '200px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dashboardStats.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {dashboardStats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{dashboardStats.totalTasks}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Tổng Tasks</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '10px' }}>
                            {dashboardStats.chartData.map((item, idx) => {
                                if (item.name === 'Chưa có task') return null;
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></span>{item.name}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ flex: '2 1 500px', animation: 'fadeIn 0.6s ease-out 0.3s both', opacity: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><span>📈</span> Mức độ hoàn thành trong tuần</h2>
                        </div>
                        <div style={{ flex: 1, minHeight: '200px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dashboardStats.productivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTask" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6ab0ff" stopOpacity={0.5} />
                                            <stop offset="95%" stopColor="#6ab0ff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#6ab0ff', fontWeight: 'bold' }} />
                                    <Area type="monotone" dataKey="task" name="Hoàn thành" stroke="#6ab0ff" strokeWidth={3} fillOpacity={1} fill="url(#colorTask)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '24px' }}>
                    <div className="glass-panel" style={{ flex: '1.5 1 350px', padding: 0, overflow: 'hidden', animation: 'fadeIn 0.6s ease-out 0.4s both', opacity: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>🎯 Việc cần làm (Của bạn)</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`} onClick={() => setActiveTab('today')}>Hôm nay</button>
                                <button className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>Sắp tới</button>
                                <button className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`} onClick={() => setActiveTab('overdue')}>Trễ hạn</button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '250px' }}>
                            {filteredTasks.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Không có công việc nào ở mục này!</div>
                            ) : (
                                filteredTasks.map((task, i) => (
                                    <div key={task.id || i} className="task-list-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <input type="checkbox" style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#27c93f' }} />
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{task.title}</div>
                                                <div
                                                    onClick={() => {
                                                        if (task.boardId || task.BoardId) {
                                                            navigate(`/d/boards/${task.boardId || task.BoardId}`);
                                                        } else {
                                                            toast.warning("⚠️ Task này bị mất liên kết với Dự án (Không tìm thấy ID)!");
                                                        }
                                                    }} 
                                                    style={{
                                                        fontSize: '11px',
                                                        color: '#6ab0ff', // Đổi sang màu xanh link
                                                        cursor: 'pointer', // Chuyển con trỏ thành hình bàn tay
                                                        display: 'inline-block',
                                                        marginTop: '4px',
                                                        transition: 'color 0.2s ease',
                                                        fontWeight: '500'
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.textDecoration = 'underline'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#6ab0ff'; e.currentTarget.style.textDecoration = 'none'; }}
                                                    title="Nhấn để đi đến dự án này"
                                                >
                                                    📁 Dự án: {task.boardName || "Không xác định"}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${task.color}`, color: task.color, backgroundColor: `${task.color}15`, whiteSpace: 'nowrap' }}>
                                            {task.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ flex: '1 1 300px', animation: 'fadeIn 0.6s ease-out 0.5s both', opacity: 0, padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '350px' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>👥</span> Tải công việc đội ngũ
                        </h3>

                        {/* 💡 KHU VỰC CÓ THANH CUỘN VÀ CHỨA DATA THẬT */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {dashboardStats.teamWorkload.map((member, idx) => {
                                const widthPercent = Math.min((member.tasks / maxWorkload) * 100, 100);
                                return (
                                    <div key={idx}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: member.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{member.name}</span>
                                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{member.tasks} tasks</span>
                                            </div>
                                        </div>
                                        <div className="progress-track" style={{ height: '6px', marginLeft: '38px' }}>
                                            <div className="progress-fill" style={{ width: `${widthPercent}%`, backgroundColor: member.color }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 💡 NÚT QUẢN LÝ CỐ ĐỊNH Ở ĐÁY */}
                        <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <span
                                onClick={() => navigate('/d/members')}
                                style={{ cursor: 'pointer', color: '#6ab0ff', fontSize: '13px', fontWeight: '600', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.target.style.color = '#fff'}
                                onMouseLeave={(e) => e.target.style.color = '#6ab0ff'}
                            >
                                Quản lý nhân sự ›
                            </span>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ flex: '1.5 1 350px', animation: 'fadeIn 0.6s ease-out 0.6s both', opacity: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><span>🕒</span> Bảng truy cập gần đây</h2>
                            <Link to="/d/boards" style={{ color: '#6ab0ff', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>Xem tất cả</Link>
                        </div>
                        {isLoading ? (
                            <div style={{ textAlign: 'center', color: '#6ab0ff', padding: '20px 0' }}>Đang tải...</div>
                        ) : recentBoards.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px 0' }}>Chưa có dự án nào.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {recentBoards.map(board => {
                                    const bgImg = board.backgroundUrl || board.BackgroundUrl;
                                    return (
                                        <Link to={`/d/boards/${board.id || board.Id}`} key={board.id || board.Id} className="board-card-mini" style={{ height: '70px', padding: '12px 16px', flexDirection: 'row', alignItems: 'center', backgroundImage: bgImg ? `url(${bgImg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                            {bgImg && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.8), rgba(15,23,42,0.4))', zIndex: 0 }}></div>}
                                            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', backdropFilter: 'blur(5px)' }}>📊</div>
                                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{board.title || board.Title}</h3>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                    <div className="ai-banner" style={{ flex: '1 1 350px', borderRadius: '20px', padding: '30px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff', position: 'relative', overflow: 'hidden', border: '1px solid rgba(106, 176, 255, 0.5)', boxShadow: '0 10px 30px rgba(12, 102, 228, 0.4)' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.15, transform: 'rotate(15deg)' }}>🤖</div>
                        <h3 style={{ fontSize: '18px', margin: '0 0 12px 0', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>✨ Smart AI Trợ lý</h3>
                        <p style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.95, margin: '0 0 20px 0', position: 'relative', zIndex: 1, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Hệ thống nhận thấy Đội ngũ QA đang quá tải. Hãy để AI gợi ý phương án điều phối nhân sự lại cho sếp.</p>
                        <button style={{ alignSelf: 'flex-start', padding: '8px 16px', background: '#fff', color: '#0c66e4', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', position: 'relative', zIndex: 1, boxShadow: '0 4px 15px rgba(0,0,0,0.3)', transition: 'transform 0.2s', fontSize: '13px' }} onMouseEnter={e => e.target.style.transform = 'scale(1.05)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'}>Yêu cầu Tư vấn</button>
                    </div>

                    <div className="glass-panel" style={{ flex: '2 1 500px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>⚡ Nhật ký hệ thống</h3>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                            {dashboardStats.recentActivities.length === 0 ? (
                                <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>Chưa có hoạt động nào gần đây.</div>
                            ) : (
                                dashboardStats.recentActivities.map((log, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                                        {/* Tạo đường kẻ dọc nối các avatar với nhau */}
                                        {i !== dashboardStats.recentActivities.length - 1 && (
                                            <div style={{ position: 'absolute', top: '32px', bottom: '-16px', left: '16px', width: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
                                        )}

                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <img
                                                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${log.user}`}
                                                alt="avatar"
                                                style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.1)' }}
                                            />
                                        </div>

                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#fff', lineHeight: '1.4' }}>
                                                <strong style={{ color: '#6ab0ff' }}>{log.user}</strong> {log.action}
                                            </p>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                🕒 {log.time}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="dark" />
        </div>
    );
};

export default DashboardOverview;