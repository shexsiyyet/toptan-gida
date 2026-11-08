'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAvailableProducts, Product, CartItem, createOrder } from '@/lib/chef/cart'
import ProductCard from './components/ProductCard'
import SupplierSelector from './components/SupplierSelector'
import CartSummary from './components/CartSummary'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Record<string, number>>({})
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const restaurantRes = await fetch('/api/chef/auth/me')
      if (!restaurantRes.ok) {
        router.push('/login')
        return
      }
      const { restaurant } = await restaurantRes.json()
      const data = await getAvailableProducts(restaurant.id)
      setProducts(data)
    } catch (err) {
      setError('Failed to load products')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const filteredProducts = activeSupplierId
    ? products.filter(p => p.distributor_id === activeSupplierId)
    : products

  const handleQuantityChange = (productId: string, quantity: number) => {
    setItems(prev => {
      const next = { ...prev }
      if (quantity <= 0) {
        delete next[productId]
      } else {
        next[productId] = quantity
      }
      return next
    })
  }

  const handleCompareClick = (sku: string, name: string) => {
    // PriceCompareModal handles this via local state in ProductCard
  }

  const handlePlaceOrder = async () => {
    const cartItems: CartItem[] = Object.entries(items).map(([productId, quantity]) => ({
      product_id: productId,
      quantity,
    }))

    if (cartItems.length === 0) return

    setPlacingOrder(true)
    setError(null)

    try {
      const restaurantRes = await fetch('/api/chef/auth/me')
      if (!restaurantRes.ok) throw new Error('Not authenticated')
      const { restaurant } = await restaurantRes.json()

      const order = await createOrder(restaurant.id, cartItems)
      router.push(`/orders/${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setPlacingOrder(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadProducts} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cart</h1>
        <p className="text-gray-500 mt-1">Compare prices across suppliers and place your order</p>
      </div>

      <SupplierSelector
        products={products}
        activeSupplierId={activeSupplierId}
        onSupplierChange={setActiveSupplierId}
      />

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No products available from this supplier</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={items[product.id] || 0}
              onQuantityChange={handleQuantityChange}
              onCompareClick={handleCompareClick}
            />
          ))}
        </div>
      )}

      <CartSummary
        items={items}
        products={products}
        onPlaceOrder={handlePlaceOrder}
        loading={placingOrder}
      />
    </div>
  )
}