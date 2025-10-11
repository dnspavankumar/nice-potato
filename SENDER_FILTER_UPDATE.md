# Sender Email Filter Feature

## Changes Made

The application now allows users to fetch emails from any sender, not just Canara Bank.

### 1. UI Changes (src/app/page.tsx)
- Added a new input field in the header for entering sender email address
- The input field is placed next to the "Sync Emails" button
- Users can leave it empty to fetch Canara Bank emails (default behavior)
- Updated help text to reflect the new functionality

### 2. API Changes (src/app/api/emails/sync/route.ts)
- Added `senderEmail` parameter to the sync endpoint
- Logic now prioritizes:
  1. Custom query (if provided)
  2. Sender email filter (if provided)
  3. Default Canara Bank emails (fallback)

### 3. Gmail Service Changes (src/lib/gmail.ts)
- Updated `getEmailsFromSender()` method to accept `maxResults` parameter
- Added logging for better debugging
- Method now fetches emails from the last 30 days by default

## How to Use

1. **Fetch emails from a specific sender:**
   - Enter the sender's email address (e.g., "amazon.com", "paypal.com", "notifications@github.com")
   - Click "Sync Emails"
   - The app will fetch the latest 5 emails from that sender

2. **Fetch Canara Bank emails (default):**
   - Leave the sender email field empty
   - Click "Sync Emails"
   - The app will fetch Canara Bank emails as before

3. **Examples of sender inputs:**
   - `canarabank.com` - Canara Bank emails
   - `amazon.com` - Amazon emails
   - `notifications@github.com` - GitHub notifications
   - `noreply@google.com` - Google service emails

## Technical Details

- The sender filter uses Gmail's `from:` search operator
- Searches emails from the last 30 days
- Returns up to 5 emails by default (configurable)
- All emails are processed with AI summarization and indexed for search/chat
