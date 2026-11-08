interface AuthFormProps {
  label: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}

export default function AuthForm({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
}: AuthFormProps) {
  return (
    <div>
      <label htmlFor="phone" className="sr-only">
        {label}
      </label>
      <input
        id="phone"
        name="phone"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
      />
    </div>
  )
}