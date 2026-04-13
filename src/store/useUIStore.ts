import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface UIStoreState {
  /** Desktop sidebar narrow (icon rail) mode — persisted. */
  isSidebarCollapsed: boolean;
  /** Mobile full navigation drawer visibility — session only (not persisted). */
  isMobileDrawerOpen: boolean;
  /** Current route or in-app tab key for cross-screen UI context. */
  activeTab: string | null;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setMobileDrawerOpen: (value: boolean) => void;
  setActiveTab: (tab: string | null) => void;
}

/** One-time migration from legacy `coachbase-sidebar-collapsed` localStorage flag. */
function migrateLegacySidebarFlag(): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem("coachbase-ui")) return;
    const legacy = localStorage.getItem("coachbase-sidebar-collapsed");
    if (legacy === "1") {
      localStorage.setItem(
        "coachbase-ui",
        JSON.stringify({
          state: { isSidebarCollapsed: true },
          version: 0,
        }),
      );
    }
  } catch {
    /* ignore */
  }
}

migrateLegacySidebarFlag();

/** Synchronous read so first paint matches persisted sidebar (avoids CLS before persist rehydrates). */
function readPersistedSidebarCollapsed(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const raw = localStorage.getItem("coachbase-ui");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { isSidebarCollapsed?: boolean } };
      if (typeof parsed.state?.isSidebarCollapsed === "boolean") return parsed.state.isSidebarCollapsed;
    }
    return localStorage.getItem("coachbase-sidebar-collapsed") === "1";
  } catch {
    return false;
  }
}

export const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: readPersistedSidebarCollapsed(),
      isMobileDrawerOpen: false,
      activeTab: null,
      setSidebarCollapsed: (value) => set({ isSidebarCollapsed: value }),
      toggleSidebarCollapsed: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
      setMobileDrawerOpen: (value) => set({ isMobileDrawerOpen: value }),
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: "coachbase-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    },
  ),
);
