import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { importAliExpress } from "./src/server/importAli.js";

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function imageProxy() {
  return {
    name: "mirra-image-proxy",
    configureServer(server) {
      server.middlewares.use("/api/img", (req, res) => {
        serveImage(server.config.root, req, res).catch((error) => {
          res.statusCode = 502;
          res.setHeader("Content-Type", "text/plain");
          res.end(error.message || "Image failed.");
        });
      });
    },
  };
}

const aliImageHost = /(^|\.)((?:aliexpress-media|alicdn|aliexpress|aliimg)\.com)$/i;

async function serveImage(root, req, res) {
  const query = new URL(req.url || "/", "http://local").searchParams.get("u") || "";
  let target;
  try {
    target = new URL(query);
  } catch {
    res.statusCode = 400;
    res.end("Bad image link.");
    return;
  }
  if (target.protocol !== "https:" || !aliImageHost.test(target.hostname)) {
    res.statusCode = 400;
    res.end("That image host is not allowed.");
    return;
  }

  const id = crypto.createHash("sha1").update(target.toString()).digest("hex").slice(0, 20);
  const dir = path.join(root, "public", "media");
  const kinds = [
    ["jpg", "image/jpeg"],
    ["webp", "image/webp"],
    ["png", "image/png"],
  ];
  let saved = kinds.find(([ext]) => fs.existsSync(path.join(dir, `${id}.${ext}`)));
  if (!saved) {
    const response = await fetch(target, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        accept: "image/webp,image/jpeg",
        referer: "https://www.aliexpress.com/",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      res.statusCode = 502;
      res.end("AliExpress did not return that photo.");
      return;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind || bytes.length > 8_000_000) {
      res.statusCode = 502;
      res.end("That photo was not a usable image.");
      return;
    }
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.${kind[0]}`);
    fs.writeFileSync(`${file}.part`, bytes);
    fs.renameSync(`${file}.part`, file);
    saved = kind;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", saved[1]);
  res.setHeader("Cache-Control", "public, max-age=86400");
  fs.createReadStream(path.join(dir, `${id}.${saved[0]}`)).pipe(res);
}

function sniffImage(bytes) {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return ["jpg", "image/jpeg"];
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return ["png", "image/png"];
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return ["webp", "image/webp"];
  return null;
}

function adminApi() {
  return {
    name: "mirra-admin-api",
    configureServer(server) {
      server.middlewares.use("/api/admin", (req, res) => {
        handle(server.config.root, req, res).catch((error) => {
          send(res, 500, { error: error.message || "Admin API failed." });
        });
      });
    },
  };
}

async function handle(root, req, res) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Use POST." });
    return;
  }

  const secretFile = path.join(root, "admin.secret.json");
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, JSON.stringify({ password: "mirra" }, null, 2));
  }
  const secret = readJson(secretFile, { password: "mirra" });
  const body = await readBody(req);
  const url = (req.url || "").split("?")[0].replace(/^\/api\/admin/, "") || "/";
  const sent = req.headers["x-admin-key"] || (url === "/login" ? body.password : "");

  if (url === "/login") {
    const ok = sent === secret.password;
    send(res, ok ? 200 : 401, ok ? { ok: true } : { error: "Wrong password." });
    return;
  }

  if (sent !== secret.password) {
    send(res, 401, { error: "Wrong password." });
    return;
  }

  if (url === "/password") {
    const next = String(body.password || "").trim();
    if (next.length < 4) {
      send(res, 400, { error: "Use at least 4 characters." });
      return;
    }
    fs.writeFileSync(secretFile, JSON.stringify({ password: next }, null, 2));
    send(res, 200, { ok: true });
    return;
  }

  if (url === "/logo") {
    const match = String(body.dataUrl || "").match(
      /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml))(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=\s]+)$/,
    );
    if (!match) {
      send(res, 400, { error: "Use a PNG, JPG, WEBP, GIF, or SVG." });
      return;
    }
    const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    if (!bytes.length || bytes.length > 2_000_000) {
      send(res, 400, { error: "Keep the logo under 2 MB." });
      return;
    }
    const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" }[match[1]];
    const dir = path.join(root, "public", "brand");
    fs.mkdirSync(dir, { recursive: true });
    const file = `logo-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(dir, file), bytes);
    send(res, 200, { url: `/brand/${file}` });
    return;
  }

  if (url === "/import") {
    try {
      const product = await importAliExpress(body.url, body.currency);
      send(res, 200, product);
    } catch (error) {
      send(res, 400, { error: error.message || "Could not read that AliExpress link." });
    }
    return;
  }

  if (url === "/content") {
    if (!Array.isArray(body.products) || !Array.isArray(body.categories)) {
      send(res, 400, { error: "Catalog is missing products or categories." });
      return;
    }
    fs.writeFileSync(path.join(root, "public", "content.json"), JSON.stringify(body, null, 2));
    send(res, 200, { ok: true });
    return;
  }

  send(res, 404, { error: "Unknown admin route." });
}

export default defineConfig({
  plugins: [react(), imageProxy(), adminApi()],
});
