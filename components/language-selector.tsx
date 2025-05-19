"use client"

import { useState, useEffect } from "react"
import type { Language } from "@/lib/i18n/translations"

interface LanguageSelectorProps {
  language: Language
  onChange: (language: Language) => void
}

export function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="absolute top-4 right-4 flex space-x-2">
      <button
        onClick={() => onChange("en")}
        className={`px-2 py-1 rounded ${
          language === "en" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onChange("de")}
        className={`px-2 py-1 rounded ${
          language === "de" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
        }`}
      >
        DE
      </button>
      <button
        onClick={() => onChange("nl")}
        className={`px-2 py-1 rounded ${
          language === "nl" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
        }`}
      >
        NL
      </button>
    </div>
  )
}
