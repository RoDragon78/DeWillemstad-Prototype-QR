"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PrintPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page since we're now using direct PDF generation
    router.push("/")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecting to home page...</p>
    </div>
  )
}
