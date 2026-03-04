export const mockCategories = [
  {
    id: 'cat-1',
    name: 'Salon de Belleza',
    slug: 'salon-belleza',
    description: 'Servicios de estetica personal.',
    active: true,
    order: 1,
    comingSoonText: '',
  },
  {
    id: 'cat-2',
    name: 'Dentista',
    slug: 'dentista',
    description: 'Clinicas dentales y ortodoncia.',
    active: true,
    order: 2,
    comingSoonText: '',
  },
  {
    id: 'cat-3',
    name: 'Veterinaria',
    slug: 'veterinaria',
    description: 'Atencion de mascotas.',
    active: false,
    order: 3,
    comingSoonText: 'Proximamente',
  },
]

export const mockOwners = [
  { id: 'own-1', name: 'Ana Ruiz', email: 'ana@clinicadental.com', active: true },
  { id: 'own-2', name: 'Carlos Mejia', email: 'carlos@barberone.com', active: true },
  { id: 'own-3', name: 'Paola Diaz', email: 'paola@petcare.com', active: false },
]

export const mockBranches = [
  {
    id: 'suc-1',
    name: 'Clinica Sonrisa Norte',
    categoryId: 'cat-2',
    ownerId: 'own-1',
    status: 'active',
    verified: true,
    createdAt: '2026-01-15',
  },
  {
    id: 'suc-2',
    name: 'Barber One Centro',
    categoryId: 'cat-1',
    ownerId: 'own-2',
    status: 'active',
    verified: true,
    createdAt: '2026-01-20',
  },
  {
    id: 'suc-3',
    name: 'Pet Care Sur',
    categoryId: 'cat-3',
    ownerId: 'own-3',
    status: 'suspended',
    verified: false,
    createdAt: '2026-02-02',
  },
]

export const dashboardMetrics = {
  booked: 482,
  canceled: 54,
  completed: 399,
  noShow: 29,
}

export const occupancyByCategory = [
  { category: 'Salon de Belleza', occupancy: 82 },
  { category: 'Dentista', occupancy: 76 },
  { category: 'Veterinaria', occupancy: 41 },
]

export const topCancellationBranches = [
  { branch: 'Pet Care Sur', cancellations: 18 },
  { branch: 'Clinica Sonrisa Norte', cancellations: 12 },
  { branch: 'Barber One Centro', cancellations: 8 },
]

export const auditEvents = [
  {
    id: 'aud-1',
    at: '2026-02-20T14:12:00Z',
    actor: 'superadmin@citasapp.com',
    action: 'branch_suspended',
    target: 'Pet Care Sur',
    details: 'Suspendida por reporte de spam',
  },
  {
    id: 'aud-2',
    at: '2026-02-21T09:30:00Z',
    actor: 'superadmin@citasapp.com',
    action: 'owner_reassigned',
    target: 'Barber One Centro',
    details: 'Reasignada a Carlos Mejia',
  },
  {
    id: 'aud-3',
    at: '2026-02-21T16:48:00Z',
    actor: 'security@citasapp.com',
    action: 'role_change',
    target: 'staff_182',
    details: 'Cambio de rol a customer',
  },
]
