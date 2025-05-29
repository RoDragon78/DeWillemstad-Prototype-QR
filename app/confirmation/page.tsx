"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Home } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ConfirmationPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">Thank You!</CardTitle>
          <CardDescription>Your meal selections have been successfully submitted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Your preferences have been saved and will be prepared for your cruise dining experience.
          </p>
          <Button onClick={() => router.push("/")} className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
