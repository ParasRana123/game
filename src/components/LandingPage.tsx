import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Swords,
  Users,
  Crown,
  Trophy,
  BookOpen,
  Gamepad2,
  Volume2,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { CHARACTERS, PLAYABLE_CHARACTERS, BOSS_CHARACTER } from '@shared/characters';
import { ARENA_LIST } from '@shared/arenas';
import { CharacterId } from '@shared/types';
import { AudioManager } from '@/audio/AudioManager';
import { drawShadedCapsule, shadeHex } from '@/game/rendering/CanvasArtHelpers';
import { paintDetailedHeadCanvas } from '@/game/rendering/FighterHeadBaker';
import { FighterPortrait } from './FighterPortrait';
import { AudioControls } from './AudioControls';

interface LandingPageProps {
  playerName: string;
  onPlayNow: () => void;
  onStartSinglePlayer: () => void;
  onStartCampaign: () => void;
  onStartOnlineMultiplayer: () => void;
  onStartLocal2P: () => void;
  onOpenHowToPlay: () => void;
  onOpenLeaderboard: () => void;
  onQuickSelectChar: (charId: CharacterId) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  playerName,
  onPlayNow,
  onStartSinglePlayer,
  onStartCampaign,
  onStartOnlineMultiplayer,
  onStartLocal2P,
  onOpenHowToPlay,
  onOpenLeaderboard,
  onQuickSelectChar,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [friendMenuOpen, setFriendMenuOpen] = useState(false);
  const [previewChar, setPreviewChar] = useState<CharacterId>('vikas_guru');

  // Animated background sparring fighters canvas (2.5D shaded Mitron vs Muffler Man)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p1Head = paintDetailedHeadCanvas(CHARACTERS.vikas_guru, 'fierce', 120);
    const p2Head = paintDetailedHeadCanvas(CHARACTERS.muffler_man, 'fierce', 120);

    let raf = 0;
    const render = (tMs: number) => {
      const t = tMs / 1000;
      const w = (canvas.width = canvas.clientWidth);
      const h = (canvas.height = canvas.clientHeight);

      ctx.clearRect(0, 0, w, h);

      // Subtle arena grid floor
      const floorY = h * 0.84;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(w, floorY);
      ctx.stroke();

      const p1x = w * 0.27 + Math.sin(t * 1.9) * 58;
      const p1y = floorY - Math.abs(Math.sin(t * 2.8)) * 26;
      const p1Attack = Math.sin(t * 5.2) > 0.6;

      const p2x = w * 0.73 - Math.sin(t * 1.9) * 58;
      const p2y = floorY - Math.abs(Math.cos(t * 2.5)) * 30;
      const p2Attack = Math.cos(t * 4.8) > 0.62;

      const drawSparFighter = (
        x: number,
        y: number,
        dir: number,
        headImg: HTMLCanvasElement,
        primary: string,
        secondary: string,
        accent: string,
        attacking: boolean
      ) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir, 1);
        ctx.globalAlpha = 0.56;

        // Aura glow
        const grad = ctx.createRadialGradient(0, -76, 8, 0, -76, 94);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -76, 94, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        drawShadedCapsule(ctx, -10, -56, -16, -4, 11, 8, secondary);
        drawShadedCapsule(
          ctx,
          10,
          -56,
          attacking ? 46 : 16,
          attacking ? -40 : -4,
          11,
          8,
          secondary
        );

        // Shaded Torso
        const tGrad = ctx.createLinearGradient(-22, -112, 22, -52);
        tGrad.addColorStop(0, shadeHex(primary, 16));
        tGrad.addColorStop(1, shadeHex(primary, -24));
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.roundRect(-24, -112, 48, 60, 12);
        ctx.fill();

        // Attacking Arm + Shockwave
        drawShadedCapsule(
          ctx,
          8,
          -100,
          attacking ? 64 : 30,
          attacking ? -96 : -70,
          10,
          7.5,
          primary
        );

        // 2.5D Shaded Head
        ctx.drawImage(headImg, -36, -166, 72, 72);

        if (attacking) {
          ctx.strokeStyle = accent;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(74, -96, 18 + (t * 42) % 26, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      };

      drawSparFighter(p1x, p1y, 1, p1Head, '#f97316', '#fef3c7', '#facc15', p1Attack);
      drawSparFighter(p2x, p2y, -1, p2Head, '#0284c7', '#334155', '#38bdf8', p2Attack);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090f] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Swords className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="font-arcade text-lg sm:text-xl font-bold tracking-wider bg-gradient-to-r from-amber-300 via-orange-400 to-emerald-400 bg-clip-text text-transparent">
                NETA KOMBAT
              </span>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Sansad Showdown
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-300">
            <a href="#roster" className="hover:text-amber-400 transition">Fighters</a>
            <a href="#arenas" className="hover:text-amber-400 transition">Arenas</a>
            <a href="#how-to-play" className="hover:text-amber-400 transition">Controls</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-xs font-semibold cursor-pointer transition"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{playerName}</span>
            </button>
            <button
              onClick={onOpenHowToPlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-400 text-xs font-semibold cursor-pointer transition"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Guide</span>
            </button>
            <AudioControls compact />
          </div>
        </div>
      </header>

      {/* Hero Section with Animated Sparring Canvas */}
      <section className="relative overflow-hidden border-b border-slate-800/80">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/45 to-[#09090f]" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-14 sm:py-20 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-widest"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Original Political Satire 2D Arcade Fighter • Real-Time WebSockets
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            <h1 className="font-arcade text-5xl sm:text-7xl font-extrabold tracking-tight leading-none">
              <span className="bg-gradient-to-r from-orange-400 via-amber-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(249,115,22,0.4)]">
                NETA KOMBAT
              </span>
            </h1>
            <p className="font-arcade text-xl sm:text-2xl text-amber-400 tracking-[0.22em] uppercase">
              Sansad Showdown
            </p>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300">
              Choose from 8 satirical political titans, unleash voiced signature specials with dramatic reverb, chain arcade combos across 4 iconic Indian arenas, and conquer <span className="text-amber-300 font-semibold">FINAL SHOWDOWN</span> or battle friends live online!
            </p>
          </motion.div>

          {/* Primary Action Cluster */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="flex flex-col items-center gap-4"
          >
            <button
              onClick={() => {
                AudioManager.unlock();
                void AudioManager.playSfx('ui_click');
                onPlayNow();
              }}
              className="arcade-glow group relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-slate-950 font-arcade text-2xl font-extrabold tracking-wider hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <Play className="w-7 h-7 fill-slate-950" />
              PLAY NOW
            </button>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  AudioManager.unlock();
                  void AudioManager.playSfx('ui_click');
                  onStartSinglePlayer();
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 border border-amber-500/40 hover:border-amber-400 hover:bg-slate-800 font-arcade font-bold text-sm text-amber-300 transition cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4" />
                SINGLE PLAYER (VS AI)
              </button>

              <button
                onClick={() => {
                  AudioManager.unlock();
                  void AudioManager.playSfx('ui_click');
                  onStartCampaign();
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-900/80 to-purple-900/80 border border-rose-500/50 hover:border-rose-400 font-arcade font-bold text-sm text-rose-200 transition cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-300" />
                FINAL SHOWDOWN (BOSS)
              </button>

              <div className="relative">
                <button
                  onClick={() => {
                    AudioManager.unlock();
                    void AudioManager.playSfx('ui_click');
                    setFriendMenuOpen((v) => !v);
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 border border-sky-500/50 hover:border-sky-400 hover:bg-slate-800 font-arcade font-bold text-sm text-sky-300 transition cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  PLAY WITH A FRIEND
                </button>

                {friendMenuOpen && (
                  <div className="absolute left-0 sm:right-0 mt-2 w-64 p-2 rounded-xl bg-slate-950 border border-sky-500/40 shadow-2xl z-30 space-y-1.5 text-left">
                    <button
                      onClick={() => {
                        setFriendMenuOpen(false);
                        onStartOnlineMultiplayer();
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-sky-500/15 text-sm font-semibold text-sky-300 cursor-pointer"
                    >
                      <Wifi className="w-4 h-4" />
                      <div>
                        <div>Online Multiplayer</div>
                        <div className="text-[11px] text-slate-400 font-normal">Room code across devices</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setFriendMenuOpen(false);
                        onStartLocal2P();
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-emerald-500/15 text-sm font-semibold text-emerald-300 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <div>
                        <div>Local 2P Couch VS</div>
                        <div className="text-[11px] text-slate-400 font-normal">Shared keyboard battle</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Character Roster Preview */}
      <section id="roster" className="max-w-7xl mx-auto w-full px-4 py-12 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-arcade text-2xl sm:text-3xl font-bold text-white">
              MEET THE CANDIDATES
            </h2>
            <p className="text-sm text-slate-400">
              Click any fighter to hear their signature catchphrase & preview stats.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 font-semibold">
            + Unlockable Boss: {BOSS_CHARACTER.name}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {PLAYABLE_CHARACTERS.map((char) => {
            const active = previewChar === char.id;
            return (
              <button
                key={char.id}
                onClick={() => {
                  AudioManager.unlock();
                  setPreviewChar(char.id);
                  void AudioManager.playVoice(char.id, 'select', 'preview');
                }}
                className={`group p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  active
                    ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/15 scale-[1.03]'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-center mb-2">
                  <FighterPortrait characterId={char.id} size={64} />
                </div>
                <div className="font-arcade text-xs font-bold text-white truncate">
                  {char.name}
                </div>
                <div className="text-[10px] text-amber-400/90 truncate">{char.parodyTag}</div>
              </button>
            );
          })}
        </div>

        {/* Active Preview Spotlight */}
        {(() => {
          const c = PLAYABLE_CHARACTERS.find((x) => x.id === previewChar) || PLAYABLE_CHARACTERS[0];
          return (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/25 grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
              <FighterPortrait characterId={c.id} size={96} />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-arcade text-xl font-bold text-white">{c.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                    {c.title}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{c.bio}</p>
                <div className="text-xs text-orange-300 font-semibold flex items-center gap-1.5 pt-1">
                  <Volume2 className="w-3.5 h-3.5" />
                  Special: <span className="text-amber-300">{c.specialName}</span> — &ldquo;{c.voiceLines.special}&rdquo;
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    AudioManager.unlock();
                    void AudioManager.playVoice(c.id, 'special', 'preview');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer"
                >
                  Hear Special Voice
                </button>
                <button
                  onClick={() => {
                    AudioManager.unlock();
                    onQuickSelectChar(c.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Fight As {c.name}
                </button>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Arenas Showcase */}
      <section id="arenas" className="max-w-7xl mx-auto w-full px-4 py-8 space-y-5">
        <h2 className="font-arcade text-2xl sm:text-3xl font-bold text-white">4 ICONIC ARENAS</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ARENA_LIST.map((arena) => (
            <div
              key={arena.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/75 space-y-2"
              style={{
                backgroundImage: `linear-gradient(155deg, ${arena.skyTop}cc, ${arena.skyBottom}99)`,
              }}
            >
              <div className="font-arcade text-base font-bold text-amber-300">{arena.name}</div>
              <div className="text-xs font-semibold text-slate-200">{arena.subtitle}</div>
              <p className="text-xs text-slate-300/90">{arena.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Play & Controls Section */}
      <section id="how-to-play" className="max-w-7xl mx-auto w-full px-4 py-10 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-arcade text-2xl sm:text-3xl font-bold text-white">
            HOW TO PLAY & KEYBOARD CONTROLS
          </h2>
          <button
            onClick={onOpenHowToPlay}
            className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
          >
            View Full Frame Guide →
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="font-arcade text-sm font-bold text-amber-400">MOVEMENT & DEFENSE</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Use <strong>A / D</strong> (or Arrow keys) to move, <strong>Shift</strong> to sprint, <strong>W</strong> to jump, <strong>S</strong> to crouch, and <strong>H</strong> (or hold Back) to block incoming strikes.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="font-arcade text-sm font-bold text-emerald-400">ATTACKS & COMBOS</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>F</strong> = Light Punch, <strong>G</strong> = Heavy Kick, <strong>W+F</strong> = Uppercut Launcher, <strong>R</strong> = Unblockable Throw. Chain <strong>F → G → F/T</strong> on hit for devastating combos!
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="font-arcade text-sm font-bold text-rose-400">SIGNATURE SPECIALS</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fill your Special Energy Meter to 100%, then press <strong>T</strong> (P1) or <strong>I</strong> (P2) to unleash your character&apos;s voiced Signature Special Attack!
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        NETA KOMBAT: Sansad Showdown — Fictional Political Satire Arcade Fighter • Built with Phaser 3, React, TypeScript & Socket.IO
      </footer>
    </div>
  );
};
