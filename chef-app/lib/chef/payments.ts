import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
export const supabaseClient = createClient(supabaseUrl, supabaseKey)

const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'iyzico'
const IYZICO_API_KEY = process.env.IYZICO_API_KEY || 'test-key'
const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY || 'test-secret'
const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'

export interface Order {
  id: string
  restaurant_id: string
  distributor_id: string
  status: string
  subtotal: number
  platform_fee: number
  total: number
}

export interface Invoice {
  id: string
  order_id: string
  invoice_number: string
  status: string
  total: number
}

export interface PaymentSession {
  checkoutUrl: string
  sessionId: string
}

export interface PaymentCallbackResult {
  success: boolean
  amount?: number
  provider_ref?: string
  provider?: string
  error?: string
}

export interface DistributorPayout {
  platform_fee: number
  distributor_amount: number
  currency: string
}

interface PaymentProvider {
  createCheckout(params: {
    amount: number
    currency: string
    reference: string
    callbackUrl: string
    cancelUrl: string
  }): Promise<PaymentSession>
  verifyCallback(payload: any): Promise<PaymentCallbackResult>
}

class IyzicoProvider implements PaymentProvider {
  async createCheckout(params: {
    amount: number
    currency: string
    reference: string
    callbackUrl: string
    cancelUrl: string
  }): Promise<PaymentSession> {
    const response = await fetch(`${IYZICO_BASE_URL}/v2/checkoutform/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${IYZICO_API_KEY}:${IYZICO_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({
        locale: 'tr',
        conversationId: params.reference,
        price: params.amount.toFixed(2),
        paidPrice: params.amount.toFixed(2),
        currency: params.currency,
        installment: '1',
        basketId: params.reference,
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        callbackUrl: params.callbackUrl,
        cancelUrl: params.cancelUrl,
        buyer: {
          id: params.reference,
          name: 'Customer',
          surname: 'Customer',
          email: 'customer@example.com',
          identityNumber: '12345678900',
          registrationAddress: 'Test Address',
          ip: '127.0.0.1',
          city: 'Istanbul',
          country: 'Turkey',
          zipCode: '34000',
        },
        shippingAddress: {
          contactName: 'Customer',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address',
          zipCode: '34000',
        },
        billingAddress: {
          contactName: 'Customer',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address',
          zipCode: '34000',
        },
        basketItems: [
          {
            id: params.reference,
            name: `Order ${params.reference}`,
            category1: 'Food',
            itemType: 'PHYSICAL',
            price: params.amount.toFixed(2),
          },
        ],
      }),
    })

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(`İyzico checkout failed: ${data.errorMessage}`)
    }

    return {
      checkoutUrl: data.checkoutFormContent,
      sessionId: data.token,
    }
  }

  async verifyCallback(payload: any): Promise<PaymentCallbackResult> {
    const response = await fetch(`${IYZICO_BASE_URL}/v2/checkoutform/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${IYZICO_API_KEY}:${IYZICO_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({
        locale: 'tr',
        conversationId: payload.conversationId,
        token: payload.token,
      }),
    })

    const data = await response.json()

    if (data.status === 'success' && data.paymentStatus === 'SUCCESS') {
      return {
        success: true,
        amount: parseFloat(data.paidPrice),
        provider_ref: data.paymentId,
        provider: 'iyzico',
      }
    }

    return {
      success: false,
      error: data.errorMessage || 'Payment failed',
      provider_ref: data.paymentId,
      provider: 'iyzico',
    }
  }
}

class MockProvider implements PaymentProvider {
  async createCheckout(params: {
    amount: number
    currency: string
    reference: string
    callbackUrl: string
    cancelUrl: string
  }): Promise<PaymentSession> {
    return {
      checkoutUrl: `https://mock-payment.com/checkout/${params.reference}`,
      sessionId: `mock_${params.reference}`,
    }
  }

  async verifyCallback(payload: any): Promise<PaymentCallbackResult> {
    return {
      success: true,
      amount: payload.amount || 100,
      provider_ref: `MOCK-${payload.reference}`,
      provider: 'mock',
    }
  }
}

let providerInstance: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (!providerInstance) {
    if (process.env.NODE_ENV === 'production' && PAYMENT_PROVIDER === 'iyzico') {
      providerInstance = new IyzicoProvider()
    } else {
      providerInstance = new MockProvider()
    }
  }
  return providerInstance
}

export async function createPaymentSession(orderId: string): Promise<{ checkoutUrl: string }> {
  const { data: order, error } = await supabaseClient
    .from('orders')
    .select('id, total, restaurant_id, distributor_id')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    throw new Error('Order not found')
  }

  const provider = getPaymentProvider()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await provider.createCheckout({
    amount: order.total,
    currency: 'TRY',
    reference: order.id,
    callbackUrl: `${baseUrl}/api/chef/payment/callback`,
    cancelUrl: `${baseUrl}/checkout/cancel?order_id=${order.id}`,
  })

  return { checkoutUrl: session.checkoutUrl }
}

export async function handlePaymentCallback(payload: any): Promise<void> {
  const provider = getPaymentProvider()
  const result = await provider.verifyCallback(payload)

  const invoiceId = payload.invoice_id || payload.conversationId

  if (!invoiceId) {
    throw new Error('Invoice ID not found in callback')
  }

  const { data: invoice, error: invError } = await supabaseClient
    .from('invoices')
    .select('id, total, order_id, status')
    .eq('id', invoiceId)
    .single()

  if (invError || !invoice) {
    throw new Error('Invoice not found')
  }

  if (result.success) {
    const paymentAmount = result.amount || invoice.total

    // Record payment
    const { error: payError } = await supabaseClient
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        amount: paymentAmount,
        provider: result.provider || 'unknown',
        provider_ref: result.provider_ref,
        status: 'completed',
      })

    if (payError) {
      throw new Error(`Failed to record payment: ${payError.message}`)
    }

    // Update invoice status to paid if full amount
    if (paymentAmount >= invoice.total) {
      const { error: invUpdateError } = await supabaseClient
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      if (invUpdateError) {
        throw new Error(`Failed to update invoice: ${invUpdateError.message}`)
      }

      // Update order status
      await supabaseClient
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', invoice.order_id)
    }
  } else {
    // Record failed payment
    await supabaseClient
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        amount: result.amount || 0,
        provider: result.provider || 'unknown',
        provider_ref: result.provider_ref,
        status: 'failed',
      })
  }
}

export function calculateDistributorPayout(totalAmount: number, platformFeeRate: number = 0.02): DistributorPayout {
  const platformFee = Math.round(totalAmount * platformFeeRate * 100) / 100
  const distributorAmount = totalAmount - platformFee

  return {
    platform_fee: platformFee,
    distributor_amount: distributorAmount,
    currency: 'TRY',
  }
}