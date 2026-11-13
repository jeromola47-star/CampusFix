import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../api';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Password must contain a letter and a number';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      toast('Account created. Welcome to CampusFix!');
      navigate('/dashboard');
    } catch (err) {
      toast(errorMessage(err, 'Registration failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Create account</h1>
        <p className="muted">Students and staff can register here.</p>
        <label htmlFor="name">Full name</label>
        <input id="name" value={form.name} onChange={set('name')} />
        {errors.name && <div className="field-error">{errors.name}</div>}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={set('email')} />
        {errors.email && <div className="field-error">{errors.email}</div>}
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={form.password} onChange={set('password')} />
        {errors.password && <div className="field-error">{errors.password}</div>}
        <label htmlFor="confirm">Confirm password</label>
        <input id="confirm" type="password" value={form.confirm} onChange={set('confirm')} />
        {errors.confirm && <div className="field-error">{errors.confirm}</div>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
        <p className="muted center">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
