'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthForm from '@/components/chef/AuthForm'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/cart'
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/chef/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const code = Array.from({ length: 6 }, (_, i) => formData.get(`code${i}`)).join('')

    if (code.length !== 6) {
      setError('Please enter the 6-digit code')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/chef/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code')
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Toptan Gıda
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'phone' ? 'Enter your phone number to receive a verification code' : 'Enter the 6-digit code sent via SMS'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={step === 'phone' ? handlePhoneSubmit : handleOtpSubmit}>
          {error && (
            <div className="text-red-600 text-sm text-center" role="alert">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <AuthForm
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+994 XX XXX XX XX"
              autoComplete="tel"
              required
            />
          ) : (
            <div className="flex gap-2 justify-center">
              {Array.from({ length: 6 }, (_, i) => (
                <input
                  key={i}
                  type="text"
                  name={`code${i}`}
                  maxLength={1}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  className="w-12 h-12 text-center text-2xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  autoFocus={i === 0}
                  onChange={(e) => {
                    if (e.target.value && i < 5) {
                      const nextInput = e.target.parentElement?.children[i + 1] as HTMLInputElement
                      nextInput?.focus()
                    }
                  }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) {
                      const prevInput = e.currentTarget.parentElement?.children[i - 1] as HTMLInputElement
                      prevInput?.focus()
                    }
                  }}
                />
              ))}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                step === 'phone' ? 'Send Code' : 'Verify & Continue'
              )}
            </button>
          </div>

          {step === 'otp' && (
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-500"
            >
              Change phone number
            </button>
          )}
        </form>

        <p className="text-center text-sm text-gray-500">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:text-blue-500">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-500">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}