import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Printer, ShoppingBag } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { formatDate, formatMoney } from "./customerUtils";

export default function Invoice() {
  const { orderId } = useParams();
  const location = useLocation();
  const backPath = location.pathname.startsWith("/seller/") ? "/seller/orders" : "/orders";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/api/order/${orderId}`)
      .then((result) => {
        if (active) setOrder(result.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load this invoice.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  if (loading) {
    return <div className="customer-state"><LoaderCircle className="spin" size={25} /> Preparing your invoice...</div>;
  }

  if (error || !order) {
    return (
      <div className="customer-state customer-error" role="alert">
        <h2>Invoice unavailable</h2>
        <p>{error || "This order could not be found."}</p>
        <Link className="text-link" to={backPath}><ArrowLeft size={15} /> Back to orders</Link>
      </div>
    );
  }

  const delivery = order.deliveryInfo || {};
  const customerName = delivery.name || order.customer?.name || "Customer";
  const customerEmail = delivery.email || order.customer?.email;
  const orderNumber = String(order._id).slice(-8).toUpperCase();

  return (
    <section className="invoice-page">
      <div className="invoice-toolbar">
        <Link className="back-link" to={backPath}><ArrowLeft size={16} /> Back to orders</Link>
        <button className="primary-button" type="button" onClick={() => window.print()}><Printer size={16} /> Print invoice</button>
      </div>

      <article className="invoice-paper">
        <header className="invoice-header">
          <Link className="store-logo" to="/">
            <span className="store-logo-mark"><ShoppingBag size={18} /></span>
            ShopEveryDay
          </Link>
          <div className="invoice-title">
            <span className="eyebrow">ORDER SUMMARY</span>
            <h1>Invoice</h1>
          </div>
        </header>

        <div className="invoice-meta">
          <div><span>Order number</span><strong>#{orderNumber}</strong></div>
          <div><span>Order date</span><strong>{formatDate(order.createdAt)}</strong></div>
          <div><span>Order status</span><strong>{order.status}</strong></div>
        </div>

        <div className="invoice-parties">
          <section>
            <h2>Customer</h2>
            <strong>{customerName}</strong>
            {customerEmail && <p>{customerEmail}</p>}
            <p>{delivery.phone || order.customer?.phone || "No phone provided"}</p>
          </section>
          <section>
            <h2>Deliver to</h2>
            <p className="invoice-address">{delivery.address || order.pickupInfo?.location || "No delivery address provided"}</p>
            {delivery.note && <p className="invoice-note">Note: {delivery.note}</p>}
          </section>
        </div>

        <div className="invoice-items-wrap">
          <table className="invoice-items">
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item._id || `${item.productName}-${item.variantId}`}>
                  <td>
                    <strong>{item.productName}</strong>
                    {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                      <small>{Object.entries(item.variantAttributes).map(([name, value]) => `${name}: ${value}`).join(" · ")}</small>
                    )}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.price)}</td>
                  <td>{formatMoney(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-totals">
          <div><span>Subtotal</span><strong>{formatMoney(order.subtotal ?? order.totalAmount)}</strong></div>
          <div className="invoice-total"><span>Total</span><strong>{formatMoney(order.totalAmount)}</strong></div>
          <div><span>Payment method</span><strong>{order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentMethod || "Cash on delivery"}</strong></div>
          <div><span>Payment status</span><strong>{order.paymentStatus || "Pending"}</strong></div>
        </div>
        <footer className="invoice-footer">Thank you for shopping with ShopEveryDay.</footer>
      </article>
    </section>
  );
}
