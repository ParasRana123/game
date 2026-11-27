# NETA KOMBAT: Sansad Showdown

A full-featured, browser-based 2D political satire arcade fighting game built with **Phaser 3**, **React + TypeScript**, **Tailwind CSS**, **Framer Motion**, **Express.js**, **Socket.IO**, and **PostgreSQL** (with automatic persistent JSON fallback when `DATABASE_URL` is not configured).

## Features

- **8 Original Satirical Fighters + 1 Final Boss (`Samrat Ordinance`)**: Distinct stats, articulated cartoon designs, custom props, and unique Signature Special Attacks.
- **Per-Character Voice Lines & Special Attack Audio**: Every character has individual `.wav` voice clips for select, intro, attacks, damage, win, lose, and special attacks — including **Vikas Guru's** `"Angein Ghatram Nainave Aatram Nyaye Na Rajyam"` with echo, cathedral reverb, and shankh/brass sting.
- **3-Channel Audio Mixer**: Independent Master, Music (BGM), Voice Lines, and Combat SFX sliders & mute controls, with anti-overlap voice gating and BGM ducking.
- **4 Animated Indian Arenas**: Sansad Bhavan Rotunda, Jantar Mantar Protest Square, Chandni Chowk Bazaar, and Maha Rally Maidan.
- **True 2D Fighting Mechanics**: Fixed-timestep 60Hz deterministic simulation, startup/active/recovery frame data, AABB hitboxes & hurtboxes, chain combos, blocking, unblockable throws, gravity/jumping, and special energy meters.
- **Single Player & FINAL SHOWDOWN Campaign**: Easy/Medium/Hard AI plus a 5-stage progressive ladder culminating in a multi-phase Boss Fight with cinematic intro.
- **Real-Time Online Multiplayer (Socket.IO)**: Authoritative server simulation, 6-character room codes, live character & arena sync, ready-up, rematch voting, and 25-second disconnect/reconnect grace handling.
- **Local 2P Couch VS & Mobile Touch Controls**: Shared-keyboard 2P battle and responsive on-screen touch arcade controls.

## Controls

| Action | Player 1 (or Single / Online) | Player 2 (Local 2P) |
| --- | --- | --- |
| Move | `A` / `D` (or `←` / `→`) | `←` / `→` |
| Sprint | `Shift` + Move | `Numpad 0` + Move |
| Jump / Crouch | `W` / `S` | `↑` / `↓` |
| Light Punch | `F` | `J` |
| Heavy Kick | `G` | `K` |
| Anti-Air Uppercut | `W + F` | `↑ + J` |
| Block | `H` (or hold Back) | `L` |
| Political Throw | `R` | `U` |
| Signature Special (100% Meter) | `T` | `I` |
| Hitbox Debug View | `F9` | `F9` |

## Running Locally

```bash
npm install
npm run dev
```

- Frontend (Vite): `http://localhost:5173`
- Backend (Express + Socket.IO): `http://localhost:3001`

### Production Build

```bash
npm run build
npm start
```

### PostgreSQL (Optional)

Set `DATABASE_URL=postgres://user:pass@localhost:5432/neta_kombat` to persist profiles and match history in PostgreSQL (`server/db/schema.sql`). When unset, the server automatically uses `server/data/db.json`.

### Regenerating Character Voices & Audio

```bash
python scripts/generate_audio.py
```
