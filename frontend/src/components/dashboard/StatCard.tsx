import { Card } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function StatCard({ icon, title, value, description, className }: StatCardProps) {
  return (
    <Card className={`p-6 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}
