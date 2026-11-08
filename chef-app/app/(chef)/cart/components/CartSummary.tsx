'use client'

import { Product } from '@/lib/chef/cart'

interface CartSummaryProps {
  items: Record<string, number>
  products: Product[]
  onPlaceOrder: () => void
  loading: boolean
}

export default function CartSummary({ items, products, onPlaceOrder, loading }: CartSummaryProps) {
  const cartItems = Object.entries(items).map(([productId, quantity]) => {
    const product = products.find(p => p.id === productId)
    return product ? { product, quantity } : null
  }).filter(Boolean) as { product: Product; quantity: number }[]

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const platformFee = Math.round(subtotal * 0.02 * 100) / 100
  const total = subtotal + platformFee

  if (itemCount === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 sm:p-6 z-40">
      <div className="mx-auto max-w-7xl space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          <span className="font-medium text-gray-900">Subtotal: ₼{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Platform fee (2%)</span>
          <span className="font-medium text-gray-900">₼{platformFee.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold border-t border-gray-200 pt-3">
          <span className="text-gray-900">Total</span>
          <span className="text-blue-600">₼{total.toFixed(2)}</span>
        </div>
        <button
          onClick={onPlaceOrder}
          disabled={loading || itemCount === 0}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Placing Order...' : `Place Order — ₼${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}