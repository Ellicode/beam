# Authentication System

## Overview

Beam includes an encrypted password authentication system to secure peer-to-peer connections. Each device can set a "super secret password" that other devices must know to send files to it.

## How It Works

### 1. Password Setup (Settings View)

- Navigate to Settings → Security section
- Click "Set Password" button
- Enter a password (minimum 8 characters) and confirm it
- Password is hashed using PBKDF2 with 100,000 iterations and stored securely

**Storage:**

- `superSecretPassword`: PBKDF2 hash (SHA-512, 100k iterations)
- `passwordSalt`: Random 32-byte salt (hex-encoded)
- `authKey`: SHA-256 hash of the password (used for verification)

### 2. Adding a Device (AddDevice View)

- Discover devices via mDNS/Bonjour
- Click on a device to add it
- **Enter the device's super secret password** when prompted
- The password generates an `authKey` that is stored with the device

**Saved Device Structure:**

```typescript
{
  name: string,
  address: string,
  port: number,
  authKey?: string  // SHA-256 hash of the peer's password
}
```

### 3. File Transfer Authentication

**Sender (Home.vue):**

- When transferring files, the sender includes the saved `authKey` in HTTP headers
- Header: `X-Auth-Key: <sha256_hash>`

**Receiver (peer.ts):**

- Receives the file transfer request
- Checks if the device has a password set
- Compares the received `authKey` with the stored `authKey`
- **Rejects transfer** if authentication fails (401/403)
- **Accepts transfer** if authentication succeeds or no password is set

## Security Features

1. **Password Hashing**: Uses PBKDF2 with 100,000 iterations, making brute-force attacks computationally expensive
2. **Salted Hashes**: Each password uses a unique random salt to prevent rainbow table attacks
3. **Auth Key Verification**: Transfers are authenticated using SHA-256 hashes without transmitting passwords
4. **No Plain Text**: Passwords are never stored or transmitted in plain text

## Error Handling

- **Missing auth key**: Returns 401 Unauthorized
- **Invalid auth key**: Returns 403 Forbidden
- **Password too short**: Shows error in UI (minimum 8 characters)
- **Passwords don't match**: Shows error during password confirmation

## File Locations

### Main Process

- `src/main/crypto.ts`: Password hashing and verification utilities
- `src/main/settings.ts`: Password IPC handlers and storage
- `src/main/peer.ts`: Transfer authentication logic

### Renderer Process

- `src/renderer/src/views/Settings.vue`: Password setup UI
- `src/renderer/src/views/AddDevice.vue`: Password prompt when adding devices
- `src/renderer/src/views/Home.vue`: Sends authKey with file transfers

### Preload

- `src/preload/index.ts`: Exposes password APIs to renderer
- `src/preload/index.d.ts`: TypeScript definitions

## API Methods

```typescript
// Set the device's password
window.api.settings.setPassword(password: string): Promise<boolean>

// Verify a password
window.api.settings.verifyPassword(password: string): Promise<boolean>

// Check if password is set
window.api.settings.hasPassword(): Promise<boolean>

// Generate auth key from password
window.api.settings.getAuthKey(password: string): Promise<string>
```

## Usage Flow

1. **Device A** sets its password in Settings: `"mySecretPass123"`
2. **Device B** discovers Device A via mDNS
3. **Device B** clicks on Device A and enters its password: `"mySecretPass123"`
4. Auth key is generated and stored: `SHA-256("mySecretPass123")`
5. **Device B** sends files to Device A with the auth key in headers
6. **Device A** verifies the auth key matches its own password's hash
7. Transfer succeeds if authentication passes

## Migration

Existing devices without passwords will continue to work:

- Devices without passwords set will accept all transfers
- Devices with passwords require authentication
- Gradually enable authentication as needed
