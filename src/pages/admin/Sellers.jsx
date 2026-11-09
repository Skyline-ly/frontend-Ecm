import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Search,
  Store,
  UserRoundX,
  X,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import "./AdminPeople.css";

const PAGE_SIZE = 20;

const sellerViews = [
  { value: "all", label: "All sellers" },
  { value: "approved", label: "Approved sellers" },
  { value: "pending", label: "Pending applications" },
  { value: "rejected", label: "Rejected applications" },
  { value: "suspended", label: "Suspended sellers" },
];

const statusLabels = {
  pending: "Pending application",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  none: "Not applied",
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function queryForView(view) {
  if (view === "pending" || view === "rejected") {
    return { sellerStatus: view };
  }
  if (view === "approved") {
    return { role: "seller", sellerStatus: view };
  }
  if (view === "suspended") {
    return { role: "seller", sellerStatus: "suspended" };
  }
  return { role: "seller" };
}

export default function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busySellerId, setBusySellerId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSellers() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          ...queryForView(view),
        });
        if (search) params.set("search", search);

        const response = await apiRequest(
          `/api/user/search?${params.toString()}`,
          { signal: controller.signal }
        );
        const pageData = response.data;

        if (!Array.isArray(pageData?.docs)) {
          throw new Error("The server returned an invalid seller list.");
        }

        if (!controller.signal.aborted) {
          setSellers(pageData.docs);
          setTotalDocs(Number(pageData.totalDocs) || 0);
          setTotalPages(Math.max(1, Number(pageData.totalPages) || 1));
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load sellers.");
          setSellers([]);
          setTotalDocs(0);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadSellers();
    return () => controller.abort();
  }, [page, search, view, reloadKey]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setNotice("");
  };

  const handleViewChange = (event) => {
    setPage(1);
    setView(event.target.value);
    setNotice("");
  };

  const updateSellerStatus = async (seller, action, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setError("");
    setNotice("");
    setBusySellerId(seller._id);
    try {
      const response = await apiRequest(`/api/user/${seller._id}/${action}`, {
        method: "PUT",
      });
      setNotice(response.message || "Seller status updated successfully.");
      if (sellers.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to update this seller.");
    } finally {
      setBusySellerId("");
    }
  };

  const isApplicationView = view === "pending" || view === "rejected";
  const emptyState = {
    pending: {
      title: "No pending applications",
      description: "Seller applications appear here after customers submit the application form.",
    },
    rejected: {
      title: "No rejected applications",
      description: "There are no rejected seller applications to show.",
    },
    approved: {
      title: "No approved sellers",
      description: "Approved seller accounts will appear here.",
    },
    suspended: {
      title: "No suspended sellers",
      description: "There are no suspended seller accounts to show.",
    },
    all: {
      title: "No sellers found",
      description: "No seller accounts match this view.",
    },
  }[view];

  return (
    <section className="admin-section people-admin">
      <div className="dashboard-heading">
        <div>
          <h1>Sellers</h1>
          <p>Review seller applications and manage seller access.</p>
        </div>
        <button
          className="people-refresh"
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "people-spinning" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="people-message people-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="people-message people-notice" role="status">
          {notice}
        </div>
      )}

      <div className="dashboard-panel people-panel">
        <div className="people-toolbar">
          <form className="people-search" onSubmit={handleSearch}>
            <label className="people-search-field">
              <Search size={17} aria-hidden="true" />
              <span className="people-visually-hidden">Search by name</span>
              <input
                type="search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </label>
            <button type="submit">Search</button>
          </form>

          <label className="people-filter">
            <span>View</span>
            <select value={view} onChange={handleViewChange}>
              {sellerViews.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="people-list-heading">
          <div>
            <h2>{sellerViews.find((option) => option.value === view)?.label}</h2>
            <p>
              {loading
                ? "Loading sellers…"
                : `${totalDocs} ${totalDocs === 1 ? "record" : "records"} found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="people-state" role="status">
            <LoaderCircle size={22} className="people-spinning" />
            <span>Loading sellers…</span>
          </div>
        ) : sellers.length === 0 ? (
          <div className="people-state">
            {isApplicationView ? <UserRoundX size={28} /> : <Store size={28} />}
            <strong>{emptyState.title}</strong>
            <span>{emptyState.description}</span>
          </div>
        ) : (
          <div className="people-table-wrap">
            <table className="admin-table people-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  {isApplicationView && <th scope="col">Shop details</th>}
                  {isApplicationView && <th scope="col">ID document</th>}
                  <th scope="col">{isApplicationView ? "Applied" : "Joined"}</th>
                  <th scope="col">Seller status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => {
                  const sellerStatus = seller.sellerStatus || "none";
                  const busy = busySellerId === seller._id;

                  return (
                    <tr key={seller._id}>
                      <td>
                        <div className="people-name-cell">
                          <span className="people-avatar" aria-hidden="true">
                            {(seller.name || "?").trim().charAt(0).toUpperCase()}
                          </span>
                          <strong>{seller.name || "Unnamed user"}</strong>
                        </div>
                      </td>
                      <td>{seller.email || "—"}</td>
                      <td>{seller.phone || "—"}</td>
                      {isApplicationView && (
                        <td>
                          <div className="people-application-details">
                            <strong>{seller.sellerApplication?.shopName || "—"}</strong>
                            <span>{seller.sellerApplication?.shopLocation || "No location provided"}</span>
                            <small>
                              ID: {seller.sellerApplication?.cardId || "Not provided"}
                            </small>
                          </div>
                        </td>
                      )}
                      {isApplicationView && (
                        <td>
                          {seller.sellerApplication?.idCardPhoto?.url ? (
                            <a
                              className="people-id-document"
                              href={seller.sellerApplication.idCardPhoto.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={seller.sellerApplication.idCardPhoto.url}
                                alt={`Identity document for ${seller.name || "applicant"}`}
                                loading="lazy"
                              />
                              View document
                            </a>
                          ) : (
                            "Not provided"
                          )}
                        </td>
                      )}
                      <td>
                        {formatDate(
                          isApplicationView
                            ? seller.sellerApplication?.submittedAt || seller.createdAt
                            : seller.createdAt
                        )}
                      </td>
                      <td>
                        <span className={`people-status ${sellerStatus}`}>
                          {statusLabels[sellerStatus] || sellerStatus}
                        </span>
                      </td>
                      <td>
                        <div className="people-actions">
                          {sellerStatus === "pending" && (
                            <>
                              <button
                                type="button"
                                className="people-action-button approve"
                                onClick={() =>
                                  updateSellerStatus(seller, "approve")
                                }
                                disabled={Boolean(busySellerId)}
                              >
                                <Check size={15} />
                                Approve
                              </button>
                              <button
                                type="button"
                                className="people-action-button reject"
                                onClick={() =>
                                  updateSellerStatus(
                                    seller,
                                    "reject",
                                    `Reject the seller application from ${seller.name || "this user"}?`
                                  )
                                }
                                disabled={Boolean(busySellerId)}
                              >
                                <X size={15} />
                                Reject
                              </button>
                            </>
                          )}
                          {sellerStatus === "approved" && (
                            <button
                              type="button"
                              className="people-action-button reject"
                              onClick={() =>
                                updateSellerStatus(
                                  seller,
                                  "suspend",
                                  `Suspend ${seller.name || "this seller"}?`
                                )
                              }
                              disabled={Boolean(busySellerId)}
                            >
                              Suspend
                            </button>
                          )}
                          {sellerStatus === "suspended" && (
                            <button
                              type="button"
                              className="people-action-button approve"
                              onClick={() =>
                                updateSellerStatus(seller, "unsuspend")
                              }
                              disabled={Boolean(busySellerId)}
                            >
                              <Check size={15} />
                              Unsuspend
                            </button>
                          )}
                          {sellerStatus === "rejected" && (
                            <button
                              type="button"
                              className="people-action-button neutral"
                              onClick={() =>
                                updateSellerStatus(seller, "unreject")
                              }
                              disabled={Boolean(busySellerId)}
                            >
                              Restore application
                            </button>
                          )}
                          {busy && (
                            <span className="people-row-busy" role="status">
                              Updating…
                            </span>
                          )}
                          {!busy &&
                            !["pending", "approved", "suspended", "rejected"].includes(
                              sellerStatus
                            ) && <span className="people-no-action">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="people-pagination">
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
