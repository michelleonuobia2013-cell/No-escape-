import { LogoEmblem } from './LogoEmblem';

interface LoadingOverlayProps {
  visible: boolean;
  label?: string;
}

export function LoadingOverlay({ visible, label = 'Entering the Archive...' }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07060B]/95 transition-opacity duration-300"
    >
      <LogoEmblem size="lg" />
      <div className="mt-8 w-56 h-1 bg-[#1D182D] overflow-hidden rounded-full">
        <div
          className="h-full bg-[#C4A1FF] transition-all duration-700"
          style={{ width: '78%', boxShadow: '0 0 16px #C4A1FF' }}
        />
      </div>
      <p className="mt-4 text-sm tracking-wide text-[#C4A1FF]">{label}</p>
    </div>
  );
}
