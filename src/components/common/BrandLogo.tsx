import React from 'react';
import { usePlatform } from '../../store/usePlatformStore';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  size = 'md', 
  showSubtitle = true,
  className = '' 
}) => {
  const { themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  // Dimension scaling
  const dimensions = {
    sm: { icon: 26, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 34, text: 'text-xl', sub: 'text-[10px]' },
    lg: { icon: 44, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 56, text: 'text-4xl', sub: 'text-sm' }
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric Data-Prism SVG Mark */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg 
          width={dimensions.icon} 
          height={dimensions.icon} 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 hover:scale-105"
        >
          <defs>
            <linearGradient id="prismGradA" x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="prismGradTop" x1="24" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="prismGradLeft" x1="6" y1="14" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="prismGradRight" x1="42" y1="14" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.7" />
            </linearGradient>
            <radialGradient id="prismCore" cx="24" cy="24" r="8" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>
            <filter id="prismGlow" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Hexagonal Outer Frame with Hairline Stroke */}
          <path 
            d="M 24 3 L 42 13.5 L 42 34.5 L 24 45 L 6 34.5 L 6 13.5 Z" 
            stroke="url(#prismGradA)" 
            strokeWidth="2.2" 
            strokeLinejoin="round"
            fill={isLight ? '#FFFFFF' : '#0B0F17'}
          />

          {/* Top Facet */}
          <path 
            d="M 24 5.5 L 40 14.8 L 24 24 L 8 14.8 Z" 
            fill="url(#prismGradTop)" 
            opacity="0.85"
          />

          {/* Left Facet */}
          <path 
            d="M 8 14.8 L 24 24 L 24 42.5 L 8 33.2 Z" 
            fill="url(#prismGradLeft)" 
            opacity="0.9"
          />

          {/* Right Facet */}
          <path 
            d="M 24 24 L 40 14.8 L 40 33.2 L 24 42.5 Z" 
            fill="url(#prismGradRight)" 
            opacity="0.85"
          />

          {/* Inner Structural Geometric Vectors */}
          <path 
            d="M 24 5.5 L 24 24 M 8 14.8 L 24 24 M 40 14.8 L 24 24 M 24 24 L 24 42.5" 
            stroke="#FFFFFF" 
            strokeWidth="1.2" 
            strokeOpacity="0.6"
            strokeLinecap="round" 
          />

          {/* Central Neural Intelligence Node */}
          <circle cx="24" cy="24" r="3.2" fill="#FFFFFF" />
          <circle cx="24" cy="24" r="6" fill="url(#prismCore)" />
        </svg>
      </div>

      {/* Typography Lockup */}
      <div className="flex flex-col leading-none">
        <div className={`font-heading font-black tracking-tight ${dimensions.text} flex items-center`}>
          <span className={isLight ? 'text-slate-900' : 'text-white'}>
            ACUITY
          </span>
          <span className="text-emerald-500 ml-0.5">
            BI
          </span>
        </div>
        {showSubtitle && (
          <span className={`font-mono uppercase tracking-widest font-semibold ${dimensions.sub} mt-1 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Enterprise Intelligence
          </span>
        )}
      </div>
    </div>
  );
};
