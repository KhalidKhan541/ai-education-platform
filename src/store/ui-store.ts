import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type Theme = "light" | "dark" | "system";
type ModalId =
  | "enroll"
  | "payment"
  | "certificate"
  | "settings"
  | "profile"
  | "confirm"
  | "video"
  | "image-preview"
  | "quiz-submit"
  | "grade-assignment"
  | "coupon"
  | "share"
  | "report"
  | "delete-confirm"
  | string;

interface ModalState {
  isOpen: boolean;
  data?: unknown;
  onClose?: () => void;
}

interface UIState {
  // Theme
  theme: Theme;
  resolvedTheme: "light" | "dark";

  // Modals
  modals: Record<ModalId, ModalState>;

  // Toasts
  toasts: Toast[];

  // Loading states
  globalLoading: boolean;
  pageLoading: boolean;

  // Breadcrumbs
  breadcrumbs: Breadcrumb[];

  // Search
  isSearchOpen: boolean;
  searchQuery: string;
  recentSearches: string[];

  // Command palette
  isCommandPaletteOpen: boolean;

  // Notifications panel
  isNotificationsOpen: boolean;

  // Layout
  headerHeight: number;
  sidebarWidth: number;
  contentWidth: number;

  // Viewport
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  viewportWidth: number;
  viewportHeight: number;

  // Scroll
  scrollPosition: Record<string, number>;

  // Actions - Theme
  setTheme: (theme: Theme) => void;
  setResolvedTheme: (theme: "light" | "dark") => void;

  // Actions - Modals
  openModal: (id: ModalId, data?: unknown) => void;
  closeModal: (id: ModalId) => void;
  closeAllModals: () => void;
  isModalOpen: (id: ModalId) => boolean;
  getModalData: <T = unknown>(id: ModalId) => T | undefined;

  // Actions - Toasts
  addToast: (toast: Omit<Toast, "id" | "createdAt">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, options?: Partial<Toast>) => void;
  error: (message: string, options?: Partial<Toast>) => void;
  warning: (message: string, options?: Partial<Toast>) => void;
  info: (message: string, options?: Partial<Toast>) => void;

  // Actions - Loading
  setGlobalLoading: (loading: boolean) => void;
  setPageLoading: (loading: boolean) => void;

  // Actions - Breadcrumbs
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;
  clearBreadcrumbs: () => void;

  // Actions - Search
  setIsSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  toggleSearch: () => void;

  // Actions - Command Palette
  setIsCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Actions - Notifications
  setIsNotificationsOpen: (open: boolean) => void;
  toggleNotifications: () => void;

  // Actions - Layout
  setHeaderHeight: (height: number) => void;
  setSidebarWidth: (width: number) => void;
  setContentWidth: (width: number) => void;

  // Actions - Viewport
  setViewport: (width: number, height: number) => void;

  // Actions - Scroll
  setScrollPosition: (key: string, position: number) => void;
  getScrollPosition: (key: string) => number;

  // Actions - Reset
  resetUI: () => void;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  createdAt: number;
}

interface Breadcrumb {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

const initialState = {
  theme: "system" as Theme,
  resolvedTheme: "light" as "light" | "dark",
  modals: {} as Record<ModalId, ModalState>,
  toasts: [] as Toast[],
  globalLoading: false,
  pageLoading: false,
  breadcrumbs: [] as Breadcrumb[],
  isSearchOpen: false,
  searchQuery: "",
  recentSearches: [] as string[],
  isCommandPaletteOpen: false,
  isNotificationsOpen: false,
  headerHeight: 64,
  sidebarWidth: 280,
  contentWidth: 0,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  viewportWidth: 1200,
  viewportHeight: 800,
  scrollPosition: {} as Record<string, number>,
};

let toastCounter = 0;

export const useUIStore = create<UIState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Theme
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),

      setResolvedTheme: (theme) =>
        set((state) => {
          state.resolvedTheme = theme;
        }),

      // Modals
      openModal: (id, data) =>
        set((state) => {
          state.modals[id] = { isOpen: true, data };
          // Close command palette if opening a modal
          if (state.isCommandPaletteOpen) {
            state.isCommandPaletteOpen = false;
          }
        }),

      closeModal: (id) =>
        set((state) => {
          const modal = state.modals[id];
          if (modal) {
            modal.isOpen = false;
            modal.data = undefined;
            modal.onClose?.();
          }
        }),

      closeAllModals: () =>
        set((state) => {
          for (const id of Object.keys(state.modals)) {
            state.modals[id].isOpen = false;
            state.modals[id].data = undefined;
          }
        }),

      isModalOpen: (id) => {
        return get().modals[id]?.isOpen || false;
      },

      getModalData: (id) => {
        return get().modals[id]?.data;
      },

      // Toasts
      addToast: (toast) =>
        set((state) => {
          const id = `toast_${++toastCounter}`;
          state.toasts.push({
            ...toast,
            id,
            createdAt: Date.now(),
          });
        }),

      removeToast: (id) =>
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        }),

      clearToasts: () =>
        set((state) => {
          state.toasts = [];
        }),

      success: (message, options) =>
        get().addToast({ type: "success", message, ...options }),

      error: (message, options) =>
        get().addToast({
          type: "error",
          message,
          duration: 8000,
          ...options,
        }),

      warning: (message, options) =>
        get().addToast({
          type: "warning",
          message,
          duration: 6000,
          ...options,
        }),

      info: (message, options) =>
        get().addToast({ type: "info", message, ...options }),

      // Loading
      setGlobalLoading: (loading) =>
        set((state) => {
          state.globalLoading = loading;
        }),

      setPageLoading: (loading) =>
        set((state) => {
          state.pageLoading = loading;
        }),

      // Breadcrumbs
      setBreadcrumbs: (breadcrumbs) =>
        set((state) => {
          state.breadcrumbs = breadcrumbs;
        }),

      addBreadcrumb: (breadcrumb) =>
        set((state) => {
          state.breadcrumbs.push(breadcrumb);
        }),

      clearBreadcrumbs: () =>
        set((state) => {
          state.breadcrumbs = [];
        }),

      // Search
      setIsSearchOpen: (open) =>
        set((state) => {
          state.isSearchOpen = open;
        }),

      setSearchQuery: (query) =>
        set((state) => {
          state.searchQuery = query;
        }),

      addRecentSearch: (query) =>
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return;
          state.recentSearches = [
            trimmed,
            ...state.recentSearches.filter((s) => s !== trimmed),
          ].slice(0, 10);
        }),

      clearRecentSearches: () =>
        set((state) => {
          state.recentSearches = [];
        }),

      toggleSearch: () =>
        set((state) => {
          state.isSearchOpen = !state.isSearchOpen;
        }),

      // Command Palette
      setIsCommandPaletteOpen: (open) =>
        set((state) => {
          state.isCommandPaletteOpen = open;
        }),

      toggleCommandPalette: () =>
        set((state) => {
          state.isCommandPaletteOpen = !state.isCommandPaletteOpen;
        }),

      // Notifications
      setIsNotificationsOpen: (open) =>
        set((state) => {
          state.isNotificationsOpen = open;
        }),

      toggleNotifications: () =>
        set((state) => {
          state.isNotificationsOpen = !state.isNotificationsOpen;
        }),

      // Layout
      setHeaderHeight: (height) =>
        set((state) => {
          state.headerHeight = height;
        }),

      setSidebarWidth: (width) =>
        set((state) => {
          state.sidebarWidth = width;
        }),

      setContentWidth: (width) =>
        set((state) => {
          state.contentWidth = width;
        }),

      // Viewport
      setViewport: (width, height) =>
        set((state) => {
          state.viewportWidth = width;
          state.viewportHeight = height;
          state.isMobile = width < 640;
          state.isTablet = width >= 640 && width < 1024;
          state.isDesktop = width >= 1024;
        }),

      // Scroll
      setScrollPosition: (key, position) =>
        set((state) => {
          state.scrollPosition[key] = position;
        }),

      getScrollPosition: (key) => {
        return get().scrollPosition[key] || 0;
      },

      // Reset
      resetUI: () =>
        set((state) => {
          state.modals = {};
          state.toasts = [];
          state.globalLoading = false;
          state.pageLoading = false;
          state.breadcrumbs = [];
          state.isSearchOpen = false;
          state.searchQuery = "";
          state.isCommandPaletteOpen = false;
          state.isNotificationsOpen = false;
        }),
    })),
    { name: "UIStore" }
  )
);

// Selectors
export const selectTheme = (state: UIState) => state.theme;
export const selectResolvedTheme = (state: UIState) => state.resolvedTheme;
export const selectToasts = (state: UIState) => state.toasts;
export const selectBreadcrumbs = (state: UIState) => state.breadcrumbs;
export const selectIsSearchOpen = (state: UIState) => state.isSearchOpen;
export const selectIsCommandPaletteOpen = (state: UIState) =>
  state.isCommandPaletteOpen;
export const selectIsNotificationsOpen = (state: UIState) =>
  state.isNotificationsOpen;
export const selectViewport = (state: UIState) => ({
  width: state.viewportWidth,
  height: state.viewportHeight,
  isMobile: state.isMobile,
  isTablet: state.isTablet,
  isDesktop: state.isDesktop,
});
export const selectGlobalLoading = (state: UIState) => state.globalLoading;
export const selectPageLoading = (state: UIState) => state.pageLoading;
export const selectModalOpen = (id: ModalId) => (state: UIState) =>
  state.modals[id]?.isOpen || false;
