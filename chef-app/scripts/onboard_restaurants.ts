#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

interface RestaurantData {
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
  tax_number: string
}

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

async function createRestaurant(distributorId: string, data: RestaurantData) {
  const inviteCode = generateInviteCode()

  const { data: rest, error } = await supabase
    .from('restaurants')
    .insert({
      distributor_id: distributorId,
      ...data,
      subscription_tier: 'pro',
      subscription_status: 'active',
      telegram_link_code: inviteCode,
    })
    .select()
    .single()

  if (error) throw error
  return { ...rest, invite_code: inviteCode }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: tsx onboard_restaurants.ts <distributor_id> <restaurant_csv_file>')
    console.error('CSV format: name,contact_name,phone,email,address,tax_number')
    process.exit(1)
  }

  const [distributorId, csvFile] = args

  const { readFileSync } = await import('fs')
  const content = readFileSync(csvFile, 'utf-8')
  const lines = content.trim().split('\n')

  const header = lines[0].split(',').map(h => h.trim())
  const expected = ['name', 'contact_name', 'phone', 'email', 'address', 'tax_number']

  if (JSON.stringify(header) !== JSON.stringify(expected)) {
    console.error('CSV header mismatch. Expected:', expected.join(','))
    process.exit(1)
  }

  const restaurants: RestaurantData[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length === 6) {
      restaurants.push({
        name: values[0],
        contact_name: values[1],
        phone: values[2],
        email: values[3],
        address: values[4],
        tax_number: values[5],
      })
    }
  }

  console.log(`Onboarding ${restaurants.length} restaurants for distributor ${distributorId}...`)

  const results = []
  for (const rest of restaurants) {
    try {
      const created = await createRestaurant(distributorId, rest)
      results.push({ ...created, status: 'success' })
      console.log(`✓ ${created.name} (${created.phone}) - Invite code: ${created.invite_code}`)
    } catch (err) {
      results.push({ name: rest.name, status: 'failed', error: String(err) })
      console.error(`✗ ${rest.name}: ${err}`)
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Successful: ${results.filter(r => r.status === 'success').length}`)
  console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`)

  console.log('\n--- Telegram Invite Links ---')
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'toptan_bot'
  for (const r of results.filter(r => r.status === 'success')) {
    console.log(`${r.name}: https://t.me/${botUsername}?start=${r.invite_code}`)
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})