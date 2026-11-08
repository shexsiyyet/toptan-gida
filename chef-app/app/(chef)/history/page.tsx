'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { getCurrentRestaurant } from '@/lib/chef/auth'
import { getOrderHistory, Order } from '@/lib/chef/reorder'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function HistoryPage() {
  const [restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      const rest = await getCurrentRestaurant()
      if (rest) {
        setRestaurant({ id: rest.id, name: rest.name })
        await loadOrders(rest.id)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function loadOrders(restaurantId: string) {
    try {
      const data = await getOrderHistory(restaurantId)
      setOrders(data)
    } catch (err) {
      console.error('Failed to load orders:', err)
    }
  }

  const filteredOrders = orders.filter(order =>
    statusFilter === 'all' || order.status === statusFilter
  )

  async function handleReorder(orderId: string) {
    if (!restaurant) return
    try {
      // Get order items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId)

      if (orderItems && orderItems.length > 0) {
        const cartItems = orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        }))

        // Use cart.createOrder
        const { createOrder } = await import('@/lib/chef/cart')
        await createOrder(restaurant.id, cartItems)

        showSuccess('Order placed from history')
      } else {
        showError('Order has no items')
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to reorder')
    }
  }

  function showSuccess(text: string) {
    setMessage({ type: 'success', text })
    setTimeout(() => setMessage(null), 3000)
  }

  function showError(text: string) {
    setMessage({ type: 'error', text })
    setTimeout(() => setMessage(null), 3000)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Please log in to view order history</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-500">View and reorder from past orders</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-4" aria-label="Order status filters">
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === status
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </nav>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-gray-500">
              {statusFilter !== 'all' ? 'No orders with this status' : 'Your order history will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${expandedOrder === order.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₺{order.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{order.order_items?.length || 0} items</p>
                    </div>
                    <button
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {expandedOrder === order.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Subtotal</p>
                        <p className="font-medium">₺{order.subtotal.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Platform Fee (2%)</p>
                        <p className="font-medium">₺{order.platform_fee.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="font-semibold text-lg">₺{order.total.toFixed(2)}</p>
                      </div>
                    </div>

                    {order.order_items && order.order_items.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Items</h4>
                        <div className="space-y-2">
                          {order.order_items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Product {item.product_id.slice(0, 8)}</p>
                                <p className="text-xs text-gray-500">Qty: {item.quantity} × ₺{Number(item.unit_price).toFixed(2)}</p>
                              </div>
                              <p className="font-medium text-gray-900">₺{Number(item.line_total).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReorder(order.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        Reorder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}