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

## Integration

The helper is loaded before `spatialPuzzle.js` in `index.html`. A separate `mode: "transform"` path uses it to calculate expected coordinates for translation, rotation, line reflection, and point reflection. The renderer lets students place each transformed vertex on the coordinate plane and review the displayed output coordinates.

The existing `legacy`, `place`, `symmetry`, and `coordinatePlane` paths are not intentionally changed. The Grade 6 activity is registered as `mathGeometryTransforms` and contains four example questions.

## Verification status

Automated tests are authored in `tests/shared-geometry-transforms.test.js` and `tests/spatial-transform-contract.test.js`. The latter checks the mode contract, answer checking, and registered Grade 6 questions. A confirmed CI result is still required; browser/mobile runtime and regression testing have not yet been completed.
