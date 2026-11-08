'use client'

import { useState, useEffect } from 'react'
import { Receivable } from '@/lib/supplier/payments'
import { PaymentTable } from '@/components/supplier/PaymentTable'

export default function PaymentsPage() {
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    async function loadReceivables() {
      try {
        const response = await fetch('/api/supplier/receivables')
        if (response.ok) {
          const data = await response.json()
          setReceivables(data.receivables)
        }
      } catch (err) {
        console.error('Failed to load receivables:', err)
      } finally {
        setInitialLoad(false)
      }
    }
    loadReceivables()
  }, [])

  const handleRecordPayment = async (
    invoiceId: string,
    amount: number,
    provider: string,
    providerRef: string
  ) => {
    setLoading(invoiceId)
    try {
      const response = await fetch('/api/supplier/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, amount, provider, providerRef }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to record payment')
      }

      const refreshResponse = await fetch('/api/supplier/receivables')
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setReceivables(data.receivables)
      }
    } catch (err) {
      alert(`Ödəniş qeyd edilə bilmədi: ${err instanceof Error ? err.message : 'Unknown error'}`)
      throw err
    } finally {
      setLoading(null)
    }
  }

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ödəniş İzləmə</h1>
        <div className="flex gap-3">
          <select className="px-4 py-2 border rounded-md text-sm">
            <option value="all">Bütün restoranlar</option>
            <option value="overdue">Yalnız gecikmiş</option>
          </select>
        </div>
      </div>

      <PaymentTable
        receivables={receivables}
        onRecordPayment={handleRecordPayment}
      />
    </div>
  )
}