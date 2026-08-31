"use client";

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "bankbid_favorites";

// Single in-memory source of truth, shared by every component that calls
// useFavorites() — this is what fixes the bug where sibling PropertyCards
// each had their own stale copy of favorites and overwrote each other's
// localStorage writes when starred back to back. All instances now read
// and write through this one store instead of independent useState calls.
let store = {};
let initialized = false;
const listeners = new Set();

function loadFromStorage() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) -- fail silently
  }
}

function ensureInitialized() {
  if (!initialized && typeof window !== "undefined") {
    store = loadFromStorage();
    initialized = true;
  }
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureInitialized();
  return store;
}

function getServerSnapshot() {
  return {}; // SSR has no localStorage -- always empty on the server
}

function toggleFavorite(listing) {
  ensureInitialized();
  const next = { ...store };
  if (next[listing.id]) {
    delete next[listing.id];
  } else {
    next[listing.id] = listing;
  }
  store = next;
  persist();
  emitChange();
}

function removeFavorite(id) {
  ensureInitialized();
  const next = { ...store };
  delete next[id];
  store = next;
  persist();
  emitChange();
}

// Cross-TAB sync (separate browser tabs/windows) -- same-tab sync between
// sibling components is handled by the shared `store` + emitChange() above,
// not by this event, which never fires for writes made in the same tab.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      store = loadFromStorage();
      emitChange();
    }
  });
}

/**
 * Favorites are stored as { [listingId]: listingObject } in localStorage --
 * keyed by ID for O(1) lookup/toggle, storing the FULL listing snapshot
 * (not just the ID) so the Compare page can render cards without an extra
 * fetch. Trade-off: a favorited listing's data (price, status) can go
 * stale between when it was favorited and when it's compared, since it's
 * a snapshot rather than re-fetched. Fine for MVP.
 */
export default function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isFavorite = useCallback((id) => Boolean(favorites[id]), [favorites]);

  return {
    favorites,                       // { [id]: listing }
    favoritesList: Object.values(favorites),
    isFavorite,
    toggleFavorite,
    removeFavorite,
    loaded: initialized,
  };
}