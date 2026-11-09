import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import "./AdminPeople.css";

const PAGE_SIZE = 20;

const roleOptions = [
  { value: "", label: "All roles" },
  { value: "customer", label: "Customer" },
  { value: "seller", label: "Seller" },
  { value: "admin", label: "Admin" },
];

const sellerStatusLabels = {
  none: "—",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (search) params.set("search", search);
        if (role) params.set("role", role);

        const response = await apiRequest(
          `/api/user/search?${params.toString()}`,
          { signal: controller.signal }
        );
        const pageData = response.data;

        if (!Array.isArray(pageData?.docs)) {
          throw new Error("The server returned an invalid user list.");
        }

        if (!controller.signal.aborted) {
          setUsers(pageData.docs);
          setTotalDocs(Number(pageData.totalDocs) || 0);
          setTotalPages(Math.max(1, Number(pageData.totalPages) || 1));
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load users.");
          setUsers([]);
          setTotalDocs(0);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadUsers();
    return () => controller.abort();
  }, [page, search, role, reloadKey]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleRoleChange = (event) => {
    setPage(1);
    setRole(event.target.value);
  };

  return (
    <section className="admin-section people-admin">
      <div className="dashboard-heading">
        <div>
          <h1>Users</h1>
          <p>Browse marketplace accounts and their roles.</p>
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
            <span>Role</span>
            <select value={role} onChange={handleRoleChange}>
              {roleOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="people-list-heading">
          <div>
            <h2>User directory</h2>
            <p>
              {loading
                ? "Loading users…"
                : `${totalDocs} ${totalDocs === 1 ? "user" : "users"} found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="people-state" role="status">
            <LoaderCircle size={22} className="people-spinning" />
            <span>Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="people-state">
            <UsersRound size={28} />
            <strong>No users found</strong>
            <span>Try changing the search or role filter.</span>
          </div>
        ) : (
          <div className="people-table-wrap">
            <table className="admin-table people-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Role</th>
                  <th scope="col">Seller status</th>
                  <th scope="col">Account</th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const sellerStatus = user.sellerStatus || "none";
                  const active = user.isActive !== false;
                  return (
                    <tr key={user._id}>
                      <td>
                        <div className="people-name-cell">
                          {user.avatar?.url ? (
                            <img
                              className="people-avatar people-avatar-image"
                              src={user.avatar.url}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className="people-avatar" aria-hidden="true">
                              {(user.name || "?").trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                          <strong>{user.name || "Unnamed user"}</strong>
                        </div>
                      </td>
                      <td>{user.email || "—"}</td>
                      <td>{user.phone || "—"}</td>
                      <td>
                        <span className={`people-role ${user.role || "unknown"}`}>
                          {user.role || "Unknown"}
                        </span>
                      </td>
                      <td>
                        <span className={`people-status ${sellerStatus}`}>
                          {sellerStatusLabels[sellerStatus] || sellerStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`people-status ${active ? "active" : "inactive"}`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
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
