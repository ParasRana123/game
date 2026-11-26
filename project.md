# Build a Complete Browser-Based 2D Political Fighting Game

Build a fully playable, polished, browser-based 2D fighting game inspired by classic arcade games like Mortal Kombat and Street Fighter, with an Indian political satire theme.

The game should have its own identity, original UI, original characters, animations, combat mechanics, and multiplayer functionality.

## 1. Overall Concept

Create an arcade-style fighting game where players select funny, fictional Indian political characters and fight against each other in different Indian-themed arenas.

The experience should be humorous, entertaining, competitive, and visually engaging.

The game must be fully playable, not just a static frontend prototype.

## 2. Landing Page

Create a visually impressive homepage featuring:

- Game logo and branding.
- Animated fighting characters in the background.
- A prominent PLAY NOW button.
- Single Player mode.
- Play With a Friend mode.
- Character selection.
- How to Play section.
- Game instructions and keyboard controls.
- Responsive design for desktop and mobile.

Use a dark arcade-inspired theme with bold typography, vibrant colors, glowing buttons, and smooth transitions.

## 3. Game Modes

Implement the following modes:

### Single Player
- Player selects a character.
- Player fights against an AI-controlled opponent.
- Three difficulty levels: Easy, Medium, Hard.
- Implement actual AI behavior such as approaching, attacking, blocking, jumping, and dodging.
- Add a progressive campaign with multiple opponents and a final boss.

### Multiplayer
Implement real-time online multiplayer using WebSockets.

Features:
- Create Room.
- Join Room using a unique room code.
- Character selection for both players.
- Ready-up mechanism.
- Real-time movement synchronization.
- Attack and defense synchronization.
- Health synchronization.
- Match countdown.
- Match result screen.
- Rematch functionality.
- Handle player disconnections and reconnections.

Use an authoritative server-side game state to prevent cheating and inconsistent game states.

## 4. Character Selection

Create at least 8 original fictional political satire characters.

Each character should have:
- Unique name.
- Unique appearance.
- Different health, speed, strength, and special attack attributes.
- Unique attack animations.
- Unique special moves.
- Character introduction animation.

Make the characters visually distinctive and humorous.

Do not use copyrighted character artwork or celebrity photographs. Use original cartoon-style character designs.

## 5. Combat Mechanics

Implement an actual 2D fighting system with:

- Walking and running.
- Jumping.
- Crouching.
- Punching.
- Kicking.
- Blocking.
- Grabbing.
- Special attacks.
- Combo attacks.
- Knockback.
- Hit detection.
- Collision detection.
- Health bars.
- Special attack energy meter.
- Victory and defeat animations.

Every attack must have proper startup, active, and recovery frames.

Implement hitboxes and hurtboxes instead of relying on basic distance checks.

Characters should have proper movement physics, gravity, jump velocity, and arena boundaries.

## 6. Arenas

Create at least 4 visually distinct fighting arenas:

1. Indian Parliament-inspired arena.
2. Jantar Mantar-inspired protest arena.
3. A busy Indian street.
4. A fictional political rally stage.

Each arena should have animated backgrounds, environmental effects, and unique visual elements.

## 7. Boss Fight Mode

Add a special campaign mode called FINAL SHOWDOWN.

Features:
- Multiple increasingly difficult opponents.
- Unique boss character.
- Special boss abilities.
- Cinematic introduction.
- Boss health bar.
- Victory celebration.
- Campaign completion screen.

## 8. Game UI and UX

During gameplay, display:

- Player 1 and Player 2 character names.
- Health bars.
- Timer.
- Special attack meter.
- Round indicator.
- Combo counter.
- Pause button.

Add polished animations for:
- Character selection.
- Match countdown.
- Fight announcement.
- Damage feedback.
- Critical hits.
- Round victory.
- Game over.

Include appropriate sound effects and background music using original or properly licensed assets.

## 9. Suggested Technology Stack

Frontend:
- React + TypeScript.
- Vite.
- Phaser 3 for the 2D game engine.
- Tailwind CSS for UI.
- Framer Motion for interface animations.

Backend:
- Node.js.
- Express.js.
- Socket.IO for real-time multiplayer.
- PostgreSQL for persistent player profiles, match history, and leaderboards.

Game architecture:
- Client-side rendering through Phaser.
- Server-authoritative multiplayer state.
- Fixed-timestep game simulation.
- Interpolation and client-side prediction for smooth gameplay.
- Proper room and session management.

## 10. Code Architecture

Keep the code modular and maintainable.

Separate:
- Game engine.
- Character management.
- Combat system.
- Physics and collision detection.
- AI controller.
- Multiplayer networking.
- Room management.
- Authentication.
- UI components.
- Audio management.

Avoid putting the entire game inside one React component.

## 11. Important Implementation Requirements

- All buttons and interactions must work.
- Implement actual playable combat mechanics.
- Multiplayer must work between two different devices over the internet.
- Do not simulate multiplayer locally.
- Do not use placeholder buttons.
- Do not create fake health bars or fake combat animations.
- Ensure characters can actually attack, take damage, block, and win or lose.
- Implement proper loading, error, and disconnection states.
- Make the game responsive.
- Optimize rendering and networking for smooth gameplay.

## 12. Development Workflow

Build the application in phases:

Phase 1: Landing page and game UI.

Phase 2: Game engine, character movement, physics, and collision detection.

Phase 3: Combat mechanics, attacks, combos, and animations.

Phase 4: Single-player AI and boss fights.

Phase 5: Multiplayer using Socket.IO.

Phase 6: Sound effects, visual polish, testing, and optimization.

First establish a working playable single-player game. Then integrate multiplayer without breaking the existing combat system.

Do not stop after generating the UI. Continue implementing and testing until the core game loop works end to end.

## 13. Character-Specific Voice Lines & Special Attack Sounds

Every character must have its own unique voice, catchphrases, and special attack sound effects.

This is a core gameplay feature, not an optional cosmetic feature.

### Character-Specific Audio

- Every character should have a unique voice identity.
- Each character must have custom voice lines for:
  - Character selection.
  - Match introduction.
  - Normal punch and kick attacks.
  - Taking damage.
  - Winning and losing.
  - Activating their special attack.
- Most importantly, every character's special attack must trigger its own signature voice line or audio clip.

### Example: Narendra Modi-Inspired Character

For the Modi-inspired satirical character:

- On activating the special attack, play the voice line:

  "Angein Ghatram Nainave Aatram Nyaye Na Rajyam....."

- Play the voice line with dramatic delivery.
- Add echo and reverb effects.
- Synchronize the voice line with the special attack animation.
- Add dramatic background music and visual effects.
- Display the special attack name on the screen.

### Other Characters

Create unique, humorous, character-specific voice lines for every other fictional political parody character as well.

Each character must have a completely different signature audio identity.

### Audio Implementation Requirements

- Use individual audio assets for every character.
- Trigger the correct audio clip when a special attack is activated.
- Ensure audio synchronization with character animations.
- Add volume controls and mute options.
- Prevent audio clips from overlapping uncontrollably.
- Support sound effects, voice lines, and background music as separate audio channels.
- Use original, licensed, or user-provided voice recordings. Do not clone real people's voices without authorization.

**Important:** Never use the same generic special attack sound for all characters. Every character must have a recognizable and unique special attack audio experience.

**Final goal:** Deliver a polished, fully functional browser-based 2D fighting game that users can play against AI or against their friends online.
