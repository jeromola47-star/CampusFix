import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { API_ROOT, errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';

const ALL_STATUSES = ['Pending', 'Assigned', 'In Progress', 'Completed'];

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [error, setError] = useState('');
  const [officers, setOfficers] = useState([]);
  const [statusForm, setStatusForm] = useState({ status: '', comment: '' });
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({});

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/requests/${id}`);
      setReq(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load this request'));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (user.role === 'admin') api.get('/users/officers').then((r) => setOfficers(r.data)).catch(() => {});
  }, [user.role]);

  if (error) return <div className="card"><p className="field-error">{error}</p><Link to="/dashboard">Back to dashboard</Link></div>;
  if (!req) return <p className="muted">Loading...</p>;

  const isAdmin = user.role === 'admin';
  const isAssignedOfficer = user.role === 'officer' && req.Assignment?.officerId === user.id;
  const isOwner = req.userId === user.id;
  const canUpdateStatus = isAdmin || isAssignedOfficer;
  const canEdit = isAdmin || (isOwner && req.status === 'Pending');
  const statusOptions = (isAdmin ? ALL_STATUSES : ['In Progress', 'Completed']).filter((s) => s !== req.status);

  const run = async (fn, okMessage) => {
    try {
      await fn();
      toast(okMessage);
      await load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const updateStatus = (e) => {
    e.preventDefault();
    const status = statusForm.status || statusOptions[0];
    run(() => api.patch(`/requests/${id}/status`, { status, comment: statusForm.comment }), `Status updated to ${status}`)
      .then(() => setStatusForm({ status: '', comment: '' }));
  };

  const saveEdit = (e) => {
    e.preventDefault();
    run(() => api.put(`/requests/${id}`, edit), 'Request updated').then(() => setEditing(false));
  };

  const remove = async () => {
    if (!window.confirm('Delete this request permanently?')) return;
    try {
      await api.delete(`/requests/${id}`);
      toast('Request deleted');
      navigate('/dashboard');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2>#{req.id} {req.title}</h2>
          <p className="muted">Submitted by {req.requester?.name} on {new Date(req.createdAt).toLocaleString()}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="detail-grid">
        <div className="card">
          <h3>Details</h3>
          {editing ? (
            <form onSubmit={saveEdit} className="stack">
              <label htmlFor="e-title">Title</label>
              <input id="e-title" defaultValue={req.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              <label htmlFor="e-location">Location</label>
              <input id="e-location" defaultValue={req.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
              <label htmlFor="e-priority">Priority</label>
              <select id="e-priority" defaultValue={req.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })}>
                {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
              </select>
              <label htmlFor="e-desc">Description</label>
              <textarea id="e-desc" rows={4} defaultValue={req.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <div className="actions">
                <button className="btn" type="submit">Save changes</button>
                <button className="btn btn-outline" type="button" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <dl className="facts">
              <dt>Category</dt><dd>{req.Category?.name}</dd>
              <dt>Location</dt><dd>{req.location}</dd>
              <dt>Priority</dt><dd>{req.priority}</dd>
              <dt>Assigned officer</dt><dd>{req.Assignment?.officer?.name || 'Not assigned yet'}</dd>
              <dt>Description</dt><dd>{req.description}</dd>
            </dl>
          )}
          {req.imageUrl && <img className="evidence" src={`${API_ROOT}${req.imageUrl}`} alt="Evidence of the fault" />}
          {!editing && (
            <div className="actions">
              {canEdit && <button className="btn btn-outline" onClick={() => { setEdit({}); setEditing(true); }}>Edit request</button>}
              {isAdmin && <button className="btn btn-danger" onClick={remove}>Delete</button>}
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <h3>Status timeline</h3>
            <ol className="timeline">
              {req.logs.map((l) => (
                <li key={l.id}>
                  <StatusBadge status={l.newStatus} />
                  <div>
                    {l.comment && <div>{l.comment}</div>}
                    <small className="muted">{l.changedBy?.name} - {new Date(l.createdAt).toLocaleString()}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {isAdmin && req.status !== 'Completed' && (
            <div className="card">
              <h3>Assign officer</h3>
              <select defaultValue="" onChange={(e) => e.target.value && run(() => api.patch(`/requests/${id}/assign`, { officerId: Number(e.target.value) }), 'Officer assigned')} aria-label="Assign officer">
                <option value="">Choose an officer</option>
                {officers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}

          {canUpdateStatus && (
            <form className="card stack" onSubmit={updateStatus}>
              <h3>Update progress</h3>
              <label htmlFor="status">New status</label>
              <select id="status" value={statusForm.status || statusOptions[0]} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s}>{s}</option>)}
              </select>
              <label htmlFor="comment">Comment (optional)</label>
              <input id="comment" value={statusForm.comment} onChange={(e) => setStatusForm({ ...statusForm, comment: e.target.value })} placeholder="e.g. Replaced the pipe" />
              <button className="btn" type="submit">Update status</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
