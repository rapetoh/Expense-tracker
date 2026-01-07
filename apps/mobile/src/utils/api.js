import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`;

function resolveUrl(path) {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // In native (Expo Go / TestFlight), relative URLs like "/api" or "/integrations"
  // will NOT resolve to your backend. We must use a full base URL.
  // Prefer the proxy URL when available since it is reachable from physical devices.
  const proxyBase = process.env.EXPO_PUBLIC_PROXY_BASE_URL;
  const base = process.env.EXPO_PUBLIC_BASE_URL;

  const chosenBase = Platform.OS === "web" ? base : proxyBase || base;

  if (chosenBase && path.startsWith("/")) {
    const trimmed = chosenBase.endsWith("/")
      ? chosenBase.slice(0, -1)
      : chosenBase;
    return `${trimmed}${path}`;
  }

  return path;
}

export async function apiFetchJson(
  path,
  { method = "GET", deviceId, body, headers, responseType } = {},
) {
  const requestHeaders = {
    ...(headers || {}),
  };

  // Add JWT token if authenticated
  try {
    const authData = await SecureStore.getItemAsync(authKey);
    if (authData) {
      const auth = JSON.parse(authData);
      if (auth?.jwt) {
        requestHeaders["Authorization"] = `Bearer ${auth.jwt}`;
      }
    }
  } catch (e) {
    // Ignore errors reading auth
  }

  // Add device ID as fallback (for backward compatibility or when not authenticated)
  if (deviceId) {
    requestHeaders["x-device-id"] = deviceId;
  }

  let requestBody = body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  } else if (body instanceof FormData) {
    // Don't set Content-Type for FormData, let the browser set it with boundary
    delete requestHeaders["Content-Type"];
  }

  const url = resolveUrl(path);

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      // Clear auth on 401
      try {
        await SecureStore.deleteItemAsync(authKey);
      } catch (e) {
        // Ignore
      }
      const text = await response.text().catch(() => "");
      const error = new Error(
        `Authentication required. Please sign in again.${text ? `: ${text}` : ""}`,
      );
      error.status = 401;
      throw error;
    }

    const text = await response.text().catch(() => "");
    throw new Error(
      `When fetching ${path}, the response was [${response.status}] ${response.statusText}${text ? `: ${text}` : ""}`,
    );
  }

  if (responseType === "blob" || responseType === "text") {
    return response;
  }

  const data = await response.json().catch(() => null);
  return data;
}

export function resolveApiUrl(path) {
  return resolveUrl(path);
}

/**
 * Get authentication headers (JWT token) for API requests
 * Returns an object with Authorization header if JWT is available
 */
export async function getAuthHeaders() {
  const headers = {};
  try {
    const authData = await SecureStore.getItemAsync(authKey);
    if (authData) {
      const auth = JSON.parse(authData);
      if (auth?.jwt) {
        headers["Authorization"] = `Bearer ${auth.jwt}`;
      }
    }
  } catch (e) {
    // Ignore errors reading auth
  }
  return headers;
}

export function formatMoney(cents, currency = "USD") {
  const safe = Number.isFinite(cents) ? cents : 0;
  const dollars = safe / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(dollars);
  } catch {
    return `$${dollars.toFixed(2)}`;
  }
}

export function toCentsFromLooseNumber(value) {
  if (value === null || value === undefined) return 0;
  const asNumber =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(asNumber)) return 0;
  return Math.round(asNumber * 100);
}
