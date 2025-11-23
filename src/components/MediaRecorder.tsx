import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  NativeModules,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';

const { AudioSessionManager } = NativeModules;

type RecordingMode = 'voice' | 'video';
type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface MediaRecorderProps {
  mode: RecordingMode;
  onFileReady: (file: { uri: string; name: string; type: string; size: number }) => void;
  onClose: () => void;
}

export const MediaRecorder: React.FC<MediaRecorderProps> = ({ mode, onFileReady, onClose }) => {
  const { theme } = useTheme();
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();
  const audioRecorderPlayer = useRef<AudioRecorderPlayer | null>(null);

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize audio recorder player for voice mode
    if (mode === 'voice' && !audioRecorderPlayer.current) {
      audioRecorderPlayer.current = new AudioRecorderPlayer();

      // Configure audio session for speaker output on iOS
      if (Platform.OS === 'ios' && AudioSessionManager) {
        AudioSessionManager.setAudioOutputToSpeaker()
          .then(() => {/* console.log('✅ Audio session configured for speaker') */})
          .catch((error: any) => {/* console.error('Failed to configure audio session:', error) */});
      }
    }

    requestPermissions();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Clean up audio resources
      if (mode === 'voice' && audioRecorderPlayer.current) {
        audioRecorderPlayer.current.removePlayBackListener();
        audioRecorderPlayer.current.stopPlayer();
        audioRecorderPlayer.current.stopRecorder();
      }
    };
  }, [mode]);

  const requestPermissions = async () => {
    try {
      // Request microphone permission (needed for both voice and video)
      if (!hasMicrophonePermission) {
        const micGranted = await requestMicrophonePermission();
        if (!micGranted) {
          Alert.alert(
            'Permission Required',
            'Canary needs microphone access to record audio.'
          );
          return;
        }
      }

      // Request camera permission for video mode
      if (mode === 'video' && !hasCameraPermission) {
        const camGranted = await requestCameraPermission();
        if (!camGranted) {
          Alert.alert(
            'Permission Required',
            'Canary needs camera access to record video.'
          );
          return;
        }
      }
    } catch (err) {
      // console.error('Permission request error:', err);
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    // Check permissions first
    if (!hasMicrophonePermission || (mode === 'video' && !hasCameraPermission)) {
      await requestPermissions();
      return;
    }

    try {
      if (mode === 'video' && camera.current) {
        // console.log('📹 Starting video recording');
        await camera.current.startRecording({
          // Optimize video settings for performance
          videoBitRate: 'low', // Use low bitrate for smaller file size and better performance
          onRecordingFinished: (video) => {
            // console.log('✅ Video recording finished:', video.path);
            setRecordedUri(`file://${video.path}`);
            setRecordingState('stopped');
            stopTimer();
          },
          onRecordingError: (error) => {
            // console.error('❌ Video recording error:', error);
            Alert.alert('Error', `Failed to record video: ${error.message}`);
            setRecordingState('idle');
            stopTimer();
          },
        });
        setRecordingState('recording');
        startTimer();
      } else if (mode === 'voice') {
        // console.log('🎤 Starting audio recording');

        // Check microphone permission first for iOS
        if (Platform.OS === 'ios') {
          if (!hasMicrophonePermission) {
            const granted = await requestMicrophonePermission();
            if (!granted) {
              Alert.alert('Permission Required', 'Canary needs microphone access to record audio.');
              return;
            }
          }
        }

        // Ensure audio recorder is initialized
        if (!audioRecorderPlayer.current) {
          // console.log('Creating new AudioRecorderPlayer instance');
          audioRecorderPlayer.current = new AudioRecorderPlayer();

          // Set audio encoding options for iOS
          await audioRecorderPlayer.current.setSubscriptionDuration(0.1);
        }

        // Start recording with AudioRecorderPlayer
        // For iOS, pass undefined to use default path or specify full path
        const uri = await audioRecorderPlayer.current.startRecorder(undefined);
        // console.log('✅ Audio recording started:', uri);

        setRecordedUri(uri);
        setRecordingState('recording');
        startTimer();

        // Set up recording progress listener
        audioRecorderPlayer.current.addRecordBackListener((e) => {
          // Update UI if needed based on recording progress
          return;
        });
      }
    } catch (error: any) {
      // console.error('Failed to start recording:', error);
      Alert.alert('Error', `Failed to start recording: ${error.message}`);
    }
  };

  const handlePauseRecording = async () => {
    try {
      if (mode === 'video' && camera.current) {
        await camera.current.pauseRecording();
        setRecordingState('paused');
        stopTimer();
        // console.log('⏸️ Paused video recording');
      } else if (mode === 'voice') {
        await audioRecorderPlayer.current.pauseRecorder();
        setRecordingState('paused');
        stopTimer();
        // console.log('⏸️ Paused audio recording');
      }
    } catch (error: any) {
      // console.error('Failed to pause recording:', error);
    }
  };

  const handleResumeRecording = async () => {
    try {
      if (mode === 'video' && camera.current) {
        await camera.current.resumeRecording();
        setRecordingState('recording');
        startTimer();
        // console.log('▶️ Resumed video recording');
      } else if (mode === 'voice') {
        await audioRecorderPlayer.current.resumeRecorder();
        setRecordingState('recording');
        startTimer();
        // console.log('▶️ Resumed audio recording');
      }
    } catch (error: any) {
      // console.error('Failed to resume recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (mode === 'video' && camera.current && recordingState !== 'idle') {
        // console.log('⏹️ Stopping video recording');
        await camera.current.stopRecording();
        // The onRecordingFinished callback will handle the rest
      } else if (mode === 'voice' && recordingState !== 'idle') {
        // console.log('⏹️ Stopping audio recording');
        const result = await audioRecorderPlayer.current.stopRecorder();
        audioRecorderPlayer.current.removeRecordBackListener();
        // console.log('✅ Audio recording finished:', result);
        setRecordingState('stopped');
        stopTimer();
      }
    } catch (error: any) {
      // console.error('Failed to stop recording:', error);
      Alert.alert('Error', `Failed to stop recording: ${error.message}`);
    }
  };

  const handleDeleteRecording = () => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (recordedUri) {
              try {
                // Remove file:// prefix if present
                const filePath = recordedUri.replace('file://', '');
                const exists = await RNFS.exists(filePath);
                if (exists) {
                  await RNFS.unlink(filePath);
                  // console.log(`🗑️ Deleted file: ${filePath}`);
                }
              } catch (error) {
                // console.error('Failed to delete file:', error);
              }
            }

            setRecordedUri(null);
            setRecordingState('idle');
            setDuration(0);
          },
        },
      ]
    );
  };

  const handlePlayPause = async () => {
    try {
      if (mode === 'voice' && recordedUri) {
        if (isPlaying) {
          // Pause playback
          await audioRecorderPlayer.current.pausePlayer();
          audioRecorderPlayer.current.removePlayBackListener();
          setIsPlaying(false);
          // console.log('⏸️ Paused audio playback at', playbackPosition);
        } else {
          // Remove any existing listener first
          audioRecorderPlayer.current.removePlayBackListener();

          // console.log('📱 Starting playback for:', recordedUri);

          // Start or resume playback
          const msg = await audioRecorderPlayer.current.startPlayer(recordedUri);
          // console.log('✅ Player started, returned:', msg);

          setIsPlaying(true);

          // Listen for playback progress
          audioRecorderPlayer.current.addPlayBackListener((e) => {
            // console.log('Playback progress:', e.currentPosition, '/', e.duration);
            // Update playback position (convert milliseconds to seconds)
            const positionInSeconds = Math.floor(e.currentPosition / 1000);
            setPlaybackPosition(positionInSeconds);

            // Check for completion
            if (e.currentPosition >= e.duration && e.duration > 0) {
              // console.log('✅ Playback completed');
              setIsPlaying(false);
              setPlaybackPosition(0);
              audioRecorderPlayer.current.stopPlayer();
              audioRecorderPlayer.current.removePlayBackListener();
            }
            return;
          });
        }
      } else if (mode === 'video') {
        // Video playback not supported without expo-av or react-native-video
        Alert.alert('Preview Not Available', 'Video preview is not available. You can still use the recorded video.');
      }
    } catch (error: any) {
      // console.error('Failed to play/pause:', error);
      Alert.alert('Error', `Failed to play audio: ${error.message}`);
    }
  };

  const handleUseRecording = async () => {
    if (!recordedUri) {
      Alert.alert('Error', 'No recording available');
      return;
    }

    try {
      // Remove file:// prefix if present for RNFS operations
      const filePath = recordedUri.replace('file://', '');

      // Get actual file size
      const fileInfo = await RNFS.stat(filePath);
      const fileSize = fileInfo.size;

      const timestamp = Date.now();
      const extension = mode === 'video' ? 'mp4' : 'm4a';
      const mimeType = mode === 'video' ? 'video/mp4' : 'audio/mp4';
      const fileName = `${mode}_recording_${timestamp}.${extension}`;

      onFileReady({
        uri: recordedUri,
        name: fileName,
        type: mimeType,
        size: fileSize,
      });
    } catch (error: any) {
      // console.error('Failed to get file info:', error);
      Alert.alert('Error', `Failed to process recording: ${error.message}`);
    }
  };

  const renderControls = () => {
    if (recordingState === 'stopped' && recordedUri) {
      return (
        <View style={styles.stoppedControls}>
          {mode === 'video' && recordedUri && (
            <View style={[styles.videoPreview, { backgroundColor: theme.colors.surface }]}>
              <Icon name="video" size={48} color={theme.colors.primary} />
              <Text style={[styles.videoPlaceholder, { color: theme.colors.text }]}>
                Video Recorded
              </Text>
              <Text style={[styles.videoHint, { color: theme.colors.textSecondary }]}>
                Preview not available - use the video file
              </Text>
            </View>
          )}

          {mode === 'voice' && (
            <View style={[styles.audioPreview, { backgroundColor: theme.colors.surface }]}>
              <Icon name="music" size={32} color={theme.colors.primary} />
              <View style={styles.audioInfo}>
                <Text style={[styles.audioFileName, { color: theme.colors.text }]}>
                  Voice Recording
                </Text>
                <Text style={[styles.audioDuration, { color: theme.colors.textSecondary }]}>
                  {isPlaying ? `${formatDuration(playbackPosition)} / ${formatDuration(duration)}` : formatDuration(duration)}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePlayPause}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: '#EF4444' }]}
              onPress={handleDeleteRecording}
            >
              <Icon name="trash-2" size={20} color="#EF4444" />
              <Text style={[styles.deleteButtonText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.useButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleUseRecording}
            >
              <Icon name="check" size={20} color="#FFFFFF" />
              <Text style={styles.useButtonText}>Use Recording</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.recordingControls}>
        {mode === 'video' && device && hasCameraPermission && (
          <View style={styles.cameraContainer}>
            <Camera
              ref={camera}
              style={styles.camera}
              device={device}
              isActive={recordingState !== 'stopped'}
              video={true}
              audio={true}
              // Performance optimizations
              preset="medium" // Use medium quality instead of high
              fps={24} // Lower frame rate for better performance (24fps is standard)
              videoStabilizationMode="off" // Disable stabilization to improve performance
              enableBufferCompression={true} // Enable buffer compression
            />
            {recordingState !== 'idle' && (
              <View style={styles.recordingIndicator}>
                <View style={[styles.recordingDot, recordingState === 'recording' && styles.recordingDotActive]} />
                <Text style={styles.recordingText}>
                  {recordingState === 'recording' ? 'REC' : 'PAUSED'}
                </Text>
              </View>
            )}
          </View>
        )}

        {mode === 'voice' && recordingState !== 'idle' && (
          <View style={[styles.audioVisualizer, { backgroundColor: theme.colors.surface }]}>
            <Icon name="mic" size={48} color={recordingState === 'recording' ? theme.colors.primary : theme.colors.textSecondary} />
            {recordingState === 'recording' && (
              <View style={styles.recordingIndicator}>
                <View style={[styles.recordingDot, styles.recordingDotActive]} />
                <Text style={styles.recordingText}>RECORDING</Text>
              </View>
            )}
            {recordingState === 'paused' && (
              <Text style={[styles.pausedText, { color: theme.colors.textSecondary }]}>PAUSED</Text>
            )}
          </View>
        )}

        <Text style={[styles.duration, { color: theme.colors.text }]}>
          {formatDuration(duration)}
        </Text>

        <View style={styles.controls}>
          {recordingState === 'idle' && (
            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: '#EF4444' }]}
              onPress={handleStartRecording}
            >
              <Icon name="circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {recordingState === 'recording' && (
            <>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={handlePauseRecording}
              >
                <Icon name="pause" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={handleStopRecording}
              >
                <Icon name="square" size={24} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={handleResumeRecording}
              >
                <Icon name="play" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={handleStopRecording}
              >
                <Icon name="square" size={24} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {recordingState !== 'idle' && (
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            {recordingState === 'recording'
              ? 'Tap pause to pause, or stop to finish'
              : 'Tap play to continue, or stop to finish'}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.border }]}
          onPress={onClose}
        >
          <Icon name="x" size={20} color={theme.colors.text} />
          <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
            Cancel Recording
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Show permission request if needed
  if (mode === 'video' && (!hasCameraPermission || !hasMicrophonePermission)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Video Recording
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <Icon name="camera" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
            Camera & Microphone Access Required
          </Text>
          <Text style={[styles.permissionMessage, { color: theme.colors.textSecondary }]}>
            Canary needs access to your camera and microphone to record videos for your dossier.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
            onPress={requestPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'video' && !device) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Video Recording
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContainer}>
          <Icon name="camera-off" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
            No Camera Available
          </Text>
          <Text style={[styles.permissionMessage, { color: theme.colors.textSecondary }]}>
            No camera device was found on this device.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {mode === 'video' ? 'Video Recording' : 'Voice Recording'}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {renderControls()}
      </View>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  recordingControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
  },
  recordingDotActive: {
    backgroundColor: '#EF4444',
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  videoPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  videoHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  previewLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  duration: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 32,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  hint: {
    marginTop: 24,
    fontSize: 14,
    textAlign: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stoppedControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPreview: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  audioInfo: {
    marginLeft: 16,
    flex: 1,
  },
  audioFileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  audioDuration: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginTop: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  useButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  useButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  audioVisualizer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  pausedText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
