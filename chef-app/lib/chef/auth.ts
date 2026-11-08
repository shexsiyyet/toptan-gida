import { createClient, User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export interface Restaurant {
  id: string
  distributor_id: string
  name: string
  contact_name: string
  phone: string
  email: string | null
  address: string | null
  tax_number: string | null
  subscription_tier: 'free' | 'basic' | 'pro'
  subscription_status: 'active' | 'past_due' | 'cancelled'
  created_at: string
}

export interface AuthSession {
  user: {
    id: string
    phone: string
  }
  session: {
    access_token: string
    refresh_token: string
  } | null
}

function toAuthUser(user: User | null): { id: string; phone: string } | null {
  if (!user) return null
  return {
    id: user.id,
    phone: user.phone || '',
  }
}

export async function signInWithPhone(phone: string): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      channel: 'sms',
    },
  })

  if (error) {
    throw new Error(`Failed to send OTP: ${error.message}`)
  }

  const user = data.user as User | null
  const session = data.session as { access_token: string; refresh_token: string } | null

  if (session && user) {
    return {
      user: toAuthUser(user)!,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    }
  }

  if (user) {
    return {
      user: toAuthUser(user)!,
      session: null,
    }
  }

  return null
}

export async function verifyOTP(phone: string, code: string): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: 'sms',
  })

  if (error) {
    throw new Error(`Failed to verify OTP: ${error.message}`)
  }

  const user = data.user as User | null
  const session = data.session as { access_token: string; refresh_token: string } | null

  if (session && user) {
    return {
      user: toAuthUser(user)!,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    }
  }

  return null
}

export async function getCurrentRestaurant(): Promise<Restaurant | null> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.phone) {
    return null
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('phone', user.phone)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch restaurant: ${error.message}`)
  }

  return data
}