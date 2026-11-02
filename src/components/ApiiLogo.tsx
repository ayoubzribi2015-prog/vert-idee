import React from 'react';

interface ApiiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

/**
 * Composant SVG Vectoriel HD du Logo Officiel de l'APII
 * Agence de Promotion de l'Industrie et de l'Innovation (Tunisie)
 */
export const ApiiLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 360 250"
    className={className}
    aria-label="Logo Officiel APII"
  >
    {/* Oval Ring */}
    <ellipse
      cx="180"
      cy="100"
      rx="160"
      ry="80"
      fill="none"
      stroke="#0050c8"
      strokeWidth="11"
    />

    {/* Left Loop ('a' / 'p') */}
    <path
      fill="#0050c8"
      d="M 110 100 C 110 72, 132 50, 160 50 C 166 50, 172 52, 176 56 L 176 73 C 172 69, 166 66, 160 66 C 141 66, 126 81, 126 100 C 126 119, 141 134, 160 134 C 166 134, 172 131, 176 127 L 176 144 C 172 148, 166 150, 160 150 C 132 150, 110 128, 110 100 Z"
    />
    <ellipse cx="160" cy="100" rx="20" ry="20" fill="#0050c8" />

    {/* Right Loop ('p' / 'i') */}
    <path
      fill="#0050c8"
      d="M 250 100 C 250 72, 228 50, 200 50 C 194 50, 188 52, 184 56 L 184 73 C 188 69, 194 66, 200 66 C 219 66, 234 81, 234 100 C 234 119, 219 134, 200 134 C 194 134, 188 131, 184 127 L 184 144 C 188 148, 194 150, 200 150 C 228 150, 250 128, 250 100 Z"
    />
    <ellipse cx="200" cy="100" rx="20" ry="20" fill="#0050c8" />

    {/* Central 'i' Dot */}
    <ellipse cx="180" cy="38" rx="19" ry="13" fill="#0050c8" />

    {/* Central 'i' Stem & Flared Pedestal */}
    <path
      fill="#0050c8"
      d="M 168 56 L 192 56 L 192 122 L 206 138 L 154 138 L 168 122 Z"
    />

    {/* Text Line 1: Agence de Promotion */}
    <text
      x="180"
      y="204"
      fill="#0050c8"
      fontSize="20"
      fontWeight="800"
      fontFamily="system-ui, -apple-system, sans-serif"
      textAnchor="middle"
      letterSpacing="0.2"
    >
      Agence de Promotion
    </text>

    {/* Text Line 2: de l'Industrie et de l'Innovation */}
    <text
      x="180"
      y="232"
      fill="#0050c8"
      fontSize="17"
      fontWeight="700"
      fontFamily="system-ui, -apple-system, sans-serif"
      textAnchor="middle"
      letterSpacing="-0.2"
    >
      de l’Industrie et de l’Innovation
    </text>
  </svg>
);

export const ApiiLogoBadge: React.FC<ApiiLogoProps> = ({ className = '', size = 'md' }) => {
  const containerSizes = {
    sm: 'h-9 px-2.5 gap-2',
    md: 'h-11 px-3.5 gap-3',
    lg: 'h-14 px-4 gap-3.5',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <a
      href="https://www.tunisieindustrie.nat.tn/fr/home.asp"
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center rounded-xl bg-white border border-stone-200/90 shadow-2xs hover:border-[#0050c8]/60 hover:shadow-xs transition-all cursor-pointer no-underline ${containerSizes[size]} ${className}`}
      title="Accéder au portail officiel APII - Agence de Promotion de l'Industrie et de l'Innovation (Tunisie)"
    >
      <div className={`${iconSizes[size]} shrink-0 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform`}>
        <ApiiLogoSvg />
      </div>
      <div className="leading-tight text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black tracking-tight text-[#0050c8] font-heading group-hover:text-[#003896] transition-colors">
            APII
          </span>
          <span className="inline-block w-1 h-1 rounded-full bg-emerald-500" title="Partenaire Officiel Vert_Idée" />
        </div>
        <p className="text-[11px] font-semibold text-stone-700 whitespace-nowrap">
          Industrie & Innovation
        </p>
      </div>
    </a>
  );
};
