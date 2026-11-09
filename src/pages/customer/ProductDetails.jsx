import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Heart,
  LoaderCircle,
  MessageCircle,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { formatMoney, productPrice, publicRequest } from "./customerUtils";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loadedProductId, setLoadedProductId] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    publicRequest(`/api/product/${id}`)
      .then((result) => {
        if (active) {
          setError("");
          setProduct(result.data);
          setSelectedImage(0);
          setVariantId("");
          setQuantity(1);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load this product.");
      })
      .finally(() => { if (active) setLoadedProductId(id); });
    return () => { active = false; };
  }, [id]);
  const loading = loadedProductId !== id;

  const selectedVariant = useMemo(
    () => product?.variants?.find((variant) => variant._id === variantId),
    [product, variantId]
  );
  const hasVariants = Boolean(product?.variants?.length);
  const stock = hasVariants ? selectedVariant?.stock : product?.stock;
  const currentPrice = productPrice(product, selectedVariant);
  const images = useMemo(() => {
    const productImages = product?.images || [];
    if (!selectedVariant?.image) return productImages;
    return [
      { url: selectedVariant.image },
      ...productImages.filter((image) => image.url !== selectedVariant.image),
    ];
  }, [product, selectedVariant]);

  const addToCart = async () => {
    if (!sessionStorage.getItem("accessToken")) {
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    if (hasVariants && !variantId) {
      setNotice("Choose an option before adding this item to your cart.");
      return;
    }
    if (Number(stock) < quantity) {
      setNotice("The selected quantity is not available.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await apiRequest("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product._id,
          ...(variantId ? { variantId } : {}),
          quantity,
        }),
      });
      window.dispatchEvent(new Event("shopora-cart-changed"));
      setNotice(result.message || "Added to your cart.");
    } catch (requestError) {
      setNotice(requestError.message || "Unable to add this item to your cart.");
    } finally {
      setBusy(false);
    }
  };

  const addToWishlist = async () => {
    if (!sessionStorage.getItem("accessToken")) {
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await apiRequest("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
      });
      window.dispatchEvent(new Event("shopora-wishlist-changed"));
      setNotice(result.message || "Added to your wishlist.");
    } catch (requestError) {
      setNotice(requestError.message || "Unable to update your wishlist.");
    } finally {
      setBusy(false);
    }
  };

  const chatWithSeller = async () => {
    let user;
    try {
      user = JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      user = null;
    }

    if (!sessionStorage.getItem("accessToken") || !user) {
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    if (user.role !== "customer") {
      setNotice("Only customer accounts can message sellers.");
      return;
    }
    if (!product.seller?._id) {
      setNotice("Seller information is not available for this product.");
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const response = await apiRequest("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId: product.seller._id }),
      });
      navigate(
        `/messages?conversation=${encodeURIComponent(response.data._id)}&product=${encodeURIComponent(product._id)}`,
        {
          state: {
            product: {
              _id: product._id,
              name: product.name,
              basePrice: product.basePrice,
              discountPrice: product.discountPrice,
              images: product.images,
            },
          },
        }
      );
    } catch (requestError) {
      setNotice(requestError.message || "Unable to start a conversation.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="customer-state"><LoaderCircle className="spin" size={25} /> Loading product...</div>;
  }
  if (error || !product) {
    return (
      <div className="customer-state customer-error" role="alert">
        <h2>We couldn&apos;t find that item.</h2>
        <p>{error || "This product may no longer be available."}</p>
        <Link className="text-link" to="/">Back to the shop</Link>
      </div>
    );
  }

  const attributes = product.attributes instanceof Map
    ? Object.fromEntries(product.attributes)
    : product.attributes || {};
  const variantAttributes = selectedVariant?.attributes instanceof Map
    ? Object.fromEntries(selectedVariant.attributes)
    : selectedVariant?.attributes || {};

  return (
    <div className="product-detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Back to the collection</Link>
      <div className="product-detail-grid">
        <div className="product-gallery">
          <div className="product-detail-image">
            {images[selectedImage]?.url ? (
              <img src={images[selectedImage].url} alt={product.name} />
            ) : <span className="product-image-placeholder"><Sparkles size={36} /></span>}
          </div>
          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.map((image, index) => (
                <button
                  key={image.publicId || image.url || index}
                  className={selectedImage === index ? "is-selected" : ""}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  aria-label={`Show product image ${index + 1}`}
                >
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="product-detail-copy">
          <span className="eyebrow">{product.category?.name || "SHOPORA FINDS"}</span>
          <h1>{product.name}</h1>
          <div className="detail-price">{formatMoney(currentPrice)}
            {product.discountPrice && product.discountPrice < product.basePrice &&
              <del>{formatMoney(product.basePrice)}</del>}
          </div>
          <p className="detail-description">{product.description}</p>
          <div className="detail-meta">
            {product.brand?.name && <span>Brand <strong>{product.brand.name}</strong></span>}
            {product.condition && <span>Condition <strong>{product.condition}</strong></span>}
            {product.seller?.name && <span>Seller <strong>{product.seller.name}</strong></span>}
          </div>

          {hasVariants && (
            <fieldset className="variant-picker">
              <legend>Choose an option</legend>
              <div className="variant-options">
                {product.variants.map((variant) => {
                  const values = variant.attributes instanceof Map
                    ? Object.values(Object.fromEntries(variant.attributes))
                    : Object.values(variant.attributes || {});
                  const label = values.length ? values.join(" / ") : `Option ${variant.sku}`;
                  return (
                    <button
                      type="button"
                      key={variant._id}
                      disabled={Number(variant.stock) < 1}
                      className={variantId === variant._id ? "is-selected" : ""}
                      onClick={() => {
                        setVariantId(variant._id);
                        setSelectedImage(0);
                        setQuantity(1);
                        setNotice("");
                      }}
                    >
                      {label}{Number(variant.stock) < 1 ? " · Sold out" : ""}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {Object.keys(variantAttributes).length > 0 && (
            <p className="variant-selected">
              {Object.entries(variantAttributes).map(([key, value]) => `${key}: ${value}`).join(" · ")}
            </p>
          )}

          <div className="quantity-row">
            <div className="quantity-stepper" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={15} /></button>
              <span>{quantity}</span>
              <button type="button" aria-label="Increase quantity" disabled={typeof stock === "number" && quantity >= stock} onClick={() => setQuantity((value) => value + 1)}><Plus size={15} /></button>
            </div>
            <span className="stock-copy">
              {stock === undefined ? "Choose an option" : stock > 0 ? `${stock} available` : "Out of stock"}
            </span>
          </div>

          {notice && <p className="store-notice" role="status">{notice}</p>}
          <div className="detail-actions">
            <button className="primary-button" type="button" disabled={busy || stock === 0 || (hasVariants && !variantId)} onClick={addToCart}>
              <ShoppingCart size={18} /> {busy ? "Please wait..." : "Add to cart"}
            </button>
            <button className="icon-outline-button" type="button" disabled={busy} onClick={addToWishlist} aria-label="Add to wishlist">
              <Heart size={19} />
            </button>
          </div>
          <button
            className="primary-button detail-chat-button"
            type="button"
            disabled={busy}
            onClick={chatWithSeller}
          >
            <MessageCircle size={17} />
            {busy ? "Please wait…" : "Chat with seller"}
          </button>
          <p className="detail-pickup-note">Pickup details are collected securely at checkout.</p>
          {Object.keys(attributes).length > 0 && (
            <div className="product-attributes">
              <h3>Product details</h3>
              {Object.entries(attributes).map(([key, value]) => <p key={key}><span>{key}</span><strong>{String(value)}</strong></p>)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
