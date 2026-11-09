import { API_URL } from "../../lib/api";

export async function publicRequest(path, options = {}) {
  const response = await fetch(
    `${API_URL.replace(/\/+$/, "")}${path}`,
    options
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}

export function formatMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
      }).format(amount)
    : "—";
}

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function productImage(product) {
  return product?.images?.[0]?.url || "";
}

export function productPrice(product, variant) {
  return variant?.discountPrice ?? variant?.price ??
    product?.discountPrice ?? product?.basePrice ?? 0;
}

export function getVariant(product, variantId) {
  return product?.variants?.find((variant) => variant._id === variantId);
}
