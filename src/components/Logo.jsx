import React from 'react';
import { logoLight, logoDark } from '../assets/branding';

export const Logo = ({ variant = 'horizontal', className = '', theme = 'dark' }) => {
  const logoSrc = theme === 'dark' ? logoLight : logoDark;
  
  // In a real implementation, these would be different assets.
  // Since only logoLight/logoDark are provided, we use them for all variants.
  const src = logoSrc;

  if (variant === 'icon') {
    return <img src={src} alt="LockOn Logo" className={`w-10 h-10 object-contain ${className}`} />;
  }

  return (
    <div className={`flex ${variant === 'stacked' ? 'flex-col items-center' : 'flex-row items-center gap-3'} ${className}`}>
      <img 
        src={src} 
        alt="LockOn Logo" 
        className={variant === 'stacked' ? 'w-16 h-16 object-contain' : 'w-10 h-10 object-contain'} 
      />
    </div>
  );
};
