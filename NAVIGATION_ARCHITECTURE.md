# Canary Mobile Navigation Architecture Guide

## Quick Reference: Web Navigation → Mobile Navigation

### Current Web Structure (Next.js)
```
                    CANARY (Logo)
         ┌──────────────────────────────────────────┐
    ┌────┴────────────────────────────────────────┬─┘
    │                                              │
    │  CHECK IN | DOSSIERS | MONITOR | SETTINGS  │
    │                                PUBLIC RELEASES
    │
    │           Theme  │  Wallet Status  │  SIGN OUT
    └──────────────────────────────────────────────┘
            (Horizontal Top Navigation Bar)
```

### Recommended Mobile Structure (React Native)

```
┌─────────────────────────────────────────┐
│  ▮▮  CANARY                    ☀/🌙  👤│  ← Header
├─────────────────────────────────────────┤
│                                         │
│                                         │
│          [Current View Content]         │  ← Main Content Area
│          (Check In / Dossiers /         │
│           Monitor / Settings)           │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ ✓ Check  📋 Dossiers  📊 Monitor  ⚙    │  ← Bottom Tab Navigator
└─────────────────────────────────────────┘
```

---

## Navigation Stack Architecture for React Native

### 1. Root Navigation Structure
```typescript
RootNavigator
├── AuthStack (if not authenticated)
│   ├── LoginScreen
│   └── WalletConnectionScreen
│
└── AppStack (if authenticated)
    ├── MainTabs (BottomTabNavigator)
    │   ├── CheckInTab (Stack)
    │   │   ├── CheckInScreen
    │   │   └── CheckInDetailScreen
    │   │
    │   ├── DossiersTab (Stack)
    │   │   ├── DossierListScreen
    │   │   ├── DossierDetailScreen (Modal)
    │   │   ├── CreateDossierScreen (5-step wizard)
    │   │   └── DossierEditScreen
    │   │
    │   ├── MonitorTab (Stack)
    │   │   ├── MonitorOverviewScreen
    │   │   └── ActivityDetailScreen
    │   │
    │   └── SettingsTab (Stack)
    │       ├── SettingsScreen
    │       ├── AccountSettingsScreen
    │       ├── ThemeSettingsScreen
    │       └── LegalScreen
    │
    └── PublicReleasesStack (Stack)
        ├── PublicFeedScreen
        ├── ReleaseDetailScreen
        └── SharedDossiersScreen

    Plus Modal Stack (for overlays):
    ├── MediaRecorderModal
    ├── VerifyReleaseModal
    └── ConfirmationModals
```

### 2. Detailed Navigation Flow

#### Authentication Flow
```
AppStart
  ↓
[Check if logged in]
  ├─→ NO: Show AuthStack
  │     └─→ LoginScreen
  │         ├─→ Standard Auth (Email)
  │         ├─→ Advanced Auth (Wallet)
  │         └─→ Anonymous (Burner Wallet)
  │
  └─→ YES: Show AppStack → MainTabs → CheckInTab (default)
```

#### Tab Navigation
```
BottomTabNavigator:

CHECK IN Tab
├─→ CheckInScreen (main)
│   └─→ Perform Check-in Action
│       └─→ CheckInDetailScreen (confirmation)
│
DOSSIERS Tab
├─→ DossierListScreen (main)
│   └─→ Each dossier item clickable
│       ├─→ Modal: DossierDetailScreen
│       │   ├─→ View Details
│       │   ├─→ Edit Dossier
│       │   ├─→ Release Dossier
│       │   └─→ Delete Dossier
│       │
│       └─→ Create New Button
│           └─→ CreateDossierScreen (5-step wizard)
│               Step 1: Name & Description
│               Step 2: Visibility Settings
│               Step 3: Check-in Schedule
│               Step 4: Upload Files & Encrypt
│               Step 5: Review & Finalize
│
MONITOR Tab
├─→ MonitorOverviewScreen (main)
│   ├─→ Dossier status cards
│   ├─→ Activity timeline
│   └─→ Click item → ActivityDetailScreen
│
SETTINGS Tab
├─→ SettingsScreen (main)
│   ├─→ Account Settings
│   ├─→ Wallet Management
│   ├─→ Theme Toggle
│   ├─→ Legal Documents
│   └─→ Sign Out
```

#### External/Deep Link Navigation
```
From External Links:
├─→ canary://share?address=0x... → PublicReleasesStack → SharedDossiersScreen
├─→ canary://release?user=0x&id=123 → PublicReleasesStack → ReleaseDetailScreen
└─→ canary://dossier/123 → MainTabs → DossiersTab → DossierDetailScreen
```

---

## 3. State Management Pattern for Mobile

### Redux/Context Structure (Recommended)
```typescript
// Navigation State
NavigationState
├── currentTab: 'checkin' | 'dossiers' | 'monitor' | 'settings'
├── deepLinkParams: { address?, userId?, dossierId? }
└── navigationHistory: string[]

// Authentication State
AuthState
├── isAuthenticated: boolean
├── authMode: 'standard' | 'advanced' | 'burner'
├── userAddress: string | null
├── userEmail: string | null
└── wallets: Wallet[]

// UI State
UIState
├── currentTheme: 'light' | 'dark'
├── showCreateModal: boolean
├── showDetailModal: boolean
├── showMediaRecorder: boolean
├── selectedDossier: Dossier | null
└── activeStep: number (for wizard)

// Data State
DataState
├── dossiers: Dossier[]
├── releases: Release[]
├── activityLog: Activity[]
└── uploadedFiles: File[]
```

---

## 4. Key Implementation Details

### Bottom Tab Navigator Setup
```typescript
<BottomTabNavigator>
  <Tab.Screen 
    name="CheckIn"
    component={CheckInScreen}
    options={{
      tabBarLabel: 'Check In',
      tabBarIcon: ({focused, color}) => <Icon name="check" />,
    }}
  />
  <Tab.Screen 
    name="Dossiers"
    component={DossiersScreen}
    options={{
      tabBarLabel: 'Dossiers',
      tabBarIcon: ({focused, color}) => <Icon name="document" />,
    }}
  />
  {/* etc */}
</BottomTabNavigator>
```

### Modal Navigation for Details
```typescript
// Instead of navigating to a new screen, show as modal
<Modal
  visible={showDossierDetail}
  onRequestClose={closeDossierDetail}
  presentationStyle="pageSheet"
  // or
  presentationStyle="formSheet" (for smaller modal)
>
  <DossierDetailModal 
    dossier={selectedDossier}
    onClose={closeDossierDetail}
  />
</Modal>
```

### Deep Link Handling
```typescript
// In navigation config
const linking = {
  prefixes: ['canary://', 'https://canary.app'],
  config: {
    screens: {
      Share: 'share?address=:address',
      Release: 'release?user=:user&id=:id',
      Dossier: 'dossier/:id',
    },
  },
};

// In root navigator
<NavigationContainer linking={linking}>
  {/* navigation structure */}
</NavigationContainer>
```

### Conditional Navigation (Auth)
```typescript
if (!user || !isAuthenticated) {
  return <AuthStack />;
} else {
  return <AppStack />;
}
```

---

## 5. Header Component for Mobile

### Header Contents (Top of AppStack)
```
┌────────────────────────────────────────┐
│ ▮▮  CANARY          ☀/🌙 icon  👤👥  │
├────────────────────────────────────────┤
│ (Tab content below)                   │
└────────────────────────────────────────┘
```

### Conditional Header Display
- **On Auth Stack**: Minimal header (maybe logo only)
- **On App Stack**: Full header with theme toggle + wallet status
- **On Detail Screens**: Back button + title + actions

---

## 6. Modal/Sheet Navigation

### Types of Modals/Sheets
1. **Form Sheet** (half-screen)
   - Create Dossier Wizard
   - Edit Dossier
   - Media Recorder

2. **Page Sheet** (full-screen)
   - Dossier Detail
   - Release Detail
   - Settings screens

3. **Alert Dialogs**
   - Confirm delete
   - Burn account warning
   - Release confirmation

```typescript
// Using React Native's Modal
<Modal
  visible={showDetail}
  animationType="slide" // or "fade"
  presentationStyle="pageSheet"
>
  <View>
    <Header title={title} onClose={onClose} />
    <Content />
  </View>
</Modal>

// Or using bottom sheet library
<BottomSheet>
  <FormWizard />
</BottomSheet>
```

---

## 7. Tab Bar Customization

### Icon Mapping
```
CHECK IN       → checkmark/circle icon
DOSSIERS       → document/folder icon
MONITOR        → chart/graph icon
SETTINGS       → gear/cog icon
```

### Active/Inactive Styling
```
Active Tab:
  Icon: filled, colored (brand color)
  Label: visible, colored
  
Inactive Tab:
  Icon: outline, gray
  Label: visible, gray
```

### Safe Area Handling
```typescript
// Use SafeAreaView for iOS notch/status bar
<SafeAreaView edges={['bottom']}>
  <BottomTabNavigator />
</SafeAreaView>
```

---

## 8. Navigation Header Configuration

### Global Header (App Stack)
```typescript
// Options for each screen
screenOptions={{
  headerStyle: { backgroundColor: theme.colors.background },
  headerTintColor: theme.colors.text,
  headerTitleStyle: { fontWeight: 'bold' },
  headerRight: () => (
    <View style={styles.headerRight}>
      <ThemeToggle />
      <WalletStatus />
    </View>
  ),
}}
```

### Per-Screen Header Customization
```typescript
// CheckInScreen specific
screenOptions={{
  headerTitle: 'Check In',
  headerRight: () => <HistoryButton />,
}}

// DossierDetailScreen (modal)
screenOptions={{
  headerShown: true,
  presentation: 'modal',
  headerRight: () => <EditButton />,
}}
```

---

## 9. Back Button Behavior

### Stack-based Back Navigation
- Automatically handled by React Navigation
- Android: Hardware back button pops stack
- iOS: Swipe back gesture or back button

### Custom Back Handling
```typescript
// In detail screens
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      // Show confirmation dialog
    }
  });
  return unsubscribe;
}, []);
```

---

## 10. Deep Linking & Sharing

### URL Schemes
```
canary://dossier/123
canary://share?address=0x...
canary://release?user=0x...&id=123
canary://checkin
canary://settings
```

### Implementation
```typescript
const linking = {
  prefixes: ['canary://', 'https://canaryapp.io'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Dossier: 'dossier/:id',
          CheckIn: 'checkin',
          Settings: 'settings',
        },
      },
      Public: {
        screens: {
          Share: 'share?address=:address',
          Release: 'release?user=:user&id=:id',
        },
      },
    },
  },
};
```

---

## 11. Example: Creating a Dossier Flow

```
DossierListScreen
  └─→ [Create New Button]
      └─→ CreateDossierModal
          ├─→ StepIndicator (1/5)
          ├─→ Step 1: NameAndDescriptionStep
          │   ├─→ Input: dossier name
          │   ├─→ Input: description
          │   └─→ [Next]
          │
          ├─→ Step 2: VisibilityStep
          │   ├─→ Radio: Public / Private
          │   ├─→ [Contacts input if private]
          │   └─→ [Next/Back]
          │
          ├─→ Step 3: ScheduleStep
          │   ├─→ Dropdown: Check-in interval
          │   ├─→ Input: Custom interval
          │   └─→ [Next/Back]
          │
          ├─→ Step 4: EncryptFilesStep
          │   ├─→ [Upload file button]
          │   ├─→ FileList
          │   ├─→ [Add more files]
          │   └─→ [Next/Back]
          │
          └─→ Step 5: ReviewStep
              ├─→ Summary of all info
              ├─→ [Confirm AUP]
              ├─→ [Create Dossier]
              └─→ Success confirmation
                  └─→ Back to DossierList
```

---

## 12. Comparison: Web vs Mobile Navigation

| Feature | Web | Mobile |
|---------|-----|--------|
| Primary Nav | Horizontal Header | Bottom Tabs |
| Secondary Nav | Query params + modals | Stack navigation |
| Overlay UI | CSS modals | React Native Modals |
| Back Navigation | Browser history | Stack navigation |
| Deep Linking | URL-based | URI schemes |
| Tab Switching | Buttons | Tab bar icons |
| Header | Fixed top | Context-aware |
| Theme | Header toggle | Settings tab |
| Wallet Display | Header badge | Settings tab + header |

---

## 13. Migration Checklist

When implementing in React Native:

- [x] Create Bottom Tab Navigator
- [x] Create Stack Navigators for each tab
- [x] Implement Auth Stack with login screens
- [x] Add Modal Stack for overlays
- [x] Implement Deep Linking
- [x] Add Header with back buttons
- [x] Implement theme toggle (move to settings)
- [x] Add wallet status display
- [x] Create CheckInScreen (replicate web flow)
- [x] Create DossierListScreen with detail modal
- [x] Create 5-step CreateDossier wizard
- [x] Create MonitorScreen with activity
- [x] Create SettingsScreen
- [x] Add Safe Area handling
- [x] Implement conditional nav based on auth
- [x] Add gesture handling (swipe back)
- [x] Test all navigation flows
- [x] Implement web3 wallet connections
- [x] Add media recorder modal
- [x] Implement file upload handling

---

## 14. File Structure Recommendation

```
src/
├── navigation/
│   ├── RootNavigator.tsx
│   ├── AuthStack.tsx
│   ├── AppStack.tsx
│   ├── MainTabs.tsx
│   ├── linking.ts (deep linking config)
│   └── types.ts (navigation type definitions)
│
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── WalletConnectionScreen.tsx
│   │
│   ├── tabs/
│   │   ├── checkin/
│   │   │   ├── CheckInScreen.tsx
│   │   │   └── CheckInDetailScreen.tsx
│   │   │
│   │   ├── dossiers/
│   │   │   ├── DossierListScreen.tsx
│   │   │   ├── DossierDetailModal.tsx
│   │   │   ├── CreateDossierWizard.tsx
│   │   │   └── EditDossierScreen.tsx
│   │   │
│   │   ├── monitor/
│   │   │   ├── MonitorOverviewScreen.tsx
│   │   │   └── ActivityDetailScreen.tsx
│   │   │
│   │   └── settings/
│   │       ├── SettingsScreen.tsx
│   │       ├── AccountSettingsScreen.tsx
│   │       ├── ThemeSettingsScreen.tsx
│   │       └── LegalScreen.tsx
│   │
│   └── public/
│       ├── PublicFeedScreen.tsx
│       ├── ReleaseDetailScreen.tsx
│       └── SharedDossiersScreen.tsx
│
├── components/
│   ├── navigation/
│   │   ├── Header.tsx
│   │   ├── BottomTabBar.tsx
│   │   └── DrawerNavigator.tsx (optional)
│   │
│   ├── modals/
│   │   ├── MediaRecorderModal.tsx
│   │   ├── VerifyReleaseModal.tsx
│   │   └── ConfirmationDialog.tsx
│   │
│   └── ...other components
│
└── lib/
    ├── navigation.ts (utility functions)
    └── deep-linking.ts
```

---

**Key Takeaway:** 
The mobile app should use **bottom tab navigation** as the primary navigation pattern with **stack navigation** for detail screens and **modals** for overlays. This is the standard mobile UX pattern and will feel more natural on smartphones than the web's horizontal header navigation.
