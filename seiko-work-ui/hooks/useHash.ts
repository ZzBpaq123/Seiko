"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const getHash = () => window.location.hash;
const getServerHash = () => "";

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" && window.location.hash && window.location.hash !== "#") clearHash();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("hashchange", emit);
    window.addEventListener("keydown", onKeyDown);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("hashchange", emit);
      window.removeEventListener("keydown", onKeyDown);
    }
  };
}

export function useHash() {
  return useSyncExternalStore(subscribe, getHash, getServerHash);
}

export function usePanelOpen(route: string) {
  return useSyncExternalStore(subscribe, () => getHash() === route, () => false);
}

export function useIsHome() {
  return useSyncExternalStore(subscribe, () => !getHash() || getHash() === "#", () => true);
}

export function clearHash() {
  history.pushState(null, "", window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
