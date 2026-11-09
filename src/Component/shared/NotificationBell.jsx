import { useEffect, useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import "./NotificationBell.css";

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await apiRequest("/api/notifications?limit=50");
        if (!Array.isArray(response.data)) {
          throw new Error("The server returned an invalid notification list.");
        }
        if (active) {
          setNotifications(response.data);
          setUnreadCount(Number(response.unreadCount) || 0);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load notifications.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const markRead = async (notification) => {
    if (!notification.readAt) {
      try {
        await apiRequest(`/api/notifications/${notification._id}/read`, {
          method: "PATCH",
        });
        setNotifications((current) =>
          current.map((item) =>
            item._id === notification._id
              ? { ...item, readAt: new Date().toISOString() }
              : item
          )
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (requestError) {
        setError(requestError.message || "Unable to mark notification as read.");
        return;
      }
    }
    setOpen(false);
    if (notification.href) navigate(notification.href);
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/api/notifications/read-all", { method: "PATCH" });
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, readAt }))
      );
      setUnreadCount(0);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Unable to mark notifications as read.");
    }
  };

  return (
    <div className="notification-bell">
      <button
        className="notification-bell-button"
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-bell-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section
          className="notification-popover"
          aria-label="Notifications"
        >
          <div className="notification-popover-heading">
            <div>
              <strong>Notifications</strong>
              <span>{unreadCount} unread</span>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck size={15} /> Mark all read
            </button>
          </div>
          {error && <p className="notification-error" role="alert">{error}</p>}
          {loading ? (
            <div className="notification-empty">
              <LoaderCircle className="notification-spinner" size={18} />
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <p className="notification-empty">You&apos;re all caught up.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => (
                <li key={notification._id}>
                  <button
                    className={`notification-item ${notification.readAt ? "is-read" : "is-unread"}`}
                    type="button"
                    onClick={() => markRead(notification)}
                  >
                    <span className="notification-item-dot" />
                    <span className="notification-item-copy">
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                      <small>{formatTime(notification.createdAt)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
