# Telegram Bot Setup Guide

## Overview
The Dreamland College Management System now uses **Telegram Bot** for OTP verification and notifications instead of paid SMS services like AfroMessage.

## Why Telegram?
- **Free** - No per-message costs
- **Instant delivery** - Messages arrive immediately
- **No phone number required** - Users provide Telegram username
- **Rich formatting** - Supports HTML formatting
- **No setup required** - Just create a bot and start chatting

---

## Setup Instructions

### Step 1: Create a Telegram Bot

1. Open **Telegram** app (mobile or desktop)
2. Search for **@BotFather**
3. Send the command: `/newbot`
4. Follow the prompts:
   - Enter bot name: `Dreamland College Bot`
   - Enter username: `DreamlandCollegeBot` (must end in `bot`)
5. **Copy the Bot Token** - It looks like: `123456789:ABCdefGHIJKlmNoPQRstuVWxyZ`

### Step 2: Configure the Bot Token

Edit `.env.local`:
```env
TELEGRAM_BOT_TOKEN=YOUR_ACTUAL_BOT_TOKEN_HERE
TELEGRAM_MOCK_MODE=false
```

### Step 3: Test the Bot

1. Search for your bot username in Telegram
2. Click **Start** or send `/start`
3. Your bot should respond (after code is deployed)

---

## How It Works

### Registration Flow
1. Student enters their **Telegram username** (e.g., `@john_doe`)
2. System sends **6-digit OTP** via Telegram bot
3. Student enters OTP to verify
4. Registration completes successfully

### Notifications
Students receive via Telegram:
- Registration confirmation
- Payment verification
- Grade releases
- Password reset codes
- Reminders and announcements

---

## API Endpoints

### Send OTP via Telegram
```http
POST /api/public/send-otp
Content-Type: application/json

{
  "identifier": "john_doe",
  "type": "telegram",
  "full_name": "John Doe",
  "telegram_chat_id": "john_doe"
}
```

### Send Telegram Message (Admin)
```http
POST /api/telegram/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "chat_id": "john_doe",
  "message": "Hello from Dreamland College!"
}
```

### Bulk Telegram Message (Admin)
```http
POST /api/telegram/send-bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "chat_ids": ["john_doe", "jane_smith"],
  "message": "Important announcement for all students!"
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/services/messaging/telegramService.ts` | NEW - Telegram Bot API service |
| `server.ts` | Replaced AfroMessage with Telegram |
| `.env.local` | Added `TELEGRAM_BOT_TOKEN` |
| `src/pages/PublicRegistration.tsx` | Added Telegram username field |

---

## Database Changes

Added `telegram_chat_id` column to `students` table:
```sql
ALTER TABLE students ADD COLUMN telegram_chat_id TEXT;
```

---

## Testing in Development

When `TELEGRAM_MOCK_MODE=true` (default in development):
- Messages are logged to console instead of sent
- OTP codes are visible in server logs
- Test without real Telegram API

```bash
npm run dev
# You'll see output like:
# [TELEGRAM MOCK] To john_doe: Your verification code is: 123456
```

---

## Switching to Production

1. Set `TELEGRAM_MOCK_MODE=false` in production `.env`
2. Ensure your bot token is correct
3. Test by registering a new student

---

## Troubleshooting

### Bot not responding?
- Check `TELEGRAM_BOT_TOKEN` is correct
- Ensure `TELEGRAM_MOCK_MODE=false`
- Verify bot username is correct (no @ symbol needed)

### Users not receiving messages?
- Ensure students have started a chat with the bot
- Check server logs for errors
- Verify `telegram_chat_id` is being stored correctly

### Mock mode still active?
- Check `.env.local` for `TELEGRAM_MOCK_MODE=true`
- Set to `false` for real messages

---

## Cost Comparison

| Service | Cost per 1000 messages |
|---------|----------------------|
| AfroMessage (SMS) | ~$5-10 |
| Telegram Bot | **FREE** |

**Savings**: Unlimited notifications at no cost!

---

## Future Enhancements

Possible additions:
- Inline keyboard buttons for quick actions
- Deep links for easy bot discovery
- Message templates with variables
- Delivery status tracking
- Broadcast scheduling
