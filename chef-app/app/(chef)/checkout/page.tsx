'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface CheckoutProps {
  searchParams: Promise<{ order_id?: string; status?: string }>
}

export default function CheckoutPage({ searchParams }: CheckoutProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'idle'>('idle')
  const [orderId, setOrderId] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const params = await searchParams
      const oid = params.order_id
      const st = params.status

      if (!oid) {
        setError('Sipariş ID bulunamadı')
        setStatus('failed')
        return
      }

      setOrderId(oid)

      if (st === 'success') {
        setStatus('success')
        return
      }
      if (st === 'failed') {
        setStatus('failed')
        return
      }

      setStatus('loading')
      try {
        const response = await fetch(`/api/chef/payment/create-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: oid }),
        })

        const data = await response.json()

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        } else {
          setError(data.error || 'Ödeme oturumu oluşturulamadı')
          setStatus('failed')
        }
      } catch {
        setError('Bir hata oluştu')
        setStatus('failed')
      }
    }

    init()
  }, [searchParams])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Ödeme sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ödeme Başarılı!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Siparişiniz için ödeme başarıyla alındı. Siparişiniz hazırlanıyor.
          </p>
          <div className="space-y-3">
            <Link
              href={`/orders/${orderId}`}
              className="block w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Sipariş Detaylarını Gör
            </Link>
            <Link
              href="/orders"
              className="block w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Tüm Siparişler
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ödeme Başarısız</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.refresh()}
              className="block w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Tekrar Dene
            </button>
            <Link
              href="/orders"
              className="block w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Siparişlere Dön
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}