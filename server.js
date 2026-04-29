const express = require("express");
const { Readable } = require("stream");

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

// همان هدرهایی که در Edge Function حذف می‌شدند
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

// اگر TARGET_DOMAIN تنظیم شده باشد، رله فعال می‌شود
if (TARGET_BASE) {
  app.use(async (req, res) => {
    try {
      const targetUrl = TARGET_BASE + req.originalUrl;

      // پردازش هدرهای ورودی مثل Edge Function
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
        // مقدار value می‌تواند رشته یا آرایه باشد (Express پارس می‌کند)
        headers.set(k, Array.isArray(value) ? value[0] : value);
      }

      if (clientIp) headers.set("x-forwarded-for", clientIp);

      const fetchOptions = {
        method: req.method,
        headers,
        redirect: "manual",
      };

      // فقط متدهای دارای بدنه body را ارسال کن
      if (req.method !== "GET" && req.method !== "HEAD") {
        // در Express, بدنه‌ی خام به صورت بافر در req قرار دارد (برای express.raw() نیاز است)
        // اما اگر از express.json() یا middleware دیگر استفاده نکنیم، req یک readable stream است.
        // برای پشتیبانی از بدنه‌ی خام، می‌توانیم از req به عنوان ReadableStream استفاده کنیم.
        // اینجا از Readable.toWeb(req) استفاده می‌کنیم (Node 18+)
        fetchOptions.body = Readable.toWeb(req);
        // نکته: اگر req قبلاً middleware نداشته باشد، req یک stream خام است.
      }

      const upstream = await fetch(targetUrl, fetchOptions);

      // تنظیم هدرهای پاسخ، حذف transfer-encoding (کتابخانه خودش مدیریت می‌کند)
      const responseHeaders = {};
      upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "transfer-encoding") {
          responseHeaders[key] = value;
        }
      });

      res.status(upstream.status).set(responseHeaders);

      // ارسال بدنه‌ی پاسخ به صورت stream
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
  // حالت بدون تنظیمات: صفحه HTML راهنما نمایش بده
  app.get("*", (req, res) => {
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Railway Relay</title>
  </head>
  <body>
    <h1>Railway Relay</h1>
    <p>Environment variable <code>TARGET_DOMAIN</code> is not set.</p>
    <p>Please configure it to your upstream service (e.g., <code>https://api.example.com</code>)</p>
  </body>
</html>`);
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Relay server running on port ${port}`);
});
