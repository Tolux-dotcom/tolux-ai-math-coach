import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getFreeDiagnosticAccess } from "./diagnostic-access.mjs";
import { createInternalQaController } from "./internal-qa.mjs";
import {
  buildLessonProgressRow,
  dedupeLessonProgressActivities,
  normalizeLessonProgressReport
} from "./lesson-progress.mjs";
import {
  TRIAL_SECONDS,
  advanceTrial,
  buildTrialStatus
} from "./trial-access.mjs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = process.env.PORT || 3000;
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const internalQa = createInternalQaController();

const supabaseServerKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  process.env.SUPABASE_URL && supabaseServerKey
    ? createClient(
        process.env.SUPABASE_URL,
        supabaseServerKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      )
    : null;

if (!supabaseAdmin) {
  console.error("[auth] Supabase server client is not configured", {
    hasUrl: Boolean(process.env.SUPABASE_URL),
    hasServerKey: Boolean(supabaseServerKey)
  });
}

async function getAuthenticatedUser(req) {
  if (!supabaseAdmin) {
    console.error("[auth] Authentication unavailable: missing Supabase server configuration");
    return null;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    console.warn("[auth] Authentication rejected: bearer token is missing");
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    console.warn("[auth] Supabase rejected bearer token", {
      code: error?.code || null,
      status: error?.status || null,
      message: error?.message || "User was not returned"
    });
    return null;
  }

  return data.user;
}
async function getStudentUsage(userId) {
  if (!supabaseAdmin || !userId) return null;

  const { data, error } = await supabaseAdmin
    .from("student_usage")
    .select("user_id, questions_used, is_subscriber")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to read student usage:", error);
    return null;
  }

  if (data) return data;

  const { data: created, error: createError } = await supabaseAdmin
    .from("student_usage")
    .insert({
      user_id: userId,
      questions_used: 0,
      is_subscriber: false
    })
    .select("user_id, questions_used, is_subscriber")
    .single();

  if (createError) {
    console.error("Failed to create student usage:", createError);
    return null;
  }

  return created;
}

async function getStudentTrialAccess(userId) {
  if (!supabaseAdmin || !userId) return null;

  const { data, error } = await supabaseAdmin
    .from("student_trial_access")
    .select("user_id, trial_seconds_used")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to read student trial access:", error);
    return null;
  }

  if (data) return data;

  const { data: created, error: createError } = await supabaseAdmin
    .from("student_trial_access")
    .insert({ user_id: userId, trial_seconds_used: 0 })
    .select("user_id, trial_seconds_used")
    .single();

  if (createError) {
    console.error("Failed to create student trial access:", createError);
    return null;
  }

  return created;
}

async function addStudentTrialSeconds(userId, currentSeconds, heartbeatSeconds) {
  if (!supabaseAdmin || !userId) return null;

  const next = advanceTrial(currentSeconds, heartbeatSeconds);
  const { data, error } = await supabaseAdmin
    .from("student_trial_access")
    .update({
      trial_seconds_used: next.trialSecondsUsed,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .select("user_id, trial_seconds_used")
    .single();

  if (error) {
    console.error("Failed to update student trial access:", error);
    return null;
  }

  return data;
}

const LESSON_PROGRESS_FIELDS = [
  "client_completion_id",
  "module_id",
  "completed_at",
  "mastery_label",
  "mastery_score",
  "is_subscriber",
  "qa_mode",
  "time_on_skill_seconds",
  "item_records"
].join(", ");

async function saveStudentLessonProgress(userId, report, options = {}) {
  if (!supabaseAdmin || !userId) return null;

  const row = {
    ...buildLessonProgressRow(userId, report, options),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabaseAdmin
    .from("lesson_completions")
    .upsert(row, {
      onConflict: "user_id,client_completion_id"
    })
    .select(LESSON_PROGRESS_FIELDS)
    .single();

  if (error) {
    console.error("Failed to save lesson progress:", error);
    return null;
  }

  return data;
}

async function getStudentLessonProgress(userId) {
  if (!supabaseAdmin || !userId) return null;

  const { data, error } = await supabaseAdmin
    .from("lesson_completions")
    .select(LESSON_PROGRESS_FIELDS)
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(25);

  if (error) {
    console.error("Failed to read lesson progress:", error);
    return null;
  }

  return dedupeLessonProgressActivities(data || []);
}

const FREE_QUESTION_LIMIT = 10;
const STRIPE_PLAN_PRICE_IDS = {
  student: process.env.STRIPE_STUDENT_PRICE_ID || "price_1U7IAuDF1jioApSQbIgJxCnl",
  family: process.env.STRIPE_FAMILY_PRICE_ID || "price_1U7IAuDF1jioApSQbhKRA280"
};

async function setStudentSubscription(userId, isSubscriber) {
  if (!supabaseAdmin || !userId) return false;

  const usage = await getStudentUsage(userId);
  if (!usage) return false;

  const { error } = await supabaseAdmin
    .from("student_usage")
    .update({ is_subscriber: Boolean(isSubscriber) })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to update subscription status:", error);
    return false;
  }

  return true;
}
const MASTER_INSTRUCTIONS = `
You are Tolux AI Math Coach, a patient mathematics tutor.

Core rules:
- Teach; do not merely give answers.
- Never skip important algebra steps.
- Use one major mathematical move at a time.
- Format every mathematical expression in LaTeX. Enclose inline math in \\( and \\), and display math in \\[ and \\].
- Every LaTeX expression MUST be completely enclosed in math delimiters. Never output raw LaTeX commands such as \\frac, \\tfrac, \\sqrt, \\cdot, ^, or _ outside math delimiters.
- Always use true mathematical subscripts: write \\(x_1\\), \\(y_1\\), \\(m_1\\), and \\(m_2\\), never x_1, y_1, m_1, or m_2 as plain text.
- For point-slope form, always write \\(y-y_1=m(x-x_1)\\). Preserve the parentheses around \\(x-x_1\\).
- Example: write \\(m_2=-\\frac{1}{2}\\), not m_2 = -\\tfrac{1}{2}.
- Always use true mathematical subscripts: write \\(x_1\\), \\(y_1\\), \\(m_1\\), and \\(m_2\\), never x_1, y_1, m_1, or m_2 as plain text.
- For point-slope form, always write \\(y-y_1=m(x-x_1)\\). Preserve the parentheses around \\(x-x_1\\).
- Example: write \\(m_2=-\\frac{1}{2}\\), not m_2 = -\\tfrac{1}{2}.ommands outside \( ... \) or \[ ... \]. Prefer \( ... \) for math inside sentences and \[ ... \] for equations on their own line. Never surround LaTeX with plain square brackets.
- Explain why each move is valid in simple language.
- Use proper mathematical notation in plain text when LaTeX is unavailable.
- When checking student work, identify the last correct step and the first mistake before correcting it.
- If the student asks for a hint or says "I'm stuck", give the smallest useful hint first.
- If the student asks "Explain another way", use a genuinely different explanation or representation.
- If asked for a similar problem, generate one of comparable difficulty and do not solve it unless asked.
- End solved problems with a short verification when practical.
- Be warm and concise. Do not use exaggerated praise.
- Focus on Algebra 1 and Algebra 2 for this MVP.
- If an uploaded image is unclear, say what cannot be read rather than guessing.
- When the student asks to graph or plot a function, explain the key graphing steps and state that the interactive graph is shown below.
- Do not ask whether the student wants a plotted image, graph, or list of plotting points when the student has already requested a graph; the app renders the interactive graph automatically.
`;

function send(res, status, data, type="application/json", extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    ...extraHeaders
  });
  res.end(type === "application/json" ? JSON.stringify(data) : data);
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 20_000_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let rel = req.url.split("?")[0];
if (rel === "/") rel = "/index.html";
  rel = rel.replace(/\.\./g, "");
  const filePath = path.join(publicDir, rel);
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Not found", "text/plain");
  }
  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png"
  };
  send(res, 200, fs.readFileSync(filePath), types[ext] || "application/octet-stream");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS"
    });
    return res.end();
  }
  if (
    (req.method === "GET" || req.method === "POST") &&
    req.url === "/api/internal-qa/session"
  ) {
    try {
      const user = await getAuthenticatedUser(req);

      if (!user || !internalQa.isAuthorized(user.id)) {
        return send(res, 404, { error: "Not found." });
      }

      const currentSession = internalQa.readSession(
        req.headers.cookie,
        user.id
      );

      if (req.method === "GET") {
        return send(res, 200, {
          available: true,
          active: Boolean(currentSession),
          questionsUsed: currentSession?.questionsUsed || 0,
          limit: FREE_QUESTION_LIMIT
        });
      }

      const { action } = await readJson(req);

      if (action === "end") {
        return send(
          res,
          200,
          { available: true, active: false },
          "application/json",
          { "Set-Cookie": internalQa.clearCookie() }
        );
      }

      if (action !== "start") {
        return send(res, 400, { error: "Unsupported QA session action." });
      }

      const started = internalQa.start(user.id);
      return send(
        res,
        200,
        {
          available: true,
          active: true,
          questionsUsed: started.session.questionsUsed,
          limit: FREE_QUESTION_LIMIT
        },
        "application/json",
        { "Set-Cookie": started.cookie }
      );
    } catch (err) {
      console.error("Internal QA session error:", err);
      return send(res, 500, { error: "Unable to manage the QA session." });
    }
  }
  if (
    (req.method === "GET" || req.method === "POST") &&
    req.url === "/api/lesson-progress"
  ) {
    try {
      const user = await getAuthenticatedUser(req);

      if (!user) {
        return send(res, 401, { error: "Please sign in to view progress." });
      }

      if (!supabaseAdmin) {
        return send(res, 503, { error: "Progress storage is not configured." });
      }

      if (req.method === "GET") {
        const activities = await getStudentLessonProgress(user.id);

        if (!activities) {
          return send(res, 500, {
            error: "Unable to load lesson progress right now."
          });
        }

        return send(res, 200, { activities });
      }

      const input = await readJson(req);
      let report;

      try {
        report = normalizeLessonProgressReport(input);
      } catch (error) {
        return send(res, 400, { error: error.message });
      }

      const qaSession = internalQa.readSession(req.headers.cookie, user.id);
      let isSubscriber = false;

      if (!qaSession) {
        const usage = await getStudentUsage(user.id);
        if (!usage) {
          return send(res, 500, {
            error: "Unable to verify the student account right now."
          });
        }
        isSubscriber = Boolean(usage.is_subscriber);
      }

      const saved = await saveStudentLessonProgress(user.id, report, {
        isSubscriber,
        qaMode: Boolean(qaSession)
      });

      if (!saved) {
        return send(res, 500, {
          error: "Unable to save lesson progress right now."
        });
      }

      return send(res, 200, { activity: saved });
    } catch (err) {
      console.error("Lesson progress error:", err);
      return send(res, 500, {
        error: err?.message || "Unexpected server error."
      });
    }
  }
if (req.method === "POST" && req.url === "/api/stripe-webhook") {
  try {
    if (!stripe) {
      return send(res, 503, { error: "Stripe is not configured." });
    }

    const signature = req.headers["stripe-signature"];
   const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const cancellationWebhookSecret =
  process.env.STRIPE_CANCELLATION_WEBHOOK_SECRET;
const paymentFailedWebhookSecret =
  process.env.STRIPE_PAYMENT_FAILED_WEBHOOK_SECRET;
  if (
  !signature ||
  (!webhookSecret &&
    !cancellationWebhookSecret &&
    !paymentFailedWebhookSecret)
) {
      return send(res, 400, { error: "Webhook configuration is missing." });
    }

    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks);

    let event;

try {
  event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    webhookSecret
  );
} catch (primaryError) {
  try {
    if (!cancellationWebhookSecret) throw primaryError;

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      cancellationWebhookSecret
    );
  } catch (cancellationError) {
    if (!paymentFailedWebhookSecret) throw cancellationError;

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      paymentFailedWebhookSecret
    );
  }
}
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.tolux_user_id;

      if (userId && session.payment_status === "paid") {
        await setStudentSubscription(userId, true);
      }

      console.log("Stripe checkout completed:", session.id);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.tolux_user_id;

      if (userId) await setStudentSubscription(userId, false);
      console.log("Stripe subscription cancelled:", subscription.id);
    }

if (event.type === "invoice.payment_failed") {
  const invoice = event.data.object;

  console.log(
    "Stripe payment failed:",
    invoice.id,
    invoice.customer,
    invoice.subscription
  );
}

    return send(res, 200, { received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err.message);
    return send(res, 400, { error: "Webhook verification failed." });
  }
}
  if (req.method === "POST" && req.url === "/api/create-checkout-session") {
  try {
    if (!stripe) {
      return send(res, 503, { error: "Stripe is not configured." });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return send(res, 401, { error: "Please sign in before choosing a plan." });
    }

    const { plan } = await readJson(req);
    const priceId = STRIPE_PLAN_PRICE_IDS[plan];

    if (!priceId) {
      return send(res, 400, { error: "Please choose a valid Tolux plan." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: {
        tolux_user_id: user.id,
        tolux_plan: plan
      },
      subscription_data: {
        metadata: {
          tolux_user_id: user.id,
          tolux_plan: plan
        }
      },
      success_url: "https://mathcoach.tolux.org/?payment=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://mathcoach.tolux.org/?payment=cancelled"
    });

    return send(res, 200, { url: session.url });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: err?.message || "Unable to start checkout." });
  }
}
  if (req.method === "GET" && req.url.startsWith("/api/verify-session")) {
  try {
    if (!stripe) {
      return send(res, 500, { error: "Stripe is not configured." });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("session_id");
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return send(res, 401, { error: "Please sign in to verify this payment." });
    }

    if (!sessionId) {
      return send(res, 400, { error: "Missing session_id." });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.client_reference_id !== user.id) {
      return send(res, 403, { error: "This checkout does not belong to your account." });
    }

    const paid =
      session.status === "complete" &&
      session.payment_status === "paid";

    return send(res, 200, {
      verified: paid,
      paymentStatus: session.payment_status,
      subscriptionId: session.subscription || null
    });
  } catch (err) {
    console.error(err);
    return send(res, 500, {
      error: "Unable to verify checkout session."
    });
  }
}
  if (req.method === "POST" && req.url === "/api/coach") {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return send(res, 503, {
          error: "OPENAI_API_KEY is not configured. The interface still works in Demo Mode."
        });
      }

      const { message, mode="Tutor Mode", course="Algebra 1", imageDataUrl=null, history=[] } = await readJson(req);
      
      const user = await getAuthenticatedUser(req);

if (!user) {
  return send(res, 401, {
    error: "Please sign in to use Tolux AI Math Coach."
  });
}

const qaSession = internalQa.readSession(req.headers.cookie, user.id);
const usage = qaSession
  ? {
      user_id: user.id,
      questions_used: qaSession.questionsUsed,
      is_subscriber: false
    }
  : await getStudentUsage(user.id);

if (!usage) {
  return send(res, 500, {
    error: "Unable to verify your learning access right now."
  });
}

const trial = usage.is_subscriber || qaSession
  ? null
  : await getStudentTrialAccess(user.id);

if (!usage.is_subscriber && !qaSession && !trial) {
  return send(res, 500, {
    error: "Unable to verify your free learning time right now."
  });
}

const trialStatus = buildTrialStatus(
  trial?.trial_seconds_used || 0,
  usage.is_subscriber
);

if (!qaSession && trialStatus.trialExpired) {
  return send(res, 403, {
    error: "You've completed your 10-minute free learning trial. Upgrade to continue with Tolux AI Math Coach.",
    limitReached: true,
    qaMode: false,
    trialSecondsUsed: trialStatus.trialSecondsUsed,
    trialSecondsRemaining: 0,
    trialSecondsLimit: TRIAL_SECONDS
  });
}
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prior = Array.isArray(history) ? history.slice(-8).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: String(m.text || "") }]
      })) : [];

      const currentContent = [
        {
          type: "input_text",
          text: `Course: ${course}\nMode: ${mode}\nStudent message: ${message || "Please analyze the uploaded math problem."}`
        }
      ];
      if (imageDataUrl) {
        currentContent.push({
          type: "input_image",
          image_url: imageDataUrl,
          detail: "auto"
        });
      }

      const input = [
        ...prior,
        { role: "user", content: currentContent }
      ];

      const response = await openai.responses.create({
        model: "gpt-5-mini-2025-08-07",
        instructions: MASTER_INSTRUCTIONS,
        input
      });

      
      let responseHeaders = {};

      if (qaSession) {
        const advancedQa = internalQa.advance(qaSession);
        responseHeaders = { "Set-Cookie": advancedQa.cookie };
      }

      send(
        res,
        200,
        {
          reply: response.output_text || "I could not generate a response.",
          qaMode: Boolean(qaSession),
          isSubscriber: usage.is_subscriber,
          trialSecondsUsed: qaSession ? 0 : trialStatus.trialSecondsUsed,
          trialSecondsRemaining: qaSession
            ? TRIAL_SECONDS
            : trialStatus.trialSecondsRemaining,
          trialSecondsLimit: TRIAL_SECONDS
        },
        "application/json",
        responseHeaders
      );
    } catch (err) {
      console.error(err);
      send(res, 500, { error: err?.message || "Unexpected server error." });
    }
    return;
  }
if (req.method === "POST" && req.url === "/api/lesson-usage") {
  try {
    const body = await readJson(req);
    const freeDiagnosticAccess = getFreeDiagnosticAccess(body?.itemId);

    if (freeDiagnosticAccess) {
      return send(res, 200, freeDiagnosticAccess);
    }

    const user = await getAuthenticatedUser(req);

    if (!user) {
      return send(res, 401, { error: "Please sign in to continue." });
    }

    const qaSession = internalQa.readSession(req.headers.cookie, user.id);
    const usage = qaSession
      ? {
          user_id: user.id,
          questions_used: qaSession.questionsUsed,
          is_subscriber: false
        }
      : await getStudentUsage(user.id);

    if (!usage) {
      return send(res, 500, {
        error: "Unable to verify your learning usage right now."
      });
    }

    const trial = usage.is_subscriber
      ? null
      : await getStudentTrialAccess(user.id);

    if (!usage.is_subscriber && !trial) {
      return send(res, 500, {
        error: "Unable to verify your free learning time right now."
      });
    }

    const trialStatus = buildTrialStatus(
      trial?.trial_seconds_used || 0,
      usage.is_subscriber
    );

    if (trialStatus.trialExpired) {
      return send(res, 403, {
        error: "You've completed your 10-minute free learning trial. Upgrade to continue with Tolux AI Math Coach.",
        limitReached: true,
        qaMode: Boolean(qaSession),
        trialSecondsUsed: trialStatus.trialSecondsUsed,
        trialSecondsRemaining: 0,
        trialSecondsLimit: TRIAL_SECONDS
      });
    }

    if (qaSession) {
      const advancedQa = internalQa.advance(qaSession);
      return send(
        res,
        200,
        {
          allowed: true,
          isSubscriber: false,
          qaMode: true,
          isFreeDiagnostic: false,
          trialSecondsRemaining: TRIAL_SECONDS
        },
        "application/json",
        { "Set-Cookie": advancedQa.cookie }
      );
    }

    return send(res, 200, {
      allowed: true,
      isSubscriber: usage.is_subscriber,
      qaMode: false,
      isFreeDiagnostic: false,
      trialSecondsUsed: trialStatus.trialSecondsUsed,
      trialSecondsRemaining: trialStatus.trialSecondsRemaining,
      trialSecondsLimit: TRIAL_SECONDS
    });
  } catch (err) {
    console.error(err);
    return send(res, 500, {
      error: err?.message || "Unexpected server error."
    });
  }
}
if (
  req.method === "POST" &&
  (req.url === "/api/trial-heartbeat" ||
    req.url === "/api/lesson-trial-heartbeat")
) {
  try {
    const body = await readJson(req);
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return send(res, 401, { error: "Please sign in to continue." });
    }

    const usage = await getStudentUsage(user.id);
    if (!usage) {
      return send(res, 500, { error: "Unable to verify your learning access." });
    }

    if (usage.is_subscriber) {
      return send(res, 200, {
        allowed: true,
        ...buildTrialStatus(0, true)
      });
    }

    const trial = await getStudentTrialAccess(user.id);
    if (!trial) {
      return send(res, 500, { error: "Unable to verify your free learning time." });
    }

    const current = buildTrialStatus(trial.trial_seconds_used);
    if (current.trialExpired) {
      return send(res, 403, {
        allowed: false,
        limitReached: true,
        error: "You've completed your 10-minute free learning trial. Upgrade to continue with Tolux AI Math Coach.",
        ...current
      });
    }

    const updated = await addStudentTrialSeconds(
      user.id,
      trial.trial_seconds_used,
      body?.activeSeconds
    );

    if (!updated) {
      return send(res, 500, { error: "Unable to update your free learning time." });
    }

    const status = buildTrialStatus(updated.trial_seconds_used);
    return send(res, status.trialExpired ? 403 : 200, {
      allowed: !status.trialExpired,
      limitReached: status.trialExpired,
      error: status.trialExpired
        ? "You've completed your 10-minute free learning trial. Upgrade to continue with Tolux AI Math Coach."
        : undefined,
      ...status
    });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: err?.message || "Unexpected server error." });
  }
}
  if (req.method === "GET") return serveStatic(req, res);
  send(res, 405, "Method not allowed", "text/plain");
});

server.listen(port, () => {
  console.log(`Tolux AI Math Coach running at http://localhost:${port}`);
});
