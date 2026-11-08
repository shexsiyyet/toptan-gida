import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
export const supabaseClient = createClient(supabaseUrl, supabaseKey)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test-token'
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

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

export interface Invoice {
  id: string
  order_id: string
  invoice_number: string
  pdf_url: string | null
  status: string
  issued_at: string
  due_at: string
  paid_at: string | null
  total: number
}

export interface Restaurant {
  id: string
  name: string
  telegram_chat_id: number | null
  distributor_id: string
}

let botInstance: TelegramBot | null = null

class TelegramBot {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  async sendMessage(chatId: number, text: string, parseMode?: string): Promise<any> {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode || 'HTML',
      }),
    })
    return response.json()
  }

  async editMessageText(chatId: number, messageId: number, text: string): Promise<any> {
    const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
      }),
    })
    return response.json()
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<any> {
    const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    })
    return response.json()
  }
}

export function getBot(): TelegramBot {
  if (!botInstance) {
    botInstance = new TelegramBot(TELEGRAM_BOT_TOKEN)
  }
  return botInstance
}

export async function sendOrderNotification(restaurantId: string, order: Order): Promise<void> {
  const bot = getBot()

  const { data: restaurant, error } = await supabaseClient
    .from('restaurants')
    .select('telegram_chat_id, name')
    .eq('id', restaurantId)
    .single()

  if (error || !restaurant || !restaurant.telegram_chat_id) {
    return // Restaurant not linked to Telegram
  }

  const message = `
<b>🔔 Yeni sipariş onaylandı</b>

<b>Restoran:</b> ${restaurant.name}
<b>Sipariş No:</b> <code>${order.id.slice(0, 8)}</code>
<b>Toplam:</b> ${order.total.toFixed(2)} ₼
<b>Durum:</b> ${order.status}

Sipariş detayları için uygulamaya gidin.
  `.trim()

  await bot.sendMessage(restaurant.telegram_chat_id, message)
}

export async function sendInvoiceNotification(restaurantId: string, invoice: Invoice): Promise<void> {
  const bot = getBot()

  const { data: restaurant, error } = await supabaseClient
    .from('restaurants')
    .select('telegram_chat_id, name')
    .eq('id', restaurantId)
    .single()

  if (error || !restaurant || !restaurant.telegram_chat_id) {
    return // Restaurant not linked to Telegram
  }

  const message = `
<b>📄 Yeni fatura kesildi</b>

<b>Restoran:</b> ${restaurant.name}
<b>Fatura No:</b> <code>${invoice.invoice_number}</code>
<b>Tutar:</b> ${invoice.total.toFixed(2)} ₼
<b>Son Ödeme Tarihi:</b> ${new Date(invoice.due_at).toLocaleDateString('tr-TR')}

Fatura detayları için uygulamaya gidin.
  `.trim()

  await bot.sendMessage(restaurant.telegram_chat_id, message)
}

export async function sendPaymentReminder(restaurantId: string, invoice: Invoice, daysOverdue: number): Promise<void> {
  const bot = getBot()

  const { data: restaurant, error } = await supabaseClient
    .from('restaurants')
    .select('telegram_chat_id, name')
    .eq('id', restaurantId)
    .single()

  if (error || !restaurant || !restaurant.telegram_chat_id) {
    return
  }

  const message = `
<b>⚠️ Ödeme hatırlatması</b>

<b>Restoran:</b> ${restaurant.name}
<b>Fatura No:</b> <code>${invoice.invoice_number}</code>
<b>Tutar:</b> ${invoice.total.toFixed(2)} ₼
<b>Gecikme:</b> ${daysOverdue} gün

Lütfen en kısa sürede ödeme yapın.
  `.trim()

  await bot.sendMessage(restaurant.telegram_chat_id, message)
}

export interface TelegramUpdate {
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

export async function handleTelegramWebhook(update: TelegramUpdate): Promise<void> {
  const bot = getBot()

  if (update.message) {
    const chatId = update.message.chat.id
    const text = update.message.text || ''
    const userId = update.message.from.id

    if (text.startsWith('/start')) {
      await handleStartCommand(bot, chatId, userId, text)
    } else if (text === '/orders') {
      await handleOrdersCommand(bot, chatId, userId)
    } else if (text === '/reorder') {
      await handleReorderCommand(bot, chatId, userId)
    } else if (text === '/help') {
      await handleHelpCommand(bot, chatId)
    }
  }

  if (update.callback_query) {
    await handleCallbackQuery(bot, update.callback_query)
  }
}

async function handleStartCommand(bot: TelegramBot, chatId: number, userId: number, text: string): Promise<void> {
  const args = text.split(' ')
  const linkCode = args[1]

  if (linkCode) {
    // Try to link restaurant with this code
    const { data: restaurant, error } = await supabaseClient
      .from('restaurants')
      .select('id, name')
      .eq('telegram_link_code', linkCode)
      .single()

    if (error || !restaurant) {
      await bot.sendMessage(chatId, '❌ Geçersiz bağlantı kodu. Lütfen uygulamadan yeni bir kod alın.')
      return
    }

    // Update restaurant with telegram_chat_id
    const { error: updateError } = await supabaseClient
      .from('restaurants')
      .update({ telegram_chat_id: chatId, telegram_link_code: null })
      .eq('id', restaurant.id)

    if (updateError) {
      await bot.sendMessage(chatId, '❌ Bağlantı sırasında hata oluştu. Lütfen tekrar deneyin.')
      return
    }

    await bot.sendMessage(chatId, `✅ <b>${restaurant.name}</b> başarıyla bağlandı! Artık sipariş bildirimlerini burada alacaksınız.`)
    return
  }

  // No link code - show help
  await handleHelpCommand(bot, chatId)
}

async function handleOrdersCommand(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  // Find restaurant by chat_id
  const { data: restaurant } = await supabaseClient
    .from('restaurants')
    .select('id, name')
    .eq('telegram_chat_id', chatId)
    .single()

  if (!restaurant) {
    await bot.sendMessage(chatId, '❌ Hesabınız henüz bağlı değil. /start <kod> ile bağlayın.')
    return
  }

  const { data: orders } = await supabaseClient
    .from('orders')
    .select('id, total, status, created_at')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!orders || orders.length === 0) {
    await bot.sendMessage(chatId, '📭 Henüz siparişiniz yok.')
    return
  }

  let message = `<b>📋 Son Siparişleriniz (${restaurant.name})</b>\n\n`
  for (const order of orders) {
    const statusEmoji = order.status === 'confirmed' ? '✅' : order.status === 'delivered' ? '📦' : '⏳'
    message += `${statusEmoji} <code>${order.id.slice(0, 8)}</code> - ${order.total.toFixed(2)} ₼ - ${order.status}\n`
  }

  await bot.sendMessage(chatId, message)
}

async function handleReorderCommand(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  const { data: restaurant } = await supabaseClient
    .from('restaurants')
    .select('id, name')
    .eq('telegram_chat_id', chatId)
    .single()

  if (!restaurant) {
    await bot.sendMessage(chatId, '❌ Hesabınız henüz bağlı değil. /start <kod> ile bağlayın.')
    return
  }

  const { data: lastOrder } = await supabaseClient
    .from('orders')
    .select('id, order_items(product_id, quantity)')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastOrder) {
    await bot.sendMessage(chatId, '📭 Yeniden sipariş vereceğiniz bir sipariş yok.')
    return
  }

  // In a real implementation, this would create a new order from the template
  // For now, just show the last order items
  const items = lastOrder.order_items || []
  let message = `<b>🔁 Son siparişten yeniden sipariş</b>\n\n`
  message += `<b>Sipariş:</b> <code>${lastOrder.id.slice(0, 8)}</code>\n\n`
  for (const item of items) {
    message += `• ${item.quantity} x ${item.product_id}\n`
  }
  message += '\nUygulamadan "Tekrar Sipariş" butonuyla tamamlayın.'

  await bot.sendMessage(chatId, message)
}

async function handleHelpCommand(bot: TelegramBot, chatId: number): Promise<void> {
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

  await bot.sendMessage(chatId, message)
}

async function handleCallbackQuery(bot: TelegramBot, callbackQuery: any): Promise<void> {
  await bot.answerCallbackQuery(callbackQuery.id)
}