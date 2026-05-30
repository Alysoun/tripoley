import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useAchievements } from '../context/AchievementContext';
import { soundForAnnouncement, soundForLogMessage, soundManager } from '../utils/SoundEffects';

/** Reacts to game state and plays procedural sounds (Web Audio — no asset files). */
export function useGameSounds() {
  const { state } = useGame();
  const { activeEffects } = useAchievements();
  const lastLogId = useRef<string | null>(null);
  const lastAnnouncementKey = useRef<string | null>(null);
  const lastPhase = useRef(state.phase);

  useEffect(() => {
    soundManager.setEnabled(state.soundEnabled);
  }, [state.soundEnabled]);

  useEffect(() => {
    soundManager.setRetroMode(activeEffects.retroSounds);
    soundManager.setVictoryFanfare(activeEffects.victoryFanfare);
  }, [activeEffects.retroSounds, activeEffects.victoryFanfare]);

  useEffect(() => {
    const entry = state.log[state.log.length - 1];
    if (!entry || entry.id === lastLogId.current) return;
    lastLogId.current = entry.id;

    const sound = soundForLogMessage(entry.message, entry.type);
    if (sound) soundManager.play(sound);
  }, [state.log]);

  useEffect(() => {
    if (state.phase !== 'announcement' || !state.announcement) return;
    const key = `${state.announcement.title}:${state.announcement.lines.join('|')}`;
    if (key === lastAnnouncementKey.current) return;
    lastAnnouncementKey.current = key;
    soundManager.play(soundForAnnouncement(state.announcement.title));
  }, [state.phase, state.announcement]);

  useEffect(() => {
    if (state.phase === 'poker' && lastPhase.current !== 'poker') {
      soundManager.play('cardDraw');
    }
    if (state.phase === 'michigan' && lastPhase.current !== 'michigan') {
      soundManager.play('shuffle');
    }
    lastPhase.current = state.phase;
  }, [state.phase]);
}
