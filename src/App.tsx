import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CharacterConfig,
  ChatMessage,
  ClueDef,
  DashboardTab,
  FriendInfo,
  GameMode,
  LocationId,
  MultiplayerPlayerState,
  PlayerProgress,
  ProximityPeerInfo,
  SettingsConfig,
  UserProfile,
} from './game/types';
import { LOCATIONS } from './game/worldData';
import {
  DEFAULT_FEMALE_CHARACTER,
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  evaluateProgressAfterEscape,
  registerClueDiscovery,
  resolveActiveCharacter,
} from './game/rules';
import { soundEngine } from './audio/soundEngine';
import { ProximityVoiceManager, type RtcSignalMessage } from './audio/webrtcVoice';
import { WorldExploreCanvas, type VirtualJoystickInput } from './three/WorldExploreCanvas';
import { HomeScreen } from './components/HomeScreen';
import { DashboardNav } from './components/DashboardNav';
import { PlayHub } from './components/PlayHub';
import { CharacterStudio } from './components/CharacterStudio';
import {
  FriendsView,
  InfoModal,
  InventoryView,
  MissionsView,
  ProfileAuthView,
  SettingsView,
} from './components/DashboardViews';
import { GameplayHUD } from './components/GameplayHUD';
import { ClueModal, NpcDialogueModal, PuzzleModal } from './components/PuzzleModal';
import { LoadingOverlay } from './components/LoadingOverlay';

const STORAGE_KEYS = {
  token: 'no_escape_token',
  character: 'no_escape_character',
  progress: 'no_escape_progress',
  settings: 'no_escape_settings',
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export default function App() {
  const autostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.token));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [character, setCharacter] = useState<CharacterConfig>(() =>
    readLocal(STORAGE_KEYS.character, DEFAULT_FEMALE_CHARACTER),
  );
  const [progress, setProgress] = useState<PlayerProgress>(() =>
    readLocal(STORAGE_KEYS.progress, DEFAULT_PROGRESS),
  );
  const [settings, setSettings] = useState<SettingsConfig>(() =>
    readLocal(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
  );
  const [friends, setFriends] = useState<FriendInfo[]>([]);

  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [isPlaying, setIsPlaying] = useState<boolean>(autostart);
  const [activeLocationId, setActiveLocationId] = useState<LocationId>('abandoned_mansion');
  const [activeMode, setActiveMode] = useState<GameMode>('story');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [runKey, setRunKey] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingLabel, setLoadingLabel] = useState<string>('Entering the Archive...');
  const [infoModal, setInfoModal] = useState<'rules' | 'about' | null>(null);

  // Active gameplay state
  const [paused, setPaused] = useState<boolean>(false);
  const [flashlightOn, setFlashlightOn] = useState<boolean>(true);
  const [puzzleSolved, setPuzzleSolved] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [victoryState, setVictoryState] = useState<{ escaped: boolean; elapsedSec: number } | null>(
    null,
  );
  const [nearInteractable, setNearInteractable] = useState<{
    id: string;
    kind: string;
    label: string;
  } | null>(null);
  const [activeClueModal, setActiveClueModal] = useState<ClueDef | null>(null);
  const [activePuzzleModal, setActivePuzzleModal] = useState<boolean>(false);
  const [activeNpcModal, setActiveNpcModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multiplayer WebSocket & WebRTC Proximity Voice state
  const wsRef = useRef<WebSocket | null>(null);
  const selfMpIdRef = useRef<string | null>(null);
  const voiceManagerRef = useRef<ProximityVoiceManager | null>(null);
  const playerPoseRef = useRef<{ x: number; y: number; z: number; yaw: number }>({
    x: 0,
    y: 0,
    z: 12,
    yaw: 0,
  });
  const [remotePlayers, setRemotePlayers] = useState<MultiplayerPlayerState[]>([]);
  const remotePlayersRef = useRef<MultiplayerPlayerState[]>([]);
  const [proximityPeers, setProximityPeers] = useState<ProximityPeerInfo[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const joystickRef = useRef<VirtualJoystickInput>({ moveX: 0, moveY: 0 });

  useEffect(() => {
    remotePlayersRef.current = remotePlayers;
  }, [remotePlayers]);

  const activeLocation = useMemo(
    () => LOCATIONS.find((l) => l.id === activeLocationId) || LOCATIONS[0],
    [activeLocationId],
  );

  // Sync audio settings
  useEffect(() => {
    soundEngine.updateSettings(settings);
    voiceManagerRef.current?.setMasterVolume(settings.soundVolume / 100, settings.muted);
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.character, JSON.stringify(character));
  }, [character]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
  }, [progress]);

  // Sync document.body.dataset.state for game state machine
  useEffect(() => {
    if (!isPlaying) {
      document.body.dataset.state = 'title';
    } else if (victoryState) {
      document.body.dataset.state = 'gameover';
    } else if (paused) {
      document.body.dataset.state = 'paused';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [isPlaying, paused, victoryState]);

  // Hydrate authenticated user on mount if token exists
  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setCharacter(data.user.character);
          setProgress(data.user.progress);
          setSettings(data.user.settings);
        } else {
          localStorage.removeItem(STORAGE_KEYS.token);
          setToken(null);
        }
      })
      .catch(() => {});
  }, [token]);

  // Fetch friends when logged in
  useEffect(() => {
    if (!token || !user) return;
    fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.friends) setFriends(d.friends);
      })
      .catch(() => {});
  }, [token, user]);

  // Gameplay Timer
  useEffect(() => {
    if (!isPlaying || paused || victoryState) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        if (activeMode === 'challenge' && next >= activeLocation.challengeTimeLimitSec) {
          setVictoryState({ escaped: false, elapsedSec: next });
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, paused, victoryState, activeMode, activeLocation.challengeTimeLimitSec]);

  // Global Keyboard Shortcuts (Title Start + Pause + Flashlight)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!isPlaying && activeTab === 'home' && !infoModal) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          launchLocation(activeLocationId, 'story');
        }
      } else if (isPlaying) {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (activeClueModal) {
            setActiveClueModal(null);
          } else if (activePuzzleModal) {
            setActivePuzzleModal(false);
          } else if (activeNpcModal) {
            setActiveNpcModal(false);
          } else if (!victoryState) {
            setPaused((p) => !p);
          }
        } else if (e.code === 'KeyF') {
          soundEngine.playToggle(!flashlightOn);
          setFlashlightOn((f) => !f);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // WebSocket Multiplayer & WebRTC Proximity Voice Connection
  useEffect(() => {
    if (!isPlaying || activeMode !== 'multiplayer' || !activeRoomId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (voiceManagerRef.current) {
        voiceManagerRef.current.dispose();
        voiceManagerRef.current = null;
      }
      setRemotePlayers([]);
      setProximityPeers([]);
      setVoiceEnabled(false);
      setVoiceMuted(false);
      setVoiceError(null);
      return;
    }

    const vm = new ProximityVoiceManager(
      (targetId, signalType, payload) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'rtc_signal',
              targetId,
              signalType,
              payload,
            }),
          );
        }
      },
      () => {
        setVoiceEnabled(vm.isVoiceEnabled());
        setVoiceMuted(vm.isLocalMuted());
      },
    );
    vm.setMasterVolume(settings.soundVolume / 100, settings.muted);
    voiceManagerRef.current = vm;

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      const resolved = resolveActiveCharacter(character);
      ws.send(
        JSON.stringify({
          type: 'join_room',
          roomId: activeRoomId,
          token,
          locationId: activeLocationId,
          username: user?.displayName || resolved.name,
          character: resolved,
          x: activeLocation.spawnPoint[0],
          y: activeLocation.spawnPoint[1],
          z: activeLocation.spawnPoint[2],
          yaw: activeLocation.spawnYaw,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room_state') {
          selfMpIdRef.current = msg.selfId;
          vm.setSelfId(msg.selfId);
          const others = (msg.players as MultiplayerPlayerState[]).filter(
            (p) => p.id !== msg.selfId,
          );
          setRemotePlayers(others);
          vm.syncPeers(others);
          if (msg.puzzleSolved) setPuzzleSolved(true);
          if (Array.isArray(msg.chat)) setChatMessages(msg.chat);
        } else if (msg.type === 'player_joined') {
          const p = msg.player as MultiplayerPlayerState;
          if (p.id !== selfMpIdRef.current) {
            setRemotePlayers((prev) => {
              const next = prev.some((x) => x.id === p.id) ? prev : [...prev, p];
              vm.syncPeers(next);
              return next;
            });
          }
        } else if (msg.type === 'player_left') {
          setRemotePlayers((prev) => {
            const next = prev.filter((p) => p.id !== msg.playerId);
            vm.syncPeers(next);
            return next;
          });
        } else if (msg.type === 'player_moved') {
          setRemotePlayers((prev) =>
            prev.map((p) =>
              p.id === msg.playerId
                ? { ...p, x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw, moving: msg.moving }
                : p,
            ),
          );
        } else if (msg.type === 'rtc_signal') {
          vm.handleSignal(msg as RtcSignalMessage);
        } else if (msg.type === 'voice_status') {
          setRemotePlayers((prev) =>
            prev.map((p) =>
              p.id === msg.playerId
                ? {
                    ...p,
                    voiceActive: Boolean(msg.voiceActive),
                    voiceMuted: Boolean(msg.voiceMuted),
                  }
                : p,
            ),
          );
        } else if (msg.type === 'clue_found') {
          setToastMessage(`${msg.finder} discovered a clue!`);
          setTimeout(() => setToastMessage(null), 2600);
        } else if (msg.type === 'puzzle_solved') {
          soundEngine.playPuzzleSolved();
          setPuzzleSolved(true);
          setToastMessage(`${msg.solver} broke the Vault Seal!`);
          setTimeout(() => setToastMessage(null), 3000);
        } else if (msg.type === 'chat_message') {
          setChatMessages((prev) => [...prev.slice(-30), msg.message]);
        }
      } catch {
        // Ignore parse errors
      }
    };

    const spatialTimer = window.setInterval(() => {
      const pose = playerPoseRef.current;
      const infos = vm.updateSpatialPositions(pose, pose.yaw, remotePlayersRef.current);
      setProximityPeers(infos);
    }, 120);

    return () => {
      window.clearInterval(spatialTimer);
      vm.dispose();
      if (voiceManagerRef.current === vm) {
        voiceManagerRef.current = null;
      }
      ws.close();
      wsRef.current = null;
      setProximityPeers([]);
      setVoiceEnabled(false);
      setVoiceMuted(false);
    };
  }, [isPlaying, activeMode, activeRoomId, activeLocationId, token, user?.displayName]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const syncProgressToCloud = useCallback(
    (nextProgress: PlayerProgress) => {
      if (!token) return;
      fetch('/api/player/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nextProgress),
      }).catch(() => {});
    },
    [token],
  );

  const launchLocation = (locId: LocationId, mode: GameMode, roomId?: string) => {
    soundEngine.unlockAndStartMusic();
    soundEngine.playClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const targetLoc = LOCATIONS.find((l) => l.id === locId) || LOCATIONS[0];
    playerPoseRef.current = {
      x: targetLoc.spawnPoint[0],
      y: targetLoc.spawnPoint[1],
      z: targetLoc.spawnPoint[2],
      yaw: targetLoc.spawnYaw,
    };
    setVoiceError(null);
    setLoadingLabel(`Entering ${targetLoc.name}...`);
    setLoading(true);
    setActiveLocationId(locId);
    setActiveMode(mode);
    setActiveRoomId(roomId || null);
    setPuzzleSolved(false);
    setElapsedSec(0);
    setPaused(false);
    setVictoryState(null);
    setActiveClueModal(null);
    setActivePuzzleModal(false);
    setActiveNpcModal(false);
    setNearInteractable(null);
    setRunKey((k) => k + 1);
    setIsPlaying(true);

    setTimeout(() => {
      setLoading(false);
    }, 350);
  };

  const handleSaveCharacter = async (next: CharacterConfig) => {
    setCharacter(next);
    if (next.customizeEnabled && !progress.unlockedAchievements.includes('badge_customizer')) {
      const nextProg: PlayerProgress = {
        ...progress,
        unlockedAchievements: [...progress.unlockedAchievements, 'badge_customizer'],
      };
      setProgress(nextProg);
      syncProgressToCloud(nextProg);
    }
    if (token) {
      const res = await fetch('/api/player/character', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
      }
    }
  };

  const handleUpdateSettings = (next: SettingsConfig) => {
    setSettings(next);
    if (token) {
      fetch('/api/player/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(next),
      }).catch(() => {});
    }
  };

  const handleInteract = useCallback(
    (node: { id: string; kind: string; label: string; clueId?: string; isSecret?: boolean }) => {
      if (paused || victoryState) return;
      if (node.kind === 'clue' && node.clueId) {
        const clue = activeLocation.clues.find((c) => c.id === node.clueId);
        if (clue) {
          soundEngine.playClueFound();
          setActiveClueModal(clue);
          const nextProg = registerClueDiscovery(progress, clue.id, Boolean(clue.isSecret));
          setProgress(nextProg);
          syncProgressToCloud(nextProg);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'clue_found', clueId: clue.id }));
          }
        }
      } else if (node.kind === 'puzzle') {
        soundEngine.playClick();
        setActivePuzzleModal(true);
      } else if (node.kind === 'npc') {
        soundEngine.playClick();
        setActiveNpcModal(true);
      } else if (node.kind === 'exit') {
        if (!puzzleSolved) {
          soundEngine.playPuzzleError();
          showToast('The Vault Gate is sealed. Solve the realm’s cipher console first!');
        } else {
          soundEngine.playPuzzleSolved();
          const nextProg = evaluateProgressAfterEscape(
            progress,
            activeLocation.id,
            activeMode === 'challenge' ? elapsedSec : undefined,
          );
          setProgress(nextProg);
          syncProgressToCloud(nextProg);
          setVictoryState({ escaped: true, elapsedSec });
        }
      }
    },
    [
      paused,
      victoryState,
      activeLocation,
      progress,
      puzzleSolved,
      activeMode,
      elapsedSec,
      syncProgressToCloud,
    ],
  );

  const handleSolvePuzzle = (attempt: number[]) => {
    setPuzzleSolved(true);
    setActivePuzzleModal(false);
    showToast('Vault Seal Shattered! Head to the Northern Gate.');
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'puzzle_attempt', attempt }));
    }
  };

  const handlePlayerMoveNet = useCallback(
    (x: number, y: number, z: number, yaw: number, moving: boolean) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'move', x, y, z, yaw, moving }));
      }
    },
    [],
  );

  const handleSendChat = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', text }));
    }
  };

  const broadcastVoiceStatus = (active: boolean, muted: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'voice_status', voiceActive: active, voiceMuted: muted }),
      );
    }
  };

  const handleToggleVoice = async () => {
    const vm = voiceManagerRef.current;
    if (!vm) return;
    setVoiceError(null);
    if (vm.isVoiceEnabled()) {
      vm.disableMic();
      setVoiceEnabled(false);
      setVoiceMuted(false);
      broadcastVoiceStatus(false, false);
    } else {
      try {
        await vm.enableMic();
        setVoiceEnabled(true);
        setVoiceMuted(false);
        broadcastVoiceStatus(true, false);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Microphone permission denied or unavailable.';
        setVoiceError(msg);
      }
    }
  };

  const handleToggleVoiceMute = () => {
    const vm = voiceManagerRef.current;
    if (!vm || !vm.isVoiceEnabled()) return;
    const nextMuted = vm.toggleMuteMic();
    setVoiceMuted(nextMuted);
    broadcastVoiceStatus(true, nextMuted);
  };

  const handleAuthSuccess = (nextUser: UserProfile, nextToken: string) => {
    localStorage.setItem(STORAGE_KEYS.token, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setCharacter(nextUser.character);
    setProgress(nextUser.progress);
    setSettings(nextUser.settings);
    setActiveTab('play');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    setToken(null);
    setUser(null);
    setFriends([]);
  };

  const handleAddFriend = async (username: string) => {
    if (!token) throw new Error('Sign in required.');
    const res = await fetch('/api/friends/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not add friend.');
    setFriends(data.friends || []);
  };

  const nextLocationObj = LOCATIONS.find((l) => l.order === activeLocation.order + 1);
  const discoveredInLoc = activeLocation.clues.filter((c) =>
    progress.discoveredClues.includes(c.id),
  ).length;

  return (
    <div className="min-h-screen bg-[#07060B] text-[#F3EFFA] relative overflow-x-hidden">
      <LoadingOverlay visible={loading} label={loadingLabel} />

      {/* Always-mounted 3D World Canvas when in Title Home or Active Gameplay */}
      {(isPlaying || activeTab === 'home') && (
        <WorldExploreCanvas
          key={`${activeLocation.id}-${runKey}`}
          location={activeLocation}
          character={character}
          settings={settings}
          isPlaying={isPlaying && !paused && !victoryState && !activeClueModal && !activePuzzleModal && !activeNpcModal}
          isTitleMode={!isPlaying && activeTab === 'home'}
          puzzleSolved={puzzleSolved}
          discoveredClues={progress.discoveredClues}
          remotePlayers={remotePlayers}
          joystickRef={joystickRef}
          playerPoseRef={playerPoseRef}
          flashlightOn={flashlightOn}
          onNearInteractable={setNearInteractable}
          onInteract={handleInteract}
          onPlayerMove={activeMode === 'multiplayer' ? handlePlayerMoveNet : undefined}
        />
      )}

      {/* Active Gameplay HUD & Modals */}
      {isPlaying ? (
        <>
          <GameplayHUD
            location={activeLocation}
            mode={activeMode}
            roomId={activeRoomId}
            puzzleSolved={puzzleSolved}
            discoveredCluesCount={discoveredInLoc}
            elapsedSec={elapsedSec}
            flashlightOn={flashlightOn}
            settings={settings}
            nearInteractable={nearInteractable}
            remotePlayers={remotePlayers}
            proximityPeers={proximityPeers}
            voiceEnabled={voiceEnabled}
            voiceMuted={voiceMuted}
            voiceError={voiceError}
            chatMessages={chatMessages}
            paused={paused}
            victoryState={victoryState}
            joystickRef={joystickRef}
            onToggleFlashlight={() => {
              soundEngine.playToggle(!flashlightOn);
              setFlashlightOn((f) => !f);
            }}
            onToggleMute={() => handleUpdateSettings({ ...settings, muted: !settings.muted })}
            onToggleVoice={handleToggleVoice}
            onToggleVoiceMute={handleToggleVoiceMute}
            onInteractClick={() => {
              if (nearInteractable) {
                const clueMatch = activeLocation.clues.find((c) => c.id === nearInteractable.id);
                handleInteract({
                  ...nearInteractable,
                  clueId: clueMatch?.id,
                  isSecret: clueMatch?.isSecret,
                });
              }
            }}
            onPauseToggle={() => setPaused((p) => !p)}
            onRestart={() => launchLocation(activeLocation.id, activeMode, activeRoomId || undefined)}
            onExitToDashboard={() => {
              setIsPlaying(false);
              setActiveTab('play');
            }}
            onNextLocation={
              nextLocationObj
                ? () => launchLocation(nextLocationObj.id, activeMode)
                : undefined
            }
            onSendChat={handleSendChat}
          />

          {toastMessage && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg bg-[#161026] border border-[#C4A1FF] text-xs font-semibold text-[#F3EFFA] shadow-xl">
              {toastMessage}
            </div>
          )}

          {activeClueModal && (
            <ClueModal clue={activeClueModal} onClose={() => setActiveClueModal(null)} />
          )}

          {activePuzzleModal && (
            <PuzzleModal
              location={activeLocation}
              alreadySolved={puzzleSolved}
              onSolve={handleSolvePuzzle}
              onClose={() => setActivePuzzleModal(false)}
            />
          )}

          {activeNpcModal && (
            <NpcDialogueModal
              name={activeLocation.npc.name}
              role={activeLocation.npc.role}
              lines={activeLocation.npc.dialogue}
              onClose={() => setActiveNpcModal(false)}
            />
          )}
        </>
      ) : activeTab === 'home' ? (
        <div className="relative z-10 min-h-screen flex flex-col">
          <HomeScreen
            user={user}
            settings={settings}
            onPlayNow={() => launchLocation(activeLocationId, 'story')}
            onNavigate={(tab) => {
              soundEngine.unlockAndStartMusic();
              soundEngine.playClick();
              setActiveTab(tab);
            }}
            onOpenRules={() => {
              soundEngine.playClick();
              setInfoModal('rules');
            }}
            onOpenAbout={() => {
              soundEngine.playClick();
              setInfoModal('about');
            }}
          />
          <InfoModal kind={infoModal} onClose={() => setInfoModal(null)} />
        </div>
      ) : (
        <div className="relative z-10 min-h-screen flex flex-col bg-[#07060B]">
          <DashboardNav
            activeTab={activeTab}
            settings={settings}
            onSelectTab={(tab) => {
              soundEngine.unlockAndStartMusic();
              soundEngine.playClick();
              setActiveTab(tab);
            }}
          />

          <main className="flex-1 pb-12">
            {activeTab === 'play' && (
              <PlayHub
                progress={progress}
                settings={settings}
                playerName={user?.displayName || resolveActiveCharacter(character).name}
                onLaunchLocation={launchLocation}
              />
            )}
            {activeTab === 'character' && (
              <CharacterStudio
                character={character}
                settings={settings}
                onSaveCharacter={handleSaveCharacter}
              />
            )}
            {activeTab === 'inventory' && <InventoryView progress={progress} />}
            {activeTab === 'missions' && <MissionsView progress={progress} />}
            {activeTab === 'friends' && (
              <FriendsView
                user={user}
                friends={friends}
                onAddFriend={handleAddFriend}
                onJoinFriendRoom={(roomId) => launchLocation('abandoned_mansion', 'multiplayer', roomId)}
                onGoToLogin={() => setActiveTab('profile')}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} />
            )}
            {activeTab === 'profile' && (
              <ProfileAuthView
                user={user}
                progress={progress}
                onAuthSuccess={handleAuthSuccess}
                onLogout={handleLogout}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
