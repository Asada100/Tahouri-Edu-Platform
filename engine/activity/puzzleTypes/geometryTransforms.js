// =====================================
// Tahouri Edu Platform
// Shared Geometry Transforms
// Version 1.0
// Pure coordinate calculations; no UI or engine side effects.
// =====================================

(function (root) {
    "use strict";

    const EPSILON = 1e-9;

    function isFiniteNumber(value) {
        return typeof value === "number" && Number.isFinite(value);
    }

    function isPoint(point) {
        return !!point && isFiniteNumber(point.x) && isFiniteNumber(point.y);
    }

    function requirePoint(point, label) {
        if (!isPoint(point)) {
            throw new TypeError((label || "point") + " must contain finite numeric x and y values.");
        }
    }

    function normalizePoint(point) {
        return { x: clean(point.x), y: clean(point.y) };
    }

    function clean(value) {
        return Math.abs(value) < EPSILON ? 0 : Number(value.toFixed(10));
    }

    function translatePoint(point, dx, dy) {
        requirePoint(point);
        if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) {
            throw new TypeError("Translation offsets must be finite numbers.");
        }
        return { x: clean(point.x + dx), y: clean(point.y + dy) };
    }

    function rotatePoint(point, center, degrees) {
        requirePoint(point);
        requirePoint(center, "center");
        if (!isFiniteNumber(degrees)) {
            throw new TypeError("Rotation angle must be a finite number of degrees.");
        }
        const radians = degrees * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const x = point.x - center.x;
        const y = point.y - center.y;
        return normalizePoint({
            x: center.x + x * cos - y * sin,
            y: center.y + x * sin + y * cos
        });
    }

    // Reflect a point across the infinite line passing through lineStart and lineEnd.
    function reflectPointAcrossLine(point, lineStart, lineEnd) {
        requirePoint(point);
        requirePoint(lineStart, "lineStart");
        requirePoint(lineEnd, "lineEnd");
        const vx = lineEnd.x - lineStart.x;
        const vy = lineEnd.y - lineStart.y;
        const lengthSquared = vx * vx + vy * vy;
        if (lengthSquared <= EPSILON * EPSILON) {
            throw new RangeError("Reflection line requires two distinct points.");
        }
        const px = point.x - lineStart.x;
        const py = point.y - lineStart.y;
        const projectionScale = (px * vx + py * vy) / lengthSquared;
        const projectedX = lineStart.x + projectionScale * vx;
        const projectedY = lineStart.y + projectionScale * vy;
        return normalizePoint({
            x: 2 * projectedX - point.x,
            y: 2 * projectedY - point.y
        });
    }

    // Point reflection is a 180-degree rotation around the given center.
    function reflectPointAcrossPoint(point, center) {
        requirePoint(point);
        requirePoint(center, "center");
        return {
            x: clean(2 * center.x - point.x),
            y: clean(2 * center.y - point.y)
        };
    }

    function transformPoints(points, transform) {
        if (!Array.isArray(points)) {
            throw new TypeError("points must be an array.");
        }
        if (typeof transform !== "function") {
            throw new TypeError("transform must be a function.");
        }
        return points.map(function (point, index) {
            requirePoint(point, "points[" + index + "]");
            const result = transform(point, index);
            requirePoint(result, "transformed points[" + index + "]");
            return result;
        });
    }

    function translateShape(points, dx, dy) {
        return transformPoints(points, function (point) {
            return translatePoint(point, dx, dy);
        });
    }

    function rotateShape(points, center, degrees) {
        requirePoint(center, "center");
        return transformPoints(points, function (point) {
            return rotatePoint(point, center, degrees);
        });
    }

    function reflectShapeAcrossLine(points, lineStart, lineEnd) {
        requirePoint(lineStart, "lineStart");
        requirePoint(lineEnd, "lineEnd");
        if (Math.hypot(lineEnd.x - lineStart.x, lineEnd.y - lineStart.y) <= EPSILON) {
            throw new RangeError("Reflection line requires two distinct points.");
        }
        return transformPoints(points, function (point) {
            return reflectPointAcrossLine(point, lineStart, lineEnd);
        });
    }

    function reflectShapeAcrossPoint(points, center) {
        requirePoint(center, "center");
        return transformPoints(points, function (point) {
            return reflectPointAcrossPoint(point, center);
        });
    }

    const api = Object.freeze({
        version: "1.0",
        translatePoint: translatePoint,
        translateShape: translateShape,
        rotatePoint: rotatePoint,
        rotateShape: rotateShape,
        reflectPointAcrossLine: reflectPointAcrossLine,
        reflectShapeAcrossLine: reflectShapeAcrossLine,
        reflectPointAcrossPoint: reflectPointAcrossPoint,
        reflectShapeAcrossPoint: reflectShapeAcrossPoint
    });

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.SharedGeometryTransforms = api;
    }
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
