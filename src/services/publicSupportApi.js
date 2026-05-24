import { apiClient } from './apiClient'

function safeObject(value) {
  return value && typeof value === 'object' ? value : {}
}

function unwrapData(payload) {
  const root = safeObject(payload)
  if (root.data !== undefined) {
    return root.data
  }
  return root
}

export async function createPublicProblemReport(body) {
  const payload = await apiClient.post('/api/v1/public/support/problem-reports', body, {
    skipAuth: true,
  })
  return unwrapData(payload)
}
