import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const ROLE_LABEL = { student_staff: 'Student / Staff', officer: 'Maintenance Officer', admin: 'Administrator' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get('/notifications').then((r) => setUnread(r.data.unread)).catch(() => {});
  }, [location.pathname]);

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    ...(user.role !== 'officer' ? [{ to: '/requests/new', label: 'New Request' }] : []),
    { to: '/notifications', label: `Notifications${unread ? ` (${unread})` : ''}` },
    ...(user.role === 'admin' ? [{ to: '/users', label: 'Users' }, { to: '/audit', label: 'Audit Log' }] : []),
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">CampusFix</div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>{l.label}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <strong>{user.name}</strong>
            <span className="role-tag">{ROLE_LABEL[user.role]}</span>
          </div>
          <button className="btn btn-outline" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
