import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, QrCode } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { formatMoney } from "./customerUtils";
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

export default function PayWayCheckout() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [statusError, setStatusError] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(null);

  const createPayment = async () => {
    setCreating(true);
    setError("");
    setPayment(null);
    setPaymentStatus("");
    setStatusError("");
    setTransactionId("");

    if (!orderId) {
      setError("Order ID is missing. Return to your cart and choose Pay online with PayWay.");
      setCreating(false);
      return;
    }

    try {
      const data = await apiRequest(`/api/payment/orders/${encodeURIComponent(orderId)}/payway`, {
        method: "POST",
      });

      if (data.status?.code !== "00") {
        throw new Error(data.status?.message || "PayWay could not create the payment.");
      }
      if (!data.tran_id) {
        throw new Error("PayWay did not return a transaction ID.");
      }

      setPayment(data);
      setTransactionId(data.tran_id);
      setPaymentAmount(data.amount);
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
          const data = await apiRequest("/api/payment/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tran_id: transactionId }),
          });

          if (data.status?.code !== "00") {
            throw new Error(data.status?.message || "Unable to check payment status.");
          }

          const status = data.data?.payment_status;
          if (status && String(status).toUpperCase() !== "PENDING") {
            if (active) setPaymentStatus(`Payment status: ${data.paymentRecordStatus || status}`);
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
          <h1>Pay for your order</h1>
          <p>Your payment amount is calculated from your saved order total.</p>
        </div>
        <Link className="text-link" to="/cart">
          <ArrowLeft size={15} /> Back to cart
        </Link>
      </div>

      <div className="payway-card">
        <div className="payway-card-icon"><QrCode size={22} /></div>
        <div>
          <h2>ABA PayWay checkout</h2>
          <p>{paymentAmount ? `Order total: ${formatMoney(paymentAmount)}` : "Your order total will be shown with the payment details."}</p>
        </div>
        {!orderId && (
          <p className="payway-error" role="alert">
            Order ID is missing. Return to your cart and choose Pay online with PayWay.
          </p>
        )}
        {!payment && (
          <button
            className="primary-button payway-create-button"
            type="button"
            onClick={createPayment}
            disabled={creating || !orderId}
          >
            {creating ? <><LoaderCircle className="spin" size={17} /> Creating payment...</> : "Create PayWay payment"}
          </button>
        )}

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
