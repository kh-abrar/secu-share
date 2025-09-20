import UploadModal from "@/features/upload/components/UploadModal"
import FileTable from "@/features/files/components/FileTable"

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Files</h1>
          <p className="text-sm text-neutral-600">
            Upload and manage your secure files
          </p>
        </div>
        <UploadModal />
      </div>

      {/* File table */}
      <FileTable />
    </div>
  )
}
