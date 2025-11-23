import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  Image,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import Icon from 'react-native-vector-icons/Feather';
import { useDossier } from '../contexts/DossierContext';
import { useNavigation } from '@react-navigation/native';
import { MediaRecorder } from '../components/MediaRecorder';
import { ErrorDialog } from '../components/ErrorDialog';
import { SuccessDialog } from '../components/SuccessDialog';
import { FileViewer } from '../components/FileViewer';
import { QRScanner } from '../components/QRScanner';
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';

type ReleaseMode = 'public' | 'private';
type RecordingMode = 'voice' | 'video' | null;

const INTERVAL_PRESETS = [
  { label: '1 Hour', value: '60', display: '1H' },
  { label: '24 Hours', value: '1440', display: '24H' },
  { label: '30 Days', value: '43200', display: '30D' },
  { label: '1 Year', value: '525600', display: '1Y' },
];

export const CreateDossierScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { createDossier } = useDossier();
  const { address, signTypedData } = useWallet();

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Error dialog state
  const [errorDialog, setErrorDialog] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  // Step 1: Dossier Details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Visibility
  const [releaseMode, setReleaseMode] = useState<ReleaseMode | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<string[]>(['']);
  const [expandedRecommendations, setExpandedRecommendations] = useState<ReleaseMode | null>(null);
  const [step2SubStep, setStep2SubStep] = useState<'selection' | 'recipients'>('selection'); // selection or recipients management

  // Step 3: Guardian Configuration
  const [guardians, setGuardians] = useState<string[]>(['']);
  const [guardianThreshold, setGuardianThreshold] = useState('1');
  const [enableGuardians, setEnableGuardians] = useState(false);

  // Step 4: Check-in Schedule (was Step 3)
  const [checkInInterval, setCheckInInterval] = useState('');
  const [customInterval, setCustomInterval] = useState('');

  // Step 5: File Encryption (was Step 4)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [termsSignature, setTermsSignature] = useState<string | null>(null);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ uri: string; name: string; type: string; size: number }>>([]);
  const [viewingFile, setViewingFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanningForGuardian, setScanningForGuardian] = useState<number | null>(null);
  const [scanningForRecipient, setScanningForRecipient] = useState<number | null>(null);

  // Creation progress modal state
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [creationStatus, setCreationStatus] = useState<string>('Preparing files...');

  // Format hours into friendly display
  const formatInterval = (hours: number): string => {
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else if (hours < 168) { // Less than a week
      const days = Math.round(hours / 24);
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    } else if (hours < 720) { // Less than a month (30 days)
      const weeks = Math.round(hours / 168);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
    } else if (hours < 8760) { // Less than a year
      const months = Math.round(hours / 730);
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    } else {
      const years = (hours / 8760).toFixed(1);
      return `${years} ${years === '1.0' ? 'year' : 'years'}`;
    }
  };

  // Generate random name
  const generateRandomName = () => {
    const adjectives = ['Blue', 'Red', 'Green', 'Silver', 'Gold', 'Alpha', 'Beta', 'Delta', 'Echo', 'Falcon', 'Tiger', 'Eagle', 'Phoenix', 'Storm', 'Lightning', 'Thunder', 'Shadow', 'Crystal', 'Diamond', 'Steel'];
    const nouns = ['Dossier', 'Package', 'Bundle', 'Archive', 'Collection', 'Set', 'Group', 'Batch', 'Series', 'Unit', 'Assembly', 'Kit'];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

    setName(`${randomAdj} ${randomNoun} ${randomNum}`);
  };

  // Handle recorded file
  const handleFileReady = (file: { uri: string; name: string; type: string; size: number }) => {
    setUploadedFiles(prev => [...prev, file]);
    setRecordingMode(null);
    setSuccessDialog({
      visible: true,
      message: `${file.name} has been added to your dossier`,
    });
  };

  // Remove uploaded file
  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle photo selection from library
  const handlePickPhotos = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 0, // 0 = unlimited
        quality: 1,
        includeBase64: false,
      });

      if (result.didCancel) {
        // console.log('User cancelled photo picker');
        return;
      }

      if (result.errorCode) {
        // console.error('Photo picker error:', result.errorMessage);
        setErrorDialog({ visible: true, message: 'Failed to select photos' });
        return;
      }

      if (result.assets) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri || '',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (err) {
      // console.error('Error picking photos:', err);
      setErrorDialog({ visible: true, message: 'Failed to select photos' });
    }
  };

  // Handle file selection
  const handlePickFiles = async () => {
    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
      });

      const newFiles = results.map(file => ({
        uri: file.uri,
        name: file.name || 'Unknown',
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
      }));

      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
        // console.log('User cancelled file picker');
      } else {
        // console.error('Error picking files:', err);
        setErrorDialog({ visible: true, message: 'Failed to select files' });
      }
    }
  };

  // Get icon name for file type
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'music';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'file-text';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'file-text';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'file-text';
    return 'file';
  };

  // Validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        if (!releaseMode) {
          return false; // Must select a release mode
        }
        if (releaseMode === 'private') {
          const validContacts = emergencyContacts.filter(c => c.trim().length > 0);
          return validContacts.length > 0;
        }
        return true;
      case 3:
        // Guardian step - always valid (guardians are optional)
        if (enableGuardians) {
          const validGuardians = guardians.filter(g => g.trim().length > 0);
          const threshold = parseInt(guardianThreshold);
          return validGuardians.length > 0 &&
                 !isNaN(threshold) &&
                 threshold >= 1 &&
                 threshold <= validGuardians.length;
        }
        return true;
      case 4:
        if (checkInInterval === 'custom') {
          const hours = parseInt(customInterval);
          return !isNaN(hours) && hours >= 1 && hours <= 8760;
        }
        return checkInInterval.length > 0;
      case 5:
        return hasAcceptedTerms;
      case 6:
        // Finalize: Ensure all previous steps are complete AND files are uploaded
        const step1Valid = name.trim().length > 0;
        const step2Valid = releaseMode !== null &&
          (releaseMode === 'public' || emergencyContacts.filter(c => c.trim().length > 0).length > 0);
        const step3Valid = !enableGuardians || (
          guardians.filter(g => g.trim().length > 0).length > 0 &&
          parseInt(guardianThreshold) >= 1 &&
          parseInt(guardianThreshold) <= guardians.filter(g => g.trim().length > 0).length
        );
        const step4Valid = checkInInterval === 'custom'
          ? !isNaN(parseInt(customInterval)) && parseInt(customInterval) >= 1 && parseInt(customInterval) <= 8760
          : checkInInterval.length > 0;
        const step5Valid = hasAcceptedTerms;
        const filesUploaded = uploadedFiles.length > 0;

        return step1Valid && step2Valid && step3Valid && step4Valid && step5Valid && filesUploaded;
      default:
        return false;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < 6 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
      // Reset step 2 sub-step when leaving step 2
      if (currentStep === 2) {
        setStep2SubStep('selection');
      }
    } else if (currentStep === 6) {
      handleFinalize();
    }
  };

  const handleBack = () => {
    // Handle sub-step navigation for step 2
    if (currentStep === 2 && step2SubStep === 'recipients') {
      setStep2SubStep('selection');
      return;
    }

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Reset step 2 sub-step when entering step 2 from step 3
      if (currentStep === 3) {
        setStep2SubStep('selection');
      }
    }
  };

  // Emergency contacts management
  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, '']);
  };

  const removeEmergencyContact = (index: number) => {
    const updated = emergencyContacts.filter((_, i) => i !== index);
    setEmergencyContacts(updated.length > 0 ? updated : ['']);
  };

  const updateEmergencyContact = (index: number, value: string) => {
    // Check for duplicate recipient addresses
    const trimmedValue = value.trim().toLowerCase();
    if (trimmedValue.length > 0) {
      const hasDuplicate = emergencyContacts.some((contact, i) =>
        i !== index && contact.trim().toLowerCase() === trimmedValue
      );

      if (hasDuplicate) {
        Alert.alert(
          'Duplicate Address',
          'This recipient address has already been added. Each recipient must have a unique address.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const updated = [...emergencyContacts];
    updated[index] = value;
    setEmergencyContacts(updated);
  };

  // Guardian management
  const addGuardian = () => {
    setGuardians([...guardians, '']);
  };

  const removeGuardian = (index: number) => {
    const updated = guardians.filter((_, i) => i !== index);
    setGuardians(updated.length > 0 ? updated : ['']);
    // Update threshold if it's greater than the number of guardians
    const validGuardians = updated.filter(g => g.trim().length > 0).length;
    if (parseInt(guardianThreshold) > validGuardians) {
      setGuardianThreshold(Math.max(1, validGuardians).toString());
    }
  };

  const updateGuardian = (index: number, value: string) => {
    // Check for duplicate guardian addresses
    const trimmedValue = value.trim().toLowerCase();
    if (trimmedValue.length > 0) {
      const hasDuplicate = guardians.some((guardian, i) =>
        i !== index && guardian.trim().toLowerCase() === trimmedValue
      );

      if (hasDuplicate) {
        Alert.alert(
          'Duplicate Address',
          'This guardian address has already been added. Each guardian must have a unique address.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const updated = [...guardians];
    updated[index] = value;
    setGuardians(updated);
  };

  // Calculate next check-in times
  const getNextCheckInTimes = () => {
    const hours = checkInInterval === 'custom'
      ? parseInt(customInterval)
      : parseInt(checkInInterval) / 60;

    if (isNaN(hours) || hours <= 0) return [];

    const times = [];
    for (let i = 1; i <= 3; i++) {
      const date = new Date(Date.now() + (hours * i * 60 * 60 * 1000));
      times.push(date.toLocaleString());
    }
    return times;
  };

  // Finalize and create dossier
  const handleFinalize = () => {
    // console.log('🔵 handleFinalize called');

    // Validate that at least one file has been added
    if (uploadedFiles.length === 0) {
      // console.log('❌ No files uploaded');
      setErrorDialog({
        visible: true,
        message: 'Please add at least one file to your dossier before creating it.',
      });
      return;
    }

    // Show modal immediately - this will render before the async work starts
    setShowCreationModal(true);
    setCreationStatus('Preparing files...');

    // Use setTimeout to ensure the modal renders before we start the heavy work
    setTimeout(() => {
      performCreation();
    }, 100);
  };

  const performCreation = async () => {
    try {
      // Convert interval to seconds
      const intervalMinutes = checkInInterval === 'custom'
        ? parseInt(customInterval) * 60
        : parseInt(checkInInterval);

      const intervalSeconds = intervalMinutes * 60;

      // Prepare recipients based on release mode
      const recipients = releaseMode === 'private'
        ? emergencyContacts.filter(c => c.trim().length > 0) as `0x${string}`[]
        : [];

      // Prepare guardians if enabled
      const finalGuardians = enableGuardians
        ? guardians.filter(g => g.trim().length > 0) as `0x${string}`[]
        : [];
      const finalThreshold = enableGuardians ? parseInt(guardianThreshold) : 0;

      // Create the dossier
      setCreationStatus('Encrypting and uploading files...');
      const result = await createDossier(
        name.trim(),
        description.trim(),
        BigInt(intervalSeconds),
        recipients,
        uploadedFiles,
        finalGuardians,
        finalThreshold
      );

      if (result.success) {
        setCreationStatus('Dossier created successfully!');
        setTimeout(() => {
          setShowCreationModal(false);
          navigation.goBack();
        }, 1500);
      } else {
        setShowCreationModal(false);
        setErrorDialog({
          visible: true,
          message: result.error || 'Failed to create dossier',
        });
      }
    } catch (error: any) {
      // console.error('❌ Create dossier error:', error);
      setShowCreationModal(false);
      setErrorDialog({ visible: true, message: error.message || 'An unexpected error occurred' });
    }
  };

  // Render step indicators
  const renderStepIndicators = () => (
    <View style={styles.stepIndicators}>
      {[1, 2, 3, 4, 5, 6].map((step, index) => {
        // A step is completed if it's before the current step AND it's valid
        const isCompleted = step < currentStep && isStepValid(step);

        return (
          <React.Fragment key={step}>
            <TouchableOpacity
              style={[
                styles.stepIndicator,
                step === currentStep && styles.stepIndicatorActive,
                isCompleted && styles.stepIndicatorCompleted,
              ]}
              onPress={() => setCurrentStep(step)}
            >
              <Text
                style={[
                  styles.stepIndicatorText,
                  (step === currentStep || isCompleted) && styles.stepIndicatorTextActive,
                ]}
              >
                {isCompleted ? '✓' : step}
              </Text>
            </TouchableOpacity>
            {index < 5 && (
              <View
                style={[
                  styles.stepConnector,
                  isCompleted && styles.stepConnectorCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      default:
        return null;
    }
  };

  // Step 1: Dossier Details
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Dossier Details
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Step 1 of 6
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Dossier Name <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, styles.inputWithButtonInput, {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              placeholder="Name your dossier"
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              style={[styles.randomButton, { borderColor: theme.colors.border }]}
              onPress={generateRandomName}
            >
              <Text style={[styles.randomButtonText, { color: theme.colors.textSecondary }]}>
                Random
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            A unique title to identify this dossier
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Description{' '}
            <Text style={{ color: theme.colors.textSecondary }}>(Optional)</Text>
          </Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }]}
            placeholder="Add a description of what this dossier contains..."
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
          About the Description Field
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          The description is PUBLIC and visible on the blockchain. Do not include sensitive information.
        </Text>
      </View>
    </View>
  );

  // Step 2: Visibility - Selection Screen
  const renderStep2Selection = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Visibility
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Step 2 of 6
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            releaseMode === 'public' && styles.optionCardSelected,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
          onPress={() => setReleaseMode('public')}
        >
          <View style={styles.optionHeader}>
            <View style={[
              styles.radioButton,
              releaseMode === 'public' && styles.radioButtonSelected,
            ]}>
              {releaseMode === 'public' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
              Public Release
            </Text>
          </View>
          <View style={styles.optionDescriptionContainer}>
            <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
              Your document will be automatically decrypted and made publicly accessible if no check-in occurs by your selected deadline.
            </Text>

            <TouchableOpacity
              style={styles.recommendedToggle}
              onPress={() => setExpandedRecommendations(expandedRecommendations === 'public' ? null : 'public')}
            >
              <Text style={[styles.optionRecommendedTitle, { color: theme.colors.primary }]}>
                Recommended when
              </Text>
              <Icon
                name={expandedRecommendations === 'public' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            {expandedRecommendations === 'public' && (
              <View style={styles.recommendedContent}>
                <Text style={[styles.optionBullet, { color: theme.colors.textSecondary }]}>
                  • You intend for the document to become public
                </Text>
                <Text style={[styles.optionBullet, { color: theme.colors.textSecondary }]}>
                  • Broad visibility or long-term access is desired
                </Text>
                <Text style={[styles.optionBullet, { color: theme.colors.textSecondary }]}>
                  • Recipients are undefined or not individually selected
                </Text>
                <Text style={[styles.optionBullet, { color: theme.colors.textSecondary }]}>
                  • You want to ensure availability regardless of personal access
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            releaseMode === 'private' && styles.optionCardSelected,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
          onPress={() => {
            setReleaseMode('private');
            setStep2SubStep('recipients');
          }}
        >
          <View style={styles.optionHeader}>
            <View style={[
              styles.radioButton,
              releaseMode === 'private' && styles.radioButtonSelected,
            ]}>
              {releaseMode === 'private' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
              Private Release
            </Text>
          </View>
          <View style={styles.optionDescriptionContainer}>
            <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
              Your document will be privately sent to specific recipients if no check-in occurs by your selected deadline.
            </Text>

            <TouchableOpacity
              style={styles.recommendedToggle}
              onPress={() => setExpandedRecommendations(expandedRecommendations === 'private' ? null : 'private')}
            >
              <Text style={[styles.optionRecommendedTitle, { color: theme.colors.primary }]}>
                Recommended when
              </Text>
              <Icon
                name={expandedRecommendations === 'private' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            {expandedRecommendations === 'private' && (
              <View style={styles.recommendedContent}>
                <Text style={[styles.optionBullet, { color: theme.colors.textSecondary }]}>
                  • You want to share with selected individuals only
                </Text>
                <Text style={[styles.optionBullet, { color: theme.colors.textSecondary }]}>
                  • Privacy and discretion are priorities
                </Text>
                <Text style={[styles.optionBullet, { color: theme.colors.textSecondary }]}>
                  • You need direct delivery without public exposure
                </Text>
                <Text style={[styles.optionBullet, { color: theme.colors.textSecondary }]}>
                  • Recipients are trusted and known in advance
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

    </View>
  );

  // Step 2: Private Recipients Management Screen
  const renderStep2Contacts = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Private Recipients
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Step 2 of 6
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Private Recipient Addresses <Text style={styles.required}>*</Text>
        </Text>
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Enter Ethereum addresses for recipients who will receive your encrypted document
        </Text>

        {emergencyContacts.map((contact, index) => (
          <View key={index} style={styles.contactRow}>
            <TextInput
              style={[styles.input, styles.contactInput, {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              placeholder="0x..."
              placeholderTextColor={theme.colors.textSecondary}
              value={contact}
              onChangeText={(text) => updateEmergencyContact(index, text)}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => {
                setScanningForRecipient(index);
                setShowQRScanner(true);
              }}
            >
              <Icon name="camera" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            {emergencyContacts.length > 1 && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeEmergencyContact(index)}
              >
                <Icon name="x" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={addEmergencyContact}
        >
          <Icon name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Another Contact</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
          About Private Release
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          These addresses will receive access to decrypt your document if you fail to check in. Ensure these are trusted recipients with valid Ethereum addresses.
        </Text>
      </View>
    </View>
  );

  // Step 2: Router
  const renderStep2 = () => {
    if (step2SubStep === 'recipients') {
      return renderStep2Contacts();
    }
    return renderStep2Selection();
  };

  // Step 3: Guardian Configuration (NEW)
  const renderStep3 = () => {
    const validGuardians = guardians.filter(g => g.trim().length > 0);
    const threshold = parseInt(guardianThreshold) || 1;

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Guardian Protection
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Step 3 of 6
        </Text>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.guardianToggleContainer}>
            <View style={styles.guardianToggleLeft}>
              <Icon name="shield" size={20} color={theme.colors.primary} />
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Enable Guardian Protection
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggle,
                enableGuardians && styles.toggleActive,
                { backgroundColor: enableGuardians ? theme.colors.primary : theme.colors.surface }
              ]}
              onPress={() => setEnableGuardians(!enableGuardians)}
            >
              <View style={[
                styles.toggleKnob,
                enableGuardians && styles.toggleKnobActive,
              ]} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.infoText, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            Require multiple guardians to approve release for additional security
          </Text>
        </View>

        {enableGuardians && (
          <>
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Guardian Addresses <Text style={styles.required}>*</Text>
              </Text>
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                Add Ethereum addresses that will act as guardians
              </Text>

              {guardians.map((guardian, index) => (
                <View key={index} style={styles.contactRow}>
                  <TextInput
                    style={[styles.input, styles.contactInput, {
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    }]}
                    placeholder="0x..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={guardian}
                    onChangeText={(text) => updateGuardian(index, text)}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => {
                      setScanningForGuardian(index);
                      setShowQRScanner(true);
                    }}
                  >
                    <Icon name="camera" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  {guardians.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeGuardian(index)}
                    >
                      <Icon name="x" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={addGuardian}
              >
                <Icon name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Another Guardian</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Approval Threshold <Text style={styles.required}>*</Text>
              </Text>
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                Number of guardians required to approve release ({validGuardians.length > 0 ? `1-${validGuardians.length}` : '1'})
              </Text>

              <View style={[styles.thresholdContainer, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }]}>
                <TouchableOpacity
                  style={[styles.thresholdButton, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    const newThreshold = Math.max(1, threshold - 1);
                    setGuardianThreshold(newThreshold.toString());
                  }}
                  disabled={threshold <= 1}
                >
                  <Icon name="minus" size={20} color={threshold <= 1 ? theme.colors.textSecondary : theme.colors.text} />
                </TouchableOpacity>

                <Text style={[styles.thresholdValue, { color: theme.colors.text }]}>
                  {guardianThreshold}
                </Text>

                <TouchableOpacity
                  style={[styles.thresholdButton, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    const newThreshold = Math.min(validGuardians.length || 1, threshold + 1);
                    setGuardianThreshold(newThreshold.toString());
                  }}
                  disabled={threshold >= (validGuardians.length || 1)}
                >
                  <Icon name="plus" size={20} color={threshold >= (validGuardians.length || 1) ? theme.colors.textSecondary : theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                  How it works
                </Text>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  When your dossier expires, {guardianThreshold} out of {validGuardians.length || 1} guardian(s) must confirm before the dossier is released.
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  // Step 4: Check-in Schedule (was Step 3)
  const renderStep4 = () => {
    const checkInTimes = getNextCheckInTimes();

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Check-in Schedule
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Step 4 of 6
        </Text>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Select Check-in Interval <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.intervalGrid}>
            {INTERVAL_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                style={[
                  styles.intervalButton,
                  checkInInterval === preset.value && styles.intervalButtonSelected,
                  {
                    backgroundColor: checkInInterval === preset.value
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                  }
                ]}
                onPress={() => {
                  setCheckInInterval(preset.value);
                  setCustomInterval('');
                }}
              >
                <Text
                  style={[
                    styles.intervalButtonText,
                    {
                      color: checkInInterval === preset.value
                        ? '#FFFFFF'
                        : theme.colors.text,
                    }
                  ]}
                >
                  {preset.display}
                </Text>
                <Text
                  style={[
                    styles.intervalButtonLabel,
                    {
                      color: checkInInterval === preset.value
                        ? '#FFFFFF'
                        : theme.colors.textSecondary,
                    }
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.orDivider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Custom Interval (Hours)
            </Text>

            {/* Value display */}
            <View style={[styles.sliderValueContainer, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }]}>
              <Text style={[styles.sliderValueText, { color: theme.colors.text }]}>
                {formatInterval(parseInt(customInterval) || 24)}
              </Text>
            </View>

            {/* Slider - using logarithmic scale for better control at lower values */}
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={
                // Convert hours to logarithmic position (0-100)
                ((Math.log(parseInt(customInterval) || 24) - Math.log(1)) /
                (Math.log(8760) - Math.log(1))) * 100
              }
              onValueChange={(position) => {
                // Convert logarithmic position back to hours
                const hours = Math.round(
                  Math.exp(Math.log(1) + (position / 100) * (Math.log(8760) - Math.log(1)))
                );
                setCustomInterval(hours.toString());
                setCheckInInterval('custom');
              }}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.primary}
            />

            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabelText, { color: theme.colors.textSecondary }]}>
                1 hour
              </Text>
              <Text style={[styles.sliderLabelText, { color: theme.colors.textSecondary }]}>
                1 year (8760 hours)
              </Text>
            </View>
          </View>
        </View>

        {checkInTimes.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Next Check-in Times
            </Text>
            {checkInTimes.map((time, index) => (
              <Text key={index} style={[styles.checkInTime, { color: theme.colors.textSecondary }]}>
                Check-in #{index + 1}: {time}
              </Text>
            ))}
          </View>
        )}

        <View style={[styles.warningCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Icon name="info" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
            The dossier will be automatically released if you don't check in within this timeframe.
          </Text>
        </View>
      </View>
    );
  };

  // Step 5: File Encryption (was Step 4)
  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        File Encryption
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Step 5 of 6
      </Text>

      {!hasAcceptedTerms ? (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
            You must cryptographically sign the Acceptable Use Policy & Terms of Service before proceeding.
          </Text>

          <View style={styles.documentLinksContainer}>
            <TouchableOpacity
              style={[styles.documentLinkButton, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }]}
              onPress={() => {
                Linking.openURL('https://demo.canaryapp.io/terms-of-service');
              }}
            >
              <Icon name="file-text" size={18} color={theme.colors.primary} />
              <Text style={[styles.documentLinkText, { color: theme.colors.text }]}>
                Terms of Service
              </Text>
              <Icon name="external-link" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.documentLinkButton, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }]}
              onPress={() => {
                Linking.openURL('https://demo.canaryapp.io/acceptable-use-policy');
              }}
            >
              <Icon name="file-text" size={18} color={theme.colors.primary} />
              <Text style={[styles.documentLinkText, { color: theme.colors.text }]}>
                Acceptable Use Policy
              </Text>
              <Icon name="external-link" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
            onPress={async () => {
              try {
                if (!address) {
                  setErrorDialog({ visible: true, message: 'No wallet connected' });
                  return;
                }

                // Define EIP-712 domain
                const domain = {
                  name: 'Canary',
                  version: '1',
                  chainId: 11155111, // Status Testnet (Sepolia)
                };

                // Define EIP-712 types
                const types = {
                  Terms: [
                    { name: 'acceptor', type: 'address' },
                    { name: 'document', type: 'string' },
                    { name: 'timestamp', type: 'uint256' },
                  ],
                };

                // Define EIP-712 value
                const value = {
                  acceptor: address,
                  document: 'Canary Acceptable Use Policy & Terms of Service v1.0',
                  timestamp: Math.floor(Date.now() / 1000),
                };

                // Sign typed data
                const signature = await signTypedData(domain, types, value);

                // Store signature and mark as accepted
                setTermsSignature(signature);
                setHasAcceptedTerms(true);

                // console.log('✅ Terms signed:', signature);
              } catch (error) {
                // console.error('❌ Failed to sign terms:', error);
                setErrorDialog({ visible: true, message: 'Failed to sign terms. Please try again.' });
              }
            }}
          >
            <Text style={styles.acceptButtonText}>Sign Terms to Continue</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Record Media
            </Text>
            <View style={styles.recordingButtons}>
              <TouchableOpacity
                style={[styles.recordButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => setRecordingMode('voice')}
              >
                <Icon name="mic" size={24} color={theme.colors.primary} />
                <Text style={[styles.recordButtonText, { color: theme.colors.text }]}>
                  Voice Recording
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.recordButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => setRecordingMode('video')}
              >
                <Icon name="video" size={24} color={theme.colors.primary} />
                <Text style={[styles.recordButtonText, { color: theme.colors.text }]}>
                  Video Recording
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Add Files
            </Text>
            <View style={styles.recordingButtons}>
              <TouchableOpacity
                style={[styles.recordButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={handlePickPhotos}
              >
                <Icon name="image" size={24} color={theme.colors.primary} />
                <Text style={[styles.recordButtonText, { color: theme.colors.text }]}>
                  Select Photos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.recordButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={handlePickFiles}
              >
                <Icon name="file-plus" size={24} color={theme.colors.primary} />
                <Text style={[styles.recordButtonText, { color: theme.colors.text }]}>
                  Choose Files
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {uploadedFiles.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Uploaded Files ({uploadedFiles.length})
              </Text>
              {uploadedFiles.map((file, index) => {
                const canPreview = file.type.startsWith('image/') || file.type.includes('pdf');

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.fileRow, { borderTopColor: theme.colors.border }]}
                    onPress={() => {
                      if (canPreview) {
                        setViewingFile({
                          uri: file.uri,
                          name: file.name,
                          type: file.type,
                        });
                      }
                    }}
                    disabled={!canPreview}
                  >
                    <Icon
                      name={getFileIcon(file.type)}
                      size={20}
                      color={theme.colors.primary}
                    />
                    <View style={styles.fileInfo}>
                      <View style={styles.fileNameRow}>
                        <Text
                          style={[styles.fileName, { color: theme.colors.text }]}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {file.name}
                        </Text>
                        {canPreview && (
                          <Icon name="eye" size={14} color={theme.colors.textSecondary} />
                        )}
                      </View>
                      <Text style={[styles.fileSize, { color: theme.colors.textSecondary }]}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveFile(index)}>
                      <Icon name="trash-2" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
          How It Works
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          • Files are encrypted locally on your device before upload{'\n'}
          • Only you control access and timing{'\n'}
          • All encryption happens locally - files are never uploaded unencrypted
        </Text>
      </View>
    </View>
  );

  // Step 6: Finalize (was Step 5)
  const renderStep6 = () => {
    const validContacts = emergencyContacts.filter(c => c.trim().length > 0);
    const validGuardians = guardians.filter(g => g.trim().length > 0);
    const intervalDisplay = checkInInterval === 'custom'
      ? `${customInterval} hour(s)`
      : INTERVAL_PRESETS.find(p => p.value === checkInInterval)?.label || '';

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Finalize
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Step 6 of 6
        </Text>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Dossier Name
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {name || 'Untitled'}
          </Text>

          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Release Visibility
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {releaseMode === 'public' ? 'Public Release' : 'Private Release'}
          </Text>

          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Check-in Frequency
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {intervalDisplay}
          </Text>

          {enableGuardians && validGuardians.length > 0 && (
            <>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Guardian Protection
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {guardianThreshold} of {validGuardians.length} guardians required
              </Text>
              {validGuardians.map((guardian, index) => (
                <View key={index} style={styles.summaryContactRow}>
                  <Text style={[styles.summaryContactLabel, { color: theme.colors.textSecondary }]}>
                    Guardian #{index + 1}
                  </Text>
                  <Text style={[styles.summaryContact, { color: theme.colors.text }]}>
                    {guardian}
                  </Text>
                </View>
              ))}
            </>
          )}

          {releaseMode === 'private' && validContacts.length > 0 && (
            <>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Private Recipients
              </Text>
              {validContacts.map((contact, index) => (
                <View key={index} style={styles.summaryContactRow}>
                  <Text style={[styles.summaryContactLabel, { color: theme.colors.textSecondary }]}>
                    Recipient #{index + 1}
                  </Text>
                  <Text style={[styles.summaryContact, { color: theme.colors.text }]}>
                    {contact}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
            What Happens Next
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            1. Encryption: Files encrypted locally using TACo protocol{'\n'}
            2. Storage: Encrypted files uploaded to IPFS{'\n'}
            3. Smart Contract: Blockchain record created with conditions{'\n'}
            4. Activation: Check-in timer starts immediately
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Create Dossier
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step Indicators */}
      {renderStepIndicators()}

      {/* Step Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.backNavButton,
            currentStep === 1 && styles.navButtonDisabled,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border }
          ]}
          onPress={handleBack}
          disabled={currentStep === 1}
        >
          <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextNavButton,
            !isStepValid(currentStep) && styles.navButtonDisabled,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={handleNext}
          disabled={!isStepValid(currentStep) || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextNavButtonText}>
              {currentStep === 6 ? 'Finalize' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Media Recorder Modal */}
      <Modal
        visible={recordingMode !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setRecordingMode(null)}
      >
        {recordingMode && (
          <MediaRecorder
            mode={recordingMode}
            onFileReady={handleFileReady}
            onClose={() => setRecordingMode(null)}
          />
        )}
      </Modal>

      {/* Error Dialog */}
      <ErrorDialog
        visible={errorDialog.visible}
        message={errorDialog.message}
        onDismiss={() => setErrorDialog({ visible: false, message: '' })}
      />

      {/* Success Dialog */}
      <SuccessDialog
        visible={successDialog.visible}
        message={successDialog.message}
        onDismiss={() => {
          setSuccessDialog({ visible: false, message: '' });
          // If this was the dossier creation success, navigate back
          if (successDialog.message === 'Dossier created successfully!') {
            navigation.goBack();
          }
        }}
      />

      {/* File Viewer */}
      {viewingFile && (
        <FileViewer
          visible={true}
          fileUri={viewingFile.uri}
          fileName={viewingFile.name}
          fileType={viewingFile.type}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* Creation Progress Modal */}
      <Modal
        visible={showCreationModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.creationModalOverlay}>
          <View style={[styles.creationModalContent, { backgroundColor: theme.colors.card }]}>
            <Image
              source={require('../assets/canary-loader.gif')}
              style={styles.loaderGif}
              resizeMode="contain"
            />
            <Text style={[styles.creationModalText, { color: theme.colors.text }]}>
              {creationStatus}
            </Text>
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <QRScanner
        visible={showQRScanner}
        onClose={() => {
          setShowQRScanner(false);
          setScanningForGuardian(null);
          setScanningForRecipient(null);
        }}
        onScan={(address) => {
          if (scanningForRecipient !== null) {
            updateEmergencyContact(scanningForRecipient, address);
          } else if (scanningForGuardian !== null) {
            updateGuardian(scanningForGuardian, address);
          }
          setShowQRScanner(false);
          setScanningForGuardian(null);
          setScanningForRecipient(null);
        }}
      />
    </SafeAreaView>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 0,
  },
  stepIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepConnector: {
    width: 20,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 2,
  },
  stepConnectorCompleted: {
    backgroundColor: '#10B981',
  },
  stepIndicatorActive: {
    backgroundColor: '#e53e3e',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#10B981',
  },
  stepIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepIndicatorTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
  },
  stepContent: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: -8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  required: {
    color: '#e53e3e',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputWithButton: {
    position: 'relative',
  },
  inputWithButtonInput: {
    paddingRight: 90,
  },
  randomButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
  },
  randomButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  optionCardSelected: {
    borderColor: '#e53e3e',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#e53e3e',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e53e3e',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  optionDescriptionContainer: {
    gap: 12,
  },
  recommendedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionRecommendedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  recommendedContent: {
    marginTop: 8,
    gap: 8,
  },
  optionBullet: {
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactInput: {
    flex: 1,
  },
  scanButton: {
    padding: 8,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  intervalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  intervalButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  intervalButtonSelected: {
    borderColor: '#e53e3e',
  },
  intervalButtonText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  intervalButtonLabel: {
    fontSize: 12,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkInTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  warningCard: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  documentLinksContainer: {
    gap: 12,
    marginBottom: 20,
  },
  documentLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  documentLinkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  acceptButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButtonHint: {
    fontSize: 12,
  },
  comingSoonText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 16,
    marginBottom: 8,
  },
  summaryContactRow: {
    marginBottom: 12,
  },
  summaryContactLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryContact: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  navButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backNavButton: {
    borderWidth: 1,
  },
  nextNavButton: {},
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextNavButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Recording styles
  recordingButtons: {
    gap: 12,
    marginTop: 12,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  fileSize: {
    fontSize: 12,
  },
  // Slider styles
  sliderValueContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderValueText: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  sliderValueLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabelText: {
    fontSize: 12,
  },
  // Guardian styles
  guardianToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guardianToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    justifyContent: 'flex-end',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  thresholdButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdValue: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 32,
    minWidth: 40,
    textAlign: 'center',
  },
  creationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creationModalContent: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loaderGif: {
    width: 200,
    height: 200,
  },
  creationModalText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
