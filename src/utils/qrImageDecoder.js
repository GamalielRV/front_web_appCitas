import jsQR from 'jsqr'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo abrir la imagen para escanear el QR.'))
    image.src = dataUrl
  })
}

export async function decodeQrCodeFromImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Selecciona una imagen valida (.jpg, .jpeg o .png).')
  }

  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('No se pudo inicializar el lector de imagen.')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const qrResult = jsQR(imageData.data, imageData.width, imageData.height)

  if (!qrResult?.data) {
    throw new Error('No se detecto un QR valido en la imagen.')
  }

  return qrResult.data
}
