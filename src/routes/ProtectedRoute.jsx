import { Link, Navigate, Outlet, useLocation } from "react-router-dom";

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const token = sessionStorage.getItem("accessToken");
  const user = getStoredUser();

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <main className="store-page access-denied">
        <p className="page-eyebrow">ACCESS RESTRICTED</p>
        <h1>Access Denied</h1>
        <Link className="primary-button" to="/">
          Return to store
        </Link>
      </main>
    );
  }

  return <Outlet />;
}
