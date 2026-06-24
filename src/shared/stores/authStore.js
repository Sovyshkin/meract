import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeUserDisplay } from "../utils/displayName";

const AUTH_STORAGE_KEY = "meract-auth";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      location: null,
      routeDestination: null,
      routeCoordinates: null,
      routePoints: [],
      cachedGuildId: null,
      cachedLocation: null,

      setUser: (userData) => {
        const rawUser = userData.user || userData;
        set({
          user: normalizeUserDisplay(rawUser),
          token: userData.token || userData.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setLocation: (locationData) => {
        set({
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: Date.now(),
          },
        });
      },

      setRouteDestination: (destination) => {
        set({
          routeDestination: destination
            ? {
                latitude: destination.latitude,
                longitude: destination.longitude,
              }
            : null,
        });
      },

      setRouteCoordinates: (coordinates) => {
        set({
          routeCoordinates: coordinates ? [...coordinates] : null,
        });
      },

      clearRoute: () => {
        set({
          routeDestination: null,
          routeCoordinates: null,
          routePoints: [],
        });
      },

      addRoutePoint: (point) => {
        const currentPoints = get().routePoints;
        const newPoint = {
          latitude: point.latitude,
          longitude: point.longitude,
          order: currentPoints.length,
        };
        set({
          routePoints: [...currentPoints, newPoint],
        });
      },

      setCachedGuildId: (id) => set({ cachedGuildId: id }),
      setCachedLocation: (loc) => set({ cachedLocation: loc }),
      getCachedLocation: () => get().cachedLocation,

      removeRoutePoint: (order) => {
        const currentPoints = get().routePoints;
        const filteredPoints = currentPoints.filter((p) => p.order !== order);
        const reindexedPoints = filteredPoints.map((p, index) => ({
          ...p,
          order: index,
        }));
        set({
          routePoints: reindexedPoints,
        });
      },

      clearRoutePoints: () => {
        set({
          routePoints: [],
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setToken: (newToken) => {
        set({ token: newToken });
        if (newToken) {
          localStorage.setItem("authToken", newToken);
        }
      },

      login: (userData) => {
        const token = userData.token || userData.accessToken;
        const rawUser = userData.user || userData;
        set({
          user: normalizeUserDisplay(rawUser),
          token: token,
          isAuthenticated: true,
          isLoading: false,
        });

        if (token) {
          localStorage.setItem("authToken", token);
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          location: null,
          routeDestination: null,
          routeCoordinates: null,
          routePoints: [],
        });

        localStorage.removeItem("authToken");
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.clear();
      },

      checkAuth: () => {
        const state = get();
        return !!(state.isAuthenticated && state.token);
      },

      getToken: () => {
        const state = get();
        return state.token || localStorage.getItem("authToken");
      },

      updateUser: (updatedData) => {
        const state = get();
        if (state.user) {
          set({
            user: { ...state.user, ...updatedData },
          });
        }
      },

      getCachedGuildId: () => get().cachedGuildId,
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        location: state.location,
        cachedGuildId: state.cachedGuildId,
        cachedLocation: state.cachedLocation,
      }),
      version: 1,
    }
  )
);

export const selectUser = (state) => state.user;
export const selectIsAuthenticated = (state) => state.isAuthenticated;
export const selectToken = (state) => state.token;
export const selectIsLoading = (state) => state.isLoading;
export const selectLocation = (state) => state.location;
