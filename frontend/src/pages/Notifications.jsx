import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api';
import { useToast } from '../context/ToastContext';

export default function Notifications() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.data);
      setUnread(data.unread);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const markOne = async (id) => { await api.patch(`/notifications/${id}/read`).catch(() => {}); load(); };
  const markAll = async () => {
    try { await api.patch('/notifications/read-all'); toast('All notifications marked as read'); load(); }
    catch (err) { toast(errorMessage(err), 'error'); }
  };

  return (
    <>
      <div className="page-head">
        <div><h2>Notifications</h2><p className="muted">{unread} unread</p></div>
        <button className="btn btn-outline" onClick={markAll} disabled={!unread}>Mark all as read</button>
      </div>
      <div className="card">
        {loading && <p className="muted">Loading...</p>}
        {!loading && items.length === 0 && <p className="muted">You have no notifications yet.</p>}
        <ul className="notes">
          {items.map((n) => (
            <li key={n.id} className={n.isRead ? 'read' : 'unread'}>
              <div>
                <div>{n.message}</div>
                <small className="muted">{new Date(n.createdAt).toLocaleString()}</small>
              </div>
              {!n.isRead && <button className="btn btn-outline" onClick={() => markOne(n.id)}>Mark read</button>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
