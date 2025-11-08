# Tor Integration - Quick Start

## What Was Done

Your React Native app now has an **embedded Tor daemon** with full anonymous messaging capabilities!

### Key Components

1. **Go wrapper with embedded Tor** (`relaymobile.aar` - 12MB)
   - Built from your existing `relay` project
   - Uses gomobile for Android bindings
   - Includes statically compiled Tor 0.4.8.x

2. **Kotlin Native Module** (`TorModule.kt`)
   - Bridges Go code to React Native
   - Async/await support with Kotlin coroutines

3. **TypeScript API** (`src/lib/torModule.ts`)
   - Clean, type-safe interface
   - Promise-based async operations

## Quick Test

### Step 1: Build the App

```bash
cd /home/user/django_projects/canary-mobile2
cd android && ./gradlew clean
cd ..
npm run android
```

### Step 2: Add to Your Screen

```typescript
import { initializeTor, getTorStatus } from './src/lib/torModule';

// In your component
const handleInitTor = async () => {
  try {
    await initializeTor();
    console.log('Tor initialized!');

    const status = await getTorStatus();
    console.log('Tor status:', status);
  } catch (error) {
    console.error('Tor error:', error);
  }
};
```

### Step 3: Run Example

Copy `src/examples/TorExample.tsx` to your navigation stack to test all features:
- Initialize Tor
- Check status
- Create accounts
- Send messages

## What You Can Do Now

### Anonymous Messaging
```typescript
// Create sender account
const senderID = await createAccount('Alice', true);

// Create recipient account
const recipientID = await createAccount('Bob', true);

// Send encrypted message through Tor
await sendTextMessage(senderID, recipientID, 'Hello via Tor!');
```

### Check Tor Status
```typescript
const statusJSON = await getTorStatus();
const state = parseInitialState(statusJSON);

if (state.tor.is_available) {
  console.log('Tor is running!');
  console.log('Mode:', state.tor.mode); // 'embedded'
}
```

### List All Accounts
```typescript
const accountsJSON = await listAccounts();
const accounts = parseAccounts(accountsJSON);

accounts.forEach(acc => {
  console.log(`${acc.nickname}: ${acc.account_id}`);
});
```

## Important Notes

### First Run
- Tor takes **1-5 minutes** to bootstrap on mobile
- Be patient - this is normal for Tor on cellular networks
- Progress is logged, check with: `adb logcat -s TorModule`

### APK Size
- Adds ~12 MB to your APK (compressed)
- This includes the entire Tor network stack

### Memory Usage
- Tor uses ~50-100 MB of RAM when running
- Memory is managed by Go's garbage collector

### Permissions
- Only requires `INTERNET` permission (already added)
- No location, storage, or other sensitive permissions needed

## Architecture Benefits

✅ **Safe**: Go's memory safety vs C/C++
✅ **Simple**: Direct function calls vs subprocess management
✅ **Reliable**: No IPC, no process lifecycle issues
✅ **Maintained**: Uses your existing Go codebase
✅ **Secure**: Tor is statically compiled, no dynamic library attacks

## Debugging

### View Logs
```bash
adb logcat -s TorModule Go
```

### Check Tor Data
```bash
adb shell
cd /data/data/com.blacklatch.canary/files/tor_data/
ls -la
```

### Test Tor Connectivity
Use `getTorStatus()` to verify Tor bootstrapped successfully.

## Next Steps

1. **Test the build**: `npm run android`
2. **Try the example**: Import `TorExample.tsx` in your navigator
3. **Integrate**: Use `torModule.ts` in your existing screens
4. **Customize**: Modify for your use case

## Full Documentation

See `TOR_INTEGRATION.md` for complete API documentation and architecture details.

## Need Help?

Check the logs:
```bash
adb logcat | grep -E "(TorModule|Go|Tor)"
```

Common issues are documented in `TOR_INTEGRATION.md` under "Troubleshooting".
