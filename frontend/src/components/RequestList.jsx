import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import StatusBadge from './StatusBadge';
import { useToast } from '../context/ToastContext';

const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Completed'];

// Searchable, filterable, paginated list of requests. Admins can assign officers inline.
export default function RequestList({ isAdmin = false, officers = [], onChanged, refreshKey = 0 }) {
  const toast = useToast();
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', category: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ data: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data)).catch(() => {}); }, []);

  // wait briefly after typing before searching
  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => ({ ...f, search })); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 8, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const { data } = await api.get('/requests', { params });
      setResult(data);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const setFilter = (key) => (e) => { setFilters((f) => ({ ...f, [key]: e.target.value })); setPage(1); };

  const assign = async (id, officerId) => {
    if (!officerId) return;
    try {
      const { data } = await api.patch(`/requests/${id}/assign`, { officerId: Number(officerId) });
      toast(data.message);
      await load();
      onChanged && onChanged();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="card">
      <div className="filters">
        <input type="search" placeholder="Search title, description or location" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search requests" />
        <select value={filters.status} onChange={setFilter('status')} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={setFilter('priority')} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={filters.category} onChange={setFilter('category')} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Title</th><th>Category</th><th>Location</th><th>Priority</th><th>Status</th>
              {isAdmin && <th>Requester</th>}
              <th>{isAdmin ? 'Assigned officer' : 'Officer'}</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="muted">Loading...</td></tr>}
            {!loading && result.data.length === 0 && <tr><td colSpan={9} className="muted">No requests found.</td></tr>}
            {!loading && result.data.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td><Link to={`/requests/${r.id}`}>{r.title}</Link></td>
                <td>{r.Category?.name}</td>
                <td>{r.location}</td>
                <td><span className={`prio prio-${r.priority.toLowerCase()}`}>{r.priority}</span></td>
                <td><StatusBadge status={r.status} /></td>
                {isAdmin && <td>{r.requester?.name}</td>}
                <td>
                  {isAdmin && r.status !== 'Completed' ? (
                    <select value={r.Assignment?.officerId || ''} onChange={(e) => assign(r.id, e.target.value)} aria-label={`Assign officer to request ${r.id}`}>
                      <option value="">Assign...</option>
                      {officers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  ) : (r.Assignment?.officer?.name || <span className="muted">Not assigned</span>)}
                </td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {result.page || page} of {result.pages} ({result.total} requests)</span>
        <button className="btn btn-outline" disabled={page >= result.pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
