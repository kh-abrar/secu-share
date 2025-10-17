import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FileItem } from "@/features/files/types";

interface QuickActionsProps {
  onUpload?: () => void;
  onCreateFolder?: () => void;
  onShare?: () => void;
  allFiles?: FileItem[];
}

export function QuickActions({ onUpload, onCreateFolder, onShare, allFiles = [] }: QuickActionsProps) {
  const actions = [
    {
      label: 'Upload File',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      onClick: onUpload,
      variant: 'default' as const,
    },
    {
      label: 'Create Folder',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      onClick: onCreateFolder,
      variant: 'outline' as const,
    },
    {
      label: 'Share File',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
      ),
      onClick: onShare,
      variant: 'outline' as const,
    },
  ];

  // Calculate insights from all files
  const totalFiles = allFiles.filter(f => f.type === 'file').length;
  const sharedFiles = allFiles.filter(f => f.sharedWith && f.sharedWith.length > 0).length;
  const recentUploads = allFiles
    .filter(f => f.type === 'file')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  const thisWeekUploads = recentUploads.filter(file => {
    const fileDate = new Date(file.createdAt || 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return fileDate >= weekAgo;
  }).length;

  const insights = [
    {
      icon: (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      text: thisWeekUploads > 0 ? `You've uploaded ${thisWeekUploads} file${thisWeekUploads > 1 ? 's' : ''} this week.` : `You have ${totalFiles} file${totalFiles !== 1 ? 's' : ''} in your cloud.`
    },
    {
      icon: (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
      ),
      text: sharedFiles > 0 ? `${sharedFiles} file${sharedFiles > 1 ? 's' : ''} shared securely.` : "Try sharing files for collaboration."
    },
    {
      icon: (
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      text: "Try password-protected sharing for added security."
    },
  ];

  return (
    <Card className="p-6 flex flex-col h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      
      {/* Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant}
            onClick={action.onClick}
            className="flex items-center justify-center space-x-2 h-12"
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Tips & Insights Section - Hidden on mobile, shown on larger screens */}
      <div className="hidden md:block flex-1">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Tips & Insights
        </h4>
        
        <div className="space-y-2">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                {insight.icon}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
