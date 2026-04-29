import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
    const [isDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <main style={{ flex: 1 }}>
                <Outlet />
            </main>
        </div>
    );
};

export default PublicLayout;