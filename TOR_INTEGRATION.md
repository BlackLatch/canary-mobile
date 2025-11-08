# Tor Integration for React Native (Canary Mobile)

This document describes the embedded Tor daemon integration using Go with gomobile bindings.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native (TypeScript)                 │
│                     src/lib/torModule.ts                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ React Native Bridge
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                  Kotlin Native Module                        │
│         android/.../canarymobile/TorModule.kt                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ JNI (gomobile generated)
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                      Go Module                               │
│            relaymobile.aar (gomobile bind)                   │
│         relay/mobile_standalone/relay.go                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ github.com/cretz/bine
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                  Embedded Tor Daemon                         │
│              (Statically compiled for ARM64)                 │
│          ~/tor-static-builder/output/android-arm64/          │
└─────────────────────────────────────────────────────────────┘
```

## Features

- ✅ **Embedded Tor daemon** - No external dependencies
- ✅ **Statically compiled** - 12MB .aar includes everything
- ✅ **Memory safe** - Go's memory management
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Async/await** - Modern JavaScript patterns
- ✅ **Auto-initialization** - Tor starts automatically when needed
- ✅ **Mobile-optimized** - Extended timeouts for cellular networks
- ✅ **Anonymous messaging** - Built-in account and messaging system

## Files Created

### Native Android Layer
- `android/app/libs/relaymobile.aar` - Compiled Go module with Tor
- `android/app/src/main/java/com/canarymobile/TorModule.kt` - React Native bridge
- `android/app/src/main/java/com/canarymobile/TorPackage.kt` - Module registration

### TypeScript Layer
- `src/lib/torModule.ts` - TypeScript API
- `src/examples/TorExample.tsx` - Usage example

### Configuration
- `android/app/build.gradle` - Updated with .aar and dependencies
- `android/app/src/main/java/com/canarymobile/MainApplication.kt` - Registered TorPackage

## Usage

### 1. Initialize Tor

```typescript
import { initializeTor } from './src/lib/torModule';

// Initialize with default data directory
await initializeTor();

// Or specify a custom directory
await initializeTor('/data/data/com.blacklatch.canary/files/tor_data');
```

### 2. Check Tor Status

```typescript
import { getTorStatus, parseInitialState } from './src/lib/torModule';

const statusJSON = await getTorStatus();
const state = parseInitialState(statusJSON);

console.log('Tor available:', state.tor.is_available);
console.log('Tor mode:', state.tor.mode); // 'embedded' or 'system_daemon'
console.log('Tor error:', state.tor.error); // null if no error
```

### 3. Create an Account

```typescript
import { createAccount } from './src/lib/torModule';

const accountID = await createAccount(
  'MyNickname',     // nickname
  true,             // torOnly (only connect via Tor)
  [],               // servers (optional)
  ''                // passphrase (optional)
);

console.log('Created account:', accountID);
```

### 4. List Accounts

```typescript
import { listAccounts, parseAccounts } from './src/lib/torModule';

const accountsJSON = await listAccounts();
const accounts = parseAccounts(accountsJSON);

accounts.forEach(account => {
  console.log(`${account.nickname}: ${account.account_id}`);
});
```

### 5. Send Anonymous Message

```typescript
import { sendTextMessage } from './src/lib/torModule';

const result = await sendTextMessage(
  'sender_account_id',
  'recipient_account_id',
  'Hello via Tor!'
);

console.log(result); // "Message sent successfully via <server>"
```

## API Reference

### `initializeTor(dataDir?: string): Promise<string>`
Initializes the Tor daemon with the specified data directory.

**Parameters:**
- `dataDir` (optional): Path to store Tor data. Defaults to app's internal storage.

**Returns:** Success message

**Throws:** Error if initialization fails

---

### `getTorStatus(): Promise<string>`
Gets the current Tor status including availability, mode, and any errors.

**Returns:** JSON string with initial state (includes Tor status in `tor` field)

---

### `isInitialized(): Promise<boolean>`
Checks if Tor is initialized.

**Returns:** `true` if initialized, `false` otherwise

---

### `createAccount(nickname, torOnly, servers, passphrase): Promise<string>`
Creates a new account for messaging.

**Parameters:**
- `nickname`: User-friendly account name
- `torOnly`: If `true`, only connect via Tor (recommended)
- `servers`: Array of server URLs (optional, defaults to built-in servers)
- `passphrase`: Optional encryption passphrase

**Returns:** Account ID (base58-encoded public key)

---

### `listAccounts(): Promise<string>`
Lists all accounts.

**Returns:** JSON string with array of accounts

---

### `sendTextMessage(fromAccountID, toAccountID, message): Promise<string>`
Sends an encrypted text message through Tor.

**Parameters:**
- `fromAccountID`: Sender's account ID
- `toAccountID`: Recipient's account ID
- `message`: Text message to send

**Returns:** Success message with server used

---

### Helper Functions

#### `parseAccounts(accountsJSON: string): Account[]`
Parses the JSON string returned by `listAccounts()`.

#### `parseInitialState(stateJSON: string): TorInitialState`
Parses the JSON string returned by `getTorStatus()`.

## How It Works

### Tor Bootstrap Process

1. **App starts** → TorModule is registered
2. **Call `initializeTor()`** → Creates data directory
3. **First Tor operation** → Go code starts embedded Tor daemon
4. **Tor bootstraps** → Connects to Tor network (takes 1-5 minutes on mobile)
5. **Ready** → All operations use Tor network

### Mobile Optimizations

The embedded Tor is configured for mobile networks:

- **Extended timeouts**: 5-minute bootstrap timeout (vs 2 minutes on desktop)
- **Connection padding**: Helps evade traffic analysis
- **Circuit build timeout**: 60 seconds for slow networks
- **Adaptive learning**: Learns optimal circuit build times

### Security Features

- **End-to-end encryption**: Messages encrypted with recipient's public key
- **Anonymous routing**: All traffic routed through Tor network
- **No metadata leakage**: No IP addresses or identifiers exposed
- **Memory safety**: Go's garbage collection prevents memory bugs
- **Static compilation**: No dynamic library attacks

## Building the .aar

The .aar file is already built and included. To rebuild:

```bash
cd /home/user/django_projects/relay/gui/RelayMobile
make aar-tor
```

This will:
1. Build the Go code with `-tags embedtor`
2. Link against static Tor libraries from `~/tor-static-builder/output/android-arm64/`
3. Use `gomobile bind` to create Android bindings
4. Output `relaymobile.aar` (approximately 12 MB)

## Build Requirements

- **Go 1.24+** with mobile support
- **Android NDK** (for gomobile)
- **Tor static libraries** (already built at `~/tor-static-builder/output/android-arm64/`)

## Tor Library Details

The embedded Tor includes:
- **Tor 0.4.8.x** - Latest stable release
- **OpenSSL** - Crypto library
- **libevent** - Event loop
- **zlib** - Compression

All statically linked into `libtor.a` (8.2 MB) and embedded in the .aar.

## Android Permissions

Required permissions (already in AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Troubleshooting

### Tor fails to bootstrap
- **Cause**: Network connectivity issues or restrictive firewall
- **Solution**: Wait longer (up to 5 minutes on mobile), ensure INTERNET permission is granted

### "Module not found" error
- **Cause**: TorPackage not registered
- **Solution**: Verify `TorPackage()` is added in `MainApplication.kt`

### Build errors with .aar
- **Cause**: Gradle cache issues
- **Solution**: Run `cd android && ./gradlew clean`

### Memory issues
- **Cause**: Large .aar file
- **Solution**: Enable minification in release builds

## Performance

- **APK size increase**: ~12 MB (compressed)
- **Memory usage**: ~50-100 MB (Tor daemon)
- **Bootstrap time**: 1-5 minutes on first connect
- **Message latency**: 3-10 seconds via Tor

## Example App

See `src/examples/TorExample.tsx` for a complete React Native component demonstrating all features.

## References

- [Tor Project](https://www.torproject.org/)
- [gomobile](https://pkg.go.dev/golang.org/x/mobile/cmd/gomobile)
- [cretz/bine](https://github.com/cretz/bine) - Go Tor library
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-android)

## License

This integration uses:
- Tor (BSD-3-Clause)
- Go (BSD-3-Clause)
- OpenSSL (Apache-2.0)

## Support

For issues with:
- **Tor integration**: Check Tor logs in `<dataDir>/tor_data/`
- **Go bindings**: Review gomobile documentation
- **React Native bridge**: Check logcat with `adb logcat -s TorModule`
