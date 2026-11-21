import { BookOpen, Info, Play, Settings, User, UserCog } from 'lucide-react';
import { LogoEmblem } from './LogoEmblem';
import type { DashboardTab, SettingsConfig, UserProfile } from '../game/types';
import { TRANSLATIONS } from '../game/rules';

interface HomeScreenProps {
  user: UserProfile | null;
  settings: SettingsConfig;
  onPlayNow: () => void;
  onNavigate: (tab: DashboardTab) => void;
  onOpenRules: () => void;
  onOpenAbout: () => void;
}

export function HomeScreen({
  user,
  settings,
  onPlayNow,
  onNavigate,
  onOpenRules,
  onOpenAbout,
}: HomeScreenProps) {
  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;

  return (
    <div className="relative z-10 min-h-full flex flex-col justify-between px-5 py-6 sm:px-10 sm:py-8 pointer-events-none">
      {/* Top quiet bar: Active investigator identity + quick utility triggers */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="text-xs sm:text-sm text-[#C4A1FF]/90 tracking-wide">
          {user ? (
            <span>
              Investigator: <strong className="text-[#F3EFFA] font-semibold">{user.displayName}</strong>
            </span>
          ) : (
            <span>Guest Investigator · Progress saved locally</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenRules}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#E9D8FD] bg-[#120F1D]/90 border border-[#C4A1FF]/25 rounded-lg hover:border-[#C4A1FF]/60 hover:bg-[#1C1630] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C4A1FF]" />
            <span>{t.gameRules}</span>
          </button>
          <button
            type="button"
            onClick={onOpenAbout}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#E9D8FD] bg-[#120F1D]/90 border border-[#C4A1FF]/25 rounded-lg hover:border-[#C4A1FF]/60 hover:bg-[#1C1630] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-[#C4A1FF]" />
            <span>{t.aboutGame}</span>
          </button>
        </div>
      </div>

      {/* Center Hero Title Lockup over calm negative space */}
      <div className="my-auto flex flex-col items-center text-center py-8 pointer-events-auto">
        <div className="px-6 py-8 sm:px-12 sm:py-10 rounded-2xl bg-[#07060B]/82 border border-[#C4A1FF]/20 shadow-[0_24px_80px_rgba(0,0,0,0.85)] max-w-xl w-full">
          <LogoEmblem size="lg" />

          <p className="mt-5 text-sm sm:text-base text-[#D8CEE8] leading-relaxed max-w-md mx-auto">
            Step into seven shadowed realms. Uncover buried ciphers, forge your investigator in 3D, and break the Syndicate lock alone or together.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              data-start="true"
              onClick={onPlayNow}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-semibold tracking-wider uppercase text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg shadow-[0_0_28px_rgba(196,161,255,0.45)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t.playNow}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('character')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium text-[#F3EFFA] bg-[#161224] border border-[#C4A1FF]/35 hover:border-[#C4A1FF] hover:bg-[#211A36] rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserCog className="w-4 h-4 text-[#C4A1FF]" />
              <span>{t.customizeCharacter}</span>
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-[#C4A1FF]/15 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('play')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#D8CEE8] hover:text-[#F3EFFA] hover:bg-[#1B162C] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Game Modes & Locations</span>
            </button>
            <span className="text-[#C4A1FF]/30" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#D8CEE8] hover:text-[#F3EFFA] hover:bg-[#1B162C] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#C4A1FF]" />
              <span>{t.settings}</span>
            </button>
            <span className="text-[#C4A1FF]/30" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#D8CEE8] hover:text-[#F3EFFA] hover:bg-[#1B162C] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#C4A1FF]" />
              <span>{t.profile}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom quiet controls hint */}
      <div className="text-center text-xs text-[#A89BBF] tracking-wide pointer-events-auto">
        WASD Move · Mouse Drag Look · E Inspect / Interact · F Flashlight · Esc Pause
      </div>
    </div>
  );
}
