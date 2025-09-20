import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";

type FileRow = {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
};

const demoFiles: FileRow[] = [
  { id: "1", name: "report.pdf", size: "1.2 MB", uploadedAt: "2025-09-18" },
  { id: "2", name: "image.png", size: "500 KB", uploadedAt: "2025-09-19" },
];

export default function FileTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-4 py-2 font-medium">File</th>
            <th className="px-4 py-2 font-medium">Size</th>
            <th className="px-4 py-2 font-medium">Uploaded</th>
            <th className="px-4 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {demoFiles.map((file) => (
            <tr key={file.id} className="border-t">
              <td className="px-4 py-2">{file.name}</td>
              <td className="px-4 py-2">{file.size}</td>
              <td className="px-4 py-2">{file.uploadedAt}</td>
              <td className="px-4 py-2 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-500 hover:text-black"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
