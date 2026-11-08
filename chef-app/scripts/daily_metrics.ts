#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

interface Metrics {
  date: string
  total_orders: number
  total_revenue: number
  platform_fees: number
  active_restaurants: number
  repeat_restaurants_week2: number
  avg_order_value: number
  orders_by_status: Record<string, number>
}

async function getMetrics(distributorId: string, days: number = 7): Promise<Metrics> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()

  // Get orders in period
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, platform_fee, status, restaurant_id, created_at')
    .eq('distributor_id', distributorId)
    .gte('created_at', sinceStr)

  if (error) throw error

  const totalOrders = orders?.length || 0
  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0
  const platformFees = orders?.reduce((sum, o) => sum + o.platform_fee, 0) || 0

  // Unique restaurants that ordered
  const restaurantIds = new Set(orders?.map(o => o.restaurant_id))
  const activeRestaurants = restaurantIds.size

  // Week 2 repeat rate (restaurants with 2+ orders in days 8-14)
  const week2Start = new Date()
  week2Start.setDate(week2Start.getDate() - 14)
  const week2End = new Date()
  week2End.setDate(week2End.getDate() - 7)

  const { data: week2Orders } = await supabase
    .from('orders')
    .select('restaurant_id')
    .eq('distributor_id', distributorId)
    .gte('created_at', week2Start.toISOString())
    .lt('created_at', week2End.toISOString())

  const week2Counts = new Map<string, number>()
  week2Orders?.forEach(o => {
    week2Counts.set(o.restaurant_id, (week2Counts.get(o.restaurant_id) || 0) + 1)
  })

  const repeatRestaurantsWeek2 = Array.from(week2Counts.values()).filter(c => c >= 2).length

  // Avg order value
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Orders by status
  const ordersByStatus: Record<string, number> = {}
  orders?.forEach(o => {
    ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
  })

  return {
    date: new Date().toISOString().split('T')[0],
    total_orders: totalOrders,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    platform_fees: Math.round(platformFees * 100) / 100,
    active_restaurants: activeRestaurants,
    repeat_restaurants_week2: repeatRestaurantsWeek2,
    avg_order_value: Math.round(avgOrderValue * 100) / 100,
    orders_by_status: ordersByStatus,
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.error('Usage: tsx daily_metrics.ts <distributor_id> [days]')
    process.exit(1)
  }

  const [distributorId, daysArg] = args
  const days = daysArg ? parseInt(daysArg, 10) : 7

  console.log(`Fetching metrics for distributor ${distributorId} (last ${days} days)...\n`)

  const metrics = await getMetrics(distributorId, days)

  console.log('=== DAILY METRICS ===')
  console.log(`Date: ${metrics.date}`)
  console.log(`Total Orders: ${metrics.total_orders}`)
  console.log(`Total Revenue: ₼${metrics.total_revenue.toLocaleString()}`)
  console.log(`Platform Fees (2%): ₼${metrics.platform_fees.toLocaleString()}`)
  console.log(`Active Restaurants: ${metrics.active_restaurants}`)
  console.log(`Week 2 Repeat Rate (2+ orders): ${metrics.repeat_restaurants_week2} restaurants`)
  console.log(`Avg Order Value: ₼${metrics.avg_order_value.toLocaleString()}`)
  console.log('\nOrders by Status:')
  for (const [status, count] of Object.entries(metrics.orders_by_status)) {
    console.log(`  ${status}: ${count}`)
  }

  // Kill criteria check
  console.log('\n=== KILL CRITERIA CHECK ===')
  const repeatRate = metrics.active_restaurants > 0
    ? (metrics.repeat_restaurants_week2 / metrics.active_restaurants) * 100
    : 0

  console.log(`Week 2 Repeat Rate: ${repeatRate.toFixed(1)}% (threshold: >40%)`)
  console.log(`Avg Order Value: ₼${metrics.avg_order_value} (threshold: >₼500)`)

  if (repeatRate < 40) {
    console.log('❌ FAIL: Repeat rate below 40% - PIVOT')
  } else {
    console.log('✅ PASS: Repeat rate above 40%')
  }

  if (metrics.avg_order_value < 500) {
    console.log('❌ FAIL: Avg order value below ₼500 - PIVOT')
  } else {
    console.log('✅ PASS: Avg order value above ₼500')
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})