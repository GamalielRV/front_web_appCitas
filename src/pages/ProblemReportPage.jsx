import { useState } from 'react'
import { createPublicProblemReport } from '../services/publicSupportApi'
import { showSuccessAlert } from '../utils/alerts'

const problemTypeOptions = [
  { value: 'account_access', label: 'Acceso a cuenta' },
  { value: 'booking', label: 'Reservas o citas' },
  { value: 'payment', label: 'Pagos' },
  { value: 'business', label: 'Sucursal o negocio' },
  { value: 'privacy', label: 'Privacidad' },
  { value: 'other', label: 'Otro' },
]

function ProblemReportPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'other',
    message: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sentMessage, setSentMessage] = useState('')

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const submitReport = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSentMessage('')
    try {
      const result = await createPublicProblemReport({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        type: form.type,
        message: form.message.trim(),
      })
      const message = result?.message || 'Reporte recibido correctamente.'
      setSentMessage(message)
      setForm({
        name: '',
        email: '',
        phone: '',
        type: 'other',
        message: '',
      })
      showSuccessAlert('Reporte enviado', message)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo enviar el reporte.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <section className="mx-auto w-full max-w-3xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <img src="/LogoCitapp.png" alt="Logo Citas App" className="mb-3 h-12 w-auto rounded-lg object-contain" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Citas App</p>
          <h1 className="mt-1 text-2xl font-bold">Reportar problema</h1>
          <p className="mt-2 text-sm text-slate-600">
            Envia un reporte al equipo de soporte. Usaremos el correo indicado para contactarte si necesitamos mas
            detalle.
          </p>
        </header>

        {error && <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
        {sentMessage && <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{sentMessage}</p>}

        <form onSubmit={submitReport} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <fieldset disabled={saving} className="space-y-4 disabled:opacity-70">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Nombre *</span>
                <input
                  required
                  minLength={2}
                  maxLength={255}
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Email *</span>
                <input
                  required
                  type="email"
                  minLength={5}
                  maxLength={255}
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Telefono</span>
                <input
                  maxLength={20}
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Tipo de problema *</span>
                <select
                  required
                  value={form.type}
                  onChange={(event) => updateField('type', event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {problemTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Mensaje *</span>
              <textarea
                required
                minLength={5}
                maxLength={4000}
                rows={7}
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </fieldset>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
            >
              {saving ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default ProblemReportPage
