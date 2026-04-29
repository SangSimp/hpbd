import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '../api/axiosConfig';
import { useDispatch, useSelector } from 'react-redux';
import { updateCardDetails, deleteCard } from '../redux/boardSlice';
import Checklist from './Checklist';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { MentionsInput, Mention } from 'react-mentions';
import { toast } from 'react-toastify';

const CardDetailModal = ({ card, onClose }) => {
    const dispatch = useDispatch();
    const boardInfo = useSelector(state => state.board.boardInfo);
    const [liveComments, setLiveComments] = useState(card.comments || card.Comments || []);

    const [memberMap, setMemberMap] = useState({});

    useEffect(() => {
        const fetchUsersMap = async () => {
            try {
                const response = await axios.get('/api/v1/users');
                const mapping = {};
                response.data.forEach(u => {
                    mapping[u.id || u.Id] = u.name || u.fullName || u.FullName || 'Đồng đội';
                });
                setMemberMap(mapping);
            } catch (error) {
                console.error("Lỗi lấy danh sách user:", error);
            }
        };
        fetchUsersMap();
    }, []);

    useEffect(() => {
        let isMounted = true;
        let rawToken = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
        let myToken = rawToken.replace(/['"]+/g, '');

        const connection = new HubConnectionBuilder()
            .withUrl("http://localhost:5078/hubs/kanban", {
                accessTokenFactory: () => myToken
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000])
            .build();

        const startConnection = async () => {
            try {
                if (connection.state === 'Disconnected') {
                    await connection.start();
                    if (isMounted) {
                        connection.on("ReceiveNewComment", (data) => {
                            if (data.cardId === card.id || data.cardId === card.Id) {
                                setLiveComments(prev => [...prev, data.comment]);
                            }
                        });
                    }
                }
            } catch (err) {
                if (!err.message?.includes('stopped during negotiation')) {
                    console.error("❌ Lỗi ăng-ten bình luận, đang thử lại...", err);
                    setTimeout(startConnection, 1000);
                }
            }
        };

        startConnection();

        return () => {
            isMounted = false;
            connection.off("ReceiveNewComment");
            connection.stop().catch(e => console.error(e));
        };
    }, [card.id, card.Id]);

    const userFromRedux = useSelector(state => state.auth?.user);
    const userStr = localStorage.getItem('user');
    const localUserId = userStr ? JSON.parse(userStr).id : '';
    const currentUserId = String(userFromRedux?.id || userFromRedux?.Id || userFromRedux?._id || localUserId || '');

    let globalRole = 'member';
    try {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            Object.keys(payload).forEach(key => {
                if (key.toLowerCase().includes('role')) globalRole = String(payload[key]).toLowerCase();
            });
        }
    } catch (e) { console.error("Lỗi đọc quyền:", e); }

    // ==========================================================
    // 💡 HỆ THỐNG AUTO-DETECT NHẬN DIỆN CỘT HOÀN THÀNH
    // ==========================================================
    const columns = useSelector(state => state.board.columns) || [];
    const currentColumnIndex = columns.findIndex(c => String(c.id || c.Id) === String(card.columnId || card.ColumnId));
    const currentColumn = columns[currentColumnIndex];

    const isLastColumn = currentColumnIndex !== -1 && currentColumnIndex === columns.length - 1;
    const isDoneColumn = currentColumn?.isDoneColumn === true || currentColumn?.IsDoneColumn === true || isLastColumn;

    const isAdmin = globalRole === 'admin';
    const isViewer = globalRole === 'viewer';
    const currentBoardOwnerId = boardInfo?.ownerId || boardInfo?.OwnerId;
    const isAdminOrOwner = isAdmin || currentUserId === String(currentBoardOwnerId);

    // 🔒 NẾU LÀ CỘT HOÀN THÀNH MÀ KHÔNG PHẢI SẾP -> KHÓA ĐÁ GIAO DIỆN
    const isReadOnly = isViewer || (isDoneColumn && !isAdminOrOwner);
    const canAssignMembers = isAdmin;
    const canEditDeadline = isAdminOrOwner;

    const [title, setTitle] = useState(card.title || card.Title || '');
    const [description, setDescription] = useState(card.description || card.Description || '');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState(card.tags || card.Tags || []);
    const [coverUrl, setCoverUrl] = useState(card.coverUrl || card.CoverUrl || '');
    const [checklists, setChecklists] = useState(card.checklists || card.Checklists || []);
    const [assigneeIds, setAssigneeIds] = useState(card.assigneeIds || card.AssigneeIds || []);
    const [isGenerating, setIsGenerating] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [activities, setActivities] = useState(card.activities || card.Activities || []);
    const [attachments, setAttachments] = useState(card.attachments || card.Attachments || []);
    const [startDate, setStartDate] = useState(card.startDate || card.StartDate || '');
    const [dueDate, setDueDate] = useState(card.dueDate || card.DueDate || '');

    const coverInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkInput, setLinkInput] = useState('');

    const handleCoverUpload = async (e) => {
        if (isReadOnly) return;
        const file = e.target.files[0];
        if (!file) return;

        const toastId = toast.loading("🖼️ Đang tải ảnh bìa lên mây...");
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`/api/v1/cards/${card.id || card.Id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCoverUrl(response.data.url);
            toast.update(toastId, { render: "🎉 Cập nhật ảnh bìa thành công!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error(error);
            toast.update(toastId, { render: "❌ Lỗi: Không thể tải ảnh lên!", type: "error", isLoading: false, autoClose: 3000 });
        } finally {
            e.target.value = null;
        }
    };

    const handleFileUpload = async (e) => {
        if (isReadOnly) return;
        const file = e.target.files[0];
        if (!file) return;

        const toastId = toast.loading("📎 Đang đính kèm tài liệu lên mây...");
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`/api/v1/cards/${card.id || card.Id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAttachments(prev => [...prev, response.data.url]);
            toast.update(toastId, { render: "🎉 Đã đính kèm tài liệu thành công!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error(error);
            toast.update(toastId, { render: "❌ Lỗi: Không thể đính kèm tài liệu!", type: "error", isLoading: false, autoClose: 3000 });
        } finally {
            e.target.value = null;
        }
    };

    const handleAddAttachmentLink = () => {
        if (isReadOnly) return;
        if (linkInput && linkInput.trim() !== '') {
            setAttachments([...attachments, linkInput.trim()]);
            toast.success("🔗 Đã thêm link đính kèm!");
            setLinkInput('');
            setShowLinkInput(false);
        }
    };

    const handleAddComment = async () => {
        if (isReadOnly) return;
        if (!commentInput.trim()) return;
        try {
            await axios.post(`/api/v1/cards/${card.id || card.Id}/comments`, { content: commentInput.trim() });
            setCommentInput('');
        } catch { alert("❌ Không thể gửi bình luận lúc này!"); }
    };

    const allBoardMembers = boardInfo ? [boardInfo.ownerId || boardInfo.OwnerId, ...(boardInfo.memberIds || boardInfo.MemberIds || [])].filter(Boolean) : [];
    const uniqueMembers = [...new Set(allBoardMembers)];

    const mentionData = uniqueMembers.map(id => ({
        id: id,
        display: memberMap[id] || `Đồng đội ${id.substring(0, 4)}`
    }));

    const mentionsStyle = {
        control: { backgroundColor: 'rgba(0,0,0,0.3)', fontFamily: 'var(--sans)', fontSize: '14px', borderRadius: '6px', color: '#fff' },
        '&multiLine': {
            control: { minHeight: 60 },
            highlighter: { padding: '10px 12px', lineHeight: '1.5', boxSizing: 'border-box', border: '1px solid transparent' },
            input: { padding: '10px 12px', lineHeight: '1.5', boxSizing: 'border-box', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', outline: 'none', backgroundColor: 'transparent', color: '#fff' },
        },
        suggestions: {
            list: { backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginTop: '4px', zIndex: 9999, color: '#fff', backdropFilter: 'blur(10px)' },
            item: { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', '&focused': { backgroundColor: 'rgba(106, 176, 255, 0.2)', color: '#6ab0ff', fontWeight: 'bold' } },
        },
    };

    const toggleAssignee = (memberId) => {
        if (isReadOnly || !canAssignMembers) return;
        if (assigneeIds.includes(memberId)) setAssigneeIds(assigneeIds.filter(id => id !== memberId));
        else setAssigneeIds([...assigneeIds, memberId]);
    };

    const handleAddTag = (e) => {
        if (isReadOnly) return;
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        if (isReadOnly) return;
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleGenerateAI = async () => {
        if (isReadOnly) return;
        if (!title.trim()) {
            alert("Vui lòng nhập Tiêu đề công việc để AI có thể phân tích!");
            return;
        }

        setIsGenerating(true);

        try {
            const response = await axios.post('/api/v1/ai/generate-checklist', { CardId: card.id || card.Id });
            let aiData = response.data;
            if (typeof aiData === 'string') {
                try { aiData = JSON.parse(aiData); }
                catch { aiData = []; }
            }

            if (aiData && Array.isArray(aiData) && aiData.length > 0) {
                setChecklists(aiData);
                toast.success("✨ AI đã phân tích và tạo Checklist thành công!");
            } else {
                toast.warning("🤔 AI đã chạy xong nhưng không thể trích xuất được bước nào phù hợp.");
            }

        } catch (error) {
            if (error.response && error.response.status === 503) {
                toast.error("❌ Máy chủ Google Gemini đang quá tải diện rộng. Sếp thử lại sau ít phút nhé!");
            } else {
                toast.error("❌ Hệ thống AI đang bận hoặc đứt kết nối.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveChanges = async () => {
        // 💡 SIÊU BẢO MẬT: CHẶN LƯU NẾU GIAO DIỆN BỊ KHÓA
        if (isReadOnly) {
            toast.error("🔒 Thẻ đã khóa! Bạn không có quyền lưu.");
            return;
        }

        const hasChanges =
            title !== (card.title || card.Title || '') ||
            description !== (card.description || card.Description || '') ||
            JSON.stringify(tags) !== JSON.stringify(card.tags || card.Tags || []) ||
            coverUrl !== (card.coverUrl || card.CoverUrl || '') ||
            JSON.stringify(checklists) !== JSON.stringify(card.checklists || card.Checklists || []) ||
            JSON.stringify(assigneeIds) !== JSON.stringify(card.assigneeIds || card.AssigneeIds || []) ||
            startDate !== (card.startDate || card.StartDate || '') ||
            dueDate !== (card.dueDate || card.DueDate || '') ||
            JSON.stringify(attachments) !== JSON.stringify(card.attachments || card.Attachments || []);

        if (!hasChanges) {
            toast.info("💡 Sếp chưa thay đổi gì cả, không cần phải bấm lưu đâu!");
            onClose();
            return;
        }

        // ==========================================
        // 💡 BỘ LUẬT ĐÃ ĐƯỢC NỚI LỎNG (CHỈ KIỂM TRA LOGIC CƠ BẢN)
        // ==========================================
        if (!title || !title.trim()) {
            toast.warning("⚠️ Tên thẻ (Tiêu đề) là bắt buộc!"); return;
        }

        if (assigneeIds.length > 5) {
            toast.warning("⚠️ Chỉ được phân công tối đa 5 người!"); return;
        }

        if (tags.length > 10) {
            toast.warning("⚠️ Đã đạt giới hạn tối đa 10 nhãn dán!"); return;
        }

        // Chỉ bắt lỗi nếu ĐIỀN CẢ 2 NGÀY mà ngày Bắt đầu lại lớn hơn ngày Kết thúc
        if (startDate && dueDate) {
            if (new Date(startDate) > new Date(dueDate)) {
                toast.warning("⚠️ Lỗi logic: Thời gian Bắt đầu không thể trễ hơn Kết thúc!"); return;
            }
        }

        // ==========================================
        // THỰC HIỆN LƯU DỮ LIỆU TẠM TRỮ
        // ==========================================
        try {
            const urlParts = window.location.pathname.split('/');
            const finalBoardId = card.boardId || card.BoardId || boardInfo?.id || boardInfo?.Id || urlParts[urlParts.length - 1];
            const cardId = card.id || card.Id;

            const updatedActivities = [`🕒 Đã cập nhật thẻ vào lúc ${new Date().toLocaleString('vi-VN')}`, ...activities];

            const updatedData = {
                title, description, tags, coverUrl, checklists,
                AssigneeIds: assigneeIds, Comments: liveComments,
                StartDate: startDate || null,
                DueDate: dueDate || null,
                Activities: updatedActivities, Attachments: attachments,
                boardId: finalBoardId, BoardId: finalBoardId,
                columnId: card.columnId || card.ColumnId, ColumnId: card.columnId || card.ColumnId
            };

            const response = await axios.put(`/api/v1/cards/${cardId}?boardId=${finalBoardId}`, updatedData);
            dispatch(updateCardDetails({ columnId: card.columnId || card.ColumnId, cardId: cardId, updatedData: response.data }));

            setActivities(response.data.activities || response.data.Activities || updatedActivities);
            onClose();
            toast.success("✅ Đã lưu nháp các thay đổi!"); // Đổi thông báo cho hợp lý

        } catch (error) {
            const msg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response?.data : "❌ Có lỗi xảy ra khi lưu dữ liệu!");
            toast.error(msg);
        }
    };

    const handleDeleteCard = async () => {
        if (isReadOnly) return;
        if (!window.confirm("⚠️ Bạn có chắc chắn muốn xóa thẻ này vĩnh viễn không?")) return;
        try {
            const urlParts = window.location.pathname.split('/');
            const currentBoardId = boardInfo?.id || boardInfo?.Id || urlParts[urlParts.length - 1];
            await axios.delete(`/api/v1/cards/${card.id || card.Id}?boardId=${currentBoardId}`);
            dispatch(deleteCard(card.id || card.Id));
            onClose();
        } catch { alert("❌ Lỗi: Không thể xóa thẻ."); }
    };

    const formatCommentText = (text) => {
        if (!text) return '';
        const parts = text.split(/(@\[.*?\]\(.*?\))/g);
        return parts.map((part, i) => {
            const match = part.match(/@\[(.*?)\]\((.*?)\)/);
            if (match) return <strong key={i} style={{ color: '#6ab0ff', backgroundColor: 'rgba(106,176,255,0.15)', padding: '2px 6px', borderRadius: '4px' }}>@{match[1]}</strong>;
            return <span key={i}>{part}</span>;
        });
    };

    const portalRoot = document.getElementById('root') || document.body;
    if (!portalRoot) return null;

    return createPortal(
        <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '50px', overflowY: 'auto' }}
        >
            <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(24px)', width: '880px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', marginBottom: '60px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                <style>{`
                    .ql-toolbar { background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.1) !important; border-top-left-radius: 8px; border-top-right-radius: 8px; }
                    .ql-container { border-color: rgba(255,255,255,0.1) !important; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; font-family: var(--sans); font-size: 15px; }
                    .ql-editor { color: #fff; min-height: 120px; background: rgba(0,0,0,0.2); }
                    .ql-editor.ql-blank::before { color: rgba(255,255,255,0.4); font-style: normal; }
                    .ql-snow .ql-stroke { stroke: rgba(255,255,255,0.6); }
                    .ql-snow .ql-fill { fill: rgba(255,255,255,0.6); }
                    .ql-snow .ql-picker { color: rgba(255,255,255,0.6); }
                    .ql-snow .ql-picker-options { background-color: rgba(30, 41, 59, 0.9); border-color: rgba(255,255,255,0.1); }
                    
                    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>

                <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', cursor: 'pointer', color: '#fff', zIndex: 10, transition: 'all 0.2s', backdropFilter: 'blur(5px)' }} onMouseEnter={(e) => { e.target.style.backgroundColor = '#ef4444'; e.target.style.borderColor = '#ef4444'; }} onMouseLeave={(e) => { e.target.style.backgroundColor = 'rgba(0,0,0,0.4)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}>✖</button>

                {coverUrl && (
                    <div style={{ width: '100%', height: '180px', backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                )}

                <div style={{ padding: '30px 36px' }}>

                    {isDoneColumn && !isAdminOrOwner && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ff6b6b', padding: '12px 20px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span>🔒</span> THẺ ĐÃ HOÀN THÀNH: Giao diện bị khóa. Chỉ Quản trị viên mới có quyền chỉnh sửa!
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '30px' }}>
                        <span style={{ fontSize: '24px', marginTop: '2px' }}>📋</span>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isReadOnly} style={{ fontSize: '24px', fontWeight: '800', color: '#fff', border: 'none', width: '100%', outline: 'none', backgroundColor: 'transparent', borderBottom: '2px solid transparent', transition: 'border-color 0.2s', paddingBottom: '4px' }} onFocus={(e) => e.target.style.borderBottom = '2px solid #6ab0ff'} onBlur={(e) => e.target.style.borderBottom = '2px solid transparent'} />
                    </div>

                    <div style={{ display: 'flex', gap: '36px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {uniqueMembers.map(memberId => {
                                const isAssigned = assigneeIds.includes(memberId);
                                return (
                                    <img
                                        key={memberId}
                                        onClick={() => canAssignMembers && !isReadOnly && toggleAssignee(memberId)}
                                        src={`https://api.dicebear.com/7.x/micah/svg?seed=${memberId}`}
                                        alt="avatar"
                                        title={canAssignMembers && !isReadOnly ? `Phân công: ${memberMap[memberId] || 'Đồng đội'}` : `Thành viên: ${memberMap[memberId] || 'Đồng đội'}`}
                                        style={{
                                            width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0c66e4',
                                            cursor: (canAssignMembers && !isReadOnly) ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s', border: isAssigned ? '3px solid #6ab0ff' : '3px solid transparent',
                                            opacity: isAssigned ? 1 : 0.4, transform: isAssigned ? 'scale(1.1)' : 'scale(1)'
                                        }}
                                    />
                                );
                            })}

                            <div style={{ marginBottom: '30px', marginTop: '16px' }}>
                                <h4 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Nhãn dán (Tags)</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                                    {tags.map((tag, idx) => (
                                        <span key={idx} style={{ backgroundColor: '#6ab0ff', color: '#121212', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(106, 176, 255, 0.4)' }}>
                                            🏷️ {tag}
                                            {!isReadOnly && <span onClick={() => handleRemoveTag(tag)} style={{ cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.7}>✖</span>}
                                        </span>
                                    ))}
                                </div>
                                {!isReadOnly && (
                                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="+ Thêm nhãn mới (Nhấn Enter)" style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', width: '250px', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#6ab0ff'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
                                )}
                            </div>

                            <div style={{ marginBottom: '30px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '18px' }}>📝</span>
                                    <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>Mô tả công việc</h3>
                                </div>
                                <div>
                                    <ReactQuill theme="snow" value={description} onChange={setDescription} readOnly={isReadOnly} placeholder={isReadOnly ? "Không có mô tả." : "Thêm mô tả chi tiết hơn..."} />
                                </div>
                            </div>

                            <Checklist items={checklists} setItems={setChecklists} isReadOnly={isReadOnly} />

                            {attachments.length > 0 && (
                                <div style={{ marginBottom: '36px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '18px' }}>📎</span>
                                        <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>Tài liệu đính kèm</h3>
                                    </div>

                                    {/* 🖼️ KHU VỰC 1: HÌNH ẢNH */}
                                    {attachments.filter(url => url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('/image/upload/') || url.startsWith('data:image')).length > 0 && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ fontSize: '12px', color: '#6ab0ff', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>🖼️ Hình ảnh đính kèm</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                {attachments.filter(url => url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('/image/upload/') || url.startsWith('data:image')).map((url, idx) => (
                                                    <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <img
                                                            src={url} alt={`img-${idx}`}
                                                            style={{ width: '120px', height: '80px', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
                                                            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                                                            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 📁 KHU VỰC 2: CÁC FILE KHÁC (PDF, DOCX, ZIP...) */}
                                    {attachments.filter(url => !(url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('/image/upload/') || url.startsWith('data:image'))).length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#27c93f', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>📁 Tệp tin khác</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {attachments.filter(url => !(url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('/image/upload/') || url.startsWith('data:image'))).map((url, idx) => {
                                                    let fileName = url;
                                                    if (url.includes('cloudinary.com')) {
                                                        fileName = url.split('/').pop().split('?')[0];
                                                        try { fileName = decodeURIComponent(fileName); } catch { /* ignore */ }
                                                    }
                                                    return (
                                                        <a
                                                            key={idx} href={url} target="_blank" rel="noreferrer"
                                                            style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                        >
                                                            📄 {fileName.length > 40 ? fileName.substring(0, 40) + '...' : fileName}
                                                        </a>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ marginTop: '36px', marginBottom: '30px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <span style={{ fontSize: '18px' }}>💬</span>
                                    <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>Bình luận</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                                    <img src={`https://api.dicebear.com/7.x/micah/svg?seed=${currentUserId || 'Guest'}`} alt="My Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0c66e4', border: '2px solid rgba(255,255,255,0.2)' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ width: '100%', marginBottom: '10px' }}>
                                            <MentionsInput value={commentInput || ''} onChange={(e) => setCommentInput(e.target.value)} disabled={isReadOnly} placeholder={isReadOnly ? "Thẻ đã khóa. Bạn không thể bình luận." : "Viết bình luận... (Gõ @ để nhắc tên đồng đội)"} style={mentionsStyle}>
                                                <Mention trigger="@" data={mentionData} markup="@[__display__](__id__)" displayTransform={(id, display) => `@${display}`} style={{ backgroundColor: 'rgba(106, 176, 255, 0.2)', borderRadius: '4px', color: '#6ab0ff' }} />
                                            </MentionsInput>
                                        </div>
                                        {!isReadOnly && commentInput.trim() && (
                                            <button onClick={handleAddComment} style={{ padding: '8px 18px', backgroundColor: '#0c66e4', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'filter 0.2s', boxShadow: '0 4px 12px rgba(12, 102, 228, 0.3)' }} onMouseEnter={e => e.target.style.filter = 'brightness(1.1)'} onMouseLeave={e => e.target.style.filter = 'none'}>Gửi bình luận</button>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {liveComments.map((cmt, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '16px' }}>
                                            <img src={`https://api.dicebear.com/7.x/micah/svg?seed=${cmt.userId || cmt.UserId}`} alt="User Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0c66e4' }} />                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
                                                        {cmt.userName || cmt.UserName || memberMap[cmt.userId || cmt.UserId] || 'Đồng đội'}
                                                    </span>
                                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{new Date(cmt.createdAt || cmt.CreatedAt).toLocaleString('vi-VN')}</span>
                                                </div>
                                                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '0px 8px 8px 8px', color: '#fff', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                                    {formatCommentText(cmt.content || cmt.Content)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: '40px', marginBottom: '20px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '18px', filter: 'grayscale(100%)' }}>📜</span>
                                    <h3 style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '14px', textTransform: 'uppercase' }}>Lịch sử hoạt động</h3>
                                </div>
                                {activities.length === 0 ? (
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontStyle: 'italic', paddingLeft: '32px' }}>Chưa có hoạt động nào được ghi nhận.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {activities.map((log, index) => {
                                            let actObj = null;
                                            try {
                                                if (typeof log === 'object') {
                                                    actObj = log;
                                                } else if (typeof log === 'string') {
                                                    let cleanLog = log.trim();
                                                    if (cleanLog.startsWith('"') && cleanLog.endsWith('"')) {
                                                        cleanLog = cleanLog.substring(1, cleanLog.length - 1);
                                                        cleanLog = cleanLog.replace(/\\"/g, '"');
                                                    }
                                                    if (cleanLog.startsWith('{')) {
                                                        actObj = JSON.parse(cleanLog);
                                                        if (typeof actObj === 'string') actObj = JSON.parse(actObj);
                                                    }
                                                }
                                            } catch { /* Bỏ qua nếu lỗi */ }

                                            if (actObj && typeof actObj === 'object' && actObj.userName) {
                                                return (
                                                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                        <img
                                                            src={`https://api.dicebear.com/7.x/micah/svg?seed=${actObj.userId || actObj.userName}`}
                                                            alt="avt"
                                                            style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0c66e4', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
                                                        />
                                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '0px 10px 10px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#fff', lineHeight: '1.4' }}>
                                                                <strong style={{ color: '#6ab0ff' }}>{actObj.userName}</strong> đã {actObj.action}
                                                            </p>
                                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                🕒 {new Date(actObj.timestamp).toLocaleString('vi-VN')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                return <div key={index} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', paddingLeft: '44px', opacity: 0.8 }}>• {typeof log === 'string' ? log : "Lịch sử không xác định"}</div>;
                                            }
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                            <h4 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tùy chọn thẻ</h4>

                            {!isReadOnly && (
                                <>
                                    <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverUpload} style={{ display: 'none' }} />
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

                                    <button onClick={() => coverInputRef.current.click()} style={rightColBtnStyle} onMouseEnter={handleBtnHover} onMouseLeave={handleBtnLeave}>
                                        <span style={{ fontSize: '16px' }}>🖼️</span> Ảnh bìa
                                    </button>

                                    <button onClick={() => fileInputRef.current.click()} style={rightColBtnStyle} onMouseEnter={handleBtnHover} onMouseLeave={handleBtnLeave}>
                                        <span style={{ fontSize: '16px' }}>☁️</span> File máy tính
                                    </button>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <button onClick={() => setShowLinkInput(!showLinkInput)} style={rightColBtnStyle} onMouseEnter={handleBtnHover} onMouseLeave={handleBtnLeave}>
                                            <span style={{ fontSize: '16px' }}>🔗</span> Đính kèm Link
                                        </button>

                                        {showLinkInput && (
                                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(106, 176, 255, 0.3)', animation: 'slideDown 0.2s' }}>
                                                <input
                                                    autoFocus
                                                    type="url"
                                                    placeholder="Dán link (URL) vào đây..."
                                                    value={linkInput}
                                                    onChange={(e) => setLinkInput(e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', outline: 'none', marginBottom: '8px', boxSizing: 'border-box', fontSize: '13px' }}
                                                    onFocus={(e) => e.target.style.borderColor = '#6ab0ff'}
                                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddAttachmentLink()}
                                                />
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={handleAddAttachmentLink} style={{ flex: 1, padding: '6px', background: '#0c66e4', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Thêm</button>
                                                    <button onClick={() => { setShowLinkInput(false); setLinkInput(''); }} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Hủy</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', textTransform: 'uppercase', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                                            <span style={{ fontSize: '14px' }}>⏳</span> Thời gian
                                            {!canEditDeadline && <span style={{ color: '#ef4444', textTransform: 'none', fontSize: '10px', marginLeft: 'auto' }}>(Chỉ Admin)</span>}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>BẮT ĐẦU:</span>
                                            <input
                                                type="datetime-local"
                                                value={startDate ? new Date(new Date(startDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                                onChange={(e) => setStartDate(new Date(e.target.value).toISOString())}
                                                disabled={!canEditDeadline}
                                                style={{
                                                    width: '100%', border: '1px solid rgba(106, 176, 255, 0.2)', background: 'rgba(106, 176, 255, 0.05)',
                                                    padding: '8px 10px', borderRadius: '6px', outline: 'none', color: '#6ab0ff',
                                                    fontSize: '13px', cursor: canEditDeadline ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxSizing: 'border-box',
                                                    transition: 'all 0.2s'
                                                }}
                                                onFocus={e => { if (canEditDeadline) { e.target.style.borderColor = '#6ab0ff'; e.target.style.background = 'rgba(106, 176, 255, 0.1)'; } }}
                                                onBlur={e => { if (canEditDeadline) { e.target.style.borderColor = 'rgba(106, 176, 255, 0.2)'; e.target.style.background = 'rgba(106, 176, 255, 0.05)'; } }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>KẾT THÚC (DEADLINE):</span>
                                            <input
                                                type="datetime-local"
                                                value={dueDate ? new Date(new Date(dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                                onChange={(e) => setDueDate(new Date(e.target.value).toISOString())}
                                                disabled={!canEditDeadline}
                                                style={{
                                                    width: '100%', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)',
                                                    padding: '8px 10px', borderRadius: '6px', outline: 'none', color: '#ef4444',
                                                    fontWeight: 'bold', fontSize: '13px', cursor: canEditDeadline ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxSizing: 'border-box',
                                                    transition: 'all 0.2s'
                                                }}
                                                onFocus={e => { if (canEditDeadline) { e.target.style.borderColor = '#ef4444'; e.target.style.background = 'rgba(239, 68, 68, 0.1)'; } }}
                                                onBlur={e => { if (canEditDeadline) { e.target.style.borderColor = 'rgba(239, 68, 68, 0.2)'; e.target.style.background = 'rgba(239, 68, 68, 0.05)'; } }}
                                            />
                                        </div>
                                    </div>

                                    <button onClick={handleGenerateAI} disabled={isGenerating} style={{ padding: '12px 14px', background: isGenerating ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #8777D9 0%, #6ab0ff 100%)', color: 'white', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: isGenerating ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: isGenerating ? 'none' : '0 4px 15px rgba(106, 176, 255, 0.3)', transition: 'transform 0.2s', fontSize: '14px' }} onMouseEnter={e => !isGenerating && (e.target.style.transform = 'translateY(-2px)')} onMouseLeave={e => !isGenerating && (e.target.style.transform = 'translateY(0)')}>
                                        {isGenerating ? "⏳ Đang nghĩ..." : "✨ AI Phân Tích"}
                                    </button>

                                    <hr style={{ width: '100%', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }} />

                                    <button onClick={handleSaveChanges} style={{ padding: '12px 14px', backgroundColor: '#0c66e4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(12, 102, 228, 0.3)' }} onMouseEnter={e => e.target.style.backgroundColor = '#0052cc'} onMouseLeave={e => e.target.style.backgroundColor = '#0c66e4'}>
                                        💾 Lưu thay đổi
                                    </button>

                                    <button onClick={handleDeleteCard} style={{ padding: '12px 14px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px', transition: 'all 0.2s', fontSize: '14px' }} onMouseEnter={(e) => { e.target.style.backgroundColor = '#ef4444'; e.target.style.color = 'white' }} onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#ef4444' }}>
                                        🗑️ Xóa thẻ
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        portalRoot
    );
};

const rightColBtnStyle = {
    padding: '10px 14px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
    fontSize: '14px'
};
const handleBtnHover = (e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.borderColor = '#6ab0ff'; };
const handleBtnLeave = (e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; };

export default CardDetailModal;