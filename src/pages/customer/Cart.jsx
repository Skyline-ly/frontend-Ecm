import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { formatMoney, productImage, productPrice } from "./customerUtils";

async function fetchCartItems() {
  const result = await apiRequest("/api/cart");
  if (!Array.isArray(result.data?.items)) throw new Error("The server returned an invalid cart.");
  return result.data.items;
}

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const navigate = useNavigate();

  const loadCart = useCallback(async () => {
    try {
      const cartItems = await fetchCartItems();
      setError("");
      setItems(cartItems);
    } catch (requestError) {
      setError(requestError.message || "Unable to load your cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchCartItems()
      .then((cartItems) => { if (active) setItems(cartItems); })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to load your cart."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/api/user/profile")
      .then((result) => {
        if (active && result.data?.phone) setPhone(result.data.phone);
      })
      .catch(() => {
        if (active) setPhone("");
      });
    return () => { active = false; };
  }, []);

  const subtotal = useMemo(() => items.reduce((total, item) => {
    const variant = item.product?.variants?.find((value) => value._id === item.variantId);
    return total + Number(productPrice(item.product, variant)) * Number(item.quantity || 0);
  }, 0), [items]);

  const updateQuantity = async (item, quantity) => {
    if (quantity < 1) return;
    setBusyId(item._id);
    setNotice("");
    try {
      await apiRequest(`/api/cart/${item._id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      await loadCart();
      window.dispatchEvent(new Event("shopora-cart-changed"));
    } catch (requestError) {
      setNotice(requestError.message || "Unable to update quantity.");
    } finally {
      setBusyId("");
    }
  };

  const removeItem = async (itemId) => {
    setBusyId(itemId);
    setNotice("");
    try {
      await apiRequest(`/api/cart/${itemId}/delete`, { method: "DELETE" });
      await loadCart();
      window.dispatchEvent(new Event("shopora-cart-changed"));
    } catch (requestError) {
      setNotice(requestError.message || "Unable to remove this item.");
    } finally {
      setBusyId("");
    }
  };

  const checkout = async (event) => {
    event.preventDefault();
    if (!address.trim() || !phone.trim()) {
      setNotice("Enter your delivery address and phone number to place your order.");
      return;
    }
    setCheckingOut(true);
    setNotice("");
    try {
      const result = await apiRequest("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryInfo: {
            address: address.trim(),
            phone: phone.trim(),
            note: note.trim(),
          },
        }),
      });
      window.dispatchEvent(new Event("shopora-cart-changed"));
      navigate("/orders", { state: { notice: result.message || "Your order has been placed." } });
    } catch (requestError) {
      setNotice(requestError.message || "Unable to place your order.");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="customer-state"><LoaderCircle className="spin" size={25} /> Loading your cart...</div>;

  return (
    <section className="customer-page">
      <div className="customer-page-heading">
        <div><span className="eyebrow">YOUR SHOPPING BAG</span><h1>Your cart</h1><p>Good choices. Let&apos;s make them yours.</p></div>
        <Link className="text-link" to="/">Continue shopping <ArrowRight size={15} /></Link>
      </div>
      {error && <div className="store-alert" role="alert">{error}</div>}
      {notice && <p className="store-notice" role="status">{notice}</p>}
      {items.length === 0 ? (
        <div className="store-empty">
          <span className="empty-icon"><ShoppingBag size={25} /></span>
          <h3>Your cart is waiting for something good</h3>
          <p>Browse the collection and add something you love.</p>
          <Link className="primary-button" to="/">Explore the shop <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const product = item.product;
              if (!product) return null;
              const variant = product.variants?.find((value) => value._id === item.variantId);
              const image = productImage(product);
              const variantLabel = variant?.attributes
                ? Object.values(variant.attributes instanceof Map ? Object.fromEntries(variant.attributes) : variant.attributes).join(" / ")
                : "";
              return (
                <article className="cart-item" key={item._id}>
                  <Link className="cart-item-image" to={`/product/${product._id}`}>
                    {image ? <img src={image} alt={product.name} /> : <ShoppingBag size={24} />}
                  </Link>
                  <div className="cart-item-info">
                    <Link to={`/product/${product._id}`} className="cart-item-name">{product.name}</Link>
                    <span className="cart-item-caption">{variantLabel || product.condition || "Selected for you"}</span>
                    <strong>{formatMoney(productPrice(product, variant))}</strong>
                    <div className="cart-item-controls">
                      <div className="quantity-stepper">
                        <button type="button" disabled={busyId === item._id || item.quantity <= 1} onClick={() => updateQuantity(item, item.quantity - 1)} aria-label="Decrease quantity"><Minus size={14} /></button>
                        <span>{item.quantity}</span>
                        <button type="button" disabled={busyId === item._id} onClick={() => updateQuantity(item, item.quantity + 1)} aria-label="Increase quantity"><Plus size={14} /></button>
                      </div>
                      <button className="remove-item" type="button" disabled={busyId === item._id} onClick={() => removeItem(item._id)}><Trash2 size={14} /> Remove</button>
                    </div>
                  </div>
                  <strong className="cart-item-total">{formatMoney(productPrice(product, variant) * item.quantity)}</strong>
                </article>
              );
            })}
          </div>

          <aside className="checkout-card">
            <div className="checkout-card-heading"><h2>Order summary</h2><span>{items.length} {items.length === 1 ? "item" : "items"}</span></div>
            <div className="checkout-line"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
            <div className="checkout-line"><span>Payment</span><span>Cash on delivery</span></div>
            <div className="checkout-total"><span>Total</span><strong>{formatMoney(subtotal)}</strong></div>
            <form onSubmit={checkout} className="checkout-form">
              <label htmlFor="delivery-address"><MapPin size={16} /> Delivery address <span>Required</span></label>
              <textarea id="delivery-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, building, city, and delivery instructions" maxLength={500} rows={3} required />
              <label htmlFor="delivery-phone"><Phone size={15} /> Phone number <span>Required</span></label>
              <input id="delivery-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number for delivery" maxLength={30} required />
              <label htmlFor="delivery-note">Note <span>Optional</span></label>
              <textarea id="delivery-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything the seller should know?" maxLength={500} rows={2} />
              <button className="primary-button checkout-button" type="submit" disabled={checkingOut || !items.length}>
                {checkingOut ? "Placing order..." : "Place order"} <ArrowRight size={16} />
              </button>
            </form>
            <p className="checkout-footnote">Pay the seller when your order arrives. No online payment is required.</p>
            <Link className="payway-sandbox-link" to="/payway-checkout">
              Try PayWay sandbox ($1.00 test)
            </Link>
            <p className="checkout-footnote">Sandbox test only; this does not pay for your cart order.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
