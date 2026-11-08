'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  line_total: number
  products: {
    sku: string
    name: string
    unit: string
  }
}

interface Order {
  id: string
  restaurant_id: string
  distributor_id: string
  status: string
  subtotal: number
  platform_fee: number
  total: number
  notes: string | null
  created_at: string
  confirmed_at: string | null
  restaurants: {
    id: string
    name: string
    contact_name: string
    phone: string
    email: string
    address: string
  }
  distributors: {
    id: string
    name: string
    contact_name: string
    phone: string
    email: string
    address: string
  }
  order_items: OrderItem[]
}

interface Invoice {
  id: string
  invoice_number: string
  pdf_url: string
  status: string
  issued_at: string
  due_at: string
  paid_at: string | null
}

interface OrderDetailProps {
  orderId: string
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN' }).format(amount)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  function getInvoiceStatusBadge(status: string) {
    const styles: Record<string, string> = {
      issued: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  async function fetchOrder() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants (id, name, contact_name, phone, email, address),
          distributors (id, name, contact_name, phone, email, address),
          order_items (
            *,
            products (sku, name, unit)
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error
      setOrder(data)

      // Fetch invoice if exists
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .single()
      setInvoice(inv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateInvoice() {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/supplier/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate invoice')
      await fetchOrder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invoice')
    } finally {
      setGenerating(false)
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoice.id)
      if (error) throw error
      await fetchOrder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as paid')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading order...</div>
  }

  if (error && !order) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>
  }

  if (!order) {
    return <div className="text-center py-12 text-gray-500">Order not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.id.slice(0, 8)}</h1>
          <p className="text-gray-500">Created: {formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Order Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Restaurant Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">Restaurant (Buyer)</h3>
          <dl className="space-y-2 text-sm">
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium">{order.restaurants.name}</dd>
            <dt className="text-gray-500">Contact</dt>
            <dd>{order.restaurants.contact_name}</dd>
            <dt className="text-gray-500">Phone</dt>
            <dd>{order.restaurants.phone}</dd>
            <dt className="text-gray-500">Email</dt>
            <dd>{order.restaurants.email}</dd>
            <dt className="text-gray-500">Address</dt>
            <dd>{order.restaurants.address}</dd>
          </dl>
        </div>

        {/* Distributor Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">Distributor (Seller)</h3>
          <dl className="space-y-2 text-sm">
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium">{order.distributors.name}</dd>
            <dt className="text-gray-500">Contact</dt>
            <dd>{order.distributors.contact_name}</dd>
            <dt className="text-gray-500">Phone</dt>
            <dd>{order.distributors.phone}</dd>
            <dt className="text-gray-500">Email</dt>
            <dd>{order.distributors.email}</dd>
            <dt className="text-gray-500">Address</dt>
            <dd>{order.distributors.address}</dd>
          </dl>
        </div>

        {/* Invoice Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">Invoice</h3>
          {invoice ? (
            <dl className="space-y-2 text-sm">
              <dt className="text-gray-500">Invoice Number</dt>
              <dd className="font-medium">{invoice.invoice_number}</dd>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInvoiceStatusBadge(invoice.status)}`}>
                  {invoice.status}
                </span>
              </dd>
              <dt className="text-gray-500">Issued</dt>
              <dd>{formatDate(invoice.issued_at)}</dd>
              <dt className="text-gray-500">Due</dt>
              <dd>{formatDate(invoice.due_at)}</dd>
              <dt className="text-gray-500">Paid</dt>
              <dd>{invoice.paid_at ? formatDate(invoice.paid_at) : 'Not paid'}</dd>
              <div className="pt-2 flex gap-2">
                <a
                  href={invoice.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Download PDF
                </a>
                {invoice.status === 'issued' && (
                  <button
                    onClick={handleMarkPaid}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            </dl>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-500 text-sm">No invoice generated yet</p>
              <button
                onClick={handleGenerateInvoice}
                disabled={generating}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.order_items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.products.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.products.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.products.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right font-medium text-gray-900">Subtotal</td>
                <td className="px-6 py-3 text-sm text-gray-900">{formatCurrency(order.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right font-medium text-gray-900">Platform Fee (2%)</td>
                <td className="px-6 py-3 text-sm text-gray-900">{formatCurrency(order.platform_fee)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right font-bold text-gray-900">Total</td>
                <td className="px-6 py-3 text-sm font-bold text-gray-900">{formatCurrency(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-600">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
