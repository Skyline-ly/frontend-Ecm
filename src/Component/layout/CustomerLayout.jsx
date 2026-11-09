import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { publicRequest } from "../../pages/customer/customerUtils";
import "../../pages/customer/Customer.css";

function readUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function CustomerLayout() {
  const [user, setUser] = useState(readUser);
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [navigationError, setNavigationError] = useState("");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = () => setUser(readUser());
    window.addEventListener("shopora-auth-changed", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("shopora-auth-changed", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    let active = true;
    publicRequest("/api/categories?limit=100")
      .then((categoryResponse) => {
        if (!Array.isArray(categoryResponse.data)) {
          throw new Error("The server returned an invalid category list.");
        }
        if (active) {
          setCategories(categoryResponse.data);
        }
      })
      .catch((requestError) => {
        if (active) {
          setNavigationError(requestError.message || "Unable to load categories.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshCart = () => {
      if (!sessionStorage.getItem("accessToken")) return;
      apiRequest("/api/cart")
        .then((response) => {
          if (active) {
            setCartCount(
              (response.data?.items || []).reduce(
                (total, item) => total + Number(item.quantity || 0),
                0
              )
            );
          }
        })
        .catch(() => {
          if (active) setCartCount(0);
        });
    };

    refreshCart();
    window.addEventListener("shopora-cart-changed", refreshCart);
    return () => {
      active = false;
      window.removeEventListener("shopora-cart-changed", refreshCart);
    };
  }, [user]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/?search=${encodeURIComponent(query)}` : "/");
    setMenuOpen(false);
  };

  const closeBrowseMenu = (event) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    setMenuOpen(false);
  };

  const logout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    setUser(null);
    setCartCount(0);
    window.dispatchEvent(new Event("shopora-auth-changed"));
    navigate("/", { replace: true });
  };

  const navLinks = [
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/wishlist", label: "Wishlist", icon: Heart },
    { to: "/orders", label: "Orders", icon: PackageCheck },
    { to: "/account", label: "Account", icon: UserRound },
  ];

  return (
    <div className="customer-app">
      <div className="store-announcement">
        <span>Thoughtful finds, made for everyday living.</span>
        <Link to="/?sort=newest">
          Discover what&apos;s new <ArrowRight size={14} />
        </Link>
      </div>

      <header className="store-header">
        <button
          className="store-menu-toggle"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <div className="store-header-left">
          <nav
            className={`store-browse-nav ${menuOpen ? "is-open" : ""}`}
            aria-label="Browse products"
          >
            <Link className="store-browse-home" to="/" onClick={closeBrowseMenu}>
              Home
            </Link>
            <details className="store-browse-menu">
              <summary>Category <ChevronDown size={14} /></summary>
              <div className="store-browse-dropdown">
                {categories.length ? categories.map((category) => (
                  <Link
                    key={category._id}
                    to={`/?category=${encodeURIComponent(category._id)}`}
                    onClick={closeBrowseMenu}
                  >
                    {category.name}
                  </Link>
                )) : <span>{navigationError ? "Categories unavailable" : "No categories yet"}</span>}
              </div>
            </details>
            <details className="store-browse-menu">
              <summary>All products <ChevronDown size={14} /></summary>
              <div className="store-browse-dropdown">
                <Link to="/" onClick={closeBrowseMenu}>Everything</Link>
                <Link to="/?sort=newest" onClick={closeBrowseMenu}>Latest arrivals</Link>
                <Link to="/?sort=price_asc" onClick={closeBrowseMenu}>Price: low to high</Link>
                <Link to="/?sort=price_desc" onClick={closeBrowseMenu}>Price: high to low</Link>
              </div>
            </details>
          </nav>

          <form
            className={`store-search ${menuOpen ? "is-open" : ""}`}
            onSubmit={handleSearch}
            role="search"
          >
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Search products"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>
        </div>

        <Link className="store-logo" to="/" aria-label="ShopEveryDay home">
          <span className="store-logo-mark"><ShoppingBag size={19} /></span>
          ShopEveryDay
        </Link>

        <div className={`store-header-tools ${menuOpen ? "is-open" : ""}`}>
          <nav className="store-actions" aria-label="Customer navigation">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                className="store-action-link"
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
            <Link className="store-action-link store-cart-link" to="/cart" aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`} onClick={() => setMenuOpen(false)}>
              <span className="store-cart-icon">
                <ShoppingCart size={19} strokeWidth={1.8} />
                {cartCount > 0 && <span className="store-cart-count">{cartCount}</span>}
              </span>
              <span>Cart</span>
            </Link>
            {user ? (
              <button className="store-sign-in" type="button" onClick={logout}>
                Sign out
              </button>
            ) : (
              <Link className="store-sign-in" to="/login">Sign in <ArrowRight size={15} /></Link>
            )}
          </nav>
        </div>
      </header>

      <main className="customer-main">
        <Outlet />
      </main>
    </div>
  );
}
