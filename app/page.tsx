"use client"
import Link from "next/link"
import { SimpleCabinForm } from "@/components/simple-cabin-form"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="absolute right-4 top-4">
        <select className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm">
          <option value="en">English</option>
          <option value="nl">Nederlands</option>
        </select>
      </div>

      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">DeWillemstad Meal Selection</h1>
          <p className="mt-2 text-gray-600">River Cruise Dining</p>
        </div>

        <SimpleCabinForm />

        <div className="mt-6 text-center">
          <Link href="/admin/login" className="text-sm text-gray-500 hover:text-gray-700">
            Admin
          </Link>
        </div>
      </div>
    </div>
  )
}
