/**
 * Django API Client
 *
 * Handles JWT authentication, token refresh, and API requests.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Token storage keys
const ACCESS_TOKEN_KEY = "bsc_access_token";
const REFRESH_TOKEN_KEY = "bsc_refresh_token";

// Token management
export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

// Refresh the access token
export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    setTokens(data.access, data.refresh);
    return data.access;
  } catch {
    clearTokens();
    return null;
  }
};

// API request helper with automatic token refresh
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> => {
  let accessToken = getAccessToken();

  const makeRequest = async (token: string | null): Promise<Response> => {
    const headers: HeadersInit = {
      ...options.headers,
    };

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
    }

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  let response = await makeRequest(accessToken);

  // If 401, try to refresh token and retry
  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await makeRequest(newToken);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      error: errorData.detail || errorData.message || "Request failed",
      status: response.status,
    };
  }

  const data = await response.json();
  return { data, status: response.status };
};

// Convenience methods
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),
};

// SSE streaming helper for chat
export const streamRequest = async (
  endpoint: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  onDone: (conversationId?: number) => void,
  onError: (error: string) => void,
  onChartData?: (chartData: any) => void
): Promise<void> => {
  const accessToken = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    onError(errorData.detail || errorData.error || "Stream request failed");
    return;
  }

  if (!response.body) {
    onError("No response body");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete lines
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      try {
        const data = JSON.parse(jsonStr);

        if (data.chunk) {
          onChunk(data.chunk);
        }

        if (data.chart_data && onChartData) {
          onChartData(data.chart_data);
        }

        if (data.done) {
          onDone(data.conversation_id);
          return;
        }

        if (data.error) {
          onError(data.error);
          return;
        }
      } catch {
        // Ignore parse errors, continue processing
      }
    }
  }

  // Process any remaining buffer
  if (buffer.startsWith("data: ")) {
    try {
      const data = JSON.parse(buffer.slice(6).trim());
      if (data.done) {
        onDone(data.conversation_id);
      }
    } catch {
      // Ignore
    }
  }
};

export default api;
