"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "bankbid_favorites";

function readStorage() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(favorites) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) -- fail silently
  }
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
  const [favorites, setFavorites] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFavorites(readStorage());
    setLoaded(true);

    // Keep favorites in sync if changed in another tab/window
    function handleStorage(e) {
      if (e.key === STORAGE_KEY) {
        setFavorites(readStorage());
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const isFavorite = useCallback((id) => Boolean(favorites[id]), [favorites]);

  const toggleFavorite = useCallback((listing) => {
    if (!listing || !listing.id) return;
    
    setFavorites((prev) => {
      const next = { ...prev };
      if (next[listing.id]) {
        delete next[listing.id];
      } else {
        next[listing.id] = listing;
      }
      writeStorage(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = { ...prev };
      delete next[id];
      writeStorage(next);
      return next;
    });
  }, []);

  return {
    favorites,                       // { [id]: listing }
    favoritesList: Object.values(favorites),
    isFavorite,
    toggleFavorite,
    removeFavorite,
    loaded,
  };
}
