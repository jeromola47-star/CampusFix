import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import api from '../api';
import Register from '../pages/Register';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

vi.mock('../api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
  errorMessage: (err, fallback) => fallback || 'error',
  API_ROOT: '',
}));

describe('Register form', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('shows messages for a weak password and mismatched confirmation, with no API call', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <Register />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Full name'), 'Ada Student');
    await userEvent.type(screen.getByLabelText('Email'), 'ada@test.edu');
    await userEvent.type(screen.getByLabelText('Password'), 'abc');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'xyz');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
