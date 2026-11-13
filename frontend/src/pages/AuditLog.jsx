import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import { useToast } from '../context/ToastContext';

export default function AuditLog() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], pages: 1, total: 0 });

  useEffect(() => {
    api.get('/reports/audit', { params: { page, limit: 12 } }).then((r) => setResult(r.data)).catch((err) => toast(errorMessage(err), 'error'));
  }, [page, toast]);

  return (
    <>
      <div className="page-head"><div><h2>Audit Log</h2><p className="muted">Every important action recorded by the system.</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>
              {result.data.length === 0 && <tr><td colSpan={5} className="muted">No activity yet.</td></tr>}
              {result.data.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>{a.User?.name || 'Deleted user'}</td>
                  <td><code>{a.action}</code></td>
                  <td>{a.entity}{a.entityId ? ` #${a.entityId}` : ''}</td>
                  <td>{a.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {result.pages}</span>
          <button className="btn btn-outline" disabled={page >= result.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </>
  );
}
