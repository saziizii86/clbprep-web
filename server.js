import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { Client, Databases, Query } from "node-appwrite";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3002";

const PRICE_MAP = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  bimonthly: process.env.STRIPE_PRICE_BIMONTHLY,
  quarterly: process.env.STRIPE_PRICE_QUARTERLY,
  "ai-monthly": process.env.STRIPE_PRICE_AI_MONTHLY,
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

const PLAN_DAYS = {
  monthly: 30,
  bimonthly: 60,
  quarterly: 90,
  "ai-monthly": 30,
};

function getSubscriptionEndAt(planKey, startDate = new Date()) {
  const d = new Date(startDate);
  const days = PLAN_DAYS[planKey] || 0;
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function findUserDocument({ appwriteUserId = "", email = "" }) {
  if (appwriteUserId) {
    try {
      const doc = await databases.getDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        appwriteUserId
      );
      if (doc) return doc;
    } catch (error) {
      console.log(
        "User lookup by Appwrite document id failed:",
        error?.message || error
      );
    }
  }

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  const result = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERS_COLLECTION_ID,
    [Query.equal("email", cleanEmail)]
  );

  if (!result.documents.length) return null;
  return result.documents[0];
}

async function activatePaidMembership({
  appwriteUserId = "",
  email = "",
  planKey = "",
  sessionId = "",
  customerId = "",
  stripeSubscriptionId = "",
  amountPaid = 0,
  currency = "CAD",
  paymentLast4 = "",
  paymentBrand = "",
}) {
  if (!planKey) {
    throw new Error("Missing planKey for activation.");
  }

  const userDoc = await findUserDocument({ appwriteUserId, email });
  if (!userDoc) {
    throw new Error(
      `User not found. appwriteUserId=${appwriteUserId} email=${email}`
    );
  }

  const nowIso = new Date().toISOString();

  let history = [];
  try {
    if (userDoc.transactionHistory) {
      history = JSON.parse(userDoc.transactionHistory);
    }
  } catch {
    history = [];
  }

  const alreadyExists = history.some((item) => item?.id === sessionId);

  if (!alreadyExists && sessionId) {
    history.unshift({
      id: sessionId,
      date: nowIso,
      plan: planKey,
      amount: amountPaid,
      currency,
      paymentLast4,
      paymentBrand,
      status: "paid",
      source: "stripe",
    });
  }

  await databases.updateDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERS_COLLECTION_ID,
    userDoc.$id,
    {
      subscriptionPlan: planKey,
      subscriptionStatus: "active",
      subscriptionPaidAt: nowIso,
      subscriptionStartAt: nowIso,
      subscriptionEndAt: getSubscriptionEndAt(planKey, nowIso),
      stripeCheckoutSessionId: sessionId || userDoc.stripeCheckoutSessionId || "",
      stripeSubscriptionId: stripeSubscriptionId || userDoc.stripeSubscriptionId || "",
      amountPaid: amountPaid || userDoc.amountPaid || 0,
      paymentLast4: paymentLast4 || userDoc.paymentLast4 || "",
      paymentBrand: paymentBrand || userDoc.paymentBrand || "",
      transactionHistory: JSON.stringify(history),
    }
  );

  return userDoc;
}

async function sendWelcomeEmail({ email, name, planKey }) {
  try {
    const planNames = {
      monthly: "1 Month Full Access",
      bimonthly: "2 Months Full Access",
      quarterly: "3 Months Full Access",
      "ai-monthly": "AI Skill Builder Monthly",
    };

    const planName = planNames[planKey] || planKey;
    const displayName = name || email.split("@")[0];

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CLBPrep <noreply@clbprep.com>",
        to: [email],
        subject: `🎉 Welcome to CLBPrep — ${planName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; border-radius: 16px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">🎉 You're In!</h1>
              <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">Your CLBPrep subscription is now active</p>
            </div>

            <div style="padding: 32px 0;">
              <p style="font-size: 16px; color: #374151;">Hi <strong>${displayName}</strong>,</p>
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Congratulations! You now have full access to <strong>${planName}</strong>. 
                Your CELPIP preparation journey starts now! 🚀
              </p>

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #166534; margin: 0 0 12px;">✅ What's unlocked for you:</h3>
                <ul style="color: #15803d; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>All practice scenarios across every skill</li>
                  <li>Full mock exam access</li>
                  <li>AI-powered feedback on your answers</li>
                  <li>Listening, Reading, Writing & Speaking</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://clbprep.com/userhome"
                  style="background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Start Practicing Now →
                </a>
              </div>

              <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                If you have any questions, reply to this email — we're here to help you succeed! 💪
              </p>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af;">CLBPrep · Practice Platform</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.log("Resend error:", data);
    } else {
      console.log("✅ Welcome email sent to:", email);
    }
  } catch (error) {
    console.log("Could not send welcome email:", error?.message || error);
  }
}

async function sendCancellationEmail({ email, name, endAt }) {
  try {
    const displayName = name || email.split("@")[0];
    const expiryDate = endAt
      ? new Date(endAt).toLocaleDateString("en-CA", {
          year: "numeric", month: "long", day: "numeric",
        })
      : "your billing period end date";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CLBPrep <noreply@clbprep.com>",
        to: [email],
        subject: "Your CLBPrep subscription has been cancelled",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <div style="background: linear-gradient(135deg, #6b7280, #374151); padding: 32px; border-radius: 16px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">Subscription Cancelled</h1>
              <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">We're sorry to see you go</p>
            </div>

            <div style="padding: 32px 0;">
              <p style="font-size: 16px; color: #374151;">Hi <strong>${displayName}</strong>,</p>
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                Your CLBPrep AI Builder subscription has been successfully cancelled. 
                No further charges will be made.
              </p>

              <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #92400e; margin: 0 0 12px;">⏰ You still have access until:</h3>
                <p style="color: #b45309; font-size: 18px; font-weight: bold; margin: 0;">
                  ${expiryDate}
                </p>
                <p style="color: #92400e; font-size: 14px; margin: 8px 0 0;">
                  All your features remain fully active until this date.
                </p>
              </div>

              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #374151; margin: 0 0 12px;">💡 Changed your mind?</h3>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">
                  You can resubscribe anytime from the pricing page and pick up right where you left off.
                </p>
                <div style="text-align: center;">
                  <a href="https://clbprep.com/?page=pricing"
                    style="background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px;">
                    View Plans →
                  </a>
                </div>
              </div>

              <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                If you cancelled by mistake or have any questions, just reply to this email 
                and we'll be happy to help. 😊
              </p>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af;">CLBPrep · Practice Platform</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.log("Resend cancellation email error:", data);
    } else {
      console.log("✅ Cancellation email sent to:", email);
    }
  } catch (error) {
    console.log("Could not send cancellation email:", error?.message || error);
  }
}

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log(
      "Webhook received:",
      req.headers["stripe-signature"] ? "has signature" : "NO SIGNATURE"
    );

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
      // ── One-time payment checkout completed ──────────────────
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        if (session.mode !== "payment" && session.mode !== "subscription") {
          return res.json({ received: true });
        }

        const email = (
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.email ||
          ""
        )
          .trim()
          .toLowerCase();

        const appwriteUserId = session.metadata?.appwriteUserId || "";
        const planKey = session.metadata?.planKey || "";

        if (!planKey) {
          console.error("Missing planKey in checkout.session.completed");
          return res.json({ received: true });
        }

        const amountPaid =
          typeof session.amount_total === "number"
            ? Number((session.amount_total / 100).toFixed(2))
            : 0;

        let paymentLast4 = "";
        let paymentBrand = "";

        try {
          if (session.payment_intent) {
            const piId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || "";

            if (piId) {
              const pi = await stripe.paymentIntents.retrieve(piId, {
                expand: ["payment_method"],
              });

              if (pi.payment_method && typeof pi.payment_method === "object") {
                paymentLast4 = pi.payment_method.card?.last4 || "";
                paymentBrand = pi.payment_method.card?.brand || "";
              }
            }
          }
        } catch (error) {
          console.log(
            "Could not read payment method on checkout completion:",
            error?.message || error
          );
        }

        try {
await activatePaidMembership({
  appwriteUserId,
  email,
  planKey,
  sessionId: session.id || "",
  customerId: session.customer ? String(session.customer) : "",
  stripeSubscriptionId: session.subscription ? String(session.subscription) : "",
  amountPaid,
  currency: ((session.currency || "cad") + "").toUpperCase(),
  paymentLast4,
  paymentBrand,
});

          console.log("✅ User activated:", { email, appwriteUserId, planKey });
		  void sendWelcomeEmail({ 
  email, 
  name: session.metadata?.name || "", 
  planKey 
});
        } catch (error) {
          console.error(
            "Failed to activate membership from checkout.session.completed:",
            error?.message || error
          );
        }
      }

      // ── Recurring subscription renewal ───────────────────────
      if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;

        // Only handle recurring renewals, skip the first payment
        // (first payment is already handled by checkout.session.completed)
        if (invoice.billing_reason !== "subscription_cycle") {
          return res.json({ received: true });
        }

        const email = (invoice.customer_email || "").trim().toLowerCase();
        const customerId = invoice.customer ? String(invoice.customer) : "";
        const amountPaid = Number(((invoice.amount_paid || 0) / 100).toFixed(2));
        const currency = (invoice.currency || "cad").toUpperCase();

        console.log("🔄 Subscription renewal detected for:", email);

        try {
          await activatePaidMembership({
            appwriteUserId: "",
            email,
            planKey: "ai-monthly",
            sessionId: invoice.id || "",
            customerId,
            amountPaid,
            currency,
            paymentLast4: "",
            paymentBrand: "",
          });

          console.log("✅ Subscription renewed for:", email);
        } catch (error) {
          console.error(
            "Failed to renew subscription from invoice.payment_succeeded:",
            error?.message || error
          );
        }
      }

      // ── Subscription cancelled / payment failed ───────────────
      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const customerId = subscription.customer
          ? String(subscription.customer)
          : "";

        console.log("❌ Subscription cancelled for customer:", customerId);

        try {
          // Find user by customerId and deactivate
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
                subscriptionStatus: "cancelled",
              }
            );
            console.log("✅ Subscription deactivated for:", userDoc.email);
          }
        } catch (error) {
          console.error(
            "Failed to deactivate subscription:",
            error?.message || error
          );
        }
      }

      return res.json({ received: true });
    } catch (error) {
      console.error("Webhook processing failed:", error?.message, error);
      return res.status(500).send("Webhook handler failed");
    }
  }
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Stripe server is running." });
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { planKey, email, name, appwriteUserId, isUpgrade, upgradeAmount, currentSubscriptionEndAt } = req.body;

    const isSubscription = planKey === "ai-monthly";
    const isAIOnly = planKey === "ai-monthly";

    let sessionParams;

    if (isUpgrade && upgradeAmount) {
      // Charge only the difference using inline price_data
      sessionParams = {
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "cad",
            product_data: {
              name: `CLBPrep Upgrade to ${planKey === "monthly" ? "1 Month" : planKey === "bimonthly" ? "2 Months" : "3 Months"} Full Access`,
              description: "Upgrade from AI Builder — pay only the difference",
            },
            unit_amount: Math.round(upgradeAmount * 100), // in cents
          },
          quantity: 1,
        }],
        customer_email: email || undefined,
        automatic_tax: { enabled: true },
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        success_url: `${FRONTEND_URL}/userhome?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/?page=pricing`,
        metadata: {
          planKey,
          email: email || "",
          name: name || "",
          appwriteUserId: appwriteUserId || "",
          isUpgrade: "true",
          currentSubscriptionEndAt: currentSubscriptionEndAt || "",
        },
      };
    } else {
      const priceId = PRICE_MAP[planKey];
      if (!priceId) {
        return res.status(400).json({ error: "Invalid plan key." });
      }

      sessionParams = {
        mode: isSubscription ? "subscription" : "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email || undefined,
        automatic_tax: { enabled: true },
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        success_url: `${FRONTEND_URL}/userhome?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/?page=pricing`,
        metadata: {
          planKey,
          email: email || "",
          name: name || "",
          appwriteUserId: appwriteUserId || "",
          isUpgrade: "false",
          currentSubscriptionEndAt: "",
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to create session.",
    });
  }
});

app.get("/checkout-session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing session id." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.payment_method", "line_items.data.price"],
    });

if (session.mode !== "payment" && session.mode !== "subscription") {
  return res.json({ received: true });
}

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        error: "Checkout session is not paid yet.",
        paymentStatus: session.payment_status,
      });
    }

    const email = (
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.email ||
      ""
    )
      .trim()
      .toLowerCase();

    const appwriteUserId = session.metadata?.appwriteUserId || "";

    const planKey =
      session.metadata?.planKey ||
      planKeyFromPriceId(session.line_items?.data?.[0]?.price?.id || "");

    if (!planKey) {
      return res.status(400).json({
        error: "Could not determine planKey from session.",
      });
    }

    const paymentMethod =
      session.payment_intent &&
      typeof session.payment_intent === "object" &&
      session.payment_intent.payment_method &&
      typeof session.payment_intent.payment_method === "object"
        ? session.payment_intent.payment_method
        : null;

    const paymentLast4 = paymentMethod?.card?.last4 || "";
    const paymentBrand = paymentMethod?.card?.brand || "";

    await activatePaidMembership({
      appwriteUserId,
      email,
      planKey,
      sessionId: session.id || "",
      customerId: session.customer ? String(session.customer) : "",
      amountPaid: Number(((session.amount_total || 0) / 100).toFixed(2)),
      currency: ((session.currency || "cad") + "").toUpperCase(),
      paymentLast4,
      paymentBrand,
    });

    return res.json({
      ok: true,
      planKey,
      paymentStatus: session.payment_status,
    });
  } catch (error) {
    console.error("checkout-session verify error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to verify checkout session.",
    });
  }
});

app.post("/cancel-subscription", async (req, res) => {
  try {
    const { appwriteUserId, email } = req.body;

    // Find the user in Appwrite
    const userDoc = await findUserDocument({ appwriteUserId, email });
    if (!userDoc) {
      return res.status(404).json({ error: "User not found." });
    }

    const stripeSubscriptionId = userDoc.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      return res.status(400).json({ error: "No active subscription found." });
    }

    // Tell Stripe to cancel at period end (no immediate cancellation)
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Mark in Appwrite that cancellation is pending
    await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_USERS_COLLECTION_ID,
      userDoc.$id,
      {
        subscriptionStatus: "cancelling",
      }
    );

console.log("✅ Subscription set to cancel at period end for:", email);

void sendCancellationEmail({
  email: userDoc.email || email,
  name: userDoc.name || "",
  endAt: userDoc.subscriptionEndAt || null,
});

return res.json({ ok: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to cancel subscription.",
    });
  }
});

app.listen(process.env.PORT || 4242, () => {
  console.log(
    `Stripe server running on http://localhost:${process.env.PORT || 4242}`
  );
});