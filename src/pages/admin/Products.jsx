import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  LoaderCircle,
  PackageSearch,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import DateRangeFilter from "../../Component/shared/DateRangeFilter";
import "./Products.css";

const PAGE_SIZE = 20;

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price)
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
      }).format(price)
    : "—";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [review, setReview] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);

        const response = await apiRequest(
          `/api/product/admin/all?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!Array.isArray(response.data)) {
          throw new Error("The server returned an invalid product list.");
        }

        if (!controller.signal.aborted) {
          setProducts(response.data);
          setTotalDocs(Number(response.pagination?.totalDocs) || 0);
          setTotalPages(
            Math.max(1, Number(response.pagination?.totalPages) || 1)
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load products.");
          setProducts([]);
          setTotalDocs(0);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [page, search, status, fromDate, toDate, reloadKey]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setNotice("");
  };

  const handleStatusChange = (event) => {
    setPage(1);
    setStatus(event.target.value);
    setNotice("");
  };

  const handleDateFilter = (startDate, endDate) => {
    setPage(1);
    setFromDate(startDate);
    setToDate(endDate);
  };

  const openReview = (product, decision) => {
    setError("");
    setNotice("");
    setReview({ product, decision });
    setReviewNote("");
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!review) return;

    setError("");
    setNotice("");
    setBusyProductId(review.product._id);
    setSavingReview(true);

    try {
      const response = await apiRequest(
        `/api/product/${review.product._id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: review.decision,
            reviewNote: reviewNote.trim(),
          }),
        }
      );

      setNotice(
        response.message ||
          `Product ${review.decision} successfully.`
      );
      setReview(null);
      setReviewNote("");
      if (products.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to review this product.");
    } finally {
      setBusyProductId("");
      setSavingReview(false);
    }
  };

  return (
    <section className="admin-section products-admin">
      <div className="dashboard-heading">
        <div>
          <h1>Products</h1>
          <p>Review seller submissions and manage product visibility.</p>
        </div>
        <button
          className="products-refresh"
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "products-spinning" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="products-message products-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="products-message products-notice" role="status">
          {notice}
        </div>
      )}

      <div className="dashboard-panel products-panel">
        <div className="products-toolbar">
          <form className="products-search" onSubmit={handleSearch}>
            <label className="products-search-field">
              <Search size={17} aria-hidden="true" />
              <span className="products-visually-hidden">Search products</span>
              <input
                type="search"
                placeholder="Search by product name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </label>
            <button type="submit">Search</button>
          </form>

          <label className="products-status-filter">
            <span>Status</span>
            <select value={status} onChange={handleStatusChange}>
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
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

        <div className="products-list-heading">
          <div>
            <h2>Product catalog</h2>
            <p>
              {loading
                ? "Loading products…"
                : `${totalDocs} ${totalDocs === 1 ? "product" : "products"} found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="products-state" role="status">
            <LoaderCircle size={22} className="products-spinning" />
            <span>Loading products…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="products-state">
            <PackageSearch size={28} />
            <strong>No products found</strong>
            <span>Try changing the search or status filter.</span>
          </div>
        ) : (
          <div className="products-table-wrap">
            <table className="admin-table products-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Seller</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Status</th>
                  <th scope="col">Review</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const imageUrl = product.images?.[0]?.url;
                  const isPending = product.approvalStatus === "pending";
                  const canReview = isPending && product.isActive !== false;
                  const isBusy = busyProductId === product._id;

                  return (
                    <tr key={product._id}>
                      <td>
                        <div className="products-product-cell">
                          {imageUrl ? (
                            <img src={imageUrl} alt="" loading="lazy" />
                          ) : (
                            <span className="products-image-placeholder">
                              <ImageOff size={18} />
                            </span>
                          )}
                          <div className="products-product-name">
                            <strong>{product.name || "Untitled product"}</strong>
                            {product.brand?.name && (
                              <span>{product.brand.name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="products-seller-cell">
                          <strong>{product.seller?.name || "Unknown seller"}</strong>
                          {product.seller?.email && (
                            <span>{product.seller.email}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="products-category-cell">
                          <span>{product.category?.name || "—"}</span>
                          {product.subCategory?.name && (
                            <small>{product.subCategory.name}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="products-price-cell">
                          <strong>
                            {formatPrice(product.discountPrice ?? product.basePrice)}
                          </strong>
                          {product.discountPrice != null && (
                            <span>{formatPrice(product.basePrice)}</span>
                          )}
                        </div>
                      </td>
                      <td>{formatDate(product.createdAt)}</td>
                      <td>
                        <span
                          className={`products-status ${product.approvalStatus || "unknown"}`}
                        >
                          {product.approvalStatus || "unknown"}
                        </span>
                        {product.isActive === false && (
                          <span className="products-inactive">Inactive</span>
                        )}
                      </td>
                      <td>
                        {canReview ? (
                          <div className="products-review-actions">
                            <button
                              className="products-approve-button"
                              type="button"
                              onClick={() => openReview(product, "approved")}
                              disabled={Boolean(busyProductId)}
                              aria-label={`Approve ${product.name}`}
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="products-reject-button"
                              type="button"
                              onClick={() => openReview(product, "rejected")}
                              disabled={Boolean(busyProductId)}
                              aria-label={`Reject ${product.name}`}
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : product.reviewNote ? (
                          <span
                            className="products-review-note"
                            title={product.reviewNote}
                          >
                            {product.reviewNote}
                          </span>
                        ) : (
                          <span className="products-no-review">—</span>
                        )}
                        {isBusy && (
                          <span className="products-row-busy" role="status">
                            Updating…
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="products-pagination">
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

      {review && (
        <div className="products-dialog-backdrop">
          <form
            className="products-review-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="products-review-title"
            onSubmit={submitReview}
          >
            <div className="products-dialog-heading">
              <div>
                <h2 id="products-review-title">
                  {review.decision === "approved"
                    ? "Approve product"
                    : "Reject product"}
                </h2>
                <p>{review.product.name}</p>
              </div>
              <button
                type="button"
                className="products-dialog-close"
                onClick={() => setReview(null)}
                disabled={savingReview}
                aria-label="Close review dialog"
              >
                <X size={19} />
              </button>
            </div>
            <label className="products-review-label" htmlFor="review-note">
              Review note <span>Optional</span>
            </label>
            <textarea
              id="review-note"
              rows="4"
              maxLength="1000"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Add feedback for the seller"
            />
            <div className="products-dialog-actions">
              <button
                type="button"
                className="products-cancel-button"
                onClick={() => setReview(null)}
                disabled={savingReview}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={
                  review.decision === "approved"
                    ? "products-confirm-approve"
                    : "products-confirm-reject"
                }
                disabled={savingReview}
              >
                {savingReview && (
                  <LoaderCircle size={16} className="products-spinning" />
                )}
                {review.decision === "approved" ? "Approve product" : "Reject product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
