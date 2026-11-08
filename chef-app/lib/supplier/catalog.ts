import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export interface Product {
  id: string
  distributor_id: string
  sku: string
  name: string
  category: string
  unit: string
  price: number
  stock_quantity: number
  min_order_qty: number
  is_active: boolean
  created_at: string
}

export interface ProductInput {
  distributor_id: string
  sku: string
  name: string
  category: string
  unit: string
  price: number
  stock_quantity: number
  min_order_qty: number
  is_active?: boolean
}

export interface ImportResult {
  imported: number
  errors: string[]
}

function validateRow(row: any, rowNum: number): string | null {
  if (!row.SKU || String(row.SKU).trim() === '') {
    return `Row ${rowNum}: Missing SKU`
  }
  if (!row.Name || String(row.Name).trim() === '') {
    return `Row ${rowNum}: Missing Name`
  }
  if (!row.Category || String(row.Category).trim() === '') {
    return `Row ${rowNum}: Missing Category`
  }
  if (!row.Unit || String(row.Unit).trim() === '') {
    return `Row ${rowNum}: Missing Unit`
  }
  const price = Number(row.Price)
  if (isNaN(price) || price < 0) {
    return `Row ${rowNum}: Invalid Price (must be >= 0)`
  }
  const stock = Number(row.Stock)
  if (isNaN(stock) || stock < 0) {
    return `Row ${rowNum}: Invalid Stock (must be >= 0)`
  }
  const minOrder = Number(row.MinOrderQty)
  if (isNaN(minOrder) || minOrder < 1) {
    return `Row ${rowNum}: Invalid MinOrderQty (must be >= 1)`
  }
  return null
}

export async function importCatalogFromExcel(
  fileBuffer: Buffer | ArrayBuffer,
  distributorId: string
): Promise<ImportResult> {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet)

  const errors: string[] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>
    const rowNum = i + 2 // 1-indexed + header row

    const validationError = validateRow(row, rowNum)
    if (validationError) {
      errors.push(validationError)
      continue
    }

    const productInput: ProductInput = {
      distributor_id: distributorId,
      sku: String(row.SKU).trim(),
      name: String(row.Name).trim(),
      category: String(row.Category).trim(),
      unit: String(row.Unit).trim(),
      price: Number(row.Price),
      stock_quantity: Number(row.Stock),
      min_order_qty: Number(row.MinOrderQty),
      is_active: true,
    }

    try {
      await upsertProduct(productInput)
      imported++
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { imported, errors }
}

export async function getProducts(distributorId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('distributor_id', distributorId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  return data || []
}

export async function upsertProduct(product: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .upsert({
      distributor_id: product.distributor_id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      stock_quantity: product.stock_quantity,
      min_order_qty: product.min_order_qty,
      is_active: product.is_active ?? true,
    }, {
      onConflict: 'distributor_id,sku',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to upsert product: ${error.message}`)
  }

  return data
}