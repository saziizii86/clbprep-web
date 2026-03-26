import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { Client, Databases, Query } from "node-appwrite";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  bimonthly: process.env.STRIPE_PRICE_BIMONTHLY,
  quarterly: process.env.STRIPE_PRICE_QUARTERLY,
};

function planKeyFromPriceId(priceId) {
  for (const [key, val] of Object.entries(PRICE_MAP)) {
    if (val && val === priceId) return key;
  }
  return "";
}

const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(appwriteClient);

function getSubscriptionEndAt(planKey) {
  const now = new Date();
  if (planKey === "monthly") now.setMonth(now.getMonth() + 1);
  else if (planKey === "bimonthly") now.setMonth(now.getMonth() + 2);  // ← ADD THIS
  else if (planKey === "quarterly") now.setMonth(now.getMonth() + 3);
  return now.toISOString();
}

async function findUserByEmail(email) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const result = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERS_COLLECTION_ID,
    [Query.equal("email", cleanEmail)]
  );
  if (!result.documents.length) return null;
  return result.documents[0];
}

app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  console.log("Webhook received:", req.headers["stripe-signature"] ? "has signature" : "NO SIGNATURE");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {

    // ── EVENT 1: checkout.session.completed ──────────────────────────
    // Fires FIRST. Upgrades user to Pro immediately.
    // No card details yet — that comes from invoice.paid.
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode !== "payment") return res.json({ received: true });

      const email = (
        session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email || ""
      ).trim().toLowerCase();

      const planKey = session.metadata?.planKey || "";

      if (!email || !planKey) {
        console.error("Missing email or planKey:", { email, planKey });
        return res.json({ received: true });
      }

      console.log("checkout.session.completed — email:", email, "planKey:", planKey);

      const userDoc = await findUserByEmail(email);
      if (!userDoc) {
        console.error("User not found:", email);
        return res.json({ received: true });
      }

      const nowIso = new Date().toISOString();

      await databases.updateDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        userDoc.$id,
{
  subscriptionPlan: planKey,
  subscriptionStatus: "active",
  subscriptionPaidAt: nowIso,
  subscriptionStartAt: nowIso,
  subscriptionEndAt: getSubscriptionEndAt(planKey),
  stripeCheckoutSessionId: session.id || "",
  stripeCustomerId: session.customer ? String(session.customer) : "",
}
      );

      console.log("✅ User upgraded to Pro:", email, planKey);
    }

    // ── EVENT 2: invoice.paid ─────────────────────────────────────────
    // Fires AFTER checkout.session.completed.
    // Adds transaction history + card details.
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;

      const isFirstPayment =
        invoice.billing_reason === "subscription_create" ||
        invoice.billing_reason === "manual";

      if (!isFirstPayment) {
        console.log("Skipping renewal invoice:", invoice.billing_reason);
        return res.json({ received: true });
      }

      const email = (
        invoice.customer_email ||
        invoice.customer_details?.email || ""
      ).trim().toLowerCase();

      if (!email) {
        console.error("No email in invoice.paid");
        return res.json({ received: true });
      }

      // Get planKey from subscription — fall back to price ID map
      let planKey = "";
      try {
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(invoice.subscription));
          planKey = sub.metadata?.planKey || planKeyFromPriceId(sub.items?.data?.[0]?.price?.id || "");
        }
      } catch (e) {
        console.log("Could not get planKey:", e.message);
      }

      console.log("invoice.paid — email:", email, "planKey:", planKey || "(unknown)");

      const userDoc = await findUserByEmail(email);
      if (!userDoc) {
        console.error("User not found:", email);
        return res.json({ received: true });
      }

      const nowIso = new Date().toISOString();
      const amountPaid = Math.round((invoice.amount_paid || 0) / 100);

      // Get card details (charge is guaranteed available here)
// ✅ AFTER — checks charge first, then falls back to payment_intent:
let paymentLast4 = "";
let paymentBrand = "";
try {
  // Try charge first
  const chargeId = typeof invoice.charge === "string"
    ? invoice.charge : invoice.charge?.id || null;
  if (chargeId) {
    const charge = await stripe.charges.retrieve(chargeId);
    paymentLast4 = charge.payment_method_details?.card?.last4 || "";
    paymentBrand = charge.payment_method_details?.card?.brand || "";
  }
} catch (e) {
  console.log("Could not fetch charge (non-fatal):", e.message);
}

// Fallback: get card details from payment_intent (common in test mode)
if (!paymentLast4 && invoice.payment_intent) {
  try {
    const piId = typeof invoice.payment_intent === "string"
      ? invoice.payment_intent : invoice.payment_intent?.id || "";
    if (piId) {
      const pi = await stripe.paymentIntents.retrieve(piId, {
        expand: ["payment_method"],
      });
      if (pi.payment_method && typeof pi.payment_method === "object") {
        paymentLast4 = pi.payment_method.card?.last4 || "";
        paymentBrand = pi.payment_method.card?.brand || "";
      }
    }
  } catch (e) {
    console.log("Could not fetch payment_intent card details (non-fatal):", e.message);
  }
}

console.log("Card details — last4:", paymentLast4 || "(none)", "brand:", paymentBrand || "(none)");

      const stripeCustomerId = typeof invoice.customer === "string"
        ? invoice.customer : invoice.customer?.id || "";
      const stripeSubscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription : invoice.subscription?.id || "";

      const newTransaction = {
        id: invoice.id || "",
        date: nowIso,
        plan: planKey || userDoc.subscriptionPlan || "unknown",
        amount: amountPaid,
        currency: (invoice.currency || "cad").toUpperCase(),
        paymentLast4,
        paymentBrand,
        status: "paid",
      };

      let history = [];
      try {
        if (userDoc.transactionHistory) history = JSON.parse(userDoc.transactionHistory);
      } catch { history = []; }
      history.unshift(newTransaction);

      const updatePayload = {
        amountPaid,
        paymentLast4,
        paymentBrand,
        stripeCustomerId,
        stripeSubscriptionId,
        transactionHistory: JSON.stringify(history),
      };
      // Only overwrite plan/dates if we know planKey (avoid clobbering checkout.session.completed data)
      if (planKey) {
        updatePayload.subscriptionPlan = planKey;
        updatePayload.subscriptionStatus = "active";
        updatePayload.subscriptionEndAt = getSubscriptionEndAt(planKey);
      }

      await databases.updateDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        userDoc.$id,
        updatePayload
      );

      console.log("✅ Transaction saved:", email, amountPaid, "last4:", paymentLast4);
    }

    // ── EVENT 3: customer.subscription.deleted ────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerId = String(subscription.customer || "");
      const result = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        [Query.equal("stripeCustomerId", customerId)]
      );
      if (result.documents.length) {
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_USERS_COLLECTION_ID,
          result.documents[0].$id,
          { subscriptionStatus: "inactive" }
        );
        console.log("Subscription marked inactive:", customerId);
      }
    }

    return res.json({ received: true });

  } catch (error) {
    console.error("Webhook processing failed:", error?.message, error);
    return res.status(500).send("Webhook handler failed");
  }
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { planKey, email, name, appwriteUserId } = req.body;
    const priceId = PRICE_MAP[planKey];
    if (!priceId) return res.status(400).json({ error: "Invalid plan key." });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${process.env.FRONTEND_URL}/userhome?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/?page=pricing`,
      metadata: { planKey, email: email || "", name: name || "", appwriteUserId: appwriteUserId || "" },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    return res.status(500).json({ error: error?.message || "Failed to create session." });
  }
});

app.listen(process.env.PORT || 4242, () => {
  console.log(`Stripe server running on http://localhost:${process.env.PORT || 4242}`);
});