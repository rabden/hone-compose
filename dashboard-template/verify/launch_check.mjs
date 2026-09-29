#!/usr/bin/env node
/**
 * Route check for the built dashboard template.
 *
 * Usage:
 *   npm run build && npm run start        # terminal 1
 *   node verify/launch_check.mjs          # terminal 2
 *
 * BASE_URL env overrides http://localhost:3000.
 * Asserts every route answers 200 and renders its headline.
 * Dependency-free on purpose (plain fetch).
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  ["/", "Your Hone Control Panel"],
  ["/api", "API Providers"],
  ["/customizations", "Customizations"],
  ["/actions", "Actions Studio"],
  ["/history", "Rewrite History"],
  ["/shortcut", "Key Bindings"],
];

let failed = false;
for (const [route, marker] of ROUTES) {
  try {
    const res = await fetch(BASE_URL + route);
    const html = await res.text();
    const ok = res.status === 200 && html.includes(marker);
    console.log(`${ok ? "PASS" : "FAIL"}  ${route}  (${res.status})`);
    if (!ok) failed = true;
  } catch (err) {
    console.log(`FAIL  ${route}  (${err.cause?.code ?? err.message})`);
    failed = true;
  }
}

if (failed) {
  console.error("\nlaunch check FAILED — is the production server running on " + BASE_URL + "?");
  process.exit(1);
}
console.log(`\nAll ${ROUTES.length} routes OK on ${BASE_URL}`);
