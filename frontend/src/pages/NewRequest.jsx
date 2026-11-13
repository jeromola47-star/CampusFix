import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useToast } from '../context/ToastContext';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function NewRequest() {
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: '', categoryId: '', location: '', priority: 'Medium', description: '' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data)).catch(() => {}); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (!form.categoryId) e.categoryId = 'Choose a category';
    if (!form.location.trim()) e.location = 'Location is required';
    if (form.description.trim().length < 10) e.description = 'Describe the problem in at least 10 characters';
    if (file && !TYPES.includes(file.type)) e.image = 'Only JPG, PNG, WEBP or GIF images are allowed';
    else if (file && file.size > 5 * 1024 * 1024) e.image = 'Image must be 5 MB or smaller';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, k === 'title' || k === 'description' || k === 'location' ? v.trim() : v));
    if (file) data.append('image', file);
    setBusy(true);
    try {
      const res = await api.post('/requests', data);
      toast('Request submitted successfully');
      navigate(`/requests/${res.data.id}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head"><div><h2>New Service Request</h2><p className="muted">Tell us what needs fixing and where.</p></div></div>
      <form className="card form-grid" onSubmit={submit} noValidate>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" value={form.title} onChange={set('title')} placeholder="e.g. Leaking pipe in bathroom" />
          {errors.title && <div className="field-error">{errors.title}</div>}
        </div>
        <div>
          <label htmlFor="categoryId">Category</label>
          <select id="categoryId" value={form.categoryId} onChange={set('categoryId')}>
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.categoryId && <div className="field-error">{errors.categoryId}</div>}
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input id="location" value={form.location} onChange={set('location')} placeholder="e.g. Hostel A, Floor 2" />
          {errors.location && <div className="field-error">{errors.location}</div>}
        </div>
        <div>
          <label htmlFor="priority">Priority</label>
          <select id="priority" value={form.priority} onChange={set('priority')}>
            {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="span-2">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={5} value={form.description} onChange={set('description')} />
          {errors.description && <div className="field-error">{errors.description}</div>}
        </div>
        <div className="span-2">
          <label htmlFor="image">Photo of the fault (optional)</label>
          <input id="image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
          {errors.image && <div className="field-error">{errors.image}</div>}
          {file && !errors.image && <img className="preview" src={URL.createObjectURL(file)} alt="Selected evidence preview" />}
        </div>
        <div className="span-2 actions">
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Submit request'}</button>
          <button className="btn btn-outline" type="button" onClick={() => navigate('/dashboard')}>Cancel</button>
        </div>
      </form>
    </>
  );
}
