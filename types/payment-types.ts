export interface PayCountry {
  id: string
  name: string
  code: string
  currency_code: string
  exchange_rate: number
  created_at?: string
  updated_at?: string
}

export interface PayBank {
  id: string
  country_id: string
  name: string
  payment_number: string
  created_at?: string
  updated_at?: string
}

export interface PayNetwork {
  id: string
  country_id: string
  name: string
  created_at?: string
  updated_at?: string
}

export interface PayConfig {
  id: number
  country_id: string
  bank_id?: string
  network_id?: string
  mobile_number?: string
  requires_name: boolean
  requires_date: boolean
  requires_ref_number: boolean
  requires_amount: boolean
  requires_sender_mobile: boolean
  requires_screenshot: boolean
  created_at?: string
  updated_at?: string
}

export interface PaySubmission {
  id: string
  user_id: string
  config_id?: number
  bank_id: number
  network_id?: number
  date?: string
  amount?: number
  processed_by?: string
  processed_at?: string
  created_at: string
  updated_at?: string
  status: string
  name?: string
  notes?: string
  reference_number?: string
  sender_mobile?: string
  screenshot_url?: string
  amount_usd?: number
  pay_countries?: {
    name: string
  }
  pay_banks?: {
    name: string
  }
}
