import { Card } from "@/components/ui/card";

interface StorageStatCardProps {
  used: number;
  total: number;
  className?: string;
}

export function StorageStatCard({ used, total, className }: StorageStatCardProps) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const usedGB = (used / (1024 * 1024 * 1024)).toFixed(1);
  const totalGB = (total / (1024 * 1024 * 1024)).toFixed(0);
  
  const getStorageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStorageBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-100';
    if (percentage >= 75) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <Card className={`p-6 ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">Storage Used</p>
          <p className="text-3xl font-bold text-gray-900">{usedGB} GB</p>
          <p className="text-xs text-gray-500 mt-1">of {totalGB} GB total</p>
        </div>
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 ${getStorageBgColor(percentage)} rounded-lg flex items-center justify-center`}>
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${getStorageColor(percentage)} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </Card>
  );
}
