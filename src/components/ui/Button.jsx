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
    'relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50'

  const variants = {
    primary:
      'text-white shadow-lg shadow-indigo-900/45 bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/35',
    secondary:
      'bg-white/10 text-white border border-white/10 hover:bg-white/15 hover:border-indigo-400/50 hover:scale-105',
    danger:
      'text-white shadow-lg shadow-rose-900/45 bg-gradient-to-r from-rose-500 to-red-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]',
    ghost: 'bg-transparent text-gray-400 hover:bg-white/10 hover:text-white hover:scale-105',
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



