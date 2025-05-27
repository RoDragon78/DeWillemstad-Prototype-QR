"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"

interface PdfGeneratorProps {
  content: string
  filename: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function PdfGenerator({ content, filename, onSuccess, onError }: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false)

  // Check if html2pdf is loaded
  useEffect(() => {
    if (typeof window !== "undefined" && window.html2pdf) {
      setIsLibraryLoaded(true)
    } else {
      // Try to load the library
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
      script.async = true
      script.onload = () => {
        setIsLibraryLoaded(true)
      }
      document.body.appendChild(script)

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [])

  const generatePdf = () => {
    if (!isLibraryLoaded) {
      if (onError) onError(new Error("PDF library not loaded"))
      return
    }

    setIsGenerating(true)

    try {
      // Create a temporary container for the PDF content
      const container = document.createElement("div")
      container.innerHTML = content
      container.style.position = "absolute"
      container.style.left = "-9999px"
      document.body.appendChild(container)

      // Use html2pdf to generate and download the PDF
      window.html2pdf(container, {
        margin: 10,
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })

      // Clean up after a delay to ensure PDF generation completes
      setTimeout(() => {
        document.body.removeChild(container)
        setIsGenerating(false)
        if (onSuccess) onSuccess()
      }, 2000)
    } catch (error) {
      console.error("Error generating PDF:", error)
      setIsGenerating(false)
      if (onError) onError(error as Error)
    }
  }

  return (
    <Button variant="outline" onClick={generatePdf} disabled={isGenerating || !isLibraryLoaded}>
      <FileDown className="mr-2 h-4 w-4" />
      {isGenerating ? "Generating PDF..." : "Save as PDF"}
    </Button>
  )
}
