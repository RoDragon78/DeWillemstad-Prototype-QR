"use client"

import { useState, useEffect } from "react"
import CabinForm from "@/components/cabin-form"
import SimpleCabinForm from "@/components/simple-cabin-form"
import { ConnectionTest } from "@/components/connection-test"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function Home() {
  const [useSimpleForm, setUseSimpleForm] = useState(false)
  const [formError, setFormError] = useState<Error | null>(null)

  // Error boundary for the form component
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Caught error:", event.error)
      setFormError(event.error)
      setUseSimpleForm(true)
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason)
      setFormError(new Error(event.reason?.message || "Unknown error"))
      setUseSimpleForm(true)
    })

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleError)
    }
  }, [])

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cruise Dining Selection</h1>
        <p className="text-muted-foreground mt-2">
          Please enter your cabin number to begin selecting your dinner options
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {formError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Form Error</AlertTitle>
            <AlertDescription>There was an error loading the form. Using simplified version instead.</AlertDescription>
          </Alert>
        )}

        {useSimpleForm ? <SimpleCabinForm /> : <CabinForm />}
      </div>

      <div className="mt-12">
        <ConnectionTest />
      </div>
    </div>
  )
}
