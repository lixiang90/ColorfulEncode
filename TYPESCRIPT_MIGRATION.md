# TypeScript Migration Summary

This document describes the migration from Python (Pyodide) to TypeScript as the default scripting language for ColorfulEncode.

## Changes Made

### 1. TypeScript Encode Scripts (src/encode_scripts/*.ts)

Created TypeScript versions of all 9 built-in scripts:

- **base64.ts** - Standard Base64 encoding/decoding
- **hex.ts** - Hexadecimal string conversion
- **rot13.ts** - ROT13 Caesar cipher
- **reverse.ts** - Simple text reversal
- **aes.ts** - AES-CBC encryption using Web Crypto API
- **rsa.ts** - RSA encryption with key generation (Web Crypto API)
- **rsa_friend.ts** - RSA for friend-to-friend communication
- **dishes.ts** - 报菜名 (Chinese dish names encoding)
- **hakima.ts** - 哈基码 (Hakima character set encoding)

All TypeScript scripts:
- Use native browser APIs (Web Crypto API for encryption)
- Support async/await for cryptographic operations
- Execute instantly without external dependencies
- Are compatible with modern browsers

### 2. Script Loader (src/lib/scriptLoader.ts)

Updated to:
- Load both `.ts` and `.py` files
- Prefer `.ts` files when both versions exist
- Add `language` field to `ScriptPreset` interface
- Parse metadata from `//` comments (TypeScript) and `#` comments (Python)

### 3. Chat Client (src/components/ChatClient.tsx)

Major updates:
- **TypeScript Execution**: Uses `AsyncFunction` constructor to execute TypeScript/JavaScript scripts natively in the browser
- **Lazy Pyodide Loading**: Pyodide is only loaded when a Python script is selected, not on app startup
- **Unified API**: Both TypeScript and Python scripts use the same execution flow
- **Language Detection**: Auto-detects script language based on code content
- **Updated UI**: 
  - Status indicator shows "TypeScript Ready" or "Loading Python..."
  - Script editor includes language selector
  - Default template is TypeScript
  - Updated translations

### 4. Layout (src/app/layout.tsx)

Removed:
- Pyodide CDN script preload
- Pyodide is now loaded dynamically only when needed

## Benefits

1. **Instant Load**: TypeScript scripts execute immediately without waiting for Pyodide
2. **Smaller Bundle**: No need to load ~10MB Pyodide runtime for simple scripts
3. **Better Performance**: Native JavaScript execution is faster than Pyodide
4. **Modern APIs**: Access to Web Crypto API, TextEncoder/Decoder, etc.
5. **Backward Compatibility**: Python scripts still work via lazy-loaded Pyodide

## Script Execution Model

### TypeScript Scripts
```typescript
// Scripts are executed using AsyncFunction constructor
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const fn = new AsyncFunction(`
  const SCRIPT_CONFIG = ${JSON.stringify(config)};
  ${scriptCode}
  return await ${functionName}(${JSON.stringify(input)});
`);
const result = await fn();
```

### Python Scripts
```python
# Scripts are executed via Pyodide (loaded on-demand)
await pyodide.runPythonAsync(scriptCode);
pyodide.globals.set("SCRIPT_CONFIG_JSON", JSON.stringify(config));
const result = await pyodide.runPythonAsync(`${functionName}(input_text)`);
```

## Migration Guide for Users

### For Built-in Scripts
No action needed. All built-in scripts now use TypeScript by default.

### For Custom Python Scripts
Your existing Python scripts will continue to work:
1. Pyodide will be automatically loaded when you select a Python script
2. You can continue using Python syntax
3. Consider migrating to TypeScript for better performance

### Creating New Scripts
The default template is now TypeScript:
```typescript
function encode(text: string): string {
    // Your encoding logic
    return text;
}

function decode(text: string): string {
    // Your decoding logic
    return text;
}
```

You can still choose Python in the script editor if preferred.

## Technical Notes

### Web Crypto API vs PyCryptodome

**AES Encryption:**
- TypeScript: Uses Web Crypto API with AES-CBC and PKCS7 padding
- Python: Uses PyCryptodome with AES-CBC and PKCS7 padding
- Note: Both use SHA-256 for key derivation, but implementations differ slightly

**RSA Encryption:**
- TypeScript: Uses Web Crypto API with RSA-OAEP and SHA-256
- Python: Uses PyCryptodome with PKCS1_OAEP and SHA-1 (default)
- Note: Keys generated in TypeScript are not compatible with Python scripts and vice versa

### Key Format Differences

**TypeScript (Web Crypto API):**
- Public Key: SPKI format (`-----BEGIN PUBLIC KEY-----`)
- Private Key: PKCS8 format (`-----BEGIN PRIVATE KEY-----`)

**Python (PyCryptodome):**
- Public Key: SPKI format (`-----BEGIN PUBLIC KEY-----`)
- Private Key: PKCS1 format (`-----BEGIN RSA PRIVATE KEY-----`)

## Browser Compatibility

TypeScript scripts require:
- Modern browser with Web Crypto API support
- ES2017+ (async/await, TextEncoder/TextDecoder)

Supported browsers:
- Chrome 60+
- Firefox 57+
- Safari 11+
- Edge 79+

## Future Enhancements

Potential improvements:
1. TypeScript syntax highlighting in script editor
2. Code validation/linting for TypeScript scripts
3. Built-in TypeScript type definitions for common operations
4. Migration tool to convert Python scripts to TypeScript
