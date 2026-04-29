import React, { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';

const CardModal = ({ card, onClose, connection, cardId }) => {
    const [title, setTitle] = useState(card.title || card.Title || '');
    const [description, setDescription] = useState(card.description || card.Description || '');
    const [isSaving, setIsSaving] = useState(false);
    const [danhSachBinhLuan, setDanhSachBinhLuan] = useState(card.comments || card.Comments || []);

    useEffect(() => {
        if (connection) {
            connection.on("ReceiveNewComment", (dataTuServer) => {
                console.log("Ting ting! Có bình luận mới:", dataTuServer);

                if (dataTuServer.cardId === cardId) {
                    setDanhSachBinhLuan(prev => [...prev, dataTuServer.comment]);
                }
            });
        }

        return () => {
            if (connection) {
                connection.off("ReceiveNewComment");
            }
        };
    }, [connection, cardId]); 
    const handleOverlayClick = (e) => {
        if (e.target.id === 'modal-overlay') onClose();
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.put(`/api/v1/cards/${card.id || card.Id}`, {
                Title: title,
                Description: description,
                Tags: card.tags || card.Tags || [],
                CoverUrl: card.coverUrl || card.CoverUrl || "",
                Checklists: card.checklists || card.Checklists || []
            });

            alert("Đã lưu chi tiết thẻ!");
            onClose(); 
        } catch (error) {
            console.error("Lỗi khi lưu thẻ:", error);
            alert("Lỗi khi lưu: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div 
            id="modal-overlay"
            onClick={handleOverlayClick}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
        >
            <div style={{
                backgroundColor: 'white', width: '500px', minHeight: '300px',
                borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ fontSize: '20px', fontWeight: 'bold', border: 'none', borderBottom: '2px solid transparent', width: '80%', padding: '5px', outline: 'none' }}
                        onFocus={(e) => e.target.style.borderBottom = '2px solid #0079bf'}
                        onBlur={(e) => e.target.style.borderBottom = '2px solid transparent'}
                    />
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
                </div>

                {/* Body - Description */}
                <div>
                    <h4>Mô tả công việc</h4>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Thêm mô tả chi tiết hơn..."
                        style={{ width: '100%', height: '100px', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
                    />
                </div>
                {/* Khu vực hiển thị danh sách bình luận */}
                <div>
                    <h4>Bình luận mới ({danhSachBinhLuan.length})</h4>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '4px' }}>
                        {danhSachBinhLuan.length === 0 ? (
                            <p style={{ color: 'gray', fontStyle: 'italic', fontSize: '13px' }}>Chưa có bình luận mới nào.</p>
                        ) : (
                            danhSachBinhLuan.map((cmt, index) => (
                                <div key={index} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                                    <strong style={{ color: '#0079bf' }}>{cmt.nguoiGui || "User"}: </strong>
                                    <span>{cmt.noiDung}</span>
                                    <div style={{ fontSize: '11px', color: 'gray', marginTop: '4px' }}>
                                        {cmt.thoiGian || new Date().toLocaleTimeString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                {/* Footer - Nút Lưu */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        style={{ padding: '8px 16px', backgroundColor: '#0079bf', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardModal;