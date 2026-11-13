import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RequestList from '../components/RequestList';

const TITLES = {
  student_staff: ['My Requests', 'Track the maintenance requests you have submitted.'],
  officer: ['My Assigned Jobs', 'Open a job to update its progress or mark it completed.'],
  admin: ['Administrator Dashboard', 'Monitor every request, assign officers and export reports.'],
};

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const [summary, setSummary] = useState(null);
  const [officers, setOfficers] = useState([]);

  const loadAdmin = useCallback(async () => {
    const [s, o] = await Promise.all([api.get('/reports/summary'), api.get('/users/officers')]);
    setSummary(s.data);
    setOfficers(o.data);
  }, []);

  useEffect(() => {
    if (isAdmin) loadAdmin().catch((err) => toast(errorMessage(err), 'error'));
  }, [isAdmin, loadAdmin, toast]);

  const exportCsv = async () => {
    try {
      const res = await api.get('/reports/export.csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'campusfix-requests.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV file downloaded');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const [title, subtitle] = TITLES[user.role];

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="actions">
          {isAdmin && <button className="btn btn-outline" onClick={exportCsv}>Export CSV</button>}
          {user.role !== 'officer' && <Link className="btn" to="/requests/new">New request</Link>}
        </div>
      </div>

      {isAdmin && summary && (
        <div className="stats">
          <div className="stat"><span>{summary.total}</span>Total</div>
          {Object.entries(summary.byStatus).map(([k, v]) => <div className="stat" key={k}><span>{v}</span>{k}</div>)}
        </div>
      )}

      <RequestList isAdmin={isAdmin} officers={officers} onChanged={isAdmin ? loadAdmin : undefined} />
    </>
  );
}
