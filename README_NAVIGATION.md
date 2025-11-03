# Canary Mobile App - Navigation Documentation

## Overview

This documentation provides a complete analysis of the Canary Next.js web application's navigation structure and a detailed implementation guide for building an equivalent React Native mobile app.

**Total Documentation:** 1,373 lines across 4 files | **Total Size:** 44KB

---

## Getting Started - Read in This Order

### 1. START HERE: QUICK_REFERENCE.md (5 min read)
**File:** `QUICK_REFERENCE.md`
**Purpose:** Get an instant overview of the navigation structure

What you'll learn:
- Visual comparison of web vs mobile navigation
- All available routes and screens
- The 4 main tabs and what they contain
- Navigation patterns in a nutshell
- Quick checklist of what to build

**Best for:** Getting oriented quickly before diving into details

---

### 2. UNDERSTAND: NAVIGATION_ANALYSIS.md (15-20 min read)
**File:** `NAVIGATION_ANALYSIS.md` (444 lines)
**Purpose:** Deep dive into how the web app currently works

What's included:
1. Navigation patterns used (header, tabs, modals, routing)
2. Navigation components with exact file locations
3. All routes and how they work
4. View breakdown and state management
5. Navigation libraries and technologies used
6. Design system and styling
7. Summary of what to implement for mobile

**Best for:** Understanding the reference implementation

---

### 3. PLAN & BUILD: NAVIGATION_ARCHITECTURE.md (20-30 min read)
**File:** `NAVIGATION_ARCHITECTURE.md` (587 lines)
**Purpose:** Step-by-step guide to implementing in React Native

What's included:
1. Web-to-mobile navigation pattern mapping
2. Complete stack architecture for React Native
3. Detailed navigation flow diagrams
4. State management recommendations
5. Modal and sheet patterns
6. Header and tab bar setup
7. Deep linking configuration
8. Complete file structure recommendations
9. Migration checklist (67 items)
10. Implementation order (4 phases)

**Best for:** Actually building the mobile app

---

### 4. GUIDE & REFERENCE: NAVIGATION_README.md (15 min read)
**File:** `NAVIGATION_README.md` (342 lines)
**Purpose:** Comprehensive overview and implementation guide

What's included:
1. Summary of all 4 documentation files
2. Key takeaways about web navigation
3. Recommended mobile navigation structure
4. Navigation pattern summary table
5. File locations and references
6. Key components to implement
7. Recommended implementation order (4 phases)
8. View breakdown with ASCII diagrams
9. Navigation state example
10. Testing checklist

**Best for:** High-level planning and reference while building

---

## Documentation Map

```
README_NAVIGATION.md (this file)
│
├─ QUICK_REFERENCE.md .................. 5 min (start here)
│  └─ At-a-glance visual reference
│  └─ Web vs mobile comparison
│  └─ Routes, views, components to build
│
├─ NAVIGATION_ANALYSIS.md ............. 15-20 min (understand)
│  └─ Analysis of current web implementation
│  └─ Exact code locations and patterns
│  └─ File structure and design system
│
├─ NAVIGATION_ARCHITECTURE.md ......... 20-30 min (plan & build)
│  └─ React Native implementation guide
│  └─ Complete stack architecture
│  └─ Step-by-step implementation plan
│
└─ NAVIGATION_README.md ................ 15 min (reference)
   └─ Overview of all documentation
   └─ Implementation phases
   └─ Components to build
   └─ Testing checklist
```

---

## Quick Navigation Index

### I Want to...

**Understand what the web app does:**
- Read: `QUICK_REFERENCE.md` → `NAVIGATION_ANALYSIS.md`

**Plan my mobile architecture:**
- Read: `NAVIGATION_ARCHITECTURE.md` sections 1-4

**See what screens I need to build:**
- Read: `NAVIGATION_README.md` → "Key Components to Implement"

**Get a visual diagram of the navigation:**
- Read: `NAVIGATION_ARCHITECTURE.md` section 1 and 2

**Understand state management:**
- Read: `NAVIGATION_ANALYSIS.md` section 4
- Read: `NAVIGATION_ARCHITECTURE.md` section 3

**Learn about modals and overlays:**
- Read: `NAVIGATION_ARCHITECTURE.md` section 6

**Set up deep linking:**
- Read: `NAVIGATION_ARCHITECTURE.md` section 11

**See implementation order:**
- Read: `NAVIGATION_README.md` → "Implementation Order"

**Get a file structure template:**
- Read: `NAVIGATION_ARCHITECTURE.md` section 14

**See example code patterns:**
- Read: `NAVIGATION_README.md` → "Common Patterns"

---

## Key Findings Summary

### Web App Navigation Pattern
The Next.js Canary app uses:
- **Primary Navigation:** Horizontal header with 5 main items
- **Tab System:** Query parameter-based (`?view=checkin|documents|monitor|settings`)
- **File Routing:** Next.js App Router for separate pages
- **Modals:** Various overlays for details and forms
- **State Management:** React hooks (useState, Context API)

### Recommended Mobile Pattern
For React Native:
- **Primary Navigation:** Bottom Tab Navigator (4 tabs)
- **Tab System:** React Navigation Tab.Navigator
- **Stack Navigation:** Stack.Navigator inside each tab for detail screens
- **Modals:** React Native Modal component or BottomSheet library
- **State Management:** Redux or Context API (recommended: Zustand or Redux Toolkit)

### Critical Differences
| Aspect | Web | Mobile |
|--------|-----|--------|
| Primary Nav | Horizontal header | Bottom tabs |
| Navigation Lib | Next.js Router | React Navigation |
| Tab Switching | URL query params | Tab bar press |
| Detail Views | CSS modals | Stack/Modal navigation |
| Theme Toggle | Header button | Settings tab |
| Wallet Display | Header badge | Settings + header |

---

## Architecture at a Glance

```
RootNavigator
├── AuthStack (when not logged in)
│   ├── LoginScreen
│   ├── WalletConnectionScreen
│   └── OnboardingFlow
│
└── AppStack (when logged in)
    ├── MainTabs (BottomTabNavigator)
    │   ├── CheckInTab (with Stack for detail screens)
    │   ├── DossiersTab (with Stack + Modals)
    │   ├── MonitorTab (with Stack)
    │   └── SettingsTab (with Stack)
    │
    ├── PublicReleasesStack (separate for /feed)
    │
    └── ModalStack (for overlays across app)
        ├── DossierDetailModal
        ├── CreateDossierWizard
        ├── MediaRecorderModal
        └── ConfirmationDialogs
```

---

## Web Files Referenced

All code analysis is based on these files:

```
/Users/k/Git/canary/
├── app/
│   ├── page.tsx (365KB main app)
│   ├── layout.tsx (root layout)
│   ├── globals.css (styling)
│   ├── feed/page.tsx (public releases)
│   ├── share/page.tsx (shared dossiers)
│   ├── release/page.tsx (release detail)
│   └── components/
│       ├── SettingsView.tsx
│       ├── MonitorView.tsx
│       ├── PublicReleasesView.tsx
│       ├── MediaRecorder.tsx
│       ├── VerifyReleaseModal.tsx
│       └── [other components]
└── package.json (Next.js 15.3.3)
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 weeks)
- [ ] Set up React Navigation structure
- [ ] Create Auth Stack
- [ ] Create Main Tabs Navigator
- [ ] Build Header component
- [ ] Implement deep linking

### Phase 2: Core Features (2-3 weeks)
- [ ] LoginScreen
- [ ] CheckInScreen
- [ ] DossierListScreen
- [ ] DossierDetailModal
- [ ] MonitorScreen

### Phase 3: Advanced Features (2-3 weeks)
- [ ] CreateDossierWizard (5-step form)
- [ ] SettingsScreen
- [ ] PublicFeedScreen
- [ ] ReleaseDetailScreen
- [ ] MediaRecorderModal

### Phase 4: Polish & Integration (1-2 weeks)
- [ ] Theme switching
- [ ] Web3 wallet integration
- [ ] Testing and bug fixes
- [ ] Platform-specific tweaks
- [ ] Performance optimization

---

## Testing Checklist

Before submitting your code:

**Navigation**
- [ ] All tabs work from bottom nav
- [ ] Back button works correctly
- [ ] Modals open/close properly
- [ ] Deep links route correctly
- [ ] Authentication flow works

**UI/UX**
- [ ] Theme toggles everywhere
- [ ] Wallet status displays correctly
- [ ] Text is readable on both light and dark
- [ ] Icons are visible and clear
- [ ] Safe areas respected (notches, etc)

**Platform-Specific**
- [ ] iOS swipe-to-go-back works
- [ ] Android hardware back button works
- [ ] Landscape orientation handled
- [ ] Tab bar spacing correct
- [ ] Header layout consistent

---

## Key Numbers

| Metric | Value |
|--------|-------|
| **Total Documentation Lines** | 1,373 |
| **Total File Size** | 44 KB |
| **Files to Read** | 4 |
| **Estimated Reading Time** | 50-80 minutes |
| **Web App Route Count** | 6 main |
| **Mobile Screens to Build** | 9+ |
| **Core Tabs** | 4 |
| **Modal Types** | 5+ |
| **Implementation Phases** | 4 |
| **Wizard Steps** | 5 |

---

## Quick Links

### Documentation Files
- `QUICK_REFERENCE.md` - Cheat sheet overview
- `NAVIGATION_ANALYSIS.md` - Web app deep dive
- `NAVIGATION_ARCHITECTURE.md` - Mobile implementation guide
- `NAVIGATION_README.md` - Planning and reference

### External References
- Next.js App: `/Users/k/Git/canary/`
- Mobile Project: `/Users/k/Git/canary-mobile/`
- React Navigation Docs: https://reactnavigation.org
- React Native: https://reactnative.dev

---

## FAQ

**Q: Where do I start?**
A: Read `QUICK_REFERENCE.md` first (5 min), then decide which other docs to read based on your needs.

**Q: Do I need to read all 4 documents?**
A: No. `QUICK_REFERENCE.md` and `NAVIGATION_ARCHITECTURE.md` are essential. `NAVIGATION_ANALYSIS.md` helps understand the web app. `NAVIGATION_README.md` is a good high-level reference.

**Q: What's the recommended mobile navigation pattern?**
A: Bottom Tab Navigator for the 4 main views (Check In, Dossiers, Monitor, Settings) with Stack navigation for detail screens and Modals for overlays.

**Q: Should I use React Navigation?**
A: Yes, it's the standard for React Native apps and handles iOS/Android differences automatically.

**Q: How do I handle deep linking?**
A: See `NAVIGATION_ARCHITECTURE.md` section 11 for complete configuration examples.

**Q: What about the 5-step CreateDossier form?**
A: It's a Wizard component with step state management. See `NAVIGATION_ARCHITECTURE.md` section 11 for an example.

**Q: How do I organize my code?**
A: See `NAVIGATION_ARCHITECTURE.md` section 14 for a complete file structure recommendation.

---

## Notes

- All code examples use TypeScript
- Web analysis based on Next.js 15.3.3
- Mobile target: React Native with React Navigation
- Document created: November 3, 2025
- All file paths are absolute

---

## Support

If you have questions about:
- **Web app behavior:** Reference `/Users/k/Git/canary/app/page.tsx`
- **Mobile architecture:** See `NAVIGATION_ARCHITECTURE.md`
- **Specific screens:** See `NAVIGATION_README.md`
- **Quick answer:** Check `QUICK_REFERENCE.md`

---

**Last Updated:** November 3, 2025
**Documentation Version:** 1.0
**Next.js Reference Version:** 15.3.3
**Target Platform:** React Native

Happy building!
