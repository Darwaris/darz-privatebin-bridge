import fetch from "node-fetch";
import crypto from "crypto";
import zlib from "zlib";

// base64url helper
function b64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "No text provided" });
    }

    // 🔑 generate key & iv
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    // 📦 compress text
    const compressed = zlib.deflateRawSync(Buffer.from(text, "utf8"));

    // 🔐 encrypt (AES-256-GCM)
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(compressed),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    const ct = Buffer.concat([encrypted, tag]);

    // 📤 PrivateBin payload (browser-like)
    const payload = {
      v: 2,
      ct: b64url(ct),
      adata: [
        [
          b64url(iv),
          b64url(Buffer.from("plaintext")),
          b64url(Buffer.from("zlib"))
        ],
        "aes",
        "gcm",
        256,
        128
      ],
      meta: {
        expire: "10min"
      }
    };

    const pbRes = await fetch("https://privatebin.net/?json=1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify(payload)
    });

    const pbJson = await pbRes.json();

    if (pbJson.status !== 1 || !pbJson.url) {
      return res.json({ ok: false, error: "PrivateBin rejected paste" });
    }

    // 🔗 final encrypted link
    const link = pbJson.url + "#" + b64url(key);

    return res.json({
      ok: true,
      link
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
