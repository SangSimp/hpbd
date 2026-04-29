import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { addColumn, updateCardPosition, moveColumn, setBoardData } from '../redux/boardSlice';
import Column from './Column';
import Card from './Card';
import axios from '../api/axiosConfig';
import { HubConnectionBuilder } from '@microsoft/signalr';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import * as XLSX from 'xlsx';

import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Confetti from 'react-confetti';
import WorkflowSettings from './WorkflowSettings';

const localizer = momentLocalizer(moment);

const Board = () => {
    const { boardId } = useParams();
    const dispatch = useDispatch();
    const columns = useSelector((state) => state.board.columns) || [];
    const boardInfo = useSelector(state => state.board.boardInfo);

    const [isAdding, setIsAdding] = useState(false);
    const [columnTitle, setColumnTitle] = useState('');
    const [activeDragCard, setActiveDragCard] = useState(null);
    const [allowedDropColumnIds, setAllowedDropColumnIds] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOption, setFilterOption] = useState('all');
    const [selectedTag, setSelectedTag] = useState('all');
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

    useEffect(() => {
        // Mỗi khi TopBar bấm nút, nó bắn tín hiệu, trang Board sẽ nghe thấy và đổi màu theo!
        const handleThemeChange = () => {
            setIsDarkMode(localStorage.getItem('theme') !== 'light');
        };

        window.addEventListener('themeChange', handleThemeChange);
        return () => window.removeEventListener('themeChange', handleThemeChange);
    }, []);

    const [zoom, setZoom] = useState(1);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');
    const [bgUrl, setBgUrl] = useState(boardInfo?.backgroundUrl || boardInfo?.BackgroundUrl || '');
    const [showConfetti, setShowConfetti] = useState(false);
    const bgInputRef = useRef(null);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);

    useEffect(() => {
        if (boardId) {
            try {
                const stored = localStorage.getItem('recent_boards');
                let recentIds = stored ? JSON.parse(stored) : [];
                recentIds = recentIds.filter(id => String(id) !== String(boardId));
                recentIds.unshift(String(boardId));
                if (recentIds.length > 10) recentIds = recentIds.slice(0, 10);
                localStorage.setItem('recent_boards', JSON.stringify(recentIds));
            } catch (error) {
                console.error("Lỗi lưu lịch sử truy cập:", error);
            }
        }
    }, [boardId]);

    useEffect(() => {
        const fetchInitialBoard = async () => {
            try {
                const response = await axios.get(`/api/v1/boards/${boardId}`);
                const data = response.data;
                const boardData = data.board || data.Board || data;
                const columnsData = data.columns || data.Columns || [];

                setBgUrl(boardData.backgroundUrl || boardData.BackgroundUrl || '');

                dispatch(setBoardData({
                    boardInfo: boardData,
                    columns: columnsData
                }));
            } catch (error) {
                console.error("Lỗi tải dữ liệu bảng:", error);
            }
        };

        if (boardId) {
            fetchInitialBoard();
        }
    }, [boardId, dispatch]);

    const [viewMode, setViewMode] = useState('board');
    const [showStats, setShowStats] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [activities, setActivities] = useState([]);

    const fetchActivities = async () => {
        try {
            const res = await axios.get(`/api/v1/boards/${boardId}/activities`);
            setActivities(res.data);
            setShowHistory(true);
        } catch (error) {
            console.error("Lỗi lấy lịch sử:", error);
            toast.info("Đã mở Giao diện Lịch sử! (Chưa có dữ liệu API)");
            setShowHistory(true);
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
    const chartData = columns.map(col => ({
        name: col.title || col.Title,
        value: col.cards?.length || 0
    })).filter(data => data.value > 0);

    const calendarEvents = [];
    columns.forEach(col => {
        if (col.cards && col.cards.length > 0) {
            col.cards.forEach(card => {
                if (card.dueDate || card.DueDate) {
                    const endDate = new Date(card.dueDate || card.DueDate);
                    const startDate = (card.startDate || card.StartDate)
                        ? new Date(card.startDate || card.StartDate)
                        : new Date(endDate.getTime() - (60 * 60 * 1000));

                    calendarEvents.push({
                        id: card.id || card.Id,
                        title: card.title || card.Title,
                        start: startDate,
                        end: endDate,
                        allDay: false,
                    });
                }
            });
        }
    });

    const handleTriggerUpload = () => {
        if (bgInputRef.current) bgInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const toastId = toast.loading("⏳ Đang tải ảnh lên mây (Cloudinary)...");
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`/api/v1/boards/${boardId}/upload-background`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setBgUrl(res.data.backgroundUrl);
            toast.update(toastId, { render: "🎉 Đổi nền thành công!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error("Lỗi upload:", error);
            toast.update(toastId, { render: "❌ Lỗi khi tải ảnh lên!", type: "error", isLoading: false, autoClose: 3000 });
        } finally {
            event.target.value = null;
        }
    };

    const handleExportExcel = () => {
        if (!columns || columns.length === 0) {
            toast.warning("Bảng đang trống, không có gì để xuất cả!");
            return;
        }

        const excelData = [];
        columns.forEach(col => {
            if (col.cards && col.cards.length > 0) {
                col.cards.forEach(card => {
                    excelData.push({
                        "Tên Bảng/Cột": col.title || col.Title,
                        "Tên Công Việc": card.title || card.Title,
                        "Hạn Chót": (card.dueDate || card.DueDate) ? new Date(card.dueDate || card.DueDate).toLocaleDateString('vi-VN') : "Không có",
                        "Số Bình Luận": card.commentCount || card.CommentCount || 0,
                        "Số File Đính Kèm": card.attachmentCount || card.AttachmentCount || 0,
                        "Mô Tả": (card.description || card.Description) ? "Có mô tả" : "Trống"
                    });
                });
            }
        });

        if (excelData.length === 0) {
            toast.warning("Chưa có thẻ công việc nào để xuất!");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoCongViec");
        XLSX.writeFile(workbook, `Report_${new Date().getTime()}.xlsx`);
    };

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    useEffect(() => {
        let isMounted = true;
        let rawToken = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
        let myToken = rawToken.replace(/['"]+/g, '');

        const connection = new HubConnectionBuilder()
            .withUrl("http://localhost:5078/hubs/kanban", {
                accessTokenFactory: () => myToken,
                skipNegotiation: true,
                transport: 1
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000])
            .build();

        const startConnection = async () => {
            try {
                if (connection.state === 'Disconnected') {
                    await connection.start();

                    if (isMounted) {
                        connection.on("CardMoved", async () => {
                            try {
                                const response = await axios.get(`/api/v1/boards/${boardId}`);
                                const data = response.data;
                                dispatch(setBoardData({
                                    boardInfo: data.board || data.Board || data,
                                    columns: data.columns || data.Columns || []
                                }));
                            } catch (error) {
                                console.error("Lỗi đồng bộ ngầm khi kéo thẻ: ", error);
                            }
                        });

                        connection.on("ReceiveBoardUpdate", async (updatedBoardId) => {
                            if (String(updatedBoardId) === String(boardId)) {
                                try {
                                    const response = await axios.get(`/api/v1/boards/${boardId}`);
                                    const data = response.data;
                                    dispatch(setBoardData({
                                        boardInfo: data.board || data.Board || data,
                                        columns: data.columns || data.Columns || []
                                    }));
                                } catch (error) {
                                    console.error("Lỗi đồng bộ ngầm: ", error);
                                }
                            }
                        });

                        connection.on("ReceiveNotification", (noti) => {
                            let myId = null;
                            let myNames = [];

                            try {
                                const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
                                if (token) {
                                    const payload = JSON.parse(atob(token.split('.')[1]));
                                    myId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub || payload.id;
                                    if (payload.name) myNames.push(payload.name);
                                    if (payload.unique_name) myNames.push(payload.unique_name);
                                    if (payload.FullName) myNames.push(payload.FullName);
                                }
                                const userStr = localStorage.getItem('user');
                                if (userStr) {
                                    const userObj = JSON.parse(userStr);
                                    if (!myId) myId = userObj.id || userObj.Id || userObj._id;
                                    if (userObj.fullName) myNames.push(userObj.fullName);
                                    if (userObj.name) myNames.push(userObj.name);
                                }
                            } catch { /* empty */ }

                            const targetUserId = noti.userId || noti.UserId;
                            const message = noti.message || noti.Message || "";

                            if (targetUserId && String(targetUserId) !== String(myId)) return;
                            const isMyAction = myNames.some(name => name && message.toLowerCase().includes(name.toLowerCase()));
                            if (isMyAction && !message.toLowerCase().includes("nhắc tên bạn")) return;

                            toast.info(message, {
                                position: "bottom-right",
                                autoClose: 5000,
                                theme: "dark",
                            });
                        });
                    }
                }
            } catch (err) {
                if (!err.message?.includes('stopped during negotiation')) {
                    console.error("Lỗi ăng-ten mặt bảng, đang thử lại...", err);
                    setTimeout(startConnection, 1000);
                }
            }
        };

        startConnection();

        return () => {
            isMounted = false;
            connection.off("CardMoved");
            connection.off("ReceiveBoardUpdate");
            connection.off("ReceiveNotification");
            connection.stop().catch(e => console.error(e));
        };
    }, [boardId, dispatch]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

            if (e.key.toLowerCase() === 'f') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
            else if (e.key.toLowerCase() === 'd') {
                e.preventDefault();
                toggleDarkMode();
            }
            else if (e.key.toLowerCase() === 'e') {
                e.preventDefault();
                handleExportExcel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDarkMode, columns]);

    let globalRole = 'member';
    try {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            Object.keys(payload).forEach(key => {
                if (key.toLowerCase().includes('role')) {
                    globalRole = String(payload[key]).toLowerCase();
                }
            });
        }
    } catch (e) {
        console.error("Lỗi đọc quyền từ Token:", e);
    }

    // 💡 DÁN DÒNG NÀY VÀO ĐÂY LÀ CHUẨN BÀI NÀY SẾP:
    const isAdmin = globalRole === 'admin' || globalRole === 'manager';

    const isReadOnly = globalRole === 'viewer';

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const handleDragStart = (event) => {
        const { active } = event;
        const currentCard = active.data.current;
        setActiveDragCard(currentCard);

        if (currentCard?.type !== 'column') {
            const sourceColId = currentCard?.columnId;
            const sourceCol = columns.find(c => String(c.id || c.Id) === String(sourceColId));
            if (sourceCol) {
                const allowedIds = sourceCol.allowedNextColumnIds || sourceCol.AllowedNextColumnIds || [];
                setAllowedDropColumnIds([...allowedIds, sourceCol.id || sourceCol.Id]);
            }
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setAllowedDropColumnIds(null);
        setActiveDragCard(null);

        if (!over) return;
        if (active.id === over.id) return;

        if (isReadOnly) {
            toast.info("👀 Bạn đang ở chế độ Chỉ xem. Không thể thay đổi vị trí!", {
                position: "bottom-right", autoClose: 3000, theme: "dark"
            });
            return;
        }

        const isColumnDrag = active.data.current?.type === 'column';

        if (isColumnDrag) {
            const sourceIndex = columns.findIndex(c => (c.id || c.Id) === active.id);
            let overColumnId = over.id;
            if (over.data.current?.type !== 'column' && over.data.current?.columnId) {
                overColumnId = over.data.current.columnId;
            }

            const destIndex = columns.findIndex(c => (c.id || c.Id) === overColumnId);
            if (sourceIndex === -1 || destIndex === -1) return;

            dispatch(moveColumn({ sourceIndex, destIndex }));

            const newColumnOrder = Array.from(columns);
            const [removed] = newColumnOrder.splice(sourceIndex, 1);
            newColumnOrder.splice(destIndex, 0, removed);
            const columnOrderIds = newColumnOrder.map(c => c.id || c.Id);

            try {
                await axios.put(`/api/v1/boards/${boardId}/column-order`, columnOrderIds);
            } catch (error) {
                console.error("Lỗi khi lưu thứ tự cột:", error);
                toast.error(error.response?.data?.message || "Lỗi khi lưu thứ tự cột!");
                fetchBoardDataToRollback();
            }
            return;
        }

        const activeId = active.id;
        const overId = over.id;

        let sourceColumnId = active.data.current?.columnId;
        let destColumnId = over.data.current?.columnId;

        if (!destColumnId && columns.find(c => c.id === overId || c.Id === overId)) {
            destColumnId = overId;
        }

        if (!sourceColumnId || !destColumnId) return;

        // 💡 1. PHẢI KHAI BÁO TÌM CỘT ĐÍCH TẠI ĐÂY (TRƯỚC KHI XÀI)
        const destColumn = columns.find(c => c.id === destColumnId || c.Id === destColumnId);

        const newIndex = destColumn?.cards?.findIndex(c => c.id === overId || c.Id === overId) ?? 0;
        const destCards = destColumn?.cards || [];

        let calculatedPosition = 0;

        if (destCards.length === 0) {
            calculatedPosition = 65535;
        } else if (newIndex === 0) {
            const firstCardPos = destCards[0].position || destCards[0].Position || 65535;
            calculatedPosition = firstCardPos / 2;
        } else if (newIndex >= destCards.length) {
            const lastCardPos = destCards[destCards.length - 1].position || destCards[destCards.length - 1].Position || 0;
            calculatedPosition = lastCardPos + 65535;
        } else {
            const prevCardPos = destCards[newIndex - 1].position || destCards[newIndex - 1].Position || 0;
            const nextCardPos = destCards[newIndex].position || destCards[newIndex].Position || 0;
            calculatedPosition = (prevCardPos + nextCardPos) / 2;
        }

        dispatch(updateCardPosition({
            cardId: activeId,
            sourceColumnId: sourceColumnId,
            destColumnId: destColumnId,
            newIndex: newIndex >= 0 ? newIndex : 0
        }));

        try {
            await axios.put(`/api/v1/cards/${activeId}/move`, {
                sourceColumnId: sourceColumnId,
                destColumnId: destColumnId,
                newIndex: newIndex >= 0 ? newIndex : 0,
                position: calculatedPosition,
                boardId: boardId
            });

            // 💡 2. ĐÃ KHAI BÁO Ở TRÊN RỒI, GIỜ MỚI MANG XUỐNG ĐÂY ĐỂ CHECK PHÁO HOA
            if (destColumn?.isDoneColumn === true) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }

        } catch (error) {
            console.error("Lỗi đồng bộ thẻ:", error);
            const msg = error.response?.data?.message || "❌ Lỗi: Không thể di chuyển thẻ này!";
            toast.error(msg, { autoClose: 5000 });
            fetchBoardDataToRollback();
        }
    };

    const fetchBoardDataToRollback = async () => {
        try {
            const response = await axios.get(`/api/v1/boards/${boardId}`);
            const data = response.data;
            dispatch(setBoardData({
                boardInfo: data.board || data.Board || data,
                columns: data.columns || data.Columns || []
            }));
        } catch (fetchErr) {
            console.error("Lỗi nghiêm trọng khi hoàn tác giao diện:", fetchErr);
        }
    };

    const handleAddColumn = async () => {
        if (!columnTitle.trim()) {
            setIsAdding(false);
            return;
        }
        try {
            const response = await axios.post('/api/v1/columns', { boardId, title: columnTitle });
            dispatch(addColumn(response.data));
            setColumnTitle('');
            setIsAdding(false);
        } catch (error) {
            console.error("Lỗi thêm cột:", error);
        }
    };

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
    };
    const allUniqueTags = Array.from(new Set(
        columns.flatMap(col => col.cards?.flatMap(card => card.tags || card.Tags || []) || [])
    )).filter(Boolean);

    // 💡 TẮC KÈ HOA LOGIC: Tự động đổi màu thanh công cụ nếu là nền Trắng
    const useLightUI = !isDarkMode && !bgUrl;
    const headerBg = useLightUI ? '#ffffff' : 'rgba(30, 41, 59, 0.7)';
    const headerText = useLightUI ? '#1e293b' : '#ffffff';
    const headerBorder = useLightUI ? '#e2e8f0' : 'rgba(255,255,255,0.08)';
    const inputBg = useLightUI ? '#ffffff' : 'rgba(0,0,0,0.3)';
    const inputBorder = useLightUI ? '#cbd5e1' : 'rgba(255,255,255,0.2)';
    const btnBg = useLightUI ? '#f8fafc' : 'rgba(255,255,255,0.1)';
    const btnBorder = useLightUI ? '#cbd5e1' : 'rgba(255,255,255,0.1)';

    return (
        <>
            {showConfetti && <Confetti recycle={false} numberOfPieces={500} gravity={0.2} />}
            <div style={{
                display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
                flex: 1, overflow: 'hidden', position: 'relative',
                backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
                backgroundColor: bgUrl ? 'transparent' : (isDarkMode ? '#0f172a' : '#f8fafc'),
                backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
                transition: 'background 0.3s ease', fontFamily: 'var(--sans)'
            }}>
                {bgUrl && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.5), rgba(15,23,42,0.9))', zIndex: 0 }}></div>}
                {showWorkflowModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                        <WorkflowSettings
                            columns={columns}
                            boardId={boardId}
                            onClose={() => setShowWorkflowModal(false)}
                            onWorkflowUpdated={() => {
                                window.location.reload();
                            }}
                        />
                    </div>
                )}

                <ToastContainer />
                <style>
                    {`
                    .rbc-calendar { background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(16px); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; color: #fff; }
                    .rbc-header { padding: 10px 0; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.1) !important; color: #6ab0ff; }
                    .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px; overflow: hidden; }
                    .rbc-day-bg { border-left: 1px solid rgba(255,255,255,0.05) !important; }
                    .rbc-month-row { border-top: 1px solid rgba(255,255,255,0.05) !important; }
                    .rbc-off-range-bg { background: rgba(0,0,0,0.2) !important; }
                    .rbc-today { background: rgba(106, 176, 255, 0.1) !important; }
                    .rbc-event { background: linear-gradient(135deg, #4A9FFF, #0c66e4) !important; border: none !important; border-radius: 6px !important; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
                    .rbc-toolbar button { color: #fff !important; border: 1px solid rgba(255,255,255,0.2) !important; }
                    .rbc-toolbar button.rbc-active { background: rgba(106, 176, 255, 0.2) !important; color: #6ab0ff !important; border-color: #6ab0ff !important; }
                    `}
                </style>
                <div style={{
                    padding: '16px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
                    alignItems: 'center', gap: '16px', zIndex: 10, background: headerBg,
                    backdropFilter: 'blur(20px)', borderBottom: `1px solid ${headerBorder}`,
                    boxShadow: useLightUI ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.3s ease'
                }}>

                    {/* 💡 HIỂN THỊ TÊN BẢNG BÊN GÓC TRÁI */}
                    <div style={{ flexShrink: 0 }}>
                        <h2 style={{
                            color: headerText, margin: 0, fontSize: '22px', fontWeight: '800',
                            textShadow: bgUrl ? '0 2px 4px rgba(0,0,0,0.5)' : 'none', display: 'flex', alignItems: 'center', gap: '10px'
                        }}>
                            📋 {boardInfo?.title || boardInfo?.Title || "Đang tải dự án..."}
                        </h2>
                    </div>

                    {/* 💡 THANH TÌM KIẾM Ở GIỮA */}
                    <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '200px', maxWidth: '400px' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: useLightUI ? '#64748b' : 'rgba(255,255,255,0.5)', transition: 'color 0.3s' }}>🔍</span>
                        <input
                            id="searchInput" type="text" placeholder="Tìm kiếm thẻ công việc..."
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px',
                                border: `1px solid ${inputBorder}`, outline: 'none', transition: 'all 0.3s ease',
                                boxSizing: 'border-box', backgroundColor: inputBg, color: headerText,
                                boxShadow: useLightUI ? 'inset 0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#0c66e4'; e.target.style.boxShadow = useLightUI ? '0 0 0 3px rgba(12, 102, 228, 0.15)' : '0 0 0 2px rgba(12, 102, 228, 0.3)'; }}
                            onBlur={(e) => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = useLightUI ? 'inset 0 1px 2px rgba(0,0,0,0.05)' : 'none'; }}
                        />
                    </div>

                    {/* 💡 CÁC NÚT CÔNG CỤ BÊN GÓC PHẢI */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>

                        {/* MENU LỌC THEO NHÃN DÁN */}
                        <select
                            value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}
                            style={{
                                padding: '8px 12px', borderRadius: '8px', border: `1px solid ${inputBorder}`,
                                outline: 'none', backgroundColor: inputBg, color: headerText,
                                fontWeight: '600', cursor: 'pointer', height: '38px', flexShrink: 0,
                                transition: 'all 0.3s ease', boxShadow: useLightUI ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <option value="all">🏷️ Tất cả nhãn</option>
                            {allUniqueTags.map(tag => (
                                <option key={tag} value={tag}>🏷️ {tag}</option>
                            ))}
                        </select>
                        <select
                            value={filterOption} onChange={(e) => setFilterOption(e.target.value)}
                            style={{
                                padding: '8px 12px', borderRadius: '8px', border: `1px solid ${inputBorder}`,
                                outline: 'none', backgroundColor: inputBg, color: headerText,
                                fontWeight: '600', cursor: 'pointer', height: '38px', flexShrink: 0,
                                transition: 'all 0.3s ease', boxShadow: useLightUI ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <option value="all">🌟 Tất cả</option>
                            <option value="overdue">⏰ Trễ hạn</option>
                            <option value="hasAttachment">📎 Có file</option>
                            <option value="hasComment">💬 Có bình luận</option>
                        </select>

                        {/* THANH ZOOM */}
                        <div style={{
                            display: 'flex', alignItems: 'center', backgroundColor: inputBg,
                            borderRadius: '8px', border: `1px solid ${inputBorder}`, height: '36px',
                            boxSizing: 'border-box', transition: 'all 0.3s ease',
                            boxShadow: useLightUI ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                        }}>
                            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} title="Thu nhỏ" style={{ padding: '0 12px', background: 'transparent', border: 'none', borderRight: `1px solid ${inputBorder}`, color: headerText, cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', height: '100%', transition: 'all 0.3s' }}>-</button>
                            <span style={{ fontSize: '13px', color: headerText, fontWeight: 'bold', width: '50px', textAlign: 'center', userSelect: 'none', transition: 'color 0.3s' }}>{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} title="Phóng to" style={{ padding: '0 12px', background: 'transparent', border: 'none', borderLeft: `1px solid ${inputBorder}`, color: headerText, cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', height: '100%', transition: 'all 0.3s' }}>+</button>
                        </div>

                        {!isReadOnly && (
                            <>
                                <input type="file" accept="image/*" style={{ display: 'none' }} ref={bgInputRef} onChange={handleFileChange} />
                                <button
                                    onClick={handleTriggerUpload}
                                    style={{
                                        padding: '8px 16px', borderRadius: '8px', border: `1px solid ${btnBorder}`,
                                        backgroundColor: btnBg, color: headerText,
                                        cursor: 'pointer', fontWeight: 'bold', backdropFilter: 'blur(4px)',
                                        transition: 'all 0.3s ease', whiteSpace: 'nowrap',
                                        boxShadow: useLightUI ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = useLightUI ? '#e2e8f0' : 'rgba(255, 255, 255, 0.2)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = btnBg}
                                >
                                    🖼️ Đổi nền
                                </button>
                            </>
                        )}
                        {isAdmin && (
                            <button
                                style={{
                                    padding: '8px 12px', background: btnBg, color: headerText, border: `1px solid ${btnBorder}`,
                                    borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '13px', fontWeight: 'bold', transition: 'all 0.3s ease',
                                    boxShadow: useLightUI ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                }}
                                onClick={() => setShowWorkflowModal(true)}
                                onMouseEnter={(e) => e.target.style.backgroundColor = useLightUI ? '#e2e8f0' : 'rgba(255, 255, 255, 0.2)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = btnBg}
                            >
                                ⚙️ Luồng làm việc
                            </button>
                        )}
                        <button
                            onClick={toggleDarkMode}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: `1px solid ${btnBorder}`,
                                backgroundColor: btnBg,
                                color: headerText, cursor: 'pointer',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.3s ease', whiteSpace: 'nowrap',
                                boxShadow: useLightUI ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = useLightUI ? '#e2e8f0' : 'rgba(255, 255, 255, 0.2)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = btnBg}
                        >
                            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                        </button>

                        <button
                            onClick={handleExportExcel}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none',
                                backgroundColor: '#1e7e34', color: 'white', cursor: 'pointer',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 10px rgba(39, 201, 63, 0.3)', transition: 'transform 0.2s ease', whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                        >
                            📥 Excel
                        </button>

                        <button
                            onClick={() => setShowStats(!showStats)}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: `1px solid ${showStats ? '#0c66e4' : btnBorder}`,
                                backgroundColor: showStats ? (useLightUI ? '#e0f2fe' : 'rgba(106, 176, 255, 0.2)') : btnBg,
                                color: showStats ? '#0c66e4' : headerText, cursor: 'pointer',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.3s ease', whiteSpace: 'nowrap',
                                boxShadow: useLightUI ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                            onMouseEnter={(e) => { if (!showStats) e.target.style.backgroundColor = useLightUI ? '#e2e8f0' : 'rgba(255, 255, 255, 0.2)' }}
                            onMouseLeave={(e) => { if (!showStats) e.target.style.backgroundColor = btnBg }}
                        >
                            📊 {showStats ? 'Đóng' : 'Thống kê'}
                        </button>

                        <button
                            onClick={showHistory ? () => setShowHistory(false) : fetchActivities}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: `1px solid ${showHistory ? '#0c66e4' : btnBorder}`,
                                backgroundColor: showHistory ? (useLightUI ? '#e0f2fe' : 'rgba(106, 176, 255, 0.2)') : btnBg,
                                color: showHistory ? '#0c66e4' : headerText, cursor: 'pointer',
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.3s ease', whiteSpace: 'nowrap',
                                boxShadow: useLightUI ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                            onMouseEnter={(e) => { if (!showHistory) e.target.style.backgroundColor = useLightUI ? '#e2e8f0' : 'rgba(255, 255, 255, 0.2)' }}
                            onMouseLeave={(e) => { if (!showHistory) e.target.style.backgroundColor = btnBg }}
                        >
                            📜 {showHistory ? 'Đóng' : 'Nhật ký'}
                        </button>

                        <button
                            onClick={() => setViewMode(viewMode === 'board' ? 'calendar' : 'board')}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none',
                                backgroundColor: '#0c66e4',
                                color: 'white', cursor: 'pointer', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 10px rgba(12, 102, 228, 0.3)', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                        >
                            {viewMode === 'board' ? '📅 Lịch' : '📋 Bảng'}
                        </button>

                    </div>
                </div>

                {showStats && (
                    <div style={{ padding: '20px', backgroundColor: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(20px)', zIndex: 10, margin: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', height: '350px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#fff', textAlign: 'center' }}>Tiến độ Dự án (Số lượng thẻ theo Cột)</h3>
                        <div style={{ flex: 1 }}>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%" cy="50%" labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100} fill="#8884d8" dataKey="value"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
                                    Chưa có dữ liệu công việc để thống kê.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {viewMode === 'board' ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => { setActiveDragCard(null); setAllowedDropColumnIds(null); }}
                    >
                        <div style={{ flex: 1, position: 'relative', minHeight: 0, minWidth: 0, width: '100%', zIndex: 10 }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', overflowX: 'auto', padding: '20px', boxSizing: 'border-box', width: 'max-content', minWidth: '100%', height: '100%', zoom: zoom }}>
                                    <SortableContext
                                        items={columns.map(c => String(c.id || c.Id))}
                                        strategy={horizontalListSortingStrategy}
                                    >
                                        {columns.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '10vh', opacity: 0.8 }}>
                                                <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-state-2130362-1800926.png" alt="Trống" style={{ width: '250px', marginBottom: '20px', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.3))' }} />
                                                <h3 style={{ color: useLightUI ? '#1e293b' : '#fff', fontSize: '20px', marginBottom: '8px', transition: 'color 0.3s' }}>Bảng đang trống trơn!</h3>
                                                <p style={{ color: useLightUI ? '#64748b' : 'rgba(255,255,255,0.6)', fontSize: '15px', transition: 'color 0.3s' }}>Hãy nhấn nút "+ Thêm danh sách mới" để bắt đầu thiết kế luồng công việc nhé.</p>
                                            </div>
                                        ) : (
                                            columns.map(col => (
                                                <Column
                                                    key={String(col.id || col.Id)}
                                                    column={col}
                                                    searchQuery={searchQuery}
                                                    filterOption={filterOption}
                                                    selectedTag={selectedTag}
                                                    isDraggingMode={allowedDropColumnIds !== null}
                                                    isAllowedDrop={allowedDropColumnIds === null || allowedDropColumnIds.includes(String(col.id || col.Id))}
                                                />
                                            ))
                                        )}
                                    </SortableContext>

                                    {!isReadOnly && (
                                        <div style={{ minWidth: '300px', height: 'max-content' }}>
                                            {!isAdding ? (
                                                <button onClick={() => setIsAdding(true)} style={{
                                                    width: '100%', padding: '14px 16px',
                                                    background: useLightUI ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                                                    color: headerText,
                                                    border: `1px solid ${btnBorder}`,
                                                    borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '15px', backdropFilter: 'blur(4px)',
                                                    boxShadow: useLightUI ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s ease'
                                                }}>
                                                    + Thêm danh sách mới
                                                </button>
                                            ) : (
                                                <div style={{
                                                    background: useLightUI ? '#ffffff' : 'rgba(30, 41, 59, 0.8)',
                                                    backdropFilter: 'blur(10px)', padding: '16px', borderRadius: '16px',
                                                    border: `1px solid ${useLightUI ? '#cbd5e1' : 'rgba(106, 176, 255, 0.5)'}`,
                                                    boxShadow: useLightUI ? '0 4px 10px rgba(0,0,0,0.1)' : '0 10px 25px rgba(0,0,0,0.3)',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    <input
                                                        autoFocus value={columnTitle} onChange={(e) => setColumnTitle(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                                                        placeholder="Nhập tên danh sách..."
                                                        style={{
                                                            width: '100%', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px',
                                                            border: `1px solid ${inputBorder}`, outline: 'none', backgroundColor: inputBg,
                                                            color: headerText, boxSizing: 'border-box', transition: 'all 0.3s ease'
                                                        }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={handleAddColumn} style={{ flex: 1, background: '#0c66e4', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Thêm</button>
                                                        <button onClick={() => setIsAdding(false)} style={{ width: '40px', background: btnBg, color: headerText, border: `1px solid ${btnBorder}`, borderRadius: '8px', cursor: 'pointer' }}>✖</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DragOverlay dropAnimation={dropAnimation}>
                            {activeDragCard ? (
                                <div style={{
                                    opacity: 1,
                                    transform: 'scale(1.05) rotate(4deg)',
                                    cursor: 'grabbing',
                                    boxShadow: '0 20px 40px rgba(106, 176, 255, 0.4)',
                                    borderRadius: '12px'
                                }}>
                                    <Card card={activeDragCard} />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    <div style={{ flex: 1, padding: '20px', overflow: 'auto', zIndex: 10 }}>
                        <div style={{ height: '100%', minHeight: '600px' }}>
                            <Calendar
                                localizer={localizer}
                                events={calendarEvents}
                                startAccessor="start"
                                endAccessor="end"
                                date={currentDate}
                                onNavigate={(newDate) => setCurrentDate(newDate)}
                                view={currentView}
                                onView={(newView) => setCurrentView(newView)}
                                style={{ height: '100%' }}
                                messages={{
                                    next: "Sau", previous: "Trước", today: "Hôm nay",
                                    month: "Tháng", week: "Tuần", day: "Ngày", agenda: "Lịch trình"
                                }}
                                showMultiDayTimes={true}
                            />
                        </div>
                    </div>
                )}

                {showHistory && (
                    <div style={{
                        position: 'absolute', top: 0, right: 0, width: '350px', height: '100%',
                        backgroundColor: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.1)', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', zIndex: 1000,
                        display: 'flex', flexDirection: 'column', transition: 'transform 0.3s ease-in-out'
                    }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#fff' }}>📜 Lịch sử hoạt động</h3>
                            <span onClick={() => setShowHistory(false)} style={{ cursor: 'pointer', fontSize: '20px', color: 'rgba(255,255,255,0.5)' }}>✖</span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', position: 'relative' }}>
                            {activities.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontStyle: 'italic' }}>
                                    Đang chờ dữ liệu từ máy chủ...
                                </p>
                            ) : (
                                activities.map((act, index) => (
                                    <div key={act.id || act.Id || index} style={{ marginBottom: '16px', display: 'flex', gap: '12px', position: 'relative' }}>
                                        {index !== activities.length - 1 && (
                                            <div style={{ position: 'absolute', top: '36px', bottom: '-16px', left: '17px', width: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
                                        )}

                                        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
                                            <img
                                                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${act.userName || 'Guest'}`}
                                                alt="avatar"
                                                style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.1)' }}
                                            />
                                        </div>

                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#fff', lineHeight: '1.4' }}>
                                                <strong style={{ color: '#6ab0ff' }}>{act.userName || 'Sếp'}</strong> {act.action}
                                            </p>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                🕒 {act.createdAt ? new Date(act.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Board;