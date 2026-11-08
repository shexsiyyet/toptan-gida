'use client'

import { useEffect, useState } from 'react'

interface PriceComparison {
  distributor_id: string
  distributor_name: string
  price: number
  stock: number
  unit: string
}

interface PriceCompareModalProps {
  isOpen: boolean
  onClose: () => void
  sku: string
  productName: string
}

export default function PriceCompareModal({ isOpen, onClose, sku, productName }: PriceCompareModalProps) {
  const [comparison, setComparison] = useState<PriceComparison[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    async function fetchComparison() {
      setLoading(true)
      try {
        const res = await fetch(`/api/chef/price-compare?sku=${encodeURIComponent(sku)}`)
        if (res.ok) {
          const data = await res.json()
          setComparison(data)
        }
      } catch (err) {
        console.error('Failed to fetch price comparison:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchComparison()
  }, [isOpen, sku])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} aria-hidden="true" />
        <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              Price Compare: {productName} ({sku})
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : comparison.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No other suppliers found for this product</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Supplier</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Price</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparison.map((item, idx) => (
                    <tr key={item.distributor_id} className={idx === 0 ? 'bg-green-50' : ''}>
                      <td className="py-2 px-3 text-gray-900">
                        {item.distributor_name}
                        {idx === 0 && <span className="ml-2 inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Best</span>}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-900 font-medium">
                        ₼{item.price.toFixed(2)}/{item.unit}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {item.stock} in stock
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}