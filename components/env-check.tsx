"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { supabaseConfig } from "@/lib/config"

export function EnvCheck() {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "success" | "error">("checking")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple fetch to test the connection
        const response = await fetch(`${supabaseConfig.url}/rest/v1/?apikey=${supabaseConfig.anonKey}`)

        if (response.ok) {
          setConnectionStatus("success")
        } else {
          setConnectionStatus("error")
          setErrorMessage(`Connection failed with status: ${response.status}`)
        }
      } catch (error) {
        setConnectionStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "Unknown error")
      }
    }

    checkConnection()
  }, [])

  if (connectionStatus === "checking") {
    return (
      <Alert className="mb-4">
        <AlertTitle>Checking Supabase connection...</AlertTitle>
      </Alert>
    )
  }

  if (connectionStatus === "success") {
    return (
      <Alert className="mb-4 bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-600">Connected to Supabase</AlertTitle>
        <AlertDescription className="text-green-600">Your database connection is working properly.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Connection Error</AlertTitle>
      <AlertDescription>Could not connect to Supabase. {errorMessage}</AlertDescription>
    </Alert>
  )
}
