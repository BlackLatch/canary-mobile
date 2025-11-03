# Canary Next.js Reference App - Navigation Structure Analysis

## Overview
Canary is a Next.js web application using a hybrid navigation pattern: file-based routing combined with query-parameter-based tab switching for the main app.

---

## 1. Navigation Patterns Used

### A. Header Navigation Component
**Location:** `/Users/k/Git/canary/app/page.tsx` (lines 2402-2473)

**Pattern:** Top horizontal navigation bar
- **Type:** Fixed header with horizontal navigation
- **Layout:** Logo on left, nav items in center, theme toggle & wallet info on right
- **Responsive:** Currently uses `zoom: 0.8` for scaling (not ideal for mobile)

**Navigation Items:**
```
├── Logo (Canary icon + text)
├── Nav Links (4 buttons + 1 link)
│   ├── CHECK IN (button)
│   ├── DOSSIERS (button)
│   ├── MONITOR (button)
│   ├── PUBLIC RELEASES (external link to /feed)
│   └── Settings (icon button)
├── Theme Toggle (Sun/Moon icon button)
└── Wallet Status Display
    ├── Address/Email badge
    └── SIGN OUT button
```

### B. View-Based Navigation (Query Parameter Based)
**Type:** Single-page tab switching using state + query parameters
**Implementation:** URL query params route to different views on the same page

**Current Views:**
- `?view=checkin` → Check-in view (default)
- `?view=documents` → Dossiers management view
- `?view=monitor` → Monitor view
- `?view=settings` → Settings view

**Code Pattern:**
```typescript
const [currentView, setCurrentView] = useState<"checkin" | "documents" | "monitor" | "settings">("checkin");

// Navigation buttons update state
onClick={() => setCurrentView("checkin")}

// URL integration via HomeContent component
const HomeContent = ({ onViewChange }) => {
  useEffect(() => {
    const view = searchParams.get("view");
    if (view) onViewChange(view);
  }, [searchParams]);
};

// Conditional rendering based on currentView
{currentView === "checkin" ? <CheckInView /> : null}
{currentView === "documents" ? <DocumentsView /> : null}
{currentView === "settings" ? <SettingsView /> : null}
```

### C. File-Based Routing (Next.js App Router)
**Routes:**
```
/                           → Home/Main app (page.tsx)
/feed                       → Public Releases page (feed/page.tsx)
/share?address=0x...       → Shared Dossiers view (share/page.tsx)
/release?user=0x&id=123    → Release Detail view (release/page.tsx)
/acceptable-use-policy     → Policy page (acceptable-use-policy/page.tsx)
/terms-of-service          → Terms page (terms-of-service/page.tsx)
```

### D. Modal/Side Panel Navigation
**Types Used:**
- Document Detail Modal (overlay showing selected dossier details)
- Media Recorder Modal (for audio/video recording)
- Verify Release Modal (for verifying released content)
- Create Dossier Multi-step Form (wizard-style, 5 steps)
- Edit Schedule Modal
- Add Files Modal
- Burn Account Warning Modal
- Settings View (appears in main view area)

**Opening/Closing Pattern:**
```typescript
const [showMediaRecorder, setShowMediaRecorder] = useState(false);
const [selectedDocument, setSelectedDocument] = useState<DossierWithStatus | null>(null);
const [documentDetailView, setDocumentDetailView] = useState(false);

// Navigation
const openDocumentDetail = (doc) => {
  setSelectedDocument(doc);
  setDocumentDetailView(true);
};

const closeDocumentDetail = () => {
  setSelectedDocument(null);
  setDocumentDetailView(false);
};
```

---

## 2. Navigation Components & Structure

### Header Component
**File:** `/Users/k/Git/canary/app/page.tsx` (lines 2402-2545)

**Structure:**
```jsx
<header>
  <div className="max-w-7xl mx-auto px-6 py-3">
    <div className="flex items-center justify-between h-10">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <img src="/solo-canary.png" alt="Canary" />
        <span>CANARY</span>
      </div>

      {/* Right: Navigation & Auth */}
      <div className="flex items-center gap-8">
        {/* Main Nav */}
        <nav className="flex items-center gap-6 h-full">
          <button onClick={() => setCurrentView("checkin")}>CHECK IN</button>
          <button onClick={() => setCurrentView("documents")}>DOSSIERS</button>
          <button onClick={() => setCurrentView("monitor")}>MONITOR</button>
          <a href="/feed">PUBLIC RELEASES</a>
          <button onClick={() => setCurrentView("settings")}>⚙️ Settings</button>
        </nav>

        {/* Auth & Theme */}
        <div className="flex items-center gap-6">
          <button onClick={toggleTheme}>{theme === 'light' ? <Moon /> : <Sun />}</button>
          <div className="wallet-status">{address/email}</div>
          <button onClick={logout}>SIGN OUT</button>
        </div>
      </div>
    </div>
  </div>
</header>
```

### Navigation Links Styling
**File:** `/Users/k/Git/canary/app/globals.css` (lines 335-360)

```css
.nav-link {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-ink-lighter);
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  height: 100%;
}

.nav-link:hover {
  color: var(--color-ink);
  border-bottom-color: var(--color-ink-lighter);
}

.nav-link-active {
  color: var(--color-ink);
  border-bottom-color: var(--color-ink);
}
```

---

## 3. Available Routes & Screens

### Main Routes (File-based)
1. **Home Page:** `/` 
   - Main authenticated app
   - Contains all views (checkin, documents, monitor, settings)
   - Conditional rendering based on `currentView` state
   - Authentication gates shown if not logged in

2. **Public Releases Feed:** `/feed`
   - Shows public releases from all users
   - Separate page with own header/footer
   - No authentication required for viewing

3. **Shared Dossiers:** `/share?address=0x...`
   - View dossiers from a specific wallet address
   - Live monitoring with 30-second polling
   - Filters for visibility and status

4. **Release Detail:** `/release?user=0x...&id=123`
   - View specific released dossier content
   - Decryption logic using TACo
   - Shows locked or unlocked content state

5. **Legal Pages:**
   - `/acceptable-use-policy` - Terms acceptance
   - `/terms-of-service` - Legal terms

### Views Within Home (Tab-based)
1. **CHECK IN View**
   - Primary action: perform check-in to keep dossier active
   - Shows status and next check-in time

2. **DOSSIERS View**
   - List of all user dossiers
   - Create new dossier (5-step wizard)
   - View/edit individual dossiers
   - Status indicators (active, expired, released)

3. **MONITOR View**
   - Overview of all dossiers
   - Real-time status monitoring
   - Activity log

4. **SETTINGS View**
   - User preferences
   - Wallet/Account management
   - Theme settings (in header)

---

## 4. Navigation Architecture

### State Management Pattern
```
App State:
├── Authentication State
│   ├── isConnected (wagmi)
│   ├── authenticated (Privy)
│   ├── address
│   └── wallets[]
│
├── View State
│   ├── currentView ("checkin" | "documents" | "monitor" | "settings")
│   └── Query params (?view=...)
│
├── Modal/Form State
│   ├── showCreateForm
│   ├── showMediaRecorder
│   ├── selectedDocument
│   ├── documentDetailView
│   └── various modal flags
│
└── Data State
    ├── userDossiers[]
    ├── uploadedFiles[]
    ├── encryptedData
    └── activityLog[]
```

### Navigation Flow Diagram
```
Login Page
    ↓
Wallet Connection
    ↓
Home Page (/):
    ├─→ CHECK IN (default view)
    │   └─→ Perform check-in → Monitor until next due
    │
    ├─→ DOSSIERS
    │   ├─→ View list
    │   ├─→ Click dossier → Document Detail Modal
    │   │   └─→ Edit / Release / Delete
    │   └─→ Create New → 5-step wizard
    │       └─→ Name → Visibility → Schedule → Encrypt → Finalize
    │
    ├─→ MONITOR
    │   └─→ Real-time status overview
    │
    ├─→ SETTINGS
    │   └─→ Account / Preferences
    │
    └─→ PUBLIC RELEASES (link to /feed)
        └─→ Browse all released dossiers

External Pages:
├─→ /feed - Public releases feed (no auth required)
├─→ /share?address=0x... - Share specific address dossiers
├─→ /release?user=0x&id=123 - View released content
└─→ Legal pages (/acceptable-use-policy, /terms-of-service)
```

---

## 5. Navigation Libraries & Technologies

### Core Navigation
- **Next.js 15.3.3** - File-based routing with App Router
- **React Router Equivalent:** Not used; relies on Next.js router
- **Query Parameters:** `useSearchParams()` from `next/navigation`

### Routing Hooks
```typescript
import { useSearchParams, useRouter } from 'next/navigation';

// Reading params
const searchParams = useSearchParams();
const view = searchParams.get('view');

// Navigation
const router = useRouter();
router.push('/?view=documents');
```

### State Management
- **Local State:** `useState()` for view switching
- **Context API:** 
  - ThemeProvider (theme context)
  - BurnerWalletProvider (anonymous wallet)
  - HeartbeatProvider (health checks)
  - Web3Provider (wagmi + Privy)

### URL Handling
- Direct link navigation: `<Link href="/feed">`
- Button-based navigation: `onClick={() => setCurrentView("checkin")}`
- Query param sync: URL updates via `searchParams`

---

## 6. Key Navigation Features

### Authentication-Based Navigation
```typescript
if (!isConnected && !authenticated && !burnerWallet.isConnected) {
  // Show login page
} else {
  // Show main app with navigation
}
```

### Conditional Nav Rendering
```typescript
{hasWalletConnection() && (
  <>
    <nav>Navigation items</nav>
    <ThemeToggle />
    <WalletStatus />
  </>
)}
```

### Deep Linking
- Supports URL-based navigation: `/?view=documents`
- Query parameters for data passing: `/share?address=0x...`
- Browser history support (back/forward buttons work)

### Theme-Aware Navigation
- Nav styling changes based on light/dark theme
- Smooth transitions between themes
- Persisted in localStorage

### Mobile Considerations
- Currently uses `zoom: 0.8` for scaling (needs mobile-specific implementation)
- Supports iOS standalone mode detection
- PWA install button handling
- Safe area support (notch-aware)

---

## 7. Component Files Used

### Navigation-Related Components
- `/Users/k/Git/canary/app/page.tsx` - Main app & header navigation
- `/Users/k/Git/canary/app/feed/page.tsx` - Public releases page
- `/Users/k/Git/canary/app/share/page.tsx` - Share page
- `/Users/k/Git/canary/app/release/page.tsx` - Release detail page
- `/Users/k/Git/canary/app/layout.tsx` - Root layout with providers
- `/Users/k/Git/canary/app/globals.css` - Navigation styling

### Child Views/Components
- MonitorView
- SettingsView
- PublicReleasesView
- Various Modal Components (MediaRecorder, VerifyRelease, etc.)

---

## 8. Design System

### Navigation Styling
- **Font:** -apple-system, BlinkMacSystemFont, 'Segoe UI' (system font)
- **Font Weight:** 600 (semi-bold)
- **Font Size:** 0.875rem (14px)
- **Text Transform:** UPPERCASE
- **Letter Spacing:** 0.05em
- **Active Indicator:** Bottom border (2px solid)
- **Colors:** Theme-aware (light/dark)

### Layout Constraints
- **Max Width:** 7xl (80rem)
- **Horizontal Padding:** 6 (24px)
- **Vertical Padding:** 3 (12px)
- **Header Height:** 10 units (40px)

---

## Summary for Mobile Implementation

### What to Implement in React Native:

1. **Bottom Tab Navigation** (recommended for mobile)
   - CHECK IN
   - DOSSIERS
   - MONITOR
   - SETTINGS
   - Plus header link to PUBLIC RELEASES

2. **Header**
   - Logo + title
   - Theme toggle (move to settings or keep in header)
   - Wallet status indicator

3. **Stack Navigation** for secondary screens
   - Release detail page (stack)
   - Share page (stack)
   - Document detail modal (modal stack)

4. **Modal Navigation**
   - Dossier detail overlay
   - Create form (5-step wizard)
   - Settings modals

5. **Deep Linking Support**
   - Handle `canary://share?address=0x...`
   - Handle `canary://release?user=0x&id=123`

6. **Query Parameter Handling**
   - URL sync with state (for deep links)
   - Browser-like back navigation

---

**Navigation Pattern Recommendation for React Native:**
Hybrid approach combining:
- **Bottom Tab Navigator** for main views (CHECK IN, DOSSIERS, MONITOR, SETTINGS)
- **Stack Navigator** inside each tab for detail screens
- **Modal Navigator** for overlays (create form, detail views)
- **Deep Link Support** for sharing functionality
