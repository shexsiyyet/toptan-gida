import { createClient } from '@supabase/supabase-js'
import { generateInvoicePDF, InvoiceData } from './pdf-generator'

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export interface Order {
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
}

export interface InvoiceResult {
  invoiceId: string
  pdfUrl: string
}

async function getNextInvoiceNumber(distributorId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('distributor_id', distributorId)
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].invoice_number.split('-').pop() || '0')
    nextNum = lastNum + 1
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export async function generateInvoice(orderId: string): Promise<InvoiceResult> {
  // Fetch order with related data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      restaurants!inner (
        id, name, contact_name, phone, email, address, tax_number
      ),
      distributors!inner (
        id, name, contact_name, phone, email, address, tax_number
      ),
      order_items (
        *,
        products!inner (sku, name, unit)
      )
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderError?.message}`)
  }

  if (order.status !== 'confirmed' && order.status !== 'delivered') {
    throw new Error(`Cannot generate invoice for order with status: ${order.status}`)
  }

  // Check if invoice already exists
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('order_id', orderId)
    .single()

  if (existingInvoice) {
    throw new Error('Invoice already exists for this order')
  }

  const invoiceNumber = await getNextInvoiceNumber(order.distributor_id)
  const issueDate = new Date().toISOString()
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30) // 30 days payment terms

  // Prepare data for PDF generation
  const pdfData: InvoiceData = {
    invoiceNumber,
    issueDate: formatDate(issueDate),
    dueDate: formatDate(dueDate.toISOString()),
    supplier: {
      name: order.distributors.name,
      contactName: order.distributors.contact_name,
      phone: order.distributors.phone,
      email: order.distributors.email,
      address: order.distributors.address,
      taxNumber: order.distributors.tax_number,
    },
    buyer: {
      name: order.restaurants.name,
      contactName: order.restaurants.contact_name,
      phone: order.restaurants.phone,
      email: order.restaurants.email,
      address: order.restaurants.address,
      taxNumber: order.restaurants.tax_number,
    },
    items: order.order_items.map((item: any) => ({
      name: item.products.name,
      unit: item.products.unit,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
  }

  // Generate PDF using shared utility
  const pdfBytes = await generateInvoicePDF(pdfData)
  const pdfBuffer = Buffer.from(pdfBytes)

  // Upload to Supabase Storage
  const fileName = `invoices/${invoiceNumber}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
  const pdfUrl = urlData.publicUrl

  // Create invoice record
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      order_id: orderId,
      invoice_number: invoiceNumber,
      pdf_url: pdfUrl,
      status: 'issued',
      issued_at: issueDate,
      due_at: dueDate.toISOString(),
    })
    .select()
    .single()

  if (invoiceError || !invoice) {
    throw new Error(`Failed to create invoice record: ${invoiceError?.message}`)
  }

  return { invoiceId: invoice.id, pdfUrl }
}

export async function getOrders(distributorId: string, status?: string): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('distributor_id', distributorId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  return data || []
}
