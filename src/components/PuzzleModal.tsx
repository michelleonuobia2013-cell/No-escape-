import { useState } from 'react';
import { Check, KeyRound, MessageSquare, Sparkles, X } from 'lucide-react';
import type { ClueDef, LocationDef } from '../game/types';
import { verifyPuzzleSolution } from '../game/rules';
import { soundEngine } from '../audio/soundEngine';

interface PuzzleModalProps {
  location: LocationDef;
  alreadySolved: boolean;
  onSolve: (attempt: number[]) => void;
  onClose: () => void;
}

export function PuzzleModal({ location, alreadySolved, onSolve, onClose }: PuzzleModalProps) {
  const solLen = Array.isArray(location.puzzle.solution) ? location.puzzle.solution.length : 3;
  const [values, setValues] = useState<number[]>(() => Array(solLen).fill(1));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const labelsByType: Record<string, string[]> = {
    clockwork_cipher: ['Hour Dial', 'Minute Dial', 'Chime Dial'],
    locker_sequence: ['Locker I', 'Locker II', 'Locker III', 'Locker IV'],
    sigil_alignment: ['Outer Ring', 'Inner Ring', 'Core Crest'],
    valve_pressure: ['Valve A (bar)', 'Valve B (bar)', 'Valve C (bar)'],
    frequency_tuner: ['Carrier Wave', 'Harmonic Phase', 'Amplitude'],
    reagent_synthesis: ['Obsidian Sol', 'Lilac Ether', 'Silver Catalyst'],
    skyline_beacons: ['North Beacon', 'East Beacon', 'Zenith Beacon'],
  };

  const labels = labelsByType[location.puzzle.type] || ['Dial 1', 'Dial 2', 'Dial 3'];

  const stepValue = (idx: number, delta: number) => {
    soundEngine.playPuzzleStep();
    setErrorMsg(null);
    setValues((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        const next = v + delta;
        if (next > 9) return 1;
        if (next < 1) return 9;
        return next;
      }),
    );
  };

  const handleSubmit = () => {
    if (verifyPuzzleSolution(location.id, values)) {
      soundEngine.playPuzzleSolved();
      onSolve(values);
    } else {
      soundEngine.playPuzzleError();
      setErrorMsg('Sequence mismatch. Inspect the clues scattered across the realm for the exact numbers.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="puzzle-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#07060B]/82"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#0E0B18] border border-[#C4A1FF]/35 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#C4A1FF]">{location.name} · Vault Cipher</div>
            <h3 id="puzzle-modal-title" className="mt-1 font-display text-2xl font-bold text-[#F3EFFA]">
              {location.puzzle.title}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close puzzle"
            onClick={onClose}
            className="p-2 rounded-lg text-[#B7AACF] hover:text-[#F3EFFA] hover:bg-[#1B162C] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-[#CFC6E3] leading-relaxed">{location.puzzle.prompt}</p>

        {alreadySolved ? (
          <div className="mt-6 p-4 rounded-xl bg-[#1A1330] border border-[#C4A1FF]/40 flex items-center gap-3 text-sm text-[#E9D8FD]">
            <Check className="w-5 h-5 text-[#C4A1FF] shrink-0" />
            <span>This seal is already broken. Proceed to the Vault Gate at the northern end to escape!</span>
          </div>
        ) : (
          <>
            <div
              className={`mt-6 grid gap-3 ${
                solLen === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
              }`}
            >
              {values.map((val, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center p-3 rounded-xl bg-[#151124] border border-[#C4A1FF]/20"
                >
                  <span className="text-[11px] text-[#B7AACF] text-center mb-2">
                    {labels[idx] || `Dial ${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${labels[idx]}`}
                    onClick={() => stepValue(idx, 1)}
                    className="w-full py-1 text-xs font-semibold text-[#C4A1FF] hover:bg-[#221B3A] rounded cursor-pointer"
                  >
                    ▲
                  </button>
                  <div className="my-2 font-mono-tabular text-3xl font-bold text-[#F3EFFA]">
                    {val}
                  </div>
                  <button
                    type="button"
                    aria-label={`Decrease ${labels[idx]}`}
                    onClick={() => stepValue(idx, -1)}
                    className="w-full py-1 text-xs font-semibold text-[#C4A1FF] hover:bg-[#221B3A] rounded cursor-pointer"
                  >
                    ▼
                  </button>
                </div>
              ))}
            </div>

            {errorMsg && (
              <p className="mt-4 text-xs text-rose-300 bg-rose-950/50 border border-rose-400/30 rounded-lg px-3.5 py-2">
                {errorMsg}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-[#D8CEE8] hover:text-[#F3EFFA] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg shadow-[0_0_20px_rgba(196,161,255,0.4)] cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Unlock Seal</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ClueDialogProps {
  clue: ClueDef;
  onClose: () => void;
}

export function ClueModal({ clue, onClose }: ClueDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clue-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#07060B]/80"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0E0B18] border border-[#C4A1FF]/35 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C4A1FF]">
            <Sparkles className="w-4 h-4" />
            <span>{clue.isSecret ? 'Hidden Secret Discovered' : 'Clue Added to Inventory'}</span>
          </div>
          <button
            type="button"
            aria-label="Close clue"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#B7AACF] hover:text-[#F3EFFA] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 id="clue-modal-title" className="mt-2 font-display text-2xl font-bold text-[#F3EFFA]">
          {clue.title}
        </h3>
        <p className="text-xs text-[#A89BBF]">{clue.subtitle}</p>
        <p className="mt-4 text-sm text-[#E2DAEE] leading-relaxed">{clue.description}</p>

        <div className="mt-4 p-3.5 rounded-xl bg-[#181229] border border-[#C4A1FF]/30">
          <div className="text-[11px] uppercase tracking-wider text-[#C4A1FF]">Decoded Clue</div>
          <div className="mt-1 font-mono-tabular text-sm font-semibold text-[#F3EFFA]">
            {clue.hintValue}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
          >
            Continue Investigation
          </button>
        </div>
      </div>
    </div>
  );
}

interface NpcDialogProps {
  name: string;
  role: string;
  lines: string[];
  onClose: () => void;
}

export function NpcDialogueModal({ name, role, lines, onClose }: NpcDialogProps) {
  const [lineIdx, setLineIdx] = useState(0);
  const hasNext = lineIdx < lines.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0D0A17]/95 border border-[#C4A1FF]/40 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#C4A1FF]" />
            <span className="font-display text-base font-bold text-[#F3EFFA]">{name}</span>
            <span className="text-xs text-[#B7AACF]">· {role}</span>
          </div>
          <button
            type="button"
            aria-label="Close dialogue"
            onClick={onClose}
            className="p-1 text-[#A89BBF] hover:text-[#F3EFFA] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-[#E9E2F5] leading-relaxed">{lines[lineIdx]}</p>

        <div className="mt-4 flex justify-end gap-2">
          {hasNext ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setLineIdx((i) => i + 1);
              }}
              className="px-4 py-2 text-xs font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
