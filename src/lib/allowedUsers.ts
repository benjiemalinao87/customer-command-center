/**
 * Allowed Users Configuration
 * Controls which users can access the application
 * 
 * Environment Variable: VITE_ALLOWED_USER_EMAILS
 * Format: Comma-separated list of email addresses
 * Example: "user1@example.com,user2@example.com,admin@company.com"
 * 
 * If the environment variable is not set or empty, all authenticated users can access.
 */

/**
 * Get the list of allowed user emails from environment variable
 */
export const getAllowedUserEmails = (): string[] => {
  const allowedEmails = import.meta.env.VITE_ALLOWED_USER_EMAILS;
  
  if (!allowedEmails || allowedEmails.trim() === '') {
    return []; // Empty array means no restriction (all users allowed)
  }
  
  return allowedEmails
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter((email: string) => email.length > 0);
};

/**
 * Check if a user email is allowed to access the application
 * @param email - The user's email address
 * @returns true if the user is allowed, false otherwise
 */
export const isUserAllowed = (email: string | null | undefined): boolean => {
  if (!email) {
    return false;
  }
  
  const allowedEmails = getAllowedUserEmails();
  
  // If no allowed emails are configured, allow all authenticated users
  if (allowedEmails.length === 0) {
    console.log('[AccessControl] No allowlist configured - allowing all authenticated users');
    return true;
  }
  
  const normalizedEmail = email.trim().toLowerCase();
  const isAllowed = allowedEmails.includes(normalizedEmail);
  
  if (isAllowed) {
    console.log(`[AccessControl] ✅ User ${normalizedEmail} is in the allowlist`);
  } else {
    console.log(`[AccessControl] ❌ User ${normalizedEmail} is NOT in the allowlist`);
  }
  
  return isAllowed;
};

/**
 * Check if the allowlist feature is enabled
 * @returns true if VITE_ALLOWED_USER_EMAILS is configured with at least one email
 */
export const isAllowlistEnabled = (): boolean => {
  return getAllowedUserEmails().length > 0;
};
