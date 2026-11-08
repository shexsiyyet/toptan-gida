'use client'

import { useState } from 'react'
import { Product } from '@/lib/chef/cart'
import PriceCompareModal from '@/components/chef/PriceCompareModal'

interface ProductCardProps {
  product: Product
  quantity: number
  onQuantityChange: (productId: string, quantity: number) => void
  onCompareClick: (sku: string, name: string) => void
}

export default function ProductCard({ product, quantity, onQuantityChange, onCompareClick }: ProductCardProps) {
  const [showCompare, setShowCompare] = useState(false)

  const handleIncrement = () => {
    onQuantityChange(product.id, quantity + 1)
  }

  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(product.id, quantity - 1)
    }
  }

  const isLowStock = product.stock_quantity < 20

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{product.category} • {product.unit}</p>
          <p className="text-sm text-gray-400 mt-0.5">SKU: {product.sku}</p>
          {product.distributor_name && (
            <p className="text-xs text-gray-400 mt-1">Supplier: {product.distributor_name}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">₼{product.price.toFixed(2)}</p>
            <p className="text-xs text-gray-500">per {product.unit}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {product.stock_quantity > 0 ? (
              <>
                <span className={`text-xs ${isLowStock ? 'text-amber-600' : 'text-green-600'}`}>
                  {isLowStock ? `Low stock: ${product.stock_quantity}` : `${product.stock_quantity} in stock`}
                </span>
              </>
            ) : (
              <span className="text-xs text-red-600">Out of stock</span>
            )}
            <button
              onClick={() => { onCompareClick(product.sku, product.name); setShowCompare(true); }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              disabled={product.stock_quantity === 0}
            >
              Compare
            </button>
          </div>
        </div>
      </div>

      {quantity > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDecrement}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-12 text-center font-medium text-gray-900">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
              aria-label="Increase quantity"
            >
              +
            </button>
            <span className="ml-4 text-sm font-medium text-blue-600">
              Line: ₼{(product.price * quantity).toFixed(2)}
            </span>
          </div>
          <span className="text-xs text-gray-500">Min order: {product.min_order_qty} {product.unit}</span>
        </div>
      )}

      <PriceCompareModal
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
        sku={product.sku}
        productName={product.name}
      />
    </div>
  )
}