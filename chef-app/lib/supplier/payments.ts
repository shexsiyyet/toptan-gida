import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  provider: string
  provider_ref: string | null
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
}

export interface Receivable {
  invoiceId: string
  amount: number
  dueDate: string
  daysOverdue: number
}

export async function recordPayment(
  invoiceId: string,
  amount: number,
  provider: string,
  providerRef: string
): Promise<Payment> {
  // Insert payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      amount,
      provider,
      provider_ref: providerRef,
      status: 'completed',
    })
    .select()
    .single()

  if (paymentError || !payment) {
    throw new Error(`Failed to create payment record: ${paymentError?.message}`)
  }

  // Check if invoice is fully paid
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId)

  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)

  // Get invoice total - need to get from order since invoices table doesn't have total column
  const { data: invoice } = await supabase
    .from('invoices')
    .select('order_id')
    .eq('id', invoiceId)
    .single()

  let invoiceTotal = 0
  if (invoice) {
    const { data: order } = await supabase
      .from('orders')
      .select('total')
      .eq('id', invoice.order_id)
      .single()

    if (order) {
      invoiceTotal = Number(order.total)
    }
  }

  if (totalPaid >= invoiceTotal && invoiceTotal > 0) {
    // Update invoice to paid
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (updateError) {
      throw new Error(`Failed to update invoice status: ${updateError.message}`)
    }
  }

  return {
    id: payment.id,
    invoice_id: payment.invoice_id,
    amount: Number(payment.amount),
    provider: payment.provider,
    provider_ref: payment.provider_ref,
    status: payment.status as Payment['status'],
    created_at: payment.created_at,
  }
}

export async function getReceivables(distributorId: string): Promise<Receivable[]> {
  // Get all invoices with their orders to filter by distributor
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      status,
      issued_at,
      due_at,
      order_id,
      orders!inner (
        id,
        distributor_id,
        total
      )
    `)
    .eq('orders.distributor_id', distributorId)

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`)
  }

  const receivables: Receivable[] = []

  for (const inv of invoices || []) {
    // Get payments for this invoice
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('invoice_id', inv.id)

    const totalPaid = (payments || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const invoiceTotal = Number(inv.orders?.[0]?.total || 0)
    const remaining = invoiceTotal - totalPaid

    if (remaining > 0) {
      const dueDate = new Date(inv.due_at)
      const now = new Date()
      const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

      receivables.push({
        invoiceId: inv.id,
        amount: remaining,
        dueDate: inv.due_at,
        daysOverdue,
      })
    }
  }

  return receivables
}