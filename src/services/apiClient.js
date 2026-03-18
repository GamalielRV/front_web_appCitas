const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const ACCESS_TOKEN_STORAGE_KEY = 'platform_admin_access_token'
const REFRESH_TOKEN_STORAGE_KEY = 'platform_admin_refresh_token'
const TOKEN_TYPE_STORAGE_KEY = 'platform_admin_token_type'
const LEGACY_TOKEN_STORAGE_KEY = 'platform_admin_token'
const REFRESH_ENDPOINT = import.meta.env.VITE_AUTH_REFRESH_ENDPOINT || '/api/v1/auth/refresh'

let onAuthFailure = null
let refreshPromise = null

class ApiError extends Error {
  constructor({ status, errorCode, description, payload, bodyText }) {
    super(`API ${status}: ${description || bodyText || 'Error desconocido'}`)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
    this.description = description
    this.payload = payload
  }
}

function getStorageValue(key) {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.localStorage.getItem(key) || ''
}

function setStorageValue(key, value) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, value)
  }
}

function removeStorageValue(key) {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(key)
  }
}

function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) {
      return null
    }
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function getTokenExpirationMs(token) {
  const payload = decodeJwtPayload(token)
  const exp = payload?.exp
  return typeof exp === 'number' ? exp * 1000 : null
}

function isTokenExpired(token, skewSeconds = 5) {
  const expMs = getTokenExpirationMs(token)
  if (!expMs) {
    return false
  }
  return Date.now() >= expMs - skewSeconds * 1000
}

function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_PLATFORM_ADMIN_TOKEN || ''
  }
  return (
    getStorageValue(ACCESS_TOKEN_STORAGE_KEY) ||
    getStorageValue(LEGACY_TOKEN_STORAGE_KEY) ||
    import.meta.env.VITE_PLATFORM_ADMIN_TOKEN ||
    ''
  )
}

export function getPlatformAdminToken() {
  return getStoredAccessToken()
}

export function getAuthSession() {
  return {
    accessToken: getStoredAccessToken(),
    refreshToken: getStorageValue(REFRESH_TOKEN_STORAGE_KEY),
    tokenType: getStorageValue(TOKEN_TYPE_STORAGE_KEY) || 'bearer',
  }
}

export function setAuthSession(session) {
  if (!session?.accessToken) {
    return
  }
  setStorageValue(ACCESS_TOKEN_STORAGE_KEY, session.accessToken)
  setStorageValue(LEGACY_TOKEN_STORAGE_KEY, session.accessToken)
  if (session.refreshToken) {
    setStorageValue(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken)
  }
  setStorageValue(TOKEN_TYPE_STORAGE_KEY, session.tokenType || 'bearer')
}

export function clearAuthSession() {
  removeStorageValue(ACCESS_TOKEN_STORAGE_KEY)
  removeStorageValue(LEGACY_TOKEN_STORAGE_KEY)
  removeStorageValue(REFRESH_TOKEN_STORAGE_KEY)
  removeStorageValue(TOKEN_TYPE_STORAGE_KEY)
}

export function setAuthFailureHandler(handler) {
  onAuthFailure = typeof handler === 'function' ? handler : null
}

function notifyAuthFailure() {
  if (onAuthFailure) {
    onAuthFailure()
  }
}

function buildUrl(path, query) {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') {
        return
      }
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

function extractErrorDetails(payload, bodyText) {
  const apiData = payload && typeof payload === 'object' ? payload.data : null
  const errorCode =
    (apiData && typeof apiData === 'object' && apiData.code) ||
    (payload && typeof payload === 'object' && payload.code) ||
    null
  const description =
    (apiData && typeof apiData === 'object' && apiData.description) ||
    (payload && typeof payload === 'object' && payload.message) ||
    null
  return { errorCode, description, bodyText: typeof bodyText === 'string' ? bodyText : '' }
}

async function parseErrorResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json()
    return {
      payload,
      ...extractErrorDetails(payload, ''),
    }
  }
  const bodyText = await response.text()
  return {
    payload: null,
    ...extractErrorDetails(null, bodyText),
  }
}

function unwrapData(payload) {
  if (payload && typeof payload === 'object' && payload.data !== undefined) {
    return payload.data
  }
  return payload
}

function isBackendSuccessPayload(payload) {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      typeof payload.code === 'number' &&
      payload.code === 0,
  )
}

async function performRefresh() {
  const refreshToken = getStorageValue(REFRESH_TOKEN_STORAGE_KEY)
  if (!refreshToken) {
    return false
  }

  try {
    const refreshResponse = await request(REFRESH_ENDPOINT, {
      method: 'POST',
      body: { refresh_token: refreshToken },
      skipAuth: true,
      retryOnAuthFailure: false,
    })
    const data = unwrapData(refreshResponse) || {}
    if (!data.access_token) {
      return false
    }
    setAuthSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenType: data.token_type || 'bearer',
    })
    return true
  } catch {
    return false
  }
}

async function refreshAccessTokenIfNeeded() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshed = await performRefresh()
      if (!refreshed) {
        clearAuthSession()
        notifyAuthFailure()
      }
      return refreshed
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function ensureActiveSession() {
  const accessToken = getStoredAccessToken()
  if (!accessToken) {
    return false
  }
  if (!isTokenExpired(accessToken)) {
    return true
  }
  return refreshAccessTokenIfNeeded()
}

async function request(path, options = {}) {
  const token = getStoredAccessToken()
  const { query, skipAuth, retryOnAuthFailure = true, _retry = false, ...fetchOptions } = options
  const isFormDataBody =
    typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData
  const isJsonBody = Boolean(fetchOptions.body) && !isFormDataBody && typeof fetchOptions.body !== 'string'

  const response = await fetch(buildUrl(path, query), {
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers || {}),
    },
    ...fetchOptions,
    body: isJsonBody ? JSON.stringify(fetchOptions.body) : fetchOptions.body,
  })

  if (response.ok) {
    if (response.status === 204) {
      return null
    }
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const payload = await response.json()
      if (
        payload &&
        typeof payload === 'object' &&
        typeof payload.code === 'number' &&
        !isBackendSuccessPayload(payload)
      ) {
        const details = extractErrorDetails(payload, '')
        throw new ApiError({
          status: payload.status_code || response.status,
          errorCode: details.errorCode,
          description: details.description,
          payload,
          bodyText: '',
        })
      }
      return payload
    }
    return response.text()
  }

  const errorResponse = await parseErrorResponse(response)

  if (
    response.status === 401 &&
    !skipAuth &&
    retryOnAuthFailure &&
    !_retry &&
    (errorResponse.errorCode === 'token_expired' || errorResponse.errorCode === 'invalid_token')
  ) {
    const refreshed = await refreshAccessTokenIfNeeded()
    if (refreshed) {
      return request(path, { ...options, _retry: true })
    }
  }

  if (
    response.status === 401 &&
    !skipAuth &&
    (errorResponse.errorCode === 'invalid_token' ||
      errorResponse.errorCode === 'token_expired' ||
      errorResponse.errorCode === 'invalid_refresh_token')
  ) {
    clearAuthSession()
    notifyAuthFailure()
  }

  throw new ApiError({
    status: response.status,
    errorCode: errorResponse.errorCode,
    description: errorResponse.description,
    payload: errorResponse.payload,
    bodyText: errorResponse.bodyText,
  })
}

export const apiClient = {
  get: (path, query, options = {}) => request(path, { query, ...options }),
  post: (path, body, options = {}) => request(path, { method: 'POST', body, ...options }),
  put: (path, body, options = {}) => request(path, { method: 'PUT', body, ...options }),
  patch: (path, body, options = {}) => request(path, { method: 'PATCH', body, ...options }),
  delete: (path, options = {}) => request(path, { method: 'DELETE', ...options }),
}
