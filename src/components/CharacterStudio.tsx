import { useState } from 'react';
import { Check, RotateCcw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import type {
  AccessoryStyle,
  CharacterAnimation,
  CharacterConfig,
  CharacterGender,
  EyeGlow,
  FacialFeature,
  HairStyle,
  OutfitStyle,
  SettingsConfig,
  ShoeStyle,
} from '../game/types';
import { HAIR_COLORS, SKIN_TONES } from '../game/worldData';
import {
  DEFAULT_FEMALE_CHARACTER,
  DEFAULT_MALE_CHARACTER,
  TRANSLATIONS,
  resolveActiveCharacter,
} from '../game/rules';
import { CharacterPreviewCanvas } from '../three/CharacterPreviewCanvas';
import { soundEngine } from '../audio/soundEngine';

interface CharacterStudioProps {
  character: CharacterConfig;
  settings: SettingsConfig;
  onSaveCharacter: (next: CharacterConfig) => Promise<void> | void;
}

const HAIR_STYLES: Array<{ id: HairStyle; label: string }> = [
  { id: 'cropped', label: 'Cropped' },
  { id: 'swept', label: 'Swept Crest' },
  { id: 'long', label: 'Long Flowing' },
  { id: 'bob', label: 'Classic Bob' },
  { id: 'mohawk', label: 'Ridge Cut' },
];

const OUTFITS: Array<{ id: OutfitStyle; label: string }> = [
  { id: 'noir_trench', label: 'Noir Trench' },
  { id: 'academy_blazer', label: 'Academy Blazer' },
  { id: 'forest_cloak', label: 'Hollowveil Cloak' },
  { id: 'lab_coat', label: 'Aether Lab Coat' },
  { id: 'obsidian_suit', label: 'Obsidian Suit' },
];

const SHOES: Array<{ id: ShoeStyle; label: string }> = [
  { id: 'combat_boots', label: 'Combat Boots' },
  { id: 'oxford_shoes', label: 'Noir Oxfords' },
  { id: 'plated_greaves', label: 'Lilac Greaves' },
  { id: 'sleek_sneakers', label: 'Stealth Runners' },
];

const ACCESSORIES: Array<{ id: AccessoryStyle; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'lilac_scarf', label: 'Lilac Scarf' },
  { id: 'phantom_mask', label: 'Phantom Mask' },
  { id: 'silver_monocle', label: 'Silver Monocle' },
  { id: 'detective_fedora', label: 'Noir Fedora' },
];

const FACIAL_FEATURES: Array<{ id: FacialFeature; label: string }> = [
  { id: 'stoic', label: 'Stoic' },
  { id: 'sharp', label: 'Sharp' },
  { id: 'mystic', label: 'Mystic' },
  { id: 'determined', label: 'Determined' },
];

const EYE_GLOWS: Array<{ id: EyeGlow; label: string; hex: string }> = [
  { id: 'lilac', label: 'Royal Lilac', hex: '#C4A1FF' },
  { id: 'silver', label: 'Silver Mist', hex: '#E2E8F0' },
  { id: 'amber', label: 'Amber Gold', hex: '#F6AD55' },
  { id: 'ice', label: 'Frost Ice', hex: '#7DD3FC' },
];

const ANIMATIONS: Array<{ id: CharacterAnimation; label: string }> = [
  { id: 'idle', label: 'Calm Idle' },
  { id: 'ready', label: 'Combat Ready' },
  { id: 'inspect', label: 'Clue Inspect' },
  { id: 'salute', label: 'Archive Salute' },
];

export function CharacterStudio({ character, settings, onSaveCharacter }: CharacterStudioProps) {
  const [draft, setDraft] = useState<CharacterConfig>(character);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;

  const previewChar = resolveActiveCharacter(draft);

  const handleToggleCustomize = () => {
    const nextEnabled = !draft.customizeEnabled;
    soundEngine.playToggle(nextEnabled);
    setDraft((prev) => ({
      ...prev,
      customizeEnabled: nextEnabled,
    }));
  };

  const handleGenderChange = (gender: CharacterGender) => {
    soundEngine.playClick();
    if (!draft.customizeEnabled) {
      const base = gender === 'male' ? DEFAULT_MALE_CHARACTER : DEFAULT_FEMALE_CHARACTER;
      setDraft({ ...base, customizeEnabled: false });
    } else {
      setDraft((prev) => ({ ...prev, gender }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    soundEngine.playClueFound();
    try {
      await onSaveCharacter(draft);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2600);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    soundEngine.playClick();
    const base = draft.gender === 'male' ? DEFAULT_MALE_CHARACTER : DEFAULT_FEMALE_CHARACTER;
    setDraft({ ...base, customizeEnabled: draft.customizeEnabled });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#C4A1FF]/15">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3EFFA] tracking-wide">
            Investigator Studio
          </h2>
          <p className="mt-1 text-sm text-[#B7AACF]">
            Toggle customization on to tailor your 3D character or use the default Syndicate operatives.
          </p>
        </div>

        {/* CUSTOMIZE CHARACTER Master Toggle */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={draft.customizeEnabled}
            onClick={handleToggleCustomize}
            className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
              draft.customizeEnabled
                ? 'bg-[#C4A1FF]/15 border-[#C4A1FF] text-[#F3EFFA] shadow-[0_0_20px_rgba(196,161,255,0.2)]'
                : 'bg-[#120F1D] border-[#C4A1FF]/25 text-[#B7AACF]'
            }`}
          >
            <span>Customize Character</span>
            <span
              className={`inline-flex items-center w-11 h-6 rounded-full p-0.5 transition-colors ${
                draft.customizeEnabled ? 'bg-[#C4A1FF]' : 'bg-[#2B2440]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-[#07060B] transition-transform ${
                  draft.customizeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
            <span className="font-mono-tabular text-xs font-semibold">
              {draft.customizeEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: 3D Live Turntable Viewport */}
        <div className="lg:col-span-5 flex flex-col bg-[#0D0A16] border border-[#C4A1FF]/20 rounded-xl overflow-hidden min-h-[420px] lg:min-h-[600px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#C4A1FF]/12 bg-[#110E1C]">
            <div>
              <span className="text-xs text-[#C4A1FF]">3D Live Preview</span>
              <h3 className="text-base font-semibold text-[#F3EFFA]">{previewChar.name}</h3>
            </div>
            <span className="text-xs text-[#A89BBF]">Drag to rotate · Scroll to zoom</span>
          </div>

          <div className="relative flex-1 min-h-[340px]">
            <CharacterPreviewCanvas character={previewChar} />
            {!draft.customizeEnabled && (
              <div className="absolute bottom-3 left-3 right-3 px-3.5 py-2.5 rounded-lg bg-[#07060B]/90 border border-[#C4A1FF]/25 text-xs text-[#D8CEE8] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C4A1FF] shrink-0" />
                <span>
                  Default Character Active ({previewChar.name}). Switch <strong>Customize Character</strong> ON to unlock full appearance controls.
                </span>
              </div>
            )}
          </div>

          {/* Pose / Animation Switcher right below 3D viewport */}
          <div className="p-3 bg-[#110E1C] border-t border-[#C4A1FF]/12">
            <div className="text-xs text-[#B7AACF] mb-2">Animation & Expression</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {ANIMATIONS.map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  disabled={!draft.customizeEnabled}
                  onClick={() => {
                    soundEngine.playClick();
                    setDraft((p) => ({ ...p, animation: anim.id }));
                  }}
                  className={`px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    draft.animation === anim.id
                      ? 'bg-[#C4A1FF] text-[#07060B] font-semibold'
                      : 'bg-[#1A1629] text-[#D8CEE8] hover:bg-[#251F3A]'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Customization Controls */}
        <div className="lg:col-span-7 bg-[#0D0A16] border border-[#C4A1FF]/20 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            {/* Gender & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#C4A1FF] mb-2">
                  Character Frame
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['female', 'male'] as CharacterGender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleGenderChange(g)}
                      className={`py-2.5 px-3 text-sm font-medium rounded-lg border capitalize transition-colors cursor-pointer ${
                        draft.gender === g
                          ? 'bg-[#C4A1FF]/20 border-[#C4A1FF] text-[#F3EFFA]'
                          : 'bg-[#141022] border-[#C4A1FF]/15 text-[#A89BBF] hover:text-[#F3EFFA]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="char-name-input" className="block text-xs font-medium text-[#C4A1FF] mb-2">
                  Character Name
                </label>
                <input
                  id="char-name-input"
                  type="text"
                  maxLength={24}
                  disabled={!draft.customizeEnabled}
                  value={draft.customizeEnabled ? draft.name : previewChar.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter investigator name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#141022] border border-[#C4A1FF]/25 text-[#F3EFFA] focus:outline-none focus:border-[#C4A1FF] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Skin Tone & Hair Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-[#C4A1FF] mb-2">Skin Tone</span>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      disabled={!draft.customizeEnabled}
                      aria-label={`Skin tone ${tone.label}`}
                      onClick={() => {
                        soundEngine.playClick();
                        setDraft((p) => ({ ...p, skinTone: tone.hex }));
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer disabled:opacity-40 ${
                        draft.skinTone === tone.hex
                          ? 'border-[#C4A1FF] scale-110 shadow-[0_0_12px_rgba(196,161,255,0.6)]'
                          : 'border-white/15 hover:scale-105'
                      }`}
                      style={{ backgroundColor: tone.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#C4A1FF] mb-2">Hair Colour</span>
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLORS.map((hc) => (
                    <button
                      key={hc.id}
                      type="button"
                      disabled={!draft.customizeEnabled}
                      aria-label={`Hair colour ${hc.label}`}
                      onClick={() => {
                        soundEngine.playClick();
                        setDraft((p) => ({ ...p, hairColor: hc.hex }));
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer disabled:opacity-40 ${
                        draft.hairColor === hc.hex
                          ? 'border-[#C4A1FF] scale-110 shadow-[0_0_12px_rgba(196,161,255,0.6)]'
                          : 'border-white/15 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hc.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Hairstyle */}
            <div>
              <span className="block text-xs font-medium text-[#C4A1FF] mb-2">Hairstyle</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {HAIR_STYLES.map((hs) => (
                  <button
                    key={hs.id}
                    type="button"
                    disabled={!draft.customizeEnabled}
                    onClick={() => {
                      soundEngine.playClick();
                      setDraft((p) => ({ ...p, hairStyle: hs.id }));
                    }}
                    className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-45 ${
                      draft.hairStyle === hs.id
                        ? 'bg-[#C4A1FF]/20 border-[#C4A1FF] text-[#F3EFFA]'
                        : 'bg-[#141022] border-[#C4A1FF]/15 text-[#B7AACF] hover:text-[#F3EFFA]'
                    }`}
                  >
                    {hs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Outfit */}
            <div>
              <span className="block text-xs font-medium text-[#C4A1FF] mb-2">Outfit Attire</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {OUTFITS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={!draft.customizeEnabled}
                    onClick={() => {
                      soundEngine.playClick();
                      setDraft((p) => ({ ...p, outfit: o.id }));
                    }}
                    className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-45 ${
                      draft.outfit === o.id
                        ? 'bg-[#C4A1FF]/20 border-[#C4A1FF] text-[#F3EFFA]'
                        : 'bg-[#141022] border-[#C4A1FF]/15 text-[#B7AACF] hover:text-[#F3EFFA]'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shoes & Accessories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-[#C4A1FF] mb-2">Footwear</span>
                <div className="grid grid-cols-2 gap-2">
                  {SHOES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!draft.customizeEnabled}
                      onClick={() => {
                        soundEngine.playClick();
                        setDraft((p) => ({ ...p, shoes: s.id }));
                      }}
                      className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-45 ${
                        draft.shoes === s.id
                          ? 'bg-[#C4A1FF]/20 border-[#C4A1FF] text-[#F3EFFA]'
                          : 'bg-[#141022] border-[#C4A1FF]/15 text-[#B7AACF] hover:text-[#F3EFFA]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#C4A1FF] mb-2">Accessories</span>
                <div className="grid grid-cols-2 gap-2">
                  {ACCESSORIES.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={!draft.customizeEnabled}
                      onClick={() => {
                        soundEngine.playClick();
                        setDraft((p) => ({ ...p, accessory: acc.id }));
                      }}
                      className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-45 ${
                        draft.accessory === acc.id
                          ? 'bg-[#C4A1FF]/20 border-[#C4A1FF] text-[#F3EFFA]'
                          : 'bg-[#141022] border-[#C4A1FF]/15 text-[#B7AACF] hover:text-[#F3EFFA]'
                      }`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Facial Features & Eye Glow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-[#C4A1FF] mb-2">Facial Expression</span>
                <div className="grid grid-cols-2 gap-2">
                  {FACIAL_FEATURES.map((ff) => (
                    <button
                      key={ff.id}
                      type="button"
                      disabled={!draft.customizeEnabled}
                      onClick={() => {
                        soundEngine.playClick();
                        setDraft((p) => ({ ...p, facialFeature: ff.id }));
                      }}
                      className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-45 ${
                        draft.facialFeature === ff.id
                          ? 'bg-[#C4A1FF]/20 border-[#C4A1FF] text-[#F3EFFA]'
                          : 'bg-[#141022] border-[#C4A1FF]/15 text-[#B7AACF] hover:text-[#F3EFFA]'
                      }`}
                    >
                      {ff.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#C4A1FF] mb-2">Gaze Luminescence</span>
                <div className="grid grid-cols-2 gap-2">
                  {EYE_GLOWS.map((eg) => (
                    <button
                      key={eg.id}
                      type="button"
                      disabled={!draft.customizeEnabled}
                      onClick={() => {
                        soundEngine.playClick();
                        setDraft((p) => ({ ...p, eyeGlow: eg.id }));
                      }}
                      className={`py-2 px-2.5 text-xs font-medium rounded-lg border flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-45 ${
                        draft.eyeGlow === eg.id
                          ? 'bg-[#C4A1FF]/20 border-[#C4A1FF] text-[#F3EFFA]'
                          : 'bg-[#141022] border-[#C4A1FF]/15 text-[#B7AACF] hover:text-[#F3EFFA]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: eg.hex }}
                      />
                      <span className="truncate">{eg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save & Reset Bar */}
          <div className="pt-4 border-t border-[#C4A1FF]/15 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#D8CEE8] bg-[#141022] border border-[#C4A1FF]/20 hover:border-[#C4A1FF]/50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C4A1FF]" />
              <span>Reset Default</span>
            </button>

            <div className="flex items-center gap-3">
              {savedNotice && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C4A1FF]">
                  <Check className="w-4 h-4" />
                  Saved permanently
                </span>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-[#07060B] bg-[#C4A1FF] hover:bg-[#D6BCFA] rounded-lg shadow-[0_0_20px_rgba(196,161,255,0.35)] transition-all cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{t.saveCharacter}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
