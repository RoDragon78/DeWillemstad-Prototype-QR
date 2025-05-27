"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { clientStorage } from "@/utils/client-storage"
import { Printer } from "lucide-react"

interface MealSelection {
  guestName: string
  mealOption: string
}

interface ConfirmationDetailsProps {
  cabinNumber: string
  mealSelections: MealSelection[]
}

export function ConfirmationDetails({ cabinNumber, mealSelections }: ConfirmationDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Simulate API call to save meal selections
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Clear session storage after successful submission
      clientStorage.removeSessionItem("cabinNumber")
      clientStorage.removeSessionItem("guests")
      clientStorage.removeSessionItem("mealSelections")

      setIsSuccess(true)
    } catch (error) {
      console.error("Error submitting meal selections:", error)
      alert("There was an error submitting your selections. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const originalContents = document.body.innerHTML
    const printContents = printContent.innerHTML

    document.body.innerHTML = `
      <div style="padding: 20px;">
        <h1 style="text-align: center; margin-bottom: 20px;">DeWillemstad Meal Selections</h1>
        <h2 style="margin-bottom: 10px;">Cabin: ${cabinNumber}</h2>
        ${printContents}
      </div>
    `

    window.print()
    document.body.innerHTML = originalContents
    window.location.reload()
  }

  const handleStartOver = () => {
    router.push("/")
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-green-600">Thank You!</h2>
        <p className="mb-6 text-lg">Your meal selections have been successfully submitted for Cabin {cabinNumber}.</p>
        <p className="mb-8">
          You will receive a confirmation email shortly. If you need to make any changes, please contact the cruise
          staff.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={handleStartOver}>Return to Home</Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Confirmation
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div ref={printRef}>
        <h2 className="mb-4 text-xl font-semibold">Your Meal Selections</h2>
        <div className="rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Guest</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Meal Selection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mealSelections.map((selection, index) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                    {selection.guestName}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">{selection.mealOption}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-4 text-blue-800">
        <p>
          Please review your selections carefully. Once submitted, changes can only be made by contacting the cruise
          staff.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleStartOver}>
          Start Over
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Confirm and Submit"}
          </Button>
        </div>
      </div>
    </div>
  )
}
