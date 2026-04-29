import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useDispatch, useSelector } from 'react-redux';
import { setBoardData, updateCardPosition } from '../redux/boardSlice';
import Board from '../components/Board';
import { startSignalRConnection, onCardMoved } from '../services/signalrService';
import MainLayout from '../components/MainLayout';

const BoardDetail = () => {
    const { boardId } = useParams();
    const dispatch = useDispatch();

    const boardInfo = useSelector(state => state.board.boardInfo || state.board.boardData);

    const [isLoading, setIsLoading] = useState(true);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [isInvitingBtn, setIsInvitingBtn] = useState(false);

    const handleInviteSubmit = async () => {
        setInviteError('');

        if (!inviteEmail.trim()) {
            setInviteError('⚠️ Sếp ơi, phải nhập địa chỉ Email của đồng đội vào chứ!');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
            setInviteError('⚠️ Ối, Email này sai định dạng mất rồi!');
            return;
        }

        setIsInvitingBtn(true);
        try {
            await axios.post(`/api/v1/boards/${boardId}/invite`, { email: inviteEmail });

            alert('🎉 Tuyệt vời! Lời mời đã được gửi đi thành công.');
            setIsInviteModalOpen(false);
            setInviteEmail('');

        } catch (error) {
            console.error("Lỗi mời thành viên:", error);
            setInviteError(error.response?.data?.message || "❌ Không thể gửi lời mời lúc này.");
        } finally {
            setIsInvitingBtn(false);
        }
    };

    useEffect(() => {
        const fetchBoardData = async () => {
            try {
                const response = await axios.get(`/api/v1/boards/${boardId}`);
                const boardData = response.data.board || response.data.Board;
                const columnsData = response.data.columns || response.data.Columns || [];

                if (boardData) {
                    dispatch(setBoardData({
                        boardInfo: boardData,
                        columns: columnsData
                    }));
                }
                setIsLoading(false);
            } catch (error) {
                console.error("Lỗi tải dữ liệu Bảng:", error);
                setIsLoading(false);
            }
        };

        fetchBoardData();
        startSignalRConnection(boardId);

        onCardMoved((data) => {
            dispatch(updateCardPosition({
                cardId: data.cardId,
                sourceColumnId: data.sourceColumnId,
                destColumnId: data.destColumnId,
                newIndex: data.newIndex
            }));
        });

        return () => { };
    }, [boardId, dispatch]);

    if (isLoading) {
        return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-primary)', fontSize: '20px' }}>Đang tải không gian làm việc...</div>;
    }

    return (
        <MainLayout>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 20px', boxSizing: 'border-box' }}>

                {/* --- KHU VỰC HEADER: HIỂN THỊ TÊN BẢNG VÀ NÚT MỜI --- */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px', color: 'var(--text-primary)' }}>
                    <h2 style={{ margin: 0 }}>{boardInfo?.title || boardInfo?.Title || "Bảng công việc"}</h2>

                    {/* DÀN AVATAR THÀNH VIÊN */}
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '10px' }}>
                        {boardInfo && (
                            <div title="Chủ bảng" style={{
                                width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#ff9f1a',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px',
                                border: '2px solid var(--bg-primary)', zIndex: 10, cursor: 'help'
                            }}>
                                👑
                            </div>
                        )}

                        {(boardInfo?.memberIds || boardInfo?.MemberIds || []).map((memberId, index) => (
                            <img
                                key={memberId}
                                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${memberId}`}
                                alt="Member Avatar"
                                title="Thành viên"
                                style={{
                                    width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--avatar-bg)',
                                    border: '2px solid var(--bg-primary)', marginLeft: '-10px',
                                    zIndex: 9 - index, cursor: 'pointer'
                                }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        style={{ padding: '8px 16px', backgroundColor: 'var(--bg-column)', color: 'var(--color-accent)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                    >
                        + Mời thành viên
                    </button>
                </div>

                <main style={{ flex: 1, overflow: 'hidden' }}>
                    <Board />
                </main>
            </div>

            {/* ========================================== */}
            {/* 👥 CỬA SỔ MỜI THÀNH VIÊN (MODAL)  */}
            {/* ========================================== */}
            {isInviteModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease' }}>

                    <div style={{ backgroundColor: 'var(--bg-header)', width: '450px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', padding: '24px', position: 'relative' }}>

                        <button onClick={() => { setIsInviteModalOpen(false); setInviteError(''); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✖</button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <span style={{ fontSize: '24px' }}>👥</span>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px' }}>Mời thành viên</h3>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                            Nhập địa chỉ Email của đồng đội. Họ sẽ nhận được thông báo và có thể tham gia cộng tác ngay trên bảng này.
                        </p>

                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Ví dụ: dongdoi@email.com"
                            autoFocus
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '6px',
                                border: inviteError ? '2px solid #ef4444' : '2px solid var(--border-color)',
                                boxSizing: 'border-box', marginBottom: '10px', outline: 'none', fontSize: '15px',
                                backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)'
                            }}
                            onFocus={(e) => !inviteError && (e.target.style.borderColor = 'var(--color-accent)')}
                            onBlur={(e) => !inviteError && (e.target.style.borderColor = 'var(--border-color)')}
                            onKeyDown={(e) => e.key === 'Enter' && handleInviteSubmit()}
                        />

                        {inviteError && (
                            <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500', marginBottom: '10px' }}>
                                ⚠️ {inviteError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => { setIsInviteModalOpen(false); setInviteError(''); }} style={{ padding: '9px 16px', background: 'var(--bg-column)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Hủy</button>

                            <button
                                onClick={handleInviteSubmit}
                                disabled={isInvitingBtn}
                                style={{ padding: '9px 20px', background: isInvitingBtn ? 'var(--color-accent-hover)' : 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: isInvitingBtn ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                            >
                                {isInvitingBtn ? "⏳ Đang gửi..." : "Gửi lời mời"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
export default BoardDetail;