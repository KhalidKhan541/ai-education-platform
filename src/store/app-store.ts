import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { User, UserRole, Notification } from "@/types";

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Global notifications
  notifications: Notification[];
  unreadCount: number;

  // App state
  isOnline: boolean;
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  currentPath: string;

  // Feature flags (cached client-side)
  featureFlags: Record<string, boolean>;

  // Session
  sessionId: string | null;
  lastActivityAt: number;

  // Actions - Auth
  setUser: (user: User | null) => void;
  login: (user: User, tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setNotifications: (notifications: Notification[]) => void;

  // Actions - UI
  setSidebarOpen: (value: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (value: boolean) => void;
  setCurrentPath: (path: string) => void;
  setOnline: (value: boolean) => void;

  // Actions - Feature Flags
  setFeatureFlag: (key: string, value: boolean) => void;
  setFeatureFlags: (flags: Record<string, boolean>) => void;

  // Actions - Session
  setSessionId: (id: string) => void;
  updateActivity: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  notifications: [],
  unreadCount: 0,
  isOnline: true,
  isSidebarOpen: true,
  isMobileMenuOpen: false,
  currentPath: "/",
  featureFlags: {},
  sessionId: null,
  lastActivityAt: Date.now(),
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Auth actions
        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = user !== null;
          }),

        login: (user, _tokens) =>
          set((state) => {
            state.user = user;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.sessionId = `session_${Date.now()}`;
            state.lastActivityAt = Date.now();
          }),

        logout: () =>
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.notifications = [];
            state.unreadCount = 0;
            state.sessionId = null;
            state.featureFlags = {};
          }),

        updateUser: (updates) =>
          set((state) => {
            if (state.user) {
              Object.assign(state.user, updates);
            }
          }),

        setAuthenticated: (value) =>
          set((state) => {
            state.isAuthenticated = value;
          }),

        setLoading: (value) =>
          set((state) => {
            state.isLoading = value;
          }),

        // Notification actions
        addNotification: (notification) =>
          set((state) => {
            const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            state.notifications.unshift({
              ...notification,
              id,
              createdAt: new Date().toISOString(),
            } as Notification);
            if (!notification.read) {
              state.unreadCount++;
            }
          }),

        markNotificationRead: (id) =>
          set((state) => {
            const notif = state.notifications.find((n) => n.id === id);
            if (notif && !notif.read) {
              notif.read = true;
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          }),

        markAllNotificationsRead: () =>
          set((state) => {
            state.notifications.forEach((n) => {
              n.read = true;
            });
            state.unreadCount = 0;
          }),

        removeNotification: (id) =>
          set((state) => {
            const index = state.notifications.findIndex((n) => n.id === id);
            if (index !== -1) {
              const wasUnread = !state.notifications[index].read;
              state.notifications.splice(index, 1);
              if (wasUnread) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            }
          }),

        clearNotifications: () =>
          set((state) => {
            state.notifications = [];
            state.unreadCount = 0;
          }),

        setNotifications: (notifications) =>
          set((state) => {
            state.notifications = notifications;
            state.unreadCount = notifications.filter((n) => !n.read).length;
          }),

        // UI actions
        setSidebarOpen: (value) =>
          set((state) => {
            state.isSidebarOpen = value;
          }),

        toggleSidebar: () =>
          set((state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
          }),

        setMobileMenuOpen: (value) =>
          set((state) => {
            state.isMobileMenuOpen = value;
          }),

        setCurrentPath: (path) =>
          set((state) => {
            state.currentPath = path;
          }),

        setOnline: (value) =>
          set((state) => {
            state.isOnline = value;
          }),

        // Feature flags
        setFeatureFlag: (key, value) =>
          set((state) => {
            state.featureFlags[key] = value;
          }),

        setFeatureFlags: (flags) =>
          set((state) => {
            state.featureFlags = { ...state.featureFlags, ...flags };
          }),

        // Session
        setSessionId: (id) =>
          set((state) => {
            state.sessionId = id;
          }),

        updateActivity: () =>
          set((state) => {
            state.lastActivityAt = Date.now();
          }),
      })),
      {
        name: "aiedu-app-store",
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          isSidebarOpen: state.isSidebarOpen,
          featureFlags: state.featureFlags,
          currentPath: state.currentPath,
        }),
      }
    ),
    { name: "AppStore" }
  )
);

// Selectors
export const selectUser = (state: AppState) => state.user;
export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated;
export const selectIsLoading = (state: AppState) => state.isLoading;
export const selectNotifications = (state: AppState) => state.notifications;
export const selectUnreadCount = (state: AppState) => state.unreadCount;
export const selectIsSidebarOpen = (state: AppState) => state.isSidebarOpen;
export const selectIsOnline = (state: AppState) => state.isOnline;
export const selectUserRole = (state: AppState) => state.user?.role;
export const selectFeatureFlag = (key: string) => (state: AppState) =>
  state.featureFlags[key] ?? false;
