"use client"

import { FileText, Users, Settings, Download, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

const AdminDashboardPage = () => {
  const router = useRouter()

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="flex flex-wrap gap-4">
        <Button onClick={() => router.push("/admin/users")} className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Manage Users
        </Button>
        <Button onClick={() => router.push("/admin/settings")} className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        <Button onClick={() => router.push("/admin/download")} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Downloads
        </Button>
        <Button onClick={() => router.push("/admin/create")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New
        </Button>
        <Button onClick={() => router.push("/print/cabin-report")} className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Cabin Meal Report
        </Button>
      </div>
    </div>
  )
}

export default AdminDashboardPage
