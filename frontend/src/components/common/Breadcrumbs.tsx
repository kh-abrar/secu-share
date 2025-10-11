import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface BreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  const createBreadcrumbs = (path: string): BreadcrumbItem[] => {
    if (path === '/') {
      return [{ name: 'Home', path: '/' }];
    }

    const parts = path.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ name: 'Home', path: '/' }];

    let currentPath = '';
    for (const part of parts) {
      currentPath += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: currentPath + '/'
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = createBreadcrumbs(path);

  return (
    <nav className="flex items-center space-x-1 text-sm">
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.path}>
          {index === 0 && (
            <Home className="h-4 w-4 text-neutral-500" />
          )}
          <button
            onClick={() => onNavigate(item.path)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
              index === breadcrumbs.length - 1
                ? 'text-neutral-900 font-medium'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            {index > 0 && item.name}
            {index === 0 && 'Home'}
          </button>
          {index < breadcrumbs.length - 1 && (
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
