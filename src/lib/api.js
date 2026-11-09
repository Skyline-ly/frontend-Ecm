
export const API_URL = (
  import.meta.env.VITE_API_URL || "https://ecmapi.onrender.com"
).replace(/\/+$/, "");

let refreshRequest = null;

// Refresh the access token using the HTTP-only refresh cookie
async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.accessToken) {
        throw new Error(
          data.message || "Unable to refresh your session."
        );
      }

      sessionStorage.setItem("accessToken", data.accessToken);

      window.dispatchEvent(new Event("shopora-auth-changed"));

      return data.accessToken;
    })().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

// Send an API request with the access token
async function requestWithToken(path, options = {}, token) {
  const headers = new Headers(options.headers || {});

  headers.set("Authorization", `Bearer ${token}`);

  // Set JSON content type unless the body is FormData.
  // Do not manually set Content-Type for FormData.
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed (${response.status}).`
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// Clear local authentication data
function clearSession() {
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("user");

  window.dispatchEvent(new Event("shopora-auth-changed"));
}

// Retry the original request with a refreshed token
async function retryWithToken(path, options, token) {
  try {
    return await requestWithToken(path, options, token);
  } catch (error) {
    if (error.status === 401) {
      clearSession();

      throw new Error(
        "Your session expired. Please sign in again.",
        { cause: error }
      );
    }

    throw error;
  }
}

// Main API request function
export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Please sign in to continue.");
  }

  try {
    return await requestWithToken(path, options, token);
  } catch (requestError) {
    // Only refresh when the access token has expired or is invalid.
    if (requestError.status !== 401) {
      throw requestError;
    }

    // Another request may already have refreshed the token.
    const currentToken = sessionStorage.getItem("accessToken");

    if (currentToken && currentToken !== token) {
      return retryWithToken(path, options, currentToken);
    }

    // Attempt to refresh the access token.
    let refreshedToken;

    try {
      refreshedToken = await refreshAccessToken();
    } catch (refreshError) {
      clearSession();

      throw new Error(
        "Your session expired. Please sign in again.",
        { cause: refreshError }
      );
    }

    // Retry the original request once.
    return retryWithToken(path, options, refreshedToken);
  }
}
