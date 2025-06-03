"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(searchParams.get("error"))
  const [success, setSuccess] = useState(false)

  const supabase = createClientComponentClient()

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()

    if (!token.trim()) {
      setError("Please enter a verification token")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "email",
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // Redirect to dashboard after successful verification
        setTimeout(() => {
          router.push("/admin/dashboard")
        }, 2000)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="mt-2 text-gray-600">
            Enter the verification token from your email to complete the registration process.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>Your email has been verified. Redirecting to dashboard...</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleVerify} className="mt-8 space-y-6">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Verification Token
            </label>
            <Input
              id="token"
              name="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your verification token"
              required
              className="mt-1"
            />
            <p className="mt-2 text-xs text-gray-500">
              The token is the code in the confirmation link after "token=" parameter.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || success}>
            {isLoading ? "Verifying..." : "Verify Email"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Didn&apos;t receive an email?{" "}
            <button
              onClick={() => router.push("/admin/login")}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Return to login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
