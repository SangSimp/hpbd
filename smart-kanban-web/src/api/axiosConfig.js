import axios from 'axios';

const instance = axios.create({
    // Đổi lại URL backend của sếp nếu cần
    baseURL: 'http://localhost:5078',
});

// 💡 INTERCEPTOR: Chốt chặn kiểm tra vé trước khi gửi request đi
instance.interceptors.request.use(
    (config) => {
        // Lấy Token MỚI NHẤT từ LocalStorage ngay tại thời điểm gọi API
        let rawToken = localStorage.getItem('jwt_token') || localStorage.getItem('token');
        if (rawToken) {
            let token = rawToken.replace(/['"]+/g, '');
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default instance;