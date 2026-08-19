const ICON_PRIMARY = '#0D8DA6';
const ICON_SECONDARY = '#064571';
const ICON_ACCENT = '#F59E0B';
const ICON_MUTED = '#94A3B8';

export const profileIcons = [
  // ── Abstract Shapes ──
  {
    id: 'shape-circle',
    category: 'Abstract',
    name: 'Circle',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="38" fill="${ICON_PRIMARY}" opacity="0.15"/><circle cx="50" cy="50" r="24" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'shape-diamond',
    category: 'Abstract',
    name: 'Diamond',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="50" y="8" width="30" height="30" rx="6" fill="${ICON_PRIMARY}" opacity="0.15" transform="rotate(45 50 50)"/><rect x="50" y="26" width="20" height="20" rx="4" fill="${ICON_PRIMARY}" transform="rotate(45 50 50)"/></svg>`,
  },
  {
    id: 'shape-hexagon',
    category: 'Abstract',
    name: 'Hexagon',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="${ICON_PRIMARY}" opacity="0.15"/><polygon points="50,22 78,35 78,65 50,78 22,65 22,35" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'shape-star',
    category: 'Abstract',
    name: 'Star',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="50,8 63,38 95,38 69,58 78,90 50,72 22,90 31,58 5,38 38,38" fill="${ICON_ACCENT}" opacity="0.15"/><polygon points="50,22 58,40 78,40 63,52 68,70 50,58 32,70 37,52 22,40 42,40" fill="${ICON_ACCENT}"/></svg>`,
  },
  {
    id: 'shape-waves',
    category: 'Abstract',
    name: 'Waves',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 60 Q25 40 40 60 Q55 80 70 60 Q85 40 95 55" stroke="${ICON_PRIMARY}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.15"/><path d="M10 45 Q25 25 40 45 Q55 65 70 45 Q85 25 95 40" stroke="${ICON_PRIMARY}" stroke-width="6" stroke-linecap="round" fill="none"/></svg>`,
  },
  {
    id: 'shape-spiral',
    category: 'Abstract',
    name: 'Spiral',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 50 C50 35 65 30 75 40 C85 50 80 70 65 75 C50 80 35 65 40 50 C45 38 62 38 68 52" stroke="${ICON_PRIMARY}" stroke-width="5" stroke-linecap="round" fill="none"/></svg>`,
  },
  {
    id: 'shape-concentric',
    category: 'Abstract',
    name: 'Concentric',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="36" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.1"/><circle cx="50" cy="50" r="26" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none" opacity="0.25"/><circle cx="50" cy="50" r="14" stroke="${ICON_PRIMARY}" stroke-width="5" fill="none"/><circle cx="50" cy="50" r="4" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'shape-triangle',
    category: 'Abstract',
    name: 'Triangle',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="50,12 90,85 10,85" fill="${ICON_PRIMARY}" opacity="0.12"/><polygon points="50,28 78,78 22,78" fill="${ICON_PRIMARY}"/></svg>`,
  },

  // ── Animals ──
  {
    id: 'animal-cat',
    category: 'Animals',
    name: 'Cat',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="58" rx="24" ry="20" fill="${ICON_PRIMARY}" opacity="0.15"/><polygon points="36,42 44,28 40,42" fill="${ICON_PRIMARY}"/><polygon points="64,42 56,28 60,42" fill="${ICON_PRIMARY}"/><ellipse cx="50" cy="58" rx="18" ry="14" fill="${ICON_PRIMARY}"/><circle cx="44" cy="55" r="2.5" fill="white"/><circle cx="56" cy="55" r="2.5" fill="white"/><ellipse cx="50" cy="65" rx="4" ry="2.5" fill="${ICON_PRIMARY}" opacity="0.6"/><circle cx="44" cy="55" r="1.2" fill="${ICON_SECONDARY}"/><circle cx="56" cy="55" r="1.2" fill="${ICON_SECONDARY}"/></svg>`,
  },
  {
    id: 'animal-dog',
    category: 'Animals',
    name: 'Dog',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="58" rx="22" ry="18" fill="${ICON_PRIMARY}" opacity="0.15"/><ellipse cx="36" cy="40" rx="8" ry="12" fill="${ICON_PRIMARY}" opacity="0.15"/><ellipse cx="64" cy="40" rx="8" ry="12" fill="${ICON_PRIMARY}" opacity="0.15"/><ellipse cx="50" cy="58" rx="18" ry="14" fill="${ICON_PRIMARY}"/><circle cx="44" cy="55" r="2" fill="white"/><circle cx="56" cy="55" r="2" fill="white"/><circle cx="44" cy="55" r="1" fill="${ICON_SECONDARY}"/><circle cx="56" cy="55" r="1" fill="${ICON_SECONDARY}"/><ellipse cx="50" cy="67" rx="6" ry="2.5" fill="${ICON_PRIMARY}" opacity="0.5"/></svg>`,
  },
  {
    id: 'animal-owl',
    category: 'Animals',
    name: 'Owl',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="26" ry="28" fill="${ICON_SECONDARY}" opacity="0.1"/><ellipse cx="50" cy="52" rx="22" ry="22" fill="${ICON_SECONDARY}" opacity="0.2"/><circle cx="38" cy="48" r="10" fill="${ICON_PRIMARY}"/><circle cx="62" cy="48" r="10" fill="${ICON_PRIMARY}"/><circle cx="38" cy="48" r="6" fill="${ICON_ACCENT}"/><circle cx="62" cy="48" r="6" fill="${ICON_ACCENT}"/><circle cx="38" cy="48" r="3" fill="${ICON_SECONDARY}"/><circle cx="62" cy="48" r="3" fill="${ICON_SECONDARY}"/><polygon points="42,62 50,72 58,62" fill="${ICON_ACCENT}"/></svg>`,
  },
  {
    id: 'animal-fox',
    category: 'Animals',
    name: 'Fox',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="50,55 30,90 70,90" fill="${ICON_ACCENT}" opacity="0.2"/><polygon points="30,45 16,18 38,38 50,28 62,38 84,18 70,45" fill="${ICON_ACCENT}" opacity="0.15"/><polygon points="50,55 32,88 68,88" fill="${ICON_ACCENT}"/><polygon points="34,42 22,20 40,36" fill="${ICON_ACCENT}"/><polygon points="66,42 78,20 60,36" fill="${ICON_ACCENT}"/><circle cx="44" cy="62" r="2" fill="white"/><circle cx="56" cy="62" r="2" fill="white"/><ellipse cx="50" cy="72" rx="4" ry="2" fill="white" opacity="0.7"/></svg>`,
  },
  {
    id: 'animal-butterfly',
    category: 'Animals',
    name: 'Butterfly',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="45" rx="16" ry="22" fill="${ICON_PRIMARY}" opacity="0.12"/><ellipse cx="64" cy="45" rx="16" ry="22" fill="${ICON_PRIMARY}" opacity="0.12"/><ellipse cx="36" cy="45" rx="12" ry="16" fill="${ICON_PRIMARY}" opacity="0.3"/><ellipse cx="64" cy="45" rx="12" ry="16" fill="${ICON_PRIMARY}" opacity="0.3"/><ellipse cx="50" cy="52" rx="4" ry="18" fill="${ICON_SECONDARY}"/><ellipse cx="40" cy="40" rx="6" ry="8" fill="${ICON_ACCENT}" opacity="0.4"/><ellipse cx="60" cy="40" rx="6" ry="8" fill="${ICON_ACCENT}" opacity="0.4"/><circle cx="50" cy="72" r="3" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'animal-whale',
    category: 'Animals',
    name: 'Whale',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="48" cy="52" rx="32" ry="16" fill="${ICON_SECONDARY}" opacity="0.1"/><ellipse cx="48" cy="52" rx="28" ry="14" fill="${ICON_SECONDARY}" opacity="0.2"/><ellipse cx="50" cy="54" rx="24" ry="10" fill="${ICON_SECONDARY}"/><circle cx="34" cy="52" r="3" fill="white"/><circle cx="34" cy="52" r="1.5" fill="${ICON_SECONDARY}"/><path d="M78 54 Q88 48 82 42" stroke="${ICON_SECONDARY}" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="73" cy="52" r="2" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'animal-turtle',
    category: 'Animals',
    name: 'Turtle',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="55" rx="22" ry="18" fill="${ICON_PRIMARY}" opacity="0.08"/><ellipse cx="50" cy="55" rx="20" ry="16" fill="${ICON_PRIMARY}" opacity="0.18"/><ellipse cx="50" cy="55" rx="16" ry="13" fill="${ICON_PRIMARY}" opacity="0.3"/><ellipse cx="50" cy="55" rx="12" ry="10" fill="${ICON_PRIMARY}"/><circle cx="42" cy="65" r="4" fill="${ICON_PRIMARY}" opacity="0.5"/><circle cx="50" cy="68" r="4" fill="${ICON_PRIMARY}" opacity="0.5"/><circle cx="58" cy="65" r="4" fill="${ICON_PRIMARY}" opacity="0.5"/><circle cx="40" cy="52" r="2" fill="white"/><circle cx="60" cy="52" r="2" fill="white"/></svg>`,
  },
  {
    id: 'animal-rabbit',
    category: 'Animals',
    name: 'Rabbit',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="65" rx="16" ry="14" fill="${ICON_PRIMARY}" opacity="0.15"/><ellipse cx="44" cy="28" rx="5" ry="16" fill="${ICON_PRIMARY}" opacity="0.15"/><ellipse cx="56" cy="28" rx="5" ry="16" fill="${ICON_PRIMARY}" opacity="0.15"/><ellipse cx="50" cy="64" rx="14" ry="12" fill="${ICON_PRIMARY}"/><ellipse cx="44" cy="30" rx="4" ry="12" fill="${ICON_PRIMARY}"/><ellipse cx="56" cy="30" rx="4" ry="12" fill="${ICON_PRIMARY}"/><circle cx="44" cy="62" r="2" fill="white"/><circle cx="56" cy="62" r="2" fill="white"/><circle cx="44" cy="62" r="1" fill="${ICON_SECONDARY}"/><circle cx="56" cy="62" r="1" fill="${ICON_SECONDARY}"/><ellipse cx="50" cy="70" rx="4" ry="2" fill="${ICON_PRIMARY}" opacity="0.5"/></svg>`,
  },

  // ── Nature ──
  {
    id: 'nature-tree',
    category: 'Nature',
    name: 'Tree',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="44" y="68" width="12" height="22" rx="3" fill="${ICON_MUTED}" opacity="0.4"/><polygon points="50,12 78,48 68,48 85,70 62,70 72,90 28,90 38,70 15,70 32,48 22,48" fill="${ICON_PRIMARY}" opacity="0.15"/><polygon points="50,20 70,48 62,48 76,64 56,64 62,78 38,78 44,64 24,64 38,48 30,48" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'nature-leaf',
    category: 'Nature',
    name: 'Leaf',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 88 Q28 68 24 44 Q20 20 44 16 Q68 12 76 36 Q84 60 50 88Z" fill="${ICON_PRIMARY}" opacity="0.12"/><path d="M50 82 Q32 64 28 44 Q24 24 44 20 Q64 16 72 36 Q80 56 50 82Z" fill="${ICON_PRIMARY}" opacity="0.3"/><path d="M50 76 Q36 60 32 44 Q28 28 44 24 Q60 20 68 36 Q76 52 50 76Z" fill="${ICON_PRIMARY}"/><path d="M50 76 L66 32" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3"/></svg>`,
  },
  {
    id: 'nature-mountain',
    category: 'Nature',
    name: 'Mountain',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="10,68 34,32 58,68" fill="${ICON_SECONDARY}" opacity="0.12"/><polygon points="30,80 60,28 90,80" fill="${ICON_PRIMARY}" opacity="0.15"/><polygon points="50,80 70,40 90,80" fill="${ICON_SECONDARY}" opacity="0.2"/><polygon points="18,80 42,38 66,80" fill="${ICON_PRIMARY}" opacity="0.3"/><polygon points="40,80 60,46 80,80" fill="${ICON_SECONDARY}"/><polygon points="50,80 66,52 82,80" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'nature-sun',
    category: 'Nature',
    name: 'Sun',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="38" fill="${ICON_ACCENT}" opacity="0.08"/><circle cx="50" cy="50" r="28" fill="${ICON_ACCENT}" opacity="0.15"/><line x1="50" y1="12" x2="50" y2="22" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round"/><line x1="50" y1="78" x2="50" y2="88" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round"/><line x1="16" y1="36" x2="24" y2="42" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round"/><line x1="76" y1="58" x2="84" y2="64" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round"/><line x1="16" y1="64" x2="24" y2="58" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round"/><line x1="76" y1="42" x2="84" y2="36" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="50" r="16" fill="${ICON_ACCENT}"/></svg>`,
  },
  {
    id: 'nature-moon',
    category: 'Nature',
    name: 'Moon',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="34" fill="${ICON_SECONDARY}" opacity="0.08"/><circle cx="52" cy="52" r="28" fill="${ICON_SECONDARY}" opacity="0.15"/><path d="M52 22 C38 22 28 34 28 50 C28 66 38 78 52 78 C42 78 34 66 34 50 C34 34 42 22 52 22Z" fill="${ICON_SECONDARY}"/></svg>`,
  },
  {
    id: 'nature-flower',
    category: 'Nature',
    name: 'Flower',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="8" fill="${ICON_ACCENT}"/><ellipse cx="50" cy="36" rx="6" ry="10" fill="${ICON_PRIMARY}" opacity="0.3"/><ellipse cx="50" cy="64" rx="6" ry="10" fill="${ICON_PRIMARY}" opacity="0.3"/><ellipse cx="36" cy="50" rx="10" ry="6" fill="${ICON_PRIMARY}" opacity="0.3"/><ellipse cx="64" cy="50" rx="10" ry="6" fill="${ICON_PRIMARY}" opacity="0.3"/><ellipse cx="50" cy="36" rx="6" ry="9" fill="${ICON_PRIMARY}"/><ellipse cx="50" cy="64" rx="6" ry="9" fill="${ICON_PRIMARY}"/><ellipse cx="36" cy="50" rx="9" ry="6" fill="${ICON_PRIMARY}"/><ellipse cx="64" cy="50" rx="9" ry="6" fill="${ICON_PRIMARY}"/><rect x="47" y="68" width="6" height="18" rx="2" fill="${ICON_PRIMARY}" opacity="0.5"/></svg>`,
  },
  {
    id: 'nature-lightning',
    category: 'Nature',
    name: 'Lightning',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="56,12 26,52 44,52 36,88 74,44 54,44 62,12" fill="${ICON_ACCENT}" opacity="0.12"/><polygon points="54,20 32,52 46,52 40,76 66,46 52,46 58,20" fill="${ICON_ACCENT}"/></svg>`,
  },
  {
    id: 'nature-rainbow',
    category: 'Nature',
    name: 'Rainbow',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 72 A36 36 0 0 1 96 72" stroke="${ICON_PRIMARY}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.08"/><path d="M30 72 A30 30 0 0 1 90 72" stroke="${ICON_ACCENT}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.15"/><path d="M36 72 A24 24 0 0 1 84 72" stroke="${ICON_PRIMARY}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.3"/><path d="M42 72 A18 18 0 0 1 78 72" stroke="${ICON_ACCENT}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M48 72 A12 12 0 0 1 72 72" stroke="${ICON_PRIMARY}" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  },

  // ── Space ──
  {
    id: 'space-planet',
    category: 'Space',
    name: 'Planet',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="62" cy="50" rx="34" ry="8" stroke="${ICON_ACCENT}" stroke-width="3" fill="none" opacity="0.3"/><circle cx="44" cy="48" r="22" fill="${ICON_SECONDARY}" opacity="0.12"/><circle cx="44" cy="48" r="20" fill="${ICON_SECONDARY}" opacity="0.2"/><circle cx="44" cy="48" r="16" fill="${ICON_SECONDARY}"/><ellipse cx="62" cy="50" rx="30" ry="7" stroke="${ICON_ACCENT}" stroke-width="3" fill="none"/><circle cx="36" cy="44" r="3" fill="${ICON_PRIMARY}" opacity="0.4"/><circle cx="48" cy="54" r="2" fill="${ICON_PRIMARY}" opacity="0.3"/><circle cx="42" cy="38" r="2" fill="${ICON_PRIMARY}" opacity="0.5"/></svg>`,
  },
  {
    id: 'space-rocket',
    category: 'Space',
    name: 'Rocket',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="50,10 32,50 44,50 40,90 60,90 56,50 68,50" fill="${ICON_PRIMARY}" opacity="0.12"/><polygon points="50,20 36,52 46,52 44,82 56,82 54,52 64,52" fill="${ICON_PRIMARY}"/><circle cx="50" cy="40" r="5" fill="white" opacity="0.4"/><polygon points="46,82 44,92 56,92 54,82" fill="${ICON_ACCENT}" opacity="0.3"/></svg>`,
  },
  {
    id: 'space-galaxy',
    category: 'Space',
    name: 'Galaxy',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="32" ry="10" stroke="${ICON_PRIMARY}" stroke-width="2" fill="none" opacity="0.12"/><ellipse cx="50" cy="50" rx="26" ry="8" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.25"/><ellipse cx="50" cy="50" rx="18" ry="6" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none"/><circle cx="36" cy="46" r="2" fill="${ICON_ACCENT}"/><circle cx="64" cy="54" r="2" fill="${ICON_ACCENT}"/><circle cx="50" cy="50" r="3" fill="${ICON_PRIMARY}"/><circle cx="30" cy="52" r="1.5" fill="${ICON_ACCENT}" opacity="0.6"/><circle cx="70" cy="48" r="1.5" fill="${ICON_ACCENT}" opacity="0.6"/></svg>`,
  },
  {
    id: 'space-comet',
    category: 'Space',
    name: 'Comet',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="62" cy="38" r="24" fill="${ICON_ACCENT}" opacity="0.06"/><path d="M12 88 L52 48" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round" opacity="0.15"/><path d="M22 82 L52 52" stroke="${ICON_ACCENT}" stroke-width="3" stroke-linecap="round" opacity="0.3"/><path d="M32 76 L52 56" stroke="${ICON_ACCENT}" stroke-width="2" stroke-linecap="round"/><circle cx="62" cy="38" r="14" fill="${ICON_ACCENT}"/><circle cx="68" cy="32" r="4" fill="white" opacity="0.3"/></svg>`,
  },
  {
    id: 'space-satellite',
    category: 'Space',
    name: 'Satellite',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="30" width="8" height="30" rx="3" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="52" y="30" width="8" height="30" rx="3" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="42" y="38" width="16" height="20" rx="4" fill="${ICON_PRIMARY}" opacity="0.2"/><rect x="44" y="40" width="12" height="16" rx="3" fill="${ICON_PRIMARY}"/><rect x="38" y="56" width="24" height="2" rx="1" fill="${ICON_MUTED}"/><line x1="30" y1="72" x2="46" y2="56" stroke="${ICON_MUTED}" stroke-width="3" stroke-linecap="round"/><line x1="70" y1="72" x2="54" y2="56" stroke="${ICON_MUTED}" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="48" r="3" fill="${ICON_ACCENT}"/></svg>`,
  },

  // ── Technology ──
  {
    id: 'tech-laptop',
    category: 'Technology',
    name: 'Laptop',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="26" width="56" height="36" rx="4" fill="${ICON_PRIMARY}" opacity="0.08"/><rect x="24" y="28" width="52" height="32" rx="3" fill="${ICON_PRIMARY}" opacity="0.15"/><rect x="26" y="30" width="48" height="26" rx="2" fill="${ICON_PRIMARY}" opacity="0.25"/><rect x="28" y="32" width="44" height="22" rx="1.5" fill="${ICON_PRIMARY}"/><path d="M18 62 L82 62 L78 72 L22 72 Z" fill="${ICON_MUTED}" opacity="0.3"/><rect x="46" y="62" width="8" height="10" rx="1" fill="${ICON_MUTED}" opacity="0.4"/></svg>`,
  },
  {
    id: 'tech-code',
    category: 'Technology',
    name: 'Code',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 38 L16 50 L32 62" stroke="${ICON_PRIMARY}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.12"/><path d="M68 38 L84 50 L68 62" stroke="${ICON_PRIMARY}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.12"/><path d="M36 36 L22 50 L36 64" stroke="${ICON_PRIMARY}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.3"/><path d="M64 36 L78 50 L64 64" stroke="${ICON_PRIMARY}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.3"/><path d="M42 32 L58 68" stroke="${ICON_PRIMARY}" stroke-width="5" stroke-linecap="round" fill="none"/></svg>`,
  },
  {
    id: 'tech-chip',
    category: 'Technology',
    name: 'Chip',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="24" width="52" height="52" rx="6" fill="${ICON_PRIMARY}" opacity="0.08"/><rect x="28" y="28" width="44" height="44" rx="4" fill="${ICON_PRIMARY}" opacity="0.15"/><rect x="32" y="32" width="36" height="36" rx="3" fill="${ICON_PRIMARY}" opacity="0.25"/><rect x="36" y="36" width="28" height="28" rx="2" fill="${ICON_PRIMARY}"/><line x1="50" y1="24" x2="50" y2="32" stroke="${ICON_MUTED}" stroke-width="2" stroke-linecap="round"/><line x1="50" y1="68" x2="50" y2="76" stroke="${ICON_MUTED}" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="50" x2="32" y2="50" stroke="${ICON_MUTED}" stroke-width="2" stroke-linecap="round"/><line x1="68" y1="50" x2="76" y2="50" stroke="${ICON_MUTED}" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'tech-gear',
    category: 'Technology',
    name: 'Gear',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="32" fill="${ICON_MUTED}" opacity="0.06"/><circle cx="50" cy="50" r="26" fill="none" stroke="${ICON_MUTED}" stroke-width="4" stroke-dasharray="8 4" opacity="0.15"/><circle cx="50" cy="50" r="22" fill="${ICON_MUTED}" opacity="0.2"/><circle cx="50" cy="50" r="14" fill="${ICON_MUTED}" opacity="0.35"/><circle cx="50" cy="50" r="8" fill="${ICON_MUTED}"/></svg>`,
  },
  {
    id: 'tech-cloud',
    category: 'Technology',
    name: 'Cloud',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="58" rx="30" ry="14" fill="${ICON_PRIMARY}" opacity="0.08"/><ellipse cx="50" cy="56" rx="26" ry="12" fill="${ICON_PRIMARY}" opacity="0.15"/><ellipse cx="40" cy="48" rx="18" ry="12" fill="${ICON_PRIMARY}" opacity="0.12"/><ellipse cx="62" cy="50" rx="16" ry="10" fill="${ICON_PRIMARY}" opacity="0.1"/><ellipse cx="50" cy="54" rx="24" ry="12" fill="${ICON_PRIMARY}"/><ellipse cx="40" cy="48" rx="14" ry="10" fill="${ICON_PRIMARY}" opacity="0.8"/><ellipse cx="62" cy="50" rx="12" ry="8" fill="${ICON_PRIMARY}" opacity="0.7"/></svg>`,
  },
  {
    id: 'tech-database',
    category: 'Technology',
    name: 'Database',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="32" rx="26" ry="10" fill="${ICON_PRIMARY}" opacity="0.08"/><ellipse cx="50" cy="32" rx="22" ry="8" fill="${ICON_PRIMARY}" opacity="0.2"/><ellipse cx="50" cy="50" rx="22" ry="8" fill="${ICON_PRIMARY}" opacity="0.15"/><ellipse cx="50" cy="68" rx="22" ry="8" fill="${ICON_PRIMARY}" opacity="0.1"/><path d="M28 32 L28 68" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.12"/><path d="M72 32 L72 68" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.12"/><path d="M28 32 L28 50" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.2"/><path d="M72 32 L72 50" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.2"/><path d="M28 50 L28 68" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none"/><path d="M72 50 L72 68" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none"/><ellipse cx="50" cy="32" rx="22" ry="8" fill="${ICON_PRIMARY}"/><ellipse cx="50" cy="50" rx="22" ry="8" fill="${ICON_PRIMARY}" opacity="0.8"/><ellipse cx="50" cy="68" rx="22" ry="8" fill="${ICON_PRIMARY}" opacity="0.6"/></svg>`,
  },

  // ── Gaming ──
  {
    id: 'game-controller',
    category: 'Gaming',
    name: 'Controller',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="40" width="52" height="28" rx="10" fill="${ICON_PRIMARY}" opacity="0.08"/><rect x="26" y="42" width="48" height="24" rx="8" fill="${ICON_PRIMARY}" opacity="0.15"/><rect x="28" y="44" width="44" height="20" rx="6" fill="${ICON_PRIMARY}"/><circle cx="42" cy="54" r="4" fill="${ICON_ACCENT}"/><circle cx="58" cy="54" r="4" fill="${ICON_ACCENT}"/><circle cx="42" cy="54" r="1.5" fill="${ICON_PRIMARY}" opacity="0.4"/><circle cx="58" cy="54" r="1.5" fill="${ICON_PRIMARY}" opacity="0.4"/><circle cx="50" cy="48" r="2" fill="white" opacity="0.3"/><line x1="20" y1="46" x2="24" y2="46" stroke="${ICON_PRIMARY}" stroke-width="3" stroke-linecap="round" opacity="0.5"/><line x1="76" y1="46" x2="80" y2="46" stroke="${ICON_PRIMARY}" stroke-width="3" stroke-linecap="round" opacity="0.5"/></svg>`,
  },
  {
    id: 'game-joystick',
    category: 'Gaming',
    name: 'Joystick',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="62" width="20" height="26" rx="4" fill="${ICON_SECONDARY}" opacity="0.12"/><rect x="42" y="64" width="16" height="22" rx="3" fill="${ICON_SECONDARY}" opacity="0.2"/><rect x="44" y="66" width="12" height="18" rx="2" fill="${ICON_SECONDARY}"/><circle cx="50" cy="36" r="22" fill="${ICON_PRIMARY}" opacity="0.08"/><circle cx="50" cy="36" r="20" fill="${ICON_PRIMARY}" opacity="0.15"/><circle cx="50" cy="36" r="16" fill="${ICON_PRIMARY}"/><circle cx="50" cy="36" r="8" fill="${ICON_SECONDARY}"/><circle cx="50" cy="36" r="3" fill="${ICON_ACCENT}"/></svg>`,
  },
  {
    id: 'game-trophy',
    category: 'Gaming',
    name: 'Trophy',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="32" rx="22" ry="14" stroke="${ICON_ACCENT}" stroke-width="3" fill="none" opacity="0.12"/><ellipse cx="50" cy="32" rx="18" ry="10" stroke="${ICON_ACCENT}" stroke-width="4" fill="none" opacity="0.25"/><rect x="40" y="42" width="20" height="8" rx="2" fill="${ICON_ACCENT}" opacity="0.12"/><rect x="42" y="44" width="16" height="6" rx="1.5" fill="${ICON_ACCENT}" opacity="0.25"/><path d="M42 50 L42 70 Q50 76 58 70 L58 50" fill="${ICON_ACCENT}" opacity="0.15"/><path d="M44 50 L44 68 Q50 72 56 68 L56 50" fill="${ICON_ACCENT}" opacity="0.3"/><path d="M46 50 L46 66 Q50 70 54 66 L54 50" fill="${ICON_ACCENT}"/><rect x="42" y="72" width="16" height="4" rx="1" fill="${ICON_MUTED}" opacity="0.3"/><rect x="38" y="76" width="24" height="3" rx="1" fill="${ICON_MUTED}" opacity="0.2"/></svg>`,
  },
  {
    id: 'game-pixel-heart',
    category: 'Gaming',
    name: 'Pixel Heart',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="30" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.08"/><rect x="62" y="30" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.08"/><rect x="22" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.08"/><rect x="70" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.08"/><rect x="22" y="46" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="70" y="46" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="30" y="30" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.2"/><rect x="62" y="30" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.2"/><rect x="22" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.3"/><rect x="70" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.3"/><rect x="30" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="38" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="46" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.8"/><rect x="54" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="62" y="38" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="30" y="46" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="38" y="46" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="46" y="46" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="54" y="46" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="62" y="46" width="8" height="8" rx="1" fill="${ICON_PRIMARY}"/><rect x="38" y="54" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.8"/><rect x="46" y="54" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.6"/><rect x="54" y="54" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.8"/><rect x="46" y="62" width="8" height="8" rx="1" fill="${ICON_PRIMARY}" opacity="0.5"/></svg>`,
  },

  // ── Books & Learning ──
  {
    id: 'learning-book',
    category: 'Learning',
    name: 'Book',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="18" width="50" height="62" rx="4" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="30" y="20" width="46" height="58" rx="3" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="32" y="22" width="42" height="54" rx="2" fill="${ICON_PRIMARY}" opacity="0.2"/><rect x="34" y="24" width="38" height="50" rx="1.5" fill="${ICON_PRIMARY}"/><line x1="38" y1="34" x2="68" y2="34" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/><line x1="38" y1="42" x2="62" y2="42" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.2"/><line x1="38" y1="50" x2="56" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.15"/></svg>`,
  },
  {
    id: 'learning-lightbulb',
    category: 'Learning',
    name: 'Lightbulb',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="42" rx="18" ry="22" fill="${ICON_ACCENT}" opacity="0.08"/><ellipse cx="50" cy="42" rx="16" ry="20" fill="${ICON_ACCENT}" opacity="0.15"/><ellipse cx="50" cy="42" rx="14" ry="18" fill="${ICON_ACCENT}" opacity="0.25"/><ellipse cx="50" cy="42" rx="12" ry="16" fill="${ICON_ACCENT}"/><rect x="44" y="62" width="12" height="6" rx="2" fill="${ICON_ACCENT}" opacity="0.3"/><rect x="42" y="68" width="16" height="4" rx="1.5" fill="${ICON_ACCENT}" opacity="0.2"/><rect x="40" y="72" width="20" height="3" rx="1.5" fill="${ICON_ACCENT}" opacity="0.15"/><rect x="46" y="78" width="8" height="10" rx="2" fill="${ICON_ACCENT}" opacity="0.12"/></svg>`,
  },
  {
    id: 'learning-graduation',
    category: 'Learning',
    name: 'Graduation',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="50,20 12,44 50,68 88,44" fill="${ICON_SECONDARY}" opacity="0.08"/><polygon points="50,24 18,44 50,64 82,44" fill="${ICON_SECONDARY}" opacity="0.15"/><polygon points="50,28 24,44 50,60 76,44" fill="${ICON_SECONDARY}" opacity="0.25"/><polygon points="50,32 30,44 50,56 70,44" fill="${ICON_SECONDARY}"/><rect x="44" y="56" width="12" height="28" rx="2" fill="${ICON_MUTED}" opacity="0.3"/></svg>`,
  },
  {
    id: 'learning-pencil',
    category: 'Learning',
    name: 'Pencil',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="26,72 38,84 66,48 54,36" fill="${ICON_PRIMARY}" opacity="0.06"/><polygon points="28,70 38,80 64,46 54,36" fill="${ICON_PRIMARY}" opacity="0.12"/><polygon points="30,68 38,76 62,44 54,36" fill="${ICON_PRIMARY}" opacity="0.2"/><polygon points="32,66 38,72 60,42 54,36" fill="${ICON_PRIMARY}"/><polygon points="54,36 66,48 72,42 60,30" fill="${ICON_ACCENT}"/><rect x="26" y="72" width="12" height="8" rx="2" fill="${ICON_MUTED}" opacity="0.3"/></svg>`,
  },
  {
    id: 'learning-globe',
    category: 'Learning',
    name: 'Globe',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="46" r="28" fill="${ICON_PRIMARY}" opacity="0.06"/><circle cx="50" cy="46" r="26" fill="${ICON_PRIMARY}" opacity="0.12"/><circle cx="50" cy="46" r="24" fill="${ICON_PRIMARY}" opacity="0.2"/><circle cx="50" cy="46" r="22" fill="${ICON_PRIMARY}"/><ellipse cx="50" cy="46" rx="22" ry="10" stroke="white" stroke-width="1.5" fill="none" opacity="0.2"/><line x1="28" y1="46" x2="72" y2="46" stroke="white" stroke-width="1.5" opacity="0.15"/><line x1="50" y1="24" x2="50" y2="68" stroke="white" stroke-width="1.5" opacity="0.15"/><path d="M34 30 Q44 34 50 34 Q56 34 66 30" stroke="white" stroke-width="1.5" fill="none" opacity="0.12"/><path d="M34 62 Q44 58 50 58 Q56 58 66 62" stroke="white" stroke-width="1.5" fill="none" opacity="0.12"/><rect x="44" y="68" width="12" height="6" rx="2" fill="${ICON_MUTED}" opacity="0.25"/><rect x="40" y="74" width="20" height="4" rx="2" fill="${ICON_MUTED}" opacity="0.15"/></svg>`,
  },

  // ── Science ──
  {
    id: 'science-atom',
    category: 'Science',
    name: 'Atom',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="28" ry="8" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.08"/><ellipse cx="50" cy="50" rx="28" ry="8" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" transform="rotate(60 50 50)" opacity="0.08"/><ellipse cx="50" cy="50" rx="28" ry="8" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" transform="rotate(120 50 50)" opacity="0.08"/><ellipse cx="50" cy="50" rx="26" ry="7" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.2"/><ellipse cx="50" cy="50" rx="26" ry="7" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" transform="rotate(60 50 50)" opacity="0.2"/><ellipse cx="50" cy="50" rx="26" ry="7" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" transform="rotate(120 50 50)" opacity="0.2"/><ellipse cx="50" cy="50" rx="24" ry="6" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none"/><ellipse cx="50" cy="50" rx="24" ry="6" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="24" ry="6" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" transform="rotate(120 50 50)"/><circle cx="50" cy="50" r="5" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'science-beaker',
    category: 'Science',
    name: 'Beaker',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="36,24 56,24 60,36 60,78 28,78 28,36" fill="${ICON_PRIMARY}" opacity="0.06"/><polygon points="38,26 54,26 58,36 58,76 30,76 30,36" fill="${ICON_PRIMARY}" opacity="0.12"/><polygon points="40,28 52,28 56,36 56,74 32,74 32,36" fill="${ICON_PRIMARY}" opacity="0.2"/><polygon points="42,30 50,30 54,36 54,72 34,72 34,36" fill="${ICON_PRIMARY}"/><rect x="34" y="36" width="20" height="4" rx="1" fill="${ICON_PRIMARY}" opacity="0.3"/><path d="M34 56 Q44 60 54 56" stroke="${ICON_PRIMARY}" stroke-width="2" fill="none" opacity="0.3"/><path d="M34 66 Q44 70 54 66" stroke="${ICON_PRIMARY}" stroke-width="2" fill="none" opacity="0.2"/><circle cx="44" cy="48" r="3" fill="${ICON_ACCENT}" opacity="0.4"/></svg>`,
  },
  {
    id: 'science-dna',
    category: 'Science',
    name: 'DNA',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M38 22 Q56 34 38 50 Q20 66 38 78" stroke="${ICON_PRIMARY}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.08"/><path d="M62 22 Q44 34 62 50 Q80 66 62 78" stroke="${ICON_PRIMARY}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.08"/><path d="M38 24 Q54 36 38 50 Q22 64 38 76" stroke="${ICON_PRIMARY}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.2"/><path d="M62 24 Q46 36 62 50 Q78 64 62 76" stroke="${ICON_PRIMARY}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.2"/><path d="M38 26 Q52 38 38 50 Q24 62 38 74" stroke="${ICON_PRIMARY}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M62 26 Q48 38 62 50 Q76 62 62 74" stroke="${ICON_PRIMARY}" stroke-width="3" stroke-linecap="round" fill="none"/><line x1="28" y1="38" x2="72" y2="38" stroke="${ICON_MUTED}" stroke-width="1.5" opacity="0.2"/><line x1="28" y1="62" x2="72" y2="62" stroke="${ICON_MUTED}" stroke-width="1.5" opacity="0.2"/></svg>`,
  },
  {
    id: 'science-microscope',
    category: 'Science',
    name: 'Microscope',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="38" y="24" width="24" height="30" rx="4" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="40" y="26" width="20" height="26" rx="3" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="42" y="28" width="16" height="22" rx="2" fill="${ICON_PRIMARY}" opacity="0.2"/><rect x="44" y="30" width="12" height="18" rx="1.5" fill="${ICON_PRIMARY}"/><rect x="46" y="48" width="8" height="4" rx="1" fill="${ICON_MUTED}" opacity="0.3"/><rect x="42" y="52" width="16" height="6" rx="1.5" fill="${ICON_MUTED}" opacity="0.2"/><rect x="44" y="58" width="12" height="20" rx="2" fill="${ICON_MUTED}" opacity="0.12"/><rect x="40" y="78" width="20" height="4" rx="2" fill="${ICON_MUTED}" opacity="0.15"/></svg>`,
  },
  {
    id: 'science-calc',
    category: 'Science',
    name: 'Calculator',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="18" width="44" height="64" rx="6" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="30" y="20" width="40" height="60" rx="4" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="32" y="22" width="36" height="56" rx="3" fill="${ICON_PRIMARY}" opacity="0.2"/><rect x="34" y="24" width="32" height="52" rx="2" fill="${ICON_PRIMARY}"/><rect x="38" y="28" width="24" height="14" rx="2" fill="${ICON_ACCENT}"/><text x="50" y="39" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${'</text>'}<rect x="38" y="48" width="8" height="8" rx="1" fill="${ICON_ACCENT}" opacity="0.4"/><rect x="50" y="48" width="8" height="8" rx="1" fill="${ICON_ACCENT}" opacity="0.4"/><rect x="62" y="48" width="8" height="8" rx="1" fill="${ICON_ACCENT}" opacity="0.4"/><rect x="38" y="60" width="8" height="8" rx="1" fill="${ICON_ACCENT}" opacity="0.3"/><rect x="50" y="60" width="8" height="8" rx="1" fill="${ICON_ACCENT}" opacity="0.3"/><rect x="62" y="60" width="8" height="8" rx="1" fill="${ICON_ACCENT}" opacity="0.3"/><rect x="50" y="72" width="8" height="8" rx="1" fill="${ICON_ACCENT}" opacity="0.2"/><rect x="62" y="72" width="8" height="8" rx="1" fill="${ICON_ACCENT}" opacity="0.2"/></svg>`,
  },

  // ── Sports ──
  {
    id: 'sport-soccer',
    category: 'Sports',
    name: 'Soccer',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="${ICON_PRIMARY}" opacity="0.06"/><circle cx="50" cy="50" r="28" fill="${ICON_PRIMARY}" opacity="0.12"/><circle cx="50" cy="50" r="26" fill="${ICON_PRIMARY}" opacity="0.2"/><circle cx="50" cy="50" r="24" fill="${ICON_PRIMARY}"/><polygon points="50,32 58,46 74,46 62,56 66,72 50,62 34,72 38,56 26,46 42,46" fill="white" opacity="0.15"/><polygon points="50,36 56,47 68,47 60,55 62,66 50,58 38,66 40,55 32,47 44,47" fill="white" opacity="0.2"/><polygon points="50,40 54,48 62,48 58,54 60,62 50,56 40,62 42,54 38,48 46,48" fill="white" opacity="0.25"/></svg>`,
  },
  {
    id: 'sport-basketball',
    category: 'Sports',
    name: 'Basketball',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="${ICON_ACCENT}" opacity="0.06"/><circle cx="50" cy="50" r="28" fill="${ICON_ACCENT}" opacity="0.12"/><circle cx="50" cy="50" r="26" fill="${ICON_ACCENT}" opacity="0.18"/><circle cx="50" cy="50" r="24" fill="${ICON_ACCENT}"/><path d="M32 36 Q50 50 68 36" stroke="white" stroke-width="2" fill="none" opacity="0.2"/><path d="M32 64 Q50 50 68 64" stroke="white" stroke-width="2" fill="none" opacity="0.2"/><line x1="50" y1="26" x2="50" y2="74" stroke="white" stroke-width="1.5" opacity="0.15"/><line x1="26" y1="50" x2="74" y2="50" stroke="white" stroke-width="1.5" opacity="0.15"/></svg>`,
  },
  {
    id: 'sport-running',
    category: 'Sports',
    name: 'Running',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="44" cy="28" r="8" fill="${ICON_PRIMARY}" opacity="0.12"/><circle cx="44" cy="28" r="6" fill="${ICON_PRIMARY}" opacity="0.25"/><circle cx="44" cy="28" r="4" fill="${ICON_PRIMARY}"/><path d="M36 36 L44 44 L48 60 L38 80" stroke="${ICON_PRIMARY}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.12"/><path d="M44 44 L60 40 L72 48" stroke="${ICON_PRIMARY}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.12"/><path d="M36 38 L44 46 L48 62 L38 80" stroke="${ICON_PRIMARY}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.25"/><path d="M44 46 L60 42 L72 50" stroke="${ICON_PRIMARY}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.25"/><path d="M36 40 L44 48 L48 64 L38 82" stroke="${ICON_PRIMARY}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M44 48 L60 44 L72 52" stroke="${ICON_PRIMARY}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M44 36 L52 52 L44 70" stroke="${ICON_PRIMARY}" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`,
  },
  {
    id: 'sport-medal',
    category: 'Sports',
    name: 'Medal',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="54" r="22" fill="${ICON_ACCENT}" opacity="0.06"/><circle cx="50" cy="54" r="20" fill="${ICON_ACCENT}" opacity="0.12"/><circle cx="50" cy="54" r="18" fill="${ICON_ACCENT}" opacity="0.2"/><circle cx="50" cy="54" r="16" fill="${ICON_ACCENT}"/><circle cx="50" cy="54" r="10" fill="white" opacity="0.2"/><text x="50" y="59" text-anchor="middle" fill="${ICON_ACCENT}" font-size="12" font-weight="bold">${'</text>'}<path d="M34 18 L42 40" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.15"/><path d="M66 18 L58 40" stroke="${ICON_ACCENT}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.15"/><path d="M36 18 L42 38" stroke="${ICON_ACCENT}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.3"/><path d="M64 18 L58 38" stroke="${ICON_ACCENT}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.3"/><path d="M38 18 L44 36" stroke="${ICON_ACCENT}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M62 18 L56 36" stroke="${ICON_ACCENT}" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="50" cy="18" r="4" fill="${ICON_ACCENT}" opacity="0.3"/></svg>`,
  },

  // ── Music ──
  {
    id: 'music-note',
    category: 'Music',
    name: 'Note',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="68" r="14" fill="${ICON_PRIMARY}" opacity="0.06"/><circle cx="40" cy="68" r="12" fill="${ICON_PRIMARY}" opacity="0.12"/><circle cx="40" cy="68" r="10" fill="${ICON_PRIMARY}" opacity="0.2"/><circle cx="40" cy="68" r="8" fill="${ICON_PRIMARY}"/><rect x="48" y="32" width="28" height="40" rx="4" fill="${ICON_PRIMARY}" opacity="0.08"/><rect x="50" y="34" width="24" height="36" rx="3" fill="${ICON_PRIMARY}" opacity="0.15"/><rect x="52" y="36" width="20" height="32" rx="2" fill="${ICON_PRIMARY}" opacity="0.25"/><rect x="54" y="38" width="16" height="28" rx="1.5" fill="${ICON_PRIMARY}"/><path d="M54 44 L70 40" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/></svg>`,
  },
  {
    id: 'music-headphones',
    category: 'Music',
    name: 'Headphones',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26 52 C26 34 38 20 50 20 C62 20 74 34 74 52" stroke="${ICON_PRIMARY}" stroke-width="5" fill="none" opacity="0.08"/><path d="M26 52 C26 36 38 24 50 24 C62 24 74 36 74 52" stroke="${ICON_PRIMARY}" stroke-width="5" fill="none" opacity="0.15"/><path d="M26 52 C26 38 38 28 50 28 C62 28 74 38 74 52" stroke="${ICON_PRIMARY}" stroke-width="5" fill="none" opacity="0.25"/><path d="M26 52 C26 40 38 32 50 32 C62 32 74 40 74 52" stroke="${ICON_PRIMARY}" stroke-width="5" fill="none"/><rect x="18" y="48" width="12" height="24" rx="5" fill="${ICON_PRIMARY}"/><rect x="70" y="48" width="12" height="24" rx="5" fill="${ICON_PRIMARY}"/><rect x="18" y="62" width="12" height="10" rx="3" fill="${ICON_SECONDARY}"/><rect x="70" y="62" width="12" height="10" rx="3" fill="${ICON_SECONDARY}"/></svg>`,
  },
  {
    id: 'music-piano',
    category: 'Music',
    name: 'Piano',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="24" width="60" height="56" rx="6" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="22" y="26" width="56" height="52" rx="4" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="24" y="28" width="52" height="48" rx="3" fill="${ICON_PRIMARY}" opacity="0.2"/><rect x="26" y="30" width="48" height="44" rx="2" fill="${ICON_PRIMARY}"/><rect x="26" y="30" width="8" height="24" rx="1" fill="white" opacity="0.2"/><rect x="36" y="30" width="8" height="24" rx="1" fill="white" opacity="0.2"/><rect x="46" y="30" width="8" height="24" rx="1" fill="white" opacity="0.2"/><rect x="56" y="30" width="8" height="24" rx="1" fill="white" opacity="0.2"/><rect x="66" y="30" width="8" height="24" rx="1" fill="white" opacity="0.2"/><rect x="30" y="30" width="8" height="24" rx="1" fill="${ICON_SECONDARY}" opacity="0.3"/><rect x="50" y="30" width="8" height="24" rx="1" fill="${ICON_SECONDARY}" opacity="0.3"/><rect x="70" y="30" width="8" height="24" rx="1" fill="${ICON_SECONDARY}" opacity="0.3"/><line x1="30" y1="54" x2="74" y2="54" stroke="${ICON_MUTED}" stroke-width="1.5" opacity="0.2"/></svg>`,
  },

  // ── Minimal Geometric ──
  {
    id: 'geo-dots',
    category: 'Geometric',
    name: 'Dots',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="5" fill="${ICON_PRIMARY}" opacity="0.08"/><circle cx="50" cy="30" r="5" fill="${ICON_PRIMARY}" opacity="0.12"/><circle cx="70" cy="30" r="5" fill="${ICON_PRIMARY}" opacity="0.08"/><circle cx="30" cy="50" r="5" fill="${ICON_PRIMARY}" opacity="0.12"/><circle cx="50" cy="50" r="5" fill="${ICON_PRIMARY}" opacity="0.2"/><circle cx="70" cy="50" r="5" fill="${ICON_PRIMARY}" opacity="0.12"/><circle cx="30" cy="70" r="5" fill="${ICON_PRIMARY}" opacity="0.08"/><circle cx="50" cy="70" r="5" fill="${ICON_PRIMARY}" opacity="0.12"/><circle cx="70" cy="70" r="5" fill="${ICON_PRIMARY}" opacity="0.08"/><circle cx="50" cy="50" r="14" fill="${ICON_PRIMARY}" opacity="0.15"/><circle cx="50" cy="50" r="8" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'geo-grid',
    category: 'Geometric',
    name: 'Grid',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="18" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="42" y="18" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="66" y="18" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="18" y="42" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="42" y="42" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="66" y="42" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="18" y="66" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="42" y="66" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="66" y="66" width="16" height="16" rx="3" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="40" y="40" width="20" height="20" rx="4" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'geo-triangles',
    category: 'Geometric',
    name: 'Triangles',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="50,16 70,44 30,44" fill="${ICON_PRIMARY}" opacity="0.08"/><polygon points="50,38 70,66 30,66" fill="${ICON_PRIMARY}" opacity="0.12"/><polygon points="50,60 70,88 30,88" fill="${ICON_PRIMARY}" opacity="0.08"/><polygon points="50,24 64,44 36,44" fill="${ICON_PRIMARY}" opacity="0.2"/><polygon points="50,44 64,64 36,64" fill="${ICON_PRIMARY}" opacity="0.3"/><polygon points="50,66 64,86 36,86" fill="${ICON_PRIMARY}" opacity="0.2"/><polygon points="50,32 58,44 42,44" fill="${ICON_PRIMARY}"/><polygon points="50,52 58,64 42,64" fill="${ICON_PRIMARY}"/><polygon points="50,74 58,86 42,86" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'geo-rings',
    category: 'Geometric',
    name: 'Rings',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="38" cy="40" r="16" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none" opacity="0.08"/><circle cx="62" cy="40" r="16" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none" opacity="0.08"/><circle cx="50" cy="60" r="16" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none" opacity="0.08"/><circle cx="38" cy="40" r="14" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none" opacity="0.2"/><circle cx="62" cy="40" r="14" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none" opacity="0.2"/><circle cx="50" cy="60" r="14" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none" opacity="0.2"/><circle cx="38" cy="40" r="12" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none"/><circle cx="62" cy="40" r="12" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none"/><circle cx="50" cy="60" r="12" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none"/></svg>`,
  },
  {
    id: 'geo-circles',
    category: 'Geometric',
    name: 'Circles',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="34" stroke="${ICON_PRIMARY}" stroke-width="2" fill="none" opacity="0.06"/><circle cx="50" cy="50" r="26" stroke="${ICON_PRIMARY}" stroke-width="2" fill="none" opacity="0.12"/><circle cx="50" cy="50" r="18" stroke="${ICON_PRIMARY}" stroke-width="3" fill="none" opacity="0.25"/><circle cx="50" cy="50" r="10" stroke="${ICON_PRIMARY}" stroke-width="4" fill="none"/><circle cx="50" cy="50" r="3" fill="${ICON_PRIMARY}"/></svg>`,
  },
  {
    id: 'geo-cross',
    category: 'Geometric',
    name: 'Cross',
    svg: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="18" width="20" height="64" rx="4" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="18" y="40" width="64" height="20" rx="4" fill="${ICON_PRIMARY}" opacity="0.06"/><rect x="40" y="20" width="20" height="60" rx="4" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="20" y="40" width="60" height="20" rx="4" fill="${ICON_PRIMARY}" opacity="0.12"/><rect x="40" y="24" width="20" height="52" rx="4" fill="${ICON_PRIMARY}"/><rect x="24" y="40" width="52" height="20" rx="4" fill="${ICON_PRIMARY}"/></svg>`,
  },
];

const iconMap = Object.fromEntries(profileIcons.map((icon) => [icon.id, icon]));

export function getProfileIconById(id) {
  return iconMap[id] || null;
}

export const iconCategories = [...new Set(profileIcons.map((icon) => icon.category))];
