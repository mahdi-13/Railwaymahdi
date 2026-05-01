const express = require("express");
const { Readable } = require("stream");

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

const app = express();

if (TARGET_BASE) {
  app.use(async (req, res) => {
    try {
      const targetUrl = TARGET_BASE + req.originalUrl;

      const headers = new Headers();
      let clientIp = null;

      for (const [key, value] of Object.entries(req.headers)) {
        const k = key.toLowerCase();
        if (STRIP_HEADERS.has(k)) continue;
        if (k.startsWith("x-nf-")) continue;
        if (k.startsWith("x-netlify-")) continue;
        if (k === "x-real-ip") {
          clientIp = value;
          continue;
        }
        if (k === "x-forwarded-for") {
          if (!clientIp) clientIp = value;
          continue;
        }
        headers.set(k, Array.isArray(value) ? value[0] : value);
      }

      if (clientIp) headers.set("x-forwarded-for", clientIp);

      const fetchOptions = {
        method: req.method,
        headers,
        redirect: "manual",
      };

      if (req.method !== "GET" && req.method !== "HEAD") {
        // بدنه‌ی خام درخواست را مستقیماً stream می‌کنیم
        fetchOptions.body = Readable.toWeb(req);
      }

      const upstream = await fetch(targetUrl, fetchOptions);

      const responseHeaders = {};
      upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "transfer-encoding") {
          responseHeaders[key] = value;
        }
      });

      res.status(upstream.status).set(responseHeaders);

      if (upstream.body) {
        const nodeStream = Readable.fromWeb(upstream.body);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      console.error("Relay error:", error);
      res.status(502).send("Bad Gateway: Relay Failed");
    }
  });
} else {
  app.get("*", (req, res) => {
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Google Cloud Relay</title>
  </head>
  <body>
    <h1>Google Cloud Relay</h1>
    <p>Environment variable <code>TARGET_DOMAIN</code> is not set.</p>
    <p>Please configure it to your upstream service (e.g., <code>https://api.example.com</code>)</p>
  </body>
</html>`);
  });
}

const port = process.env.PORT || 8080; // Cloud Run پورت 8080 را به‌عنوان PORT ارسال می‌کند
app.listen(port, () => {
  console.log(`Relay server running on port ${port}`);
});
