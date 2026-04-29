import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from '../api/axiosConfig';
import { addCardToColumn, deleteColumn, updateColumnTitle } from '../redux/boardSlice';
import Card from './Card';
import { useParams } from 'react-router-dom';

const Column = ({ column, searchQuery = '', filterOption = 'all', isDraggingMode, isAllowedDrop, selectedTag }) => {
    const dispatch = useDispatch();
    const { boardId } = useParams();
    const boardInfo = useSelector(state => state.board.boardInfo);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: column.id || column.Id,
        data: { type: 'column', column: column }
    });

    const dndStyle = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

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
    const isDone = column.isDoneColumn === true || column.IsDoneColumn === true;

    // Khóa nhân viên
    const isLockedColumn = isDone && !isAdminOrOwner;

    const handleDeleteColumn = async () => {
        if (isReadOnly || isLockedColumn) return;

        const isConfirm = window.confirm(`⚠️ Bạn có chắc chắn muốn xóa cột "${column.title || column.Title}" không?`);
        if (!isConfirm) return;
        try {
            await axios.delete(`/api/v1/columns/${column.id || column.Id}`);
            dispatch(deleteColumn(column.id || column.Id));
        } catch (error) {
            console.error("Lỗi khi xóa cột:", error);
            alert("❌ Lỗi: Không thể xóa cột.");
        }
    };

    const [isAddingMode, setIsAddingMode] = useState(false);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title || column.Title || '');

    const handleUpdateTitle = async () => {
        if (isReadOnly || isLockedColumn) return;

        setIsEditingTitle(false);
        const finalTitle = editTitle.trim();
        const oldTitle = column.title || column.Title;

        if (!finalTitle || finalTitle === oldTitle) {
            setEditTitle(oldTitle);
            return;
        }

        try {
            await axios.put(`/api/v1/columns/${column.id || column.Id}`, { title: finalTitle });
            dispatch(updateColumnTitle({ columnId: column.id || column.Id, newTitle: finalTitle }));
        } catch (error) {
            console.error("Lỗi đổi tên cột:", error);
            setEditTitle(oldTitle);
            alert("❌ Không thể đổi tên cột.");
        }
    };

    const handleAddNewCard = async () => {
        if (isReadOnly || isLockedColumn) return;

        if (!newCardTitle.trim()) {
            setIsAddingMode(false);
            return;
        }
        try {
            const response = await axios.post(`/api/v1/cards?boardId=${boardId}`, {
                columnId: column.id || column.Id,
                title: newCardTitle
            });
            dispatch(addCardToColumn({ columnId: column.id || column.Id, newCard: response.data }));
            setNewCardTitle('');
            setIsAddingMode(false);
        } catch (error) {
            console.error("Lỗi khi tạo thẻ mới:", error);
        }
    };

    const filteredCards = column.cards?.filter(card => {
        let matchSearch = true;
        if (searchQuery.trim()) {
            matchSearch = (card.title || card.Title || '').toLowerCase().includes(searchQuery.toLowerCase());
        }

        let matchFilter = true;
        if (filterOption === 'overdue') {
            const dueDate = card.dueDate || card.DueDate;
            if (dueDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const cardDate = new Date(dueDate);
                cardDate.setHours(0, 0, 0, 0);
                matchFilter = cardDate < today;
            } else {
                matchFilter = false;
            }
        }
        else if (filterOption === 'hasAttachment') {
            const attachCount = card.attachmentCount || card.AttachmentCount || 0;
            matchFilter = attachCount > 0;
        }
        else if (filterOption === 'hasComment') {
            const commentCount = card.commentCount || card.CommentCount || 0;
            matchFilter = commentCount > 0;
        }
        const cardTags = card.tags || card.Tags || [];
        const matchTag = selectedTag === 'all' || cardTags.includes(selectedTag);
        return matchSearch && matchFilter && matchTag;
    }) || [];

    const cardIds = filteredCards.map(card => card.id || card.Id);

    const getColumnTheme = (title) => {
        if (!title) return { bg: 'rgba(255,255,255,0.05)', text: '#fff' };
        const lowerTitle = title.toLowerCase();

        if (lowerTitle.includes("to do") || lowerTitle.includes("cần làm") || lowerTitle.includes("mới")) return { bg: 'rgba(255,255,255,0.1)', text: '#fff' };
        if (lowerTitle.includes("doing") || lowerTitle.includes("đang làm") || lowerTitle.includes("tiến hành")) return { bg: 'rgba(12, 102, 228, 0.4)', text: '#fff' };
        if (lowerTitle.includes("done") || lowerTitle.includes("hoàn thành") || lowerTitle.includes("xong")) return { bg: 'rgba(39, 201, 63, 0.4)', text: '#fff' };
        if (lowerTitle.includes("bug") || lowerTitle.includes("lỗi") || lowerTitle.includes("khẩn")) return { bg: 'rgba(239, 68, 68, 0.4)', text: '#fff' };
        if (lowerTitle.includes("review") || lowerTitle.includes("kiểm tra")) return { bg: 'rgba(245, 158, 11, 0.4)', text: '#fff' };

        const fancyColors = [
            { bg: 'rgba(139, 92, 246, 0.4)', text: '#fff' },
            { bg: 'rgba(6, 182, 212, 0.4)', text: '#fff' },
            { bg: 'rgba(236, 72, 153, 0.4)', text: '#fff' },
            { bg: 'rgba(245, 158, 11, 0.4)', text: '#fff' },
            { bg: 'rgba(16, 185, 129, 0.4)', text: '#fff' }
        ];
        const index = title.length % fancyColors.length;
        return fancyColors[index];
    };

    const theme = getColumnTheme(column.title || column.Title);

    return (
        <div
            ref={setNodeRef}
            style={{
                ...dndStyle,
                minWidth: '280px',
                width: '280px',
                background: 'rgba(30, 41, 59, 0.4)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                justifyContent: 'space-between',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                touchAction: 'none',
                opacity: (isDraggingMode && !isAllowedDrop) ? 0.35 : 1,
                filter: (isDraggingMode && !isAllowedDrop) ? 'grayscale(80%) blur(1px)' : 'none',
                pointerEvents: (isDraggingMode && !isAllowedDrop) ? 'none' : 'auto',
                transition: 'opacity 0.3s ease, filter 0.3s ease',
            }}
            {...attributes}
            {...listeners}
        >
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isEditingTitle ? (
                    <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleUpdateTitle}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                        style={{
                            background: 'rgba(0,0,0,0.4)', border: '1px solid #6ab0ff', borderRadius: '6px',
                            padding: '4px 8px', fontSize: '15px', fontWeight: 'bold', outline: 'none',
                            color: '#fff', width: '70%', boxShadow: '0 0 10px rgba(106, 176, 255, 0.2)'
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                ) : (
                        <span
                            onClick={() => { if (!isReadOnly && !isLockedColumn) setIsEditingTitle(true); }}
                            title={isReadOnly || isLockedColumn ? "" : "Click để đổi tên cột"}
                            style={{ cursor: isReadOnly || isLockedColumn ? 'default' : 'pointer', padding: '4px 0', flex: 1, fontWeight: '800', color: '#fff', fontSize: '16px' }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {column.title || column.Title}

                            {/* 💡 Hiện Biểu tượng Đích đến cho mọi người biết */}
                            {isDone && <span style={{ marginLeft: '8px', fontSize: '15px' }} title="Cột nghiệm thu">🎯</span>}

                            {/* Hiện thêm Ổ khóa nếu bị khóa đối với nhân viên */}
                            {isLockedColumn && <span style={{ marginLeft: '4px', fontSize: '12px' }} title="Khóa với nhân viên">🔒</span>}
                        </span>
                )}

                {/* 💡 ẨN thùng rác nếu là Viewer HOẶC Cột bị khóa */}
                {!isReadOnly && !isLockedColumn && (
                    <button
                        onClick={handleDeleteColumn}
                        title="Xóa cột này"
                        style={{
                            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                            fontSize: '16px', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.target.style.color = '#ef4444'; e.target.style.transform = 'scale(1.2)' }}
                        onMouseLeave={(e) => { e.target.style.color = 'rgba(255,255,255,0.4)'; e.target.style.transform = 'scale(1)' }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        🗑️
                    </button>
                )}
            </div>

            <div style={{
                background: theme.bg,
                color: theme.text,
                padding: '8px 16px',
                fontWeight: 'bold',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Trạng thái thẻ
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                        {cardIds.length}
                    </span>
                </div>
            </div>

            <div style={{ padding: '12px 10px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    {filteredCards.map(card => (
                        <Card
                            key={card.id || card.Id}
                            card={card}
                            columnId={column.id || column.Id}
                        />
                    ))}
                </SortableContext>

                {/* 💡 ẨN ô gõ thẻ mới nếu bị khóa */}
                {!isReadOnly && !isLockedColumn && isAddingMode && (
                    <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                        <textarea
                            autoFocus
                            value={newCardTitle}
                            onChange={(e) => setNewCardTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNewCard(); } }}
                            onBlur={handleAddNewCard}
                            placeholder="Tác vụ nhanh..."
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px',
                                border: '1px solid #6ab0ff', resize: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                minHeight: '60px', boxSizing: 'border-box', outline: 'none', fontSize: '14px',
                                background: 'rgba(0,0,0,0.3)', color: '#fff', backdropFilter: 'blur(10px)'
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>

            {/* 💡 ẨN nút Thêm thẻ nếu bị khóa */}
            {!isReadOnly && !isAddingMode && !isLockedColumn && (
                <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={() => setIsAddingMode(true)}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{
                            width: '100%', padding: '10px', borderRadius: '8px',
                            border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent',
                            cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontWeight: '600',
                            transition: 'all 0.2s', display: 'flex', justifyContent: 'center', gap: '8px'
                        }}
                        onMouseEnter={(e) => { e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.target.style.color = '#fff'; e.target.style.borderColor = 'rgba(255,255,255,0.5)' }}
                        onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'rgba(255,255,255,0.6)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)' }}
                    >
                        + Thêm thẻ công việc
                    </button>
                </div>
            )}
        </div>
    );
};

export default Column;