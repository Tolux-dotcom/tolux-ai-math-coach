import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import Stripe from "stripe";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = process.env.PORT || 3000;
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
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

function send(res, status, data, type="application/json") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
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
    ".svg": "image/svg+xml",
    ".png": "image/png"
  };
  send(res, 200, fs.readFileSync(filePath), types[ext] || "application/octet-stream");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS"
    });
    return res.end();
  }

  if (req.method === "POST" && req.url === "/api/create-checkout-session") {
  try {
    if (!stripe) {
      return send(res, 503, { error: "Stripe is not configured." });
    }

    const { priceId } = await readJson(req);

    if (!priceId) {
      return send(res, 400, { error: "Missing priceId." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://mathcoach.tolux.org/?payment=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://mathcoach.tolux.org/?payment=cancelled"
    });

    return send(res, 200, { url: session.url });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: err?.message || "Unable to start checkout." });
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

      send(res, 200, { reply: response.output_text || "I could not generate a response." });
    } catch (err) {
      console.error(err);
      send(res, 500, { error: err?.message || "Unexpected server error." });
    }
    return;
  }

  if (req.method === "GET") return serveStatic(req, res);
  send(res, 405, "Method not allowed", "text/plain");
});

server.listen(port, () => {
  console.log(`Tolux AI Math Coach running at http://localhost:${port}`);
});
