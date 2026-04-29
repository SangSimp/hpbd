import React, { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from 'react-router-dom';

const hexToRgba = (hex, opacity) => {
    if (!hex) return `rgba(106, 176, 255, ${opacity})`;
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
    }
    return `rgba(106, 176, 255, ${opacity})`;
};

const CalendarView = () => {
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState('all');
    const [currentDate, setCurrentDate] = useState(new Date());

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [viewMode, setViewMode] = useState('calendar');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => {
        const fetchCalendarTasks = async () => {
            try {
                const response = await axios.get('/api/v1/boards/calendar-tasks');
                setTasks(response.data);
            } catch (error) {
                console.error("Lỗi tải dữ liệu lịch:", error);
                toast.error("❌ Không thể đồng bộ dữ liệu lịch tiến độ.");
            }
        };
        fetchCalendarTasks();
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthLabel = `Tháng ${month + 1}, ${year}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const emptySlots = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const emptyDays = Array.from({ length: emptySlots }).map((_, i) => i);
    const daysArray = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleTaskClick = (task, e) => {
        if (e) e.stopPropagation();
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    // 💡 LOGIC LỌC ĐÃ ĐƯỢC FIX LỖI "HIỂN THỊ TẤT CẢ"
    const getFilteredTasks = () => {
        return tasks.filter(t => {
            if (!t.dueDate) return false;
            const taskDate = new Date(t.dueDate);
            taskDate.setHours(0, 0, 0, 0);

            if (viewMode === 'list') {
                if (startDate && endDate) {
                    // Lọc theo khoảng nếu có ĐỦ 2 ngày
                    if (taskDate < new Date(startDate).setHours(0, 0, 0, 0) || taskDate > new Date(endDate).setHours(23, 59, 59, 999)) return false;
                } else if (startDate) {
                    // Chỉ có ngày BẮT ĐẦU -> Tìm chính xác ngày đó
                    const sDate = new Date(startDate);
                    if (taskDate.getDate() !== sDate.getDate() || taskDate.getMonth() !== sDate.getMonth() || taskDate.getFullYear() !== sDate.getFullYear()) return false;
                } else if (endDate) {
                    // Chỉ có ngày KẾT THÚC -> Tìm chính xác ngày đó
                    const eDate = new Date(endDate);
                    if (taskDate.getDate() !== eDate.getDate() || taskDate.getMonth() !== eDate.getMonth() || taskDate.getFullYear() !== eDate.getFullYear()) return false;
                } else {
                    // Không nhập gì -> Lọc theo tháng hiện tại đang xem
                    if (taskDate.getMonth() !== month || taskDate.getFullYear() !== year) return false;
                }
            }

            const status = (t.status || '').toLowerCase();
            if (filter === 'all') return true;
            if (filter === 'overdue') return status !== 'done' && taskDate < today;
            if (filter === 'upcoming') return status !== 'done' && taskDate >= today;
            return status === filter;
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    };

    const allFilteredTasks = getFilteredTasks();

    return (
        <div style={{ padding: '40px 30px', minHeight: '100%', backgroundColor: 'transparent', fontFamily: 'var(--sans)', overflowX: 'hidden' }}>
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes glowPulse { 0% { box-shadow: 0 0 5px #0c66e4; } 50% { box-shadow: 0 0 15px #0c66e4, 0 0 5px #0c66e4; } 100% { box-shadow: 0 0 5px #0c66e4; } }
                
                .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); animation: fadeIn 0.5s ease-out; }
                
                .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; margin-top: 20px; }
                .weekday-header { text-align: center; color: rgba(255,255,255,0.4); font-weight: 800; font-size: 12px; text-transform: uppercase; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); letter-spacing: 1px; }
                
                .day-cell { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03); border-radius: 12px; min-height: 140px; padding: 12px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; gap: 6px; position: relative; overflow: hidden; }
                .day-cell:hover { background: rgba(255,255,255,0.06); border-color: rgba(106, 176, 255, 0.4); box-shadow: 0 10px 20px rgba(0,0,0,0.2); transform: translateY(-3px); }
                .day-cell.empty { background: transparent; border: 1px dashed rgba(255,255,255,0.05); cursor: default; }
                
                .day-cell.today { border-color: rgba(12, 102, 228, 0.4); background: rgba(12, 102, 228, 0.05); }
                .day-number { font-size: 14px; font-weight: bold; color: rgba(255,255,255,0.6); margin-bottom: 6px; display: flex; justify-content: center; align-items: center; width: 28px; height: 28px; border-radius: 50%; transition: all 0.2s; }
                .day-cell.today .day-number { background: #0c66e4; color: #fff; animation: glowPulse 2s infinite; }

                .task-pill { font-size: 12px; font-weight: 600; color: #fff; padding: 6px 8px 6px 12px; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; transition: all 0.2s; border-right: 1px solid transparent; border-top: 1px solid transparent; border-bottom: 1px solid transparent; }
                .task-pill:hover { transform: translateX(4px); filter: brightness(1.2); border-color: rgba(255,255,255,0.1); }

                .btn-icon { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s; font-size: 14px; }
                .btn-icon:hover { background: rgba(106, 176, 255, 0.2); border-color: #6ab0ff; transform: scale(1.05); }
                
                .filter-btn { background: transparent; border: 1px solid transparent; color: rgba(255,255,255,0.5); padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
                .filter-btn.active { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
                
                .date-range-box { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 4px 12px; height: 36px; animation: fadeIn 0.3s ease-out; }
                .date-picker-noborder { background: transparent; border: none; color: #fff; outline: none; font-family: inherit; font-size: 13px; cursor: pointer; }
                .date-picker-noborder::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.6; transition: 0.2s; cursor: pointer; }
                .date-picker-noborder::-webkit-calendar-picker-indicator:hover { opacity: 1; }
                
                .view-toggle-btn { background: transparent; border: none; color: rgba(255,255,255,0.4); padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
                .view-toggle-btn.active { background: #0c66e4; color: #fff; box-shadow: 0 4px 10px rgba(12, 102, 228, 0.3); }
                
                /* 💡 DANH SÁCH COMPACT: Thu gọn chiều cao, thiết kế lại hiển thị ngày tháng */
                .list-container { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; animation: fadeIn 0.3s ease-out; }
                .list-item { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; min-height: 54px; }
                .list-item:hover { background: rgba(255,255,255,0.06); transform: translateX(6px); border-color: rgba(106, 176, 255, 0.3); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
                
                .list-item-title { flex: 1; font-size: 15px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 16px; }
                .list-item-project { fontSize: 12px; color: rgba(255,255,255,0.6); background: rgba(0,0,0,0.3); padding: 4px 12px; border-radius: 20px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 6px;}

                .modal-task-link { display: inline-flex; align-items: center; gap: 8px; font-size: 18px; font-weight: bold; line-height: 1.4; color: #fff; text-decoration: none; padding: 6px 10px; margin-left: -10px; border-radius: 8px; transition: all 0.2s; border: 1px solid transparent; }
                .modal-task-link:hover { background: rgba(106, 176, 255, 0.1); color: #6ab0ff; border-color: rgba(106, 176, 255, 0.3); transform: translateX(4px); }

                .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); z-index: 1000; display: flex; justify-content: center; align-items: center; animation: fadeIn 0.2s ease-out; }
                .modal-content { background: linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9)); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 32px; width: 420px; color: #fff; box-shadow: 0 25px 50px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
                `}
            </style>

            <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

                {/* THANH ĐIỀU KHIỂN TOP */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>📅 Lịch tiến độ</h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>Quản lý chặt chẽ Deadlines của toàn bộ dự án.</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

                        {/* 💡 HIỂN THỊ "NHẢY THÁNG" CHO LỊCH, VÀ "TỪ-ĐẾN" CHO DANH SÁCH */}
                        {viewMode === 'list' ? (
                            <div className="date-range-box">
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Từ</span>
                                <input type="date" className="date-picker-noborder" value={startDate} onChange={e => setStartDate(e.target.value)} title="Ngày bắt đầu" />
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>đến</span>
                                <input type="date" className="date-picker-noborder" value={endDate} onChange={e => setEndDate(e.target.value)} title="Ngày kết thúc" />
                                {(startDate || endDate) && (
                                    <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold' }} title="Xóa lọc">✖</button>
                                )}
                            </div>
                        ) : (
                            <div className="date-range-box">
                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>🗓️ Tới tháng:</span>
                                <input
                                    type="month"
                                    className="date-picker-noborder"
                                    value={`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`}
                                    title="Nhảy nhanh đến tháng"
                                    onChange={e => {
                                        if (e.target.value) {
                                            const [y, m] = e.target.value.split('-');
                                            setCurrentDate(new Date(y, m - 1, 1));
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* NÚT LỌC TRẠNG THÁI */}
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
                            <button className={`filter-btn ${filter === 'doing' ? 'active' : ''}`} onClick={() => setFilter(filter === 'doing' ? 'all' : 'doing')}>Đang làm</button>
                            <button className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`} onClick={() => setFilter(filter === 'upcoming' ? 'all' : 'upcoming')}>Tới hạn</button>
                            <button className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} style={{ color: filter === 'overdue' ? '#fff' : '#ef4444' }}>Trễ hạn</button>
                        </div>

                        {/* CÔNG TẮC VIEW MODE */}
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)', marginLeft: '8px' }}>
                            <button className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>📅 Lịch</button>
                            <button className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>📋 Danh sách</button>
                        </div>
                    </div>
                </div>

                <div className="glass-panel">

                    {/* =========================================
                        CHẾ ĐỘ 1: XEM LỊCH THÁNG (CALENDAR VIEW)
                        ========================================= */}
                    {viewMode === 'calendar' && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <button className="btn-icon" onClick={handlePrevMonth}>◄</button>
                                    <h2 style={{ color: '#fff', fontSize: '24px', margin: 0, fontWeight: '900', minWidth: '200px', textAlign: 'center', letterSpacing: '0.5px' }}>
                                        {monthLabel}
                                    </h2>
                                    <button className="btn-icon" onClick={handleNextMonth}>►</button>
                                    <button className="btn-icon" style={{ marginLeft: '8px' }} onClick={() => setCurrentDate(new Date())} title="Về tháng hiện tại">📌</button>
                                </div>
                            </div>

                            <div className="calendar-grid">
                                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map(day => (
                                    <div key={day} className="weekday-header">{day}</div>
                                ))}

                                {emptyDays.map(i => <div key={`empty-${i}`} className="day-cell empty"></div>)}

                                {daysArray.map(day => {
                                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                                    const dayTasks = allFilteredTasks.filter(t => {
                                        const taskDate = new Date(t.dueDate);
                                        return taskDate.getDate() === day && taskDate.getMonth() === month && taskDate.getFullYear() === year;
                                    });

                                    return (
                                        <div key={day} className={`day-cell ${isToday ? 'today' : ''}`}>
                                            <span className="day-number">{day}</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {dayTasks.map(task => {
                                                    const baseColor = task.color || '#6ab0ff';
                                                    return (
                                                        <div key={task.id} className="task-pill" style={{ backgroundColor: hexToRgba(baseColor, 0.15), borderLeft: `4px solid ${baseColor}`, color: '#fff' }} onClick={(e) => handleTaskClick(task, e)} title={`${task.boardName}: ${task.title}`}>
                                                            {task.title}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* =========================================
                        CHẾ ĐỘ 2: XEM DANH SÁCH (LIST VIEW)
                        ========================================= */}
                    {viewMode === 'list' && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                                {(!startDate && !endDate) ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <button className="btn-icon" onClick={handlePrevMonth}>◄</button>
                                        <h2 style={{ color: '#fff', fontSize: '18px', margin: 0, fontWeight: '800', minWidth: '180px', textAlign: 'center' }}>
                                            {monthLabel} <span style={{ fontSize: '13px', color: '#6ab0ff' }}>({allFilteredTasks.length})</span>
                                        </h2>
                                        <button className="btn-icon" onClick={handleNextMonth}>►</button>
                                        <button className="btn-icon" style={{ marginLeft: '8px' }} onClick={() => setCurrentDate(new Date())} title="Về tháng hiện tại">📌</button>
                                    </div>
                                ) : (
                                    <h2 style={{ color: '#fff', fontSize: '18px', margin: 0, fontWeight: '800' }}>
                                        📋 TỔNG HỢP {allFilteredTasks.length} CÔNG VIỆC
                                    </h2>
                                )}
                            </div>

                            <div className="list-container">
                                {allFilteredTasks.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.4)' }}>
                                        <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                                        <h3 style={{ margin: 0, color: '#fff' }}>Chưa có công việc nào</h3>
                                        <p style={{ marginTop: '8px', fontSize: '14px' }}>Thử thay đổi bộ lọc hoặc khoảng thời gian xem sao sếp!</p>
                                    </div>
                                ) : (
                                    allFilteredTasks.map(task => {
                                        const baseColor = task.color || '#6ab0ff';
                                        const tDate = new Date(task.dueDate);
                                        const isLate = tDate < today && task.status !== 'done';

                                        return (
                                            <div key={task.id} className="list-item" onClick={(e) => handleTaskClick(task, e)}>
                                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: baseColor }}></div>

                                                {/* 💡 THIẾT KẾ MỚI: NGÀY THÁNG COMPACT NẰM NGANG */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '100px', marginLeft: '6px' }}>
                                                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff' }}>
                                                        {tDate.getDate().toString().padStart(2, '0')}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                                        <span style={{ fontSize: '11px', color: isLate ? '#ef4444' : 'rgba(255,255,255,0.5)', fontWeight: '800', textTransform: 'uppercase' }}>
                                                            Tháng {tDate.getMonth() + 1}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                                                            {tDate.getFullYear()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="list-item-title">
                                                    {task.title}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className="list-item-project">
                                                        📁 {task.boardName}
                                                    </div>
                                              
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODAL CHI TIẾT */}
            {isModalOpen && selectedTask && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: selectedTask.color || '#0c66e4' }}></div>

                        <h2 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '22px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: selectedTask.color || '#0c66e4' }}>🎯</span> Chi tiết Task
                        </h2>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>📁 Thuộc dự án</div>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>{selectedTask.boardName}</div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>📝 Tên công việc</div>
                            <Link
                                to={`/d/boards/${selectedTask.boardId}`}
                                className="modal-task-link"
                                title="Nhấn để đi đến Bảng chứa công việc này"
                            >
                                {selectedTask.title} <span style={{ fontSize: '14px' }}>↗</span>
                            </Link>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>⏰ Hạn chót</div>
                            <div style={{ fontSize: '15px', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ⏳ {new Date(selectedTask.dueDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsModalOpen(false)}
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontSize: '14px' }}
                            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
                            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                        >
                            Đóng lại
                        </button>
                    </div>
                </div>
            )}

            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="dark" />
        </div>
    );
};

export default CalendarView;