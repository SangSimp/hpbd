import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: true
            },// Tự động cập nhật app khi sếp đẩy code mới
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
            manifest: {
                name: 'Smart Kanban - Quản lý công việc',
                short_name: 'SmartKanban',
                description: 'Hệ thống quản lý công việc thông minh',
                theme_color: '#0c66e4',
                background_color: '#ffffff',
                display: 'standalone', // Bỏ thanh địa chỉ của trình duyệt, hiển thị full màn hình như App
                icons: [
                    {
                        src: 'https://cdn-icons-png.flaticon.com/512/732/732228.png', // Sếp có thể thay link logo của sếp vào đây
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'https://cdn-icons-png.flaticon.com/512/732/732228.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ]
});