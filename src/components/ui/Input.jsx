import { forwardRef } from 'react'

export const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span> : null}
      <input
        ref={ref}
        className={`w-full rounded-2xl border border-slate-300/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-300 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${className}`}
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
      {label ? <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span> : null}
      <select
        ref={ref}
        className={`w-full rounded-2xl border border-slate-300/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
})



