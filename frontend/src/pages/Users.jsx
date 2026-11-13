import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ROLES = [['student_staff', 'Student / Staff'], ['officer', 'Maintenance Officer'], ['admin', 'Administrator']];

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'officer' });
  const [errors, setErrors] = useState({});

  const load = useCallback(() => api.get('/users').then((r) => setUsers(r.data)).catch((err) => toast(errorMessage(err), 'error')), [toast]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'At least 8 characters with a letter and a number';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await api.post('/users', { ...form, name: form.name.trim(), email: form.email.trim() });
      toast('User created');
      setForm({ name: '', email: '', password: '', role: 'officer' });
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const changeRole = async (id, role) => {
    try { await api.patch(`/users/${id}/role`, { role }); toast('Role updated'); load(); }
    catch (err) { toast(errorMessage(err), 'error'); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}?`)) return;
    try { await api.delete(`/users/${u.id}`); toast('User deleted'); load(); }
    catch (err) { toast(errorMessage(err), 'error'); }
  };

  return (
    <>
      <div className="page-head"><div><h2>User Management</h2><p className="muted">Create officers, change roles and remove accounts.</p></div></div>

      <form className="card form-grid" onSubmit={create} noValidate>
        <div>
          <label htmlFor="u-name">Full name</label>
          <input id="u-name" value={form.name} onChange={set('name')} />
          {errors.name && <div className="field-error">{errors.name}</div>}
        </div>
        <div>
          <label htmlFor="u-email">Email</label>
          <input id="u-email" type="email" value={form.email} onChange={set('email')} />
          {errors.email && <div className="field-error">{errors.email}</div>}
        </div>
        <div>
          <label htmlFor="u-pass">Temporary password</label>
          <input id="u-pass" type="password" value={form.password} onChange={set('password')} />
          {errors.password && <div className="field-error">{errors.password}</div>}
        </div>
        <div>
          <label htmlFor="u-role">Role</label>
          <select id="u-role" value={form.role} onChange={set('role')}>
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="span-2"><button className="btn" type="submit">Create user</button></div>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td><td>{u.name}</td><td>{u.email}</td>
                  <td>
                    <select value={u.role} disabled={u.id === me.id} onChange={(e) => changeRole(u.id, e.target.value)} aria-label={`Role for ${u.name}`}>
                      {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td>{u.id !== me.id && <button className="btn btn-danger" onClick={() => remove(u)}>Delete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
