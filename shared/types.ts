export type ArenaId = 'parliament' | 'jantar_mantar' | 'indian_street' | 'rally_stage';

export type CharacterId =
  | 'vikas_guru'
  | 'yuva_prince'
  | 'muffler_man'
  | 'didi_storm'
  | 'thalaivaa_boss'
  | 'bulldozer_baba'
  | 'chara_king'
  | 'chanakya_x'
  | 'hakla'
  | 'samrat_ordinance';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameMode = 'single_ai' | 'campaign' | 'local_2p' | 'online';

export type VoiceSlot =
  | 'select'
  | 'intro'
  | 'attack1'
  | 'attack2'
  | 'hit'
  | 'win'
  | 'lose'
  | 'special';

export type FighterAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'crouch'
  | 'block'
  | 'punch'
  | 'kick'
  | 'uppercut'
  | 'grab'
  | 'special'
  | 'hitstun'
  | 'knockdown'
  | 'intro'
  | 'victory'
  | 'defeat';

export type MovePhase = 'none' | 'startup' | 'active' | 'recovery';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  sprint: boolean;
  punch: boolean;
  kick: boolean;
  block: boolean;
  grab: boolean;
  special: boolean;
  seq?: number;
}

export type ProjectileKind =
  | 'speech_wave'
  | 'gold_potato'
  | 'broom_cyclone'
  | 'chappal_spin'
  | 'cinema_coin'
  | 'bulldozer_dash'
  | 'lantern_fire'
  | 'chess_orb'
  | 'hakla_sonic_wave'
  | 'ordinance_meteor';

export interface ProjectileState {
  id: string;
  ownerIndex: 0 | 1;
  characterId: CharacterId;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  ttlFrames: number;
  active: boolean;
}

export interface CombatEvent {
  type:
    | 'hit'
    | 'block'
    | 'crit'
    | 'grab'
    | 'special_activate'
    | 'ko'
    | 'round_start'
    | 'round_end'
    | 'jump'
    | 'whiff'
    | 'voice';
  playerIndex?: 0 | 1;
  characterId?: CharacterId;
  x?: number;
  y?: number;
  damage?: number;
  combo?: number;
  label?: string;
  voiceSlot?: VoiceSlot;
}

export interface FighterState {
  playerIndex: 0 | 1;
  characterId: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  meter: number;
  action: FighterAction;
  actionFrame: number;
  movePhase: MovePhase;
  moveHitConnected: boolean;
  comboStep: number;
  comboHitsReceived: number;
  comboCounter: number;
  comboTimer: number;
  hitstunFrames: number;
  blockstunFrames: number;
  invulnFrames: number;
  superArmorFrames: number;
  grounded: boolean;
  crouching: boolean;
  blocking: boolean;
  hurtbox: Box;
  hitbox: Box | null;
  roundsWon: number;
  lastInput: InputState;
  prevPressed: {
    punch: boolean;
    kick: boolean;
    grab: boolean;
    special: boolean;
    up: boolean;
  };
  bossPhase?: 1 | 2;
}

export type MatchPhase = 'intro' | 'countdown' | 'fighting' | 'round_over' | 'match_over';

export interface SpecialBanner {
  playerIndex: 0 | 1;
  characterId: CharacterId;
  title: string;
  subtitle: string;
  framesLeft: number;
}

export interface MatchState {
  tick: number;
  phase: MatchPhase;
  phaseFrames: number;
  countdownSeconds: number;
  round: number;
  maxRounds: number;
  timerFrames: number;
  arenaId: ArenaId;
  isBossFight: boolean;
  specialBanner: SpecialBanner | null;
  hitstopFrames: number;
  winnerIndex: 0 | 1 | 'draw' | null;
  fighters: [FighterState, FighterState];
  projectiles: ProjectileState[];
  events: CombatEvent[];
}

export interface CharacterStats {
  maxHp: number;
  walkSpeed: number;
  runSpeed: number;
  jumpVelocity: number;
  strength: number; // Multiplier around 0.85 - 1.25
  speedRating: number; // 1 - 10 UI rating
  powerRating: number; // 1 - 10 UI rating
  defenseRating: number; // 1 - 10 UI rating
  specialRating: number; // 1 - 10 UI rating
}

export interface CharacterPalette {
  skin: string;
  primary: string;
  secondary: string;
  accent: string;
  hair: string;
  aura: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  parodyTag: string;
  bio: string;
  isBoss?: boolean;
  specialName: string;
  specialSubtitle: string;
  specialKind: 'projectile' | 'dash_slam' | 'barrage' | 'meteor';
  specialDurationFrames: number;
  projectileKind: ProjectileKind;
  portraitImage?: string;
  stats: CharacterStats;
  palette: CharacterPalette;
  propType: 'mic' | 'gold_bar' | 'broom' | 'chappal' | 'shades' | 'bulldozer' | 'lantern' | 'chess' | 'megaphone' | 'scepter';
  headgear: 'beard_glasses' | 'youth_hair' | 'gandhi_cap_muffler' | 'saree_bun' | 'cinema_shades' | 'saffron_bald' | 'rustic_hair' | 'tactical_beard' | 'hakla_photo' | 'golden_crown';
  voiceLines: Record<VoiceSlot, string>;
}

export interface ArenaDef {
  id: ArenaId;
  name: string;
  subtitle: string;
  description: string;
  skyTop: string;
  skyBottom: string;
  floorColor: string;
  trimColor: string;
  accentColor: string;
}

export interface PlayerRoomInfo {
  slot: 0 | 1;
  socketId: string;
  playerId: string;
  displayName: string;
  characterId: CharacterId;
  ready: boolean;
  connected: boolean;
}

export interface RoomState {
  code: string;
  hostPlayerId: string;
  arenaId: ArenaId;
  status: 'lobby' | 'playing' | 'finished';
  players: [PlayerRoomInfo | null, PlayerRoomInfo | null];
  rematchVotes: [boolean, boolean];
}

export interface PlayerProfile {
  id: string;
  username: string;
  wins: number;
  losses: number;
  streak: number;
  favoriteCharacter: CharacterId;
  campaignCleared: boolean;
  createdAt: string;
}

export interface MatchRecord {
  id: string;
  mode: GameMode;
  arenaId: ArenaId;
  p1Name: string;
  p2Name: string;
  p1Char: CharacterId;
  p2Char: CharacterId;
  winnerSlot: 0 | 1 | 'draw';
  p1Rounds: number;
  p2Rounds: number;
  durationSec: number;
  playedAt: string;
}
