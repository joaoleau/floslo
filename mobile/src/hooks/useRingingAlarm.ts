import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
import notifee from '@notifee/react-native';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import * as Application from 'expo-application';

import { schedulerService } from '@/services/schedulerService';
import { AlarmSettings } from '@/storage/alarmSettingsStorage';

export const MUTE_SECONDS = 60;
export const VIBRATION_PAUSE_SECONDS = 60;

const VIBRATION_PATTERN = [500, 1000, 500];

function playInLoop(player: AudioPlayer) {
  player.loop = true;
  player.play();
}

export interface RingingAlarm {
  muteCountdown: number;
  mute: () => void;
  vibrationPauseCountdown: number;
  canPauseVibration: boolean;
  pauseVibration: () => void;
  stop: () => void;
}

export function useRingingAlarm(settings: AlarmSettings, notificationId: string): RingingAlarm {
  const [muteCountdown, setMuteCountdown] = useState(0);
  const [vibrationPauseCountdown, setVibrationPauseCountdown] = useState(0);
  const stoppedRef = useRef(false);

  const soundName = settings.alarmSound || 'chic_pop';
  const audioUri = Platform.OS === 'android' ? `android.resource://${Application.applicationId}/raw/${soundName}` : '';
  const audioSource = useMemo(() => ({ uri: audioUri }), [audioUri]);
  const player = useAudioPlayer(audioSource);

  const canPlay = settings.soundEnabled && Platform.OS === 'android';
  const vibrationEnabled = settings.vibration && Platform.OS === 'android';

  useEffect(() => {
    notifee.cancelDisplayedNotification(notificationId).catch((err) => {
      console.error('[Firing] Falha ao tirar a notificação do alarme da barra', err);
    });
  }, [notificationId]);

  useEffect(() => {
    if (stoppedRef.current || muteCountdown > 0 || !canPlay) return;
    playInLoop(player);
  }, [player, audioSource, muteCountdown, canPlay]);

  useEffect(() => {
    if (muteCountdown <= 0) return;
    const timer = setInterval(() => setMuteCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [muteCountdown]);

  useEffect(() => {
    if (vibrationPauseCountdown <= 0) return;
    const timer = setInterval(() => setVibrationPauseCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [vibrationPauseCountdown]);

  const shouldVibrate = vibrationEnabled && vibrationPauseCountdown <= 0;
  useEffect(() => {
    if (!shouldVibrate || stoppedRef.current) return;
    Vibration.vibrate(VIBRATION_PATTERN, true);
    return () => Vibration.cancel();
  }, [shouldVibrate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (stoppedRef.current) return;

      if (state === 'background') {
        console.log('[Firing] App em segundo plano com o alarme tocando, exibindo a notificação de novo', { notificationId });
        player.pause();
        Vibration.cancel();
        schedulerService.showRingingAlarm(settings, notificationId).catch((err) => {
          console.error('[Firing] Falha ao exibir de novo a notificação do alarme', err);
        });
      } else if (state === 'active') {
        notifee.cancelDisplayedNotification(notificationId).catch((err) => {
          console.error('[Firing] Falha ao tirar a notificação do alarme da barra', err);
        });
        if (canPlay && muteCountdown <= 0) playInLoop(player);
        if (shouldVibrate) Vibration.vibrate(VIBRATION_PATTERN, true);
      }
    });
    return () => subscription.remove();
  }, [player, settings, notificationId, canPlay, shouldVibrate, muteCountdown]);

  const mute = useCallback(() => {
    if (muteCountdown > 0) return;
    console.log(`[Firing] Silenciando por ${MUTE_SECONDS}s`);
    setMuteCountdown(MUTE_SECONDS);
    player.pause();
  }, [muteCountdown, player]);

  const pauseVibration = useCallback(() => {
    if (!vibrationEnabled || vibrationPauseCountdown > 0) return;
    console.log(`[Firing] Parando a vibração por ${VIBRATION_PAUSE_SECONDS}s`);
    setVibrationPauseCountdown(VIBRATION_PAUSE_SECONDS);
  }, [vibrationEnabled, vibrationPauseCountdown]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    player.pause();
    Vibration.cancel();
    notifee.cancelDisplayedNotification(notificationId).catch(() => undefined);
  }, [player, notificationId]);

  return useMemo(
    () => ({
      muteCountdown,
      mute,
      vibrationPauseCountdown,
      canPauseVibration: vibrationEnabled,
      pauseVibration,
      stop,
    }),
    [muteCountdown, mute, vibrationPauseCountdown, vibrationEnabled, pauseVibration, stop]
  );
}
