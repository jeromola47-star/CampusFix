import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthContext } from '../context/AuthContext';

const renderAt = (path, user) =>
  render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><div>Admin Page</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('ProtectedRoute', () => {
  it('redirects a signed-out visitor to login', () => {
    renderAt('/admin', null);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects a student who opens an admin page to the dashboard', () => {
    renderAt('/admin', { id: 1, role: 'student_staff' });
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('shows the admin page to an administrator', () => {
    renderAt('/admin', { id: 2, role: 'admin' });
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });
});
