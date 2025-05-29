"use client"

import { useState } from "react"
import { supabaseCleanup } from "@/utils/supabase-cleanup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SupabaseDebug() {
  const [isVisible, setIsVisible] = useState(false)

  // Only show in development or when there are auth issues
  if (process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
        >
          🔧 Debug Auth
        </Button>
      ) : (
        <Card className="w-80 bg-white shadow-lg border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-700">Supabase Debug Tools</CardTitle>
            <CardDescription className="text-xs">
              Use these tools if you're experiencing authentication issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                supabaseCleanup.clearCorrupted()
                alert("Corrupted data cleared. Try logging in again.")
              }}
            >
              Clear Corrupted Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                supabaseCleanup.clearAll()
                alert("All Supabase data cleared. Page will refresh.")
                setTimeout(() => supabaseCleanup.refreshPage(), 1000)
              }}
            >
              Clear All & Refresh
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setIsVisible(false)}>
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
