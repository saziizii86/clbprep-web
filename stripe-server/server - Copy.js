import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { Client, Databases, Query } from "node-appwrite";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  weekly: process.env.STRIPE_PRICE_WEEKLY,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  quarterly: process.env.STRIPE_PRICE_QUARTERLY,
};

// ---------------- Appwrite server client ----------------
const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(appwriteClient);

// ---------------- Helper functions ----------------
function getSubscriptionEndAt(planKey) {
  const now = new Date();

  if (planKey === "weekly") {
    now.setDate(now.getDate() + 7);
  } else if (planKey === "monthly") {
    now.setMonth(now.getMonth() + 1);
  } else if (planKey === "quarterly") {
    now.setMonth(now.getMonth() + 3);
  }

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

// ---------------- Stripe webhook ----------------
// IMPORTANT: this must come BEFORE express.json()
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  console.log("📩 Webhook received:", req.headers["stripe-signature"] ? "has signature" : "NO SIGNATURE");
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email ||
        "";

      const planKey = session.metadata?.planKey || "";
      const appwriteUserId = session.metadata?.appwriteUserId || "";

      if (!email || !planKey) {
        console.error("Missing email or planKey in checkout.session.completed");
        return res.json({ received: true });
      }

console.log("🔍 Looking up email:", email, "planKey:", planKey);

      const userDoc = await findUserByEmail(email);

      if (!userDoc) {
        console.error("❌ User not found in Appwrite for email:", email);
        return res.json({ received: true });
      }

      console.log("✅ Found user doc:", userDoc.$id);

const nowIso = new Date().toISOString();
      const endAtIso = getSubscriptionEndAt(planKey);

      // Fetch payment method details from Stripe
// Fetch payment method details from Stripe
// ✅ AFTER — payment method is fully isolated, never blocks the save:
let paymentLast4 = "";
let paymentBrand = "";
let amountPaid = 0;

try {
  if (session.payment_intent) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      String(session.payment_intent),
      { expand: ["payment_method"] }
    );
    const pm = paymentIntent.payment_method;
    paymentLast4 = pm?.card?.last4 || "";
    paymentBrand = pm?.card?.brand || "";
    amountPaid = Math.round((paymentIntent.amount_received || 0) / 100);
  } else if (session.invoice) {
    const invoice = await stripe.invoices.retrieve(String(session.invoice));
    amountPaid = Math.round((invoice.amount_paid || 0) / 100);

    // Safely get charge ID (may be string or object)
    const chargeId = typeof invoice.charge === "string"
      ? invoice.charge
      : invoice.charge?.id || null;

    if (chargeId) {
      try {
        const charge = await stripe.charges.retrieve(chargeId);
        paymentLast4 = charge.payment_method_details?.card?.last4 || "";
        paymentBrand = charge.payment_method_details?.card?.brand || "";
      } catch (_) { /* charge not ready yet — that's fine */ }
    }

    // Fallback: payment_intent's payment_method
    if (!paymentLast4 && invoice.payment_intent) {
      try {
        const piId = typeof invoice.payment_intent === "object"
          ? invoice.payment_intent.id
          : invoice.payment_intent;
        const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["payment_method"] });
        if (pi.payment_method && typeof pi.payment_method === "object") {
          paymentLast4 = pi.payment_method.card?.last4 || "";
          paymentBrand = pi.payment_method.card?.brand || "";
        }
      } catch (_) { /* non-fatal */ }
    }
  }
} catch (pmError) {
  // Non-fatal — subscription is still saved, just without card details
  console.log("⚠️ Could not fetch payment details (non-fatal):", pmError.message);
}

// ✅ updateDocument ALWAYS runs now, regardless of payment detail fetch outcome

      console.log("📝 Attempting updateDocument for user:", userDoc.$id, "plan:", planKey);

console.log("📝 Attempting updateDocument for user:", userDoc.$id, "plan:", planKey);

      // Build new transaction entry
      const newTransaction = {
        id: session.id || "",
        date: nowIso,
        plan: planKey,
        amount: amountPaid,
        currency: "CAD",
        paymentLast4: paymentLast4,
        paymentBrand: paymentBrand,
        status: "paid",
      };

      // Append to existing transaction history
      let history = [];
      try {
        const existing = userDoc.transactionHistory;
        if (existing) history = JSON.parse(existing);
      } catch { history = []; }
      history.unshift(newTransaction); // newest first

      await databases.updateDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        userDoc.$id,
        {
          subscriptionPlan: planKey,
          subscriptionStatus: "active",
          subscriptionPaidAt: nowIso,
          subscriptionStartAt: nowIso,
          subscriptionEndAt: endAtIso,
          stripeCheckoutSessionId: session.id || "",
          stripeCustomerId: session.customer ? String(session.customer) : "",
          stripeSubscriptionId: session.subscription ? String(session.subscription) : "",
          amountPaid: amountPaid,
          paymentLast4: paymentLast4,
          paymentBrand: paymentBrand,
          transactionHistory: JSON.stringify(history),
        }
      );

      console.log("✅ User upgraded to Pro:", email, planKey);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerId = String(subscription.customer || "");

      const result = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        [Query.equal("stripeCustomerId", customerId)]
      );

      if (result.documents.length) {
        const userDoc = result.documents[0];

        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_USERS_COLLECTION_ID,
          userDoc.$id,
          {
            subscriptionStatus: "inactive",
          }
        );

        console.log("⚠️ Subscription marked inactive:", customerId);
      }
    }

    return res.json({ received: true });
} catch (error) {
    console.error("❌ Webhook processing failed:");
    console.error("  message:", error?.message);
    console.error("  code:", error?.code);
    console.error("  type:", error?.type);
    console.error("  response:", JSON.stringify(error?.response?.data || error?.response || ""));
    console.error("  full:", error);
    return res.status(500).send("Webhook handler failed");
  }
});

// ---------------- Normal middleware for other routes ----------------
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

// ---------------- Checkout session route ----------------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { planKey, email, name, appwriteUserId } = req.body;

    const priceId = PRICE_MAP[planKey];

    if (!priceId) {
      return res.status(400).json({ error: "Invalid plan key." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: `${process.env.FRONTEND_URL}/userhome?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/?page=pricing`,
      metadata: {
        planKey,
        email: email || "",
        name: name || "",
        appwriteUserId: appwriteUserId || "",
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to create Stripe Checkout session.",
    });
  }
});

app.listen(process.env.PORT || 4242, () => {
  console.log(`Stripe server running on http://localhost:${process.env.PORT || 4242}`);
});