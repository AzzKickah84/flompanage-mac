import { useEffect, useRef } from "react";
import { useRefresh } from "../context/RefreshContext";

export function useRegisterRefresh(refresh: () => void | Promise<void>) {
  const { registerRefresh, unregisterRefresh } = useRefresh();
  const refreshRef = useRef(refresh);

  // Always keep the ref pointing to the latest refresh function,
  // so the registered wrapper never goes stale when deps (like filter) change.
  refreshRef.current = refresh;

  useEffect(() => {
    // This wrapper is a stable reference — registered once, never changes.
    // It delegates to refreshRef.current which always has the latest load fn.
    const wrapper = () => refreshRef.current();
    registerRefresh(wrapper);
    return () => unregisterRefresh(wrapper);
  }, [registerRefresh, unregisterRefresh]);
}
