// src/components/InVexisLogo.tsx
import React from 'react';

interface InVexisLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'stacked';
  className?: string;
}

const InVexisLogo = ({
  variant = 'light',
  size = 'md',
  layout = 'horizontal',
  className = ''
}: InVexisLogoProps) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
  };

  const textColor = variant === 'light' ? '#FFFFFF' : '#1E293B';
  const accentColor = variant === 'light' ? '#10B981' : '#0EA5E9';
  const secondaryColor = variant === 'light' ? '#3B82F6' : '#1E40AF';

  if (layout === 'stacked') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <svg
          className={sizeClasses[size]}
          viewBox="0 0 60 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Candlestick chart pattern */}
          <rect x="8" y="20" width="3" height="12" fill={accentColor} />
          <rect x="8.5" y="16" width="2" height="20" fill={accentColor} />

          <rect x="16" y="15" width="3" height="18" fill={secondaryColor} />
          <rect x="16.5" y="12" width="2" height="24" fill={secondaryColor} />

          <rect x="24" y="18" width="3" height="15" fill={accentColor} />
          <rect x="24.5" y="14" width="2" height="23" fill={accentColor} />

          <rect x="32" y="10" width="3" height="22" fill={secondaryColor} />
          <rect x="32.5" y="8" width="2" height="26" fill={secondaryColor} />

          <rect x="40" y="6" width="3" height="26" fill={accentColor} />
          <rect x="40.5" y="4" width="2" height="30" fill={accentColor} />

          {/* Upward trend line */}
          <path
            d="M6 30 L12 25 L20 22 L28 16 L36 12 L44 8"
            stroke={accentColor}
            strokeWidth="2"
            fill="none"
          />

          {/* Arrow at the end */}
          <path
            d="M42 6 L44 8 L46 6 M44 8 L44 10"
            stroke={accentColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        <div className="mt-2 text-center">
          <span
            className="text-xl font-bold tracking-wide"
            style={{ color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            in<span style={{ color: accentColor }}>V</span>exis
          </span>
        </div>
      </div>
    );
  } return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 60 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Candlestick chart pattern */}
        <rect x="8" y="20" width="3" height="12" fill={accentColor} />
        <rect x="8.5" y="16" width="2" height="20" fill={accentColor} />

        <rect x="16" y="15" width="3" height="18" fill={secondaryColor} />
        <rect x="16.5" y="12" width="2" height="24" fill={secondaryColor} />

        <rect x="24" y="18" width="3" height="15" fill={accentColor} />
        <rect x="24.5" y="14" width="2" height="23" fill={accentColor} />

        <rect x="32" y="10" width="3" height="22" fill={secondaryColor} />
        <rect x="32.5" y="8" width="2" height="26" fill={secondaryColor} />

        <rect x="40" y="6" width="3" height="26" fill={accentColor} />
        <rect x="40.5" y="4" width="2" height="30" fill={accentColor} />

        {/* Upward trend line */}
        <path
          d="M6 30 L12 25 L20 22 L28 16 L36 12 L44 8"
          stroke={accentColor}
          strokeWidth="2"
          fill="none"
        />

        {/* Arrow at the end */}
        <path
          d="M42 6 L44 8 L46 6 M44 8 L44 10"
          stroke={accentColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Circuit-style connecting dots */}
        <circle cx="12" cy="25" r="1.5" fill={accentColor} />
        <circle cx="20" cy="22" r="1.5" fill={secondaryColor} />
        <circle cx="28" cy="16" r="1.5" fill={accentColor} />
        <circle cx="36" cy="12" r="1.5" fill={secondaryColor} />
      </svg>

      <span
        className={`${size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'} font-bold tracking-wide`}
        style={{ color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        in<span style={{ color: accentColor }}>V</span>exis
      </span>
    </div>
  );
};

export default InVexisLogo;