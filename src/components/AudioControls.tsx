import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Music, Mic, Zap } from 'lucide-react';
import { AudioManager, AudioSettings } from '@/audio/AudioManager';

interface AudioControlsProps {
  compact?: boolean;
}

export const AudioControls: React.FC<AudioControlsProps> = ({ compact = false }) => {
  const [settings, setSettings] = useState<AudioSettings>(AudioManager.getSettings());
  const [open, setOpen] = useState(false);

  useEffect(() => AudioManager.subscribe(setSettings), []);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => {
            AudioManager.unlock();
            setOpen((v) => !v);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-xs font-semibold text-slate-200 transition cursor-pointer"
          title="Audio & Volume Controls"
        >
          {settings.masterMuted ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-400" />
          )}
          <span className="hidden sm:inline">AUDIO</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 p-4 rounded-xl bg-slate-950/95 border border-amber-500/30 shadow-2xl z-50 backdrop-blur-md">
            <AudioChannelSliders settings={settings} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80">
      <AudioChannelSliders settings={settings} />
    </div>
  );
};

const AudioChannelSliders: React.FC<{ settings: AudioSettings }> = ({ settings }) => {
  const rows: Array<{
    label: string;
    icon: React.ReactNode;
    volKey: 'masterVolume' | 'bgmVolume' | 'voiceVolume' | 'sfxVolume';
    muteKey: 'masterMuted' | 'bgmMuted' | 'voiceMuted' | 'sfxMuted';
  }> = [
    { label: 'Master', icon: <Volume2 className="w-4 h-4 text-amber-400" />, volKey: 'masterVolume', muteKey: 'masterMuted' },
    { label: 'Music (BGM)', icon: <Music className="w-4 h-4 text-sky-400" />, volKey: 'bgmVolume', muteKey: 'bgmMuted' },
    { label: 'Voice Lines', icon: <Mic className="w-4 h-4 text-emerald-400" />, volKey: 'voiceVolume', muteKey: 'voiceMuted' },
    { label: 'Combat SFX', icon: <Zap className="w-4 h-4 text-orange-400" />, volKey: 'sfxVolume', muteKey: 'sfxMuted' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-arcade text-xs uppercase tracking-wider text-amber-400">
          Audio Mixer
        </span>
        <button
          onClick={() => AudioManager.updateSettings({ masterMuted: !settings.masterMuted })}
          className="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
        >
          {settings.masterMuted ? 'Unmute All' : 'Mute All'}
        </button>
      </div>
      {rows.map((r) => {
        const muted = settings[r.muteKey];
        const val = settings[r.volKey];
        return (
          <div key={r.volKey} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-200">
                {r.icon}
                <span>{r.label}</span>
              </div>
              <button
                onClick={() => AudioManager.updateSettings({ [r.muteKey]: !muted })}
                className={`px-1.5 py-0.5 rounded text-[11px] cursor-pointer ${
                  muted ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {muted ? 'MUTED' : `${Math.round(val * 100)}%`}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={val}
              onChange={(e) =>
                AudioManager.updateSettings({ [r.volKey]: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        );
      })}
    </div>
  );
};
