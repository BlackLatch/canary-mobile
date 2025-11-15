import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';
import { useDossier } from '../contexts/DossierContext';
import type { Address } from 'viem';

type ProgressStep =
  | 'preparing'
  | 'encrypting_manifest'
  | 'encrypting_files'
  | 'uploading_manifest'
  | 'uploading_files'
  | 'creating_onchain'
  | 'completed'
  | 'failed';

interface FileProgress {
  index: number;
  name: string;
  status: 'pending' | 'encrypting' | 'uploading' | 'completed' | 'failed';
}

type RouteParams = {
  name: string;
  description: string;
  checkInInterval: number; // Passed as number, will convert to BigInt when calling createDossier
  recipients: Address[];
  files: Array<{ uri: string; name: string; type: string; size: number }>;
};

export const DossierCreationProgressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { createDossier } = useDossier();

  const params = route.params as RouteParams;

  const [currentStep, setCurrentStep] = useState<ProgressStep>('preparing');
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Pulse animation for active indicators
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    console.log('🟢 DossierCreationProgressScreen mounted');
    // Small delay to ensure screen is visible before starting
    const timer = setTimeout(() => {
      console.log('🟢 Starting creation process...');
      startCreation();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const startCreation = async () => {
    try {
      // Initialize file progress
      const initialProgress: FileProgress[] = params.files.map((file, index) => ({
        index,
        name: file.name,
        status: 'pending',
      }));
      setFileProgress(initialProgress);

      // Step 1: Preparing
      setCurrentStep('preparing');
      await delay(500);

      // Step 2: Encrypting manifest
      setCurrentStep('encrypting_manifest');
      await delay(1000);

      // Step 3: Encrypting files
      setCurrentStep('encrypting_files');
      for (let i = 0; i < params.files.length; i++) {
        updateFileProgress(i, 'encrypting');
        await delay(800); // Simulate encryption time
        updateFileProgress(i, 'completed');
      }

      // Step 4: Uploading manifest
      setCurrentStep('uploading_manifest');
      await delay(1000);

      // Step 5: Uploading files
      setCurrentStep('uploading_files');
      for (let i = 0; i < params.files.length; i++) {
        updateFileProgress(i, 'uploading');
        await delay(800); // Simulate upload time
        updateFileProgress(i, 'completed');
      }

      // Step 6: Creating on-chain
      setCurrentStep('creating_onchain');

      // Actually create the dossier
      const result = await createDossier(
        params.name,
        params.description,
        BigInt(params.checkInInterval), // Convert to BigInt here
        params.recipients,
        params.files
      );

      if (result.success) {
        setCurrentStep('completed');
        // Navigate back after a short delay
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        setCurrentStep('failed');
        setError(result.error || 'Failed to create dossier');
      }
    } catch (err: any) {
      console.error('Creation error:', err);
      setCurrentStep('failed');
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const updateFileProgress = (index: number, status: FileProgress['status']) => {
    setFileProgress(prev =>
      prev.map((file, i) => (i === index ? { ...file, status } : file))
    );
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getStepInfo = (step: ProgressStep) => {
    switch (step) {
      case 'preparing':
        return { icon: 'package', text: 'Preparing files...', color: theme.colors.primary };
      case 'encrypting_manifest':
        return { icon: 'lock', text: 'Encrypting manifest...', color: '#F59E0B' };
      case 'encrypting_files':
        return { icon: 'shield', text: 'Encrypting files...', color: '#F59E0B' };
      case 'uploading_manifest':
        return { icon: 'upload-cloud', text: 'Uploading manifest...', color: '#3B82F6' };
      case 'uploading_files':
        return { icon: 'upload', text: 'Uploading files...', color: '#3B82F6' };
      case 'creating_onchain':
        return { icon: 'zap', text: 'Creating dossier on-chain...', color: '#8B5CF6' };
      case 'completed':
        return { icon: 'check-circle', text: 'Dossier created successfully!', color: '#10B981' };
      case 'failed':
        return { icon: 'x-circle', text: 'Failed to create dossier', color: '#EF4444' };
    }
  };

  const isStepActive = (step: ProgressStep) => currentStep === step;
  const isStepCompleted = (step: ProgressStep) => {
    const steps: ProgressStep[] = [
      'preparing',
      'encrypting_manifest',
      'encrypting_files',
      'uploading_manifest',
      'uploading_files',
      'creating_onchain',
      'completed',
    ];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    return stepIndex < currentIndex;
  };

  const stepInfo = getStepInfo(currentStep);

  console.log('🟢 DossierCreationProgressScreen rendering, currentStep:', currentStep);
  console.log('🟢 stepInfo:', stepInfo);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Creating Dossier</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {params.name}
        </Text>
      </View>

      {/* Main Progress Area */}
      <View style={styles.mainProgress}>
        {/* Large Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: `${stepInfo.color}15`,
              transform: [{ scale: isStepActive(currentStep) && currentStep !== 'completed' && currentStep !== 'failed' ? pulseAnim : 1 }],
            },
          ]}
        >
          <Icon
            name={stepInfo.icon}
            size={64}
            color={stepInfo.color}
          />
        </Animated.View>

        {/* Status Text */}
        <Text style={[styles.statusText, { color: theme.colors.text }]}>
          {stepInfo.text}
        </Text>

        {/* Loading Indicator */}
        {currentStep !== 'completed' && currentStep !== 'failed' && (
          <ActivityIndicator size="large" color={stepInfo.color} style={styles.spinner} />
        )}
      </View>

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          {['preparing', 'encrypting_manifest', 'encrypting_files', 'uploading_manifest', 'uploading_files', 'creating_onchain'].map((step) => {
            const stepCast = step as ProgressStep;
            const info = getStepInfo(stepCast);
            const isActive = isStepActive(stepCast);
            const isCompleted = isStepCompleted(stepCast);

            return (
              <View key={step} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepIcon,
                    { borderColor: isActive || isCompleted ? info.color : theme.colors.border },
                    isCompleted && { backgroundColor: info.color },
                  ]}
                >
                  {isCompleted ? (
                    <Icon name="check" size={16} color="#FFFFFF" />
                  ) : (
                    <View style={[styles.stepDot, isActive && { backgroundColor: info.color }]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepText,
                    { color: isActive || isCompleted ? theme.colors.text : theme.colors.textSecondary },
                    isActive && { fontWeight: '600' },
                  ]}
                >
                  {info.text}
                </Text>
                {isActive && currentStep !== 'completed' && currentStep !== 'failed' && (
                  <ActivityIndicator size="small" color={info.color} style={styles.stepSpinner} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* File Progress */}
      {(currentStep === 'encrypting_files' || currentStep === 'uploading_files') && fileProgress.length > 0 && (
        <View style={styles.filesContainer}>
          <Text style={[styles.filesTitle, { color: theme.colors.text }]}>
            Files ({fileProgress.filter(f => f.status === 'completed').length}/{fileProgress.length})
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {fileProgress.map((file) => (
              <View key={file.index} style={styles.fileRow}>
                <Icon
                  name={
                    file.status === 'completed'
                      ? 'check-circle'
                      : file.status === 'encrypting' || file.status === 'uploading'
                      ? 'loader'
                      : 'circle'
                  }
                  size={16}
                  color={
                    file.status === 'completed'
                      ? '#10B981'
                      : file.status === 'encrypting' || file.status === 'uploading'
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.fileName,
                    { color: file.status === 'completed' ? theme.colors.text : theme.colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {file.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <View style={[styles.errorCard, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  mainProgress: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  spinner: {
    marginTop: 8,
  },
  stepsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
  },
  stepSpinner: {
    marginLeft: 8,
  },
  filesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  errorCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
});
