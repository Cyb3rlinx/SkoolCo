"use client";

import { useEffect, type RefObject } from "react";

/** Calls `onOutside` when a pointer event lands outside the referenced node. */
export function useClickOutside(ref: RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function handle(event: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [ref, onOutside]);
}
