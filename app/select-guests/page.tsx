"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GuestSelectionForm } from "@/components/guest-selection-form"
import { clientStorage } from "@/utils/client-storage"

export default function SelectGuestsPage() {
  const router = useRouter()
  const [cabinNumber, setCabinNumber] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get cabin number from session storage
    const storedCabinNumber = clientStorage.getSessionItem("cabinNumber")

    if (!storedCabinNumber) {
      // Redirect back to home if no cabin number is found
      router.push("/")
      return
    }

    setCabinNumber(storedCabinNumber)
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Select Guests</h1>
          <p className="mt-2 text-gray-600">Cabin {cabinNumber}</p>
        </div>

        <GuestSelectionForm cabinNumber={cabinNumber || ""} />
      </div>
    </div>
  )
}
