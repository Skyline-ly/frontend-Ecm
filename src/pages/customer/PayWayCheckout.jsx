import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from "../../lib/api";
import "./PayWayCheckout.css";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

function getQrSource(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  const image = value.trim();
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(image)) return image;
  if (/^[a-z0-9+/=\r\n]+$/i.test(image)) {
    return `data:image/png;base64,${image}`;
  }

  try {
    return new URL(image).protocol === "https:" ? image : "";
  } catch {
    return "";
  }
}

function getDeepLink(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const url = new URL(value);
    return ["https:", "abapay:", "abamobile:", "aba:", "intent:"].includes(url.protocol)
      ? value
      : "";
  } catch {
    return "";
  }
}

async function readJsonResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }
  return data;
}

export default function PayWayCheckout() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [statusError, setStatusError] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const createPayment = async () => {
    setCreating(true);
    setError("");
    setPayment(null);
    setPaymentStatus("");
    setStatusError("");
    setTransactionId("");

    try {
      const response = await fetch(`${API_URL}/create-payment`, { method: "POST" });
      const data = await readJsonResponse(response);

      if (data.status?.code !== "00") {
        throw new Error(data.status?.message || "PayWay could not create the payment.");
      }
      if (!data.tran_id) {
        throw new Error("PayWay did not return a transaction ID.");
      }

      setPayment(data);
      setTransactionId(data.tran_id);
      setPaymentStatus("Waiting for payment...");
    } catch (requestError) {
      setError(requestError.message || "Unable to create the payment.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!transactionId) return undefined;

    let active = true;
    let timeoutId;
    let attempts = 0;

    const checkStatus = async () => {
      if (!active) return;
      if (attempts >= MAX_ATTEMPTS) {
        setPaymentStatus("Still pending — stopped checking. Refresh to check again.");
        return;
      }

      timeoutId = window.setTimeout(async () => {
        attempts += 1;
        try {
          const response = await fetch(`${API_URL}/check-payment-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tran_id: transactionId }),
          });
          const data = await readJsonResponse(response);

          if (data.status?.code !== "00") {
            throw new Error(data.status?.message || "Unable to check payment status.");
          }

          const status = data.data?.payment_status;
          if (status && String(status).toUpperCase() !== "PENDING") {
            if (active) setPaymentStatus(`Payment status: ${status}`);
            return;
          }

          if (active) checkStatus();
        } catch (requestError) {
          if (active) {
            setStatusError(requestError.message || "Unable to check payment status.");
          }
        }
      }, POLL_INTERVAL_MS);
    };

    checkStatus();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [transactionId]);

  const qrSource = getQrSource(payment?.qrImage);
  const deepLink = getDeepLink(payment?.abapay_deeplink);

  return (
    <section className="customer-page payway-page">
      <div className="customer-page-heading">
        <div>
          <span className="eyebrow">PAYWAY SANDBOX</span>
          <h1>Test checkout</h1>
          <p>Generate a $1.00 test payment and scan it with ABA Mobile.</p>
        </div>
        <Link className="text-link" to="/cart">
          <ArrowLeft size={15} /> Back to cart
        </Link>
      </div>

      <div className="payway-card">
        <div className="payway-card-icon"><QrCode size={22} /></div>
        <div>
          <h2>ABA PayWay test payment</h2>
          <p>This sandbox payment is separate from any order in your cart.</p>
        </div>
        <button
          className="primary-button payway-create-button"
          type="button"
          onClick={createPayment}
          disabled={creating}
        >
          {creating ? <><LoaderCircle className="spin" size={17} /> Creating payment...</> : "Pay Now ($1.00 test)"}
        </button>

        {error && <p className="payway-error" role="alert">{error}</p>}

        {payment && (
          <div className="payway-result">
            <p>Scan with the ABA Mobile app, or open the deep link on a phone:</p>
            {qrSource && <img className="payway-qr" src={qrSource} alt="PayWay KHQR code" width="250" height="250" />}
            {deepLink && <a className="payway-deep-link" href={deepLink}>Open in ABA Mobile</a>}
            {!qrSource && !deepLink && (
              <p className="payway-error" role="alert">PayWay created the payment but did not return a QR code or ABA Mobile link.</p>
            )}
            {paymentStatus && <p className="payway-status" role="status">{paymentStatus}</p>}
            {statusError && <p className="payway-error" role="alert">Status check failed: {statusError}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
