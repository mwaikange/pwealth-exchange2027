export interface PayCountry {
  id: string
  name: string
  code: string
  currency_code: string
  currency_symbol: string
  exchange_rate: number
  created_at: string
}

export interface PayBank {
  id: string
  country_id: string
  name: string
  payment_number: string
  created_at: string
}

export interface PayNetwork {
  id: string
  country_id: string
  name: string
  created_at: string
}

export interface PayConfig {
  id: string
  country_id: string
  bank_id: string | null
  require_name: boolean
  require_date: boolean
  require_reference: boolean
  require_amount: boolean
  require_mobile: boolean
  require_screenshot: boolean
  created_at: string
}

export interface PaySubmission {
  id: string
  user_id: string
  country_id: string
  bank_id: string
  network_id: string | null
  name: string | null
  transaction_date: string | null
  reference_number: string | null
  amount: number
  amount_usd: number
  mobile_number: string | null
  screenshot_url: string | null
  status: "pending" | "processed" | "declined"
  created_at: string
}
