import { useEffect, useState } from "react";
import { ArrowRight, Heart, LoaderCircle, PackageCheck, ShoppingBag, Store, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";

export default function Account() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/api/user/profile")
      .then((result) => {
        if (active) {
          setProfile(result.data);
          setName(result.data?.name || "");
          setPhone(result.data?.phone || "");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load your account.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      setProfile((current) => ({ ...current, ...result.data }));
      try {
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        sessionStorage.setItem("user", JSON.stringify({ ...user, name: result.data.name }));
        window.dispatchEvent(new Event("shopora-auth-changed"));
      } catch {
        setError("Your profile was saved, but the local account display could not be refreshed.");
      }
      setNotice(result.message || "Your profile has been updated.");
    } catch (requestError) {
      setError(requestError.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="customer-state"><LoaderCircle className="spin" size={25} /> Loading your account...</div>;

  return (
    <section className="customer-page">
      <div className="customer-page-heading">
        <div><span className="eyebrow">A LITTLE ABOUT YOU</span><h1>Your account</h1><p>Manage your details and find your latest ShopEveryDay activity.</p></div>
      </div>
      {notice && <p className="store-notice" role="status">{notice}</p>}
      {error && <div className="store-alert" role="alert">{error}</div>}
      {profile && (
        <div className="account-layout">
          <form className="account-card" onSubmit={saveProfile}>
            <div className="account-card-heading"><span className="account-avatar"><UserRound size={22} /></span><div><h2>Personal details</h2><p>Your information, kept up to date.</p></div></div>
            <label htmlFor="account-name">Full name</label>
            <input id="account-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
            <label htmlFor="account-email">Email address</label>
            <input id="account-email" value={profile.email || ""} readOnly />
            <label htmlFor="account-phone">Phone number</label>
            <input id="account-phone" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" maxLength={30} placeholder="Add a phone number (optional)" />
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"} <ArrowRight size={16} /></button>
          </form>
          <aside className="account-shortcuts">
            <Link to="/orders"><span><PackageCheck size={20} /></span><div><strong>Your orders</strong><small>Track your recent purchases</small></div><ArrowRight size={17} /></Link>
            <Link to="/wishlist"><span><Heart size={20} /></span><div><strong>Your wishlist</strong><small>Keep an eye on favorites</small></div><ArrowRight size={17} /></Link>
            <Link to="/"><span><ShoppingBag size={20} /></span><div><strong>Browse the shop</strong><small>Find your next favorite thing</small></div><ArrowRight size={17} /></Link>
            {profile.role === "customer" && profile.sellerStatus !== "pending" && (
              <Link to="/become-seller">
                <span><Store size={20} /></span>
                <div>
                  <strong>{profile.sellerStatus === "rejected" ? "Reapply to sell" : "Become a seller"}</strong>
                  <small>Apply to open your ShopEveryDay store</small>
                </div>
                <ArrowRight size={17} />
              </Link>
            )}
            {profile.role === "customer" && profile.sellerStatus === "pending" && (
              <Link to="/become-seller">
                <span><Store size={20} /></span>
                <div><strong>Seller application</strong><small>Your application is under review</small></div>
                <ArrowRight size={17} />
              </Link>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
