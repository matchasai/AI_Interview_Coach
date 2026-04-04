import { forwardRef } from 'react'

export const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-semibold text-gray-400">{label}</span> : null}
      <input
        ref={ref}
        className={`w-full rounded-2xl border border-white/10 bg-[#1e293b] px-3.5 py-2.5 text-sm text-white shadow-sm shadow-black/20 transition-all duration-300 placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 ${className}`}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
})

export const Select = forwardRef(function Select(
  { label, error, className = '', children, ...props },
  ref,
) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-semibold text-gray-400">{label}</span> : null}
      <select
        ref={ref}
        className={`w-full rounded-2xl border border-white/10 bg-[#1e293b] px-3.5 py-2.5 text-sm text-white shadow-sm shadow-black/20 transition-all duration-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
})
