"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, Printer, Calendar, Users, ChefHat } from "lucide-react"

// Table positions (same as FloorPlan)
const TABLE_POSITIONS = {
  1: { x: 50, y: 50, width: 100, height: 100, shape: "rect" },
  2: { x: 50, y: 170, width: 140, height: 70, shape: "rect" },
  3: { x: 50, y: 260, width: 140, height: 70, shape: "rect" },
  4: { x: 50, y: 350, width: 100, height: 100, shape: "rect" },
  6: { x: 250, y: 400, width: 140, height: 70, shape: "rect" },
  7: { x: 250, y: 220, width: 100, height: 100, shape: "rect" },
  8: { x: 250, y: 120, width: 90, height: 90, shape: "circle" },
  9: { x: 250, y: 20, width: 90, height: 90, shape: "circle" },
  10: { x: 450, y: 20, width: 90, height: 90, shape: "circle" },
  11: { x: 450, y: 120, width: 90, height: 90, shape: "circle" },
  12: { x: 450, y: 220, width: 100, height: 100, shape: "rect" },
  13: { x: 450, y: 400, width: 90, height: 90, shape: "circle" },
  14: { x: 320, y: 500, width: 160, height: 70, shape: "rect" },
  16: { x: 650, y: 450, width: 100, height: 100, shape: "rect" },
  17: { x: 650, y: 350, width: 140, height: 70, shape: "rect" },
  18: { x: 650, y: 260, width: 140, height: 70, shape: "rect" },
  19: { x: 650, y: 170, width: 140, height: 70, shape: "rect" },
  20: { x: 650, y: 50, width: 100, height: 100, shape: "rect" },
}

export function DailyFloorPlan({ tableCapacities, guests, onTableUpdate }) {
  const [selectedDay, setSelectedDay] = useState("day-2")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTable, setFilterTable] = useState("")
  const [filterCabin, setFilterCabin] = useState("")
  const [sortBy, setSortBy] = useState("table")
  const [mealData, setMealData] = useState([])
  const [kitchenSummary, setKitchenSummary] = useState({})
  const supabase = createClientComponentClient()

  // Fetch meal selections for the selected day
  useEffect(() => {
    fetchMealData()
  }, [selectedDay])

  const fetchMealData = async () => {
    try {
      // This would fetch meal selections from your meal_selections table
      // For now, we'll use placeholder data
      const mockMealData = guests.map((guest) => ({
        ...guest,
        meal_day: selectedDay,
        breakfast: "Continental Breakfast",
        lunch: "Mediterranean Lunch",
        dinner: "Seafood Dinner",
        dietary_restrictions: guest.dietary_restrictions || "None",
      }))

      setMealData(mockMealData)
      calculateKitchenSummary(mockMealData)
    } catch (error) {
      console.error("Error fetching meal data:", error)
    }
  }

  const calculateKitchenSummary = (data) => {
    const summary = {
      totalGuests: data.length,
      breakfast: {},
      lunch: {},
      dinner: {},
      dietaryRestrictions: {},
    }

    data.forEach((guest) => {
      // Count meal types
      if (guest.breakfast) {
        summary.breakfast[guest.breakfast] = (summary.breakfast[guest.breakfast] || 0) + 1
      }
      if (guest.lunch) {
        summary.lunch[guest.lunch] = (summary.lunch[guest.lunch] || 0) + 1
      }
      if (guest.dinner) {
        summary.dinner[guest.dinner] = (summary.dinner[guest.dinner] || 0) + 1
      }

      // Count dietary restrictions
      if (guest.dietary_restrictions && guest.dietary_restrictions !== "None") {
        summary.dietaryRestrictions[guest.dietary_restrictions] =
          (summary.dietaryRestrictions[guest.dietary_restrictions] || 0) + 1
      }
    })

    setKitchenSummary(summary)
  }

  // Get table color based on meal completion status
  const getTableMealColor = (tableNumber) => {
    const tableGuests = mealData.filter((guest) => guest.table_nr === tableNumber)
    if (tableGuests.length === 0) return "rgb(239, 246, 255)" // Empty

    const completedSelections = tableGuests.filter((guest) => guest.breakfast && guest.lunch && guest.dinner).length

    const completionRate = completedSelections / tableGuests.length

    if (completionRate === 1) return "rgb(34, 197, 94)" // Green - all complete
    if (completionRate >= 0.5) return "rgb(251, 191, 36)" // Yellow - partial
    return "rgb(239, 68, 68)" // Red - missing selections
  }

  // Render tables with meal status
  const renderMealTables = () => {
    const tables = []
    const tableNumbers = Object.keys(TABLE_POSITIONS)

    for (let i = 0; i < tableNumbers.length; i++) {
      const tableNumber = tableNumbers[i]
      const position = TABLE_POSITIONS[tableNumber]
      const tableNum = Number.parseInt(tableNumber, 10)
      const tableGuests = mealData.filter((guest) => guest.table_nr === tableNum)

      if (position.shape === "rect") {
        tables.push(
          <rect
            key={tableNumber}
            x={position.x}
            y={position.y}
            width={position.width}
            height={position.height}
            rx={10}
            ry={10}
            fill={getTableMealColor(tableNum)}
            stroke="rgb(75, 85, 99)"
            strokeWidth={2}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />,
        )
      } else {
        tables.push(
          <circle
            key={tableNumber}
            cx={position.x + position.width / 2}
            cy={position.y + position.height / 2}
            r={position.width / 2}
            fill={getTableMealColor(tableNum)}
            stroke="rgb(75, 85, 99)"
            strokeWidth={2}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />,
        )
      }

      // Add table label
      tables.push(
        <g key={`label-${tableNumber}`}>
          <text
            x={position.x + position.width / 2}
            y={position.y + position.height / 2 - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontWeight="bold"
            fontSize="16"
            className="select-none"
          >
            {tableNumber}
          </text>
          <text
            x={position.x + position.width / 2}
            y={position.y + position.height / 2 + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="12"
            className="select-none"
          >
            {tableGuests.length} guests
          </text>
        </g>,
      )
    }

    return tables
  }

  // Filter and sort guest data
  const getFilteredAndSortedGuests = () => {
    const filtered = mealData.filter((guest) => {
      const matchesSearch =
        !searchQuery ||
        guest.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.cabin_nr?.toString().includes(searchQuery)

      const matchesTable = !filterTable || guest.table_nr?.toString() === filterTable
      const matchesCabin = !filterCabin || guest.cabin_nr?.toString().includes(filterCabin)

      return matchesSearch && matchesTable && matchesCabin
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "table":
          return (a.table_nr || 0) - (b.table_nr || 0)
        case "cabin":
          return (a.cabin_nr || "").localeCompare(b.cabin_nr || "")
        case "meal":
          // Sort by meal completion status
          const aComplete = a.breakfast && a.lunch && a.dinner ? 1 : 0
          const bComplete = b.breakfast && b.lunch && b.dinner ? 1 : 0
          return bComplete - aComplete
        default:
          return 0
      }
    })

    return filtered
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Day Selection Tabs */}
      <Tabs value={selectedDay} onValueChange={setSelectedDay}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="day-2">Day 2</TabsTrigger>
          <TabsTrigger value="day-3">Day 3</TabsTrigger>
          <TabsTrigger value="day-4">Day 4</TabsTrigger>
          <TabsTrigger value="day-5">Day 5</TabsTrigger>
          <TabsTrigger value="day-6">Day 6</TabsTrigger>
          <TabsTrigger value="day-7">Day 7</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedDay} className="space-y-6">
          {/* Kitchen Prep Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Kitchen Prep Summary - {selectedDay.replace("-", " ").toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Guests</p>
                  <p className="text-2xl font-bold">{kitchenSummary.totalGuests || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Breakfast Orders</p>
                  <p className="text-2xl font-bold">
                    {Object.values(kitchenSummary.breakfast || {}).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-600 font-medium">Lunch Orders</p>
                  <p className="text-2xl font-bold">
                    {Object.values(kitchenSummary.lunch || {}).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Dinner Orders</p>
                  <p className="text-2xl font-bold">
                    {Object.values(kitchenSummary.dinner || {}).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
              </div>

              {/* Meal breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Breakfast</h4>
                  {Object.entries(kitchenSummary.breakfast || {}).map(([meal, count]) => (
                    <div key={meal} className="flex justify-between">
                      <span>{meal}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Lunch</h4>
                  {Object.entries(kitchenSummary.lunch || {}).map(([meal, count]) => (
                    <div key={meal} className="flex justify-between">
                      <span>{meal}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Dinner</h4>
                  {Object.entries(kitchenSummary.dinner || {}).map(([meal, count]) => (
                    <div key={meal} className="flex justify-between">
                      <span>{meal}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Floor Plan with Meal Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Floor Plan - Meal Selection Status
              </CardTitle>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden mb-4">
                <svg width="100%" height="600" viewBox="0 0 800 600" className="bg-white">
                  <rect x="0" y="0" width="800" height="600" fill="white" />
                  {renderMealTables()}

                  {/* Legend */}
                  <g transform="translate(50, 480)">
                    <text x="0" y="0" fontWeight="medium" fontSize="12">
                      Meal Selection Status:
                    </text>
                    <circle cx="10" cy="20" r="6" fill="rgb(34, 197, 94)" />
                    <text x="25" y="24" fontSize="12">
                      All meals selected
                    </text>

                    <circle cx="10" cy="40" r="6" fill="rgb(251, 191, 36)" />
                    <text x="25" y="44" fontSize="12">
                      Partial selections
                    </text>

                    <circle cx="10" cy="60" r="6" fill="rgb(239, 68, 68)" />
                    <text x="25" y="64" fontSize="12">
                      Missing selections
                    </text>

                    <circle cx="10" cy="80" r="6" fill="rgb(239, 246, 255)" />
                    <text x="25" y="84" fontSize="12">
                      No guests assigned
                    </text>
                  </g>
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest List with Meal Selections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search guests or cabins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Input
                    placeholder="Filter by table..."
                    value={filterTable}
                    onChange={(e) => setFilterTable(e.target.value)}
                    className="w-32"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Filter by cabin..."
                    value={filterCabin}
                    onChange={(e) => setFilterCabin(e.target.value)}
                    className="w-32"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="table">Sort by Table</option>
                  <option value="cabin">Sort by Cabin</option>
                  <option value="meal">Sort by Meal Status</option>
                </select>
              </div>

              {/* Guest List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Table</th>
                      <th className="px-3 py-2 text-left">Cabin</th>
                      <th className="px-3 py-2 text-left">Guest Name</th>
                      <th className="px-3 py-2 text-left">Breakfast</th>
                      <th className="px-3 py-2 text-left">Lunch</th>
                      <th className="px-3 py-2 text-left">Dinner</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {getFilteredAndSortedGuests().map((guest) => {
                      const isComplete = guest.breakfast && guest.lunch && guest.dinner
                      return (
                        <tr key={guest.id} className={isComplete ? "bg-green-50" : "bg-red-50"}>
                          <td className="px-3 py-2">{guest.table_nr || "Unassigned"}</td>
                          <td className="px-3 py-2">{guest.cabin_nr}</td>
                          <td className="px-3 py-2">{guest.guest_name}</td>
                          <td className="px-3 py-2">{guest.breakfast || "Not selected"}</td>
                          <td className="px-3 py-2">{guest.lunch || "Not selected"}</td>
                          <td className="px-3 py-2">{guest.dinner || "Not selected"}</td>
                          <td className="px-3 py-2">
                            <Badge variant={isComplete ? "default" : "destructive"}>
                              {isComplete ? "Complete" : "Incomplete"}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
