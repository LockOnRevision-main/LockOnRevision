const C = {
  primary: '#0D8DA6',
  secondary: '#064571',
  accent: '#F59E0B',
  muted: '#94A3B8',
  green: '#10B981',
  purple: '#8B5CF6',
  red: '#EF4444',
  pink: '#EC4899',
  orange: '#F97316',
  teal: '#14B8A6',
};

export const defaultAvatars = [
  {
    id: 'default-space',
    category: 'Space',
    name: 'Space Explorer',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.secondary}" opacity="0.08"/>
      <circle cx="60" cy="60" r="48" fill="${C.secondary}" opacity="0.12"/>
      <ellipse cx="78" cy="56" rx="36" ry="7" stroke="${C.accent}" stroke-width="3" fill="none" opacity="0.3"/>
      <circle cx="48" cy="52" r="24" fill="${C.secondary}" opacity="0.15"/>
      <circle cx="48" cy="52" r="22" fill="${C.secondary}" opacity="0.25"/>
      <circle cx="48" cy="52" r="18" fill="${C.secondary}"/>
      <ellipse cx="78" cy="56" rx="32" ry="6" stroke="${C.accent}" stroke-width="3" fill="none"/>
      <circle cx="40" cy="48" r="3" fill="${C.primary}" opacity="0.5"/>
      <circle cx="52" cy="58" r="2" fill="${C.primary}" opacity="0.4"/>
      <circle cx="46" cy="42" r="2.5" fill="${C.primary}" opacity="0.5"/>
      <polygon points="84,28 76,44 80,44 78,56 90,56 88,44 92,44" fill="${C.primary}" opacity="0.15"/>
      <polygon points="86,32 80,44 83,44 82,52 90,52 89,44 92,44" fill="${C.primary}"/>
      <circle cx="86" cy="38" r="3" fill="white" opacity="0.4"/>
    </svg>`,
  },
  {
    id: 'default-nature',
    category: 'Nature',
    name: 'Nature Lover',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.green}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.green}" opacity="0.1"/>
      <rect x="54" y="70" width="12" height="24" rx="4" fill="${C.muted}" opacity="0.3"/>
      <polygon points="60,16 84,52 74,52 92,74 66,74 76,94 44,94 54,74 28,74 46,52 36,52" fill="${C.green}" opacity="0.12"/>
      <polygon points="60,24 78,52 70,52 84,68 62,68 70,84 50,84 58,68 36,68 50,52 42,52" fill="${C.green}" opacity="0.25"/>
      <polygon points="60,32 72,52 66,52 76,62 58,62 64,74 56,74 62,62 44,62 54,52 48,52" fill="${C.green}"/>
      <circle cx="60" cy="44" r="4" fill="white" opacity="0.3"/>
    </svg>`,
  },
  {
    id: 'default-science',
    category: 'Science',
    name: 'Scientist',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.purple}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.purple}" opacity="0.1"/>
      <polygon points="44,28 64,28 68,40 68,86 40,86 40,40" fill="${C.purple}" opacity="0.08"/>
      <polygon points="46,30 62,30 66,40 66,84 42,84 42,40" fill="${C.purple}" opacity="0.15"/>
      <polygon points="48,32 60,32 64,40 64,82 44,82 44,40" fill="${C.purple}" opacity="0.25"/>
      <polygon points="50,34 58,34 62,40 62,80 46,80 46,40" fill="${C.purple}"/>
      <rect x="46" y="40" width="16" height="4" rx="1.5" fill="${C.purple}" opacity="0.3"/>
      <path d="M46 60 Q54 64 62 60" stroke="${C.purple}" stroke-width="2.5" fill="none" opacity="0.3"/>
      <path d="M46 70 Q54 74 62 70" stroke="${C.purple}" stroke-width="2.5" fill="none" opacity="0.2"/>
      <circle cx="54" cy="52" r="4" fill="${C.accent}" opacity="0.4"/>
      <circle cx="54" cy="52" r="2" fill="${C.accent}"/>
    </svg>`,
  },
  {
    id: 'default-technology',
    category: 'Technology',
    name: 'Techie',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.primary}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.primary}" opacity="0.1"/>
      <rect x="30" y="34" width="60" height="52" rx="8" fill="${C.primary}" opacity="0.08"/>
      <rect x="34" y="38" width="52" height="44" rx="6" fill="${C.primary}" opacity="0.15"/>
      <rect x="38" y="42" width="44" height="36" rx="4" fill="${C.primary}" opacity="0.25"/>
      <rect x="42" y="46" width="36" height="28" rx="3" fill="${C.primary}"/>
      <rect x="50" y="54" width="20" height="12" rx="2" fill="${C.accent}" opacity="0.2"/>
      <rect x="52" y="56" width="16" height="8" rx="1.5" fill="${C.accent}" opacity="0.5"/>
      <circle cx="60" cy="60" r="3" fill="${C.accent}"/>
      <line x1="42" y1="74" x2="78" y2="74" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.15"/>
      <line x1="48" y1="78" x2="72" y2="78" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.12"/>
    </svg>`,
  },
  {
    id: 'default-books',
    category: 'Books',
    name: 'Bookworm',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.accent}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.accent}" opacity="0.1"/>
      <rect x="36" y="22" width="14" height="52" rx="3" fill="${C.primary}" opacity="0.08" transform="rotate(-8 43 48)"/>
      <rect x="52" y="18" width="14" height="60" rx="3" fill="${C.primary}" opacity="0.12" transform="rotate(4 59 48)"/>
      <rect x="68" y="24" width="14" height="52" rx="3" fill="${C.primary}" opacity="0.08" transform="rotate(10 75 50)"/>
      <rect x="54" y="20" width="14" height="56" rx="3" fill="${C.primary}" opacity="0.25" transform="rotate(4 61 48)"/>
      <rect x="56" y="22" width="10" height="52" rx="2" fill="${C.primary}" transform="rotate(4 61 48)"/>
      <line x1="60" y1="34" x2="66" y2="48" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.2" transform="rotate(4 63 41)"/>
      <line x1="58" y1="50" x2="64" y2="60" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.15" transform="rotate(4 61 55)"/>
      <rect x="38" y="70" width="44" height="18" rx="4" fill="${C.accent}" opacity="0.15"/>
      <rect x="40" y="72" width="40" height="14" rx="3" fill="${C.accent}" opacity="0.25"/>
      <rect x="56" y="74" width="8" height="10" rx="2" fill="${C.accent}" opacity="0.5"/>
    </svg>`,
  },
  {
    id: 'default-gaming',
    category: 'Gaming',
    name: 'Gamer',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.pink}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.pink}" opacity="0.1"/>
      <rect x="24" y="44" width="72" height="34" rx="12" fill="${C.pink}" opacity="0.08"/>
      <rect x="28" y="48" width="64" height="26" rx="10" fill="${C.pink}" opacity="0.15"/>
      <rect x="32" y="52" width="56" height="18" rx="8" fill="${C.pink}"/>
      <circle cx="46" cy="61" r="5" fill="${C.accent}"/>
      <circle cx="74" cy="61" r="5" fill="${C.accent}"/>
      <circle cx="46" cy="61" r="2" fill="${C.pink}" opacity="0.4"/>
      <circle cx="74" cy="61" r="2" fill="${C.pink}" opacity="0.4"/>
      <circle cx="60" cy="56" r="3" fill="white" opacity="0.25"/>
      <rect x="52" y="66" width="16" height="3" rx="1.5" fill="white" opacity="0.15"/>
      <line x1="20" y1="52" x2="26" y2="52" stroke="${C.pink}" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
      <line x1="94" y1="52" x2="100" y2="52" stroke="${C.pink}" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
    </svg>`,
  },
  {
    id: 'default-sports',
    category: 'Sports',
    name: 'Athlete',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.orange}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.orange}" opacity="0.1"/>
      <ellipse cx="60" cy="58" rx="34" ry="34" stroke="${C.orange}" stroke-width="3" fill="none" opacity="0.08"/>
      <ellipse cx="60" cy="58" rx="30" ry="30" stroke="${C.orange}" stroke-width="4" fill="none" opacity="0.15"/>
      <ellipse cx="60" cy="58" rx="28" ry="28" fill="${C.orange}" opacity="0.12"/>
      <ellipse cx="60" cy="58" rx="24" ry="24" fill="${C.orange}" opacity="0.2"/>
      <ellipse cx="60" cy="58" rx="20" ry="20" fill="${C.orange}"/>
      <path d="M40 44 Q60 58 80 44" stroke="white" stroke-width="2.5" fill="none" opacity="0.2"/>
      <path d="M40 72 Q60 58 80 72" stroke="white" stroke-width="2.5" fill="none" opacity="0.2"/>
      <line x1="60" y1="30" x2="60" y2="86" stroke="white" stroke-width="2" opacity="0.15"/>
      <line x1="32" y1="58" x2="88" y2="58" stroke="white" stroke-width="2" opacity="0.15"/>
      <polygon points="60,40 66,52 80,52 68,62 72,76 60,66 48,76 52,62 40,52 54,52" fill="white" opacity="0.12"/>
      <polygon points="60,44 64,54 74,54 66,62 68,72 60,64 52,72 54,62 46,54 56,54" fill="white" opacity="0.2"/>
      <polygon points="60,48 62,56 68,56 64,62 66,68 60,62 54,68 56,62 52,56 58,56" fill="white" opacity="0.3"/>
    </svg>`,
  },
  {
    id: 'default-music',
    category: 'Music',
    name: 'Musician',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.red}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.red}" opacity="0.1"/>
      <circle cx="40" cy="74" r="16" fill="${C.red}" opacity="0.08"/>
      <circle cx="40" cy="74" r="14" fill="${C.red}" opacity="0.15"/>
      <circle cx="40" cy="74" r="12" fill="${C.red}" opacity="0.25"/>
      <circle cx="40" cy="74" r="10" fill="${C.red}"/>
      <rect x="50" y="34" width="32" height="44" rx="6" fill="${C.red}" opacity="0.08"/>
      <rect x="52" y="36" width="28" height="40" rx="5" fill="${C.red}" opacity="0.15"/>
      <rect x="54" y="38" width="24" height="36" rx="4" fill="${C.red}" opacity="0.25"/>
      <rect x="56" y="40" width="20" height="32" rx="3" fill="${C.red}"/>
      <line x1="56" y1="48" x2="74" y2="44" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
      <line x1="56" y1="56" x2="70" y2="52" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.2"/>
      <circle cx="60" cy="56" r="16" fill="white" opacity="0.06"/>
      <path d="M44 74 L56 70" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    </svg>`,
  },
  {
    id: 'default-animals',
    category: 'Animals',
    name: 'Animal Friend',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.teal}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.teal}" opacity="0.1"/>
      <ellipse cx="60" cy="62" rx="26" ry="22" fill="${C.teal}" opacity="0.08"/>
      <polygon points="44,44 52,26 48,44" fill="${C.teal}" opacity="0.12"/>
      <polygon points="76,44 68,26 72,44" fill="${C.teal}" opacity="0.12"/>
      <ellipse cx="60" cy="62" rx="24" ry="20" fill="${C.teal}" opacity="0.18"/>
      <ellipse cx="60" cy="62" rx="20" ry="16" fill="${C.teal}"/>
      <polygon points="46,42 52,28 49,42" fill="${C.teal}"/>
      <polygon points="74,42 68,28 71,42" fill="${C.teal}"/>
      <circle cx="52" cy="58" r="3.5" fill="white"/>
      <circle cx="68" cy="58" r="3.5" fill="white"/>
      <circle cx="52" cy="58" r="1.8" fill="${C.teal}" opacity="0.6"/>
      <circle cx="68" cy="58" r="1.8" fill="${C.teal}" opacity="0.6"/>
      <ellipse cx="60" cy="70" rx="5" ry="2.5" fill="${C.teal}" opacity="0.4"/>
      <ellipse cx="54" cy="50" rx="4" ry="2" fill="white" opacity="0.12"/>
      <ellipse cx="66" cy="50" rx="4" ry="2" fill="white" opacity="0.12"/>
    </svg>`,
  },
  {
    id: 'default-abstract',
    category: 'Abstract',
    name: 'Creative Mind',
    svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="${C.secondary}" opacity="0.06"/>
      <circle cx="60" cy="60" r="48" fill="${C.secondary}" opacity="0.1"/>
      <circle cx="60" cy="60" r="32" stroke="${C.secondary}" stroke-width="2" fill="none" opacity="0.06"/>
      <circle cx="60" cy="60" r="24" stroke="${C.secondary}" stroke-width="3" fill="none" opacity="0.12"/>
      <circle cx="60" cy="60" r="16" stroke="${C.secondary}" stroke-width="4" fill="none" opacity="0.25"/>
      <circle cx="60" cy="60" r="8" stroke="${C.secondary}" stroke-width="5" fill="none"/>
      <circle cx="60" cy="60" r="3" fill="${C.secondary}"/>
      <circle cx="36" cy="36" r="4" fill="${C.accent}" opacity="0.3"/>
      <circle cx="84" cy="36" r="4" fill="${C.primary}" opacity="0.3"/>
      <circle cx="36" cy="84" r="4" fill="${C.pink}" opacity="0.3"/>
      <circle cx="84" cy="84" r="4" fill="${C.green}" opacity="0.3"/>
      <line x1="40" y1="40" x2="52" y2="52" stroke="${C.accent}" stroke-width="3" stroke-linecap="round" opacity="0.2"/>
      <line x1="80" y1="40" x2="68" y2="52" stroke="${C.primary}" stroke-width="3" stroke-linecap="round" opacity="0.2"/>
      <line x1="40" y1="80" x2="52" y2="68" stroke="${C.pink}" stroke-width="3" stroke-linecap="round" opacity="0.2"/>
      <line x1="80" y1="80" x2="68" y2="68" stroke="${C.green}" stroke-width="3" stroke-linecap="round" opacity="0.2"/>
    </svg>`,
  },
];

export const defaultAvatarMap = Object.fromEntries(
  defaultAvatars.map((a) => [a.id, a])
);

export function getDefaultAvatarById(id) {
  return defaultAvatarMap[id] || null;
}
