"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, ChefHat, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface MealChoice {
  id: number
  cabin_nr: string
  guest_index: number
  day: number
  meal_type: string
  meal_name: string
  submitted_at: string
}

export default function AdminDashboard() {
  const [mealChoices, setMealChoices] = useState<MealChoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadMealChoices()
  }, [])

  const loadMealChoices = async () => {
    try {
      const { data, error } = await supabase
        .from("meal_choices")
        .select("*")
        .order("submitted_at", { ascending: false })

      if (error) throw error
      setMealChoices(data || [])
    } catch (error) {
      console.error("Error loading meal choices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const groupedChoices = mealChoices.reduce(
    (acc, choice) => {
      const key = `${choice.cabin_nr}-${choice.day}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(choice)
      return acc
    },
    {} as Record<string, MealChoice[]>,
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600">Meal Selection Management</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(groupedChoices).length}</div>
              <p className="text-xs text-muted-foreground">Cabin-day combinations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mealChoices.length}</div>
              <p className="text-xs text-muted-foreground">Individual meal selections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Cabins</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(mealChoices.map((c) => c.cabin_nr)).size}</div>
              <p className="text-xs text-muted-foreground">Cabins with selections</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Meal Selections</CardTitle>
            <CardDescription>Latest submissions from guests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedChoices)
                  .slice(0, 10)
                  .map(([key, choices]) => {
                    const [cabin, day] = key.split("-")
                    const submittedAt = new Date(choices[0].submitted_at).toLocaleDateString()

                    return (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">
                              Cabin {cabin} - Day {day}
                            </h4>
                            <p className="text-sm text-gray-600">Submitted: {submittedAt}</p>
                          </div>
                          <Badge variant="secondary">{choices.length} meals</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          {choices.slice(0, 3).map((choice, idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded">
                              <span className="font-medium capitalize">{choice.meal_type}:</span> {choice.meal_name}
                            </div>
                          ))}
                          {choices.length > 3 && <div className="text-gray-500">+{choices.length - 3} more...</div>}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
