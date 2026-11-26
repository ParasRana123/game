import { ArenaDef, ArenaId } from './types.js';

export const ARENAS: Record<ArenaId, ArenaDef> = {
  parliament: {
    id: 'parliament',
    name: 'Sansad Bhavan Rotunda',
    subtitle: 'The Grand Red-Sandstone Debate Pit',
    description: 'Circular sandstone pillars, green Lok Sabha carpet, flying ordinance bills, and rowdy backbenchers.',
    skyTop: '#240b0e',
    skyBottom: '#5a1e1b',
    floorColor: '#14532d',
    trimColor: '#d97706',
    accentColor: '#f59e0b',
  },
  jantar_mantar: {
    id: 'jantar_mantar',
    name: 'Jantar Mantar Protest Square',
    subtitle: 'Sundials, Megaphones & Hunger-Strike Tents',
    description: 'Ancient terracotta sundial monuments surrounded by protest placards, loudspeakers, and cheering activists.',
    skyTop: '#0f172a',
    skyBottom: '#9a3412',
    floorColor: '#78350f',
    trimColor: '#fbbf24',
    accentColor: '#fb7185',
  },
  indian_street: {
    id: 'indian_street',
    name: 'Chandni Chowk Bazaar',
    subtitle: 'Chai Stalls, Rickshaws & Neon Chaos',
    description: 'Bustling old-city street with idling auto-rickshaws, steaming masala chai, marigold garlands, and power lines.',
    skyTop: '#1e1b4b',
    skyBottom: '#4c1d95',
    floorColor: '#334155',
    trimColor: '#22c55e',
    accentColor: '#facc15',
  },
  rally_stage: {
    id: 'rally_stage',
    name: 'Maha Rally Maidan',
    subtitle: 'Mega LED Stage & Helicopter Landing Zone',
    description: 'Nighttime mega-rally arena with sweeping spotlights, confetti cannons, fluttering party flags, and a hovering chopper.',
    skyTop: '#020617',
    skyBottom: '#1e293b',
    floorColor: '#1e293b',
    trimColor: '#ef4444',
    accentColor: '#38bdf8',
  },
};

export const ARENA_LIST: ArenaDef[] = Object.values(ARENAS);
