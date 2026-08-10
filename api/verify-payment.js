function telegramApiBase(token) {
  return `https://api.telegram.org/bot${token}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const orderId = String(req.query.order_id || "").trim();
  if (!orderId || !/^tg_[A-Za-z0-9_-]+$/.test(orderId)) {
    return res.status(400).json({ error: "Invalid order_id." });
  }

  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const env = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();

  if (!clientId || !clientSecret || !telegramBotToken || !telegramChatId) {
    return res.status(500).json({
      error: "Server payment/Telegram settings are not configured."
    });
  }

  const baseUrl = env === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

  try {
    // 1) Verify payment directly with Cashfree.
    const paymentResponse = await fetch(
      `${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
      {
        headers: {
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
          "x-api-version": "2025-01-01",
          "Accept": "application/json"
        }
      }
    );

    const payments = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error("Cashfree payment status error:", payments);
      return res.status(502).json({
        error: "Unable to verify payment with Cashfree."
      });
    }

    const success = Array.isArray(payments) && payments.some(
      p => p.payment_status === "SUCCESS"
    );

    if (!success) {
      return res.status(200).json({
        paid: false,
        message: "Payment is not confirmed yet. Please wait a few seconds and refresh."
      });
    }

    // 2) Create a unique Telegram invite link for this successful order.
    // The bot MUST be an administrator in the target group/channel.
    const expireDate = Math.floor(Date.now() / 1000) + 3600;

    const tgResponse = await fetch(
      `${telegramApiBase(telegramBotToken)}/createChatInviteLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          name: `Paid ${orderId}`.slice(0, 32),
          member_limit: 1,
          expire_date: expireDate
        })
      }
    );

    const tgData = await tgResponse.json();

    if (!tgResponse.ok || !tgData.ok || !tgData.result?.invite_link) {
      console.error("Telegram invite error:", tgData);
      return res.status(502).json({
        paid: true,
        error: "Payment succeeded, but the Telegram invite could not be created. Check that the bot is an administrator."
      });
    }

    return res.status(200).json({
      paid: true,
      telegram_url: tgData.result.invite_link
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({
      error: "Payment verification server error. Please try again."
    });
  }
};
