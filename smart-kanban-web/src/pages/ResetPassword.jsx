import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('❌ Mật khẩu xác nhận không khớp!');
            return;
        }

        setIsLoading(true);

        try {
            await axios.post('/api/v1/auth/reset-password', { token, newPassword });

            toast.success('🎉 Đặt lại mật khẩu thành công! Đang chuyển về đăng nhập...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            toast.error(error.response?.data?.message || '❌ Lỗi kết nối đến máy chủ!');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f5f7' }}>
                <h2 style={{ color: '#bf2600' }}>⚠️ Đường dẫn không hợp lệ hoặc đã hết hạn!</h2>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#172b4d', backgroundImage: 'url(https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=2000)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}></div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', padding: '48px 40px', borderRadius: '16px', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', border: '1px solid rgba(255, 255, 255, 0.5)', width: '400px', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '36px' }}>🔑</span>
                    <h1 style={{ margin: 0, color: '#172b4d', fontSize: '28px', fontWeight: '900', letterSpacing: '-1px' }}>Tạo mật khẩu mới</h1>
                </div>

                <h2 style={{ margin: '0 0 24px 0', color: '#5e6c84', fontSize: '14px', fontWeight: '500', textAlign: 'center', lineHeight: '1.5' }}>
                    Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
                </h2>

                <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <input
                            type="password" required placeholder="Mật khẩu mới"
                            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isLoading}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid rgba(223, 225, 230, 0.8)', outline: 'none', fontSize: '15px', boxSizing: 'border-box', transition: 'all 0.3s', backgroundColor: 'rgba(255,255,255,0.9)', color: '#172b4d' }}
                        />
                    </div>
                    <div>
                        <input
                            type="password" required placeholder="Xác nhận mật khẩu mới"
                            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid rgba(223, 225, 230, 0.8)', outline: 'none', fontSize: '15px', boxSizing: 'border-box', transition: 'all 0.3s', backgroundColor: 'rgba(255,255,255,0.9)', color: '#172b4d' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !newPassword || !confirmPassword}
                        style={{ width: '100%', padding: '14px', backgroundColor: (isLoading || !newPassword || !confirmPassword) ? '#b3d4ff' : '#0c66e4', color: 'white', border: 'none', borderRadius: '8px', cursor: (isLoading || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '8px' }}
                    >
                        {isLoading ? (
                            <><svg style={{ animation: 'spin 1s linear infinite', height: '20px', width: '20px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"></path></svg>
                                Đang xử lý...</>
                        ) : 'Lưu mật khẩu mới'}
                    </button>
                </form>
            </div>

            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default ResetPassword;