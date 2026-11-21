import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Compass,
  KeyRound,
  LogOut,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import type {
  FriendInfo,
  PlayerProgress,
  SettingsConfig,
  UserProfile,
} from '../game/types';
import { ACHIEVEMENTS, LOCATIONS } from '../game/worldData';
import { soundEngine } from '../audio/soundEngine';

/* ---------------- INVENTORY VIEW ---------------- */
export function InventoryView({ progress }: { progress: PlayerProgress }) {
  const allClues = LOCATIONS.flatMap((l) => l.clues);
  const foundClues = allClues.filter((c) => progress.discoveredClues.includes(c.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#C4A1FF]/15">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3EFFA]">
            Evidence & Relics Inventory
          </h2>
          <p className="mt-1 text-sm text-[#B7AACF]">
            Every clue, cipher note, and hidden secret relic gathered across the seven realms.
          </p>
        </div>
        <div className="font-mono-tabular text-sm text-[#C4A1FF]">
          {foundClues.length} / {allClues.length} Collected
        </div>
      </div>

      {foundClues.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/15 text-center">
          <KeyRound className="w-8 h-8 text-[#C4A1FF]/60 mx-auto" />
          <h3 className="mt-3 text-base font-semibold text-[#F3EFFA]">Your Evidence Case is Empty</h3>
          <p className="mt-1 text-xs text-[#A89BBF] max-w-md mx-auto">
            Enter Blackwood Manor or any unlocked realm and approach glowing lilac pedestals (press E) to collect clues and secret artifacts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {foundClues.map((clue) => {
            const loc = LOCATIONS.find((l) => l.id === clue.locationId);
            return (
              <div
                key={clue.id}
                className="p-5 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/25 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#C4A1FF]">
                    <span>{loc?.name}</span>
                    <span>{clue.isSecret ? 'Hidden Secret' : 'Case Clue'}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold text-[#F3EFFA]">
                    {clue.title}
                  </h3>
                  <p className="mt-2 text-xs text-[#CFC6E3] leading-relaxed">{clue.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#C4A1FF]/12 font-mono-tabular text-xs text-[#E9D8FD]">
                  {clue.hintValue}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- MISSIONS & ACHIEVEMENTS VIEW ---------------- */
export function MissionsView({ progress }: { progress: PlayerProgress }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3EFFA]">
          Storyline Missions
        </h2>
        <p className="mt-1 text-sm text-[#B7AACF]">
          Track your progress through the seven chapters of the Obsidian Syndicate mystery.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOCATIONS.map((loc) => {
            const unlocked = progress.unlockedLocations.includes(loc.id);
            const completed = progress.completedLocations.includes(loc.id);
            const cluesCount = loc.clues.filter((c) => progress.discoveredClues.includes(c.id)).length;
            return (
              <div
                key={loc.id}
                className={`p-5 rounded-xl border ${
                  completed
                    ? 'bg-[#130E23] border-[#C4A1FF]/40'
                    : unlocked
                      ? 'bg-[#0D0A16] border-[#C4A1FF]/20'
                      : 'bg-[#09070E] border-[#C4A1FF]/10 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#C4A1FF]">
                  <span>{loc.missionTitle}</span>
                  <span className="font-mono-tabular">
                    {completed ? 'Completed' : unlocked ? 'Active' : 'Locked'}
                  </span>
                </div>
                <div className="mt-1 font-display text-lg font-bold text-[#F3EFFA]">{loc.name}</div>
                <p className="mt-1.5 text-xs text-[#B7AACF]">{loc.missionSummary}</p>
                <div className="mt-3 flex items-center gap-4 text-xs font-mono-tabular text-[#D8CEE8]">
                  <span>Clues: {cluesCount}/{loc.clues.length}</span>
                  <span>Seal: {progress.solvedPuzzles.includes(loc.puzzle.id) ? 'Unlocked' : 'Sealed'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold text-[#F3EFFA]">Achievement Badges</h3>
          <span className="font-mono-tabular text-xs text-[#C4A1FF]">
            {progress.unlockedAchievements.length} / {ACHIEVEMENTS.length} Unlocked
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ACHIEVEMENTS.map((ach) => {
            const earned = progress.unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  earned
                    ? 'bg-[#151026] border-[#C4A1FF]/45'
                    : 'bg-[#0B0912] border-[#C4A1FF]/12 opacity-60'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    earned ? 'bg-[#C4A1FF] text-[#07060B]' : 'bg-[#1A1529] text-[#7D7096]'
                  }`}
                >
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#F3EFFA]">{ach.title}</div>
                  <p className="mt-0.5 text-xs text-[#B7AACF]">{ach.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ---------------- FRIENDS VIEW ---------------- */
interface FriendsViewProps {
  user: UserProfile | null;
  friends: FriendInfo[];
  onAddFriend: (username: string) => Promise<void>;
  onJoinFriendRoom: (roomId: string) => void;
  onGoToLogin: () => void;
}

export function FriendsView({
  user,
  friends,
  onAddFriend,
  onJoinFriendRoom,
  onGoToLogin,
}: FriendsViewProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setErr(null);
    setAdding(true);
    try {
      await onAddFriend(usernameInput.trim());
      setUsernameInput('');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to add friend.');
    } finally {
      setAdding(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="p-8 rounded-2xl bg-[#0D0A16] border border-[#C4A1FF]/25">
          <Users className="w-10 h-10 text-[#C4A1FF] mx-auto" />
          <h2 className="mt-3 font-display text-2xl font-bold text-[#F3EFFA]">
            Sign In to Connect With Investigators
          </h2>
          <p className="mt-2 text-sm text-[#B7AACF]">
            Register or sign in to add friends by username (try adding <span className="text-[#C4A1FF]">lyra_vance</span> or <span className="text-[#C4A1FF]">soren_k</span>) and join their live multiplayer rooms.
          </p>
          <button
            type="button"
            onClick={onGoToLogin}
            className="mt-6 px-6 py-2.5 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
          >
            Open Account Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#C4A1FF]/15">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3EFFA]">
            Investigator Network
          </h2>
          <p className="mt-1 text-sm text-[#B7AACF]">
            Add fellow investigators and coordinate multiplayer escapes.
          </p>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Username (e.g. soren_k)"
            className="px-3.5 py-2 text-xs sm:text-sm rounded-lg bg-[#120E1D] border border-[#C4A1FF]/25 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF]"
          />
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friend</span>
          </button>
        </form>
      </div>

      {err && (
        <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-400/35 text-xs text-red-200">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {friends.map((f) => (
          <div
            key={f.id}
            className="p-4 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/20 flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-sm font-semibold text-[#F3EFFA]">{f.displayName}</div>
              <div className="text-xs text-[#A89BBF]">
                @{f.username} · {f.online ? 'Online' : 'Offline'}
                {f.currentRoomId ? ` · In ${f.currentRoomId}` : ''}
              </div>
            </div>

            {f.online && (
              <button
                type="button"
                onClick={() => onJoinFriendRoom(f.currentRoomId || 'ROOM-OBSIDIAN')}
                className="px-3.5 py-2 text-xs font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
              >
                Join Lobby
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- SETTINGS VIEW ---------------- */
interface SettingsViewProps {
  settings: SettingsConfig;
  onUpdateSettings: (next: SettingsConfig) => void;
}

export function SettingsView({ settings, onUpdateSettings }: SettingsViewProps) {
  const update = <K extends keyof SettingsConfig>(key: K, val: SettingsConfig[K]) => {
    soundEngine.playClick();
    onUpdateSettings({ ...settings, [key]: val });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="pb-4 border-b border-[#C4A1FF]/15">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3EFFA]">
          Game Settings
        </h2>
        <p className="mt-1 text-sm text-[#B7AACF]">
          Tune audio balance, graphics fidelity, camera responsiveness, and language preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Audio Controls */}
        <div className="p-5 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/20 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#F3EFFA] flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#C4A1FF]" />
              <span>Audio & Music</span>
            </h3>
            <button
              type="button"
              onClick={() => update('muted', !settings.muted)}
              className={`px-3 py-1 text-xs font-medium rounded-md border cursor-pointer ${
                settings.muted
                  ? 'bg-rose-950/50 border-rose-400/50 text-rose-200'
                  : 'bg-[#171226] border-[#C4A1FF]/30 text-[#C4A1FF]'
              }`}
            >
              {settings.muted ? 'Muted' : 'Audio Active'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#CFC6E3] mb-1.5">
              <label htmlFor="sound-vol">Sound Effects Volume</label>
              <span className="font-mono-tabular text-[#C4A1FF]">{settings.soundVolume}%</span>
            </div>
            <input
              id="sound-vol"
              type="range"
              min={0}
              max={100}
              value={settings.soundVolume}
              onChange={(e) => onUpdateSettings({ ...settings, soundVolume: Number(e.target.value) })}
              className="w-full accent-[#C4A1FF]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#CFC6E3] mb-1.5">
              <label htmlFor="music-vol">Atmospheric Music Volume</label>
              <span className="font-mono-tabular text-[#C4A1FF]">{settings.musicVolume}%</span>
            </div>
            <input
              id="music-vol"
              type="range"
              min={0}
              max={100}
              value={settings.musicVolume}
              onChange={(e) => onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })}
              className="w-full accent-[#C4A1FF]"
            />
          </div>
        </div>

        {/* Graphics & Language */}
        <div className="p-5 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/20 space-y-5">
          <h3 className="text-base font-semibold text-[#F3EFFA]">Graphics & Localization</h3>

          <div>
            <span className="block text-xs text-[#CFC6E3] mb-2">Graphics Quality</span>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => update('graphicsQuality', q)}
                  className={`py-2 text-xs font-medium capitalize rounded-lg border cursor-pointer ${
                    settings.graphicsQuality === q
                      ? 'bg-[#C4A1FF] text-[#07060B] border-[#C4A1FF] font-semibold'
                      : 'bg-[#141022] text-[#D8CEE8] border-[#C4A1FF]/15'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="lang-select" className="block text-xs text-[#CFC6E3] mb-2">
              Interface Language
            </label>
            <select
              id="lang-select"
              value={settings.language}
              onChange={(e) => update('language', e.target.value as SettingsConfig['language'])}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#141022] border border-[#C4A1FF]/25 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF]"
            >
              <option value="en">English (EN)</option>
              <option value="es">Español (ES)</option>
              <option value="fr">Français (FR)</option>
            </select>
          </div>
        </div>

        {/* Camera & Controls */}
        <div className="md:col-span-2 p-5 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/20 grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
          <div>
            <div className="flex justify-between text-xs text-[#CFC6E3] mb-1.5">
              <label htmlFor="cam-sens">Camera Sensitivity</label>
              <span className="font-mono-tabular text-[#C4A1FF]">
                {settings.cameraSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              id="cam-sens"
              type="range"
              min={0.4}
              max={2.0}
              step={0.1}
              value={settings.cameraSensitivity}
              onChange={(e) =>
                onUpdateSettings({ ...settings, cameraSensitivity: Number(e.target.value) })
              }
              className="w-full accent-[#C4A1FF]"
            />
          </div>

          <div>
            <span className="block text-xs text-[#CFC6E3] mb-2">Look Axis</span>
            <button
              type="button"
              onClick={() => update('invertY', !settings.invertY)}
              className={`w-full py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                settings.invertY
                  ? 'bg-[#C4A1FF]/20 border-[#C4A1FF] text-[#F3EFFA]'
                  : 'bg-[#141022] border-[#C4A1FF]/20 text-[#CFC6E3]'
              }`}
            >
              Invert Y-Axis: {settings.invertY ? 'ON' : 'OFF'}
            </button>
          </div>

          <div>
            <span className="block text-xs text-[#CFC6E3] mb-2">Touch Controls</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['auto', 'always', 'off'] as const).map((tc) => (
                <button
                  key={tc}
                  type="button"
                  onClick={() => update('touchControls', tc)}
                  className={`py-2 text-xs capitalize rounded-lg border cursor-pointer ${
                    settings.touchControls === tc
                      ? 'bg-[#C4A1FF] text-[#07060B] border-[#C4A1FF] font-semibold'
                      : 'bg-[#141022] text-[#CFC6E3] border-[#C4A1FF]/15'
                  }`}
                >
                  {tc}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PROFILE & AUTH VIEW ---------------- */
interface ProfileAuthViewProps {
  user: UserProfile | null;
  progress: PlayerProgress;
  onAuthSuccess: (user: UserProfile, token: string) => void;
  onLogout: () => void;
}

export function ProfileAuthView({
  user,
  progress,
  onAuthSuccess,
  onLogout,
}: ProfileAuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');
      soundEngine.playClueFound();
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      soundEngine.playPuzzleError();
      setError(err instanceof Error ? err.message : 'Unable to authenticate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'detective', password: 'shadow2026' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo sign-in unavailable.');
      soundEngine.playClueFound();
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="p-6 rounded-2xl bg-[#0D0A16] border border-[#C4A1FF]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#C4A1FF]">Verified Syndicate Investigator</div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F3EFFA]">
              {user.displayName}
            </h2>
            <p className="text-xs text-[#A89BBF]">
              @{user.username} · Chapter {progress.storyChapter} of 7
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#E9D8FD] bg-[#161224] border border-[#C4A1FF]/25 hover:border-[#C4A1FF] rounded-lg cursor-pointer self-start"
          >
            <LogOut className="w-3.5 h-3.5 text-[#C4A1FF]" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/20">
            <div className="text-xs text-[#A89BBF]">Realms Escaped</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-[#F3EFFA]">
              {progress.completedLocations.length}/7
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/20">
            <div className="text-xs text-[#A89BBF]">Total Escapes</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-[#C4A1FF]">
              {progress.totalEscapes}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/20">
            <div className="text-xs text-[#A89BBF]">Clues Found</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-[#F3EFFA]">
              {progress.discoveredClues.length}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0D0A16] border border-[#C4A1FF]/20">
            <div className="text-xs text-[#A89BBF]">Achievements</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-[#C4A1FF]">
              {progress.unlockedAchievements.length}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0D0A16] border border-[#C4A1FF]/28 shadow-2xl">
        <div className="flex items-center gap-2 text-xs text-[#C4A1FF]">
          <Shield className="w-4 h-4" />
          <span>Cloud Save & Multiplayer Identity</span>
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold text-[#F3EFFA]">
          {mode === 'login' ? 'Investigator Sign In' : 'Create Account'}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#141022]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
              mode === 'login' ? 'bg-[#C4A1FF] text-[#07060B]' : 'text-[#B7AACF]'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
              mode === 'register' ? 'bg-[#C4A1FF] text-[#07060B]' : 'text-[#B7AACF]'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          <div>
            <label htmlFor="auth-user" className="block text-xs text-[#CFC6E3] mb-1">
              Username
            </label>
            <input
              id="auth-user"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3–20 characters (letters, numbers, _)"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#141022] border border-[#C4A1FF]/25 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF]"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="auth-display" className="block text-xs text-[#CFC6E3] mb-1">
                Display Name
              </label>
              <input
                id="auth-display"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Agent Name"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#141022] border border-[#C4A1FF]/25 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF]"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-pass" className="block text-xs text-[#CFC6E3] mb-1">
              Password
            </label>
            <input
              id="auth-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#141022] border border-[#C4A1FF]/25 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF]"
            />
          </div>

          {error && (
            <div className="px-3.5 py-2 rounded-lg bg-red-950/50 border border-red-400/35 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer disabled:opacity-60"
          >
            {submitting
              ? 'Authenticating...'
              : mode === 'login'
                ? 'Sign In'
                : 'Register Investigator'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#C4A1FF]/15 text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C4A1FF] hover:text-[#E9D8FD] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick Sign In as Demo Detective</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- RULES & ABOUT MODALS ---------------- */
export function InfoModal({
  kind,
  onClose,
}: {
  kind: 'rules' | 'about' | null;
  onClose: () => void;
}) {
  if (!kind) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07060B]/85"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#0E0B18] border border-[#C4A1FF]/35 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold text-[#F3EFFA]">
            {kind === 'rules' ? 'Game Rules & Investigation Guide' : 'About NO ESCAPE'}
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="p-1.5 text-[#B7AACF] hover:text-[#F3EFFA] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {kind === 'rules' ? (
          <ul className="mt-4 space-y-2.5 text-sm text-[#D8CEE8]">
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C4A1FF] shrink-0 mt-0.5" />
              <span>Explore each 3D realm with WASD / Arrow keys (or touch joystick) and drag to look around.</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C4A1FF] shrink-0 mt-0.5" />
              <span>Approach glowing lilac pedestals and press E to collect clues and hidden secrets.</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C4A1FF] shrink-0 mt-0.5" />
              <span>Speak with each realm’s resident NPC for guidance, then enter the decoded numbers into the Vault Cipher Console.</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C4A1FF] shrink-0 mt-0.5" />
              <span>Once the seal shatters, walk through the northern Vault Gate to escape and unlock the next location.</span>
            </li>
          </ul>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-[#D8CEE8] leading-relaxed">
            <p>
              <strong>NO ESCAPE</strong> is a dark-luxury 3D mystery-adventure set across seven interconnected realms—from Blackwood Manor and St. Vesper Academy to the towering Nocturne Citadel.
            </p>
            <p>
              Customize your 3D investigator in the Studio, tackle Story and Challenge modes solo, or join real-time WebSocket multiplayer lobbies to solve ciphers together.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
