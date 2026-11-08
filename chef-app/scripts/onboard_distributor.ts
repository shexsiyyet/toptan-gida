#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

interface DistributorData {
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
  tax_number: string
}

interface ProductRow {
  sku: string
  name: string
  category: string
  unit: string
  price: number
  stock: number
  min_order_qty: number
  description?: string
}

async function createDistributor(data: DistributorData) {
  const { data: dist, error } = await supabase
    .from('distributors')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return dist
}

async function importProducts(distributorId: string, filePath: string): Promise<number> {
  const buffer = readFileSync(resolve(filePath))
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<ProductRow>(sheet)

  if (rows.length === 0) {
    console.log('No products found in Excel file')
    return 0
  }

  const products = rows.map(row => ({
    distributor_id: distributorId,
    sku: row.sku,
    name: row.name,
    category: row.category,
    unit: row.unit,
    price: row.price,
    stock: row.stock,
    min_order_qty: row.min_order_qty || 1,
    description: row.description,
    is_active: true,
  }))

  const { error } = await supabase.from('products').insert(products)
  if (error) throw error

  console.log(`Imported ${products.length} products for distributor ${distributorId}`)
  return products.length
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: tsx onboard_distributor.ts <excel_file> <name> <contact> <phone> <email> <address> <tax_number>')
    process.exit(1)
  }

  const [excelFile, name, contact, phone, email, address, taxNumber] = args

  console.log('Creating distributor...')
  const distributor = await createDistributor({
    name,
    contact_name: contact,
    phone,
    email,
    address,
    tax_number: taxNumber,
  })
  console.log(`Distributor created: ${distributor.id}`)

  console.log('Importing products from Excel...')
  const count = await importProducts(distributor.id, excelFile)
  console.log(`Imported ${count} products`)

  if (count < 50) {
    console.warn('⚠️  WARNING: Less than 50 SKUs imported. Pilot kill criteria may trigger.')
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})