/* One place for every request, so errors are handled the same way and
   the admin token is attached without each caller remembering to. */

const TOKEN_KEY = "vouch_admin_token";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
};

export async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // The server is unreachable rather than unhappy — worth saying so plainly.
    const err = new Error("We could not reach the server. Check your connection and try again.");
    err.offline = true;
    throw err;
  }

  let data = {};
  try { data = await res.json(); } catch {
    throw new Error(`The server returned an unreadable response (HTTP ${res.status}).`);
  }

  if (!res.ok || !data.ok) {
    const err = new Error(data.error || `Something went wrong (HTTP ${res.status}).`);
    err.status = res.status;
    if (res.status === 401) setToken(null);   // stale token: drop it
    throw err;
  }

  return data;
}
