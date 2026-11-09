import { useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  ShoppingBag,
  X,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./SellerLayout.css";

const navigation = [
  { label: "Overview", to: "/seller", icon: LayoutDashboard, end: true },
  { label: "Products", to: "/seller/products", icon: Package },
  { label: "Orders", to: "/seller/orders", icon: ShoppingBag },
  { label: "Messages", to: "/seller/messages", icon: MessageCircle },
];

function getSellerName() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.name || user.username || "Seller";
  } catch {
    return "Seller";
  }
}

export default function SellerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const sellerName = getSellerName();

  const logout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    window.dispatchEvent(new Event("shopora-auth-changed"));
    navigate("/login", { replace: true });
  };

  return (
    <div className="seller-layout">
      {sidebarOpen && (
        <button
          className="seller-overlay"
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`seller-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="seller-brand">
          <span className="seller-brand-icon">
            <ShoppingBag size={20} />
          </span>
          <span>ShopEveryDay</span>
          <button
            className="seller-close"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <p className="seller-nav-heading">SELLER WORKSPACE</p>
        <nav className="seller-nav" aria-label="Seller navigation">
          {navigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              className={({ isActive }) =>
                `seller-nav-link ${isActive ? "is-active" : ""}`
              }
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="seller-sidebar-bottom">
          <div className="seller-profile">
            <span className="seller-avatar">
              {sellerName.charAt(0).toUpperCase()}
            </span>
            <span className="seller-profile-copy">
              <strong>{sellerName}</strong>
              <small>Seller account</small>
            </span>
          </div>
          <button className="seller-logout" type="button" onClick={logout}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="seller-main">
        <header className="seller-topbar">
          <button
            className="seller-menu-button"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div>
            <p className="seller-topbar-eyebrow">Seller workspace</p>
            <h1>ShopEveryDay Seller</h1>
          </div>
          <div className="seller-topbar-user">
            <span className="seller-avatar">
              {sellerName.charAt(0).toUpperCase()}
            </span>
            <span>{sellerName}</span>
          </div>
        </header>
        <main className="seller-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
