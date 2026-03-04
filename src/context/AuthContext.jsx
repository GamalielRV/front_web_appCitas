import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  clearAuthSession,
  ensureActiveSession,
  getAuthSession,
  getPlatformAdminToken,
  setAuthFailureHandler,
  setAuthSession,
} from '../services/apiClient'
import { loginWithCredentials, logoutBackendSession, verifyPlatformAdminAccess } from '../services/authApi'

const USERNAME_KEY = 'platform_admin_username'
const DEFAULT_ALLOWED_USERNAME = import.meta.env.VITE_PLATFORM_ADMIN_ALLOWED_USERNAME || 'Gama'

const AuthContext = createContext(null)

function getStoredUsername() {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.localStorage.getItem(USERNAME_KEY) || ''
}

function setStoredUsername(username) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(USERNAME_KEY, username)
  }
}

function clearStoredUsername() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USERNAME_KEY)
  }
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(getStoredUsername())
  const [sessionReady, setSessionReady] = useState(false)
  const [tokenVersion, setTokenVersion] = useState(0)

  const isAuthenticated = Boolean(getPlatformAdminToken())

  const performLocalLogout = useCallback(() => {
    clearAuthSession()
    clearStoredUsername()
    setAuthUser('')
    setTokenVersion((value) => value + 1)
  }, [])

  useEffect(() => {
    setAuthFailureHandler(() => {
      performLocalLogout()
    })
    return () => {
      setAuthFailureHandler(null)
    }
  }, [performLocalLogout])

  useEffect(() => {
    let mounted = true
    const bootstrapSession = async () => {
      const hasAccessToken = Boolean(getPlatformAdminToken())
      if (!hasAccessToken) {
        if (mounted) {
          setSessionReady(true)
        }
        return
      }

      const validSession = await ensureActiveSession()
      if (!validSession) {
        performLocalLogout()
      }

      if (mounted) {
        setSessionReady(true)
      }
    }
    bootstrapSession()
    return () => {
      mounted = false
    }
  }, [performLocalLogout, tokenVersion])

  const login = async ({ username, password }) => {
    const normalizedUsername = username.trim()
    if (normalizedUsername !== DEFAULT_ALLOWED_USERNAME) {
      throw new Error(
        `Usuario invalido. Debe ser exactamente "${DEFAULT_ALLOWED_USERNAME}" (respeta mayusculas y minusculas).`,
      )
    }

    try {
      const session = await loginWithCredentials({ username: normalizedUsername, password })
      setAuthSession(session)
      await verifyPlatformAdminAccess()
      setStoredUsername(normalizedUsername)
      setAuthUser(normalizedUsername)
      setTokenVersion((value) => value + 1)
    } catch (error) {
      clearAuthSession()
      if (error instanceof Error && error.message.includes('invalid_credentials')) {
        throw new Error(
          'Backend devolvio invalid_credentials. Verifica password de Gama y que el backend cargue los ultimos cambios/env.',
        )
      }
      if (error instanceof Error && error.message.includes('platform_admin_forbidden')) {
        throw new Error('El token es valido, pero backend devolvio platform_admin_forbidden para este usuario.')
      }
      throw new Error(
        'Credenciales invalidas o sin permiso de super admin. Verifica usuario exacto "Gama", password y endpoint /api/v1/auth/platform-token.',
      )
    }
  }

  const logout = useCallback(async ({ allDevices = false } = {}) => {
    const { refreshToken } = getAuthSession()
    try {
      if (refreshToken) {
        await logoutBackendSession({ refreshToken, allDevices })
      }
    } catch {
      // Si el backend rechaza el logout, igual limpiamos sesion local.
    } finally {
      performLocalLogout()
    }
  }, [performLocalLogout])

  const value = useMemo(
    () => ({
      isAuthenticated,
      sessionReady,
      authUser,
      allowedUsername: DEFAULT_ALLOWED_USERNAME,
      login,
      logout,
      tokenVersion,
    }),
    [authUser, isAuthenticated, logout, sessionReady, tokenVersion],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
