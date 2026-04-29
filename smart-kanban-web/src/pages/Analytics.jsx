import React, { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line
} from 'recharts';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';

const Analytics = () => {
    const [timeRange, setTimeRange] = useState('month');
    const [selectedProject, setSelectedProject] = useState('all');
    const [liveSync, setLiveSync] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [myProjects, setMyProjects] = useState([]);

    const [data, setData] = useState({
        trendData: [],
        memberPerformance: [],
        projectAllocation: [],
        cycleTimeData: [],
        totalCompleted: 0,
        totalTasks: 0, 
        totalDays: 30, 
        topPerformer: { name: 'Chưa có', tasks: 0 }
    });

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await axios.get('/api/v1/boards');
                setMyProjects(response.data || []);
            } catch (error) {
                console.error("Lỗi lấy danh sách dự án", error);
            }
        };
        fetchProjects();
    }, []);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`/api/v1/analytics?timeRange=${timeRange}&projectId=${selectedProject}`);
                setData(response.data);
            } catch (error) {
                console.error("Lỗi lấy dữ liệu Analytics", error);
                toast.error("Không thể tải báo cáo lúc này!");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();

        let interval;
        if (liveSync) {
            interval = setInterval(fetchAnalytics, 30000);
        }
        return () => clearInterval(interval);
    }, [timeRange, selectedProject, liveSync]);

    const triggerDownload = (content, fileName, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportExcel = () => {
        const overviewData = [
            { "Chỉ số": "Tổng Số Công Việc Phát Sinh", "Giá trị": data.totalTasks },
            { "Chỉ số": "Tổng Task Hoàn Thành", "Giá trị": data.totalCompleted },
            { "Chỉ số": "MVP Năng Suất Nhất", "Giá trị": `${data.topPerformer.name} (${data.topPerformer.tasks} tasks)` }
        ];

        const memberData = data.memberPerformance.map(m => ({
            "Tên Thành Viên": m.name,
            "Số Task Xử Lý Xong": m.tasks
        }));

        const projectData = data.projectAllocation.map(p => ({
            "Tên Dự Án": p.name,
            "Tỷ Trọng (%)": p.value
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), "Tổng Quan");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(memberData), "Năng Suất");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projectData), "Phân Bổ Dự Án");

        XLSX.writeFile(wb, `SmartKanban_Report_${new Date().getTime()}.xlsx`);
    };

    const handleExportCSV = () => {
        let csvContent = "\uFEFFNhân sự,Số task hoàn thành\n";
        data.memberPerformance.forEach(m => {
            csvContent += `${m.name},${m.tasks}\n`;
        });
        csvContent += "\nPhân bổ dự án,Phần trăm\n";
        data.projectAllocation.forEach(p => {
            csvContent += `${p.name},${p.value}%\n`;
        });
        triggerDownload(csvContent, `SmartKanban_Data_${new Date().getTime()}.csv`, 'text/csv;charset=utf-8');
    };

    const handleExport = (format) => {
        setShowExportMenu(false);
        setIsExporting(true);
        toast.info(`⏳ Đang trích xuất báo cáo định dạng ${format}...`);

        setTimeout(() => {
            try {
                if (format === 'Excel') {
                    handleExportExcel();
                } else if (format === 'CSV') {
                    handleExportCSV();
                } else if (format === 'PDF') {
                    window.print();
                }
                setIsExporting(false);
                if (format !== 'PDF') toast.success(`✅ Đã tải xuống báo cáo ${format} thành công!`);
            } catch {
                setIsExporting(false);
                toast.error("❌ Lỗi khi trích xuất file!");
            }
        }, 1000);
    };

    return (
        <div style={{ padding: '40px 30px', minHeight: '100%', backgroundColor: 'transparent', fontFamily: 'var(--sans)', overflowX: 'hidden' }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(39, 201, 63, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(39, 201, 63, 0); } 100% { box-shadow: 0 0 0 0 rgba(39, 201, 63, 0); } }
                
                .glass-panel { background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; transition: transform 0.3s, box-shadow 0.3s; animation: fadeIn 0.6s ease-out forwards; }
                .glass-panel:hover { border-color: rgba(106, 176, 255, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }

                .stat-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 8px; transition: all 0.3s ease; }
                .stat-box:hover { background: rgba(255,255,255,0.08); border-color: rgba(106, 176, 255, 0.3); transform: translateY(-3px); }

                .select-glass { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 10px 16px; border-radius: 10px; outline: none; cursor: pointer; font-weight: 600; font-family: inherit; transition: all 0.2s; appearance: none; font-size: 13px;}
                .select-glass:focus { border-color: #6ab0ff; box-shadow: 0 0 0 3px rgba(106, 176, 255, 0.2); }
                .select-glass option { background: #0f172a; color: #fff; }

                .export-item { color: #fff; padding: 12px 16px; text-decoration: none; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.2s; font-size: 14px; border: none; width: 100%; text-align: left; background: transparent; font-family: inherit; font-weight: 600;}
                .export-item:hover { background: rgba(255,255,255,0.1); color: #6ab0ff; }

                .sync-dot { width: 10px; height: 10px; border-radius: 50%; background: #27c93f; display: inline-block; animation: pulseGlow 1.5s infinite; margin-right: 6px; }
                .sync-dot.offline { background: #ef4444; animation: none; }
                
                @media print {
                    body * { visibility: hidden; }
                    .glass-panel, .glass-panel * { visibility: visible; }
                    .glass-panel { position: absolute; left: 0; top: 0; width: 100%; }
                }
                `}
            </style>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '32px', animation: 'fadeIn 0.5s ease-out' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', margin: 0 }}>📈 Báo cáo & Thống kê</h1>
                            <button onClick={() => { setLiveSync(!liveSync); toast.info(liveSync ? 'Đã tắt đồng bộ trực tiếp' : 'Đang bật đồng bộ SignalR...'); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                <span className={liveSync ? 'sync-dot' : 'sync-dot offline'}></span>
                                {liveSync ? 'Live Sync: ON' : 'Live Sync: OFF'}
                            </button>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>
                            Đo lường năng suất, tốc độ xử lý và phân bổ nguồn lực.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="select-glass">
                                <option value="all">🌟 Tất cả dự án</option>
                                {myProjects.map(b => (
                                    <option key={b.id || b.Id} value={b.id || b.Id}>{b.title || b.Title}</option>
                                ))}
                            </select>
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '12px', color: '#fff' }}>▼</span>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="select-glass">
                                <option value="week">7 Ngày qua</option>
                                <option value="month">Tháng này</option>
                                <option value="quarter">Quý này</option>
                            </select>
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '12px', color: '#fff' }}>▼</span>
                        </div>

                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                                disabled={isExporting}
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #0c66e4, #4A9FFF)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: isExporting ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(12, 102, 228, 0.3)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                            >
                                {isExporting ? '⏳ Đang xử lý...' : `📥 Xuất Báo Cáo ${showExportMenu ? '▴' : '▾'}`}
                            </button>

                            {showExportMenu && (
                                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '8px', background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 100, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
                                    <button className="export-item" onClick={() => handleExport('PDF')}>📄 File In / PDF</button>
                                    <button className="export-item" onClick={() => handleExport('Excel')}>📊 File Excel (.xlsx)</button>
                                    <button className="export-item" onClick={() => handleExport('CSV')}>📑 File CSV (.csv)</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0', color: '#6ab0ff' }}>
                        <svg style={{ animation: 'spin 1s linear infinite', height: '40px', width: '40px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"></path></svg>
                        <p>Đang tổng hợp dữ liệu...</p>
                    </div>
                ) : (
                    <>
                        {/* 💡 HÀNG STAT BOX MỚI (4 Ô ĐỀU NHAU) */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '32px', animation: 'fadeIn 0.6s ease-out 0.1s both' }}>

                            {/* Ô MỚI: TỔNG SỐ TASK */}
                            <div className="stat-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Tổng Công Việc</span>
                                    <span style={{ background: 'rgba(106, 176, 255, 0.1)', color: '#6ab0ff', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>{data.totalDays} Ngày</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff' }}>{data.totalTasks}</div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600' }}>Task phát sinh trong kỳ</div>
                            </div>

                            <div className="stat-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Task Hoàn Thành</span>
                                    {data.totalCompleted > 0 && <span style={{ background: 'rgba(39, 201, 63, 0.1)', color: '#27c93f', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>Tốt</span>}
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff' }}>{data.totalCompleted}</div>
                                <div style={{ color: '#27c93f', fontSize: '13px', fontWeight: '600' }}>Đã kéo qua cột Xong</div>
                            </div>

                            <div className="stat-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Tốc độ xử lý</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff' }}>
                                    {data.cycleTimeData.length > 0 ? data.cycleTimeData[data.cycleTimeData.length - 1].cycleTime : 0}
                                    <span style={{ fontSize: '16px', fontWeight: 'normal', color: 'rgba(255,255,255,0.5)' }}> Ngày/Task</span>
                                </div>
                                <div style={{ color: '#6ab0ff', fontSize: '13px', fontWeight: '600' }}>Trung bình Doing {"->"} Done</div>
                            </div>

                            <div className="stat-box" style={{ background: 'linear-gradient(135deg, rgba(12, 102, 228, 0.1), rgba(135, 119, 217, 0.1))', borderColor: 'rgba(106, 176, 255, 0.3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#6ab0ff', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>🌟 MVP Năng Suất</span>
                                    <span style={{ fontSize: '20px' }}>🏆</span>
                                </div>
                                <div style={{ fontSize: '26px', fontWeight: '900', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.topPerformer.name}</div>
                                <div style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Xử lý <strong style={{ color: '#6ab0ff' }}>{data.topPerformer.tasks} Tasks</strong>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
                            <div className="glass-panel" style={{ flex: '2 1 600px', animationDelay: '0.2s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🌊</span> Lưu lượng công việc (CFD)
                                    </h2>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', fontWeight: '600' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#27c93f' }}></span> Hoàn thành</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></span> Phát sinh mới</div>
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#27c93f" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#27c93f" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13 }} axisLine={false} tickLine={false} dy={10} />
                                            <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13 }} axisLine={false} tickLine={false} dx={-10} allowDecimals={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff' }} itemStyle={{ fontWeight: 'bold' }} />
                                            <Area type="monotone" dataKey="completed" name="Hoàn thành" stroke="#27c93f" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                                            <Area type="monotone" dataKey="newTasks" name="Phát sinh" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ flex: '1 1 400px', animationDelay: '0.3s' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⏱️</span> Tốc độ xử lý (Lead & Cycle Time)
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 24px 0' }}>Đơn vị tính: Số ngày/Task. Càng thấp càng tốt.</p>
                                <div style={{ width: '100%', height: '280px' }}>
                                    <ResponsiveContainer>
                                        <ComposedChart data={data.cycleTimeData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="sprint" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                            <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff' }} />
                                            <Bar dataKey="leadTime" name="Lead Time (Từ tạo tới xong)" fill="#4A9FFF" barSize={20} radius={[4, 4, 0, 0]} />
                                            <Line type="monotone" dataKey="cycleTime" name="Cycle Time (Từ Doing tới Done)" stroke="#ffbd2e" strokeWidth={3} dot={{ r: 5, fill: '#ffbd2e', strokeWidth: 2, stroke: '#0f172a' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                            <div className="glass-panel" style={{ flex: '2 1 500px', animationDelay: '0.4s' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>📊</span> Đóng góp cá nhân
                                </h2>
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer>
                                        <BarChart data={data.memberPerformance} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                            <XAxis type="number" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" tick={{ fill: '#fff', fontWeight: 'bold' }} axisLine={false} tickLine={false} width={100} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff' }} />
                                            <Bar dataKey="tasks" name="Số Task hoàn thành" fill="#0c66e4" radius={[0, 8, 8, 0]} barSize={24}>
                                                {data.memberPerformance.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ffbd2e' : '#0c66e4'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ flex: '1 1 350px', animationDelay: '0.5s' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🍩</span> Tỷ trọng nguồn lực (Workload)
                                </h2>
                                <div style={{ width: '100%', height: '240px', position: 'relative' }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={data.projectAllocation} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                                {data.projectAllocation.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} formatter={(value) => `${value}%`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>100%</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Workload</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                    {data.projectAllocation.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontWeight: '500' }}>
                                                <span style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: item.color }}></span>
                                                {item.name}
                                            </div>
                                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>{item.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="dark" />
        </div>
    );
};

export default Analytics;