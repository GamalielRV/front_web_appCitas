import { apiClient } from './apiClient'

const PLATFORM_PREFIX = '/api/v1/platform'

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

function unwrapItems(payload) {
  const data = unwrapData(payload)
  if (Array.isArray(data?.items)) {
    return data.items
  }
  if (Array.isArray(data)) {
    return data
  }
  return []
}

function unwrapPagination(payload) {
  const data = unwrapData(payload)
  return safeObject(data?.pagination)
}

export async function getBusinessTypes() {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/business-types`)
  return unwrapItems(payload)
}

export async function createBusinessType(body) {
  const payload = await apiClient.post(`${PLATFORM_PREFIX}/business-types`, body)
  return unwrapData(payload)
}

export async function updateBusinessType(businessTypeId, body) {
  const payload = await apiClient.patch(`${PLATFORM_PREFIX}/business-types/${businessTypeId}`, body)
  return unwrapData(payload)
}

export async function deleteBusinessType(businessTypeId) {
  const payload = await apiClient.delete(`${PLATFORM_PREFIX}/business-types/${businessTypeId}`)
  return unwrapData(payload)
}

export async function uploadBusinessTypeImage(businessTypeId, imageFile) {
  const formData = new FormData()
  formData.append('image', imageFile)
  const payload = await apiClient.post(`${PLATFORM_PREFIX}/business-types/${businessTypeId}/image`, formData)
  return unwrapData(payload)
}

export async function deleteBusinessTypeImage(businessTypeId) {
  const payload = await apiClient.delete(`${PLATFORM_PREFIX}/business-types/${businessTypeId}/image`)
  return unwrapData(payload)
}

export async function getOrganizations(filters = {}) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/organizations`, filters)
  return {
    items: unwrapItems(payload),
    pagination: unwrapPagination(payload),
  }
}

export async function previewOwnerByQr(qrCode) {
  const payload = await apiClient.post(`${PLATFORM_PREFIX}/owners/by-qr/preview`, { qr_code: qrCode })
  return unwrapData(payload)
}

export async function createOrganization(body) {
  const payload = await apiClient.post(`${PLATFORM_PREFIX}/organizations`, body)
  return unwrapData(payload)
}

export async function getOrganization(organizationId) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/organizations/${organizationId}`)
  return unwrapData(payload)
}

export async function updateOrganization(organizationId, body) {
  const payload = await apiClient.patch(`${PLATFORM_PREFIX}/organizations/${organizationId}`, body)
  return unwrapData(payload)
}

export async function reassignOrganizationOwner(organizationId, ownerId) {
  try {
    const payload = await apiClient.put(`${PLATFORM_PREFIX}/organizations/${organizationId}/owner`, {
      owner_user_id: ownerId,
    })
    return unwrapData(payload)
  } catch (error) {
    // Backward compatibility for environments that still expect `owner_id`.
    if (error?.status !== 422) {
      throw error
    }
    const payload = await apiClient.put(`${PLATFORM_PREFIX}/organizations/${organizationId}/owner`, { owner_id: ownerId })
    return unwrapData(payload)
  }
}

export async function getOrganizationOwnerCandidates(organizationId) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/organizations/${organizationId}/owner-candidates`)
  return unwrapItems(payload)
}

export async function getOwners(filters = {}) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/owners`, filters)
  return {
    items: unwrapItems(payload),
    pagination: unwrapPagination(payload),
  }
}

export async function updateOwner(ownerId, body) {
  const payload = await apiClient.patch(`${PLATFORM_PREFIX}/owners/${ownerId}`, body)
  return unwrapData(payload)
}

export async function getDashboard(filters = {}) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/dashboard`, filters)
  return unwrapData(payload)
}

export async function getAppointmentsReport(filters = {}) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/reports/appointments`, filters)
  return unwrapItems(payload)
}

export async function getAuditEvents(filters = {}) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/audit/events`, filters)
  return {
    items: unwrapItems(payload),
    pagination: unwrapPagination(payload),
  }
}

export async function getSupportTickets(filters = {}) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/support/tickets`, filters)
  return {
    items: unwrapItems(payload),
    pagination: unwrapPagination(payload),
  }
}

export async function getSupportTicket(ticketId) {
  const payload = await apiClient.get(`${PLATFORM_PREFIX}/support/tickets/${ticketId}`)
  return unwrapData(payload)
}

export async function updateSupportTicket(ticketId, body) {
  const payload = await apiClient.patch(`${PLATFORM_PREFIX}/support/tickets/${ticketId}`, body)
  return unwrapData(payload)
}

export async function getNotifications(filters = {}) {
  const payload = await apiClient.get('/api/v1/notifications', filters)
  return unwrapItems(payload)
}

export async function markNotificationRead(notificationId) {
  const payload = await apiClient.put(`/api/v1/notifications/${notificationId}/read`)
  return unwrapData(payload)
}

export async function markAllNotificationsRead(scope = 'work') {
  const payload = await apiClient.put('/api/v1/notifications/read-all', null, {
    query: { scope },
  })
  return unwrapData(payload)
}
