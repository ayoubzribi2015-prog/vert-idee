import React from 'react';

interface VertIdeeLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'image' | 'vector';
  showBadge?: boolean;
}

/**
 * Vert_Idée Official Logo Component
 * Combines industrial manufacturing (factory sawtooth & chimney)
 * with ecological transition (organic green leaf embracing the plant).
 */
export const VertIdeeLogo: React.FC<VertIdeeLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'image',
  showBadge = true,
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10 sm:w-11 sm:h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const iconSizeClass = sizeMap[size] || sizeMap.md;

  // The Vector SVG implementation: Mathematically pristine, perfectly scalable & sharp on any display
  const VectorMark = (
    <svg
      viewBox="0 0 100 85"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(6,52,40,0.15)]"
      aria-label="Logo Vert_Idée : Usine et Feuille Éco-Industrielle"
    >
      <defs>
        {/* Factory Industrial Gradient (Forest green to deep pine) */}
        <linearGradient id="factoryGradient" x1="10" y1="75" x2="60" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#04211a" />
          <stop offset="60%" stopColor="#063428" />
          <stop offset="100%" stopColor="#0b4a3a" />
        </linearGradient>

        {/* Eco-Leaf Organic Gradient (Deep emerald to bright spring green) */}
        <linearGradient id="leafGradient" x1="45" y1="75" x2="85" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0b4a3a" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        {/* Inner Leaf Vein Gradient */}
        <linearGradient id="veinGradient" x1="48" y1="65" x2="78" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>

        {/* Soft Eco Aura */}
        <radialGradient id="ecoGlow" cx="68" cy="45" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Subtle background glow behind the leaf */}
      <circle cx="68" cy="45" r="28" fill="url(#ecoGlow)" />

      {/* FACTORY STRUCTURE : Clean industrial outline with sawtooth roof sheds and chimney */}
      <path
        d="M 12 70 
           L 12 44 
           L 24 33 
           L 24 43 
           L 36 32 
           L 36 42 
           L 47 31 
           L 49 14 
           L 57 14 
           L 59 34 
           L 59 44
           M 12 70 
           L 48 70"
        stroke="url(#factoryGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ECO LEAF OUTLINE : Graceful organic leaf contour growing out from the factory base */}
      <path
        d="M 46 70
           C 40 54, 48 38, 72 10
           C 85 24, 87 46, 78 60
           C 71 70, 58 72, 48 70
           Z"
        stroke="url(#leafGradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(16, 185, 129, 0.08)"
      />

      {/* INNER LEAF VEIN : Delicate dynamic branch curve */}
      <path
        d="M 48 66
           C 54 55, 62 42, 70 24"
        stroke="url(#veinGradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );

  // The PNG image alternative from the AI Studio brand asset
  const ImageMark = (
    <img
      src="/assets/vert_idee_logo_tight.png"
      alt="Vert_Idée - Usine & Feuille Écologique"
      className="w-full h-full object-contain select-none"
      draggable={false}
    />
  );

  const MarkContent = variant === 'image' ? ImageMark : VectorMark;

  if (!showBadge) {
    return <div className={`${iconSizeClass} ${className}`}>{MarkContent}</div>;
  }

  return (
    <div
      className={`relative group shrink-0 ${className}`}
      title="Vert_Idée - Plateforme d'Éco-Conception Industrielle & Empreinte Carbone"
    >
      <div
        className={`${iconSizeClass} rounded-xl bg-white border border-stone-200/90 shadow-2xs hover:border-[#0b4a3a]/60 hover:shadow-sm flex items-center justify-center p-1.5 transition-all group-hover:scale-105 overflow-hidden`}
      >
        {MarkContent}
      </div>
      {/* Active eco status indicator dot (echoing platform vitality) */}
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-2xs">
        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full animate-pulse" />
      </div>
    </div>
  );
};
