"use client"

import { useEffect, useState, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ArrowLeft, FileDown, Search, Users, Utensils } from "lucide-react"
import { useRouter } from "next/navigation"
import { CabinMealReport } from "@/components/cabin-meal-report"
import { PrintCabinReport } from "@/components/print-cabin-report"

const DAY_NAMES = ["", "", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

export default function CabinReportPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [cabins, setCabins] = useState([])
  const [selectedCabin, setSelectedCabin] = useState("all")
  const [selectedDay, setSelectedDay] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [mealData, setMealData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [isPrinting, setIsPrinting] = useState(false)
  const [summary, setSummary] = useState({
    totalGuests: 0,
    totalCabins: 0,
    completedSelections: 0,
    pendingSelections: 0,
  })

  // Fetch all cabin meal data
  const fetchCabinMealData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch guests with their meal selections
      const { data: guestData, error: guestError } = await supabase
        .from("guest_manifest")
        .select(`
          id,
          guest_name,
          cabin_nr,
          nationality,
          table_nr,
          booking_number
        `)
        .order("cabin_nr", { ascending: true })
        .order("guest_name", { ascending: true })

      if (guestError) {
        console.error("Error fetching guests:", guestError)
        throw guestError
      }

      // Fetch meal selections
      const { data: mealSelections, error: mealError } = await supabase.from("meal_selections").select(`
          guest_id,
          day,
          meal_name,
          meal_category,
          meal_id
        `)

      if (mealError) {
        console.error("Error fetching meal selections:", mealError)
        throw mealError
      }

      // Fetch menu items for additional details
      const { data: menuItems, error: menuError } = await supabase.from("menu_items").select("*")

      if (menuError) {
        console.error("Error fetching menu items:", menuError)
        throw menuError
      }

      // Process and combine data
      const processedData = guestData.map((guest) => {
        const guestMeals = mealSelections.filter((meal) => meal.guest_id === guest.id)
        const mealsByDay = {}

        // Group meals by day
        guestMeals.forEach((meal) => {
          mealsByDay[meal.day] = {
            meal_name: meal.meal_name,
            meal_category: meal.meal_category,
            meal_id: meal.meal_id,
          }
        })

        return {
          ...guest,
          meals: mealsByDay,
          totalMeals: guestMeals.length,
          isComplete: guestMeals.length >= 6, // 6 days of meals
        }
      })

      setMealData(processedData)

      // Get unique cabins
      const uniqueCabins = [...new Set(guestData.map((g) => g.cabin_nr))].sort()
      setCabins(uniqueCabins)

      // Calculate summary
      const totalGuests = guestData.length
      const totalCabins = uniqueCabins.length
      const completedSelections = processedData.filter((g) => g.isComplete).length
      const pendingSelections = totalGuests - completedSelections

      setSummary({
        totalGuests,
        totalCabins,
        completedSelections,
        pendingSelections,
      })
    } catch (error) {
      console.error("Error fetching cabin meal data:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Filter data based on selections
  useEffect(() => {
    let filtered = [...mealData]

    // Filter by cabin
    if (selectedCabin !== "all") {
      filtered = filtered.filter((guest) => guest.cabin_nr === selectedCabin)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (guest) =>
          guest.guest_name?.toLowerCase().includes(term) ||
          guest.cabin_nr?.toLowerCase().includes(term) ||
          guest.nationality?.toLowerCase().includes(term),
      )
    }

    setFilteredData(filtered)
  }, [mealData, selectedCabin, searchTerm])

  // Load data on component mount
  useEffect(() => {
    fetchCabinMealData()
  }, [fetchCabinMealData])

  // Handle print functionality
  const handlePrint = useCallback(() => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 500)
  }, [])

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = [
      "Cabin",
      "Guest Name",
      "Table",
      "Nationality",
      "Booking Number",
      "Sunday Meal",
      "Monday Meal",
      "Tuesday Meal",
      "Wednesday Meal",
      "Thursday Meal",
      "Friday Meal",
      "Total Meals",
      "Status",
    ]

    const csvData = filteredData.map((guest) => [
      guest.cabin_nr || "",
      guest.guest_name || "",
      guest.table_nr || "Unassigned",
      guest.nationality || "",
      guest.booking_number || "",
      guest.meals[2]?.meal_name || "Not Selected",
      guest.meals[3]?.meal_name || "Not Selected",
      guest.meals[4]?.meal_name || "Not Selected",
      guest.meals[5]?.meal_name || "Not Selected",
      guest.meals[6]?.meal_name || "Not Selected",
      guest.meals[7]?.meal_name || "Not Selected",
      guest.totalMeals,
      guest.isComplete ? "Complete" : "Incomplete",
    ])

    const csvContent = [headers.join(","), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const timestamp = new Date().toISOString().split("T")[0]
    link.setAttribute("href", url)
    link.setAttribute("download", `cabin_meal_report_${timestamp}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filteredData])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size={32} text="Loading cabin meal data..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cabin Meal Report</h1>
            <p className="mt-1 text-gray-600">View and print meal selections by cabin</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={handlePrint} disabled={isPrinting}>
              <FileDown className="mr-2 h-4 w-4" />
              {isPrinting ? "Preparing..." : "Print Report"}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-2xl font-bold">{summary.totalGuests}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Cabins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-2xl font-bold">{summary.totalCabins}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Complete Selections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Utensils className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-2xl font-bold text-green-600">{summary.completedSelections}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Selections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-amber-600">{summary.pendingSelections}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search guests, cabins, or nationality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="w-48">
            <Select value={selectedCabin} onValueChange={setSelectedCabin}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by cabin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cabins</SelectItem>
                {cabins.map((cabin) => (
                  <SelectItem key={cabin} value={cabin}>
                    Cabin {cabin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {[2, 3, 4, 5, 6, 7].map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    Day {day} - {DAY_NAMES[day]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Report Component */}
        <CabinMealReport data={filteredData} selectedDay={selectedDay} showPrintVersion={false} />

        {/* Hidden Print Version */}
        <div className="hidden print:block">
          <PrintCabinReport data={filteredData} selectedDay={selectedDay} summary={summary} />
        </div>
      </div>
    </div>
  )
}
