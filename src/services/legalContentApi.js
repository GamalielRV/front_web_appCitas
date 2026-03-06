import { apiClient } from './apiClient'

function getPlatformLegalPath(documentType) {
  return `/api/v1/platform/legal/${documentType}/current`
}

function getPublicLegalPath(documentType) {
  return `/api/v1/public/legal/${documentType}`
}

function asObject(value) {
  return value && typeof value === 'object' ? value : {}
}

function unwrapData(payload) {
  const root = asObject(payload)
  if (root.data !== undefined) {
    return asObject(root.data)
  }
  return root
}

function normalizeLegalContent(raw) {
  const item = asObject(raw)
  return {
    title: item.title || '',
    content: item.content || '',
    version: item.version || '',
    effectiveAt: item.effective_at || item.effectiveAt || '',
    updatedAt: item.updated_at || item.updatedAt || '',
    publishedAt: item.published_at || item.publishedAt || '',
    published: item.published ?? item.is_published ?? true,
  }
}

async function getPublicLegalDocument(documentType) {
  const payload = await apiClient.get(getPublicLegalPath(documentType), {}, { skipAuth: true, retryOnAuthFailure: false })
  return normalizeLegalContent(unwrapData(payload))
}

async function getPlatformLegalDocument(documentType) {
  const payload = await apiClient.get(getPlatformLegalPath(documentType))
  return normalizeLegalContent(unwrapData(payload))
}

async function updatePlatformLegalDocument(documentType, body) {
  const payload = await apiClient.put(getPlatformLegalPath(documentType), body)
  return normalizeLegalContent(unwrapData(payload))
}

export async function getPublicTerms() {
  return getPublicLegalDocument('terms')
}

export async function getPublicPrivacy() {
  return getPublicLegalDocument('privacy')
}

export async function getPlatformTerms() {
  return getPlatformLegalDocument('terms')
}

export async function getPlatformPrivacy() {
  return getPlatformLegalDocument('privacy')
}

export async function updatePlatformTerms(body) {
  return updatePlatformLegalDocument('terms', body)
}

export async function updatePlatformPrivacy(body) {
  return updatePlatformLegalDocument('privacy', body)
}
