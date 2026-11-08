import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; username?: string; first_name?: string }
    chat: { id: number; type: string }
    date: number
    text?: string
    entities?: Array<{ type: string; offset: number; length: number }>
  }
  callback_query?: {
    id: string
    from: { id: number; username?: string; first_name?: string }
    message?: { message_id: number; chat: { id: number } }
    data?: string
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!
    const telegramApiUrl = `https://api.telegram.org/bot${telegramBotToken}`

    const update: TelegramUpdate = await req.json()

    // Handle message
    if (update.message) {
      await handleMessage(supabase, telegramApiUrl, update.message)
    }

    // Handle callback query
    if (update.callback_query) {
      await handleCallbackQuery(supabase, telegramApiUrl, update.callback_query)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function handleMessage(
  supabase: any,
  telegramApiUrl: string,
  message: TelegramUpdate['message']
): Promise<void> {
  if (!message || !message.text) return

  const chatId = message.chat.id
  const text = message.text.trim()
  const userId = message.from.id

  const sendMessage = async (chatId: number, text: string) => {
    await fetch(`${telegramApiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  }

  if (text.startsWith('/start')) {
    await handleStartCommand(supabase, sendMessage, chatId, userId, text)
  } else if (text === '/orders') {
    await handleOrdersCommand(supabase, sendMessage, chatId, userId)
  } else if (text === '/reorder') {
    await handleReorderCommand(supabase, sendMessage, chatId, userId)
  } else if (text === '/help') {
    await handleHelpCommand(sendMessage, chatId)
  }
}

async function handleCallbackQuery(
  supabase: any,
  telegramApiUrl: string,
  callbackQuery: TelegramUpdate['callback_query']
): Promise<void> {
  if (!callbackQuery) return

  await fetch(`${telegramApiUrl}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQuery.id }),
  })
}

async function handleStartCommand(
  supabase: any,
  sendMessage: (chatId: number, text: string) => Promise<void>,
  chatId: number,
  userId: number,
  text: string
): Promise<void> {
  const args = text.split(' ')
  const linkCode = args[1]

  if (linkCode) {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('telegram_link_code', linkCode)
      .single()

    if (error || !restaurant) {
      await sendMessage(chatId, '❌ Geçersiz bağlantı kodu. Lütfen uygulamadan yeni bir kod alın.')
      return
    }

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ telegram_chat_id: chatId, telegram_link_code: null })
      .eq('id', restaurant.id)

    if (updateError) {
      await sendMessage(chatId, '❌ Bağlantı sırasında hata oluştu. Lütfen tekrar deneyin.')
      return
    }

    await sendMessage(chatId, `✅ <b>${restaurant.name}</b> başarıyla bağlandı! Artık sipariş bildirimlerini burada alacaksınız.`)
    return
  }

  await handleHelpCommand(sendMessage, chatId)
}

async function handleOrdersCommand(
  supabase: any,
  sendMessage: (chatId: number, text: string) => Promise<void>,
  chatId: number,
  userId: number
): Promise<void> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('telegram_chat_id', chatId)
    .single()

  if (!restaurant) {
    await sendMessage(chatId, '❌ Hesabınız henüz bağlı değil. /start <kod> ile bağlayın.')
    return
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, status, created_at')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!orders || orders.length === 0) {
    await sendMessage(chatId, '📭 Henüz siparişiniz yok.')
    return
  }

  let message = `<b>📋 Son Siparişleriniz (${restaurant.name})</b>\n\n`
  for (const order of orders) {
    const statusEmoji = order.status === 'confirmed' ? '✅' : order.status === 'delivered' ? '📦' : '⏳'
    message += `${statusEmoji} <code>${order.id.slice(0, 8)}</code> - ${order.total.toFixed(2)} ₼ - ${order.status}\n`
  }

  await sendMessage(chatId, message)
}

async function handleReorderCommand(
  supabase: any,
  sendMessage: (chatId: number, text: string) => Promise<void>,
  chatId: number,
  userId: number
): Promise<void> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('telegram_chat_id', chatId)
    .single()

  if (!restaurant) {
    await sendMessage(chatId, '❌ Hesabınız henüz bağlı değil. /start <kod> ile bağlayın.')
    return
  }

  const { data: lastOrder } = await supabase
    .from('orders')
    .select('id, order_items(product_id, quantity)')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastOrder) {
    await sendMessage(chatId, '📭 Yeniden sipariş vereceğiniz bir sipariş yok.')
    return
  }

  const items = lastOrder.order_items || []
  let message = `<b>🔁 Son siparişten yeniden sipariş</b>\n\n`
  message += `<b>Sipariş:</b> <code>${lastOrder.id.slice(0, 8)}</code>\n\n`
  for (const item of items) {
    message += `• ${item.quantity} x ${item.product_id}\n`
  }
  message += '\nUygulamadan "Tekrar Sipariş" butonuyla tamamlayın.'

  await sendMessage(chatId, message)
}

async function handleHelpCommand(
  sendMessage: (chatId: number, text: string) => Promise<void>,
  chatId: number
): Promise<void> {
  const message = `
<b>🤖 Toptan Gıda Bot - Yardım</b>

<b>Komutlar:</b>
/start <kod> - Restoran hesabınızı bağlayın
/orders - Son siparişlerinizi görün
/reorder - Son siparişinizi tekrar edin
/help - Bu mesajı göster

<b>Bağlantı kodu nasıl alınır?</b>
1. Uygulamayı açın
2. Profil → Telegram Bağla
3. Gösterilen kodu buraya girin: <code>/start KOD</code>

<b>Bildirimler:</b>
• Sipariş onaylandığında
• Fatura kesildiğinde
• Ödeme tarihi yaklaştığında
  `.trim()

  await sendMessage(chatId, message)
}