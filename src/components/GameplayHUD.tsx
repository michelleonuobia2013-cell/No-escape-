import { useRef, useState } from 'react';
import {
  Flashlight,
  MessageCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Send,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  ChatMessage,
  GameMode,
  LocationDef,
  MultiplayerPlayerState,
  ProximityPeerInfo,
  SettingsConfig,
} from '../game/types';
import type { VirtualJoystickInput } from '../three/WorldExploreCanvas';

interface GameplayHUDProps {
  location: LocationDef;
  mode: GameMode;
  roomId: string | null;
  puzzleSolved: boolean;
  discoveredCluesCount: number;
  elapsedSec: number;
  flashlightOn: boolean;
  settings: SettingsConfig;
  nearInteractable: { id: string; kind: string; label: string } | null;
  remotePlayers: MultiplayerPlayerState[];
  proximityPeers: ProximityPeerInfo[];
  voiceEnabled: boolean;
  voiceMuted: boolean;
  voiceError: string | null;
  chatMessages: ChatMessage[];
  paused: boolean;
  victoryState: { escaped: boolean; elapsedSec: number } | null;
  joystickRef: React.MutableRefObject<VirtualJoystickInput>;
  onToggleFlashlight: () => void;
  onToggleMute: () => void;
  onToggleVoice: () => void;
  onToggleVoiceMute: () => void;
  onInteractClick: () => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onExitToDashboard: () => void;
  onNextLocation?: () => void;
  onSendChat: (text: string) => void;
}

export function GameplayHUD({
  location,
  mode,
  roomId,
  puzzleSolved,
  discoveredCluesCount,
  elapsedSec,
  flashlightOn,
  settings,
  nearInteractable,
  remotePlayers,
  proximityPeers,
  voiceEnabled,
  voiceMuted,
  voiceError,
  chatMessages,
  paused,
  victoryState,
  joystickRef,
  onToggleFlashlight,
  onToggleMute,
  onToggleVoice,
  onToggleVoiceMute,
  onInteractClick,
  onPauseToggle,
  onRestart,
  onExitToDashboard,
  onNextLocation,
  onSendChat,
}: GameplayHUDProps) {
  const [commsOpen, setCommsOpen] = useState(false);
  const [commsTab, setCommsTab] = useState<'voice' | 'chat'>('voice');
  const [chatInput, setChatInput] = useState('');
  const joyPadRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const touchMode = settings.touchControls;

  const timeDisplay =
    mode === 'challenge'
      ? Math.max(0, Math.round(location.challengeTimeLimitSec - elapsedSec))
      : Math.round(elapsedSec);

  const handleJoyPointer = (clientX: number, clientY: number) => {
    const pad = joyPadRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 14;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobPos({ x: dx, y: dy });
    joystickRef.current.moveX = dx / maxR;
    joystickRef.current.moveY = dy / maxR;
  };

  const resetJoy = () => {
    setKnobPos({ x: 0, y: 0 });
    joystickRef.current.moveX = 0;
    joystickRef.current.moveY = 0;
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Top-Left Compact Location & Objective Cluster */}
      <div
        className={`absolute top-4 left-4 pointer-events-auto ${
          mode === 'multiplayer'
            ? 'max-w-[calc(100vw-224px)] sm:max-w-sm'
            : 'max-w-[calc(100vw-164px)] sm:max-w-sm'
        }`}
      >
        <div className="px-3 py-2 sm:px-4 sm:py-3 rounded-xl bg-[#07060B]/90 border border-[#C4A1FF]/25 shadow-lg">
          <div className="flex items-center justify-between gap-2 sm:gap-4 text-[10px] sm:text-[11px] text-[#C4A1FF] uppercase tracking-wider">
            <span className="truncate">{location.subtitle}</span>
            <span className="font-mono-tabular shrink-0">
              {mode === 'challenge' ? `TIME ${timeDisplay}s` : `${timeDisplay}s`}
            </span>
          </div>
          <div className="mt-0.5 font-display text-sm sm:text-lg font-bold text-[#F3EFFA] truncate">
            {location.name}
          </div>
          <div className="mt-1 text-[11px] sm:text-xs text-[#D8CEE8]">
            {puzzleSolved
              ? 'Vault Seal Broken — Reach the Northern Gate'
              : `Objective: Discover Clues (${discoveredCluesCount}/${location.clues.length}) & Unlock Seal`}
          </div>
          {mode === 'multiplayer' && roomId && (
            <div className="mt-1 text-[10px] sm:text-[11px] font-mono-tabular text-[#C4A1FF] truncate">
              Room {roomId} · {remotePlayers.length + 1} Investigator(s)
            </div>
          )}
        </div>
      </div>

      {/* Top-Right Compact Utility Controls */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle Flashlight"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleFlashlight();
            }}
            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              flashlightOn
                ? 'bg-[#C4A1FF] text-[#07060B] border-[#C4A1FF]'
                : 'bg-[#07060B]/88 text-[#E9D8FD] border-[#C4A1FF]/25 hover:border-[#C4A1FF]'
            }`}
          >
            <Flashlight className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-[#07060B]/88 border border-[#C4A1FF]/25 text-[#E9D8FD] hover:border-[#C4A1FF] cursor-pointer"
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {mode === 'multiplayer' && (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-label={voiceEnabled ? 'Disable Proximity Voice' : 'Enable Proximity Voice'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleVoice();
                  setCommsTab('voice');
                  setCommsOpen(true);
                }}
                className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                  voiceEnabled
                    ? voiceMuted
                      ? 'bg-[#2B1F42] text-[#F4B4C6] border-[#F4B4C6]/60'
                      : 'bg-[#C4A1FF] text-[#07060B] border-[#C4A1FF]'
                    : 'bg-[#07060B]/88 text-[#E9D8FD] border-[#C4A1FF]/25 hover:border-[#C4A1FF]'
                }`}
              >
                {voiceEnabled && !voiceMuted ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Toggle Squad Comms"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setCommsOpen((v) => !v);
                }}
                className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                  commsOpen
                    ? 'bg-[#211834] text-[#C4A1FF] border-[#C4A1FF]'
                    : 'bg-[#07060B]/88 text-[#E9D8FD] border-[#C4A1FF]/25 hover:border-[#C4A1FF]'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game"
            onClick={(e) => {
              e.currentTarget.blur();
              onPauseToggle();
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-[#07060B]/88 border border-[#C4A1FF]/25 text-[#E9D8FD] hover:border-[#C4A1FF] cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Live Proximity Strip when Comms Drawer is Collapsed */}
        {mode === 'multiplayer' && !commsOpen && (voiceEnabled || proximityPeers.length > 0 || voiceError) && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setCommsTab('voice');
              setCommsOpen(true);
            }}
            className="max-w-[176px] sm:max-w-xs inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A0814]/92 border border-[#C4A1FF]/30 text-[11px] text-[#E9D8FD] hover:border-[#C4A1FF] cursor-pointer shadow-md"
          >
            <Radio className="w-3.5 h-3.5 text-[#C4A1FF] shrink-0" />
            <span className="truncate">
              {voiceError
                ? 'Mic Needed'
                : proximityPeers.length > 0
                  ? `${proximityPeers[0].username} · ${proximityPeers[0].distance.toFixed(1)}m (${proximityPeers[0].clarityLabel})`
                  : voiceMuted
                    ? 'Mic Muted'
                    : 'Voice Live'}
            </span>
          </button>
        )}
      </div>

      {/* Center-Bottom Proximity Interaction Prompt */}
      {nearInteractable && !paused && !victoryState && (
        <div className="absolute bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            type="button"
            onClick={onInteractClick}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#0B0814]/95 border border-[#C4A1FF] text-sm font-semibold text-[#F3EFFA] shadow-[0_0_24px_rgba(196,161,255,0.4)] hover:bg-[#19132B] cursor-pointer whitespace-nowrap"
          >
            <span className="px-2 py-0.5 text-xs font-mono-tabular bg-[#C4A1FF] text-[#07060B] rounded">
              E
            </span>
            <span>{nearInteractable.label}</span>
          </button>
        </div>
      )}

      {/* Subtle Bottom Desktop Control Strip */}
      {touchMode !== 'always' && !paused && !victoryState && (
        <div
          className={`${
            touchMode === 'auto' ? 'hidden lg:block' : 'block'
          } absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-[#A89BBF] bg-[#07060B]/75 px-3.5 py-1 rounded-md border border-[#C4A1FF]/10 whitespace-nowrap`}
        >
          WASD Move · Shift Sprint · Drag Camera · E Interact · F Flashlight · Esc Pause
        </div>
      )}

      {/* Mobile / Touch Virtual Joystick & Interact Button */}
      {touchMode !== 'off' && !paused && !victoryState && (
        <div
          className={`${
            touchMode === 'auto' ? 'flex lg:hidden' : 'flex'
          } absolute inset-x-4 bottom-5 items-end justify-between pointer-events-none`}
        >
          <div
            ref={joyPadRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleJoyPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0) handleJoyPointer(e.clientX, e.clientY);
            }}
            onPointerUp={resetJoy}
            onPointerCancel={resetJoy}
            className="w-28 h-28 rounded-full bg-[#07060B]/80 border border-[#C4A1FF]/35 relative flex items-center justify-center pointer-events-auto touch-none"
          >
            <div
              className="w-11 h-11 rounded-full bg-[#C4A1FF]/85 shadow-[0_0_16px_rgba(196,161,255,0.5)]"
              style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
            />
          </div>

          <button
            type="button"
            onClick={onInteractClick}
            disabled={!nearInteractable}
            className="w-16 h-16 rounded-full bg-[#C4A1FF] text-[#07060B] font-bold text-xs shadow-lg pointer-events-auto disabled:opacity-35"
          >
            USE
          </button>
        </div>
      )}

      {/* Multiplayer Squad Comms & WebRTC Proximity Voice Drawer */}
      {mode === 'multiplayer' && commsOpen && (
        <div
          data-testid="squad-comms-drawer"
          className="absolute right-4 top-16 w-72 sm:w-80 rounded-xl bg-[#0A0814]/95 border border-[#C4A1FF]/35 p-3.5 pointer-events-auto shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#C4A1FF]/15">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCommsTab('voice')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  commsTab === 'voice'
                    ? 'bg-[#C4A1FF] text-[#07060B]'
                    : 'text-[#CFC6E3] hover:text-[#F3EFFA]'
                }`}
              >
                Proximity Voice
              </button>
              <button
                type="button"
                onClick={() => setCommsTab('chat')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  commsTab === 'chat'
                    ? 'bg-[#C4A1FF] text-[#07060B]'
                    : 'text-[#CFC6E3] hover:text-[#F3EFFA]'
                }`}
              >
                Room Chat
              </button>
            </div>
            <button
              type="button"
              aria-label="Close Squad Comms"
              onClick={() => setCommsOpen(false)}
              className="p-1 text-[#A89BBF] hover:text-[#F3EFFA] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {commsTab === 'voice' ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                    voiceEnabled
                      ? 'bg-[#211834] border border-[#C4A1FF]/45 text-[#E9D8FD] hover:border-[#C4A1FF]'
                      : 'bg-[#C4A1FF] text-[#07060B] hover:bg-[#D6BCFA]'
                  }`}
                >
                  {voiceEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{voiceEnabled ? 'Leave Voice' : 'Join Voice'}</span>
                </button>
                {voiceEnabled && (
                  <button
                    type="button"
                    onClick={onToggleVoiceMute}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                      voiceMuted
                        ? 'bg-[#361B2B] border-[#F4B4C6]/50 text-[#F4B4C6]'
                        : 'bg-[#161224] border-[#C4A1FF]/25 text-[#E9D8FD] hover:border-[#C4A1FF]'
                    }`}
                  >
                    {voiceMuted ? 'Unmute Mic' : 'Mute Mic'}
                  </button>
                )}
              </div>

              {voiceError && (
                <div className="p-2.5 rounded-lg bg-[#2B1522] border border-[#F4B4C6]/40 text-[11px] text-[#F9D5DF]">
                  {voiceError}
                </div>
              )}

              <div className="text-[11px] text-[#A89BBF]">
                WebRTC spatial audio attenuates with distance (clear within 3m, silent beyond 24m).
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                {proximityPeers.length === 0 ? (
                  <div className="p-3 rounded-lg bg-[#141022] border border-[#C4A1FF]/15 text-xs text-[#B7AACF]">
                    No teammates connected in Room {roomId}. Invite a friend or open a second session to hear spatial voice.
                  </div>
                ) : (
                  proximityPeers.map((peer) => {
                    const clarityPct = Math.round(peer.gain * 100);
                    return (
                      <div
                        key={peer.id}
                        data-testid={`proximity-peer-${peer.id}`}
                        className="p-2.5 rounded-lg bg-[#141022] border border-[#C4A1FF]/20"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#F3EFFA] truncate">
                            {peer.username}
                          </span>
                          <span className="font-mono-tabular text-[#C4A1FF] shrink-0">
                            {peer.distance.toFixed(1)}m · {peer.clarityLabel}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#090710] overflow-hidden">
                          <div
                            className="h-full bg-[#C4A1FF] transition-all duration-150"
                            style={{ width: `${clarityPct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-[#A89BBF]">
                          <span>
                            {peer.speaking
                              ? 'Speaking'
                              : peer.voiceActive
                                ? 'Mic Live'
                                : 'Listening'}
                          </span>
                          <span className="font-mono-tabular">
                            {peer.connected
                              ? `Audio ${clarityPct}%`
                              : peer.voiceActive || voiceEnabled
                                ? 'Connecting WebRTC...'
                                : 'Standby · Mic Off'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="h-36 overflow-y-auto space-y-1.5 text-xs pr-1">
                {chatMessages.map((m) => (
                  <div key={m.id} className="text-[#E2DAEE]">
                    <span className="font-semibold text-[#C4A1FF]">{m.sender}: </span>
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  onSendChat(chatInput);
                  setChatInput('');
                }}
                className="mt-2 flex gap-1.5"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message teammates..."
                  className="flex-1 px-2.5 py-1.5 text-xs rounded bg-[#141022] border border-[#C4A1FF]/20 text-[#F3EFFA] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Send chat"
                  className="px-2.5 py-1.5 rounded bg-[#C4A1FF] text-[#07060B] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Pause Modal */}
      {paused && !victoryState && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#07060B]/85 pointer-events-auto"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#0E0B18] border border-[#C4A1FF]/35 p-6 text-center shadow-2xl">
            <h3 className="font-display text-2xl font-bold text-[#F3EFFA]">Investigation Paused</h3>
            <p className="mt-1 text-xs text-[#B7AACF]">{location.name}</p>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={onPauseToggle}
                className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#F3EFFA] bg-[#161224] border border-[#C4A1FF]/25 hover:border-[#C4A1FF] rounded-lg cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[#C4A1FF]" />
                <span>Restart Realm</span>
              </button>
              <button
                type="button"
                onClick={onExitToDashboard}
                className="w-full py-2.5 text-sm font-medium text-[#B7AACF] hover:text-[#F3EFFA] rounded-lg cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Escape Complete Modal */}
      {victoryState && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#07060B]/88 pointer-events-auto"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0E0B18] border border-[#C4A1FF]/45 p-7 text-center shadow-[0_0_60px_rgba(196,161,255,0.22)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C4A1FF]">
              {victoryState.escaped ? 'Realm Cleared' : 'Time Expired'}
            </div>
            <h3 className="mt-2 font-display text-3xl font-bold text-[#F3EFFA]">
              {victoryState.escaped ? 'Escape Confirmed' : 'Locked Inside'}
            </h3>
            <p className="mt-2 text-sm text-[#CFC6E3]">
              {victoryState.escaped
                ? `You unlocked the exit seal of ${location.name} and claimed the ${location.subtitle} badge.`
                : `The quarantine locks reset before you could breach ${location.name}.`}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-xl bg-[#161224] border border-[#C4A1FF]/20">
                <div className="text-[11px] text-[#A89BBF]">Clear Time</div>
                <div className="font-mono-tabular text-xl font-bold text-[#F3EFFA]">
                  {Math.round(victoryState.elapsedSec)}s
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#161224] border border-[#C4A1FF]/20">
                <div className="text-[11px] text-[#A89BBF]">Clues Found</div>
                <div className="font-mono-tabular text-xl font-bold text-[#C4A1FF]">
                  {discoveredCluesCount}/{location.clues.length}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              {victoryState.escaped && onNextLocation ? (
                <button
                  type="button"
                  data-start="true"
                  onClick={onNextLocation}
                  className="flex-1 py-3 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
                >
                  Next Realm
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={onRestart}
                  className="flex-1 py-3 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
                >
                  Try Again
                </button>
              )}
              <button
                type="button"
                onClick={onExitToDashboard}
                className="flex-1 py-3 text-sm font-medium text-[#F3EFFA] bg-[#161224] border border-[#C4A1FF]/25 hover:border-[#C4A1FF] rounded-lg cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
