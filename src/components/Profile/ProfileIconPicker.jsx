import React, { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';
import { profileIcons, iconCategories } from './profileIcons';

export function ProfileIconPicker({ currentId, onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredId, setHoveredId] = useState(null);

  const filteredIcons = useMemo(() => {
    if (activeCategory === 'All') return profileIcons;
    return profileIcons.filter((icon) => icon.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface shrink-0">
          <h3 className="text-xl font-black text-text-primary tracking-tight">Choose Profile Icon</h3>
          <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 shrink-0 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === 'All'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-background text-text-secondary border border-border hover:bg-surface hover:border-primary'
              }`}
            >
              All
            </button>
            {iconCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-background text-text-secondary border border-border hover:bg-surface hover:border-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
            {filteredIcons.map((icon) => {
              const isSelected = currentId === icon.id;
              const isHovered = hoveredId === icon.id;
              return (
                <button
                  key={icon.id}
                  onClick={() => onSelect(icon.id)}
                  onMouseEnter={() => setHoveredId(icon.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative aspect-square rounded-2xl border-2 transition-all duration-150 flex items-center justify-center p-3 ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-md shadow-primary/10 scale-105'
                      : isHovered
                      ? 'border-primary/40 bg-background hover:scale-105 shadow-sm'
                      : 'border-border bg-background hover:bg-surface hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: icon.svg }}
                  />
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {filteredIcons.length === 0 && (
            <p className="text-center text-text-muted py-12 text-sm">No icons found in this category.</p>
          )}
        </div>

        <div className="p-4 border-t border-border bg-surface/50 shrink-0 flex justify-between items-center">
          <p className="text-xs text-text-muted">
            {currentId ? 'Currently selected icon shown with highlight' : 'Pick an icon from the grid'}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-active transition-all shadow-sm active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfileIconRenderer({ iconId, className = '' }) {
  const icon = React.useMemo(
    () => profileIcons.find((i) => i.id === iconId),
    [iconId]
  );
  if (!icon) return null;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
}
