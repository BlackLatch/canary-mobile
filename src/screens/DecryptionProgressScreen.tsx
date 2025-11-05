import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';
import { retrieveFromPinata } from '../lib/pinata';
import { decryptFile } from '../lib/tacoMobile';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

type FileStatus = 'pending' | 'downloading' | 'decrypting' | 'completed' | 'failed';

interface DecryptedFile {
  index: number;
  ipfsHash: string;
  status: FileStatus;
  progress: number;
  error?: string;
  localPath?: string;
  fileName?: string;
  fileType?: string;
  size?: number;
}

type DecryptionProgressRouteProp = {
  params: {
    dossierId: string;
    encryptedFileHashes: string[];
  };
};

export const DecryptionProgressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<DecryptionProgressRouteProp>();
  const { theme } = useTheme();
  const { dossierId, encryptedFileHashes } = route.params;

  const [files, setFiles] = useState<DecryptedFile[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(true);

  useEffect(() => {
    const initialFiles: DecryptedFile[] = encryptedFileHashes.map((hash, index) => ({
      index,
      ipfsHash: hash,
      status: 'pending',
      progress: 0,
    }));
    setFiles(initialFiles);
    startDecryption(initialFiles);
  }, []);

  const updateFileStatus = (index: number, updates: Partial<DecryptedFile>) => {
    setFiles(prev => prev.map((file, i) =>
      i === index ? { ...file, ...updates } : file
    ));
  };

  const getFileTypeFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) return 'audio';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'file';
  };

  const startDecryption = async (initialFiles: DecryptedFile[]) => {
    const downloadDir = Platform.OS === 'ios' ? RNFS.DocumentDirectoryPath : RNFS.DownloadDirectoryPath;
    const dossierDir = `${downloadDir}/Canary/Dossier_${dossierId}`;
    await RNFS.mkdir(dossierDir, { NSURLIsExcludedFromBackupKey: false });

    for (let i = 0; i < initialFiles.length; i++) {
      const file = initialFiles[i];

      try {
        updateFileStatus(i, { status: 'downloading', progress: 0 });
        const encryptedData = await retrieveFromPinata(file.ipfsHash);
        updateFileStatus(i, { status: 'downloading', progress: 50, size: encryptedData.length });

        updateFileStatus(i, { status: 'decrypting', progress: 60 });
        const decryptedData = await decryptFile(encryptedData);
        updateFileStatus(i, { status: 'decrypting', progress: 90 });

        const fileName = `file_${i + 1}_decrypted.bin`;
        const decryptedPath = `${dossierDir}/${fileName}`;
        await RNFS.writeFile(decryptedPath, Buffer.from(decryptedData).toString('base64'), 'base64');

        updateFileStatus(i, {
          status: 'completed',
          progress: 100,
          localPath: decryptedPath,
          fileName,
          fileType: getFileTypeFromPath(fileName),
          size: decryptedData.length
        });
      } catch (error: any) {
        updateFileStatus(i, { status: 'failed', progress: 0, error: error.message || 'Unknown error' });
      }
    }

    setIsDecrypting(false);
  };

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'pending': return 'clock';
      case 'downloading': return 'download';
      case 'decrypting': return 'lock';
      case 'completed': return 'check-circle';
      case 'failed': return 'x-circle';
    }
  };

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case 'pending': return theme.colors.textSecondary;
      case 'downloading': return '#3B82F6';
      case 'decrypting': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={isDecrypting}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Decrypting Files</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {completedCount} of {files.length} completed {failedCount > 0 && `• ${failedCount} failed`}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {files.map((file) => (
          <View key={file.index} style={[styles.fileCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.fileHeader}>
              <View style={styles.fileIconContainer}>
                <Icon name="file" size={24} color={file.status === 'completed' ? theme.colors.primary : theme.colors.textSecondary} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: theme.colors.text }]}>
                  {file.fileName || `File ${file.index + 1}`}
                </Text>
                <Text style={[styles.fileSize, { color: theme.colors.textSecondary }]}>
                  {formatBytes(file.size)}
                </Text>
              </View>
              <Icon name={getStatusIcon(file.status)} size={20} color={getStatusColor(file.status)} />
            </View>

            {(file.status === 'downloading' || file.status === 'decrypting') && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                  <View style={[styles.progressFill, { width: `${file.progress}%`, backgroundColor: getStatusColor(file.status) }]} />
                </View>
                <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                  {file.status === 'downloading' ? 'Downloading...' : 'Decrypting...'}
                </Text>
              </View>
            )}

            {file.status === 'failed' && file.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{file.error}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {!isDecrypting && (
        <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Icon name="check-circle" size={20} color="#10B981" />
              <Text style={[styles.summaryText, { color: theme.colors.text }]}>{completedCount} Completed</Text>
            </View>
            {failedCount > 0 && (
              <View style={styles.summaryItem}>
                <Icon name="x-circle" size={20} color="#EF4444" />
                <Text style={[styles.summaryText, { color: theme.colors.text }]}>{failedCount} Failed</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.doneButton, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backButton: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  fileCard: { borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  fileHeader: { flexDirection: 'row', alignItems: 'center' },
  fileIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  fileSize: { fontSize: 14 },
  progressContainer: { marginTop: 12 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 12, marginTop: 6 },
  errorContainer: { marginTop: 8, padding: 8, backgroundColor: '#FEE2E2', borderRadius: 6 },
  errorText: { fontSize: 12, color: '#EF4444' },
  footer: { padding: 16, borderTopWidth: 1 },
  summaryContainer: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: 14, fontWeight: '600' },
  doneButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  doneButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
