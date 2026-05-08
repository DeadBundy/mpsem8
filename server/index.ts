import "./env";
import express, { type Request, Response, NextFunction } from "express";
import type { AddressInfo } from "net";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Register all routes immediately - they must be set up before export
const server = registerRoutes(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
});

// Setup static file serving for production
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  console.log("Setting up production static serve");
  serveStatic(app);
}

// ---------- Startup logging + hardening ----------
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  console.error(err?.stack || String(err));
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
  // @ts-expect-error - reason may not be an Error
  console.error(reason?.stack || String(reason));
});

function envPresence(name: string) {
  return {
    exists: Boolean(process.env[name]),
    valuePreview: process.env[name] ? String(process.env[name]).slice(0, 4) + "…" : undefined,
  };
}

console.log("[startup] NODE_ENV=", process.env.NODE_ENV);
console.log("[startup] VERCEL=", Boolean(process.env.VERCEL));
console.log("[startup] PORT=", process.env.PORT);
console.log("[startup] env checks:", {
  DATABASE_URL: envPresence("DATABASE_URL"),
  OPENAI_API_KEY: envPresence("OPENAI_API_KEY"),
  GROQ_API_KEY: envPresence("GROQ_API_KEY"),
  JWT_SECRET: envPresence("JWT_SECRET"),
});

function startListening(listenOptions: { port: number; host: string; reusePort?: boolean }) {
  server.on("error", (error: NodeJS.ErrnoException) => {
    console.error("[server error]", error);
    if (error.code === "EADDRINUSE") {
      log(`port ${listenOptions.port} is busy, retrying on a random open port`, "express");
      server.listen({ host: listenOptions.host, port: 0 }, () => {
        const address = server.address() as AddressInfo | null;
        log(`serving on port ${address?.port ?? "unknown"}`);
      });
      return;
    }
    throw error;
  });

  server.listen(listenOptions, () => {
    log(`serving on port ${listenOptions.port}`);
  });
}

async function boot() {
  try {
    console.log("STEP 1 PASSED: express app created + routes registered");

    // Local dev server setup
    if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
      console.log("STEP 2 PASSED: entering dev mode");
      const listenOptions: { port: number; host: string; reusePort?: boolean } = {
        port: parseInt(process.env.PORT || "5000", 10),
        host: "0.0.0.0",
      };

      if (process.platform !== "win32") {
        listenOptions.reusePort = true;
      }

      try {
        console.log("STEP 3 STARTED: setupVite");
        await setupVite(app, server);
        console.log("STEP 3 PASSED: setupVite");
      } catch (e) {
        console.error("STEP 3 FAILED: setupVite", e);
      }

      console.log("STEP 4 STARTED: listen (dev)");
      startListening(listenOptions);
      console.log("STEP 4 CALLED: listen (dev)");
      return;
    }

    // Production/Render: ensure we actually listen.
    console.log("STEP 2 PASSED: entering production/Render mode");
    const port = parseInt(process.env.PORT || "5000", 10);
    console.log("STEP 3 PASSED: resolved PORT", port);

    // serveStatic already configured earlier
    console.log("STEP 4 STARTED: listen (prod)");
    startListening({ port, host: "0.0.0.0" });
    console.log("STEP 4 CALLED: listen (prod)");
  } catch (err) {
    console.error("STEP BOOT FAILED (fatal)", err);
    console.error((err as any)?.stack || String(err));
    process.exit(1);
  }
}

boot();

// Export for Vercel serverless
export default app;

