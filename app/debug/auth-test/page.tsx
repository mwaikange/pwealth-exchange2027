"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState<any>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    async function checkAuth() {
      try {
        setLoading(true)
        setError(null)

        // Get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
          setUser(null)
          setSession(null)
          return
        }

        setSession(sessionData.session)

        // Get the current user
        if (sessionData.session) {
          const { data: userData, error: userError } = await supabase.auth.getUser()

          if (userError) {
            setError(`User error: ${userError.message}`)
            setUser(null)
            return
          }

          setUser(userData.user)
        } else {
          setUser(null)
        }
      } catch (err) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
        setUser(null)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [supabase.auth])

  async function handleRefreshSession() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        setError(`Refresh error: ${error.message}`)
        return
      }

      setSession(data.session)
      setUser(data.user)
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleTestServerAction() {
    try {
      setLoading(true)
      setTestResult(null)
      setError(null)

      // Import the server action dynamically to avoid issues with "use server" directive
      const { getCountries } = await import("@/actions/payment-actions")

      // Call the server action
      const countries = await getCountries()

      setTestResult({
        success: true,
        message: "Server action executed successfully",
        data: countries,
      })
    } catch (err) {
      setError(`Server action error: ${err instanceof Error ? err.message : String(err)}`)
      setTestResult({
        success: false,
        message: `Server action failed: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.signOut()

      if (error) {
        setError(`Sign out error: ${error.message}`)
        return
      }

      setUser(null)
      setSession(null)
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>

      {loading && <p className="text-gray-500">Loading...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current user and session information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">User:</h3>
                {user ? (
                  <pre className="bg-gray-100 p-2 rounded-md overflow-auto text-sm mt-2">
                    {JSON.stringify(
                      {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        aud: user.aud,
                        created_at: user.created_at,
                      },
                      null,
                      2,
                    )}
                  </pre>
                ) : (
                  <p className="text-gray-500 mt-2">No user logged in</p>
                )}
              </div>

              <div>
                <h3 className="font-medium">Session:</h3>
                {session ? (
                  <pre className="bg-gray-100 p-2 rounded-md overflow-auto text-sm mt-2">
                    {JSON.stringify(
                      {
                        access_token: session.access_token ? `${session.access_token.substring(0, 10)}...` : null,
                        refresh_token: session.refresh_token ? `${session.refresh_token.substring(0, 10)}...` : null,
                        expires_at: session.expires_at,
                        expires_in: session.expires_in,
                      },
                      null,
                      2,
                    )}
                  </pre>
                ) : (
                  <p className="text-gray-500 mt-2">No active session</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handleRefreshSession} disabled={loading}>
              Refresh Session
            </Button>
            {user && (
              <Button onClick={handleSignOut} variant="outline" disabled={loading}>
                Sign Out
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Server Action Test</CardTitle>
            <CardDescription>Test server action with authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleTestServerAction} disabled={loading}>
                Test Server Action
              </Button>

              {testResult && (
                <div
                  className={`mt-4 p-4 rounded-md ${
                    testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  <h3 className={`font-medium ${testResult.success ? "text-green-700" : "text-red-700"}`}>
                    {testResult.message}
                  </h3>
                  {testResult.data && (
                    <pre className="bg-gray-100 p-2 rounded-md overflow-auto text-sm mt-2">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Cookies Information</CardTitle>
            <CardDescription>Current cookies in the browser</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-2 rounded-md overflow-auto text-sm">
              {document.cookie ? document.cookie : "No cookies found"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
