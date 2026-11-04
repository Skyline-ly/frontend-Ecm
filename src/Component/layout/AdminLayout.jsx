import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../admin/AdminSidebar";
import AdminTopbar from "../admin/AdminTopbar";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="admin-main">
        <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}