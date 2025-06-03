"use client"

import { useState } from "react"
import { QRCodeGenerator } from "@/components/qr-code-generator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function QRCodePage() {
  const [cabinNumber, setCabinNumber] = useState("")
  const [showCabinQR, setShowCabinQR] = useState(false)

  // Get the base URL of the application
  const baseUrl =
    typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "https://your-app-url.com"

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">DeWillemstad QR Codes</h1>
          <p className="mt-1 text-gray-600">Generate QR codes for meal selection</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* General QR code */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">General Access</h2>
            <p className="text-gray-600 mb-4">This QR code links to the main page of the meal selection app.</p>
            <QRCodeGenerator baseUrl={baseUrl} />
          </div>

          {/* Cabin-specific QR code */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Cabin-Specific Access</h2>
            <p className="text-gray-600 mb-4">Generate a QR code for a specific cabin number.</p>

            <div className="mb-4">
              <Label htmlFor="cabin-number">Cabin Number</Label>
              <div className="flex mt-1">
                <Input
                  id="cabin-number"
                  value={cabinNumber}
                  onChange={(e) => setCabinNumber(e.target.value)}
                  placeholder="Enter cabin number"
                  className="mr-2"
                />
                <Button onClick={() => setShowCabinQR(!!cabinNumber)} disabled={!cabinNumber}>
                  Generate
                </Button>
              </div>
            </div>

            {showCabinQR && cabinNumber && <QRCodeGenerator baseUrl={baseUrl} cabinNumber={cabinNumber} />}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
