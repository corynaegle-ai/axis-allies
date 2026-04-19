/**
 * Game logic integration tests — run with:
 *   cd server && npx tsx src/game.test.ts
 */
import assert from "node:assert/strict";
import { newGame, applyPurchase, applyPlace, advancePhase, computeIncome } from "./game.js";
import { TERRITORY_MAP, UNITS } from "@aa/shared";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function advanceTo(state: ReturnType<typeof newGame>, targetPhase: string) {
  let guard = 0;
  while (state.phase !== targetPhase && guard++ < 20) advancePhase(state);
  assert.equal(state.phase, targetPhase, `Could not reach phase "${targetPhase}"`);
}

// ── tests ─────────────────────────────────────────────────────────────────────

console.log("\nGame logic tests\n");

console.log("── Purchase phase ──");

test("new game starts in purchase phase for Russia", () => {
  const state = newGame("test-1");
  assert.equal(state.phase, "purchase");
  assert.equal(state.activePower, "russia");
});

test("Russia can purchase infantry within budget", () => {
  const state = newGame("test-2");
  const err = applyPurchase(state, "russia", [{ unit: "infantry", qty: 3 }]);
  assert.equal(err, null);
  assert.equal(state.powers.russia.producedThisTurn.length, 1);
  assert.equal(state.powers.russia.producedThisTurn[0].qty, 3);
});

test("purchase deducts treasury correctly", () => {
  const state = newGame("test-3");
  const before = state.powers.russia.treasury; // 24
  applyPurchase(state, "russia", [{ unit: "infantry", qty: 2 }]); // 2×3 = 6
  assert.equal(state.powers.russia.treasury, before - 6);
});

test("purchase rejects overspend", () => {
  const state = newGame("test-4");
  // Infantry costs 3 each; treasury is 24; 9 infantry = 27 > 24
  const err = applyPurchase(state, "russia", [{ unit: "infantry", qty: 9 }]);
  assert.ok(err !== null, "expected error for overspend");
});

test("purchase rejects wrong power", () => {
  const state = newGame("test-5");
  const err = applyPurchase(state, "germany", [{ unit: "infantry", qty: 1 }]);
  assert.ok(err !== null, "expected error for wrong power");
});

console.log("\n── Place phase (land units) ──");

test("Russia can place infantry at factory territory", () => {
  const state = newGame("test-6");
  applyPurchase(state, "russia", [{ unit: "infantry", qty: 2 }]);
  advanceTo(state, "place");
  assert.equal(state.phase, "place");
  assert.equal(state.activePower, "russia");

  const err = applyPlace(state, "russia", "infantry", "russia");
  assert.equal(err, null, `unexpected error: ${err}`);

  // pool should have 1 infantry left
  const pool = state.powers.russia.producedThisTurn;
  assert.equal(pool[0].qty, 1);
});

test("placing all infantry clears the pool", () => {
  const state = newGame("test-7");
  applyPurchase(state, "russia", [{ unit: "infantry", qty: 2 }]);
  advanceTo(state, "place");

  applyPlace(state, "russia", "infantry", "russia");
  applyPlace(state, "russia", "infantry", "russia");

  assert.equal(state.powers.russia.producedThisTurn.length, 0);
});

test("place rejects non-factory territory", () => {
  const state = newGame("test-8");
  applyPurchase(state, "russia", [{ unit: "infantry", qty: 1 }]);
  advanceTo(state, "place");

  const err = applyPlace(state, "russia", "infantry", "karelia"); // no factory
  assert.ok(err !== null, "expected error for non-factory territory");
});

test("place rejects enemy territory", () => {
  const state = newGame("test-9");
  applyPurchase(state, "russia", [{ unit: "infantry", qty: 1 }]);
  advanceTo(state, "place");

  const err = applyPlace(state, "russia", "infantry", "germany_terr");
  assert.ok(err !== null, "expected error for enemy territory");
});

test("Russia can place at caucasus (second factory)", () => {
  const state = newGame("test-10");
  applyPurchase(state, "russia", [{ unit: "infantry", qty: 1 }]);
  advanceTo(state, "place");

  const err = applyPlace(state, "russia", "infantry", "caucasus");
  assert.equal(err, null, `unexpected error: ${err}`);
});

console.log("\n── Place phase (sea units) ──");

test("Russia can place submarine in sea zone adjacent to Caucasus factory", () => {
  const state = newGame("test-11");
  // submarine costs 6, Russia has 24 IPC starting treasury
  applyPurchase(state, "russia", [{ unit: "submarine", qty: 1 }]);
  advanceTo(state, "place");

  // Caucasus (second Russian factory) neighbors sz_16
  const caucasusNeighbors = TERRITORY_MAP["caucasus"]?.neighbors ?? [];
  const adjSeaZone = caucasusNeighbors.find(n => TERRITORY_MAP[n]?.terrain === "sea");
  assert.ok(adjSeaZone, "Caucasus should have an adjacent sea zone (sz_16)");

  const err = applyPlace(state, "russia", "submarine", adjSeaZone!);
  assert.equal(err, null, `unexpected error placing sub at ${adjSeaZone}: ${err}`);
});

test("place rejects sea unit on land", () => {
  const state = newGame("test-12");
  applyPurchase(state, "russia", [{ unit: "submarine", qty: 1 }]);
  advanceTo(state, "place");

  const err = applyPlace(state, "russia", "submarine", "russia");
  assert.ok(err !== null, "expected error placing sea unit on land");
});

console.log("\n── Income & phase cycle ──");

test("income computed correctly for Russia start", () => {
  const state = newGame("test-13");
  const income = computeIncome(state, "russia");
  assert.ok(income > 0, "Russia should have positive income");
  assert.equal(income, 33, "Russia starts with 33 IPC income (sum of territory IPCs)");
});

test("full turn cycle returns to purchase phase for next power", () => {
  const state = newGame("test-14");
  advanceTo(state, "purchase"); // already here
  // Advance through all 6 Russia phases
  for (let i = 0; i < 6; i++) advancePhase(state);
  assert.equal(state.activePower, "germany");
  assert.equal(state.phase, "purchase");
});

// ── summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
