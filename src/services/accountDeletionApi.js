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

export async function previewAccountDeletionByQr(qrCode) {
  const payload = await apiClient.post('/api/v1/users/account-deletion-requests/by-qr/preview', {
    qr_code: qrCode,
  })
  return unwrapData(payload)
}

export async function createAccountDeletionByQr(qrCode) {
  const payload = await apiClient.post('/api/v1/users/account-deletion-requests/by-qr', {
    qr_code: qrCode,
  })
  return unwrapData(payload)
}
