import React, { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        const fetchNotifications = async () => {
            try {
                const res = await axios.get('/api/v1/notifications');
                if (isMounted) {
                    setNotifications(res.data.notifications);
                    setUnreadCount(res.data.unreadCount);
                }
            } catch (error) {
                console.error("Lỗi tải thông báo:", error);
            }
        };

        fetchNotifications();

        const connection = new HubConnectionBuilder()
            .withUrl("http://localhost:5078/hubs/kanban", {
                accessTokenFactory: () => {
                    let rawToken = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
                    return rawToken.replace(/['"]+/g, '');
                },
                skipNegotiation: true,
                transport: 1
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000])
            .build();

        const startConnection = async () => {
            try {
                if (connection.state === 'Disconnected') {
                    await connection.start();
                    console.log("🟢 SignalR connected in Notification!");

                    if (isMounted) {
                        connection.on("ReceiveNotification", (newNoti) => {
                            let myId = null;
                            let myName = "";
                            try {
                                const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
                                if (token) {
                                    const payload = JSON.parse(atob(token.split('.')[1]));
                                    myId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.nameid || payload.sub || payload.id;
                                }
                                const userStr = localStorage.getItem('user');
                                if (userStr) {
                                    const userObj = JSON.parse(userStr);
                                    if (!myId) myId = userObj.id || userObj.Id || userObj._id;
                                    myName = userObj.fullName || userObj.FullName || userObj.name || "";
                                }
                            } catch { /* empty */ }

                            const targetUserId = newNoti.userId || newNoti.UserId;
                            const message = newNoti.message || newNoti.Message || "";

                            // 2. LỌC: Thông báo nhắc tên (@)
                            if (message.toLowerCase().includes("nhắc tên bạn")) {
                                if (!targetUserId || String(targetUserId) !== String(myId)) return;
                            }
                            // 3. LỌC: Thông báo hệ thống (Tạo thẻ, xóa thẻ...)
                            else {
                                if (targetUserId && String(targetUserId) !== String(myId)) return;
                                if (myName && message.includes(myName)) return;
                            }

                            setNotifications(prev => [newNoti, ...prev]);
                            setUnreadCount(prev => prev + 1);
                        });
                    }
                }
            } catch (err) {
                if (!err.message?.includes('stopped during negotiation')) {
                    console.error("❌ Lỗi sóng chuông, đang thử lại...", err);
                    setTimeout(startConnection, 1000);
                }
            }
        };

        startConnection();

        return () => {
            isMounted = false;
            connection.off("ReceiveNotification");
            if (connection.state !== 'Disconnected') {
                connection.stop().catch(e => console.error(e));
            }
        };
    }, []);

    const handleRead = async (id, linkUrl, notiMessage) => {
        if (!id || id === 'undefined') {
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.filter(n => (n.message || n.Message) !== notiMessage));
            setIsOpen(false);
            if (linkUrl) navigate(linkUrl);
            return;
        }

        try {
            await axios.put(`/api/v1/notifications/${id}/read`);
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(notifications.map(n =>
                (n.id === id || n.Id === id || n._id === id) ? { ...n, isRead: true, IsRead: true } : n
            ));
            setIsOpen(false);
            if (linkUrl) navigate(linkUrl);
        } catch (error) {
            console.error("Lỗi đánh dấu đọc DB:", error);
            if (linkUrl) navigate(linkUrl);
            setIsOpen(false);
        }
    };

    const handleReadAll = async () => {
        try {
            await axios.put('/api/v1/notifications/read-all');
            setUnreadCount(0);
            setNotifications(notifications.map(n => ({ ...n, isRead: true, IsRead: true })));
        } catch (error) {
            console.error("Lỗi đọc tất cả:", error);
        }
    };

    const timeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return `${seconds} giây trước`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '20px', position: 'relative', padding: '8px',
                    color: '#a0aec0', transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#a0aec0'}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '2px', right: '4px',
                        backgroundColor: '#ef4444', color: 'white',
                        fontSize: '10px', fontWeight: 'bold',
                        borderRadius: '50%', width: '18px', height: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #0f172a'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '50px', right: 0, width: '380px',
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 9999, overflow: 'hidden'
                }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 'bold' }}>Thông báo</h4>
                        {unreadCount > 0 && (
                            <span onClick={handleReadAll} style={{ fontSize: '12px', color: '#6ab0ff', cursor: 'pointer', fontWeight: '600', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = '#6ab0ff'}>
                                Đánh dấu đã đọc
                            </span>
                        )}
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📭</div>
                                Không có thông báo mới nào.
                            </div>
                        ) : (
                            notifications.map((noti, idx) => {
                                const isUnread = !(noti.isRead || noti.IsRead);
                                const message = noti.message || noti.Message || "";
                                const createdAt = noti.createdAt || noti.CreatedAt;

                                let icon = "💬";
                                if (message.toLowerCase().includes("task") || message.toLowerCase().includes("kéo")) icon = "📌";
                                if (message.toLowerCase().includes("hết hạn") || message.toLowerCase().includes("trễ")) icon = "⏰";

                                return (
                                    <div
                                        key={noti.id || noti.Id || idx}
                                        onClick={() => handleRead(noti.id || noti.Id || noti._id, noti.linkUrl || noti.LinkUrl, message)}
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            display: 'flex', gap: '12px', alignItems: 'flex-start',
                                            backgroundColor: isUnread ? 'rgba(106, 176, 255, 0.05)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isUnread ? 'rgba(106, 176, 255, 0.05)' : 'transparent'}
                                    >
                                        <div style={{ fontSize: '18px', marginTop: '2px' }}>{icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: isUnread ? '#fff' : '#cbd5e1', fontWeight: isUnread ? '600' : '400', lineHeight: '1.4' }}>
                                                {message}
                                            </p>
                                            <span style={{ fontSize: '11px', color: '#6ab0ff', fontWeight: '500' }}>
                                                {timeAgo(createdAt)}
                                            </span>
                                        </div>
                                        {isUnread && (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6ab0ff', marginTop: '6px' }}></div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;