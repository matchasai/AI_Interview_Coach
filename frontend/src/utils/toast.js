import toast from 'react-hot-toast'
import { getErrorMessage } from '../services/api'

export function toastSuccess(message) {
  if (!message) return
  toast.success(message)
}

export function toastError(errorOrMessage) {
  const msg =
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : getErrorMessage(errorOrMessage)

  toast.error(msg)
}
