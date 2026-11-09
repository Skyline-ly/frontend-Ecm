import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";

const initialForm = {
  shopName: "",
  shopLocation: "",
  phone: "",
  cardId: "",
};

export default function BecomeSeller() {
  const [form, setForm] = useState(initialForm);
  const [avatar, setAvatar] = useState(null);
  const [idCardPhoto, setIdCardPhoto] = useState(null);
  const [sellerStatus, setSellerStatus] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/api/user/profile")
      .then((response) => {
        if (active) {
          setSellerStatus(response.data?.sellerStatus || "none");
          setForm((current) => ({
            ...current,
            phone: response.data?.phone || "",
          }));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "Unable to check your application status.");
        }
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!avatar || !idCardPhoto) {
      setError("Select both your profile photo and identity card photo.");
      return;
    }

    const formData = new FormData();
    formData.append("shopName", form.shopName.trim());
    formData.append("shopLocation", form.shopLocation.trim());
    formData.append("phone", form.phone.trim());
    formData.append("cardId", form.cardId.trim());
    formData.append("avatar", avatar);
    formData.append("idCardPhoto", idCardPhoto);

    setSubmitting(true);
    try {
      const response = await apiRequest("/api/user/become-seller", {
        method: "POST",
        body: formData,
      });
      setSellerStatus(response.data?.sellerStatus || "pending");
      setNotice(response.message || "Your seller application was submitted.");
      setForm(initialForm);
      setAvatar(null);
      setIdCardPhoto(null);
      event.target.reset();
    } catch (requestError) {
      setError(requestError.message || "Unable to submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="customer-state" role="status">
        <LoaderCircle className="spin" size={25} /> Checking your application…
      </div>
    );
  }

  return (
    <section className="customer-page">
      <div className="customer-page-heading">
        <div>
          <span className="eyebrow">GROW WITH SHOPORA</span>
          <h1>Become a seller</h1>
          <p>Tell us about your shop and submit your details for review.</p>
        </div>
        <Link className="text-link" to="/account">
          <ArrowLeft size={15} /> Back to your account
        </Link>
      </div>

      {notice && <p className="store-notice" role="status">{notice}</p>}
      {error && <div className="store-alert" role="alert">{error}</div>}

      {sellerStatus === "pending" ? (
        <div className="account-card seller-application-status" role="status">
          <span className="account-avatar"><Store size={22} /></span>
          <div>
            <h2>Application under review</h2>
            <p>Your seller application has been submitted. We’ll update your account after it’s reviewed.</p>
          </div>
        </div>
      ) : sellerStatus === "approved" ? (
        <div className="account-card seller-application-status" role="status">
          <span className="account-avatar"><Store size={22} /></span>
          <div>
            <h2>Your seller application is approved</h2>
            <p>Your seller workspace is ready.</p>
            <Link className="primary-button seller-application-link" to="/seller">
              Go to seller workspace <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <form className="account-card seller-application-form" onSubmit={handleSubmit}>
          <div className="account-card-heading">
            <span className="account-avatar"><Store size={22} /></span>
            <div>
              <h2>Shop and contact details</h2>
              <p>Complete every field to send your application to our team.</p>
            </div>
          </div>

          {sellerStatus === "rejected" && (
            <p className="seller-application-rejected">
              Your previous application was not approved. You can update your details and apply again.
            </p>
          )}

          <label htmlFor="seller-shop-name">Shop name</label>
          <input
            id="seller-shop-name"
            name="shopName"
            value={form.shopName}
            onChange={handleChange}
            maxLength={100}
            autoComplete="organization"
            required
          />

          <label htmlFor="seller-shop-location">Shop location</label>
          <textarea
            id="seller-shop-location"
            name="shopLocation"
            value={form.shopLocation}
            onChange={handleChange}
            rows={3}
            maxLength={300}
            autoComplete="street-address"
            required
          />

          <label htmlFor="seller-phone">Phone number</label>
          <input
            id="seller-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            maxLength={30}
            autoComplete="tel"
            required
          />

          <label htmlFor="seller-card-id">Identity card number</label>
          <input
            id="seller-card-id"
            name="cardId"
            value={form.cardId}
            onChange={handleChange}
            maxLength={100}
            autoComplete="off"
            required
          />

          <label htmlFor="seller-avatar">Profile photo</label>
          <input
            id="seller-avatar"
            type="file"
            accept="image/jpeg,image/png"
            onChange={(event) => setAvatar(event.target.files?.[0] || null)}
            required
          />
          <small className="seller-application-file-note">
            JPG or PNG, up to 5 MB.
          </small>

          <label htmlFor="seller-id-card-photo">Identity card photo</label>
          <input
            id="seller-id-card-photo"
            type="file"
            accept="image/jpeg,image/png"
            onChange={(event) => setIdCardPhoto(event.target.files?.[0] || null)}
            required
          />
          <small className="seller-application-file-note">
            Use a clear JPG or PNG image, up to 5 MB. Your identity details are used for application review.
          </small>

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? (
              <>Submitting… <LoaderCircle className="spin" size={16} /></>
            ) : (
              <>Submit application <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      )}
    </section>
  );
}
