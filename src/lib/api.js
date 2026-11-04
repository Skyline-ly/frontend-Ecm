export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(
    `${API_URL.replace(/\/+$/, "")}${path}`,
    {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}
