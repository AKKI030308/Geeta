module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const orderId = String(req.query.order_id || "").trim();

  if (!orderId) {
    return res.status(400).json({
      error: "Missing order_id"
    });
  }

  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const telegramLink = process.env.TELEGRAM_INVITE_LINK;

  const env = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();

  if (!clientId || !clientSecret || !telegramLink) {
    return res.status(500).json({
      error: "Cashfree or Telegram environment variables are not configured."
    });
  }

  const baseUrl =
    env === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

  try {
    const response = await fetch(
      `${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
      {
        method: "GET",
        headers: {
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
          "x-api-version": "2025-01-01",
          "Accept": "application/json"
        }
      }
    );

    const payments = await response.json();

    if (!response.ok) {
      console.error("Cashfree error:", payments);

      return res.status(502).json({
        error: "Unable to verify payment."
      });
    }

    const success = Array.isArray(payments) &&
      payments.some(
        payment => payment.payment_status === "SUCCESS"
      );

    if (!success) {
      return res.status(200).json({
        paid: false,
        message: "Payment is not confirmed yet."
      });
    }

    // Payment confirmed → send fixed Telegram invite link
    return res.status(200).json({
      paid: true,
      telegram_url: telegramLink
    });

  } catch (error) {
    console.error("Verification error:", error);

    return res.status(500).json({
      error: "Payment verification failed."
    });
  }
};
