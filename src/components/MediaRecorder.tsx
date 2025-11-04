import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';

type RecordingMode = 'voice' | 'video';
type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface MediaRecorderProps {
  mode: RecordingMode;
  onFileReady: (file: { uri: string; name: string; type: string; size: number }) => void;
  onClose: () => void;
}

export const MediaRecorder: React.FC<MediaRecorderProps> = ({ mode, onFileReady, onClose }) => {
  const { theme } = useTheme();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const permissions = mode === 'video'
          ? [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, PermissionsAndroid.PERMISSIONS.CAMERA]
          : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        setHasPermission(allGranted);

        if (!allGranted) {
          Alert.alert(
            'Permission Required',
            `Canary needs ${mode === 'video' ? 'camera and microphone' : 'microphone'} access to record.`
          );
        }
      } else {
        // iOS permissions are handled via Info.plist prompts
        setHasPermission(true);
      }
    } catch (err) {
      console.error('Permission request error:', err);
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
    if (!hasPermission) {
      await requestPermissions();
      return;
    }

    try {
      // TODO: Implement actual recording using native modules
      // For now, this is a placeholder that demonstrates the UI flow

      setRecordingState('recording');
      startTimer();

      console.log(`📹 Started ${mode} recording`);

      // Placeholder: In production, initialize actual recording here
      // using react-native-vision-camera for video or react-native-audio-recorder for audio
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handlePauseRecording = () => {
    // TODO: Implement actual pause functionality
    setRecordingState('paused');
    stopTimer();
    console.log('⏸️ Paused recording');
  };

  const handleResumeRecording = () => {
    // TODO: Implement actual resume functionality
    setRecordingState('recording');
    startTimer();
    console.log('▶️ Resumed recording');
  };

  const handleStopRecording = async () => {
    try {
      // TODO: Implement actual stop and save functionality
      stopTimer();
      setRecordingState('stopped');

      // Placeholder: Generate a mock file URI with platform-specific path
      const timestamp = Date.now();
      const extension = mode === 'video' ? 'mp4' : 'm4a';
      const fileName = `${mode}_recording_${timestamp}.${extension}`;

      // Use platform-specific document directory
      const mockUri = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      // Create a placeholder file for testing purposes
      // TODO: Replace with actual recorded file data
      const placeholderData = mode === 'video'
        ? 'Placeholder video data - actual recording not yet implemented'
        : 'Placeholder audio data - actual recording not yet implemented';

      await RNFS.writeFile(mockUri, placeholderData, 'utf8');
      console.log(`📝 Created placeholder file at: ${mockUri}`);

      setRecordedUri(mockUri);

      console.log(`⏹️ Stopped ${mode} recording:`, mockUri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
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
            // Delete the file from file system
            if (recordedUri) {
              try {
                const exists = await RNFS.exists(recordedUri);
                if (exists) {
                  await RNFS.unlink(recordedUri);
                  console.log(`🗑️ Deleted file: ${recordedUri}`);
                }
              } catch (error) {
                console.error('Failed to delete file:', error);
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

  const handlePlayPause = () => {
    // TODO: Implement actual audio/video playback
    // For now, this is a placeholder that demonstrates the UI flow
    setIsPlaying(!isPlaying);
    console.log(isPlaying ? '⏸️ Paused playback' : '▶️ Started playback');

    // Placeholder: In production, use react-native-video or react-native-sound
    // to play the recorded file at recordedUri
  };

  const handleUseRecording = () => {
    if (!recordedUri) {
      Alert.alert('Error', 'No recording available');
      return;
    }

    const timestamp = Date.now();
    const extension = mode === 'video' ? 'mp4' : 'm4a';
    const mimeType = mode === 'video' ? 'video/mp4' : 'audio/mp4';
    const fileName = `${mode}_recording_${timestamp}.${extension}`;

    // TODO: Get actual file size from the recorded file
    const mockSize = duration * (mode === 'video' ? 1000000 : 100000); // Rough estimate

    onFileReady({
      uri: recordedUri,
      name: fileName,
      type: mimeType,
      size: mockSize,
    });
  };

  const renderControls = () => {
    if (recordingState === 'stopped' && recordedUri) {
      return (
        <View style={styles.stoppedControls}>
          {mode === 'video' && (
            <View style={[styles.videoPreview, { backgroundColor: theme.colors.border }]}>
              <Icon name="video" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
                Video Preview
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
                  {formatDuration(duration)}
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
              <Text style={styles.useButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.recordingControls}>
        {mode === 'video' && recordingState !== 'idle' && (
          <View style={[styles.videoPreview, { backgroundColor: theme.colors.border }]}>
            <Icon name="video" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
              {recordingState === 'recording' ? 'Recording...' : 'Paused'}
            </Text>
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
  videoPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
});
