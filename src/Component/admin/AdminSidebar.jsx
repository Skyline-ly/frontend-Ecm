import {
  LayoutDashboard,
  ListTree,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store,
  Tags,
  UserRound,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const menuItems = [
  { title: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { title: "Users", path: "/admin/users", icon: UserRound },
  { title: "Sellers", path: "/admin/sellers", icon: Store },
  { title: "Products", path: "/admin/products", icon: Package },
  { title: "Categories", path: "/admin/categories", icon: Tags },
  { title: "Subcategories", path: "/admin/subcategories", icon: ListTree },
  { title: "Brands", path: "/admin/brands", icon: ShoppingBag },
  { title: "Attributes", path: "/admin/attributes", icon: SlidersHorizontal },
  { title: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { title: "Reviews", path: "/admin/reviews", icon: Star },
  { title: "Settings", path: "/admin/settings", icon: Settings },
];

export default function AdminSidebar({ open, onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    window.dispatchEvent(new Event("shopora-auth-changed"));
    navigate("/login", { replace: true });
  };

  return (
    <>
      {open && (
        <div className="admin-overlay" onClick={onClose} />
      )}

      <aside className={`admin-sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="admin-logo">
          <div className="admin-logo-icon">
            <ShoppingBag size={23} />
          </div>
          <span>ShopEveryDay</span>
          <button
            className="sidebar-close"
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-title">MAIN MENU</div>

        <nav className="admin-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `admin-nav-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="admin-logout" type="button" onClick={handleLogout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
