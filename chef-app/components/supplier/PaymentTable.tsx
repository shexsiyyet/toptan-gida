'use client'

import { useState } from 'react'
import { Receivable } from '@/lib/supplier/payments'

interface PaymentTableProps {
  receivables: Receivable[]
  onRecordPayment: (invoiceId: string, amount: number, provider: string, providerRef: string) => Promise<void>
}

export function PaymentTable({ receivables, onRecordPayment }: PaymentTableProps) {
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState<{
    invoiceId: string | null
    amount: string
    provider: string
    providerRef: string
  }>({ invoiceId: null, amount: '', provider: 'manual', providerRef: '' })
  const [loading, setLoading] = useState<string | null>(null)

  const agingBuckets = {
    current: receivables.filter(r => r.daysOverdue === 0),
    '1-30': receivables.filter(r => r.daysOverdue > 0 && r.daysOverdue <= 30),
    '31-60': receivables.filter(r => r.daysOverdue > 30 && r.daysOverdue <= 60),
    '60+': receivables.filter(r => r.daysOverdue > 60),
  }

  type BucketKey = keyof typeof agingBuckets

  const bucketLabels: Record<BucketKey, string> = {
    current: 'Cari (0 gün)',
    '1-30': '1-30 gün',
    '31-60': '31-60 gün',
    '60+': '60+ gün',
  }

  const bucketColors: Record<BucketKey, string> = {
    current: 'bg-green-50 border-green-200',
    '1-30': 'bg-yellow-50 border-yellow-200',
    '31-60': 'bg-orange-50 border-orange-200',
    '60+': 'bg-red-50 border-red-200',
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN' }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.invoiceId || !paymentForm.amount) return

    setLoading(paymentForm.invoiceId)
    try {
      await onRecordPayment(
        paymentForm.invoiceId,
        parseFloat(paymentForm.amount),
        paymentForm.provider,
        paymentForm.providerRef
      )
      setPaymentForm({ invoiceId: null, amount: '', provider: 'manual', providerRef: '' })
      setExpandedInvoice(null)
    } catch (err) {
      alert(`Ödəniş qeyd edilə bilmədi: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }

  const renderBucket = (bucket: BucketKey, items: Receivable[]) => {
    if (items.length === 0) return null

    const total = items.reduce((sum, r) => sum + r.amount, 0)

    return (
      <div key={bucket} className={`border rounded-lg ${bucketColors[bucket]}`}>
        <div className="px-4 py-3 border-b font-semibold flex justify-between">
          <span>{bucketLabels[bucket]}</span>
          <span className="text-right">
            {items.length} faturası · {formatCurrency(total)}
          </span>
        </div>
        <div className="divide-y">
          {items.map(item => (
            <div key={item.invoiceId} className="px-4 py-3 hover:bg-white/50">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">Fatura: {item.invoiceId.slice(0, 8)}...</div>
                  <div className="text-sm text-gray-600">
                    Vadesi: {new Date(item.dueDate).toLocaleDateString('az-AZ')} ·
                    {item.daysOverdue > 0 ? `${item.daysOverdue} gün gecikmiş` : 'Cari'}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-semibold text-lg">{formatCurrency(item.amount)}</div>
                  <button
                    onClick={() => {
                      setExpandedInvoice(expandedInvoice === item.invoiceId ? null : item.invoiceId)
                      setPaymentForm({
                        invoiceId: item.invoiceId,
                        amount: item.amount.toFixed(2),
                        provider: 'manual',
                        providerRef: ''
                      })
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {expandedInvoice === item.invoiceId ? 'Gizlə' : 'Ödəniş qeyd et'}
                  </button>
                </div>
              </div>

              {expandedInvoice === item.invoiceId && (
                <form onSubmit={handleSubmit} className="mt-3 p-3 bg-gray-50 rounded border">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Məbləğ (AZN)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={item.amount}
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ödəniş üsulu</label>
                      <select
                        value={paymentForm.provider}
                        onChange={e => setPaymentForm({...paymentForm, provider: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="manual">Nağd / Bank köçürməsi</option>
                        <option value="iyzico">İyzico</option>
                        <option value="paynet">Paynet</option>
                        <option value="other">Digər</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Referans №</label>
                      <input
                        type="text"
                        value={paymentForm.providerRef}
                        onChange={e => setPaymentForm({...paymentForm, providerRef: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Məs: CASH-001, PAY-123"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={loading === item.invoiceId}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading === item.invoiceId ? 'Qeyd olunur...' : 'Təsdiqlə'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (receivables.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-2 text-lg">Alınacak borc yoxdur</p>
        <p className="text-sm">Bütün faturalar ödənib.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(Object.keys(agingBuckets) as BucketKey[]).map(bucket => {
          const items = agingBuckets[bucket]
          const total = items.reduce((sum, r) => sum + r.amount, 0)
          return (
            <div key={bucket} className={`p-4 rounded-lg ${bucketColors[bucket]}`}>
              <div className="text-sm font-medium text-gray-600">{bucketLabels[bucket]}</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(total)}</div>
              <div className="text-sm text-gray-500">{items.length} faturası</div>
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        {(Object.keys(agingBuckets) as BucketKey[]).map(bucket => renderBucket(bucket, agingBuckets[bucket]))}
      </div>
    </div>
  )
}