import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/Feather';
import { useDossier } from '../contexts/DossierContext';
import { useNavigation } from '@react-navigation/native';

type ReleaseMode = 'public' | 'contacts';

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

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Dossier Details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Visibility
  const [releaseMode, setReleaseMode] = useState<ReleaseMode>('public');
  const [emergencyContacts, setEmergencyContacts] = useState<string[]>(['']);

  // Step 3: Check-in Schedule
  const [checkInInterval, setCheckInInterval] = useState('');
  const [customInterval, setCustomInterval] = useState('');

  // Step 4: File Encryption (simplified for now)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Generate random name
  const generateRandomName = () => {
    const adjectives = ['Blue', 'Red', 'Green', 'Silver', 'Gold', 'Alpha', 'Beta', 'Delta', 'Echo', 'Falcon', 'Tiger', 'Eagle', 'Phoenix', 'Storm', 'Lightning', 'Thunder', 'Shadow', 'Crystal', 'Diamond', 'Steel'];
    const nouns = ['Dossier', 'Package', 'Bundle', 'Archive', 'Collection', 'Set', 'Group', 'Batch', 'Series', 'Unit', 'Assembly', 'Kit'];

    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

    setName(`${randomAdj} ${randomNoun} ${randomNum}`);
  };

  // Validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        if (releaseMode === 'contacts') {
          const validContacts = emergencyContacts.filter(c => c.trim().length > 0);
          return validContacts.length > 0;
        }
        return true;
      case 3:
        if (checkInInterval === 'custom') {
          const hours = parseInt(customInterval);
          return !isNaN(hours) && hours >= 1 && hours <= 8760;
        }
        return checkInInterval.length > 0;
      case 4:
        return hasAcceptedTerms;
      case 5:
        return true;
      default:
        return false;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < 5 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 5) {
      handleFinalize();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
    const updated = [...emergencyContacts];
    updated[index] = value;
    setEmergencyContacts(updated);
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
  const handleFinalize = async () => {
    setIsSubmitting(true);
    try {
      // Convert interval to seconds
      const intervalMinutes = checkInInterval === 'custom'
        ? parseInt(customInterval) * 60
        : parseInt(checkInInterval);

      const intervalSeconds = intervalMinutes * 60;

      const result = await createDossier({
        name: name.trim(),
        description: description.trim(),
        releaseMode,
        emergencyContacts: emergencyContacts.filter(c => c.trim().length > 0),
        checkInInterval: intervalSeconds,
        files: [], // TODO: Add file support
      });

      if (result.success) {
        Alert.alert(
          'Success',
          'Dossier created successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create dossier');
      }
    } catch (error) {
      console.error('Create dossier error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step indicators
  const renderStepIndicators = () => (
    <View style={styles.stepIndicators}>
      {[1, 2, 3, 4, 5].map((step) => (
        <TouchableOpacity
          key={step}
          style={[
            styles.stepIndicator,
            step === currentStep && styles.stepIndicatorActive,
            step < currentStep && styles.stepIndicatorCompleted,
          ]}
          onPress={() => setCurrentStep(step)}
        >
          <Text
            style={[
              styles.stepIndicatorText,
              (step === currentStep || step < currentStep) && styles.stepIndicatorTextActive,
            ]}
          >
            {step < currentStep ? '✓' : step}
          </Text>
        </TouchableOpacity>
      ))}
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
        Step 1 of 5
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
              autoFocus
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

  // Step 2: Visibility
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Visibility
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Step 2 of 5
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
          <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
            Document auto-decrypts and becomes publicly accessible on deadline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            releaseMode === 'contacts' && styles.optionCardSelected,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
          onPress={() => setReleaseMode('contacts')}
        >
          <View style={styles.optionHeader}>
            <View style={[
              styles.radioButton,
              releaseMode === 'contacts' && styles.radioButtonSelected,
            ]}>
              {releaseMode === 'contacts' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
              Emergency Contacts
            </Text>
          </View>
          <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
            Document privately sent to specific contacts on deadline
          </Text>
        </TouchableOpacity>
      </View>

      {releaseMode === 'contacts' && (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Emergency Contacts <Text style={styles.required}>*</Text>
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
      )}
    </View>
  );

  // Step 3: Check-in Schedule
  const renderStep3 = () => {
    const checkInTimes = getNextCheckInTimes();

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Check-in Schedule
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Step 3 of 5
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
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              placeholder="Enter hours (1-8760)"
              placeholderTextColor={theme.colors.textSecondary}
              value={customInterval}
              onChangeText={(text) => {
                setCustomInterval(text);
                setCheckInInterval('custom');
              }}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Min: 1 hour | Max: 1 year (8760 hours)
            </Text>
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

        <View style={[styles.warningCard, { backgroundColor: theme.colors.card, borderLeftColor: theme.colors.warning }]}>
          <Icon name="alert-circle" size={20} color={theme.colors.warning} />
          <Text style={[styles.warningText, { color: theme.colors.text }]}>
            The dossier will be automatically released if you don't check in within this timeframe.
          </Text>
        </View>
      </View>
    );
  };

  // Step 4: File Encryption
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        File Encryption
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Step 4 of 5
      </Text>

      {!hasAcceptedTerms ? (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.termsText, { color: theme.colors.text }]}>
            Before uploading files, you must accept the Acceptable Use Policy & Terms of Service.
          </Text>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setHasAcceptedTerms(true)}
          >
            <Text style={styles.acceptButtonText}>Accept Terms to Continue</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            File Upload
          </Text>
          <TouchableOpacity
            style={[styles.uploadButton, { borderColor: theme.colors.border }]}
          >
            <Icon name="upload" size={24} color={theme.colors.primary} />
            <Text style={[styles.uploadButtonText, { color: theme.colors.text }]}>
              Choose Files
            </Text>
            <Text style={[styles.uploadButtonHint, { color: theme.colors.textSecondary }]}>
              Up to 100MB per file
            </Text>
          </TouchableOpacity>

          <Text style={[styles.comingSoonText, { color: theme.colors.textSecondary }]}>
            File upload functionality coming soon...
          </Text>
        </View>
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

  // Step 5: Finalize
  const renderStep5 = () => {
    const validContacts = emergencyContacts.filter(c => c.trim().length > 0);
    const intervalDisplay = checkInInterval === 'custom'
      ? `${customInterval} hour(s)`
      : INTERVAL_PRESETS.find(p => p.value === checkInInterval)?.label || '';

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Finalize
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Step 5 of 5
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
            {releaseMode === 'public' ? 'Public Release' : 'Emergency Contacts'}
          </Text>

          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Check-in Frequency
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {intervalDisplay}
          </Text>

          {releaseMode === 'contacts' && validContacts.length > 0 && (
            <>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Emergency Contacts
              </Text>
              {validContacts.map((contact, index) => (
                <Text key={index} style={[styles.summaryContact, { color: theme.colors.text }]}>
                  • {contact}
                </Text>
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
              {currentStep === 5 ? 'Finalize' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingVertical: 20,
    gap: 12,
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: '#e53e3e',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#10B981',
  },
  stepIndicatorText: {
    fontSize: 16,
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
    padding: 16,
    marginBottom: 12,
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
    lineHeight: 20,
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
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
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
  summaryContact: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
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
});
