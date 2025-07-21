"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CheckCircle, Clock } from "lucide-react"

const DAY_NAMES = ["", "", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

interface CabinMealReportProps {
  data: any[]
  selectedDay: string
  showPrintVersion?: boolean
}

export function CabinMealReport({ data, selectedDay, showPrintVersion = false }: CabinMealReportProps) {
  // Group data by cabin
  const cabinGroups = data.reduce((acc, guest) => {
    const cabin = guest.cabin_nr || "Unknown"
    if (!acc[cabin]) {
      acc[cabin] = []
    }
    acc[cabin].push(guest)
    return acc
  }, {})

  // Sort cabins numerically
  const sortedCabins = Object.keys(cabinGroups).sort((a, b) => {
    if (a === "Unknown") return 1
    if (b === "Unknown") return -1
    return Number.parseInt(a) - Number.parseInt(b)
  })

  const getMealStatusBadge = (guest: any) => {
    if (guest.isComplete) {
      return <Badge className="bg-green-100 text-green-800">Complete</Badge>
    } else if (guest.totalMeals > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial ({guest.totalMeals}/6)</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">No Selections</Badge>
    }
  }

  const getMealCategoryBadge = (category: string) => {
    const colors = {
      Meat: "bg-red-100 text-red-800",
      Fish: "bg-blue-100 text-blue-800",
      Vegetarian: "bg-green-100 text-green-800",
      Vegan: "bg-purple-100 text-purple-800",
      "Gluten-Free": "bg-orange-100 text-orange-800",
    }
    return <Badge className={colors[category] || "bg-gray-100 text-gray-800"}>{category}</Badge>
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No data found</h3>
        <p className="mt-1 text-sm text-gray-500">No guests match the current filters.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${showPrintVersion ? "print-version" : ""}`}>
      {sortedCabins.map((cabin) => {
        const cabinGuests = cabinGroups[cabin]
        const completedGuests = cabinGuests.filter((g) => g.isComplete).length
        const totalGuests = cabinGuests.length

        return (
          <Card key={cabin} className="overflow-hidden">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Cabin {cabin}</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    {totalGuests} guest{totalGuests !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                    <span className="text-green-600 font-medium">{completedGuests}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-600">{totalGuests} complete</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Table
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nationality
                      </th>
                      {selectedDay === "all" ? (
                        <>
                          {[2, 3, 4, 5, 6, 7].map((day) => (
                            <th
                              key={day}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {DAY_NAMES[day]}
                            </th>
                          ))}
                        </>
                      ) : (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {DAY_NAMES[Number.parseInt(selectedDay)]} Meal
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cabinGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{guest.guest_name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {guest.table_nr || <Badge className="bg-amber-100 text-amber-800">Unassigned</Badge>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {guest.nationality || "Unknown"}
                        </td>

                        {selectedDay === "all" ? (
                          // Show all days
                          [2, 3, 4, 5, 6, 7].map((day) => (
                            <td key={day} className="px-4 py-3 whitespace-nowrap">
                              {guest.meals[day] ? (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-900">{guest.meals[day].meal_name}</div>
                                  {getMealCategoryBadge(guest.meals[day].meal_category)}
                                </div>
                              ) : (
                                <div className="flex items-center text-xs text-gray-400">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Not selected
                                </div>
                              )}
                            </td>
                          ))
                        ) : (
                          // Show specific day
                          <td className="px-4 py-3 whitespace-nowrap">
                            {guest.meals[Number.parseInt(selectedDay)] ? (
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {guest.meals[Number.parseInt(selectedDay)].meal_name}
                                </div>
                                {getMealCategoryBadge(guest.meals[Number.parseInt(selectedDay)].meal_category)}
                              </div>
                            ) : (
                              <div className="flex items-center text-sm text-gray-400">
                                <Clock className="h-4 w-4 mr-1" />
                                Not selected
                              </div>
                            )}
                          </td>
                        )}

                        <td className="px-4 py-3 whitespace-nowrap">{getMealStatusBadge(guest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
