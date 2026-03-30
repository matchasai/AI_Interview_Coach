import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Button } from './Button'

export function Modal({ open, title, children, onClose, footer }) {
  return (
    <AnimatePresence>
      {open ? (
        <Motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Motion.div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <Motion.div
            className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <Button variant="ghost" onClick={onClose} aria-label="Close">
                Close
              </Button>
            </div>
            <div className="text-sm text-slate-700">{children}</div>
            {footer ? <div className="mt-4">{footer}</div> : null}
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  )
}
