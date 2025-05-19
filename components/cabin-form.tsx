"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const formSchema = z.object({
  cabinNumber: z.string().min(1, {
    message: "Cabin number is required",
  }),
})

export default function CabinForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cabinNumber: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      // Create Supabase client directly in the component
      const supabase = createSupabaseClient(
        "https://attdjiaiquhmcmipxgrt.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dGRqaWFpcXVobWNtaXB4Z3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTg3ODMsImV4cCI6MjA2Mjk3NDc4M30.suoAVmwx0nnO33MCYqresbYryhGdYR_oRUhe0P0i2oE",
      )

      // Check if cabin exists in the manifest
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", values.cabinNumber)
        .eq("cruise_id", "CR2023-06") // Using the cruise ID from sample data

      if (error) {
        console.error("Supabase query error:", error)
        throw error
      }

      if (!data || data.length === 0) {
        setError("No guests found for this cabin number. Please check and try again.")
        setIsLoading(false)
        return
      }

      // Redirect to guest selection page with cabin number
      router.push(`/select-guests?cabin=${values.cabinNumber}`)
    } catch (err: any) {
      console.error("Error checking cabin:", err)
      setError(
        err.message || "An error occurred connecting to the database. Please check your connection and try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="cabinNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cabin Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter your cabin number (e.g., A101)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Checking..." : "Continue"}
        </Button>
      </form>
    </Form>
  )
}
