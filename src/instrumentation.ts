export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadBffConfig, observableConfig } = await import("./server/bff/config");
    // Development UI remains usable without a BFF. Production server startup has
    // no opt-out. next build does not start the production request server.
    if (process.env.NODE_ENV === "production" || process.env.BFF_ENVIRONMENT) {
      try {
        console.info("BFF configuration validated", observableConfig(loadBffConfig(process.env)));
      } catch {
        // This Next version may keep its listener open after a rejected register
        // promise. Terminate explicitly so invalid production config cannot serve.
        console.error("BFF startup rejected: deployment configuration is invalid or incomplete.");
        process.exit(1);
      }
    }
  }
}
