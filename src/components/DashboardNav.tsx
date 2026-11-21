import {
  Backpack,
  Compass,
  Home,
  Play,
  Settings,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import type { DashboardTab, SettingsConfig } from '../game/types';
import { TRANSLATIONS } from '../game/rules';
import { LogoEmblem } from './LogoEmblem';

interface DashboardNavProps {
  activeTab: DashboardTab;
  settings: SettingsConfig;
  onSelectTab: (tab: DashboardTab) => void;
}

export function DashboardNav({ activeTab, settings, onSelectTab }: DashboardNavProps) {
  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;

  const items: Array<{ id: DashboardTab; label: string; icon: typeof Home }> = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'play', label: t.play, icon: Play },
    { id: 'character', label: t.character, icon: UserCog },
    { id: 'inventory', label: t.inventory, icon: Backpack },
    { id: 'missions', label: t.missions, icon: Compass },
    { id: 'friends', label: t.friends, icon: Users },
    { id: 'settings', label: t.settings, icon: Settings },
    { id: 'profile', label: t.profile, icon: User },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#08070E]/95 border-b border-[#C4A1FF]/15 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogoEmblem size="sm" />
          <span className="font-display text-base sm:text-lg font-bold tracking-[0.18em] text-[#F3EFFA]">
            NO ESCAPE
          </span>
        </button>

        <nav
          aria-label="Game Dashboard Navigation"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#C4A1FF] text-[#07060B] shadow-[0_0_16px_rgba(196,161,255,0.35)]'
                    : 'text-[#CFC6E3] hover:text-[#F3EFFA] hover:bg-[#161224]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#07060B]' : 'text-[#C4A1FF]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
