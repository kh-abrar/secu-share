import { FilesBrowser } from "@/features/files/components/FilesBrowser";
import { PageHeader } from "@/components/layout/PageHeader";

export default function MyFiles() {
  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="My Files"
        description="Browse and manage your files and folders"
      />
      <FilesBrowser />
    </div>
  );
}
