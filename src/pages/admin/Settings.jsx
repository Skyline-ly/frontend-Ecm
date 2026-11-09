import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  LoaderCircle,
  Save,
  UserRound,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import "./Settings.css";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await apiRequest("/api/user/profile", {
          signal: controller.signal,
        });
        if (!response.data || typeof response.data !== "object") {
          throw new Error("The server returned an invalid profile.");
        }

        if (!controller.signal.aborted) {
          setProfile(response.data);
          setName(response.data.name || "");
          setPhone(response.data.phone || "");
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load your profile.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProfile();
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      if (!response.data || typeof response.data !== "object") {
        throw new Error("The server returned an invalid profile update.");
      }

      setProfile((currentProfile) => ({ ...currentProfile, ...response.data }));
      setName(response.data.name || "");
      setPhone(response.data.phone || "");
      setNotice(response.message || "Profile updated successfully.");

      try {
        const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
        sessionStorage.setItem(
          "user",
          JSON.stringify({ ...storedUser, ...response.data })
        );
        window.dispatchEvent(new Event("shopora-auth-changed"));
      } catch (storageError) {
        setError(
          `Profile was saved, but the local session display could not be updated: ${storageError.message}`
        );
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    profile && (name !== (profile.name || "") || phone !== (profile.phone || ""));

  return (
    <section className="admin-section settings-admin">
      <div className="dashboard-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your administrator account details.</p>
        </div>
      </div>

      {error && (
        <div className="settings-message error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="settings-message success" role="status">
          <CheckCircle size={18} />
          <span>{notice}</span>
        </div>
      )}

      <div className="settings-grid">
        <section className="dashboard-panel settings-profile-panel">
          <div className="settings-panel-heading">
            <div className="settings-icon">
              <UserRound size={20} />
            </div>
            <div>
              <h2>Administrator profile</h2>
              <p>Update your account name and contact phone.</p>
            </div>
          </div>

          {loading ? (
            <div className="settings-state" role="status">
              <LoaderCircle size={21} className="settings-spinning" />
              <span>Loading your profile…</span>
            </div>
          ) : profile ? (
            <form className="settings-form" onSubmit={handleSubmit}>
              <label>
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  value={profile.email || ""}
                  autoComplete="email"
                  readOnly
                  disabled
                />
                <small>Email changes aren’t supported here.</small>
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  maxLength={30}
                  placeholder="Add a contact phone"
                />
              </label>
              <div className="settings-account-meta">
                <span>Account role</span>
                <strong>{profile.role || "Admin"}</strong>
              </div>
              <div className="settings-form-actions">
                <button
                  className="settings-save-button"
                  type="submit"
                  disabled={saving || !hasChanges}
                >
                  {saving ? (
                    <LoaderCircle size={16} className="settings-spinning" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="settings-state">
              <span>Your profile could not be loaded.</span>
            </div>
          )}
        </section>

        <aside className="dashboard-panel settings-scope-panel">
          <h2>Available settings</h2>
          <p>
            This page currently manages your administrator profile. Store-wide
            preferences such as branding, currency, shipping, and tax aren’t
            configurable because the backend has no settings API for them.
          </p>
        </aside>
      </div>
    </section>
  );
}
