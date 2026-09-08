import { useState, useEffect, useCallback } from "react";

/**
 * Dispatch navigation event to keep all listening components in sync.
 */
export function navigate(to, { replace = false } = {}) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === to) return;

  if (replace) {
    window.history.replaceState(null, "", to);
  } else {
    window.history.pushState(null, "", to);
  }

  window.dispatchEvent(new CustomEvent("hexavision-navigate", { detail: { to } }));
}

/**
 * Role Route Guard: strictly enforces role boundaries.
 * - donor can only access /donor/*
 * - hospital can only access /hospital/*
 * - admin can only access /admin/*
 * - unauthenticated redirected to /login
 * - cross-role redirected to user's authorized dashboard
 */
export function getGuardedRoute(pathname = "/", user = null) {
  const cleanPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // 1. Unauthenticated users
  if (!user) {
    if (
      cleanPath.startsWith("/donor") ||
      cleanPath.startsWith("/hospital") ||
      cleanPath.startsWith("/admin")
    ) {
      return { allowed: false, redirect: "/login" };
    }
    return { allowed: true, path: cleanPath };
  }

  // 2. Authenticated user role resolution
  const role = String(user.role || "").toLowerCase();

  // If visiting login or register while authenticated, redirect to their role dashboard
  if (cleanPath === "/login" || cleanPath === "/register") {
    if (role === "donor") return { allowed: false, redirect: "/donor/dashboard" };
    if (role === "hospital") return { allowed: false, redirect: "/hospital/dashboard" };
    return { allowed: false, redirect: "/admin/dashboard" };
  }

  // If visiting root / while authenticated, redirect to their role dashboard
  if (cleanPath === "/" || cleanPath === "/dashboard") {
    if (role === "donor") return { allowed: false, redirect: "/donor/dashboard" };
    if (role === "hospital") return { allowed: false, redirect: "/hospital/dashboard" };
    return { allowed: false, redirect: "/admin/dashboard" };
  }

  // Strict Donor protection
  if (cleanPath.startsWith("/donor")) {
    if (role !== "donor") {
      if (role === "hospital") return { allowed: false, redirect: "/hospital/dashboard" };
      return { allowed: false, redirect: "/admin/dashboard" };
    }
    return { allowed: true, path: cleanPath };
  }

  // Strict Hospital protection
  if (cleanPath.startsWith("/hospital")) {
    if (role !== "hospital") {
      if (role === "donor") return { allowed: false, redirect: "/donor/dashboard" };
      return { allowed: false, redirect: "/admin/dashboard" };
    }
    return { allowed: true, path: cleanPath };
  }

  // Strict Admin protection
  if (cleanPath.startsWith("/admin")) {
    if (role !== "admin") {
      if (role === "donor") return { allowed: false, redirect: "/donor/dashboard" };
      if (role === "hospital") return { allowed: false, redirect: "/hospital/dashboard" };
    }
    return { allowed: true, path: cleanPath };
  }

  return { allowed: true, path: cleanPath };
}

/**
 * React Hook for listening to browser URL changes
 */
export function useRouter(user = null) {
  const [currentPath, setCurrentPath] = useState(() => {
    return typeof window !== "undefined" ? window.location.pathname : "/";
  });

  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hexavision-navigate", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hexavision-navigate", handleUrlChange);
    };
  }, []);

  // Enforce guarded route whenever path or user changes
  useEffect(() => {
    const guard = getGuardedRoute(currentPath, user);
    if (!guard.allowed && guard.redirect && guard.redirect !== currentPath) {
      navigate(guard.redirect, { replace: true });
    }
  }, [currentPath, user]);

  const goTo = useCallback((to, opts) => {
    navigate(to, opts);
  }, []);

  return {
    path: currentPath,
    navigate: goTo
  };
}
