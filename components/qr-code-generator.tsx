"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"

interface QRCodeGeneratorProps {
  baseUrl: string
  cabinNumber?: string
  size?: number
}

export function QRCodeGenerator({ baseUrl, cabinNumber, size = 200 }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Create the target URL - either for a specific cabin or the general app
    const targetUrl = cabinNumber ? `${baseUrl}?cabin=${encodeURIComponent(cabinNumber)}` : baseUrl

    // Generate QR code using the Google Charts API
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(targetUrl)}&choe=UTF-8`
    setQrCodeUrl(qrUrl)
    setIsLoading(false)
  }, [baseUrl, cabinNumber, size])

  const handleDownload = () => {
    // Create a temporary link element
    const link = document.createElement("a")
    link.href = qrCodeUrl
    link.download = cabinNumber ? `DeWillemstad-Cabin-${cabinNumber}-QR.png` : "DeWillemstad-Meal-Selection-QR.png"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${cabinNumber ? `Cabin ${cabinNumber} QR Code` : "DeWillemstad Meal Selection QR Code"}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
              }
              .container {
                max-width: 500px;
                margin: 0 auto;
                border: 1px solid #ccc;
                padding: 20px;
                border-radius: 8px;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 10px;
              }
              p {
                font-size: 16px;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>DeWillemstad Meal Selection</h1>
              ${cabinNumber ? `<p>Cabin: ${cabinNumber}</p>` : ""}
              <p>Scan this QR code to access the meal selection app</p>
              <img src="${qrCodeUrl}" alt="QR Code" />
              <p>Or visit: ${baseUrl}</p>
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-40">Loading QR code...</div>
  }

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-medium mb-2">
        {cabinNumber ? `Cabin ${cabinNumber} QR Code` : "DeWillemstad Meal Selection"}
      </h3>
      <p className="text-sm text-gray-500 mb-4">Scan to access the meal selection app</p>

      <div className="border p-2 bg-white rounded mb-4">
        <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" width={size} height={size} />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload} className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center">
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  )
}
