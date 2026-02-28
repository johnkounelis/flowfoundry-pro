import { execSync } from "node:child_process";

console.log("🔧 Bootstrapping dev environment...");
execSync("pnpm db:migrate", { stdio: "inherit" });
execSync("pnpm db:seed", { stdio: "inherit" });
console.log(`
✅ DB migrated & seeded.

🔌 Local services:
- Mailhog:   http://localhost:8025
- Unleash:   http://localhost:4242
- PostHog:   http://localhost:8888
- OTEL:      http://localhost:4318

🚀 Start the app: pnpm dev
`);
