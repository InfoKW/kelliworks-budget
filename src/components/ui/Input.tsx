import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, style, ...props },
  ref
) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-slate-700)' }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className="input"
        style={{
          ...(error && { borderColor: 'var(--c-red-500)', boxShadow: '0 0 0 4px rgba(239,68,68,0.1)' }),
          ...style,
        }}
        {...props}
      />
      {error && (
        <p style={{ fontSize: 12, color: 'var(--c-red-500)', fontWeight: 500 }}>{error}</p>
      )}
    </div>
  )
})

export default Input
