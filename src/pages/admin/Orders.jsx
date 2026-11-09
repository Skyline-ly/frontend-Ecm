import { Fragment, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LoaderCircle,
  PackageOpen,
  RefreshCw,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import "./Orders.css";

const PAGE_SIZE = 20;

const statuses = [
  "",
  "Pending",
  "Paid",
  "Packing",
  "Out for Delivery",
  "Success",
  "In Transit",
  "Delivered",
  "Confirmed",
  "Processing",
  "Ready for Pickup",
  "Picked Up",
  "Completed",
  "Cancelled",
];

const nextOrderStatus = {
  Pending: "Packing",
  Packing: "Out for Delivery",
  "Out for Delivery": "Success",
  Paid: "Packing",
  "In Transit": "Delivered",
  Confirmed: "Processing",
  Processing: "Ready for Pickup",
  "Ready for Pickup": "Picked Up",
};

function formatCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
      }).format(amount)
    : "—";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function getStatusClass(status) {
  return String(status || "unknown").toLowerCase().replace(/\s+/g, "-");
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (statusFilter) params.set("status", statusFilter);

        const response = await apiRequest(
          `/api/order/admin/all?${params.toString()}`,
          { signal: controller.signal }
        );
        const pageData = response.data;

        if (!Array.isArray(pageData?.docs)) {
          throw new Error("The server returned an invalid order list.");
        }

        if (!controller.signal.aborted) {
          setOrders(pageData.docs);
          setTotalDocs(Number(pageData.totalDocs) || 0);
          setTotalPages(Math.max(1, Number(pageData.totalPages) || 1));
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load orders.");
          setOrders([]);
          setTotalDocs(0);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadOrders();
    return () => controller.abort();
  }, [page, statusFilter, reloadKey]);

  const handleStatusFilter = (event) => {
    setPage(1);
    setStatusFilter(event.target.value);
    setExpandedOrderId("");
    setNotice("");
  };

  const updateStatus = async (order, status) => {
    setError("");
    setNotice("");
    setBusyOrderId(order._id);

    try {
      const response = await apiRequest(`/api/order/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setNotice(response.message || `Order status updated to ${status}.`);
      if (orders.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to update the order.");
    } finally {
      setBusyOrderId("");
    }
  };

  const handleCancel = (order) => {
    const orderNumber = String(order._id || "").slice(-8).toUpperCase();
    if (!window.confirm(`Cancel order #${orderNumber}? This cannot be undone.`)) {
      return;
    }
    updateStatus(order, "Cancelled");
  };

  return (
    <section className="admin-section orders-admin">
      <div className="dashboard-heading">
        <div>
          <h1>Orders</h1>
          <p>Track marketplace orders and manage their fulfillment status.</p>
        </div>
        <button
          className="orders-refresh"
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "orders-spinning" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="orders-message error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="orders-message success" role="status">
          {notice}
        </div>
      )}

      <div className="dashboard-panel orders-panel">
        <div className="orders-toolbar">
          <div className="orders-result-count">
            <h2>Order list</h2>
            <p>
              {loading
                ? "Loading orders…"
                : `${totalDocs} ${totalDocs === 1 ? "order" : "orders"} found`}
            </p>
          </div>
          <label className="orders-filter">
            <span>Status</span>
            <select value={statusFilter} onChange={handleStatusFilter}>
              {statuses.map((status) => (
                <option key={status || "all"} value={status}>
                  {status || "All statuses"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="orders-state" role="status">
            <LoaderCircle size={22} className="orders-spinning" />
            <span>Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-state">
            <PackageOpen size={28} />
            <strong>No orders found</strong>
            <span>Try selecting a different status.</span>
          </div>
        ) : (
          <div className="orders-table-wrap">
            <table className="admin-table orders-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Items</th>
                  <th scope="col">Total</th>
                  <th scope="col">Placed</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const orderId = String(order._id || "");
                  const orderNumber = orderId.slice(-8).toUpperCase();
                  const itemCount = Array.isArray(order.items)
                    ? order.items.reduce(
                        (count, item) => count + (Number(item.quantity) || 0),
                        0
                      )
                    : 0;
                  const nextStatus = nextOrderStatus[order.status];
                  const isExpanded = expandedOrderId === orderId;
                  const isBusy = busyOrderId === orderId;

                  return (
                    <Fragment key={orderId}>
                      <tr>
                        <td>
                          <strong className="orders-order-number">
                            #{orderNumber || "—"}
                          </strong>
                        </td>
                        <td>
                          <div className="orders-customer-cell">
                            <strong>{order.customer?.name || "Customer"}</strong>
                            {order.customer?.email && (
                              <span>{order.customer.email}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </td>
                        <td>
                          <strong>{formatCurrency(order.totalAmount)}</strong>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <span
                            className={`order-status ${getStatusClass(order.status)}`}
                          >
                            {order.status || "Unknown"}
                          </span>
                        </td>
                        <td>
                          <div className="orders-actions">
                            <button
                              className="orders-details-button"
                              type="button"
                              onClick={() =>
                                setExpandedOrderId(isExpanded ? "" : orderId)
                              }
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? "Hide" : "Show"} details for order ${orderNumber}`}
                            >
                              {isExpanded ? (
                                <ChevronUp size={15} />
                              ) : (
                                <ChevronDown size={15} />
                              )}
                              Details
                            </button>
                            {nextStatus && (
                              <button
                                className="orders-advance-button"
                                type="button"
                                onClick={() => updateStatus(order, nextStatus)}
                                disabled={Boolean(busyOrderId)}
                              >
                                {isBusy
                                  ? "Updating…"
                                  : nextStatus === "Success"
                                    ? "Confirm delivered & COD paid"
                                    : nextStatus === "Out for Delivery"
                                      ? "Send for delivery"
                                      : order.status === "Pending"
                                        ? "Accept order"
                                        : `Mark ${nextStatus}`}
                              </button>
                            )}
                            {order.status === "Pending" && (
                              <button
                                className="orders-cancel-button"
                                type="button"
                                onClick={() => handleCancel(order)}
                                disabled={Boolean(busyOrderId)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${orderId}-details`} className="orders-details-row">
                          <td colSpan="7">
                            <div className="orders-details">
                              <div className="orders-details-items">
                                <h3>Items</h3>
                                {order.items?.length ? (
                                  <ul>
                                    {order.items.map((item) => (
                                      <li key={item._id || item.productName}>
                                        {item.image && (
                                          <img src={item.image} alt="" loading="lazy" />
                                        )}
                                        <span className="orders-detail-product">
                                          <strong>{item.productName || "Product"}</strong>
                                          {item.variantAttributes &&
                                            Object.entries(item.variantAttributes).length >
                                              0 && (
                                              <small>
                                                {Object.entries(item.variantAttributes)
                                                  .map(([name, value]) => `${name}: ${value}`)
                                                  .join(" · ")}
                                              </small>
                                            )}
                                          <small>
                                            Qty {item.quantity} × {formatCurrency(item.price)}
                                          </small>
                                        </span>
                                        <strong>{formatCurrency(item.subtotal)}</strong>
                                        <span className="orders-detail-seller">
                                          {item.seller?.name || item.seller?.email || ""}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p>No item details available.</p>
                                )}
                              </div>
                              <div className="orders-pickup-details">
                                <h3>Delivery information</h3>
                                <p>
                                  <strong>Address:</strong>{" "}
                                  {order.deliveryInfo?.address || order.pickupInfo?.location || "Not specified"}
                                </p>
                                {order.deliveryInfo?.phone && (
                                  <p><strong>Phone:</strong> {order.deliveryInfo.phone}</p>
                                )}
                                {order.deliveryInfo?.note && (
                                  <p>
                                    <strong>Note:</strong> {order.deliveryInfo.note}
                                  </p>
                                )}
                                {order.cancellationReason && (
                                  <p>
                                    <strong>Cancellation reason:</strong>{" "}
                                    {order.cancellationReason}
                                  </p>
                                )}
                                {order.cancelledAt && (
                                  <p>
                                    <strong>Cancelled:</strong>{" "}
                                    {formatDate(order.cancelledAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="orders-pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          <div>
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={loading || page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={loading || page >= totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
