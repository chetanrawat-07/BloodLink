import { useCallback, useEffect, useState } from "react";
import { demoUsers } from "./data.js";
import { getState } from "./store.js";

const USERS_KEY = "bloodlink_bl_users";
const SESSION_KEY = "bloodlink_bl_session";

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function uid() {
  return "u" + Math.random().toString(36).slice(2, 9);
}

// Always refresh the demo accounts (so old browsers pick up new demo fields), keep self-registered ones.
function seedUsers() {
  const stored = lsGet(USERS_KEY, []);
  const own = stored.filter((u) => !demoUsers.some((d) => d.id === u.id));
  // keep an administrator's deactivation of a demo account across reloads
  const demos = demoUsers.map((d) => ({ ...d, disabled: stored.find((u) => u.id === d.id)?.disabled || undefined }));
  lsSet(USERS_KEY, [...demos, ...own]);
}

export function getUsers() {
  return lsGet(USERS_KEY, []);
}

export function saveUsers(users) {
  return lsSet(USERS_KEY, users);
}

const sessionMs = () => (getState().config.sessionMinutes || 30) * 60000;

// Session expires after the configured idle time (System Configuration → session minutes).
function readSession() {
  const s = lsGet(SESSION_KEY, null);
  if (s && s.exp && s.exp < Date.now()) {
    lsSet(SESSION_KEY, null);
    return null;
  }
  return s;
}

export function useAuth() {
  const [session, setSessionState] = useState(() => {
    seedUsers();
    return readSession();
  });

  const found = session ? getUsers().find((u) => u.id === session.userId) || null : null;
  const user = found && !found.disabled ? found : null;

  const setSession = useCallback((s) => {
    lsSet(SESSION_KEY, s);
    setSessionState(s);
  }, []);

  const login = useCallback(
    (email, password, role) => {
      // the staff tab ("centre") covers every official role; the donor tab only donors
      const match = getUsers().find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password && (role === "donor" ? u.role === "donor" : u.role !== "donor")
      );
      if (!match) return { ok: false, error: role === "centre" ? "No Blood Centre account matches that email and password." : "No Donor account matches that email and password." };
      if (match.disabled) return { ok: false, error: "This account has been deactivated by an administrator." };
      setSession({ userId: match.id, exp: Date.now() + sessionMs() });
      return { ok: true, user: match };
    },
    [setSession]
  );

  const signup = useCallback(
    ({ name, email, password, role, facility, region, bloodGroup }) => {
      const users = getUsers();
      const normalizedEmail = email.trim().toLowerCase();
      if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        return { ok: false, error: "An account with that email already exists — try logging in instead." };
      }
      const newUser = {
        id: uid(),
        name: name.trim(),
        email: normalizedEmail,
        password,
        role,
        facility: role === "donor" ? null : facility.trim() || "Unnamed facility",
        region,
        ...(role === "donor" && { bloodGroup, history: [] }),
      };
      users.push(newUser);
      lsSet(USERS_KEY, users);
      setSession({ userId: newUser.id, exp: Date.now() + sessionMs() });
      return { ok: true, user: newUser };
    },
    [setSession]
  );

  const logout = useCallback(() => {
    setSession(null);
  }, [setSession]);

  // idle timeout: activity extends the session; a minute timer logs out once it lapses
  useEffect(() => {
    if (!session) return;
    let last = 0;
    const touch = () => {
      if (Date.now() - last < 30000) return;
      last = Date.now();
      lsSet(SESSION_KEY, { ...session, exp: Date.now() + sessionMs() });
    };
    const timer = setInterval(() => { if (!readSession()) setSessionState(null); }, 60000);
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    return () => { clearInterval(timer); window.removeEventListener("pointerdown", touch); window.removeEventListener("keydown", touch); };
  }, [session]);

  return { user, login, signup, logout };
}
