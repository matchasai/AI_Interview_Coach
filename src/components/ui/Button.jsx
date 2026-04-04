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
      'text-white shadow-lg shadow-indigo-900/45 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.45)]',
    secondary:
      'bg-[#1e293b] text-white border border-white/10 hover:bg-[#273549] hover:border-indigo-400/50 hover:scale-105',
    danger:
      'text-white shadow-lg shadow-rose-900/45 bg-gradient-to-r from-rose-500 to-red-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]',
    ghost: 'bg-transparent text-gray-400 hover:bg-[#273549] hover:text-white hover:scale-105',
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
