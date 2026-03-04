import { apiClient } from './apiClient'

const TOKEN_ENDPOINT = import.meta.env.VITE_AUTH_TOKEN_ENDPOINT || '/api/v1/auth/platform-token'
const LOGOUT_ENDPOINT = import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT || '/api/v1/auth/logout'
const PLATFORM_CHECK_ENDPOINT = '/api/v1/platform/dashboard'

function unwrapData(payload) {
  if (payload && typeof payload === 'object' && payload.data !== undefined) {
    return payload.data
  }
  return payload
}

export async function loginWithCredentials({ username, password }) {
  const payload = await apiClient.post(
    TOKEN_ENDPOINT,
    { username, password },
    { skipAuth: true },
  )
  const data = unwrapData(payload) || {}
  if (!data.access_token || !data.refresh_token) {
    throw new Error('No se recibieron access_token y refresh_token desde el backend.')
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || 'bearer',
    expiresIn: data.expires_in || 0,
    refreshExpiresIn: data.refresh_expires_in || 0,
  }
}

export async function verifyPlatformAdminAccess() {
  return apiClient.get(PLATFORM_CHECK_ENDPOINT)
}

export async function logoutBackendSession({ refreshToken, allDevices = false }) {
  return apiClient.post(LOGOUT_ENDPOINT, {
    refresh_token: refreshToken || null,
    all_devices: Boolean(allDevices),
  })
}
