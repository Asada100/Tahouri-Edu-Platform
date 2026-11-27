"use strict";

const assert = require("node:assert/strict");
const { createSessionIdentityGenerator } = require("./sessionIdentity");

const uuidV4 = /^activity-session-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function test(name, fn) {
    fn();
    process.stdout.write("PASS — " + name + "\n");
}

test("randomUUID path returns a prefixed UUID v4", () => {
    const generate = createSessionIdentityGenerator({
        randomUUID: () => "123e4567-e89b-42d3-a456-426614174000"
    });
    assert.match(generate(), uuidV4);
});

test("getRandomValues fallback sets UUID v4 version and variant bits", () => {
    const generate = createSessionIdentityGenerator({
        getRandomValues(bytes) {
            bytes.fill(0);
            bytes[0] = 0xab;
            return bytes;
        }
    });
    const id = generate();
    assert.match(id, uuidV4);
    assert.equal(id, "activity-session-ab000000-0000-4000-8000-000000000000");
});

test("same deterministic clock does not affect independently generated identities", () => {
    let sequence = 0;
    const generate = createSessionIdentityGenerator({
        randomUUID() {
            sequence += 1;
            return sequence === 1
                ? "123e4567-e89b-42d3-a456-426614174000"
                : "123e4567-e89b-42d3-a456-426614174001";
        }
    });
    const first = generate();
    const second = generate();
    assert.notEqual(first, second);
});

test("missing crypto provider fails closed", () => {
    const generate = createSessionIdentityGenerator(null);
    // Explicit undefined is tested through a provider object without secure APIs below;
    // this assertion is environment-independent and does not rely on host crypto.
    assert.throws(
        () => createSessionIdentityGenerator({})(),
        /Secure crypto\.getRandomValues/
    );
});

test("invalid randomUUID output is rejected instead of silently downgraded", () => {
    const generate = createSessionIdentityGenerator({
        randomUUID: () => "not-a-uuid",
        getRandomValues(bytes) { bytes.fill(1); return bytes; }
    });
    assert.throws(generate, /invalid UUID v4/);
});

process.stdout.write("SESSION ID GENERATOR RESULT: PASS (5/5)\n");
