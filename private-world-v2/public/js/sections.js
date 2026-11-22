// Museum gallery sections. Shared by the 3D museum (museum.js) and the Photos manager (gallery.js).
// KEEP IN SYNC with server/photos.js (SECTION_CAPS). Section 5 ("Our Art") receives hung drawings.
export const SECTIONS = [
  { name: 'Memories',   roman: 'I',   cap: 8, wall: 'N', c: -27.2, color: '#2d4a6b', glow: '#6fb5ff' },
  { name: 'Adventures', roman: 'II',  cap: 8, wall: 'N', c: 0,     color: '#6b2d3e', glow: '#ff6f8f' },
  { name: 'Together',   roman: 'III', cap: 8, wall: 'N', c: 27.2,  color: '#2d5a4a', glow: '#6fffc0' },
  { name: 'Moments',    roman: 'IV',  cap: 8, wall: 'W', c: -12,   color: '#5a4a2d', glow: '#ffd76f' },
  { name: 'Smiles',     roman: 'V',   cap: 8, wall: 'E', c: -12,   color: '#4a2d6b', glow: '#c49bff' },
  { name: 'Our Art',    roman: 'VI',  cap: 6, wall: 'E', c: 12.5,  color: '#8a5a2d', glow: '#ffb36f', art: true }
];
export const ART_SECTION = 5;
export const sectionLabel = i => `${SECTIONS[i].roman} · ${SECTIONS[i].name}`;
