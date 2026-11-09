import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import "./Dashboard.css";

const currencyFormat = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});
const numberFormat = new Intl.NumberFormat();

function formatCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? currencyFormat.format(amount) : "—";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function getStock(product) {
  if (Array.isArray(product.variants) && product.variants.length) {
    return product.variants.reduce(
      (total, variant) => total + (Number(variant.stock) || 0),
      0
    );
  }
  return Number(product.stock) || 0;
}

function getStatusClass(status = "") {
  return String(status).toLowerCase().replace(/\s+/g, "-");
}

function requireCount(value, label) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) {
    throw new Error(`The server returned an invalid ${label}.`);
  }
  return count;
}

function SalesChart({ products }) {
  const maxSales = Math.max(
    0,
    ...products.map((product) => Number(product.grossSales) || 0)
  );

  return (
    <section className="seller-panel" id="seller-sales">
      <div className="seller-panel-heading">
        <div>
          <h2>Sales performance</h2>
          <p>Top products by gross sales</p>
        </div>
        <Wallet size={18} />
      </div>
      {products.length ? (
        <div className="seller-chart">
          {products.slice(0, 6).map((product, index) => {
            const grossSales = Number(product.grossSales) || 0;
            const percent =
              maxSales > 0 ? Math.max((grossSales / maxSales) * 100, 3) : 0;
            return (
              <div className="seller-chart-row" key={product.productId || index}>
                <div className="seller-chart-label">
                  <span title={product.productName}>{product.productName}</span>
                  <strong>{formatCurrency(grossSales)}</strong>
                </div>
                <div
                  className="seller-chart-track"
                  role="img"
                  aria-label={`${product.productName}: ${formatCurrency(grossSales)}`}
                >
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="seller-chart-empty">
          <Package size={24} />
          <p>Your product sales will appear here.</p>
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const options = { signal: controller.signal };
        const [salesResponse, ordersResponse, productsResponse] =
          await Promise.all([
            apiRequest("/api/order/seller/sales?page=1&limit=6", options),
            apiRequest("/api/order/seller?page=1&limit=5", options),
            apiRequest("/api/product/mine?page=1&limit=100", options),
          ]);

        if (!Array.isArray(salesResponse.data)) {
          throw new Error("The server returned an invalid sales report.");
        }
        if (!Array.isArray(ordersResponse.data?.docs)) {
          throw new Error("The server returned an invalid order list.");
        }
        if (!Array.isArray(productsResponse.data)) {
          throw new Error("The server returned an invalid product list.");
        }

        if (!controller.signal.aborted) {
          setData({
            sales: salesResponse.data,
            orders: ordersResponse.data.docs,
            products: productsResponse.data,
            revenue: requireCount(
              salesResponse.summary?.grossSales,
              "gross sales total"
            ),
            orderCount: requireCount(
              salesResponse.summary?.orderCount,
              "sales order count"
            ),
            unitsSold: requireCount(
              salesResponse.summary?.unitsSold,
              "units sold"
            ),
            productCount: requireCount(
              productsResponse.pagination?.totalDocs,
              "product count"
            ),
            productPages: requireCount(
              productsResponse.pagination?.totalPages,
              "product page count"
            ),
          });
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(requestError.message || "Unable to load your dashboard.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDashboard();
    return () => controller.abort();
  }, [reloadKey]);

  const refresh = () => {
    setError("");
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const lowStock = (data?.products || [])
    .filter(
      (product) =>
        product.approvalStatus === "approved" && getStock(product) <= 5
    )
    .slice(0, 5);

  return (
    <section className="seller-dashboard">
      <div className="seller-page-heading">
        <div>
          <p className="seller-eyebrow">STORE OVERVIEW</p>
          <h2>Your business at a glance</h2>
          <p>Track sales, fulfill orders, and keep an eye on your inventory.</p>
        </div>
        <button
          className="seller-button seller-secondary-button"
          type="button"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "seller-spinning" : ""} />
          {loading ? "Loading" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="seller-alert seller-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={refresh}>Try again</button>
        </div>
      )}

      {loading && !data ? (
        <div className="seller-state" role="status">
          <RefreshCw size={20} className="seller-spinning" />
          <span>Loading your store data…</span>
        </div>
      ) : data ? (
        <>
          <div className="seller-stat-grid">
            {[
              {
                title: "Gross sales",
                value: formatCurrency(data.revenue),
                detail: "Paid and fulfillment-stage items",
                icon: Wallet,
                tone: "violet",
              },
              {
                title: "Sales orders",
                value: numberFormat.format(data.orderCount),
                detail: "Orders with a recorded sale",
                icon: ShoppingBag,
                tone: "blue",
              },
              {
                title: "Units sold",
                value: numberFormat.format(data.unitsSold),
                detail: "Across all your sold products",
                icon: CheckCircle2,
                tone: "green",
              },
              {
                title: "Active listings",
                value: numberFormat.format(data.productCount),
                detail: "Products not archived",
                icon: Package,
                tone: "orange",
              },
            ].map(({ title, value, detail, icon: Icon, tone }) => (
              <article className="seller-stat-card" key={title}>
                <span className={`seller-stat-icon ${tone}`}>
                  <Icon size={20} />
                </span>
                <div>
                  <p>{title}</p>
                  <strong>{value}</strong>
                  <small>{detail}</small>
                </div>
              </article>
            ))}
          </div>

          <div className="seller-dashboard-grid">
            <SalesChart products={data.sales} />

            <section className="seller-panel" id="seller-inventory">
              <div className="seller-panel-heading">
                <div>
                  <h2>Inventory watch</h2>
                  <p>Approved items with 5 or fewer units</p>
                </div>
                <Package size={18} />
              </div>
              {lowStock.length ? (
                <ul className="seller-inventory-list">
                  {lowStock.map((product) => {
                    const stock = getStock(product);
                    return (
                      <li key={product._id}>
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {product.variants?.length
                              ? `${product.variants.length} variants`
                              : "Single-item listing"}
                          </small>
                        </span>
                        <b className={stock === 0 ? "is-out-of-stock" : ""}>
                          {stock === 0 ? "Out of stock" : `${stock} left`}
                        </b>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="seller-empty-compact">
                  <CheckCircle2 size={22} />
                  <p>No low-stock listings need attention.</p>
                </div>
              )}
            </section>
          </div>

          <section className="seller-panel seller-recent-orders" id="seller-orders">
            <div className="seller-panel-heading">
              <div>
                <h2>Recent orders</h2>
                <p>The latest orders containing your products</p>
              </div>
              <Link to="/seller/orders">View all orders</Link>
            </div>
            {data.orders.length ? (
              <div className="seller-table-wrap">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Your total</th>
                      <th>Status</th>
                      <th>Placed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order._id}>
                        <td className="seller-order-id">
                          #{String(order._id).slice(-8).toUpperCase()}
                        </td>
                        <td>{order.customer?.name || "Customer"}</td>
                        <td>
                          {(order.items || []).reduce(
                            (total, item) =>
                              total + (Number(item.quantity) || 0),
                            0
                          )}
                        </td>
                        <td>{formatCurrency(order.sellerSubtotal)}</td>
                        <td>
                          <span
                            className={`seller-status ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {order.status || "Unknown"}
                          </span>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="seller-empty-compact">
                <Clock3 size={22} />
                <p>Orders containing your products will appear here.</p>
              </div>
            )}
          </section>

          {data.productPages > 1 && (
            <p className="seller-data-note">
              Inventory watch shows the first 100 active listings.{" "}
              <Link to="/seller/products">View all products</Link>
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}