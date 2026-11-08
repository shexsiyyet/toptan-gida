import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

export interface TelegramBot {
  sendMessage: (chatId: number, text: string, parseMode?: string) => Promise<any>
  editMessageText: (chatId: number, messageId: number, text: string) => Promise<any>
  answerCallbackQuery: (callbackQueryId: string, text?: string) => Promise<any>
}

export function createTelegramBot(token: string): TelegramBot {
  const apiUrl = `https://api.telegram.org/bot${token}`

  return {
    async sendMessage(chatId: number, text: string, parseMode = 'HTML') {
      const response = await fetch(`${apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
      })
      return response.json()
    },

    async editMessageText(chatId: number, messageId: number, text: string) {
      const response = await fetch(`${apiUrl}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
      })
      return response.json()
    },

    async answerCallbackQuery(callbackQueryId: string, text?: string) {
      const response = await fetch(`${apiUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      })
      return response.json()
    },
  }
}

export interface Restaurant {
  id: string
  name: string
  telegram_chat_id: number | null
  distributor_id: string
}

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

export async function getRestaurantByChatId(
  supabase: SupabaseClient,
  chatId: number
): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, telegram_chat_id, distributor_id')
    .eq('telegram_chat_id', chatId)
    .single()

  if (error || !data) return null
  return data
}

export async function getRestaurantByLinkCode(
  supabase: SupabaseClient,
  linkCode: string
): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('telegram_link_code', linkCode)
    .single()

  if (error || !data) return null
  return data
}

export async function linkRestaurantToTelegram(
  supabase: SupabaseClient,
  restaurantId: string,
  chatId: number
): Promise<void> {
  await supabase
    .from('restaurants')
    .update({ telegram_chat_id: chatId, telegram_link_code: null })
    .eq('id', restaurantId)
}

export async function sendOrderNotification(
  supabase: SupabaseClient,
  bot: TelegramBot,
  restaurantId: string,
  order: Order
): Promise<void> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('telegram_chat_id, name')
    .eq('id', restaurantId)
    .single()

  if (!restaurant || !restaurant.telegram_chat_id) return

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

export async function sendInvoiceNotification(
  supabase: SupabaseClient,
  bot: TelegramBot,
  restaurantId: string,
  invoice: Invoice
): Promise<void> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('telegram_chat_id, name')
    .eq('id', restaurantId)
    .single()

  if (!restaurant || !restaurant.telegram_chat_id) return

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

export async function sendPaymentReminder(
  supabase: SupabaseClient,
  bot: TelegramBot,
  restaurantId: string,
  invoice: Invoice,
  daysOverdue: number
): Promise<void> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('telegram_chat_id, name')
    .eq('id', restaurantId)
    .single()

  if (!restaurant || !restaurant.telegram_chat_id) return

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

export async function getRecentOrders(
  supabase: SupabaseClient,
  restaurantId: string,
  limit = 10
): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, total, status, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data
}

export async function getLastOrder(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<{ id: string; order_items: Array<{ product_id: string; quantity: number }> } | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_items(product_id, quantity)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}