// Auth helpers — token + user live in localStorage (rt_token / rt_user).
// DashboardShell also reads the legacy userName / userSub keys, which we keep in sync.
import { api, getToken } from "./api";

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("rt_user"));
  } catch {
    return null;
  }
}

export { getToken };

export function isAuthed() {
  return !!getToken();
}

export async function login({ identifier, password, role }) {
  const { token, user } = await api.login({ identifier, password, role });
  localStorage.setItem("rt_token", token);
  localStorage.setItem("rt_user", JSON.stringify(user));
  localStorage.setItem("userName", user.name);

  // Subtitle under the name (e.g. "O+ · Hyderabad") for the top bar.
  try {
    const me = await api.getMe();
    const p = me.profile || {};
    let sub = "Blood Bank";
    if (user.role === "donor") {
      sub = [p.blood_group, p.city].filter(Boolean).join(" · ") || "Donor";
    } else if (user.role === "hospital") {
      sub = p.location || p.name || "Hospital";
    }
    localStorage.setItem("userSub", sub);
  } catch {
    localStorage.setItem(
      "userSub",
      user.role === "donor" ? "Donor" : user.role === "hospital" ? "Hospital" : "Blood Bank"
    );
  }
  return user;
}

export async function register(payload) {
  const { user } = await api.register(payload);
  return user;
}

export function logout() {
  localStorage.removeItem("rt_token");
  localStorage.removeItem("rt_user");
  localStorage.removeItem("userName");
  localStorage.removeItem("userSub");
  window.location.href = "/home";
}
