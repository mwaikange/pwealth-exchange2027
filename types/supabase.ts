export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      app_users: {
        Row: {
          country: string | null
          created_at: string
          display_id: string
          email: string | null
          name: string | null
          referral_code: string | null
          status: string | null
          user_uuid: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_id: string
          email?: string | null
          name?: string | null
          referral_code?: string | null
          status?: string | null
          user_uuid: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_id?: string
          email?: string | null
          name?: string | null
          referral_code?: string | null
          status?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      balances: {
        Row: {
          activation_fee_balance: number
          created_at: string
          display_id: string
          pwt_cashout_balance: number
          pwt_invest_balance: number
          updated_at: string | null
          user_uuid: string
        }
        Insert: {
          activation_fee_balance: number
          created_at?: string
          display_id: string
          pwt_cashout_balance: number
          pwt_invest_balance: number
          updated_at?: string | null
          user_uuid: string
        }
        Update: {
          activation_fee_balance?: number
          created_at?: string
          display_id?: string
          pwt_cashout_balance?: number
          pwt_invest_balance?: number
          updated_at?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          display_id: string | null
          referred_email: string | null
          referred_uuid: string | null
          referral_code: string | null
          referral_date: string | null
          referrer_email: string | null
          status: string | null
          user_uuid: string | null
        }
        Insert: {
          created_at?: string | null
          display_id?: string | null
          referred_email?: string | null
          referred_uuid?: string | null
          referral_code?: string | null
          referral_date?: string | null
          referrer_email?: string | null
          status?: string | null
          user_uuid?: string | null
        }
        Update: {
          created_at?: string | null
          display_id?: string | null
          referred_email?: string | null
          referred_uuid?: string | null
          referral_code?: string | null
          referral_date?: string | null
          referrer_email?: string | null
          status?: string | null
          user_uuid?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_type: string | null
          amount: number | null
          amount_usd: number | null
          created_at: string | null
          description: string | null
          recipient_email: string | null
          reference: string | null
          sender_email: string | null
          transaction_id: string
          transaction_type: string | null
          user_uuid: string | null
        }
        Insert: {
          account_type?: string | null
          amount?: number | null
          amount_usd?: number | null
          created_at?: string | null
          description?: string | null
          recipient_email?: string | null
          reference?: string | null
          sender_email?: string | null
          transaction_id: string
          transaction_type?: string | null
          user_uuid?: string | null
        }
        Update: {
          account_type?: string | null
          amount?: number | null
          amount_usd?: number | null
          created_at?: string | null
          description?: string | null
          recipient_email?: string | null
          reference?: string | null
          sender_email?: string | null
          transaction_id?: string
          transaction_type?: string | null
          user_uuid?: string | null
        }
        Relationships: []
      }
      usersettings: {
        Row: {
          mfa_enabled: boolean | null
          referral_code: string | null
          user_uuid: string
        }
        Insert: {
          mfa_enabled?: boolean | null
          referral_code?: string | null
          user_uuid: string
        }
        Update: {
          mfa_enabled?: boolean | null
          referral_code?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      vesting_schedules: {
        Row: {
          activated: boolean | null
          claimed: boolean | null
          created_at: string | null
          last_claim_percentage: number | null
          last_claim_time: string | null
          level: number | null
          position: string | null
          prematurely_claimed: boolean | null
          progress: number | null
          schedule_id: string
          start_time: string | null
          user_uuid: string | null
        }
        Insert: {
          activated?: boolean | null
          claimed?: boolean | null
          created_at?: string | null
          last_claim_percentage?: number | null
          last_claim_time?: string | null
          level?: number | null
          position?: string | null
          prematurely_claimed?: boolean | null
          progress?: number | null
          schedule_id: string
          start_time?: string | null
          user_uuid?: string | null
        }
        Update: {
          activated?: boolean | null
          claimed?: boolean | null
          created_at?: string | null
          last_claim_percentage?: number | null
          last_claim_time?: string | null
          level?: number | null
          position?: string | null
          prematurely_claimed?: boolean | null
          progress?: number | null
          schedule_id?: string
          start_time?: string | null
          user_uuid?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
