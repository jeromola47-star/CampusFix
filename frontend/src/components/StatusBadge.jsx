export default function StatusBadge({ status }) {
  const cls = String(status).toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-${cls}`}>{status}</span>;
}
