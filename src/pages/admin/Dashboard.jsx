import {
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import "./Dashboard.css";

const countFrom = (value, label) => {
  if (!Number.isFinite(value)) {
    throw new Error(`The server returned an invalid ${label} count.`);
  }
  return value;
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(amount) || 0);

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const options = { signal: controller.signal };
        const [
          usersResponse,
          sellersResponse,
          productsResponse,
          ordersResponse,
          pendingSellersResponse,
          pendingProductsResponse,
          completedOrdersResponse,
        ] = await Promise.all([
          apiRequest("/api/user/search?page=1&limit=1", options),
          apiRequest("/api/user/search?role=seller&page=1&limit=1", options),
          apiRequest("/api/product/admin/all?page=1&limit=1", options),
          apiRequest("/api/order/admin/all?page=1&limit=5", options),
          apiRequest(
            "/api/user/search?role=customer&sellerStatus=pending&page=1&limit=1",
            options
          ),
          apiRequest("/api/product/admin/pending?page=1&limit=1", options),
          apiRequest(
            "/api/order/admin/all?status=Success&page=1&limit=1",
            options
          ),
        ]);

        if (controller.signal.aborted) return;

        const recentOrders = ordersResponse.data?.docs;
        if (!Array.isArray(recentOrders)) {
          throw new Error("The server returned an invalid recent orders list.");
        }

        setDashboard({
          users: countFrom(usersResponse.data?.totalDocs, "user"),
          sellers: countFrom(sellersResponse.data?.totalDocs, "seller"),
          products: countFrom(productsResponse.pagination?.totalDocs, "product"),
          orders: countFrom(ordersResponse.data?.totalDocs, "order"),
          pendingSellers: countFrom(
            pendingSellersResponse.data?.totalDocs,
            "pending seller"
          ),
          pendingProducts: countFrom(
            pendingProductsResponse.pagination?.totalDocs,
            "pending product"
          ),
          completedOrders: countFrom(
            completedOrdersResponse.data?.totalDocs,
            "completed order"
          ),
          recentOrders,
        });
        setError("");
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load the dashboard.");
          setDashboard(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => controller.abort();
  }, [reloadKey]);

  const stats = dashboard
    ? [
        {
          title: "Total Users",
          value: dashboard.users,
          icon: Users,
          color: "blue",
          to: "/admin/users",
        },
        {
          title: "Total Sellers",
          value: dashboard.sellers,
          icon: Store,
          color: "purple",
          to: "/admin/sellers",
        },
        {
          title: "Total Products",
          value: dashboard.products,
          icon: Package,
          color: "orange",
          to: "/admin/products",
        },
        {
          title: "Total Orders",
          value: dashboard.orders,
          icon: ShoppingCart,
          color: "green",
          to: "/admin/orders",
        },
      ]
    : [];

  const refresh = () => {
    setError("");
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back! Here is what&apos;s happening in your marketplace.</p>
        </div>
        <button
          className="dashboard-refresh"
          type="button"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spinning" : ""} />
          {loading ? "Loading" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="dashboard-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <Link to="/login">Sign in</Link>
        </div>
      )}

      {dashboard && (
        <>
          <div className="dashboard-stats">
            {stats.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="stat-card"
                  key={item.title}
                  to={item.to}
                >
                  <div className={`stat-icon ${item.color}`}>
                    <Icon size={23} />
                  </div>
                  <div>
                    <p>{item.title}</p>
                    <h2>{item.value.toLocaleString()}</h2>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-panel orders-panel">
              <div className="panel-heading">
                <h3>Recent Orders</h3>
                <span>Latest transactions</span>
              </div>

              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentOrders.length ? (
                      dashboard.recentOrders.map((order) => {
                        const status = String(order.status || "Unknown");
                        const orderId = String(order._id || "");

                        return (
                          <tr key={orderId}>
                            <td>#{orderId.slice(-8).toUpperCase()}</td>
                            <td>{order.customer?.name || "Customer"}</td>
                            <td>{formatCurrency(order.totalAmount)}</td>
                            <td>
                              <span
                                className={`order-status ${status
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")}`}
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="dashboard-empty">
                          No orders yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="panel-heading">
                <h3>Marketplace Summary</h3>
                <span>Overview</span>
              </div>

              <div className="summary-item">
                <div className="summary-icon pending">
                  <Clock size={20} />
                </div>
                <div>
                  <strong>{dashboard.pendingSellers.toLocaleString()}</strong>
                  <p>Pending seller approvals</p>
                </div>
              </div>

              <div className="summary-item">
                <div className="summary-icon completed">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <strong>{dashboard.completedOrders.toLocaleString()}</strong>
                  <p>Successful orders</p>
                </div>
              </div>

              <div className="summary-item">
                <div className="summary-icon pending">
                  <Package size={20} />
                </div>
                <div>
                  <strong>{dashboard.pendingProducts.toLocaleString()}</strong>
                  <p>Products waiting for review</p>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {loading && !dashboard && (
        <div className="dashboard-loading" role="status">
          Loading marketplace data…
        </div>
      )}
    </div>
  );
}
