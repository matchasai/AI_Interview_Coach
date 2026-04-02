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

export function toastPromise(promise, messages) {
  return toast.promise(promise, messages)
}

export { default as toast } from 'react-hot-toast'
