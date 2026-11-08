'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Restaurant } from '@/lib/chef/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  past_due: 'Past Due',
  cancelled: 'Cancelled',
}

export default function ProfilePage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [distributors, setDistributors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.phone) {
        const [{ data: rest }, { data: dists }] = await Promise.all([
          supabase.from('restaurants').select('*').eq('phone', user.phone).single(),
          supabase.from('distributors').select('id, name, contact_name, phone, email').eq('id', (await supabase.from('restaurants').select('distributor_id').eq('phone', user.phone).single()).data?.distributor_id),
        ])
        setRestaurant(rest)
        if (dists) setDistributors(dists)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Restaurant Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your restaurant information and subscription.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Restaurant Info */}
        <div className="md:col-span-2 lg:col-span-2 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Restaurant Information</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{restaurant.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
              <dd className="mt-1 text-sm text-gray-900">{restaurant.contact_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{restaurant.phone}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{restaurant.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">{restaurant.address || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tax Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{restaurant.tax_number || '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Subscription Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Subscription</h2>
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Plan</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                  restaurant.subscription_tier === 'pro' ? 'bg-purple-100 text-purple-800' :
                  restaurant.subscription_tier === 'basic' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {TIER_LABELS[restaurant.subscription_tier]}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                  restaurant.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                  restaurant.subscription_status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {STATUS_LABELS[restaurant.subscription_status]}
                </span>
              </dd>
            </div>
          </div>
        </div>

        {/* Linked Distributors */}
        <div className="md:col-span-2 lg:col-span-3 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Linked Distributors</h2>
          {distributors.length === 0 ? (
            <p className="text-gray-500">No distributors linked yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {distributors.map((dist) => (
                    <tr key={dist.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dist.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dist.contact_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dist.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dist.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}