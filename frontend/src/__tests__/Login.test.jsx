import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import api from '../api';
import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

vi.mock('../api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
  errorMessage: (err, fallback) => fallback || 'error',
  API_ROOT: '',
}));

const setup = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <Login />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

describe('Login form', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('shows validation messages and makes no API call when fields are empty', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('calls the API with the email and password when valid', async () => {
    api.post.mockResolvedValue({ data: { token: 't', user: { id: 1, name: 'Ada', email: 'ada@test.edu', role: 'student_staff' } } });
    setup();
    await userEvent.type(screen.getByLabelText('Email'), 'ada@test.edu');
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd!');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'ada@test.edu', password: 'Passw0rd!' });
  });
});
