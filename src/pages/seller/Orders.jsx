import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  LoaderCircle,
  PackageOpen,
  RefreshCw,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import DateRangeFilter from "../../Component/shared/DateRangeFilter";
import "./SellerPages.css";

const PAGE_SIZE = 10;

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

function statusClass(status = "") {
  return String(status).toLowerCase().replace(/\s+/g, "-");
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([""]);
  const [statusTransitions, setStatusTransitions] = useState({});
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        const [response, statusResponse] = await Promise.all([
          apiRequest(`/api/order/seller?${params.toString()}`, {
            signal: controller.signal,
          }),
          apiRequest("/api/order/status-options", {
            signal: controller.signal,
          }),
        ]);
        const pageData = response.data;

        if (!Array.isArray(pageData?.docs)) {
          throw new Error("The server returned an invalid seller order list.");
        }
        if (
          !Array.isArray(statusResponse.data?.statuses) ||
          !statusResponse.data?.transitions ||
          typeof statusResponse.data.transitions !== "object"
        ) {
          throw new Error("The server returned invalid order status options.");
        }

        if (!controller.signal.aborted) {
          setOrders(pageData.docs);
          setStatuses(["", ...statusResponse.data.statuses]);
          setStatusTransitions(statusResponse.data.transitions);
          setTotalDocs(Number(pageData.totalDocs) || 0);
          setTotalPages(Math.max(1, Number(pageData.totalPages) || 1));
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load your orders.");
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
  }, [page, statusFilter, fromDate, toDate, reloadKey]);

  const handleDateFilter = (startDate, endDate) => {
    setPage(1);
    setFromDate(startDate);
    setToDate(endDate);
    setExpandedOrderId("");
  };

  const updateOrder = async (order, status) => {
    setError("");
    setNotice("");
    setBusyOrderId(order._id);
    try {
      const response = await apiRequest(`/api/order/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setNotice(response.message || `Order updated to ${status}.`);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || "Unable to update this order.");
    } finally {
      setBusyOrderId("");
    }
  };

  return (
    <section className="seller-page">
      <div className="seller-page-heading">
        <div>
          <p className="seller-eyebrow">FULFILLMENT</p>
          <h2>Orders</h2>
          <p>Review orders containing your products and advance fulfillment.</p>
        </div>
        <button
          className="seller-button"
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "seller-spinning" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="seller-alert seller-alert-error" role="alert">{error}</div>}
      {notice && <div className="seller-alert seller-alert-success" role="status">{notice}</div>}

      <section className="seller-panel seller-list-panel">
        <div className="seller-toolbar">
          <div>
            <h3>Order list</h3>
            <p>{loading ? "Loading orders…" : `${totalDocs} ${totalDocs === 1 ? "order" : "orders"}`}</p>
          </div>
          <label className="seller-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
                setNotice("");
                setExpandedOrderId("");
              }}
            >
              {statuses.map((status) => (
                <option key={status || "all"} value={status}>
                  {status || "All statuses"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onApply={handleDateFilter}
        />

        {loading ? (
          <div className="seller-table-state" role="status">
            <LoaderCircle size={23} className="seller-spinning" />
            <span>Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="seller-table-state">
            <PackageOpen size={28} />
            <strong>No orders found</strong>
            <span>Orders containing your products will show up here.</span>
          </div>
        ) : (
          <div className="seller-table-wrap">
            <table className="seller-data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Your total</th>
                  <th>Placed</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const id = String(order._id);
                  const itemCount = (order.items || []).reduce(
                    (total, item) => total + (Number(item.quantity) || 0),
                    0
                  );
                  const isExpanded = expandedOrderId === id;
                  const next = statusTransitions[order.status];

                  return (
                    <Fragment key={id}>
                      <tr>
                        <td className="seller-order-number">
                          #{id.slice(-8).toUpperCase()}
                        </td>
                        <td>{order.customer?.name || "Customer"}</td>
                        <td>{itemCount}</td>
                        <td>{formatCurrency(order.sellerSubtotal)}</td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <span className={`seller-status ${statusClass(order.status)}`}>
                            {order.status || "Unknown"}
                          </span>
                        </td>
                        <td>
                          <div className="seller-order-actions">
                            <button
                              className="seller-details-button"
                              type="button"
                              aria-expanded={isExpanded}
                              onClick={() => setExpandedOrderId(isExpanded ? "" : id)}
                            >
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              Details
                            </button>
                            {next && (
                              <button
                                className="seller-advance-button"
                                type="button"
                                disabled={Boolean(busyOrderId)}
                                onClick={() => updateOrder(order, next)}
                              >
                                {busyOrderId === id
                                  ? "Updating…"
                                  : next === "Success"
                                    ? "Confirm delivered & COD paid"
                                    : next === "Out for Delivery"
                                      ? "Send for delivery"
                                      : order.status === "Pending"
                                        ? "Accept order"
                                        : `Mark ${next}`}
                              </button>
                            )}
                            {!["Pending", "Cancelled"].includes(order.status) && (
                              <Link className="seller-details-button" to={`/seller/orders/${id}/invoice`}>
                                Invoice
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="seller-expanded-row">
                          <td colSpan="7">
                            <div className="seller-order-detail-grid">
                              <div>
                                <h4>Your items in this order</h4>
                                <ul className="seller-order-items">
                                  {(order.items || []).map((item) => (
                                    <li key={item._id || `${item.productName}-${item.variantId}`}>
                                      {item.image && <img src={item.image} alt="" />}
                                      <span>
                                        <strong>{item.productName}</strong>
                                        {item.variantAttributes &&
                                          Object.entries(item.variantAttributes).length > 0 && (
                                            <small>
                                              {Object.entries(item.variantAttributes)
                                                .map(([name, value]) => `${name}: ${value}`)
                                                .join(" · ")}
                                            </small>
                                          )}
                                        <small>
                                          {item.quantity} × {formatCurrency(item.price)}
                                        </small>
                                      </span>
                                      <b>{formatCurrency(item.subtotal)}</b>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4>Delivery information</h4>
                                <p><strong>Address:</strong> {order.deliveryInfo?.address || order.pickupInfo?.location || "Not specified"}</p>
                                <p><strong>Phone:</strong> {order.deliveryInfo?.phone || order.customer?.phone || "Not provided"}</p>
                                <p><strong>Customer:</strong> {order.deliveryInfo?.name || order.customer?.name || "Customer"}</p>
                                {order.deliveryInfo?.note && (
                                  <p><strong>Note:</strong> {order.deliveryInfo.note}</p>
                                )}
                                {order.cancellationReason && (
                                  <p><strong>Cancellation:</strong> {order.cancellationReason}</p>
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

        {!loading && totalPages > 1 && (
          <div className="seller-pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            <div>
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="seller-data-note">
        <Clock3 size={14} />         Accept the order, send it out for delivery, then confirm completion and cash-on-delivery payment.
      </p>
    </section>
  );
}