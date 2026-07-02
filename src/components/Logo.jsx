import React from 'react';

const LogoIcon = ({ className = "w-8 h-8", color = "currentColor" }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M20 60L80 20L60 50L40 80L20 60Z" 
      fill="currentColor" 
      className="opacity-50"
    />
    <path 
      d="M30 65L85 25L65 55L45 85L30 65Z" 
      fill="currentColor"
    />
  </svg>
);

// A better approximation of the paper plane from the image
const PaperPlaneIcon = ({ className = "w-8 h-8" }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Shadow/Back layer */}
    <path 
      d="M20 55 L80 15 L70 35 L45 60 L35 80 L20 55 Z" 
      fill="var(--color-primary)" 
    />
    {/* Main layer */}
    <path 
      d="M30 60 L85 20 L75 40 L50 65 L40 85 L30 60 Z" 
      fill="var(--color-accent)" 
    />
  </svg>
);

export const Logo = ({ variant = 'horizontal', className = '' }) => {
  const isHorizontal = variant === 'horizontal';
  const isStacked = variant === 'stacked';
  const isIcon = variant === 'icon';

  const textContent = (
    <div className={`flex ${isStacked ? 'flex-col items-center text-center' : 'flex-col justify-center'}`}>
      <h1 className={`font-black tracking-tighter ${isStacked ? 'text-3xl' : 'text-2xl'} text-white`}>
        Lock<span className="text-primary">On</span>Revision
      </h1>
      {(!isIcon) && (
        <p className={`font-medium tracking-widest uppercase text-[10px] ${isStacked ? 'mt-1' : 'mt-0'} text-text-secondary`}>
          Learn more <span className="font-bold text-primary">Effectively</span>
        </p>
      )}
    </div>
  );

  if (isIcon) {
    return <PaperPlaneIcon className={className} />;
  }

  return (
    <div className={`flex ${isStacked ? 'flex-col items-center' : 'flex-row items-center gap-3'} ${className}`}>
      <PaperPlaneIcon className={isStacked ? 'w-16 h-16' : 'w-10 h-10'} />
      {textContent}
    </div>
  );
};
