# Shared Geometry Transforms — Contract

File: `engine/activity/puzzleTypes/geometryTransforms.js`

This module is intentionally a pure calculation utility. It does not register a puzzle type, mutate activity state, render UI, or alter existing game behavior.

## Coordinate convention

- Input points are Cartesian `{ x, y }` objects with finite numeric values.
- Positive rotation angles are counter-clockwise in Cartesian coordinates.
- A reflection line is defined by two distinct points and extends infinitely in both directions.
- Point reflection maps a point through the center to the opposite side (equivalent to a 180° rotation).
- Shape operations return new point objects and do not mutate the input array or points.
- Values are rounded to 10 decimal places to suppress floating-point noise.

## Public API

- `translatePoint(point, dx, dy)`
- `translateShape(points, dx, dy)`
- `rotatePoint(point, center, degrees)`
- `rotateShape(points, center, degrees)`
- `reflectPointAcrossLine(point, lineStart, lineEnd)`
- `reflectShapeAcrossLine(points, lineStart, lineEnd)`
- `reflectPointAcrossPoint(point, center)`
- `reflectShapeAcrossPoint(points, center)`

## Integration boundary

Do not connect this module to `SpatialPuzzle.start` or the browser script list until script load order, activity renderer support, answer checking, and regression tests are verified. Existing `legacy`, `place`, `symmetry`, and `coordinatePlane` paths must continue unchanged.

## Verification status

The Node-style test file is committed at `tests/shared-geometry-transforms.test.js`. The current connector session can inspect repository files and commit them, but has not executed the test runner; therefore these tests are authored, not yet confirmed passing in GitHub Actions or a local runtime.
