import {
  LayoutDashboard,
  MapPin,
  Network,
  Users,
} from 'lucide-react';

export type GlassActiveTab = 'escritorio' | 'cartografia' | 'organigrama' | 'directorio';

interface GlassDockProps {
  activeTab: GlassActiveTab;
  onTabChange: (tab: GlassActiveTab) => void;
  visibleCount: number;
  sectionsCount: number;
}

export const GlassDock: React.FC<GlassDockProps> = ({
  activeTab,
  onTabChange,
  visibleCount,
  sectionsCount,
}) => {
  const tabs = [
    {
      id: 'escritorio' as GlassActiveTab,
      label: 'Escritorio',
      sublabel: 'KPIs & Metas 2027',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'cartografia' as GlassActiveTab,
      label: 'Cartografía INE',
      sublabel: '32 Estados',
      icon: MapPin,
      badge: sectionsCount > 0 ? sectionsCount.toLocaleString() : null,
    },
    {
      id: 'organigrama' as GlassActiveTab,
      label: 'Organigrama',
      sublabel: 'Red Jerárquica',
      icon: Network,
      badge: visibleCount > 0 ? visibleCount.toLocaleString() : null,
    },
    {
      id: 'directorio' as GlassActiveTab,
      label: 'Directorio',
      sublabel: 'Liderazgos RBAC',
      icon: Users,
      badge: null,
    },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 select-none">
      <div className="glass-dock rounded-2xl p-1.5 flex items-center gap-1.5 shadow-2xl border border-white/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/80 to-violet-600/80 text-white shadow-lg shadow-indigo-500/25 border border-white/30 scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform duration-200 ${
                  isActive ? 'text-white scale-110' : 'text-slate-400'
                }`}
              />
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold block leading-tight">
                  {tab.label}
                </span>
                <span className="text-[9px] text-slate-300/80 block leading-none">
                  {tab.sublabel}
                </span>
              </div>
              {tab.badge && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-white/10 text-indigo-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
