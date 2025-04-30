import { SupabaseConnectionTest } from "@/components/supabase-connection-test"

export default function SupabaseTestPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Supabase Connection Test</h1>
      <SupabaseConnectionTest />
    </div>
  )
}
