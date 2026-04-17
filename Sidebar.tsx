import React from 'react';
import { 
  Home, 
  Users, 
  Book, 
  Clipboard, 
  CreditCard, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';

// Define the navigation structure from the design document
const navigation = [
  {
    group: 'ዋና (Main)',
    items: [
      { id: 'overview', icon: Home, label: 'ዳሽቦርድ', labelEn: 'Dashboard' }
    ]
  },
  {
    group: 'ትምህርት (Academic)',
    items: [
      { id: 'students', icon: Users, label: 'ተማሪዎች', labelEn: 'Students' },
      { id: 'courses', icon: Book, label: 'ኮርሶች', labelEn: 'Courses' },
      { id: 'grades', icon: Clipboard, label: 'ውጤት', labelEn: 'Grades' }
    ]
  },
  {
    group: 'አስተዳደር (Admin)',
    items: [
      { id: 'finance', icon: CreditCard, label: 'ክፍያ', labelEn: 'Finance' },
      { id: 'settings', icon: Settings, label: 'ማስተካከያ', labelEn: 'Settings' }
    ]
  }
];

interface SidebarProps {
  activeId: string;
  language: 'am' | 'en';
  onNavigate: (id: string) => void;
  onLogout: () => void;
}

/**
 * Sidebar component for Dreamland College
 * Implements High-Density Modular Layout with Habesha aesthetic.
 */
const Sidebar: React.FC<SidebarProps> = ({ activeId, language, onNavigate, onLogout }) => {
  return (
    <aside className="w-[280px] h-screen bg-[var(--surface)] flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.05)] relative overflow-hidden border-r border-[var(--border)]">
      
      {/* Brand Header */}
      <div className="p-8 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--primary)]/20">
          <span className="font-bold text-xl">D</span>
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-[var(--text-primary)] text-lg leading-none tracking-tight">
            DREAMLAND
          </span>
          <span className="text-[10px] font-bold text-[var(--primary)] tracking-[3px] uppercase mt-1">
            College
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
        {navigation.map((group) => (
          <div key={group.group} className="space-y-3">
            <h3 className="px-5 text-[11px] uppercase font-bold tracking-[2px] text-[var(--text-muted)] opacity-60">
              {language === 'am' ? group.group.split(' ')[0] : group.group.match(/\(([^)]+)\)/)?.[1]}
            </h3>
            
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      w-full flex items-center gap-4 px-5 py-[12px] rounded-[12px] transition-all duration-300 group relative
                      ${isActive 
                        ? 'bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/20' 
                        : 'bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(30,132,73,0.08)] hover:text-[var(--primary)]'
                      }
                    `}
                  >
                    <Icon 
                      size={24} 
                      className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} 
                    />
                    
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[14px] font-bold">
                        {language === 'am' ? item.label : item.labelEn}
                      </span>
                      <span className={`text-[10px] font-medium transition-opacity ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                        {language === 'am' ? item.labelEn : item.label}
                      </span>
                    </div>

                    {isActive && (
                      <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Section with Tibeb Pattern */}
      <div className="mt-auto relative">
        {/* Subtle Tibeb Decorative Pattern */}
        <div className="h-1 w-full bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] opacity-40" />
        
        <div className="p-6 bg-[var(--background)]/50 backdrop-blur-sm">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-[var(--accent)] font-bold text-sm hover:bg-[var(--accent)] hover:text-white transition-all duration-300"
          >
            <LogOut size={20} />
            <span>{language === 'am' ? 'ውጣ (Logout)' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;