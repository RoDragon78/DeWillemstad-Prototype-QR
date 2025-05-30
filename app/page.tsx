"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Anchor } from "lucide-react"

export default function HomePage() {
  const [cabinNumber, setCabinNumber] = useState("")
  const [language, setLanguage] = useState("en")
  const router = useRouter()

  const handleContinue = () => {
    if (cabinNumber.trim()) {
      localStorage.setItem("selectedCabin", cabinNumber)
      router.push("/select-guests")
    }
  }

  const handleAdminClick = () => {
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-right mb-4">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">🇬🇧 English</SelectItem>
              <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
              <SelectItem value="de">🇩🇪 German</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
                <Anchor className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">DeWillemstad Meal Selection</CardTitle>
            <CardDescription>River Cruise Dining</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="cabin" className="block text-sm font-medium text-gray-700 mb-2">
                Cabin Number
              </label>
              <Input
                id="cabin"
                type="text"
                value={cabinNumber}
                onChange={(e) => setCabinNumber(e.target.value)}
                placeholder="Enter your cabin number"
                onKeyPress={(e) => e.key === "Enter" && handleContinue()}
              />
            </div>
            <Button onClick={handleContinue} className="w-full" disabled={!cabinNumber.trim()}>
              Continue
            </Button>
            <div className="text-center">
              <button onClick={handleAdminClick} className="text-sm text-gray-500 hover:text-gray-700 underline">
                Admin
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
