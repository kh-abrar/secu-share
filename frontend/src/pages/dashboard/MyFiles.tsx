import { PageHeader } from "@/components/layout/PageHeader";
import { StorageMeter } from "@/components/common/StorageMeter";
import FileBrowser from "@/features/files/components/FileBrowser";
import { useFileStats } from "@/features/files/hooks";

export default function MyFiles() {
  const stats = useFileStats();
  return (
    <div className="space-y-6">
      <PageHeader title="My Files" description="Upload, organise and share your encrypted files." />
      <FileBrowser />
      {stats.data && <StorageMeter used={stats.data.used} quota={stats.data.quota} className="border-t pt-4" />}
    </div>
  );
}
