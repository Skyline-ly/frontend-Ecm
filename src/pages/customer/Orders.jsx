import { useCallback, useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, PackageCheck, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { formatDate, formatMoney } from "./customerUtils";

async function fetchOrders() {
  const [result, statusResponse] = await Promise.all([
    apiRequest("/api/order/my?page=1&limit=100"),
    apiRequest("/api/order/status-options"),
  ]);
  if (!Array.isArray(result.data?.docs)) throw new Error("The server returned an invalid order list.");
  if (!Array.isArray(statusResponse.data?.customerProgress)) {
    throw new Error("The server returned invalid order progress steps.");
  }
  return {
    orders: result.data.docs,
    progressSteps: statusResponse.data.customerProgress,
  };
}

function statusClass(status) {
  return String(status || "unknown").toLowerCase().replace(/\s+/g, "-");
}

function OrderProgress({ status, steps }) {
  if (!steps.includes(status)) return null;
  const currentStep = steps.indexOf(status);

  return (
    <ol className="order-progress" aria-label={`Order progress: ${status}`}>
      {steps.map((step, index) => (
        <li
          className={`${index < currentStep ? "is-complete" : ""} ${index === currentStep ? "is-current" : ""}`}
          key={step}
        >
          <span className="order-progress-dot" />
          <span>{step === "Success" ? "Complete" : step}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Orders() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [progressSteps, setProgressSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [busyId, setBusyId] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const { orders: orderList, progressSteps: steps } = await fetchOrders();
      setError("");
      setOrders(orderList);
      setProgressSteps(steps);
    } catch (requestError) {
      setError(requestError.message || "Unable to load your orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchOrders()
      .then(({ orders: orderList, progressSteps: steps }) => {
        if (active) {
          setOrders(orderList);
          setProgressSteps(steps);
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to load your orders."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cancelOrder = async (order) => {
    setBusyId(order._id);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`/api/order/${order._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: "Cancelled by customer" }),
      });
      setNotice(result.message || "Order updated.");
      await loadOrders();
    } catch (requestError) {
      setError(requestError.message || "Unable to update this order.");
    } finally {
      setBusyId("");
    }
  };

  if (loading) return <div className="customer-state"><LoaderCircle className="spin" size={25} /> Loading your orders...</div>;

  return (
    <section className="customer-page">
      <div className="customer-page-heading">
        <div><span className="eyebrow">THE LATEST ON YOUR GOOD FINDS</span><h1>Your orders</h1><p>All your ShopEveryDay orders, together in one place.</p></div>
        <Link className="text-link" to="/">Keep exploring <ArrowRight size={15} /></Link>
      </div>
      {notice && <p className="store-notice" role="status">{notice}</p>}
      {error && <div className="store-alert" role="alert">{error}</div>}
      {orders.length === 0 ? (
        <div className="store-empty">
          <span className="empty-icon"><PackageCheck size={25} /></span>
          <h3>No orders to show yet</h3>
          <p>When you place an order, we&apos;ll keep the details right here.</p>
          <Link className="primary-button" to="/">Start exploring <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order._id}>
              <div className="order-card-top">
                <div><span className="order-number">ORDER #{String(order._id).slice(-8).toUpperCase()}</span><span className="order-date">Placed {formatDate(order.createdAt)}</span></div>
                <span className={`order-status status-${statusClass(order.status)}`}>{order.status}</span>
              </div>
              <OrderProgress status={order.status} steps={progressSteps} />
              <div className="order-items">
                {(order.items || []).map((item) => (
                  <div className="order-item" key={item._id || item.product}>
                    <div className="order-item-thumb">{item.image ? <img src={item.image} alt="" /> : <ShoppingBag size={18} />}</div>
                    <div><strong>{item.productName}</strong><span>Qty {item.quantity}{item.variantAttributes && Object.keys(item.variantAttributes).length > 0 ? ` · ${Object.values(item.variantAttributes).join(" / ")}` : ""}</span></div>
                    <strong>{formatMoney(item.subtotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="order-card-bottom">
                <span className="order-pickup">Delivery: {order.deliveryInfo?.address || order.pickupInfo?.location || "Not specified"}</span>
                <div className="order-total">Total <strong>{formatMoney(order.totalAmount)}</strong></div>
              </div>
              <div className="order-payment-details">
                <span>Payment: {order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentMethod || "Cash on delivery"}</span>
                <strong className={order.paymentStatus === "Paid" ? "payment-paid" : ""}>{order.paymentStatus || "Pending"}</strong>
                {order.deliveryInfo?.phone && <span>Phone: {order.deliveryInfo.phone}</span>}
              </div>
              {order.status === "Pending" && (
                <div className="order-actions">
                  <button type="button" className="text-button danger-text" disabled={busyId === order._id} onClick={() => cancelOrder(order)}>Cancel order</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
