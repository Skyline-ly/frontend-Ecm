export default function AdminSection({ title, description }) {
  return (
    <div className="admin-section">
      <div className="dashboard-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="dashboard-panel">
        <h3>{title} Management</h3>
        <p>
          This is where you will manage {title.toLowerCase()}.
          
        </p>
      </div>
    </div>
  );
}