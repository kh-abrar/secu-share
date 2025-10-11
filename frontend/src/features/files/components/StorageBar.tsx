import { HardDrive } from 'lucide-react';

interface StorageBarProps {
  used: number; // in bytes
  total: number; // in bytes
  className?: string;
}

export function StorageBar({ used, total, className = '' }: StorageBarProps) {
  const usedGB = used / (1024 * 1024 * 1024);
  const totalGB = total / (1024 * 1024 * 1024);
  const percentage = total > 0 ? (used / total) * 100 : 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className={`bg-white border-t border-neutral-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-neutral-600" />
          <span className="text-sm font-medium text-neutral-900">Storage Used</span>
        </div>
        <span className="text-sm text-neutral-600">
          {usedGB.toFixed(1)} GB of {totalGB.toFixed(1)} GB
        </span>
      </div>
      
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-neutral-500 mt-1">
        <span>{percentage.toFixed(1)}% used</span>
        <span>{(totalGB - usedGB).toFixed(1)} GB free</span>
      </div>
    </div>
  );
}
