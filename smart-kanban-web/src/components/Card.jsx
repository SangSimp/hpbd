import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CardDetailModal from './CardDetailModal';
import { useDispatch, useSelector } from 'react-redux';
import axios from '../api/axiosConfig';
import { updateCardDetails, deleteCard } from '../redux/boardSlice';
import { toast } from 'react-toastify';

const Card = ({ card, columnId }) => {
    const dispatch = useDispatch();
    const boardInfo = useSelector(state => state.board.boardInfo);
    // 💡 Lấy danh sách cột để dò xem mình có đang nằm trong cột Hoàn thành không
    const columns = useSelector(state => state.board.columns);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const [isQuickEdit, setIsQuickEdit] = useState(false);
    const [quickTitle, setQuickTitle] = useState(card.title || card.Title || '');
    const [isLabelExpanded, setIsLabelExpanded] = useState(false);
    const [memberMap, setMemberMap] = useState({});

    // ==========================================
    // 💡 PHÂN QUYỀN VÀ XÁC ĐỊNH TRẠNG THÁI KHÓA
    // ==========================================
    let globalRole = 'member';
    let myId = null;
    try {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            let rawRole = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || payload.Role;
            if (!rawRole) {
                const roleKey = Object.keys(payload).find(k => k.toLowerCase() === 'role' || k.endsWith('/role'));
                if (roleKey) rawRole = payload[roleKey];
            }
            if (rawRole) globalRole = String(rawRole).toLowerCase().trim();

            myId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub || payload.id;
        }
    } catch (e) {
        console.error("Lỗi đọc quyền từ Token:", e);
    }
    const isReadOnly = globalRole === 'viewer';
    const isAdminOrOwner = globalRole === 'admin' || globalRole === 'manager' || (boardInfo && (boardInfo.ownerId === myId || boardInfo.OwnerId === myId));
    const currentColumnIndex = columns.findIndex(c => String(c.id || c.Id) === String(columnId || card.ColumnId));
    // 💡 CHUẨN KIẾN TRÚC: Chỉ tin vào Cờ từ Backend trả về
    const currentColumn = columns[currentColumnIndex];
    const isDoneColumn = currentColumn?.isDoneColumn === true || currentColumn?.IsDoneColumn === true;

    // 🔒 Khóa thẻ: Nếu nằm trong cột Done và không phải Sếp/Admin -> Hóa đá!
    const isLocked = isDoneColumn && !isAdminOrOwner;

    useEffect(() => {
        const handleToggleLabels = () => setIsLabelExpanded(prev => !prev);
        window.addEventListener('toggle-labels', handleToggleLabels);
        return () => window.removeEventListener('toggle-labels', handleToggleLabels);
    }, []);

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

    const handleLabelClick = (e) => {
        e.stopPropagation();
        window.dispatchEvent(new Event('toggle-labels'));
    };

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: card.id || card.Id,
        data: { ...card, columnId: columnId || card.ColumnId },
        // 💡 BÍ KÍP ĐÓNG BĂNG: Tắt luôn móc kéo nếu bị khóa
        disabled: isLocked || isReadOnly
    });

    const realTags = card.tags || card.Tags || [];
    const coverUrl = card.coverUrl || card.CoverUrl;
    const commentCount = card.commentCount || card.CommentCount || 0;
    const attachmentCount = card.attachmentCount || card.AttachmentCount || 0;
    const realAssignees = card.assigneeIds || card.AssigneeIds || [];

    const checklists = card.checklists || card.Checklists || [];
    const totalChecklists = checklists.length;
    const completedChecklists = checklists.filter(c => c.isCompleted || c.IsCompleted).length;
    const progressPercent = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0;
    const isChecklistDone = totalChecklists > 0 && totalChecklists === completedChecklists;
    const isAllChecked = isChecklistDone;

    const dueDate = card.dueDate || card.DueDate;
    let dueDateColor = 'rgba(255,255,255,0.05)';
    let dueDateTextColor = 'rgba(255,255,255,0.5)';
    let isOverdue = false;

    if (dueDate) {
        const today = new Date();
        const due = new Date(dueDate);
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);

        const timeDiff = due.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysDiff < 0) {
            dueDateColor = 'rgba(239, 68, 68, 0.2)';
            dueDateTextColor = '#ef4444';
            isOverdue = true;
        } else if (daysDiff <= 2) {
            dueDateColor = 'rgba(245, 158, 11, 0.2)';
            dueDateTextColor = '#f59e0b';
        } else {
            dueDateColor = 'rgba(255,255,255,0.1)';
            dueDateTextColor = 'rgba(255,255,255,0.8)';
        }
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        padding: '14px',
        marginBottom: '12px',
        borderRadius: '12px',
        cursor: (isLocked || isReadOnly) ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: isDragging ? 'rgba(30, 41, 59, 0.9)' : (isLocked ? 'rgba(30, 41, 59, 0.3)' : 'rgba(30, 41, 59, 0.6)'),
        backdropFilter: 'blur(10px)',
        opacity: isDragging ? 0.6 : (isLocked ? 0.8 : 1), // Làm mờ thẻ đi xíu nếu bị khóa
        border: isDragging ? '2px dashed #6ab0ff' : (isHovering && !isLocked ? '1px solid #6ab0ff' : '1px solid rgba(255, 255, 255, 0.1)'),
        boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.3)' : (isHovering && !isLocked ? '0 8px 16px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.2)'),
        position: 'relative',
        color: '#fff',
        userSelect: 'none'
    };

    const handleCardClick = (e) => {
        if (isQuickEdit) return;
        e.stopPropagation();
        setIsModalOpen(true);
    };

    const handleQuickSave = async (e) => {
        e.stopPropagation();
        if (isReadOnly || isLocked) return;
        if (!quickTitle || !quickTitle.trim()) {
            toast.warning("⚠️ Tiêu đề thẻ không được để trống!");
            return;
        }

        try {
            const finalBoardId = card.boardId || card.BoardId || boardInfo?.id || boardInfo?.Id;
            const cardId = card.id || card.Id;

            const response = await axios.put(`/api/v1/cards/${cardId}?boardId=${finalBoardId}`, {
                ...card,
                title: quickTitle.trim(),
                Title: quickTitle.trim()
            });

            dispatch(updateCardDetails({
                columnId: columnId || card.ColumnId,
                cardId: cardId,
                updatedData: response.data || { ...card, title: quickTitle.trim(), Title: quickTitle.trim() }
            }));

            setIsQuickEdit(false);
            toast.success("✅ Đã cập nhật tên thẻ!");
        } catch {
            toast.error("❌ Đổi tên thất bại!");
            setIsQuickEdit(false);
        }
    };

    const handleQuickDelete = async (e) => {
        e.stopPropagation();
        if (isReadOnly || isLocked) return;

        if (!window.confirm("⚠️ Bạn có chắc muốn xóa thẻ này vĩnh viễn không?")) return;

        try {
            const finalBoardId = card.boardId || card.BoardId || boardInfo?.id || boardInfo?.Id;
            await axios.delete(`/api/v1/cards/${card.id || card.Id}?boardId=${finalBoardId}`);
            dispatch(deleteCard(card.id || card.Id));
            toast.success("✅ Đã xóa thẻ!");
        } catch {
            toast.error("❌ Không thể xóa thẻ!");
        }
    };

    const getTagColor = (tagName) => {
        const colors = ['#4bce97', '#e2b203', '#faa53d', '#f87462', '#9f8fef', '#579dff'];
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    if (isQuickEdit) {
        return (
            <div ref={setNodeRef} style={{ ...style, cursor: 'default', zIndex: 10 }} {...attributes} {...listeners}>
                <textarea
                    autoFocus
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickSave(e); } }}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', minHeight: '60px', padding: '8px',
                        borderRadius: '6px', border: '1px solid #6ab0ff',
                        background: 'rgba(0,0,0,0.4)', color: '#fff',
                        outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: '14px',
                        boxSizing: 'border-box'
                    }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={handleQuickSave} style={{ padding: '6px 12px', background: '#0c66e4', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu</button>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsQuickEdit(false); setQuickTitle(card.title || card.Title); }} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                    </div>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={handleQuickDelete} title="Xóa thẻ" style={{ padding: '6px 10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }} onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#ef4444'; }}>
                        🗑️
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                onClick={handleCardClick}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {/* 💡 HIỂN THỊ Ổ KHÓA NẾU THẺ BỊ ĐÓNG BĂNG */}
                {isLocked && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '50%', color: '#f59e0b', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} title="Thẻ đã nghiệm thu (Khóa)">
                        🔒
                    </div>
                )}

                {/* 💡 CHỈ HIỂN THỊ NÚT SỬA NHANH NẾU KHÔNG BỊ KHÓA */}
                {isHovering && !isDragging && !isReadOnly && !isLocked && (
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setIsQuickEdit(true); }}
                        title="Sửa nhanh"
                        style={{
                            position: 'absolute', top: '8px', right: '8px', zIndex: 10,
                            padding: '6px', borderRadius: '50%', border: 'none',
                            background: 'rgba(255,255,255,0.2)', color: '#fff',
                            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s', backdropFilter: 'blur(5px)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6ab0ff'; e.currentTarget.style.color = '#121212'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                    >
                        ✏️
                    </button>
                )}

                <div style={{ opacity: isDragging ? 0 : 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {coverUrl && (
                        <div style={{
                            width: '100%', height: '110px', borderRadius: '8px',
                            backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover',
                            backgroundPosition: 'center', marginBottom: '4px',
                            filter: isLocked ? 'grayscale(30%)' : 'none'
                        }}></div>
                    )}

                    {realTags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {realTags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    onClick={handleLabelClick}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    title={!isLabelExpanded ? tag : ''}
                                    style={{
                                        backgroundColor: getTagColor(tag),
                                        color: '#1d2125',
                                        padding: isLabelExpanded ? '4px 10px' : '0',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        height: isLabelExpanded ? 'auto' : '8px',
                                        minHeight: '8px',
                                        minWidth: isLabelExpanded ? 'auto' : '40px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                                    onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                                >
                                    {isLabelExpanded && tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600', lineHeight: '1.4', wordWrap: 'break-word', paddingRight: isHovering && !isLocked ? '24px' : '0' }}>
                        {card.title || card.Title}
                    </div>

                    {totalChecklists > 0 && (
                        <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '6px', overflow: 'hidden', marginTop: '4px' }}>
                            <div style={{
                                height: '100%', width: `${progressPercent}%`,
                                backgroundColor: isChecklistDone ? '#27c93f' : '#6ab0ff',
                                transition: 'width 0.3s ease, background-color 0.3s ease'
                            }} />
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {dueDate && (
                                <div style={{
                                    backgroundColor: dueDateColor, color: dueDateTextColor,
                                    padding: '4px 8px', borderRadius: '6px', fontSize: '12px',
                                    fontWeight: isOverdue ? 'bold' : '600', display: 'flex', alignItems: 'center', gap: '4px',
                                    border: `1px solid ${dueDateColor}`
                                }}>
                                    ⏰ {new Date(dueDate).toLocaleDateString('vi-VN')}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', alignItems: 'center', fontWeight: '500' }}>
                                {totalChecklists > 0 && (
                                    <span title="Tiến độ công việc" style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        color: isAllChecked ? '#fff' : 'rgba(255,255,255,0.6)',
                                        backgroundColor: isAllChecked ? '#27c93f' : 'transparent',
                                        padding: isAllChecked ? '2px 6px' : '0', borderRadius: '4px',
                                        fontWeight: isAllChecked ? 'bold' : 'normal', transition: 'all 0.3s ease'
                                    }}>
                                        ☑️ {completedChecklists}/{totalChecklists}
                                    </span>
                                )}
                                {commentCount > 0 && <span title="Bình luận">💬 {commentCount}</span>}
                                {attachmentCount > 0 && <span title="Đính kèm">📎 {attachmentCount}</span>}
                            </div>
                        </div>

                        <div style={{ display: 'flex' }}>
                            {realAssignees.map((assigneeId, idx) => (
                                <img
                                    key={assigneeId}
                                    src={`https://api.dicebear.com/7.x/micah/svg?seed=${assigneeId}`}
                                    title={`Phụ trách: ${memberMap[assigneeId] || 'Đồng đội'}`}
                                    alt="avatar"
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        border: '2px solid rgba(30, 41, 59, 0.8)', backgroundColor: '#0c66e4',
                                        marginLeft: idx > 0 ? '-10px' : '0',
                                        cursor: 'help'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <CardDetailModal card={card} onClose={() => setIsModalOpen(false)} />
            )}
        </>
    );
};

export default React.memo(Card);