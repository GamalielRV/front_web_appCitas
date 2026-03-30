import { useEffect, useMemo, useState } from 'react'
import { createAccountDeletionByQr, previewAccountDeletionByQr } from '../services/accountDeletionApi'
import { decodeQrCodeFromImageFile } from '../utils/qrImageDecoder'
import { showSuccessAlert } from '../utils/alerts'

function maskEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'N/A'
  }
  const [user, domain] = email.split('@')
  if (!domain) {
    return email
  }
  const safeUser = user.length <= 2 ? `${user[0]}*` : `${user[0]}***${user[user.length - 1]}`
  const domainParts = domain.split('.')
  const domainName = domainParts[0] || ''
  const safeDomain =
    domainName.length <= 2 ? `${domainName[0]}*` : `${domainName[0]}***${domainName[domainName.length - 1]}`
  const tld = domainParts.slice(1).join('.') || ''
  return `${safeUser}@${safeDomain}${tld ? `.${tld}` : ''}`
}

function AccountDeletionRequestPage() {
  const [qrImageName, setQrImageName] = useState('')
  const [qrImagePreviewUrl, setQrImagePreviewUrl] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [finalMessage, setFinalMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (qrImagePreviewUrl) {
        URL.revokeObjectURL(qrImagePreviewUrl)
      }
    }
  }, [qrImagePreviewUrl])

  const maskedEmail = useMemo(() => maskEmail(previewData?.email), [previewData])

  const resetFlow = () => {
    setQrCode('')
    setPreviewData(null)
    setFinalMessage('')
    setError('')
  }

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setError('')
    setFinalMessage('')
    setPreviewData(null)
    setQrCode('')
    setQrImageName(file.name)
    if (qrImagePreviewUrl) {
      URL.revokeObjectURL(qrImagePreviewUrl)
    }
    setQrImagePreviewUrl(URL.createObjectURL(file))

    try {
      setScanning(true)
      const code = await decodeQrCodeFromImageFile(file)
      setQrCode(code)
      showSuccessAlert('QR leido correctamente')
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'No se pudo leer el QR.')
    } finally {
      setScanning(false)
    }
  }

  const handlePreview = async () => {
    if (!qrCode) {
      setError('Debes subir un QR valido para previsualizar la cuenta.')
      return
    }
    setError('')
    setPreviewing(true)
    try {
      const data = await previewAccountDeletionByQr(qrCode)
      setPreviewData(data)
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'No se pudo previsualizar la cuenta.')
    } finally {
      setPreviewing(false)
    }
  }

  const handleSubmit = async () => {
    if (!qrCode) {
      setError('Debes subir un QR valido para solicitar la eliminacion.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await createAccountDeletionByQr(qrCode)
      const message =
        'Te enviamos una notificacion a la app para confirmar la eliminacion de la cuenta.'
      setFinalMessage(message)
      showSuccessAlert('Solicitud enviada', message)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Solicitud de eliminacion de cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sube el QR de tu cuenta para solicitar la eliminacion. La confirmacion final se hace desde la app.
        </p>
      </header>

      {error && <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
      {finalMessage && <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{finalMessage}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">1. Cargar QR</h2>
          <div className="mt-3 space-y-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleImageChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {scanning && <p className="text-xs text-slate-500">Escaneando QR desde imagen...</p>}
            {qrImageName && <p className="text-xs text-slate-500">Archivo cargado: {qrImageName}</p>}
            {qrImagePreviewUrl && (
              <img src={qrImagePreviewUrl} alt="QR cargado" className="h-36 w-36 rounded-lg border border-slate-200" />
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || !qrCode}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {previewing ? 'Previsualizando...' : 'Previsualizar cuenta'}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Limpiar
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">2. Confirmar solicitud</h2>
          {previewData ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Cuenta detectada</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{previewData.full_name || 'Usuario'}</p>
                <p className="text-sm text-slate-600">Correo: {maskedEmail}</p>
              </div>
              <p className="text-xs text-slate-500">
                Al solicitar la eliminacion, enviaremos una notificacion a tu app para confirmar.
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? 'Enviando...' : 'Solicitar eliminacion'}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Primero sube un QR valido y previsualiza la cuenta para continuar.
            </p>
          )}
        </section>
      </div>
    </section>
  )
}

export default AccountDeletionRequestPage
