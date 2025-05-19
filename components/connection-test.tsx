"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export function ConnectionTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)

  const testConnection = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const supabase = createClient()

      // Test a simple query
      const { data, error } = await supabase.from("guest_manifest").select("cabin_nr").limit(1)

      if (error) {
        throw error
      }

      setResult({
        success: true,
        message: "Successfully connected to Supabase and queried the guest_manifest table.",
        data,
      })
    } catch (err: any) {
      console.error("Connection test error:", err)
      setResult({
        success: false,
        message: err.message || "An unknown error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Run the test on component mount
  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
        <CardDescription>Testing connection to your Supabase database</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Testing connection...</span>
          </div>
        ) : result ? (
          <div className={`p-4 rounded-md ${result.success ? "bg-green-50" : "bg-red-50"}`}>
            <h3 className={`font-medium ${result.success ? "text-green-800" : "text-red-800"}`}>
              {result.success ? "Connection Successful" : "Connection Failed"}
            </h3>
            <p className={`mt-1 text-sm ${result.success ? "text-green-700" : "text-red-700"}`}>{result.message}</p>
            {result.data && (
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button onClick={testConnection} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection Again"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
