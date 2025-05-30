"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, ChefHat, LogOut, Download } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
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
  const supabase = createClientComponentClient()

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
    localStorage.removeItem("adminLoggedIn")
    router.push("/admin/login")
  }

  const exportData = () => {
    const csv = [
      ["Cabin", "Guest Index", "Day", "Meal Type", "Meal Name", "Submitted At"],
      ...mealChoices.map((choice) => [
        choice.cabin_nr,
        choice.guest_index,
        choice.day,
        choice.meal_type,
        choice.meal_name,
        choice.submitted_at,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `meal-selections-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
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
            <h1 className="text-3xl font-bold">DeWillemstad Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Users className="h-4 w-4 mr-2" />
            Table Assignment
          </Button>
          <Button variant="outline">
            <ChefHat className="h-4 w-4 mr-2" />
            Analytics & Insights
          </Button>
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Guest Management
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Data Tools
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Control Panel</h2>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
          <div className="flex gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700">Assign Tables Automatically</Button>
            <Button variant="destructive">Clear All Assignments</Button>
            <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
              Import Guest Manifest
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">86</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Assigned Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">86</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tables Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">18</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unassigned Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">0</div>
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
