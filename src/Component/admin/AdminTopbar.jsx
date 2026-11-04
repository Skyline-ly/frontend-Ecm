import { Menu, Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageNames = {
  "/admin": "Dashboard",
  "/admin/users": "Users",
  "/admin/sellers": "Sellers",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/subcategories": "Subcategories",
  "/admin/brands": "Brands",
  "/admin/attributes": "Attributes",
  "/admin/orders": "Orders",
  "/admin/reviews": "Reviews",
  "/admin/settings": "Settings",
};

export default function AdminTopbar({ onMenuClick }) {
  const location = useLocation();
  const pageTitle = pageNames[location.pathname] || "Admin";

  let user;
  try {
    user = JSON.parse(sessionStorage.getItem("user") || "{}");
  } catch {
    user = {};
  }

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <button className="menu-button" onClick={onMenuClick}>
          <Menu size={23} />
        </button>

        <div>
          <h2>{pageTitle}</h2>
          <p>Manage your marketplace</p>
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-icon" aria-label="Search">
          <Search size={20} />
        </button>

        <button className="topbar-icon" aria-label="Notifications">
          <Bell size={20} />
        </button>

        <div className="admin-user">
          <div className="admin-avatar">
            {(user.name || user.username || "A").charAt(0).toUpperCase()}
          </div>
          <div className="admin-user-info">
            <strong>{user.name || user.username || "Admin"}</strong>
            <span>Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}