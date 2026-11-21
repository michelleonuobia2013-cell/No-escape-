interface LogoEmblemProps {
  size?: 'sm' | 'lg';
}

export function LogoEmblem({ size = 'lg' }: LogoEmblemProps) {
  const isLg = size === 'lg';
  return (
    <div className="flex flex-col items-center select-none">
      <div className={`relative flex items-center justify-center ${isLg ? 'w-20 h-20 mb-4' : 'w-9 h-9'}`}>
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full ${isLg ? 'animate-sigil-spin' : ''}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="lilacStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E9D8FD" />
              <stop offset="50%" stopColor="#C4A1FF" />
              <stop offset="100%" stopColor="#6B46C1" />
            </linearGradient>
          </defs>
          <polygon
            points="50,6 90,28 90,72 50,94 10,72 10,28"
            fill="none"
            stroke="url(#lilacStroke)"
            strokeWidth="2.4"
          />
          <polygon
            points="50,18 78,50 50,82 22,50"
            fill="none"
            stroke="#C4A1FF"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
        </svg>
        <svg
          viewBox="0 0 40 40"
          className={`absolute ${isLg ? 'w-9 h-9 animate-lilac-breath' : 'w-4 h-4'}`}
          aria-hidden="true"
        >
          <circle cx="20" cy="15" r="5.5" fill="#E9D8FD" />
          <path d="M16.5 19 L23.5 19 L25 32 L15 32 Z" fill="#C4A1FF" />
        </svg>
      </div>

      {isLg && (
        <div className="text-center">
          <h1
            className="font-display text-4xl sm:text-6xl font-bold tracking-[0.22em] text-[#F3EFFA] animate-lilac-breath"
            style={{ textShadow: '0 0 32px rgba(196, 161, 255, 0.35)' }}
          >
            NO ESCAPE
          </h1>
          <p className="mt-2 text-xs sm:text-sm tracking-[0.28em] uppercase text-[#C4A1FF]/85">
            The Mystery Never Ends
          </p>
        </div>
      )}
    </div>
  );
}
