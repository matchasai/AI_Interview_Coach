import { motion as Motion } from 'framer-motion'
import { buttonHover } from '../../utils/motion'

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  disabled,
  ...props
}) {
  const base =
    'relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50'

  const variants = {
    primary:
      'text-white shadow-lg shadow-indigo-500/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:shadow-indigo-500/50',
    secondary:
      'surface-card text-slate-900 border border-slate-200/80 hover:border-indigo-300 hover:bg-white hover:shadow-md',
    danger:
      'text-white shadow-lg shadow-rose-500/30 bg-gradient-to-r from-rose-600 to-red-600 hover:shadow-rose-500/45',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100/80 hover:text-slate-900',
  }

  return (
    <Motion.button
      type={type}
      {...buttonHover}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </Motion.button>
  )
}
