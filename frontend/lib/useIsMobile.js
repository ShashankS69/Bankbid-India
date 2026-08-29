"use client";

import { useEffect, useState } from "react";

// Matches the point where the desktop 3-column register layout (xl:grid-cols-...
// in app/page.js) kicks in. Below this width — phones and most tablets — the
// tabbed mobile layout takes over instead.
const MOBILE_BREAKPOINT_QUERY = "(max-width: 1279px)";

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(null); // null = not yet known (avoids flash)

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    setIsMobile(mql.matches);

    const handleChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
