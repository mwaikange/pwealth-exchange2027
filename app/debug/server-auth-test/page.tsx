import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

export default async function ServerAuthTestPage() {
  const cookieStore = cookies()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Create a Supabase client with the cookie store
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  })

  // Try to get the current user
  const { data: userData, error: userError } = await supabase.auth.getUser()

  // Try to get the current session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  // Try to get some data from the database
  const { data: countriesData, error: countriesError } = await supabase.from("pay_countries").select("*").limit(5)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Server-Side Authentication Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">User</h2>
          {userError ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">Error: {userError.message}</p>
            </div>
          ) : (
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">{JSON.stringify(userData, null, 2)}</pre>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Session</h2>
          {sessionError ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">Error: {sessionError.message}</p>
            </div>
          ) : (
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(
                {
                  ...sessionData,
                  session: sessionData.session
                    ? {
                        ...sessionData.session,
                        access_token: sessionData.session.access_token
                          ? `${sessionData.session.access_token.substring(0, 10)}...`
                          : null,
                        refresh_token: sessionData.session.refresh_token
                          ? `${sessionData.session.refresh_token.substring(0, 10)}...`
                          : null,
                      }
                    : null,
                },
                null,
                2,
              )}
            </pre>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Database Test (Countries)</h2>
        {countriesError ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">Error: {countriesError.message}</p>
          </div>
        ) : (
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
            {JSON.stringify(countriesData, null, 2)}
          </pre>
        )}
      </div>

      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Cookies</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
          {cookieStore
            .getAll()
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; ")}
        </pre>
      </div>
    </div>
  )
}
