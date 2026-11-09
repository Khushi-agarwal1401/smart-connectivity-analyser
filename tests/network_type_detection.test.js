/**
 * Tests for Network Type Detection (Issue #3)
 *
 * Verifies that:
 * 1. Physical connection mediums (Wi-Fi, Cellular, Ethernet, Bluetooth, WiMAX) are detected accurately.
 * 2. Effective connection types ('3g', '4g') are NEVER falsely presented as confirmed cellular generations.
 * 3. Cellular connections are labeled as 'Mobile' without making unverified generation claims (like 5G/4G/3G).
 * 4. Unsupported browser APIs (Safari, Firefox) and unknown connection states are handled gracefully.
 * 5. Offline states (navigator.onLine = false, type = 'none') are correctly reported as 'Offline'.
 * 6. The returned network type string adheres to backend database length constraints (<= 50 chars).
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
    resolveNetworkType,
    detectNetworkType
} = require("../js/script.js");

describe("Network Type Detection Suite", () => {

    /* =========================================================
       1. Physical Connection Media Detection
       ========================================================= */
    describe("Verified Physical Media", () => {
        it("identifies Wi-Fi connections", () => {
            const result = resolveNetworkType({ type: "wifi" }, true);
            assert.strictEqual(result.type, "Wi-Fi");
            assert.strictEqual(result.isKnown, true);
            assert.strictEqual(result.detail, "Wi-Fi connection");
        });

        it("handles case-insensitive Wi-Fi type strings", () => {
            const result = resolveNetworkType({ type: "WIFI" }, true);
            assert.strictEqual(result.type, "Wi-Fi");
            assert.strictEqual(result.isKnown, true);
        });

        it("identifies Ethernet connections", () => {
            const result = resolveNetworkType({ type: "ethernet" }, true);
            assert.strictEqual(result.type, "Ethernet");
            assert.strictEqual(result.isKnown, true);
            assert.strictEqual(result.detail, "Wired ethernet connection");
        });

        it("identifies Bluetooth tethering", () => {
            const result = resolveNetworkType({ type: "bluetooth" }, true);
            assert.strictEqual(result.type, "Bluetooth");
            assert.strictEqual(result.isKnown, true);
            assert.strictEqual(result.detail, "Bluetooth tethering connection");
        });

        it("identifies WiMAX connections", () => {
            const result = resolveNetworkType({ type: "wimax" }, true);
            assert.strictEqual(result.type, "WiMAX");
            assert.strictEqual(result.isKnown, true);
            assert.strictEqual(result.detail, "WiMAX wireless connection");
        });
    });

    /* =========================================================
       2. Cellular Generation Handling (Issue #3 Core Requirement)
       ========================================================= */
    describe("Cellular Network Handling & Generation Disclaimer", () => {
        it("reports cellular medium as 'Mobile' without fabricating 3G/4G/5G generation", () => {
            const result = resolveNetworkType({ type: "cellular" }, true);
            assert.strictEqual(result.type, "Mobile");
            assert.strictEqual(result.isKnown, true);
            assert.match(result.detail, /generation unverified/i);
        });

        it("does NOT display '3G' when device is on cellular with 3g effectiveType", () => {
            const result = resolveNetworkType({
                type: "cellular",
                effectiveType: "3g"
            }, true);

            // Must NOT claim "3G" as confirmed type
            assert.strictEqual(result.type, "Mobile");
            assert.strictEqual(result.isKnown, true);
            // Explicitly identifies speed tier while stating generation is unverified
            assert.match(result.detail, /~3G speed tier/i);
            assert.match(result.detail, /generation unverified/i);
        });

        it("does NOT display '4G' when device is on cellular with 4g effectiveType (e.g. 5G phone)", () => {
            const result = resolveNetworkType({
                type: "cellular",
                effectiveType: "4g"
            }, true);

            // Must NOT claim "4G" as confirmed type
            assert.strictEqual(result.type, "Mobile");
            assert.strictEqual(result.isKnown, true);
            assert.match(result.detail, /~4G speed tier/i);
            assert.match(result.detail, /generation unverified/i);
        });
    });

    /* =========================================================
       3. Avoid Misleading effectiveType Fallbacks (Desktop/Chromium)
       ========================================================= */
    describe("effectiveType without Physical Medium", () => {
        it("does NOT display '4G' when browser only provides effectiveType: '4g' (e.g. desktop Chrome)", () => {
            const result = resolveNetworkType({
                effectiveType: "4g"
            }, true);

            // In desktop Chrome, type is undefined but effectiveType is '4g'.
            // It MUST NOT report '4G' on home fiber / desktop Wi-Fi.
            assert.strictEqual(result.type, "Unknown");
            assert.strictEqual(result.isKnown, false);
            assert.match(result.detail, /medium unverified/i);
            assert.match(result.detail, /~4G speed tier/i);
        });

        it("does NOT display '3G' when browser only provides effectiveType: '3g'", () => {
            const result = resolveNetworkType({
                effectiveType: "3g"
            }, true);

            assert.strictEqual(result.type, "Unknown");
            assert.strictEqual(result.isKnown, false);
            assert.match(result.detail, /medium unverified/i);
            assert.match(result.detail, /~3G speed tier/i);
        });
    });

    /* =========================================================
       4. Offline Detection
       ========================================================= */
    describe("Offline State Detection", () => {
        it("reports 'Offline' when isOnline is false regardless of cached connection", () => {
            const result = resolveNetworkType({ type: "wifi" }, false);
            assert.strictEqual(result.type, "Offline");
            assert.strictEqual(result.isKnown, true);
            assert.strictEqual(result.detail, "No internet connection");
            assert.strictEqual(result.effectiveType, null);
        });

        it("reports 'Offline' when connection.type is 'none'", () => {
            const result = resolveNetworkType({ type: "none" }, true);
            assert.strictEqual(result.type, "Offline");
            assert.strictEqual(result.isKnown, true);
            assert.strictEqual(result.detail, "No active network connection");
        });
    });

    /* =========================================================
       5. Unsupported & Unknown Browser Environments
       ========================================================= */
    describe("Unsupported & Unknown Browser APIs", () => {
        it("handles null connection gracefully (e.g. Safari / Firefox)", () => {
            const result = resolveNetworkType(null, true);
            assert.strictEqual(result.type, "Unknown");
            assert.strictEqual(result.isKnown, false);
            assert.strictEqual(result.detail, "Network Information API not supported by browser");
            assert.strictEqual(result.effectiveType, null);
        });

        it("handles undefined connection gracefully", () => {
            const result = resolveNetworkType(undefined, true);
            assert.strictEqual(result.type, "Unknown");
            assert.strictEqual(result.isKnown, false);
            assert.strictEqual(result.detail, "Network Information API not supported by browser");
        });

        it("handles empty object connection gracefully", () => {
            const result = resolveNetworkType({}, true);
            assert.strictEqual(result.type, "Unknown");
            assert.strictEqual(result.isKnown, false);
            assert.strictEqual(result.detail, "Network type not reported by browser");
        });

        it("handles connection with type: 'unknown'", () => {
            const result = resolveNetworkType({ type: "unknown" }, true);
            assert.strictEqual(result.type, "Unknown");
            assert.strictEqual(result.isKnown, false);
            assert.strictEqual(result.detail, "Network type not reported by browser");
        });

        it("handles connection with type: 'other'", () => {
            const result = resolveNetworkType({ type: "other" }, true);
            assert.strictEqual(result.type, "Unknown");
            assert.strictEqual(result.isKnown, false);
        });

        it("handles unrecognized connection types", () => {
            const result = resolveNetworkType({ type: "quantum_link" }, true);
            assert.strictEqual(result.type, "Unknown");
            assert.strictEqual(result.isKnown, false);
        });
    });

    /* =========================================================
       6. Backend Schema Constraint Verification
       ========================================================= */
    describe("Backend Database & Length Constraints", () => {
        it("ensures all returned network types are strings <= 50 characters", () => {
            const testCases = [
                { type: "wifi" },
                { type: "cellular", effectiveType: "4g" },
                { type: "cellular", effectiveType: "3g" },
                { type: "ethernet" },
                { type: "bluetooth" },
                { type: "wimax" },
                { type: "none" },
                { effectiveType: "4g" },
                { type: "unknown" },
                null
            ];

            for (const testCase of testCases) {
                const onlineResult = resolveNetworkType(testCase, true);
                assert.ok(typeof onlineResult.type === "string");
                assert.ok(onlineResult.type.length <= 50, `Type "${onlineResult.type}" exceeded 50 chars`);

                const offlineResult = resolveNetworkType(testCase, false);
                assert.ok(typeof offlineResult.type === "string");
                assert.ok(offlineResult.type.length <= 50, `Offline type "${offlineResult.type}" exceeded 50 chars`);
            }
        });
    });

    /* =========================================================
       7. detectNetworkType Runtime Safety
       ========================================================= */
    describe("detectNetworkType() Execution", () => {
        it("executes without throwing in environments where browser globals are absent", () => {
            const result = detectNetworkType();
            assert.ok(result);
            assert.ok(typeof result.type === "string");
            assert.ok(typeof result.isKnown === "boolean");
        });
    });
});

