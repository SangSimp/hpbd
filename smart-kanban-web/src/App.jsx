import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Board from './components/Board';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Members from './pages/Members';
import DashboardOverview from './pages/DashboardOverview';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import BoardList from './pages/BoardList';
import Setting from './pages/Setting';
import CalendarView from './pages/CalendarView';

const About = () => <div style={{ padding: '40px', textAlign: 'center' }}><h1>Về chúng tôi</h1><p>Đồ án xây dựng hệ thống quản lý công việc.</p></div>;

function App() {
    return (
        <Router>
            <ToastContainer style={{ zIndex: 999999 }} position="top-right" autoClose={3000} />
            <Routes>

                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>

                <Route path="/d" element={<DashboardLayout />}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="boards" element={<BoardList />} />
                    <Route path="boards/:boardId" element={<Board />} />

                    <Route path="members" element={<Members />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="calendar" element={<CalendarView />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="settings" element={<Setting />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </Router>
    );
}

export default App;