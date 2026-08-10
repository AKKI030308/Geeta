const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const env = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();
  const amount = Number(process.env.PRODUCT_AMOUNT || "9");
  const siteUrl = process.env.SITE_URL;

  if (!clientId || !clientSecret || !siteUrl) {
    return res.status(500).json({ error: "Cashfree/server environment variables are not configured." });
  }

  const baseUrl = env === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

  const orderId = `tg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": "2025-01-01",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: `guest_${crypto.randomBytes(6).toString("hex")}`,
          customer_phone: "9999999999"
        },
        order_meta: {
          return_url: `${siteUrl}/payment-success.html?order_id={order_id}`
        },
        order_note: "Premium Telegram Access"
      })
    });

    const data = await response.json();

    if (!response.ok || !data.payment_session_id) {
      console.error("Cashfree create order error:", data);
      return res.status(response.status || 500).json({
        error: data.message || data.type || "Unable to create Cashfree order."
      });
    }

    return res.status(200).json({
      payment_session_id: data.payment_session_id,
      order_id: orderId,
      mode: env === "production" ? "production" : "sandbox"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Payment server error." });
  }
};
