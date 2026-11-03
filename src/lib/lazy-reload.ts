import { lazy, type ComponentType } from "react";

const KEY = "foodhub-chunk-reload";

// After a new publish, old asset files disappear; a page opened earlier then fails
// to load a screen. Reload once to fetch the fresh version instead of a blank screen.
export function lazyWithReload<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
      return mod;
    } catch (error) {
      if (typeof window !== "undefined" && !sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
