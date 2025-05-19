"use client"

import { useCallback } from "react"
import { translations, type Language, type TranslationKey } from "./translations"

export function useTranslations(language: Language) {
  const t = useCallback(
    (key: TranslationKey, replacements?: Record<string, string | number>) => {
      let text = translations[language][key] || translations.en[key] || key

      if (replacements) {
        Object.entries(replacements).forEach(([key, value]) => {
          text = text.replace(`{${key}}`, String(value))
        })
      }

      return text
    },
    [language],
  )

  return { t }
}
