"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MealSelectionForm } from "@/components/meal-selection-form"

interface Guest {
  name: string
  dietaryRestrictions: string
}

export default function MealSelectionPage() {
  const router = useRouter()
  const [cabinNumber, setCabinNumber] = useState<string | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])

  useEffect(() => {
    // Get cabin number and guests from session storage
    const storedCabinNumber = sessionStorage.getItem("cabinNumber")
    const storedGuests = sessionStorage.getItem("guests")

    if (!storedCabinNumber || !storedGuests) {
      // Redirect back to home if data is missing
      router.push("/")
      return
    }

    setCabinNumber(storedCabinNumber)
    setGuests(JSON.parse(storedGuests))
  }, [router])

  if (!cabinNumber || guests.length === 0) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Meal Selection</h1>
          <p className="mt-2 text-gray-600">Cabin {cabinNumber}</p>
        </div>

        <MealSelectionForm cabinNumber={cabinNumber} guests={guests} />
      </div>
    </div>
  )
}
