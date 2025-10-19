# Comprehensive API Key Implementation Guide

This guide provides detailed instructions and best practices for implementing a secure and robust API key system for your application.

## 1. Introduction

API keys are secret tokens that grant access to your API. They are used to authenticate requests from external applications or services, track API usage, and control access to specific resources or features.

**Benefits of API Keys:**
- **Authentication:** Verify the identity of the client making the API request.
- **Authorization:** Control what actions an API key holder can perform (scopes/permissions).
- **Usage Tracking & Analytics:** Monitor API consumption per key.
- **Rate Limiting & Quotas:** Prevent abuse and ensure fair usage.
- **Security:** Provide a mechanism for revoking access if a key is compromised.

## 2. Core Components & Design Considerations

### 2.1. API Key Structure
- **Prefix:** Use a prefix to identify the type of key (e.g., `sk_live_` for secret live keys, `pk_live_` for publishable live keys, `sk_test_` for secret test keys). This helps in quick identification and can be useful for automated systems.
- **Random String:** A cryptographically secure random string (e.g., 32-64 characters long).
- **Checksum (Optional):** A short checksum can help detect accidental modifications, though this is less common for server-side keys.
- **Example:** `[prefix]_[environment]_[random-32-to-64-chars]`

### 2.2. API Key Storage
- **NEVER store raw API keys directly in your database.**
- **Hashing:** Store a cryptographically secure hash of the API key (e.g., using bcrypt, Argon2, or SHA-256 with a salt).
- **Key Prefix Storage:** Store the prefix separately or derive it. This allows you to display the prefix to the user without revealing the full key.
- **Database Table (`api_keys`):**
  - `id` (Primary Key, UUID)
  - `user_id` (Foreign Key to users table, if keys are user-specific)
  - `workspace_id` (Foreign Key, if multi-tenant)
  - `name` (User-friendly name for the key)
  - `key_hash` (VARCHAR, stores the hashed key)
  - `key_prefix` (VARCHAR, e.g., `sk_live_`)
  - `scopes` (JSONB or TEXT array, stores permissions)
  - `last_used_at` (TIMESTAMP, updated on successful use)
  - `expires_at` (TIMESTAMP, optional for expiring keys)
  - `revoked_at` (TIMESTAMP, null if active)
  - `created_at`, `updated_at` (TIMESTAMPS)

### 2.3. Permissions and Scopes
- Define granular permissions (scopes) that an API key can have (e.g., `read:contacts`, `write:messages`, `admin:users`).
- Store these scopes with the API key record.
- Your API endpoints must check if the authenticated key has the required scope for the requested operation.

### 2.4. Rate Limiting
- Implement rate limiting per API key to prevent abuse.
- Track request counts (e.g., using Redis) associated with each key.
- Return `429 Too Many Requests` HTTP status code when limits are exceeded.
- Include headers like `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## 3. Implementation Steps

### Step 1: Database Schema Setup
Create the `api_keys` table as described in section 2.2.

### Step 2: API Key Generation Logic
1.  **Generate Secure Random String:** Use a cryptographically secure pseudo-random number generator (CSPRNG).
    ```javascript
    // Example in Node.js
    const crypto = require('crypto');
    const apiKey = crypto.randomBytes(32).toString('hex'); // 64-character hex string
    const fullKey = `sk_live_${apiKey}`;
    ```
2.  **Hash the Key:** Use a strong hashing algorithm.
    ```javascript
    // Example using bcrypt
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const keyHash = await bcrypt.hash(fullKey, saltRounds);
    ```
3.  **Store in Database:** Save `key_hash`, `key_prefix`, `user_id`, `workspace_id`, `name`, `scopes`, etc., in the `api_keys` table.
4.  **Display to User (Once):** Show the `fullKey` to the user immediately after generation. **Crucially, inform them that this is the only time they will see the full key and they must store it securely.** Do not store the `fullKey` yourself.

### Step 3: API Key Authentication Middleware
This middleware will run on protected API routes.
1.  **Extract Key:** Get the API key from the `Authorization` header (e.g., `Authorization: Bearer <api_key>`).
2.  **Basic Validation:** Check the key format (e.g., prefix).
3.  **Lookup Strategy:**
    *   **Option A (More Secure, Slower):** Iterate through all active API key hashes in your database and use `bcrypt.compare()` for each one against the provided key. This avoids needing to query by a part of the key.
    *   **Option B (Less Secure if prefix is guessable, Faster):** If you store a non-sensitive, unique part of the key (like a short, non-secret identifier derived during generation, NOT the prefix if it's common), you could query by that first, then `bcrypt.compare()` the hash. This is generally not recommended for high security.
    *   **Recommended for Performance & Security:** If you can derive a unique, non-secret lookup identifier from the key (e.g., first few characters of the random part, if this part is long enough not to cause too many collisions for lookup before hashing), you could store this separately. *However, the most common secure approach is to iterate and compare hashes if performance allows, or implement more complex schemes like API key IDs if needed for very high load.*
    *   **A common pattern for lookup:** Some systems generate a public *Key ID* (which is safe to store and query) and a *Secret Key*. The client sends both. You look up the Key ID, retrieve the associated hash, and then compare the hash with the provided Secret Key. This is a robust approach.
4.  **Verify Hash:** If a matching hash is found (using `bcrypt.compare(providedKey, storedHash)`).
5.  **Check Status:** Ensure the key is not revoked (`revoked_at` is null) and not expired (`expires_at` is in the future or null).
6.  **Update `last_used_at`:** If authentication is successful.
7.  **Attach Context:** Add `user_id`, `workspace_id`, and `scopes` associated with the key to the request object (e.g., `req.authContext = { userId, workspaceId, scopes }`) for use in subsequent route handlers.
8.  **Handle Failure:** If any check fails, return a `401 Unauthorized` or `403 Forbidden` error.

### Step 4: Permissions and Scope Enforcement
In your API route handlers:
1.  Access the `req.authContext.scopes`.
2.  Check if the required scope for the operation is present in the key's scopes.
3.  If not, return a `403 Forbidden` error.

### Step 5: Rate Limiting Integration
1.  Use a library like `express-rate-limit` (for Node.js/Express).
2.  Configure it to use the API key as the identifier for rate limiting.
    ```javascript
    // Example configuration
    const rateLimit = require('express-rate-limit');
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP/key to 100 requests per windowMs
      keyGenerator: (req) => req.headers['authorization'] || req.ip, // Use API key or IP
      handler: (req, res) => {
        res.status(429).json({
          message: 'Too many requests, please try again later.',
        });
      },
    });
    app.use('/api/', apiLimiter);
    ```

### Step 6: Security Best Practices Recap
- **HTTPS Only:** Enforce HTTPS for all API communication.
- **Input Validation:** Validate all inputs to your API.
- **Principle of Least Privilege:** Grant API keys only the minimum necessary scopes.
- **Auditing:** Log all API key generations, revocations, and significant API calls made with keys.
- **Key Rotation:** Encourage or enforce key rotation policies.
- **Secure Storage of Hashes:** Use strong, salted hashing algorithms.
- **User Education:** Clearly instruct users on how to protect their API keys.
- **Revocation Mechanism:** Implement a way to immediately revoke compromised keys.

### Step 7: User Interface (UI) for API Key Management
Provide a section in your application's settings where users can:
- Generate new API keys.
- Name their keys for easy identification (e.g., "My Integration X Key").
- View key prefixes, creation dates, and last used dates (NEVER the full key after initial generation).
- Assign/modify scopes for their keys.
- Revoke existing keys.
- See clear warnings about keeping keys secret.

## 4. Example Workflow (Conceptual)

1.  **User Action:** User navigates to API Key Management UI and clicks "Generate New Key".
2.  **UI:** Prompts for a key name and desired scopes.
3.  **Backend Request:** UI sends request to backend to create a key.
4.  **Backend Logic (Key Generation):**
    *   Generates `fullKey = prefix + random_string`.
    *   Hashes `fullKey` to get `keyHash`.
    *   Stores `name`, `user_id`, `workspace_id`, `key_prefix`, `keyHash`, `scopes` in the database.
    *   Returns the `fullKey` (and its ID/prefix for display) to the UI.
5.  **UI Display:** Shows the `fullKey` to the user ONCE, with strong warnings to copy and store it securely. Also displays the key's name, prefix, and scopes.
6.  **External Service Usage:**
    *   User configures their external service with the `fullKey`.
    *   External service makes an API request: `GET /api/contacts` with header `Authorization: Bearer sk_live_...`.
7.  **Backend Logic (Authentication Middleware):**
    *   Extracts `sk_live_...` from header.
    *   Looks up the corresponding `keyHash` and metadata (scopes, status).
    *   Verifies the key (hash matches, not revoked, not expired).
    *   If valid, attaches auth context to `req`.
8.  **Backend Logic (Route Handler for `/api/contacts`):**
    *   Checks if `req.authContext.scopes` includes `read:contacts`.
    *   If yes, processes the request (filtered by `req.authContext.workspaceId`).
    *   If no, returns `403 Forbidden`.

## 5. Conclusion

Implementing API keys correctly is crucial for the security and scalability of your application. By following these guidelines, you can create a system that is both secure for your users and manageable for your team. Regularly review and update your security practices as new threats and best practices emerge.
