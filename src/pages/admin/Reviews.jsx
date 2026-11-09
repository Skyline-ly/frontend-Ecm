import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import DateRangeFilter from "../../Component/shared/DateRangeFilter";
import "./Reviews.css";

const PAGE_SIZE = 20;

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function Rating({ value }) {
  const rating = Number(value) || 0;
  return (
    <span
      className="reviews-rating"
      aria-label={`${rating} out of 5 stars`}
      title={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={14}
          fill={index < rating ? "currentColor" : "none"}
          aria-hidden="true"
        />
      ))}
      <strong>{rating}/5</strong>
    </span>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyReviewId, setBusyReviewId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReviews() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        const response = await apiRequest(
          `/api/review/admin/all?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!Array.isArray(response.data)) {
          throw new Error("The server returned an invalid review list.");
        }

        if (!controller.signal.aborted) {
          setReviews(response.data);
          setTotalDocs(Number(response.pagination?.totalDocs) || 0);
          setTotalPages(
            Math.max(1, Number(response.pagination?.totalPages) || 1)
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load reviews.");
          setReviews([]);
          setTotalDocs(0);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadReviews();
    return () => controller.abort();
  }, [page, fromDate, toDate, reloadKey]);

  const handleDateFilter = (startDate, endDate) => {
    setPage(1);
    setFromDate(startDate);
    setToDate(endDate);
  };

  const handleDelete = async (review) => {
    const reviewer = review.customer?.name || "this customer";
    if (
      !window.confirm(
        `Permanently remove this review from ${reviewer}? This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setNotice("");
    setBusyReviewId(review._id);
    try {
      const response = await apiRequest(`/api/review/admin/${review._id}`, {
        method: "DELETE",
      });
      setNotice(response.message || "Review removed successfully.");
      if (reviews.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to remove the review.");
    } finally {
      setBusyReviewId("");
    }
  };

  return (
    <section className="admin-section reviews-admin">
      <div className="dashboard-heading">
        <div>
          <h1>Reviews</h1>
          <p>Review customer feedback and remove inappropriate submissions.</p>
        </div>
        <button
          className="reviews-refresh"
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "reviews-spinning" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="reviews-message error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="reviews-message success" role="status">
          {notice}
        </div>
      )}

      <div className="dashboard-panel reviews-panel">
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onApply={handleDateFilter}
        />
        <div className="reviews-list-heading">
          <div>
            <h2>Customer reviews</h2>
            <p>
              {loading
                ? "Loading reviews…"
                : `${totalDocs} ${totalDocs === 1 ? "review" : "reviews"} total`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="reviews-state" role="status">
            <LoaderCircle size={22} className="reviews-spinning" />
            <span>Loading reviews…</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="reviews-state">
            <MessageSquareText size={28} />
            <strong>No reviews yet</strong>
            <span>Customer reviews will appear here.</span>
          </div>
        ) : (
          <div className="reviews-table-wrap">
            <table className="admin-table reviews-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Comment</th>
                  <th scope="col">Order</th>
                  <th scope="col">Date</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const busy = busyReviewId === review._id;
                  const orderId =
                    typeof review.order === "object"
                      ? review.order?._id
                      : review.order;
                  return (
                    <tr key={review._id}>
                      <td>
                        <strong className="reviews-product-name">
                          {review.product?.name || "Product unavailable"}
                        </strong>
                      </td>
                      <td>
                        <div className="reviews-customer">
                          <strong>{review.customer?.name || "Customer"}</strong>
                          {review.customer?.email && (
                            <span>{review.customer.email}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <Rating value={review.rating} />
                      </td>
                      <td>
                        <p className="reviews-comment">
                          {review.comment?.trim() || (
                            <span className="reviews-no-comment">
                              No written comment
                            </span>
                          )}
                        </p>
                      </td>
                      <td>
                        <div className="reviews-order">
                          <span>
                            {orderId
                              ? `#${String(orderId).slice(-8).toUpperCase()}`
                              : "—"}
                          </span>
                          {review.order?.status && (
                            <small>{review.order.status}</small>
                          )}
                        </div>
                      </td>
                      <td>{formatDate(review.createdAt)}</td>
                      <td>
                        <button
                          className="reviews-delete"
                          type="button"
                          onClick={() => handleDelete(review)}
                          disabled={Boolean(busyReviewId)}
                          aria-label={`Remove review by ${review.customer?.name || "customer"}`}
                          title="Remove review"
                        >
                          {busy ? (
                            <LoaderCircle
                              size={16}
                              className="reviews-spinning"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="reviews-pagination">
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
