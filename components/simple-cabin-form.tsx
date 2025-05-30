"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Users } from "lucide-react"

interface SimpleCabinFormProps {
  cabinNumber: string | null
}

const SimpleCabinForm: React.FC<SimpleCabinFormProps> = ({ cabinNumber }) => {
  const [cabinGuests, setCabinGuests] = useState([])
  const [loadingCabinDetails, setLoadingCabinDetails] = useState(false)

  const fetchCabinDetails = async (cabinNumber) => {
    if (!cabinNumber) {
      setCabinGuests([])
      return
    }

    try {
      setLoadingCabinDetails(true)
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", cabinNumber)
        .order("guest_name", { ascending: true })

      if (error) throw error
      setCabinGuests(data || [])
    } catch (error) {
      console.error("Error fetching cabin details:", error)
      setCabinGuests([])
    } finally {
      setLoadingCabinDetails(false)
    }
  }

  useEffect(() => {
    fetchCabinDetails(cabinNumber)
  }, [cabinNumber])

  return (
    <>
      {cabinNumber && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="font-medium text-lg">Cabin {cabinNumber}</div>
          {loadingCabinDetails ? (
            <div className="text-sm text-gray-500 mt-1">Loading guests...</div>
          ) : cabinGuests.length > 0 ? (
            <div className="space-y-2 mt-2">
              {cabinGuests.map((guest) => (
                <div key={guest.id} className="flex items-center text-sm">
                  <Users className="h-3 w-3 mr-2 text-blue-600" />
                  <span className="font-medium">{guest.guest_name}</span>
                  {guest.nationality && <span className="text-xs text-gray-500 ml-2">({guest.nationality})</span>}
                </div>
              ))}
              {cabinGuests[0]?.table_nr && (
                <div className="text-xs text-blue-600 mt-1">Assigned to Table {cabinGuests[0].table_nr}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 mt-1">No guests found for this cabin</div>
          )}
        </div>
      )}
    </>
  )
}

export default SimpleCabinForm
