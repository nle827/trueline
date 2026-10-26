"use client";

import { useEffect, useState } from "react";
import { useApp } from "./store";

/** True once the persisted demo has loaded from localStorage. Pages render a skeleton until then. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useApp.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
