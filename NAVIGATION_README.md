# Canary Mobile Navigation Implementation Guide

This directory contains comprehensive documentation for implementing the Canary app's navigation system in React Native.

## Documents Included

### 1. NAVIGATION_ANALYSIS.md (Primary Reference)
**Length:** ~450 lines | **Time to Read:** 15-20 minutes

Complete analysis of the Next.js reference app's navigation structure:
- Navigation patterns currently used
- Component breakdown with file locations
- All available routes and screens
- State management approach
- Navigation libraries used
- Design system details
- Key features and behaviors

**Start here to understand:** What the web app does and how

---

### 2. NAVIGATION_ARCHITECTURE.md (Implementation Guide)
**Length:** ~600 lines | **Time to Read:** 20-30 minutes

Detailed architecture guide for React Native implementation:
- Web-to-mobile navigation pattern mapping
- Complete stack architecture diagram
- State management recommendations
- Modal/sheet navigation patterns
- Header and tab bar customization
- Deep linking configuration
- Example flows (like creating a dossier)
- File structure recommendations
- Migration checklist

**Start here to understand:** How to implement in React Native

---

## Quick Start: Key Takeaways

### Web Navigation Structure (Next.js)
```
Header Navigation (Horizontal)
├── Logo + CANARY text
├── 5 nav items: CHECK IN | DOSSIERS | MONITOR | PUBLIC RELEASES | SETTINGS
├── Theme toggle
└── Wallet status + Sign out

View System: Query parameter-based (?view=checkin|documents|monitor|settings)
Files-based routing: /, /feed, /share, /release, /legal pages
Modals: For detail views and forms
```

### Recommended Mobile Navigation Structure (React Native)
```
Header (at top)
├── Logo + CANARY text
├── Theme toggle
└── Wallet status badge

Main Content Area (middle)
└── [Tab content]

Bottom Tab Navigator
├── Check In icon
├── Dossiers icon
├── Monitor icon
└── Settings icon
```

---

## Navigation Pattern Summary

| Aspect | Pattern | Implementation |
|--------|---------|-----------------|
| **Primary Navigation** | Horizontal header | Bottom Tab Navigator |
| **Tab Switching** | State + query params | Tab bar tap handling |
| **Detail Screens** | Modal overlays | Stack navigation + modals |
| **Multi-step Forms** | Single page wizard | Wizard component with step state |
| **Shared Screens** | Query params | Deep linking + params |
| **Back Navigation** | Browser history | React Navigation stack |
| **Authentication** | Conditional rendering | Auth/App stack switching |
| **Deep Linking** | URL-based | URI scheme-based |

---

## Files & Locations

### Source Reference Files (Next.js)
- **Main Navigation:** `/Users/k/Git/canary/app/page.tsx` (lines 2402-2545)
- **Navigation Styling:** `/Users/k/Git/canary/app/globals.css` (lines 335-360)
- **All Routes:**
  - `/` - Home/main app
  - `/feed` - Public releases
  - `/share` - Shared dossiers
  - `/release` - Release detail
  - `/acceptable-use-policy` - Legal
  - `/terms-of-service` - Legal

---

## Key Components to Implement

### Essential Screens
1. **Login Screen** - Authentication entry point
2. **CheckInScreen** - Perform check-in (main action)
3. **DossierListScreen** - View all dossiers
4. **DossierDetailModal** - View dossier details (modal)
5. **CreateDossierWizard** - 5-step form (modal)
6. **MonitorScreen** - Real-time status overview
7. **SettingsScreen** - Preferences and account
8. **PublicFeedScreen** - Browse released dossiers
9. **ReleaseDetailScreen** - View specific release

### Essential Components
1. **Header** - Logo, theme toggle, wallet status
2. **BottomTabBar** - Navigation between main views
3. **WalletStatusBadge** - Display wallet address/email
4. **ThemeToggle** - Light/dark mode switch
5. **ModalHeader** - Dismiss button for modals
6. **WizardStepIndicator** - Show progress in forms
7. **DossierCard** - Reusable dossier display
8. **StatusBadge** - Show dossier status (active/expired/released)

---

## Implementation Order (Recommended)

1. **Phase 1: Foundation**
   - Set up navigation structure (Auth/App stacks)
   - Create bottom tab navigator
   - Implement deep linking config

2. **Phase 2: Core Screens**
   - Login/authentication screens
   - CheckInScreen
   - DossierListScreen with detail modal
   - MonitorScreen

3. **Phase 3: Advanced Features**
   - CreateDossierWizard (5 steps)
   - SettingsScreen
   - MediaRecorderModal
   - Verify/Release modals

4. **Phase 4: Polish & Integration**
   - Deep linking testing
   - Header customization per screen
   - Safe area handling
   - Theme implementation
   - Web3 wallet integration

---

## View Breakdown

### CHECK IN View
```
Current Status: [Active / Expired / Inactive]
Days Until Expiration: [X days]
Last Check-in: [Date/time]
Next Check-in Due: [Date/time]

[PERFORM CHECK-IN] button

Recent Check-in History (last 5)
- Check-in date | status | tx hash
```

### DOSSIERS View
```
All Dossiers ([count])
  ├── Dossier Card
  │   ├── Name
  │   ├── Status badge
  │   ├── Next check-in countdown
  │   └── Tap → DossierDetailModal
  │
  └── [CREATE NEW DOSSIER] button
      └── CreateDossierWizard (5 steps)
```

### MONITOR View
```
Overview Dashboard
├── Active dossiers: X
├── Expiring soon: X
├── Released: X
├── Recently checked in: X
│
Activity Timeline
├── [Recent activity items]
│   ├── Date/time
│   ├── Action type
│   ├── Dossier name
│   └── Status change
│
Monitor all addresses option
```

### SETTINGS View
```
Profile Section
├── Auth mode: Standard/Advanced
├── Wallet/Email: [display]
└── [Disconnect wallet]

Theme Settings
├── [Light/Dark toggle]
└── Auto (follows system)

Account
├── Export private key
├── Import private key
├── Burn account warning

Legal
├── Acceptable Use Policy
├── Terms of Service
└── Privacy Policy
```

---

## Navigation State Example

```typescript
// Simple example of state structure
interface NavState {
  // Tab navigation
  currentTab: 'checkin' | 'dossiers' | 'monitor' | 'settings';
  
  // Modal states
  showDossierDetail: boolean;
  selectedDossier: Dossier | null;
  showCreateWizard: boolean;
  showMediaRecorder: boolean;
  
  // Wizard state
  wizardStep: 1 | 2 | 3 | 4 | 5;
  
  // Deep link params
  deepLinkAddress?: string;
  deepLinkUserId?: string;
  deepLinkDossierId?: string;
}
```

---

## Testing Checklist

- [ ] All tabs switchable from bottom nav
- [ ] Back button behavior works correctly
- [ ] Detail screens open as modals
- [ ] Wizard steps progress/regress properly
- [ ] Deep links route to correct screens
- [ ] Theme toggles work across app
- [ ] Wallet disconnect flows work
- [ ] Authentication gates work
- [ ] Modals close when expected
- [ ] Android hardware back button handled
- [ ] iOS swipe-to-go-back works
- [ ] Safe areas respected (notches)
- [ ] Landscape orientation handled

---

## Additional Resources

### Web Reference Implementation
The actual implementation is in:
- `/Users/k/Git/canary/app/page.tsx` - Main app component
- `/Users/k/Git/canary/app/components/` - Reusable components
- `/Users/k/Git/canary/app/lib/` - Utilities and context providers

### Libraries to Use
- **@react-navigation/native** - Core navigation
- **@react-navigation/bottom-tabs** - Tab bar
- **@react-navigation/stack** - Stack navigation
- **@react-navigation/modal** - Modal navigation
- **react-native-safe-area-context** - Safe areas
- **@react-native-community/hooks** - Common hooks

---

## Common Patterns

### Opening a Detail Modal
```typescript
const [showDetail, setShowDetail] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);

const openDetail = (item) => {
  setSelectedItem(item);
  setShowDetail(true);
};

const closeDetail = () => {
  setSelectedItem(null);
  setShowDetail(false);
};
```

### Conditional Navigation (Auth)
```typescript
if (!user || !isAuthenticated) {
  return <AuthStack />;
} else {
  return <AppStack />;
}
```

### Deep Link Handling
```typescript
const linking = {
  prefixes: ['canary://'],
  config: {
    screens: {
      Share: 'share?address=:address',
      Release: 'release?user=:user&id=:id',
    },
  },
};
```

---

## Questions? Reference the:

1. **NAVIGATION_ANALYSIS.md** - For "what does the web app do?"
2. **NAVIGATION_ARCHITECTURE.md** - For "how do I build this?"
3. **Original web app** at `/Users/k/Git/canary/` - For actual implementation details

---

**Last Updated:** November 3, 2025
**Reference Web App Version:** Next.js 15.3.3
**Target Mobile Platform:** React Native
