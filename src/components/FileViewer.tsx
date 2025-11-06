import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';

// Lazy load PDF library to avoid initialization issues when viewing images
let Pdf: any = null;
try {
  Pdf = require('react-native-pdf').default;
} catch (e) {
  console.warn('PDF library not available:', e);
}

interface FileViewerProps {
  visible: boolean;
  fileUri: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  visible,
  fileUri,
  fileName,
  fileType,
  onClose,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const isImage = fileType.startsWith('image/');
  const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setTotalPages(0);
    }
  }, [visible, fileUri]);

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              setError(null);
              setLoading(true);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isImage) {
      return (
        <Pressable style={styles.imageContainer} onPress={onClose}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading image...
              </Text>
            </View>
          )}
          <Image
            source={{ uri: fileUri }}
            style={styles.image}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Failed to load image');
            }}
          />
          <View style={styles.tapHint}>
            <Text style={[styles.tapHintText, { color: 'rgba(255,255,255,0.7)' }]}>
              Tap to close
            </Text>
          </View>
        </Pressable>
      );
    }

    if (isPDF) {
      if (!Pdf) {
        return (
          <View style={styles.unsupportedContainer}>
            <Icon name="file" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.unsupportedText, { color: theme.colors.text }]}>
              PDF viewer not available
            </Text>
            <Text style={[styles.unsupportedHint, { color: theme.colors.textSecondary }]}>
              Please use the Share button to view this PDF
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.pdfContainer}>
          <Pdf
            source={{ uri: fileUri }}
            style={styles.pdf}
            onLoadComplete={(numberOfPages: number) => {
              console.log(`PDF loaded with ${numberOfPages} pages`);
              setTotalPages(numberOfPages);
              setLoading(false);
            }}
            onPageChanged={(page: number) => {
              console.log(`Current page: ${page}`);
              setCurrentPage(page);
            }}
            onError={(error: any) => {
              console.error('PDF load error:', error);
              setLoading(false);
              setError('Failed to load PDF');
            }}
            trustAllCerts={false}
            enablePaging
            spacing={10}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading PDF...
              </Text>
            </View>
          )}
          {!loading && totalPages > 0 && (
            <View style={[styles.pageIndicator, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <Text style={styles.pageIndicatorText}>
                Page {currentPage} of {totalPages}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.unsupportedContainer}>
        <Icon name="file" size={64} color={theme.colors.textSecondary} />
        <Text style={[styles.unsupportedText, { color: theme.colors.text }]}>
          Preview not available for this file type
        </Text>
        <Text style={[styles.unsupportedHint, { color: theme.colors.textSecondary }]}>
          {fileType}
        </Text>
      </View>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      transparent={false}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
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
          {renderContent()}
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
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
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
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  unsupportedText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  unsupportedHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  tapHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tapHintText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
