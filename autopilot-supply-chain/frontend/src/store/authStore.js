import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      pendingUserId: null,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setPendingUserId: (id) => set({ pendingUserId: id }),

      logout: () => set({ accessToken: null, refreshToken: null, user: null, pendingUserId: null }),

      isAuthenticated: () => !!useAuthStore.getState().accessToken,
    }),
    { name: 'autopilot-auth' }
  )
)
