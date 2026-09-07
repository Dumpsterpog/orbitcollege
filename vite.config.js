import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Serves /api/* from the api/ folder during `vite dev`.
//
// In production Vercel runs those files as functions. Vite does not, so
// without this the weather endpoint 404s locally and the widget silently never
// appears -- which looks exactly like a broken feature rather than a missing
// dev server. `vercel dev` would also solve it, at the cost of everyone
// needing the Vercel CLI to run the app.
//
// Only the env vars the functions need are exposed, and only to the server
// side of the dev process. Nothing here reaches the browser bundle.
function apiRoutes(env) {
  return {
    name: "orbit-dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();

        const route = req.url.split("?")[0].replace("/api/", "");
        try {
          // Imported per request so editing a handler does not need a restart.
          const mod = await server.ssrLoadModule(`/api/${route}.js`);
          Object.assign(process.env, env);

          const json = (code, body) => {
            res.statusCode = code;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          };
          await mod.default(req, {
            status: (code) => ({ json: (body) => json(code, body) }),
            setHeader: (k, v) => res.setHeader(k, v),
          });
        } catch (err) {
          server.config.logger.error(`[orbit] /api/${route} failed: ${err.message}`);
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, reason: "dev_handler_error" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // "" prefix so server-only vars (OPENWEATHER_API_KEY, no VITE_) load too.
  // These are handed to the dev API middleware, never to the client.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), apiRoutes(env)],
    server: { port: 5173 },
  };
});
