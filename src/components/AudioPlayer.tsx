import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

interface AudioPlayerProps {
  visible: boolean;
  audioUri: string;
  fileName: string;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  visible,
  audioUri,
  fileName,
  onClose,
}) => {
  const { theme } = useTheme();
  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadAudio();
    } else {
      cleanupAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [visible, audioUri]);

  useEffect(() => {
    // Set up playback status listener
    audioRecorderPlayer.addPlayBackListener((e) => {
      setPosition(e.currentPosition);
      setDuration(e.duration);

      // Check if playback finished
      if (e.currentPosition >= e.duration && e.duration > 0) {
        setIsPlaying(false);
        setPosition(0);
      }
    });

    return () => {
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Start the player to get duration
      await audioRecorderPlayer.startPlayer(audioUri);
      await audioRecorderPlayer.pausePlayer();
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to load audio:', err);
      setError('Failed to load audio file');
      setIsLoading(false);
    }
  };

  const cleanupAudio = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
    } catch (err) {
      console.error('Error cleaning up audio:', err);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await audioRecorderPlayer.pausePlayer();
        setIsPlaying(false);
      } else {
        // If at the end, restart from beginning
        if (position >= duration) {
          await audioRecorderPlayer.stopPlayer();
          await audioRecorderPlayer.startPlayer(audioUri);
        } else {
          await audioRecorderPlayer.resumePlayer();
        }
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Playback failed');
    }
  };

  const handleStop = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      setIsPlaying(false);
      setPosition(0);
    } catch (err) {
      console.error('Stop error:', err);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClose = async () => {
    await cleanupAudio();
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      transparent={false}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {fileName}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {error ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={48} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.text }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                onPress={loadAudio}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading audio...
              </Text>
            </View>
          ) : (
            <View style={styles.playerContainer}>
              {/* Audio Icon */}
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Icon name="mic" size={64} color={theme.colors.primary} />
              </View>

              {/* File Name */}
              <Text style={[styles.fileName, { color: theme.colors.text }]}>
                {fileName}
              </Text>

              {/* Time Display */}
              <View style={styles.timeContainer}>
                <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                  {formatTime(position)}
                </Text>
                <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                  {formatTime(duration)}
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>

              {/* Controls */}
              <View style={styles.controls}>
                <TouchableOpacity
                  onPress={handleStop}
                  style={[styles.controlButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  disabled={!isPlaying && position === 0}
                >
                  <Icon
                    name="square"
                    size={24}
                    color={!isPlaying && position === 0 ? theme.colors.textSecondary : theme.colors.text}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePlayPause}
                  style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
                  disabled={isLoading}
                >
                  <Icon
                    name={isPlaying ? 'pause' : 'play'}
                    size={32}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <View style={{ width: 56 }} />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  playerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  fileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 32,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
