const assert = require("node:assert/strict");
const geometry = require("../engine/activity/puzzleTypes/geometryTransforms.js");

function point(actual, expected, label) {
    assert.ok(Math.abs(actual.x - expected.x) < 1e-8, label + " (x)");
    assert.ok(Math.abs(actual.y - expected.y) < 1e-8, label + " (y)");
}

point(geometry.translatePoint({ x: 2, y: -1 }, 3, 4), { x: 5, y: 3 }, "translate point");
point(geometry.rotatePoint({ x: 2, y: 1 }, { x: 1, y: 1 }, 90), { x: 1, y: 2 }, "rotate 90 degrees");
point(geometry.rotatePoint({ x: 2, y: 1 }, { x: 1, y: 1 }, 180), { x: 0, y: 1 }, "rotate 180 degrees");
point(geometry.reflectPointAcrossLine({ x: 2, y: 3 }, { x: 0, y: 0 }, { x: 1, y: 0 }), { x: 2, y: -3 }, "reflect across x-axis");
point(geometry.reflectPointAcrossLine({ x: 3, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 1 }), { x: -3, y: 1 }, "reflect across y-axis");
point(geometry.reflectPointAcrossPoint({ x: 5, y: -1 }, { x: 2, y: 3 }), { x: -1, y: 7 }, "point reflection");

assert.deepEqual(
    geometry.translateShape([{ x: 0, y: 0 }, { x: 1, y: 2 }], 2, -1),
    [{ x: 2, y: -1 }, { x: 3, y: 1 }]
);
assert.deepEqual(
    geometry.reflectShapeAcrossPoint([{ x: 1, y: 1 }], { x: 0, y: 0 }),
    [{ x: -1, y: -1 }]
);
assert.throws(() => geometry.rotatePoint({ x: 1, y: 2 }, { x: 0, y: 0 }, NaN), TypeError);
assert.throws(() => geometry.reflectPointAcrossLine({ x: 1, y: 2 }, { x: 0, y: 0 }, { x: 0, y: 0 }), RangeError);
assert.throws(() => geometry.translateShape([{ x: 1, y: Infinity }], 1, 1), TypeError);

console.log("Shared geometry transforms: 11 checks passed.");
