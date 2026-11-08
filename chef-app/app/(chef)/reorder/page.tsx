'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { getCurrentRestaurant } from '@/lib/chef/auth'
import { getReorderTemplates, createReorderTemplate, createOrderFromTemplate, ReorderTemplate } from '@/lib/chef/reorder'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function ReorderPage() {
  const [restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null)
  const [templates, setTemplates] = useState<ReorderTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [ordering, setOrdering] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      const rest = await getCurrentRestaurant()
      if (rest) {
        setRestaurant({ id: rest.id, name: rest.name })
        await loadTemplates(rest.id)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function loadTemplates(restaurantId: string) {
    try {
      const data = await getReorderTemplates(restaurantId)
      setTemplates(data)
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
  }

  async function handleCreateFromLastOrder() {
    if (!restaurant) return
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (orders && orders.length > 0) {
        const template = await createReorderTemplate(orders[0].id, 'Last Order')
        setTemplates([template, ...templates])
        showSuccess('Template created from last order')
      } else {
        showError('No previous orders found')
      }
    } catch (err) {
      showError('Failed to create template')
    }
  }

  async function handleCreateNewTemplate() {
    if (!newTemplateName.trim() || !restaurant) return
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (orders && orders.length > 0) {
        const template = await createReorderTemplate(orders[0].id, newTemplateName)
        setTemplates([template, ...templates])
        setNewTemplateName('')
        setShowCreateModal(false)
        showSuccess('Template created')
      } else {
        showError('No previous orders found')
      }
    } catch (err) {
      showError('Failed to create template')
    }
  }

  async function handleReorder(templateId: string) {
    setOrdering(templateId)
    try {
      const order = await createOrderFromTemplate(templateId)
      showSuccess(`Order ${order.id.slice(0, 8)} created`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setOrdering(null)
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm('Delete this template?')) return
    try {
      await supabase.from('reorder_templates').delete().eq('id', templateId)
      setTemplates(templates.filter(t => t.id !== templateId))
      showSuccess('Template deleted')
    } catch (err) {
      showError('Failed to delete template')
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
        <p className="text-gray-500">Please log in to view reorder templates</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Reorder Templates</h1>
          <p className="text-gray-500">Quick reorder from saved templates</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCreateFromLastOrder}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Create from Last Order
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Create New Template
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Create New Template</h2>
            <input
              type="text"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="Template name (e.g., Weekly Basics)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No templates yet</h3>
          <p className="mt-1 text-gray-500">Create a template from your last order to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.items.length} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReorder(template.id)}
                    disabled={ordering === template.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                  >
                    {ordering === template.id ? 'Ordering...' : 'Reorder'}
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                Created: {new Date(template.created_at).toLocaleDateString('tr-TR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}