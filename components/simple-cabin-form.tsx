"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SimpleCabinForm() {
  const [cabinNumber, setCabinNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simple validation
    if (cabinNumber.trim()) {
      // Store cabin number in session storage for later use
      sessionStorage.setItem("cabinNumber", cabinNumber)

      // Navigate to the guest selection page
      router.push("/select-guests")
    } else {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cabinNumber" className="block text-center text-sm font-medium text-gray-700">
          Cabin Number
        </label>
        <Input
          id="cabinNumber"
          type="text"
          placeholder="Enter your cabin number"
          value={cabinNumber}
          onChange={(e) => setCabinNumber(e.target.value)}
          className="mt-2"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        Continue
      </Button>
    </form>
  )
}
