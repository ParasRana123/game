import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArenaId, CharacterId, Difficulty, GameMode, InputState, MatchState, RoomState } from '@shared/types';
import { AudioManager } from '@/audio/AudioManager';
import { SocketClient } from '@/network/SocketClient';
import { PhaserHost } from '@/game/PhaserHost';
import { LandingPage } from '@/components/LandingPage';
import { CharacterSelect } from '@/components/CharacterSelect';
import { CAMPAIGN_LADDER, CampaignMap, CampaignStage } from '@/components/CampaignMap';
import { MultiplayerLobby } from '@/components/MultiplayerLobby';
import { FightHUD } from '@/components/FightHUD';
import { MatchResultModal } from '@/components/MatchResultModal';
import { HowToPlayModal } from '@/components/HowToPlayModal';
import { LeaderboardModal } from '@/components/LeaderboardModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type Screen = 'landing' | 'char_select_ai' | 'char_select_2p' | 'campaign' | 'online_lobby' | 'fight';

interface ActiveMatchSession {
  key: number;
  mode: GameMode;
  p1Char: CharacterId;
  p2Char: CharacterId;
  arenaId: ArenaId;
  difficulty: Difficulty;
  isBossFight: boolean;
  campaignStage?: number;
  localSlot?: 0 | 1;
  initialMatchState?: MatchState;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('nk_username') || 'Netaji_Player';
    } catch {
      return 'Netaji_Player';
    }
  });
  const [quickChar, setQuickChar] = useState<CharacterId>('vikas_guru');
  const [campaignChar, setCampaignChar] = useState<CharacterId>('vikas_guru');
  const [unlockedStage, setUnlockedStage] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('nk_campaign_stage') || '1');
    } catch {
      return 1;
    }
  });

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [activeMatch, setActiveMatch] = useState<ActiveMatchSession | null>(null);
  const [hudState, setHudState] = useState<MatchState | null>(null);
  const [matchResult, setMatchResult] = useState<{ state: MatchState; durationSec: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const [onlineRoom, setOnlineRoom] = useState<RoomState | null>(null);
  const [onlineBanner, setOnlineBanner] = useState('');

  const touchControlRef = useRef<{
    setTouchInput: (slot: 0 | 1, patch: Partial<InputState>) => void;
  } | null>(null);

  const updatePlayerName = (name: string) => {
    setPlayerName(name);
    try {
      localStorage.setItem('nk_username', name);
    } catch {
      // ignore
    }
  };

  // Menu BGM management
  useEffect(() => {
    if (screen !== 'fight') {
      void AudioManager.playBgm('bgm_menu');
    }
  }, [screen]);

  // Listen to online room updates & rematch restarts during match
  useEffect(() => {
    const socket = SocketClient.connect();
    const onRoomUpdate = (r: RoomState) => setOnlineRoom(r);
    const onStarted = (payload: { room: RoomState; matchState: MatchState }) => {
      const slot = payload.room.players[0]?.playerId === SocketClient.playerId ? 0 : 1;
      setOnlineRoom(payload.room);
      setMatchResult(null);
      setOnlineBanner('');
      setActiveMatch({
        key: Date.now(),
        mode: 'online',
        p1Char: payload.matchState.fighters[0].characterId,
        p2Char: payload.matchState.fighters[1].characterId,
        arenaId: payload.matchState.arenaId,
        difficulty: 'hard',
        isBossFight: false,
        localSlot: slot,
        initialMatchState: payload.matchState,
      });
      setHudState(payload.matchState);
      setScreen('fight');
    };
    const onDisc = (p: { displayName: string; graceSeconds: number }) => {
      setOnlineBanner(`${p.displayName} disconnected — waiting ${p.graceSeconds}s for reconnect...`);
    };
    const onReconn = (p: { displayName: string }) => {
      setOnlineBanner(`${p.displayName} reconnected!`);
      setTimeout(() => setOnlineBanner(''), 2500);
    };

    socket.on('room:updated', onRoomUpdate);
    socket.on('match:started', onStarted);
    socket.on('room:player_disconnected', onDisc);
    socket.on('room:player_reconnected', onReconn);
    return () => {
      socket.off('room:updated', onRoomUpdate);
      socket.off('match:started', onStarted);
      socket.off('room:player_disconnected', onDisc);
      socket.off('room:player_reconnected', onReconn);
    };
  }, []);

  const launchMatch = (session: Omit<ActiveMatchSession, 'key'>) => {
    setMatchResult(null);
    setPaused(false);
    setHudState(null);
    setActiveMatch({ ...session, key: Date.now() });
    setScreen('fight');
  };

  const handleMatchEnd = useCallback(
    (finalState: MatchState, durationSec: number) => {
      setMatchResult({ state: finalState, durationSec });
      if (!activeMatch) return;

      const playerWon = finalState.winnerIndex === 0;
      const isCampaignComplete =
        activeMatch.mode === 'campaign' && activeMatch.isBossFight && playerWon;

      if (activeMatch.mode === 'campaign' && playerWon && activeMatch.campaignStage) {
        const nextUnlock = Math.min(5, Math.max(unlockedStage, activeMatch.campaignStage + 1));
        setUnlockedStage(nextUnlock);
        try {
          localStorage.setItem('nk_campaign_stage', String(nextUnlock));
        } catch {
          // ignore
        }
      }

      if (activeMatch.mode !== 'online') {
        void fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: activeMatch.mode,
            arenaId: activeMatch.arenaId,
            p1Name: playerName,
            p2Name: activeMatch.mode === 'local_2p' ? 'Player 2' : 'CPU',
            p1Char: activeMatch.p1Char,
            p2Char: activeMatch.p2Char,
            winnerSlot: finalState.winnerIndex ?? 'draw',
            p1Rounds: finalState.fighters[0].roundsWon,
            p2Rounds: finalState.fighters[1].roundsWon,
            durationSec,
            campaignCleared: isCampaignComplete,
          }),
        }).catch(() => undefined);
      }
    },
    [activeMatch, playerName, unlockedStage]
  );

  const startCampaignStage = (st: CampaignStage) => {
    launchMatch({
      mode: 'campaign',
      p1Char: campaignChar,
      p2Char: st.opponent,
      arenaId: st.arenaId,
      difficulty: st.difficulty,
      isBossFight: st.isBoss,
      campaignStage: st.stage,
    });
  };

  return (
    <>
      {screen === 'landing' && (
        <LandingPage
          playerName={playerName}
          onPlayNow={() => setScreen('char_select_ai')}
          onStartSinglePlayer={() => setScreen('char_select_ai')}
          onStartCampaign={() => setScreen('campaign')}
          onStartOnlineMultiplayer={() => setScreen('online_lobby')}
          onStartLocal2P={() => setScreen('char_select_2p')}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onQuickSelectChar={(charId) => {
            setQuickChar(charId);
            setScreen('char_select_ai');
          }}
        />
      )}

      {(screen === 'char_select_ai' || screen === 'char_select_2p') && (
        <CharacterSelect
          mode={screen === 'char_select_2p' ? 'local_2p' : 'single_ai'}
          initialP1Char={quickChar}
          onBack={() => setScreen('landing')}
          onStartMatch={({ p1Char, p2Char, arenaId, difficulty }) =>
            launchMatch({
              mode: screen === 'char_select_2p' ? 'local_2p' : 'single_ai',
              p1Char,
              p2Char,
              arenaId,
              difficulty,
              isBossFight: false,
            })
          }
        />
      )}

      {screen === 'campaign' && (
        <CampaignMap
          playerChar={campaignChar}
          unlockedStage={unlockedStage}
          onSelectPlayerChar={setCampaignChar}
          onBack={() => setScreen('landing')}
          onStartStage={startCampaignStage}
        />
      )}

      {screen === 'online_lobby' && (
        <MultiplayerLobby
          playerName={playerName}
          onBack={() => setScreen('landing')}
          onMatchStarted={({ room, slot, matchState }) => {
            setOnlineRoom(room);
            setMatchResult(null);
            setActiveMatch({
              key: Date.now(),
              mode: 'online',
              p1Char: matchState.fighters[0].characterId,
              p2Char: matchState.fighters[1].characterId,
              arenaId: matchState.arenaId,
              difficulty: 'hard',
              isBossFight: false,
              localSlot: slot,
              initialMatchState: matchState,
            });
            setHudState(matchState);
            setScreen('fight');
          }}
        />
      )}

      {screen === 'fight' && activeMatch && (
        <div className="w-screen h-screen bg-[#05050a] flex items-center justify-center p-1 sm:p-3 overflow-hidden relative">
          <div className="relative w-full max-w-[1280px] aspect-video max-h-full">
            <ErrorBoundary
              key={`eb_${activeMatch.key}`}
              onReset={() => launchMatch({ ...activeMatch })}
              onExit={() => {
                setPaused(false);
                setMatchResult(null);
                setScreen('landing');
              }}
            >
              <PhaserHost
                key={activeMatch.key}
                paused={paused}
                onSceneReady={(controls) => {
                  touchControlRef.current = controls;
                }}
                config={{
                  mode: activeMatch.mode,
                  p1Char: activeMatch.p1Char,
                  p2Char: activeMatch.p2Char,
                  arenaId: activeMatch.arenaId,
                  difficulty: activeMatch.difficulty,
                  isBossFight: activeMatch.isBossFight,
                  localSlot: activeMatch.localSlot,
                  initialMatchState: activeMatch.initialMatchState,
                  onHudUpdate: setHudState,
                  onMatchEnd: handleMatchEnd,
                }}
              />
            </ErrorBoundary>

            {onlineBanner && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg">
                {onlineBanner}
              </div>
            )}

            {hudState && (
              <FightHUD
                matchState={hudState}
                p1Label={
                  activeMatch.mode === 'online'
                    ? onlineRoom?.players[0]?.displayName || 'P1'
                    : playerName
                }
                p2Label={
                  activeMatch.mode === 'online'
                    ? onlineRoom?.players[1]?.displayName || 'P2'
                    : activeMatch.mode === 'local_2p'
                    ? 'Player 2'
                    : activeMatch.isBossFight
                    ? 'BOSS'
                    : `CPU (${activeMatch.difficulty.toUpperCase()})`
                }
                isOnline={activeMatch.mode === 'online'}
                paused={paused}
                onTogglePause={() => setPaused((p) => !p)}
                onQuitMatch={() => {
                  setPaused(false);
                  setMatchResult(null);
                  setScreen(activeMatch.mode === 'campaign' ? 'campaign' : 'landing');
                }}
                onTouchInput={(slot, patch) => touchControlRef.current?.setTouchInput(slot, patch)}
              />
            )}

            {matchResult && (
              <MatchResultModal
                mode={activeMatch.mode}
                matchState={matchResult.state}
                durationSec={matchResult.durationSec}
                campaignStage={activeMatch.campaignStage}
                isCampaignComplete={
                  activeMatch.mode === 'campaign' &&
                  activeMatch.isBossFight &&
                  matchResult.state.winnerIndex === 0
                }
                onlineRoom={onlineRoom}
                localSlot={activeMatch.localSlot}
                onRematch={() =>
                  launchMatch({
                    ...activeMatch,
                  })
                }
                onNextCampaignStage={() => {
                  const next = CAMPAIGN_LADDER.find(
                    (s) => s.stage === (activeMatch.campaignStage || 1) + 1
                  );
                  if (next) startCampaignStage(next);
                  else setScreen('campaign');
                }}
                onVoteOnlineRematch={() => SocketClient.voteRematch()}
                onExit={() => {
                  if (activeMatch.mode === 'online') {
                    SocketClient.leaveRoom();
                    setOnlineRoom(null);
                    setScreen('landing');
                  } else if (activeMatch.mode === 'campaign') {
                    setScreen('campaign');
                  } else {
                    setScreen('landing');
                  }
                  setMatchResult(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
      {showLeaderboard && (
        <LeaderboardModal
          playerName={playerName}
          onUpdatePlayerName={updatePlayerName}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </>
  );
}

export default App;
