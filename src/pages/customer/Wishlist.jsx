import { useEffect, useState } from "react";
import { ArrowRight, Heart, LoaderCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { formatMoney, productImage } from "./customerUtils";

async function fetchWishlist() {
  const result = await apiRequest("/api/wishlist");
  if (!Array.isArray(result.data)) throw new Error("The server returned an invalid wishlist.");
  return result.data;
}

export default function Wishlist() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;
    fetchWishlist()
      .then((wishlist) => { if (active) setProducts(wishlist); })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to load your wishlist."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const remove = async (productId) => {
    setBusyId(productId);
    try {
      await apiRequest(`/api/wishlist/${productId}`, { method: "DELETE" });
      setProducts((current) => current.filter((product) => product._id !== productId));
      window.dispatchEvent(new Event("shopora-wishlist-changed"));
    } catch (requestError) {
      setError(requestError.message || "Unable to remove this product.");
    } finally {
      setBusyId("");
    }
  };

  if (loading) return <div className="customer-state"><LoaderCircle className="spin" size={25} /> Loading your wishlist...</div>;

  return (
    <section className="customer-page">
      <div className="customer-page-heading">
        <div><span className="eyebrow">SAVED FOR LATER</span><h1>Your wishlist</h1><p>A little list of things you love.</p></div>
        <Link className="text-link" to="/">Discover more <ArrowRight size={15} /></Link>
      </div>
      {error && <div className="store-alert" role="alert">{error}</div>}
      {products.length === 0 ? (
        <div className="store-empty">
          <span className="empty-icon"><Heart size={25} /></span>
          <h3>Your wishlist is a blank canvas</h3>
          <p>Tap the heart on anything you love and it&apos;ll be right here.</p>
          <Link className="primary-button" to="/">Find a favorite <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product._id}>
              <Link className="product-card-image" to={`/product/${product._id}`}>
                {productImage(product) ? <img src={productImage(product)} alt={product.name} loading="lazy" /> : <span className="product-image-placeholder"><Heart size={26} /></span>}
              </Link>
              <button className="product-heart is-active" type="button" disabled={busyId === product._id} onClick={() => remove(product._id)} aria-label={`Remove ${product.name} from wishlist`}><Trash2 size={17} /></button>
              <div className="product-card-copy">
                <span className="product-category">{product.category?.name || "YOUR WISHLIST"}</span>
                <Link className="product-title" to={`/product/${product._id}`}>{product.name}</Link>
                <div className="product-card-bottom">
                  <div className="product-price"><strong>{formatMoney(product.discountPrice ?? product.basePrice)}</strong></div>
                  <Link className="product-arrow" to={`/product/${product._id}`} aria-label={`View ${product.name}`}><ArrowRight size={17} /></Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
