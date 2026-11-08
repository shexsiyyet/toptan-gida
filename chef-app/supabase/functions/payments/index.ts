import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  order_id: string
}

interface CallbackPayload {
  token?: string
  conversationId?: string
  paymentId?: string
  status?: string
  paidPrice?: string
  errorMessage?: string
  invoice_id?: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const iyzicoApiKey = Deno.env.get('IYZICO_API_KEY')!
    const iyzicoSecretKey = Deno.env.get('IYZICO_SECRET_KEY')!
    const iyzicoBaseUrl = Deno.env.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com'
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'

    const path = new URL(req.url).pathname

    if (path.endsWith('/create-session') && req.method === 'POST') {
      return await handleCreateSession(supabase, iyzicoApiKey, iyzicoSecretKey, iyzicoBaseUrl, appUrl, await req.json())
    }

    if (path.endsWith('/callback') && req.method === 'POST') {
      return await handleCallback(supabase, iyzicoApiKey, iyzicoSecretKey, iyzicoBaseUrl, await req.json())
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })
  } catch (error) {
    console.error('Payment function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function handleCreateSession(
  supabase: any,
  apiKey: string,
  secretKey: string,
  baseUrl: string,
  appUrl: string,
  body: PaymentRequest
): Promise<Response> {
  const { order_id } = body

  if (!order_id) {
    return new Response(JSON.stringify({ error: 'order_id required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, total, restaurant_id, distributor_id')
    .eq('id', order_id)
    .single()

  if (error || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })
  }

  const session = await createIyzicoCheckout({
    apiKey,
    secretKey,
    baseUrl,
    amount: order.total,
    currency: 'TRY',
    reference: order.id,
    callbackUrl: `${appUrl}/api/chef/payment/callback`,
    cancelUrl: `${appUrl}/checkout/cancel?order_id=${order.id}`,
  })

  return new Response(JSON.stringify({ checkoutUrl: session.checkoutFormContent, sessionId: session.token }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function handleCallback(
  supabase: any,
  apiKey: string,
  secretKey: string,
  baseUrl: string,
  payload: CallbackPayload
): Promise<Response> {
  const result = await verifyIyzicoCallback({
    apiKey,
    secretKey,
    baseUrl,
    token: payload.token,
    conversationId: payload.conversationId,
  })

  const invoiceId = payload.invoice_id || payload.conversationId

  if (!invoiceId) {
    return new Response(JSON.stringify({ error: 'Invoice ID not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total, order_id, status')
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    return new Response(JSON.stringify({ error: 'Invoice not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })
  }

  if (result.success) {
    const paymentAmount = result.amount || invoice.total

    await supabase
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        amount: paymentAmount,
        provider: 'iyzico',
        provider_ref: result.provider_ref,
        status: 'completed',
      })

    if (paymentAmount >= invoice.total) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', invoice.order_id)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } else {
    await supabase
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        amount: result.amount || 0,
        provider: 'iyzico',
        provider_ref: result.provider_ref,
        status: 'failed',
      })

    return new Response(JSON.stringify({ success: false, error: result.error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
}

async function createIyzicoCheckout(params: {
  apiKey: string
  secretKey: string
  baseUrl: string
  amount: number
  currency: string
  reference: string
  callbackUrl: string
  cancelUrl: string
}): Promise<any> {
  const auth = btoa(`${params.apiKey}:${params.secretKey}`)

  const response = await fetch(`${params.baseUrl}/v2/checkoutform/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
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

  return response.json()
}

async function verifyIyzicoCallback(params: {
  apiKey: string
  secretKey: string
  baseUrl: string
  token?: string
  conversationId?: string
}): Promise<{
  success: boolean
  amount?: number
  provider_ref?: string
  error?: string
}> {
  const auth = btoa(`${params.apiKey}:${params.secretKey}`)

  const response = await fetch(`${params.baseUrl}/v2/checkoutform/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      locale: 'tr',
      conversationId: params.conversationId,
      token: params.token,
    }),
  })

  const data = await response.json()

  if (data.status === 'success' && data.paymentStatus === 'SUCCESS') {
    return {
      success: true,
      amount: parseFloat(data.paidPrice),
      provider_ref: data.paymentId,
    }
  }

  return {
    success: false,
    error: data.errorMessage || 'Payment failed',
    provider_ref: data.paymentId,
  }
}