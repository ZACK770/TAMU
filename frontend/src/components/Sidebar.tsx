import { useState } from 'react';
import { 
  FileText, 
  BookOpen, 
  Gift, 
  History, 
  Users, 
  ChevronRight, 
  ChevronLeft,
  X
} from 'lucide-react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: any;
}

interface SidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (itemId: any) => void;
  position?: 'left' | 'right';
}

export const Sidebar = ({ items, activeItem, onItemClick, position = 'right' }: SidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const positionClasses = position === 'right' ? 'rtl:border-l' : 'ltr:border-r';
  const marginClasses = position === 'right' ? 'ml-0' : 'mr-0';

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 h-screen bg-white border border-gray-200 z-50
          transition-all duration-300 ease-in-out
          ${positionClasses}
          ${isExpanded ? 'w-64' : 'w-20'}
          ${isMobileOpen ? 'translate-x-0' : position === 'right' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${marginClasses}
        `}
        dir="rtl"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            {isExpanded && (
              <h2 className="text-lg font-bold text-slate-900">תפריט</h2>
            )}
            <div className="flex items-center gap-2">
              {/* Desktop toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={isExpanded ? 'כווץ תפריט' : 'הרחב תפריט'}
              >
                {isExpanded ? (
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                )}
              </button>
              {/* Mobile close */}
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onItemClick(item.id);
                    setIsMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                    ${!isExpanded && 'justify-center'}
                  `}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                  {isExpanded && (
                    <span className="font-medium whitespace-nowrap">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            {isExpanded && (
              <p className="text-xs text-gray-500 text-center">
                גרסת מערכת
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

// Predefined item sets for common use cases
export const adminSidebarItems: SidebarItem[] = [
  { id: 'exams', label: 'מבחנים', icon: FileText },
  { id: 'lessons', label: 'שיעורים', icon: BookOpen },
  { id: 'benefits', label: 'הטבות', icon: Gift },
  { id: 'redemptions', label: 'מימושים', icon: History },
  { id: 'students', label: 'תלמידים', icon: Users },
];

export const personalAreaSidebarItems: SidebarItem[] = [
  { id: 'exams', label: 'היסטוריית מבחנים', icon: FileText },
  { id: 'benefits', label: 'הטבות זמינות', icon: Gift },
  { id: 'redemptions', label: 'היסטוריית מימושים', icon: History },
];
