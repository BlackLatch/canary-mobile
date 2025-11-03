# Canary Navigation - Quick Reference Card

## At-a-Glance: Web vs Mobile

### WEB (Next.js)
```
┌─────────────────────────────────────────────────────┐
│ [🕊️] CANARY    CHECK IN  DOSSIERS  MONITOR  ⚙️   │
│              PUBLIC RELEASES        🌙  👤  SIGN OUT│
└─────────────────────────────────────────────────────┘
        ↓ currentView state ↓
    (?view=checkin|documents|monitor|settings)
```

### MOBILE (React Native) - Recommended
```
┌─────────────────────────────────────────────────────┐
│ ☰  CANARY               🌙  👤                      │  Header
├─────────────────────────────────────────────────────┤
│                                                     │
│                 TAB CONTENT                        │
│        (Check In / Dossiers / etc)                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ✓ Check  📋 Dossiers  📊 Monitor  ⚙ Settings    │  Bottom Tabs
└─────────────────────────────────────────────────────┘
```

---

## Web App Routes (Reference)

| Route | Purpose | Auth Required |
|-------|---------|-----------------|
| `/` | Main app (all views) | YES |
| `/?view=checkin` | Check-in tab | YES |
| `/?view=documents` | Dossiers tab | YES |
| `/?view=monitor` | Monitor tab | YES |
| `/?view=settings` | Settings tab | YES |
| `/feed` | Public releases | NO |
| `/share?address=0x...` | View user dossiers | NO |
| `/release?user=0x...&id=123` | View release detail | NO |
| `/acceptable-use-policy` | Legal | NO |
| `/terms-of-service` | Legal | NO |

---

## Main Views (4 Core Tabs)

### 1. CHECK IN
**Purpose:** Perform regular check-ins to keep dossier active
**Key Elements:**
- Current status indicator
- Time until expiration
- [PERFORM CHECK-IN] button
- Recent check-in history

### 2. DOSSIERS
**Purpose:** Manage encrypted dossiers
**Key Elements:**
- List of all dossiers
- Status badges (active/expired/released)
- [CREATE NEW DOSSIER] button
- Tap dossier → Detail modal

### 3. MONITOR
**Purpose:** Real-time oversight of all dossiers
**Key Elements:**
- Dashboard with statistics
- Activity timeline
- Status overview
- Filter by address option

### 4. SETTINGS
**Purpose:** User preferences and account management
**Key Elements:**
- Auth mode toggle
- Wallet/email display
- Theme selection
- Account options
- Legal documents

---

## Modal/Overlay Views

| Modal | Trigger | Content |
|-------|---------|---------|
| **Dossier Detail** | Tap dossier in list | View/edit/release dossier |
| **Create Dossier** | [Create New] button | 5-step wizard form |
| **Media Recorder** | Upload button | Record audio/video |
| **Verify Release** | [Verify] button | Verify released content |
| **Delete Confirm** | Delete button | Confirmation dialog |

---

## Create Dossier Wizard (5 Steps)

```
Step 1: NAME & DESCRIPTION
├─ Input: Dossier name
├─ Input: Description
└─ [Next]

Step 2: VISIBILITY
├─ Radio: Public / Private
├─ Input: Emergency contacts (if private)
└─ [Next/Back]

Step 3: SCHEDULE
├─ Dropdown: Check-in interval
├─ Options: 1h, 1d, 1w, 1m, 1y, custom
└─ [Next/Back]

Step 4: ENCRYPT FILES
├─ [Upload files]
├─ List: Selected files
├─ [Add more files]
└─ [Next/Back]

Step 5: REVIEW & CONFIRM
├─ Summary of all steps
├─ [✓] Accept terms
├─ [CREATE DOSSIER]
└─ Success confirmation
```

---

## Navigation Patterns

### Pattern 1: Tab Switching (Bottom Nav)
```
User taps tab icon → setCurrentTab(tabName)
                  → Render corresponding screen
```

### Pattern 2: Opening Modal
```
User taps dossier → setSelectedDossier(item)
                 → setShowModal(true)
                 → Render modal overlay
```

### Pattern 3: Modal Dismissal
```
User taps [X] button → setShowModal(false)
                    → Modal closes
                    → Return to previous view
```

### Pattern 4: Wizard Navigation
```
User on Step 1 → Enters data → [Next]
             → setWizardStep(2)
             
User on Step 2 → [Back] → setWizardStep(1)
             → [Next] → setWizardStep(3)
```

### Pattern 5: Deep Linking
```
External link: canary://share?address=0x...
            → Route to SharedDossiersScreen
            → Pass address param
            → Load and display dossiers
```

---

## State Structure (Simplified)

```typescript
// Tab navigation
activeTab: 'checkin' | 'dossiers' | 'monitor' | 'settings'

// Modals
showDossierDetail: boolean
showCreateWizard: boolean
showMediaRecorder: boolean
selectedDossier: Dossier | null

// Wizard
wizardStep: 1 | 2 | 3 | 4 | 5
wizardData: {
  name: string
  description: string
  visibility: 'public' | 'private'
  contacts: string[]
  checkInInterval: string
  files: File[]
}

// Authentication
isAuthenticated: boolean
userAddress: string | null
userEmail: string | null

// UI
currentTheme: 'light' | 'dark'
```

---

## Key Components to Build

### High Priority
- [ ] AuthStack (login screens)
- [ ] MainTabsNavigator (bottom tabs)
- [ ] CheckInScreen
- [ ] DossierListScreen
- [ ] DossierDetailModal
- [ ] CreateDossierWizard
- [ ] SettingsScreen

### Medium Priority
- [ ] MonitorScreen
- [ ] PublicFeedScreen
- [ ] Header component
- [ ] BottomTabBar

### Lower Priority (Can add later)
- [ ] MediaRecorderModal
- [ ] VerifyReleaseModal
- [ ] ShareFunctionality

---

## Styling Notes

### Colors
- **Light mode:** White background, dark text
- **Dark mode:** Black background, light text
- **Accent:** Brand red (#e53e3e)
- **Status indicators:** Green (active), Red (expired), Blue (released)

### Typography
- **Font:** System font (-apple-system, BlinkMacSystemFont, Segoe UI)
- **Nav items:** UPPERCASE, 600 weight, 0.875rem
- **Headers:** 700 weight, 1.25-1.75rem
- **Body:** 400 weight, 0.875-1rem

### Layout
- **Safe area:** Respect notches/safe zones
- **Spacing:** Consistent padding around edges
- **Tab bar height:** ~56-60px (standard iOS/Android)
- **Header height:** ~56px (standard)

---

## Deep Link Examples

```
canary://                           → Home
canary://checkin                    → Check-in view
canary://dossiers                   → Dossiers view
canary://monitor                    → Monitor view
canary://settings                   → Settings view
canary://dossier/123                → Dossier detail (ID: 123)
canary://share?address=0x12345...   → Shared dossiers
canary://release?user=0x123&id=456  → Release detail
canary://feed                       → Public releases
```

---

## Platform-Specific Considerations

### iOS
- Swipe-back gesture (handled by React Navigation)
- Safe area for notch (SafeAreaView)
- Status bar style (light/dark)
- Bottom tab bar spacing

### Android
- Hardware back button (handled by React Navigation)
- Bottom gesture navigation
- Status bar styling
- Tab bar under content

---

## Testing Scenarios

1. **Authentication Flow**
   - Login → AuthStack appears
   - Logout → Return to login

2. **Tab Navigation**
   - Tap each tab → Correct screen displays
   - Tapping active tab → No navigation

3. **Modal Opening/Closing**
   - Tap dossier → Modal opens
   - Tap [X] or outside → Modal closes

4. **Wizard Progression**
   - [Next] on step 1 → Step 2 appears
   - [Back] on step 2 → Step 1 appears
   - [Create] on step 5 → Success, modal closes

5. **Deep Linking**
   - Open deep link in browser → App opens to correct screen
   - Parameters passed correctly

6. **Theme Switching**
   - Toggle theme → Entire app re-themes
   - Persists on reload

---

## Files Generated

This directory now contains:

1. **NAVIGATION_README.md** (this file's parent) - Overview & guide
2. **NAVIGATION_ANALYSIS.md** - Detailed reference of web app
3. **NAVIGATION_ARCHITECTURE.md** - Implementation guide
4. **QUICK_REFERENCE.md** (this file) - Cheat sheet

---

## Quick Start Checklist

- [ ] Read NAVIGATION_ANALYSIS.md (understand web app)
- [ ] Read NAVIGATION_ARCHITECTURE.md (plan mobile implementation)
- [ ] Set up React Navigation structure
- [ ] Create AuthStack with login screens
- [ ] Create MainTabs with 4 tab screens
- [ ] Implement modal system
- [ ] Add deep linking
- [ ] Build core screens (CheckIn, Dossiers, Monitor, Settings)
- [ ] Add CreateDossier wizard
- [ ] Implement theme switching
- [ ] Test all navigation flows
- [ ] Add wallet integration

---

## References

**Web Implementation:** `/Users/k/Git/canary/`
- Main component: `app/page.tsx`
- Components: `app/components/`
- Styling: `app/globals.css`

**Mobile Project:** `/Users/k/Git/canary-mobile/`
- These documentation files

---

**Version:** 1.0 | **Last Updated:** Nov 3, 2025 | **Next.js Reference:** 15.3.3
