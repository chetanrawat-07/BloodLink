import { useCallback, useEffect, useState } from "react";
import { demoUsers } from "./data.js";

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

function seedUsersIfEmpty() {
  const users = lsGet(USERS_KEY, null);
  if (users) return;
  lsSet(USERS_KEY, demoUsers);
}

function getUsers() {
  return lsGet(USERS_KEY, []);
}

export function useAuth() {
  const [session, setSessionState] = useState(() => {
    seedUsersIfEmpty();
    return lsGet(SESSION_KEY, null);
  });

  const user = session ? getUsers().find((u) => u.id === session.userId) || null : null;

  const setSession = useCallback((s) => {
    lsSet(SESSION_KEY, s);
    setSessionState(s);
  }, []);

  const login = useCallback(
    (email, password, role) => {
      const match = getUsers().find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password && u.role === role
      );
      if (!match) return { ok: false, error: `No ${role === "centre" ? "Blood Centre" : "Donor"} account matches that email and password.` };
      setSession({ userId: match.id });
      return { ok: true, user: match };
    },
    [setSession]
  );

  const signup = useCallback(
    ({ name, email, password, role, facility }) => {
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
      };
      users.push(newUser);
      lsSet(USERS_KEY, users);
      setSession({ userId: newUser.id });
      return { ok: true, user: newUser };
    },
    [setSession]
  );

  const logout = useCallback(() => {
    setSession(null);
  }, [setSession]);

  return { user, login, signup, logout };
}
