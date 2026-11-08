'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Restaurant } from '@/lib/chef/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

interface ChefLayoutProps {
  children: React.ReactNode
}

export default function ChefLayout({ children }: ChefLayoutProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRestaurant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.phone) {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('phone', user.phone)
          .single()
        setRestaurant(data)
      }
      setLoading(false)
    }
    loadRestaurant()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadRestaurant()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Chef navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/cart" className="text-xl font-bold text-gray-900">
                Toptan Gıda
              </Link>
              {restaurant && (
                <div className="hidden md:flex md:gap-6">
                  <Link
                    href="/cart"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Cart
                  </Link>
                  <Link
                    href="/orders"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Orders
                  </Link>
                  <Link
                    href="/profile"
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Profile
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {restaurant ? (
                <>
                  <span className="text-sm text-gray-500">{restaurant.name}</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    restaurant.subscription_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {restaurant.subscription_tier}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Chef Portal</span>
              )}
            </div>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}