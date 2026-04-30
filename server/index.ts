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

// Local dev server setup
if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
  (async () => {
    const listenOptions: { port: number; host: string; reusePort?: boolean } = {
      port: parseInt(process.env.PORT || "5000", 10),
      host: "0.0.0.0",
    };

    if (process.platform !== "win32") {
      listenOptions.reusePort = true;
    }

    try {
      await setupVite(app, server);
    } catch (e) {
      console.error("Failed to setup Vite:", e);
    }

    server.on("error", (error: NodeJS.ErrnoException) => {
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
  })();
}

// Export for Vercel serverless
export default app;
