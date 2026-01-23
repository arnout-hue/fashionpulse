
# Add Front-End Password Protection

## Overview
Add a client-side password gate to protect the dashboard. Users must enter "Cirkel007!" to access the application. The password state will be stored in sessionStorage so it persists during the browser session but resets when the browser is closed.

## Security Note
This is a **front-end only** password protection, which means:
- It deters casual visitors from accessing the dashboard
- The password is stored in the client-side code (not truly secure)
- For sensitive data, server-side authentication would be recommended

This approach is suitable for your use case of keeping the project hidden from casual access.

## Implementation Plan

### Step 1: Add No-Index Meta Tags
**File:** `index.html`

Ensure search engines don't index the site:
- Add `<meta name="robots" content="noindex, nofollow" />`
- Remove or update any SEO-friendly meta tags

### Step 2: Create Password Gate Component
**File:** `src/components/PasswordGate.tsx` (new)

A simple full-screen password entry form:
- Password input field (masked)
- Submit button
- Error message for incorrect password
- Minimal branding (Fashion Pulse logo/title)
- Styled to match the dark dashboard theme

### Step 3: Create Auth Store
**File:** `src/store/authStore.ts` (new)

Zustand store with sessionStorage persistence:
- `isAuthenticated: boolean`
- `authenticate(password: string): boolean` - validates password and sets state
- `logout(): void` - clears authentication

The password "Cirkel007!" will be stored as a constant in this file.

### Step 4: Update App Entry Point
**File:** `src/App.tsx`

Wrap the entire app with the PasswordGate:
- If not authenticated → show password form
- If authenticated → show the dashboard

### Step 5: Add Translations
**File:** `src/i18n/translations.ts`

Add password gate translations for both EN and NL:
- "Enter Password" / "Voer wachtwoord in"
- "Access Dashboard" / "Toegang tot Dashboard"
- "Incorrect password" / "Onjuist wachtwoord"

---

## Technical Details

### Password Validation
```typescript
const DASHBOARD_PASSWORD = "Cirkel007!";

const authenticate = (password: string): boolean => {
  if (password === DASHBOARD_PASSWORD) {
    set({ isAuthenticated: true });
    return true;
  }
  return false;
};
```

### Session Storage
Using Zustand's persist middleware with `sessionStorage`:
```typescript
persist(
  (set) => ({ ... }),
  {
    name: 'fashion-pulse-auth',
    storage: createJSONStorage(() => sessionStorage),
  }
)
```

### Password Gate UI
- Full-screen dark background matching dashboard theme
- Centered card with password input
- Fashion Pulse branding
- Error shake animation on wrong password
- Support for Enter key submission

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `index.html` | Modify | Add noindex, nofollow meta tag |
| `src/store/authStore.ts` | Create | Session-based auth state |
| `src/components/PasswordGate.tsx` | Create | Password entry form |
| `src/App.tsx` | Modify | Wrap app with PasswordGate |
| `src/i18n/translations.ts` | Modify | Add password form translations |

---

## User Experience

1. User visits the site → sees password form
2. Enters "Cirkel007!" → gains access to dashboard
3. Password persists for the browser session
4. Closing browser → requires password again
5. Wrong password → shows error, can retry
