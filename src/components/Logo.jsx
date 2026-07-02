import React from 'react';
import { logoLight, logoDark } from '../assets/branding';

export const Logo = ({ variant = 'horizontal', className = '', theme = 'dark' }) => {
  const logoSrc = theme === 'dark' ? logoLight : logoDark;
  const isIcon = variant === 'icon';

  if (isIcon) {
    return <img src={logoSrc} alt="LockOn Logo" className={className} />;
  }

  return (
    <div className={`flex ${variant === 'stacked' ? 'flex-col items-center' : 'flex-row items-center gap-3'} ${className}`}>
      <img 
        src={logoSrc} 
        alt="LockOn Logo" 
        className={variant === 'stacked' ? 'w-16 h-16' : 'w-10 h-10'} 
      />
    </div>
  );
};
