import Swal from 'sweetalert2'

export function showSuccessAlert(title, text = 'Operacion completada correctamente.') {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
  })
}

export async function showDangerConfirm({
  title,
  text = 'Esta accion no se puede deshacer facilmente.',
  confirmButtonText = 'Eliminar',
  cancelButtonText = 'Cancelar',
}) {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: '#b91c1c',
    cancelButtonColor: '#334155',
  })
  return result.isConfirmed
}
