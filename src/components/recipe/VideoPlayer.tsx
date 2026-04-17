import React, { useRef, useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface VideoPlayerProps {
  uri: string;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const videoViewRef = useRef<VideoView>(null);
  const [barWidth, setBarWidth] = useState(0);

  const player = useVideoPlayer(uri, p => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5; // emit timeUpdate every 0.5 s
  });

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime ?? 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  const isLoading = status !== 'readyToPlay';
  const duration = player.duration ?? 0;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else player.play();
  };

  const handleSeek = (event: any) => {
    if (duration === 0 || barWidth === 0) return;
    const { locationX } = event.nativeEvent;
    player.currentTime = Math.max(0, Math.min((locationX / barWidth) * duration, duration));
  };

  return (
    <View style={styles.container}>
      <VideoView
        ref={videoViewRef}
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{ enable: true, orientation: 'landscape' }}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {/* Controls bar */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={togglePlay} style={styles.playBtn} disabled={isLoading}>
          <Feather name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.scrubberWrap}>
          <TouchableOpacity
            style={styles.scrubberTrack}
            onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
            onPress={handleSeek}
            activeOpacity={1}
          >
            <View style={styles.scrubberBg} />
            <View style={[styles.scrubberFill, { width: `${progress * 100}%` as any }]} />
          </TouchableOpacity>
          <Text style={styles.time}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => videoViewRef.current?.enterFullscreen()}
          style={styles.fullscreenBtn}
        >
          <Feather name="maximize" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: theme.spacing.sm,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrubberWrap: {
    flex: 1,
    gap: 4,
  },
  scrubberTrack: {
    height: 20,
    justifyContent: 'center',
  },
  scrubberBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  time: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  fullscreenBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
