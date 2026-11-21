import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Flame,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Timer,
  User,
  Users,
} from 'lucide-react';
import type {
  GameMode,
  LocationDef,
  LocationId,
  PlayerProgress,
  RoomSummary,
  SettingsConfig,
} from '../game/types';
import { LOCATIONS } from '../game/worldData';
import { TRANSLATIONS } from '../game/rules';
import { soundEngine } from '../audio/soundEngine';

interface PlayHubProps {
  progress: PlayerProgress;
  settings: SettingsConfig;
  playerName: string;
  onLaunchLocation: (locationId: LocationId, mode: GameMode, roomId?: string) => void;
}

export function PlayHub({
  progress,
  settings,
  playerName,
  onLaunchLocation,
}: PlayHubProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>('story');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLoc, setNewRoomLoc] = useState<LocationId>('abandoned_mansion');
  const [joinCode, setJoinCode] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);

  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;

  const fetchRooms = async () => {
    setLoadingRooms(true);
    setRoomError(null);
    try {
      const res = await fetch('/api/multiplayer/rooms');
      if (!res.ok) throw new Error('Could not reach multiplayer servers.');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : 'Unable to load rooms.');
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (selectedMode === 'multiplayer') {
      fetchRooms();
    }
  }, [selectedMode]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    setRoomError(null);
    try {
      const res = await fetch('/api/multiplayer/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim() || `${playerName}'s Investigation`,
          locationId: newRoomLoc,
          hostName: playerName,
          isPrivate: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create room.');
      onLaunchLocation(data.room.locationId, 'multiplayer', data.room.id);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : 'Failed to create room.');
    }
  };

  const modes: Array<{
    id: GameMode;
    label: string;
    desc: string;
    icon: typeof User;
  }> = [
    {
      id: 'story',
      label: t.storyMode,
      desc: 'Follow the main Syndicate storyline and unlock all 7 realms sequentially.',
      icon: Compass,
    },
    {
      id: 'solo',
      label: t.soloMode,
      desc: 'Explore any unlocked mystery environment freely at your own pace.',
      icon: User,
    },
    {
      id: 'multiplayer',
      label: t.multiplayerMode,
      desc: 'Investigate together in real-time WebSocket rooms with live teammates.',
      icon: Users,
    },
    {
      id: 'challenge',
      label: t.challengeMode,
      desc: 'Beat the countdown clock on solved realms to set record escape times.',
      icon: Flame,
    },
  ];

  const isLocationPlayable = (loc: LocationDef) => {
    if (selectedMode === 'multiplayer' || selectedMode === 'solo') return true;
    return progress.unlockedLocations.includes(loc.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Mode Selector */}
      <section>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3EFFA] tracking-wide">
          Select Investigation Mode
        </h2>
        <p className="mt-1 text-sm text-[#B7AACF]">
          Choose how you enter the world of NO ESCAPE.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedMode(m.id);
                }}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#19132B] border-[#C4A1FF] shadow-[0_0_24px_rgba(196,161,255,0.22)]'
                    : 'bg-[#0D0A16] border-[#C4A1FF]/15 hover:border-[#C4A1FF]/45'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5 text-[#C4A1FF]" />
                  {active && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C4A1FF]">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-3 text-base font-semibold text-[#F3EFFA]">{m.label}</div>
                <p className="mt-1 text-xs text-[#A89BBF] leading-relaxed">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Multiplayer Lobby Panel */}
      {selectedMode === 'multiplayer' && (
        <section className="bg-[#0D0A16] border border-[#C4A1FF]/25 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-[#F3EFFA]">
                Live Multiplayer Rooms
              </h3>
              <p className="text-xs text-[#B7AACF] mt-0.5">
                Join an open lobby, enter a room code, or host a new realm session.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchRooms}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#E9D8FD] bg-[#161224] border border-[#C4A1FF]/25 rounded-lg hover:border-[#C4A1FF] cursor-pointer self-start"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C4A1FF] ${loadingRooms ? 'animate-spin' : ''}`} />
              <span>Refresh Rooms</span>
            </button>
          </div>

          {roomError && (
            <div className="px-4 py-2.5 rounded-lg bg-red-950/50 border border-red-400/40 text-xs text-red-200">
              {roomError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Active Rooms List */}
            <div className="lg:col-span-7 space-y-2.5">
              {rooms.length === 0 ? (
                <div className="p-6 text-center rounded-lg bg-[#120E1D] border border-[#C4A1FF]/12 text-xs text-[#A89BBF]">
                  No public rooms active right now. Create a room on the right to start!
                </div>
              ) : (
                rooms.map((room) => {
                  const locName = LOCATIONS.find((l) => l.id === room.locationId)?.name || room.locationId;
                  return (
                    <div
                      key={room.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-[#130F20] border border-[#C4A1FF]/18"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#F3EFFA]">{room.name}</span>
                          <span className="font-mono-tabular text-xs text-[#C4A1FF]">
                            {room.id}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[#A89BBF]">
                          {locName} · Host: {room.hostName} ·{' '}
                          <span className="font-mono-tabular text-[#E9D8FD]">
                            {room.playerCount}/{room.maxPlayers}
                          </span>{' '}
                          investigators
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onLaunchLocation(room.locationId, 'multiplayer', room.id);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Join Room</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Create or Join by Code */}
            <div className="lg:col-span-5 space-y-4">
              <form
                onSubmit={handleCreateRoom}
                className="p-4 rounded-lg bg-[#120E1D] border border-[#C4A1FF]/18 space-y-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-[#C4A1FF]">
                  Host New Investigation
                </div>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Room title (e.g. Midnight Squad)"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#090711] border border-[#C4A1FF]/20 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF]"
                />
                <select
                  aria-label="Select location for room"
                  value={newRoomLoc}
                  onChange={(e) => setNewRoomLoc(e.target.value as LocationId)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#090711] border border-[#C4A1FF]/20 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF]"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.subtitle})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create & Enter Room</span>
                </button>
              </form>

              <div className="p-4 rounded-lg bg-[#120E1D] border border-[#C4A1FF]/18 flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Room code (e.g. ROOM-OBSIDIAN)"
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#090711] border border-[#C4A1FF]/20 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!joinCode.trim()) return;
                    soundEngine.playClick();
                    onLaunchLocation('abandoned_mansion', 'multiplayer', joinCode.trim());
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#F3EFFA] bg-[#1F1833] border border-[#C4A1FF]/35 hover:border-[#C4A1FF] rounded-lg cursor-pointer shrink-0"
                >
                  Join Code
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7 Mysterious World Locations */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-2xl font-bold text-[#F3EFFA] tracking-wide">
              World Locations
            </h3>
            <p className="mt-1 text-sm text-[#B7AACF]">
              Seven interconnected realms. Solve each realm’s cipher to unlock the next chapter.
            </p>
          </div>
          <div className="text-xs text-[#C4A1FF] font-mono-tabular">
            {progress.completedLocations.length} / {LOCATIONS.length} Realms Escaped
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOCATIONS.map((loc) => {
            const unlocked = isLocationPlayable(loc);
            const completed = progress.completedLocations.includes(loc.id);
            const cluesFound = loc.clues.filter((c) => progress.discoveredClues.includes(c.id)).length;
            const bestTime = progress.bestChallengeTimes[loc.id];

            return (
              <div
                key={loc.id}
                className={`flex flex-col justify-between p-5 rounded-xl border transition-all ${
                  unlocked
                    ? 'bg-[#0D0A16] border-[#C4A1FF]/22 hover:border-[#C4A1FF]/60'
                    : 'bg-[#09070E] border-[#C4A1FF]/10 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#C4A1FF]">
                    <span className="font-mono-tabular">
                      0{loc.order}. {loc.subtitle}
                    </span>
                    {completed ? (
                      <span className="inline-flex items-center gap-1 text-[#D6BCFA]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Escaped
                      </span>
                    ) : !unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[#8D81A3]">
                        <Lock className="w-3.5 h-3.5" />
                        Locked
                      </span>
                    ) : null}
                  </div>

                  <h4 className="mt-2 font-display text-xl font-bold text-[#F3EFFA]">
                    {loc.name}
                  </h4>
                  <p className="mt-1 text-xs font-medium text-[#C4A1FF]/90">{loc.atmosphere}</p>
                  <p className="mt-2.5 text-xs text-[#B7AACF] leading-relaxed">
                    {loc.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#C4A1FF]/12 flex items-center justify-between gap-3">
                  <div className="text-xs text-[#A89BBF] font-mono-tabular">
                    Clues {cluesFound}/{loc.clues.length}
                    {selectedMode === 'challenge' && (
                      <>
                        {' · '}
                        <span className="inline-flex items-center gap-1 text-[#E9D8FD]">
                          <Timer className="w-3 h-3 inline" />
                          {bestTime ? `${bestTime}s best` : `${loc.challengeTimeLimitSec}s limit`}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      soundEngine.playClick();
                      onLaunchLocation(
                        loc.id,
                        selectedMode,
                        selectedMode === 'multiplayer' ? 'ROOM-OBSIDIAN' : undefined,
                      );
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      unlocked
                        ? 'bg-[#C4A1FF] text-[#07060B] hover:bg-[#D6BCFA]'
                        : 'bg-[#181424] text-[#8D81A3]'
                    }`}
                  >
                    {unlocked ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Enter Realm</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
