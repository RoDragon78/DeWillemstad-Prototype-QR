"use client"

const DAY_NAMES = ["", "", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

interface PrintCabinReportProps {
  data: any[]
  selectedDay: string
  summary: {
    totalGuests: number
    totalCabins: number
    completedSelections: number
    pendingSelections: number
  }
}

export function PrintCabinReport({ data, selectedDay, summary }: PrintCabinReportProps) {
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

  const currentDate = new Date().toLocaleDateString()

  return (
    <div className="print-only bg-white">
      {/* Print Header */}
      <div className="mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">DeWillemstad Cruise - Cabin Meal Report</h1>
        <p className="text-gray-600">Generated on {currentDate}</p>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <strong>Total Guests:</strong> {summary.totalGuests}
          </div>
          <div>
            <strong>Total Cabins:</strong> {summary.totalCabins}
          </div>
          <div>
            <strong>Complete:</strong> {summary.completedSelections}
          </div>
          <div>
            <strong>Pending:</strong> {summary.pendingSelections}
          </div>
        </div>
      </div>

      {/* Cabin Data */}
      {sortedCabins.map((cabin, cabinIndex) => {
        const cabinGuests = cabinGroups[cabin]

        return (
          <div key={cabin} className={`mb-6 ${cabinIndex > 0 ? "page-break-before" : ""}`}>
            <h2 className="text-lg font-semibold mb-3 bg-gray-100 p-2">
              Cabin {cabin} ({cabinGuests.length} guest{cabinGuests.length !== 1 ? "s" : ""})
            </h2>

            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-2 py-1 text-left">Guest Name</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Table</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Nationality</th>
                  {selectedDay === "all" ? (
                    [2, 3, 4, 5, 6, 7].map((day) => (
                      <th key={day} className="border border-gray-300 px-2 py-1 text-left">
                        {DAY_NAMES[day]}
                      </th>
                    ))
                  ) : (
                    <th className="border border-gray-300 px-2 py-1 text-left">
                      {DAY_NAMES[Number.parseInt(selectedDay)]}
                    </th>
                  )}
                  <th className="border border-gray-300 px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {cabinGuests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="border border-gray-300 px-2 py-1">{guest.guest_name}</td>
                    <td className="border border-gray-300 px-2 py-1">{guest.table_nr || "Unassigned"}</td>
                    <td className="border border-gray-300 px-2 py-1">{guest.nationality || "Unknown"}</td>

                    {selectedDay === "all" ? (
                      [2, 3, 4, 5, 6, 7].map((day) => (
                        <td key={day} className="border border-gray-300 px-2 py-1">
                          {guest.meals[day] ? (
                            <div>
                              <div className="font-medium">{guest.meals[day].meal_name}</div>
                              <div className="text-gray-600">({guest.meals[day].meal_category})</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not selected</span>
                          )}
                        </td>
                      ))
                    ) : (
                      <td className="border border-gray-300 px-2 py-1">
                        {guest.meals[Number.parseInt(selectedDay)] ? (
                          <div>
                            <div className="font-medium">{guest.meals[Number.parseInt(selectedDay)].meal_name}</div>
                            <div className="text-gray-600">
                              ({guest.meals[Number.parseInt(selectedDay)].meal_category})
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not selected</span>
                        )}
                      </td>
                    )}

                    <td className="border border-gray-300 px-2 py-1">
                      {guest.isComplete ? "Complete" : `Partial (${guest.totalMeals}/6)`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      <style jsx>{`
        @media print {
          .print-only {
            display: block !important;
          }
          .page-break-before {
            page-break-before: always;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
