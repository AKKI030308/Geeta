# Cashfree → Telegram Private Access (GitHub + Vercel)

## Flow

Join Private Group → Cashfree Checkout → Cashfree server-side verification → Telegram invite URL is immediately navigated to → Telegram app/browser.

Cashfree's current web checkout flow uses a backend-created order, returns a `payment_session_id`, opens checkout with the JS SDK, then verifies the order's payments server-side after Cashfree redirects back with `order_id`.

## Files

- `index.html` — landing page and Cashfree checkout trigger
- `payment-success.html` — verifies payment and opens Telegram
- `api/create-order.js` — creates Cashfree order
- `api/verify-payment.js` — verifies Cashfree payment and creates a unique Telegram invite
- `vercel.json` — Vercel function config
- `.env.example` — environment-variable template

## Vercel setup

In Vercel → Project → Settings → Environment Variables, add:

CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=your_sandbox_app_id
CASHFREE_CLIENT_SECRET=your_sandbox_secret
PRODUCT_AMOUNT=9
SITE_URL=https://your-vercel-domain.vercel.app

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=-100xxxxxxxxxx

Use the exact production Cashfree credentials and `CASHFREE_ENV=production` only after sandbox testing.

## Telegram setup

1. Create a bot with Telegram's `@BotFather`.
2. Add the bot to the private group/channel.
3. Give the bot administrator permission to manage invite links.
4. Set `TELEGRAM_BOT_TOKEN`.
5. Set `TELEGRAM_CHAT_ID` to the target private group/channel chat ID.
6. The backend uses the configured Telegram invite link after a confirmed payment. The success page immediately navigates to it without showing a clickable invite URL.

For a channel, the bot must have permission to create/manage invite links.

## Important

- Never put the Cashfree secret key or Telegram bot token in `index.html`.
- Do not trust a browser redirect alone as proof of payment; `api/verify-payment.js` checks Cashfree directly.
- Test the complete flow in Cashfree sandbox before switching to production.
- If the payment succeeds but Telegram does not open, first check Vercel function logs and confirm the Telegram bot is an administrator with invite-link permissions.
