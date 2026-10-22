// =====================================
// Tahouri Edu Platform
// Puzzle Screen
// Version 2.0
//
// Supported:
// - ordering
// - sequence
// - visualMath
// - inputOutput
// - sentence
// - grid
// - wordGrid
// - crossGrid
//
// Architecture:
// ActivityManager
//      ↓
// PuzzleEngine
//      ↓
// activityReady
//      ↓
// PuzzleScreen
//
// Execution remains in PuzzleEngine
// and Puzzle Type Handlers.
// =====================================


const PuzzleScreen = {

    currentOrder: [],

    activityReadyConnected: false,

    spatialScreenActivatedAt: 0,

    spatialUserInitiatedDragAt: 0,


    // =====================================
    // INIT
    // =====================================

    init: function () {

        if (
            typeof EventManager ===
            "undefined"
        ) {

            console.error(
                "Puzzle Screen: EventManager Not Available"
            );

            return;

        }


        if (
            this.activityReadyConnected
        ) {

            return;

        }


        EventManager.on(
            "activityReady",
            function (payload) {

                PuzzleScreen.handleActivityReady(
                    payload
                );

            }
        );


        this.activityReadyConnected =
            true;


        console.log(
            "Puzzle Screen: Activity Ready Listener Connected"
        );

    },


    // =====================================
    // ACTIVITY READY
    // =====================================

    handleActivityReady: function (
        payload
    ) {

        if (!payload) {

            return;

        }


        const engineName =
            payload.engineName;


        if (
            engineName !== "PuzzleEngine"
            &&
            engineName !== "puzzle"
        ) {

            return;

        }


        const engine = payload.engine;
        if (
            !engine ||
            typeof PuzzleEngine === "undefined" ||
            engine !== PuzzleEngine ||
            !engine.state ||
            !engine.state.started ||
            engine.state.isFinished ||
            engine.activity !== payload.activity ||
            engine.currentQuestion !== payload.questionIndex ||
            !engine.puzzle
        ) {
            return;
        }

        const result = payload.result;

        if (!result) {

            console.error(
                "Puzzle Screen: Puzzle Result Missing"
            );

            return;

        }


        if (payload.activity && payload.activity.id === "mathSpatialSymmetry") {
            this.spatialScreenActivatedAt = 0;
            this.spatialUserInitiatedDragAt = 0;
        }

        console.log(
            "Puzzle Screen: Activity Ready Received",
            payload.activity
                ? payload.activity.id
                : null
        );


        this.show(
            result
        );

    },


    // =====================================
    // SHOW ROUTER
    // =====================================

    show: function (
        state
    ) {

        if (!state) {

            console.error(
                "Puzzle Screen: State Missing"
            );

            return;

        }


        // Jigsaw has its own dedicated screen and must not fall through
        // to the generic PuzzleScreen type switch.
        if (
            state.type === "jigsaw" &&
            typeof JigsawScreen !== "undefined" &&
            typeof JigsawScreen.show === "function"
        ) {
            JigsawScreen.show(state);
            return;
        }

        switch (
            state.type
        ) {

            case "ordering":

                this.showOrdering(
                    state
                );

                return;


            case "sequence":

                this.showSequence(
                    state
                );

                return;


            case "visualMath":

                this.showVisualMath(
                    state
                );

                return;


            case "inputOutput":

                this.showInputOutput(
                    state
                );

                return;


            case "sentence":

                this.showSentence(
                    state
                );

                return;


            case "grid":

                this.showGrid(
                    state
                );

                return;


            case "wordGrid":

                this.showWordGrid(
                    state
                );

                return;


            case "crossGrid":

                this.showCrossGrid(
                    state
                );

                return;

            case "pattern":

                this.showPattern(
                    state
                );

                return;

            case "spatial":

                this.showSpatial(
                    state
                );

                return;


            default:

                console.warn(
                    "Puzzle Screen: Unsupported Type:",
                    state.type
                );

        }

    },


    // =====================================
    // SPATIAL
    // =====================================

    showSpatial: function (state) {
        if (state && state.mode === "transform") {
            this.showSpatialTransform(state);
            return;
        }
        if (state && state.mode === "coordinatePlane") {
            this.showCoordinatePlane(state);
            return;
        }
        if (state && state.mode === "place") {
            this.showSpatialPlace(state);
            return;
        }

        if (state && state.mode === "symmetry") {
            this.showSpatialSymmetry(state);
            return;
        }

        this.showSpatialLegacy(state);
    },


    showSpatialTransform: function (state) {
        const app = this.getApp();
        if (!app) return;
        const system = state.coordinateSystem;
        const source = Array.isArray(state.points) ? state.points : [];
        const userPoints = Array.isArray(state.userPoints) ? state.userPoints : [];
        if (!system || typeof SpatialPuzzle === "undefined" || !source.length) {
            app.innerHTML = "<div class='screen puzzleScreen'><p>اطلاعات تبدیل هندسی معتبر نیست.</p></div>";
            return;
        }

        const width = 360, height = 300;
        const viewport = { left: 30, top: 20, right: 330, bottom: 270, width: 300, height: 250 };
        const toPixel = function (point) { return SpatialPuzzle.mathToPixel(point, system, viewport); };
        const parseCoordinate = function (raw) {
            let value = String(raw == null ? "" : raw).trim()
                .replace(/[۰-۹]/g, function (digit) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)); })
                .replace(/[٠-٩]/g, function (digit) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)); })
                .replace(/٫/g, ".").replace(/٬/g, "").replace(/−/g, "-");
            const glyphs = { "½": "1/2", "¼": "1/4", "¾": "3/4" };
            Object.keys(glyphs).forEach(function (glyph) {
                value = value.replace(glyph, " " + glyphs[glyph]);
            });
            const mixed = value.match(/^(-?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
            if (mixed) {
                const denominator = Number(mixed[4]);
                if (!denominator || Number(mixed[3]) >= denominator) return NaN;
                return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / denominator);
            }
            const fraction = value.match(/^(-?)\s*(\d+)\s*\/\s*(\d+)$/);
            if (fraction) {
                const denominator = Number(fraction[3]);
                return denominator ? (fraction[1] ? -1 : 1) * Number(fraction[2]) / denominator : NaN;
            }
            if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return NaN;
            return Number(value);
        };
        const formatCoordinate = function (number) {
            const value = Math.round(Number(number) * 4) / 4;
            const sign = value < 0 ? "−" : "";
            const absolute = Math.abs(value);
            const whole = Math.floor(absolute);
            const fraction = Math.round((absolute - whole) * 4);
            if (!fraction) return sign + whole;
            const parts = { 1: "¼", 2: "½", 3: "¾" };
            return sign + (whole ? whole + " " : "") + (parts[fraction] || String(absolute - whole));
        };
        const lines = [];
        const step = Number(system.unitStep);
        for (let x = system.xMin; x <= system.xMax + 1e-8; x += step) {
            const p = toPixel({ x: x, y: system.yMin });
            if (p) lines.push("<line x1='" + p.x + "' y1='" + viewport.top + "' x2='" + p.x + "' y2='" + viewport.bottom + "' stroke='#dbe3ec' />");
        }
        for (let y = system.yMin; y <= system.yMax + 1e-8; y += step) {
            const p = toPixel({ x: system.xMin, y: y });
            if (p) lines.push("<line x1='" + viewport.left + "' y1='" + p.y + "' x2='" + viewport.right + "' y2='" + p.y + "' stroke='#dbe3ec' />");
        }
        const xa = toPixel({ x: system.xMin, y: 0 }), xb = toPixel({ x: system.xMax, y: 0 });
        const ya = toPixel({ x: 0, y: system.yMin }), yb = toPixel({ x: 0, y: system.yMax });
        if (xa && xb) lines.push("<line x1='" + xa.x + "' y1='" + xa.y + "' x2='" + xb.x + "' y2='" + xb.y + "' stroke='#334155' stroke-width='2' />");
        if (ya && yb) lines.push("<line x1='" + ya.x + "' y1='" + ya.y + "' x2='" + yb.x + "' y2='" + yb.y + "' stroke='#334155' stroke-width='2' />");

        const sourcePixels = source.map(toPixel).filter(Boolean);
        let shape = "";
        if (sourcePixels.length > 1) {
            const coords = sourcePixels.map(function (p) { return p.x + "," + p.y; }).join(" ");
            shape = (sourcePixels.length >= 3
                ? "<polygon points='" + coords + "' fill='#2563eb' fill-opacity='.10' stroke='#2563eb' stroke-width='2' />"
                : "<polyline points='" + coords + "' fill='none' stroke='#2563eb' stroke-width='3' />");
        }
        const sourceMarkers = source.map(function (point, index) {
            const p = toPixel(point);
            return p ? "<circle cx='" + p.x + "' cy='" + p.y + "' r='5' fill='#2563eb' /><text x='" + (p.x + 7) + "' y='" + (p.y - 7) + "' font-size='12' fill='#1d4ed8'>" + String.fromCharCode(65 + index) + "</text>" : "";
        }).join("");
        const placed = userPoints.map(function (point, index) {
            if (!point) return "";
            const p = toPixel(point);
            return p ? "<circle cx='" + p.x + "' cy='" + p.y + "' r='6' fill='#ea580c' stroke='#fff' stroke-width='2' /><text x='" + (p.x + 7) + "' y='" + (p.y + 14) + "' font-size='12' fill='#c2410c'>" + String.fromCharCode(65 + index) + "′</text>" : "";
        }).join("");

        const operation = state.operation || {};
        let operationText = "تبدیل هندسی";
        if (operation.kind === "translate") operationText = "انتقال: " + (operation.dx >= 0 ? "+" : "") + operation.dx + " در راستای س، " + (operation.dy >= 0 ? "+" : "") + operation.dy + " در راستای ص";
        if (operation.kind === "rotate") operationText = "دوران " + operation.degrees + " درجه حول (" + operation.center.x + "، " + operation.center.y + ")";
        if (operation.kind === "reflectLine") operationText = "قرینه نسبت به خط گذرنده از (" + operation.lineStart.x + "، " + operation.lineStart.y + ") و (" + operation.lineEnd.x + "، " + operation.lineEnd.y + ")";
        if (operation.kind === "reflectPoint") operationText = "قرینه نسبت به نقطه (" + operation.center.x + "، " + operation.center.y + ")";
        const nextIndex = userPoints.findIndex(function (point) { return !point; });
        let activeIndex = nextIndex >= 0 ? nextIndex : 0;
        const outputText = source.map(function (_, index) {
            const point = userPoints[index];
            return String.fromCharCode(65 + index) + "′: " + (point ? "(" + formatCoordinate(point.x) + "، " + formatCoordinate(point.y) + ")" : "—");
        }).join("   ");
        const outputSelectors = source.map(function (_, index) {
            const point = userPoints[index];
            const letter = String.fromCharCode(65 + index) + "′";
            return "<section class='transformMatrixCard' data-transform-matrix='" + index + "'><h3 dir='ltr'>" + letter + "</h3><div class='transformMatrix' dir='ltr' aria-label='ماتریس مختصات " + letter + "'><label><span>x</span><input class='transformMatrixX' type='text' inputmode='decimal' placeholder='مثلاً 1.5 یا 1 1/2' value='" + (point ? formatCoordinate(point.x) : "") + "' aria-label='مختصات x نقطه " + letter + "' /></label><label><span>y</span><input class='transformMatrixY' type='text' inputmode='decimal' placeholder='مثلاً 1.5 یا 1 1/2' value='" + (point ? formatCoordinate(point.y) : "") + "' aria-label='مختصات y نقطه " + letter + "' /></label></div><button type='button' class='transformMatrixSubmit' data-transform-index='" + index + "'>" + (point ? "ثبت تغییرات" : "ثبت مختصات") + "</button></section>";
        }).join("");

        app.innerHTML = "<div class='screen puzzleScreen spatialScreen spatialTransformScreen' dir='rtl'><h1>تبدیل‌های هندسی</h1><p class='puzzleInstruction'>" + PuzzleScreen.escapeHTML(state.instruction || "مختصات هر نقطهٔ تبدیل‌شده را در ماتریس آن وارد کن.") + "</p><div class='transformOperation'>" + PuzzleScreen.escapeHTML(operationText) + "</div><div class='coordinatePlaneCanvas'><svg id='spatialTransformSvg' viewBox='0 0 " + width + " " + height + "' role='img' aria-label='نمایش صفحه مختصات؛ پاسخ را فقط در ماتریس‌ها وارد کن'>" + lines.join("") + shape + sourceMarkers + placed + "</svg></div><p id='spatialTransformStatus' class='coordinatePlaneStatus' aria-live='polite'>" + (nextIndex < 0 ? "همهٔ مختصات ثبت شده‌اند؛ می‌توانی آن‌ها را در ماتریس‌ها اصلاح کنی." : "مختصات x و y نقطهٔ " + String.fromCharCode(65 + nextIndex) + "′ را در ماتریس وارد کن.") + "</p><div class='transformMatrices'>" + outputSelectors + "</div><p class='transformCoordinates' dir='ltr'>" + PuzzleScreen.escapeHTML(outputText) + "</p><button id='spatialTransformCheckBtn' type='button' " + (nextIndex < 0 ? "" : "disabled") + ">بررسی پاسخ</button><div id='puzzleMessage' class='puzzleMessage'></div>" + this.renderStandardFooter(state.moves) + "</div><style>.transformOperation{max-width:480px;margin:10px auto;padding:10px 12px;border-radius:10px;background:#eef2ff;color:#3730a3;text-align:center;font-weight:600}.coordinatePlaneCanvas{width:100%;max-width:480px;margin:16px auto;padding:8px;box-sizing:border-box;background:#fff;border:1px solid #dbe3ec;border-radius:14px}.coordinatePlaneCanvas svg{display:block;width:100%;height:auto;touch-action:pan-y;cursor:default}.transformCoordinates{margin:10px auto;text-align:center;direction:ltr;unicode-bidi:isolate;line-height:1.9;font-size:14px;color:#334155;overflow-wrap:anywhere}.transformMatrices{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;max-width:480px;margin:14px auto}.transformMatrixCard{border:1px solid #cbd5e1;border-radius:12px;padding:10px;background:#f8fafc;text-align:center}.transformMatrixCard h3{margin:0 0 8px;font-size:16px;color:#1e293b}.transformMatrix{display:grid;gap:6px;width:max-content;margin:0 auto 10px;padding:6px 10px;position:relative;direction:ltr}.transformMatrix:before,.transformMatrix:after{content:'';position:absolute;top:0;bottom:0;width:5px;border-top:2px solid #475569;border-bottom:2px solid #475569}.transformMatrix:before{left:0;border-left:2px solid #475569}.transformMatrix:after{right:0;border-right:2px solid #475569}.transformMatrix label{display:grid;grid-template-columns:18px 64px;align-items:center;gap:5px}.transformMatrix label span{font-size:13px;color:#475569;text-align:center}.transformMatrix input{box-sizing:border-box;width:64px;min-height:38px;border:1px solid #94a3b8;border-radius:7px;background:#fff;text-align:center;direction:ltr;font-size:17px;padding:4px}.transformMatrixSubmit{border:1px solid #cbd5e1;border-radius:8px;padding:7px 10px;background:#fff;color:#334155}.spatialTransformScreen #spatialTransformCheckBtn{display:block;margin:12px auto;padding:10px 24px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:16px}.spatialTransformScreen #spatialTransformCheckBtn:disabled{opacity:.45}</style>";

        app.querySelectorAll(".transformMatrixSubmit").forEach(function (button) {
            button.addEventListener("click", function () {
                const index = Number(button.getAttribute("data-transform-index"));
                const card = button.closest(".transformMatrixCard");
                const xInput = card && card.querySelector(".transformMatrixX");
                const yInput = card && card.querySelector(".transformMatrixY");
                const status = app.querySelector("#spatialTransformStatus");
                if (!xInput || !yInput || xInput.value.trim() === "" || yInput.value.trim() === "") {
                    if (status) status.textContent = "هر دو خانهٔ x و y را برای نقطه وارد کن.";
                    return;
                }
                const x = parseCoordinate(xInput.value);
                const y = parseCoordinate(yInput.value);
                if (!Number.isFinite(x) || !Number.isFinite(y) ||
                    x < Number(system.xMin) || x > Number(system.xMax) ||
                    y < Number(system.yMin) || y > Number(system.yMax)) {
                    if (status) status.textContent = "مختصات را به‌صورت 1.5 یا 1 1/2 وارد کن و محدودهٔ صفحه را رعایت کن.";
                    return;
                }
                activeIndex = index;
                if (!PuzzleEngine.setTypeAnswer({ index: index, x: x, y: y })) {
                    if (status) status.textContent = "ثبت مختصات انجام نشد؛ دوباره تلاش کن.";
                    return;
                }
                PuzzleScreen.show(PuzzleEngine.getState());
            });
        });

        const check = app.querySelector("#spatialTransformCheckBtn");
        if (check) check.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (!check.disabled) {
                check.disabled = true;
                PuzzleEngine.check();
            }
        });
    },

    showCoordinatePlane: function (state) {
        const app = this.getApp();
        if (!app) return;
        const system = state.coordinateSystem;
        const task = state.task || {};
        if (!system || typeof SpatialPuzzle === "undefined") {
            app.innerHTML = "<div class='screen puzzleScreen'><p>اطلاعات صفحه مختصات معتبر نیست.</p></div>";
            return;
        }

        const width = 360, height = 300;
        const viewport = { left: 30, top: 20, right: 330, bottom: 270, width: 300, height: 250 };
        const xMin = Number(system.xMin), xMax = Number(system.xMax);
        const yMin = Number(system.yMin), yMax = Number(system.yMax);
        const step = Number(system.unitStep);
        const toPixel = function (point) {
            return SpatialPuzzle.mathToPixel(point, system, viewport);
        };
        const lines = [];
        for (let x = xMin; x <= xMax + 1e-8; x += step) {
            const p = toPixel({ x: x, y: yMin });
            if (p) lines.push("<line x1='" + p.x + "' y1='" + viewport.top + "' x2='" + p.x + "' y2='" + (viewport.top + viewport.height) + "' stroke='#dbe3ec' />");
        }
        for (let y = yMin; y <= yMax + 1e-8; y += step) {
            const p = toPixel({ x: xMin, y: y });
            if (p) lines.push("<line x1='" + viewport.left + "' y1='" + p.y + "' x2='" + (viewport.left + viewport.width) + "' y2='" + p.y + "' stroke='#dbe3ec' />");
        }

        const xa = toPixel({ x: xMin, y: 0 }), xb = toPixel({ x: xMax, y: 0 });
        const ya = toPixel({ x: 0, y: yMin }), yb = toPixel({ x: 0, y: yMax });
        if (xa && xb) lines.push("<line x1='" + xa.x + "' y1='" + xa.y + "' x2='" + xb.x + "' y2='" + xb.y + "' stroke='#334155' stroke-width='2' />");
        if (ya && yb) lines.push("<line x1='" + ya.x + "' y1='" + ya.y + "' x2='" + yb.x + "' y2='" + yb.y + "' stroke='#334155' stroke-width='2' />");

        let markers = "";
        if (task.kind === "readPoint" && task.target) {
            const p = toPixel(task.target);
            if (p) markers = "<circle cx='" + p.x + "' cy='" + p.y + "' r='6' fill='#2563eb' /><text x='" + (p.x + 8) + "' y='" + (p.y - 8) + "' font-size='12' fill='#1d4ed8'>A</text>";
        } else if (task.kind === "identifyPoint" && Array.isArray(task.points)) {
            markers = task.points.map(function (point) {
                const p = toPixel(point);
                return p ? "<circle cx='" + p.x + "' cy='" + p.y + "' r='5' fill='#2563eb' /><text x='" + (p.x + 7) + "' y='" + (p.y - 7) + "' font-size='12' fill='#1d4ed8'>" + PuzzleScreen.escapeHTML(point.label || point.id) + "</text>" : "";
            }).join("");
        }

        const selected = state.userAnswer;
        let selectionMarker = "";
        let selectionText = "برای انتخاب، روی صفحه مختصات لمس یا کلیک کن.";
        if (task.kind === "identifyPoint" && typeof selected === "string") {
            const selectedPoint = (task.points || []).find(function (point) { return String(point.id) === selected; });
            if (selectedPoint) {
                const p = toPixel(selectedPoint);
                if (p) selectionMarker = "<circle cx='" + p.x + "' cy='" + p.y + "' r='9' fill='none' stroke='#ea580c' stroke-width='3' />";
                selectionText = "نقطهٔ انتخاب‌شده: " + PuzzleScreen.escapeHTML(selectedPoint.label || selectedPoint.id);
            }
        } else if (selected && typeof selected === "object" && Number.isFinite(Number(selected.x)) && Number.isFinite(Number(selected.y))) {
            const p = toPixel(selected);
            if (p) selectionMarker = "<circle id='coordinatePlaneSelectionMarker' cx='" + p.x + "' cy='" + p.y + "' r='7' fill='#ea580c' stroke='#fff' stroke-width='2' />";
            selectionText = "مختصات انتخاب‌شده: (" + Number(selected.x) + "، " + Number(selected.y) + ")";
        }

        app.innerHTML = "<div class='screen puzzleScreen spatialScreen coordinatePlaneScreen' dir='rtl'><h1>صفحه مختصات</h1><p class='puzzleInstruction'>" + PuzzleScreen.escapeHTML(state.instruction || "نقاط و محورهای مختصات را بررسی کن.") + "</p><div class='coordinatePlaneCanvas'><svg id='coordinatePlaneSvg' viewBox='0 0 " + width + " " + height + "' role='img' aria-label='صفحه مختصات؛ برای انتخاب نقطه لمس یا کلیک کن'>" + lines.join("") + markers + selectionMarker + "</svg></div><div class='coordinateInputPanel'><div class='coordinateMatrix' role='group' aria-label='ماتریس مختصات دو در یک'><div class='coordinateMatrixBracket' aria-hidden='true'></div><div class='coordinateMatrixRows'><label for='coordinateXInput'><span>x</span><input id='coordinateXInput' type='number' inputmode='decimal' step='" + step + "' min='" + xMin + "' max='" + xMax + "' value='" + (selected && typeof selected === "object" && Number.isFinite(Number(selected.x)) ? Number(selected.x) : "") + "' aria-label='مؤلفهٔ x، خانهٔ بالای ماتریس' /></label><label for='coordinateYInput'><span>y</span><input id='coordinateYInput' type='number' inputmode='decimal' step='" + step + "' min='" + yMin + "' max='" + yMax + "' value='" + (selected && typeof selected === "object" && Number.isFinite(Number(selected.y)) ? Number(selected.y) : "") + "' aria-label='مؤلفهٔ y، خانهٔ پایین ماتریس' /></label></div><div class='coordinateMatrixBracket coordinateMatrixBracketRight' aria-hidden='true'></div></div><button id='coordinatePlaneMoveBtn' type='button'>انتقال نقطه</button></div><p id='coordinatePlaneStatus' class='coordinatePlaneStatus' aria-live='polite'>" + selectionText + "</p><button id='coordinatePlaneCheckBtn' type='button' " + (selected === undefined || selected === null ? "disabled" : "") + ">بررسی پاسخ</button><div id='puzzleMessage' class='puzzleMessage'></div>" + this.renderStandardFooter(state.moves) + "</div><style>.coordinatePlaneCanvas{width:100%;max-width:480px;margin:16px auto;padding:8px;box-sizing:border-box;background:#fff;border:1px solid #dbe3ec;border-radius:14px}.coordinatePlaneCanvas svg{display:block;width:100%;height:auto;touch-action:manipulation;cursor:crosshair}.coordinateInputPanel{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;margin:12px auto}.coordinateMatrix{display:flex;align-items:stretch;justify-content:center;gap:7px;padding:2px 0}.coordinateMatrixBracket{width:9px;min-height:94px;box-sizing:border-box;border:2px solid #334155;border-right:0;border-radius:5px 0 0 5px}.coordinateMatrixBracketRight{border:2px solid #334155;border-left:0;border-radius:0 5px 5px 0}.coordinateMatrixRows{display:grid;grid-template-rows:1fr 1fr;gap:7px}.coordinateMatrixRows label{display:grid;grid-template-columns:22px 76px;align-items:center;gap:7px;font-size:14px;font-weight:600;color:#334155}.coordinateMatrixRows label span{direction:ltr;text-align:center}.coordinateMatrixRows input{width:76px;min-height:40px;box-sizing:border-box;border:1px solid #94a3b8;border-radius:8px;padding:6px;font-size:18px;text-align:center;background:#fff;color:#0f172a}.coordinateInputPanel button{min-height:40px;border:0;border-radius:8px;background:#0f766e;color:#fff;padding:8px 14px;font-size:15px}.coordinatePlaneStatus{text-align:center;color:#475569;font-size:14px;min-height:24px}.coordinatePlaneScreen #coordinatePlaneCheckBtn{display:block;margin:12px auto;padding:10px 24px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:16px}.coordinatePlaneScreen #coordinatePlaneCheckBtn:disabled{opacity:.45;cursor:not-allowed}</style>";

        const svg = app.querySelector("#coordinatePlaneSvg");
        if (svg) svg.addEventListener("pointerdown", function (event) {
            if (event.button !== undefined && event.button !== 0) return;
            const rect = svg.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const pixel = {
                x: (event.clientX - rect.left) * width / rect.width,
                y: (event.clientY - rect.top) * height / rect.height
            };
            if (pixel.x < viewport.left || pixel.x > viewport.left + viewport.width ||
                pixel.y < viewport.top || pixel.y > viewport.top + viewport.height) return;

            let answer;
            if (task.kind === "identifyPoint") {
                let nearest = null, nearestDistance = Infinity;
                (task.points || []).forEach(function (point) {
                    const pointPixel = toPixel(point);
                    if (!pointPixel) return;
                    const distance = Math.hypot(pointPixel.x - pixel.x, pointPixel.y - pixel.y);
                    if (distance < nearestDistance) { nearest = point; nearestDistance = distance; }
                });
                if (!nearest || nearestDistance > 18) return;
                answer = { id: String(nearest.id) };
            } else {
                answer = SpatialPuzzle.pixelToMath(pixel, system, viewport);
                if (!answer) return;
                answer = SpatialPuzzle.snapCoordinatePoint(answer, system);
                if (!answer) return;
            }

            if (PuzzleEngine.setTypeAnswer(answer)) {
                const updatedState = PuzzleEngine.getState();
                const status = app.querySelector("#coordinatePlaneStatus");
                const check = app.querySelector("#coordinatePlaneCheckBtn");
                const previousMarker = app.querySelector("#coordinatePlaneSelectionMarker");
                if (previousMarker) previousMarker.remove();

                let marker = null;
                let statusText = "پاسخ انتخاب شد؛ حالا «بررسی پاسخ» را بزن.";
                if (task.kind === "identifyPoint") {
                    const id = String(answer.id);
                    const point = (task.points || []).find(function (item) {
                        return String(item.id) === id;
                    });
                    if (point) {
                        const p = toPixel(point);
                        if (p) {
                            marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                            marker.setAttribute("id", "coordinatePlaneSelectionMarker");
                            marker.setAttribute("cx", String(p.x));
                            marker.setAttribute("cy", String(p.y));
                            marker.setAttribute("r", "9");
                            marker.setAttribute("fill", "none");
                            marker.setAttribute("stroke", "#ea580c");
                            marker.setAttribute("stroke-width", "3");
                        }
                        statusText = "نقطهٔ انتخاب‌شده: " + (point.label || point.id);
                    }
                } else {
                    const p = toPixel(answer);
                    if (p) {
                        marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        marker.setAttribute("id", "coordinatePlaneSelectionMarker");
                        marker.setAttribute("cx", String(p.x));
                        marker.setAttribute("cy", String(p.y));
                        marker.setAttribute("r", "7");
                        marker.setAttribute("fill", "#ea580c");
                        marker.setAttribute("stroke", "#fff");
                        marker.setAttribute("stroke-width", "2");
                    }
                    statusText = "مختصات انتخاب‌شده: (" + Number(answer.x) + "، " + Number(answer.y) + ")";
                }

                if (marker) { marker.setAttribute("id", "coordinatePlaneSelectionMarker"); svg.appendChild(marker); }
                const xInput = app.querySelector("#coordinateXInput");
                const yInput = app.querySelector("#coordinateYInput");
                if (answer && typeof answer === "object" && answer.id === undefined) {
                    if (xInput) xInput.value = String(Number(answer.x));
                    if (yInput) yInput.value = String(Number(answer.y));
                }
                if (status) status.textContent = task.kind === "placePoint"
                    ? "نقطه جابه‌جا شد؛ اگر جای درستی است، پاسخ را بررسی کن."
                    : statusText;
                if (check) check.disabled = updatedState.userAnswer === undefined || updatedState.userAnswer === null;
            }
        });

        const moveButton = app.querySelector("#coordinatePlaneMoveBtn");
        if (moveButton) moveButton.addEventListener("click", function () {
            const xInput = app.querySelector("#coordinateXInput");
            const yInput = app.querySelector("#coordinateYInput");
            if (!xInput || !yInput || xInput.value.trim() === "" || yInput.value.trim() === "") return;
            const x = Number(xInput.value), y = Number(yInput.value);
            if (!Number.isFinite(x) || !Number.isFinite(y) || x < xMin || x > xMax || y < yMin || y > yMax) {
                const status = app.querySelector("#coordinatePlaneStatus");
                if (status) status.textContent = "مختصات باید داخل محدودهٔ شبکه باشد.";
                return;
            }
            const answer = SpatialPuzzle.snapCoordinatePoint({ x: x, y: y }, system);
            if (!answer || !PuzzleEngine.setTypeAnswer(answer)) return;
            const p = toPixel(answer);
            const previousMarker = app.querySelector("#coordinatePlaneSelectionMarker");
            if (previousMarker) previousMarker.remove();
            if (p) {
                const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                marker.setAttribute("id", "coordinatePlaneSelectionMarker");
                marker.setAttribute("cx", String(p.x)); marker.setAttribute("cy", String(p.y));
                marker.setAttribute("r", "7"); marker.setAttribute("fill", "#ea580c");
                marker.setAttribute("stroke", "#fff"); marker.setAttribute("stroke-width", "2");
                svg.appendChild(marker);
            }
            xInput.value = String(answer.x); yInput.value = String(answer.y);
            const status = app.querySelector("#coordinatePlaneStatus");
            if (status) status.textContent = "نقطه جابه‌جا شد؛ اگر جای درستی است، پاسخ را بررسی کن.";
            const check = app.querySelector("#coordinatePlaneCheckBtn");
            if (check) check.disabled = false;
        });

        const checkButton = app.querySelector("#coordinatePlaneCheckBtn");
        if (checkButton) {
            checkButton.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (checkButton.disabled) return;
                const currentState = PuzzleEngine.getState();
                if (!currentState || currentState.userAnswer === undefined || currentState.userAnswer === null) {
                    const status = app.querySelector("#coordinatePlaneStatus");
                    if (status) status.textContent = "ابتدا نقطه را روی شبکه انتخاب یا مختصات آن را وارد کن.";
                    checkButton.disabled = true;
                    return;
                }
                checkButton.disabled = true;
                PuzzleEngine.check();
            });
        }
    },

    showSpatialLegacy: function (state) {
        const app = this.getApp();
        if (!app) return;

        const grid = state.grid || {};
        const rows = Math.max(1, Number(grid.rows) || 1);
        const cols = Math.max(1, Number(grid.cols) || 1);
        const items = Array.isArray(state.items) ? state.items : [];
        const options = Array.isArray(state.options) ? state.options : [];
        const cells = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const item = items.find(function (entry) {
                    return entry && Number(entry.row) === row && Number(entry.col) === col;
                });
                cells.push("<div class=\"spatialCell\">" +
                    (item ? PuzzleScreen.escapeHTML(item.label || item.id || "") : "") +
                    "</div>");
            }
        }

        app.innerHTML =
            "<div class=\"screen puzzleScreen spatialScreen\" dir=\"rtl\">" +
                "<h1>درک فضایی</h1>" +
                "<p class=\"puzzleInstruction\">" + PuzzleScreen.escapeHTML(state.instruction) + "</p>" +
                (state.question ? "<div class=\"spatialQuestion\">" + PuzzleScreen.escapeHTML(state.question) + "</div>" : "") +
                "<div class=\"spatialGrid\" style=\"--spatial-cols:" + cols + "\">" + cells.join("") + "</div>" +
                "<div class=\"spatialOptions\">" +
                    options.map(function (option) {
                        const selected = PuzzleScreen.valuesEqualForDisplay(option, state.userAnswer) ? " selected" : "";
                        return "<button class=\"spatialOption" + selected + "\" data-answer=\"" + PuzzleScreen.escapeHTML(option) + "\">" + PuzzleScreen.escapeHTML(option) + "</button>";
                    }).join("") +
                "</div>" +
                "<button id=\"spatialCheckBtn\">بررسی پاسخ</button>" +
                "<div id=\"puzzleMessage\" class=\"puzzleMessage\"></div>" +
                this.renderStandardFooter(state.moves) +
            "</div>";

        app.querySelectorAll(".spatialOption").forEach(function (button) {
            button.addEventListener("click", function () {
                PuzzleEngine.setTypeAnswer(button.dataset.answer);
                PuzzleScreen.show(PuzzleEngine.getState());
            });
        });

        const checkButton = app.querySelector("#spatialCheckBtn");
        if (checkButton) checkButton.addEventListener("click", function () {
            PuzzleEngine.check();
        });
    },


    showSpatialPlace: function (state) {
        const app = this.getApp();
        if (!app) return;

        const grid = state.grid || {};
        const rows = Math.max(1, Number(grid.rows) || 1);
        const cols = Math.max(1, Number(grid.cols) || 1);
        const pieces = Array.isArray(state.pieces) ? state.pieces : [];
        const placements = state.placements || {};
        const placedByCell = {};

        pieces.forEach(function (piece) {
            const placement = placements[String(piece.id)];
            if (placement) {
                placedByCell[Number(placement.row) + ":" + Number(placement.col)] = piece;
            }
        });

        const cells = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const key = row + ":" + col;
                const piece = placedByCell[key];
                const targetPiece = pieces.find(function (entry) {
                    return entry &&
                        entry.target &&
                        Number(entry.target.row) === row &&
                        Number(entry.target.col) === col;
                });

                cells.push(
                    "<div class=\"spatialDropCell" + (piece ? " filled" : "") + (targetPiece && !piece ? " hasTarget" : "") + "\" data-row=\"" + row + "\" data-col=\"" + col + "\">" +
                        (piece
                            ? "<div class=\"spatialPlacedPiece\" data-piece-id=\"" + PuzzleScreen.escapeHTML(piece.id) + "\">" + PuzzleScreen.escapeHTML(piece.label || piece.id) + "</div>"
                            : targetPiece
                                ? "<div class=\"spatialTargetGhost\" aria-hidden=\"true\">" + PuzzleScreen.escapeHTML(targetPiece.label || targetPiece.id) + "</div>"
                                : "<span class=\"spatialSlotHint\"></span>") +
                    "</div>"
                );
            }
        }

        const tray = pieces.map(function (piece) {
            const placement = placements[String(piece.id)];
            if (placement) return "";
            return "<div class=\"spatialDragPiece\" data-piece-id=\"" + PuzzleScreen.escapeHTML(piece.id) + "\" tabindex=\"0\">" +
                PuzzleScreen.escapeHTML(piece.label || piece.id) +
            "</div>";
        }).join("");

        const placedCount = Object.keys(placements).filter(function (id) {
            return placements[id] !== null && placements[id] !== undefined;
        }).length;

        app.innerHTML =
            "<div class=\"screen puzzleScreen spatialScreen spatialPlaceScreen\" dir=\"rtl\">" +
                "<h1>جای درست شکل‌ها</h1>" +
                "<p class=\"puzzleInstruction\">هر شکل را روی جای هم‌شکل خودش قرار بده.</p>" +
                "<div class=\"spatialProgress\">" + placedCount + " از " + pieces.length + " شکل در صفحه قرار گرفته است</div>" +
                "<div class=\"spatialPlacementLayout\">" +
                    "<div class=\"spatialBoardWrap\">" +
                        "<div class=\"spatialBoard\" style=\"--spatial-cols:" + cols + "\">" + cells.join("") + "</div>" +
                    "</div>" +
                    "<div class=\"spatialTray\">" +
                        "<div class=\"spatialTrayTitle\">شکل‌ها</div>" +
                        "<div class=\"spatialTrayPieces\">" + tray + "</div>" +
                    "</div>" +
                "</div>" +
                "<button id=\"spatialPlaceCheckBtn\" class=\"spatialCheckButton\">بررسی چیدمان</button>" +
                "<div id=\"spatialPlaceMessage\" class=\"puzzleMessage\"></div>" +
                this.renderStandardFooter(state.moves) +
            "</div>";

        const beginDrag = function (pieceElement) {
            const pieceId = pieceElement.dataset.pieceId;
            if (!pieceId) return;

            const ghost = document.createElement("div");
            ghost.className = "spatialDragGhost";
            ghost.textContent = pieceElement.textContent || "";
            document.body.appendChild(ghost);

            const moveGhost = function (event) {
                ghost.style.left = (event.clientX - 32) + "px";
                ghost.style.top = (event.clientY - 32) + "px";
            };

            const finishDrag = function (event) {
                document.removeEventListener("pointermove", moveGhost);
                document.removeEventListener("pointerup", finishDrag);
                ghost.remove();

                const target = document.elementFromPoint(event.clientX, event.clientY);
                const cell = target && target.closest ? target.closest(".spatialDropCell") : null;

                if (cell && app.contains(cell)) {
                    PuzzleEngine.setTypeAnswer({
                        pieceId: pieceId,
                        row: Number(cell.dataset.row),
                        col: Number(cell.dataset.col)
                    });
                    PuzzleScreen.show(PuzzleEngine.getState());
                }
            };

            document.addEventListener("pointermove", moveGhost);
            document.addEventListener("pointerup", finishDrag, { once: true });
            moveGhost(event);
        };

        app.querySelectorAll(".spatialDragPiece, .spatialPlacedPiece").forEach(function (pieceElement) {
            pieceElement.addEventListener("pointerdown", function (event) {
                event.preventDefault();
                beginDrag(pieceElement);
            });
        });

        const checkButton = app.querySelector("#spatialPlaceCheckBtn");
        if (checkButton) {
            checkButton.addEventListener("click", function () {
                const correct = PuzzleEngine.check();
                if (!correct) {
                    const message = app.querySelector("#spatialPlaceMessage");
                    if (message) message.textContent = "هنوز همه شکل‌ها در جای درست نیستند.";
                }
            });
        }
    },


    // =====================================
    // ORDERING
    // =====================================

    showOrdering: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        this.currentOrder =
            Array.isArray(
                state.items
            )
                ? [
                    ...state.items
                ]
                : [];


        const itemsHTML =
            this.currentOrder
                .map(
                    function (
                        item,
                        index
                    ) {

                        if (
                            state.dataType ===
                            "image"
                        ) {

                            return `

                                <button
                                    class="puzzleItem puzzleImageItem"
                                    data-index="${index}">

                                    <img
                                        src="${item}"
                                        alt="پازل"
                                        draggable="false">

                                </button>

                            `;

                        }


                        return `

                            <button
                                class="puzzleItem"
                                data-index="${index}">

                                ${PuzzleScreen.escapeHTML(
                                    item
                                )}

                            </button>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل مرتب‌سازی
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    id="puzzleItems"
                    class="puzzleItems"
                    dir="ltr">

                    ${itemsHTML}

                </div>

                <div
                    class="puzzleControls">

                    <button
                        id="puzzleCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

                <div class="puzzleMoves">

                    حرکت‌ها:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindOrderingEvents();

    },


    // =====================================
    // SEQUENCE
    // =====================================

    showSequence: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const itemsHTML =
            state.items
                .map(
                    function (
                        item,
                        index
                    ) {

                        if (
                            index ===
                            state.missingIndex
                        ) {

                            return `

                                <span
                                    class="sequenceMissing">

                                    ؟

                                </span>

                            `;

                        }


                        return `

                            <span
                                class="sequenceItem">

                                ${PuzzleScreen.escapeHTML(
                                    item
                                )}

                            </span>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    دنباله
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="sequenceItems"
                    dir="ltr">

                    ${itemsHTML}

                </div>

                <div
                    class="sequenceAnswerArea">

                    <input
                        id="sequenceAnswerInput"
                        type="number"
                        inputmode="numeric"
                        placeholder="پاسخ"
                        autocomplete="off">

                    <button
                        id="sequenceCheckBtn">

                        بررسی پاسخ

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

                <button
                    id="puzzleResetBtn">

                    شروع دوباره

                </button>

                <div class="puzzleMoves">

                    تلاش:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindSequenceEvents();

    },


    // =====================================
    // VISUAL MATH
    // =====================================

    showVisualMath: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const operation =
            state.operation;


        const groups =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        if (
            !groups.length
        ) {

            this.showUnsupported(
                "محتوای پازل تصویری وجود ندارد."
            );

            return;

        }


        // =================================
        // COUNTING
        // =================================

        if (
            operation ===
            "counting"
        ) {

            const group =
                this.renderVisualGroup(
                    groups[0]
                );


            app.innerHTML = `

                <div
                    class="screen puzzleScreen visualMathScreen"
                    dir="rtl">

                    <h1>
                        شمارش تصویری
                    </h1>

                    <p class="puzzleInstruction">
                        ${PuzzleScreen.escapeHTML(
                            state.instruction
                        )}
                    </p>

                    <div
                        class="visualMathCountingGroup"
                        dir="ltr">

                        ${group}

                    </div>

                    <div
                        class="visualMathAnswerArea">

                        <input
                            id="visualMathAnswerInput"
                            type="number"
                            inputmode="numeric"
                            min="0"
                            placeholder="پاسخ"
                            autocomplete="off">

                        <button
                            id="visualMathCheckBtn">

                            بررسی پاسخ

                        </button>

                    </div>

                    ${this.renderStandardFooter(
                        state.moves
                    )}

                </div>

            `;


            this.bindVisualMathEvents();

            return;

        }


        // =================================
        // COMPARISON
        // =================================

        if (
            operation ===
            "comparison"
        ) {

            const first =
                this.renderVisualGroup(
                    groups[0]
                );


            const second =
                this.renderVisualGroup(
                    groups[1]
                );


            app.innerHTML = `

                <div
                    class="screen puzzleScreen visualMathScreen"
                    dir="rtl">

                    <h1>
                        مقایسه تصویری
                    </h1>

                    <p class="puzzleInstruction">
                        ${PuzzleScreen.escapeHTML(
                            state.instruction
                        )}
                    </p>

                    <div
                        class="visualComparisonArea">

                        <div class="visualComparisonGroup">
                            ${first}
                        </div>

                        <div
                            class="visualComparisonSeparator">

                            ؟

                        </div>

                        <div class="visualComparisonGroup">
                            ${second}
                        </div>

                    </div>

                    <div
                        class="visualComparisonChoices">

                        <button
                            class="visualComparisonBtn"
                            data-answer="left">

                            گروه اول

                        </button>

                        <button
                            class="visualComparisonBtn"
                            data-answer="equal">

                            برابر

                        </button>

                        <button
                            class="visualComparisonBtn"
                            data-answer="right">

                            گروه دوم

                        </button>

                    </div>

                    ${this.renderStandardFooter(
                        state.moves
                    )}

                </div>

            `;


            this.bindVisualComparisonEvents();

            return;

        }


        // =================================
        // ADDITION / SUBTRACTION
        // =================================

        if (
            groups.length !== 2
        ) {

            this.showUnsupported(
                "ساختار جمع یا تفریق تصویری نامعتبر است."
            );

            return;

        }


        const firstGroup =
            this.renderVisualGroup(
                groups[0]
            );


        const secondGroup =
            this.renderVisualGroup(
                groups[1]
            );


        const operator =
            operation ===
            "subtraction"
                ? "−"
                : "+";


        const title =
            operation ===
            "subtraction"
                ? "تفریق تصویری"
                : "جمع تصویری";


        app.innerHTML = `

            <div
                class="screen puzzleScreen visualMathScreen"
                dir="rtl">

                <h1>
                    ${title}
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="visualMathEquation"
                    dir="ltr">

                    <div class="visualMathGroup">
                        ${firstGroup}
                    </div>

                    <div class="visualMathOperator">
                        ${operator}
                    </div>

                    <div class="visualMathGroup">
                        ${secondGroup}
                    </div>

                    <div class="visualMathOperator">
                        =
                    </div>

                    <div class="visualMathQuestion">
                        ؟
                    </div>

                </div>

                <div
                    class="visualMathAnswerArea">

                    <input
                        id="visualMathAnswerInput"
                        type="number"
                        inputmode="numeric"
                        min="0"
                        placeholder="پاسخ"
                        autocomplete="off">

                    <button
                        id="visualMathCheckBtn">

                        بررسی پاسخ

                    </button>

                </div>

                ${this.renderStandardFooter(
                    state.moves
                )}

            </div>

        `;


        this.bindVisualMathEvents();

    },


    // =====================================
    // INPUT / OUTPUT
    // =====================================

    showInputOutput: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const inputs =
            Array.isArray(
                state.inputs
            )
                ? state.inputs
                : [];


        const outputs =
            Array.isArray(
                state.outputs
            )
                ? state.outputs
                : [];


        const rows =
            inputs
                .map(
                    function (
                        input,
                        index
                    ) {

                        const output =
                            outputs[index];


                        const outputHTML =
                            index ===
                            state.missingIndex

                                ?

                                `

                                <input
                                    class="ioAnswerInput"
                                    data-index="${index}"
                                    type="number"
                                    inputmode="numeric"
                                    autocomplete="off"
                                    placeholder="؟">

                                `

                                :

                                `

                                <span
                                    class="ioOutputValue">

                                    ${PuzzleScreen.escapeHTML(
                                        output
                                    )}

                                </span>

                                `;


                        return `

                            <div
                                class="ioRow">

                                <span
                                    class="ioInputValue">

                                    ${PuzzleScreen.escapeHTML(
                                        input
                                    )}

                                </span>

                                <span
                                    class="ioArrow">

                                    ←

                                </span>

                                ${outputHTML}

                            </div>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    ماشین ورودی و خروجی
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="ioMachine">

                    ${rows}

                </div>

                <div
                    class="puzzleControls">

                    <button
                        id="ioCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

                <div class="puzzleMoves">

                    تلاش:
                    <span id="puzzleMoveCount">
                        ${state.moves || 0}
                    </span>

                </div>

            </div>

        `;


        this.bindInputOutputEvents();

    },


    // =====================================
    // SENTENCE
    // =====================================

    showSentence: function (
        state
    ) {

        if (
            state.mode ===
            "sentenceGrammar"
        ) {

            this.showSentenceGrammar(
                state
            );

            return;

        }


        this.showSentenceOrder(
            state
        );

    },


    // =====================================
    // SENTENCE ORDER
    // =====================================

    showSentenceOrder: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const words =
            Array.isArray(
                state.words
            )
                ? state.words
                : [];


        const indexes =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const wordHTML =
            indexes
                .map(
                    function (
                        wordIndex,
                        position
                    ) {

                        const word =
                            words[
                                wordIndex
                            ];


                        return `

                            <button
                                class="sentenceWord"
                                data-index="${position}">

                                ${PuzzleScreen.escapeHTML(
                                    word
                                )}

                            </button>

                        `;

                    }
                )
                .join("");


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    جمله‌سازی
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    id="sentenceWords"
                    class="sentenceWords">

                    ${wordHTML}

                </div>

                <div
                    class="sentencePreview"
                    id="sentencePreview">
                </div>

                <div class="puzzleControls">

                    <button
                        id="sentenceCheckBtn">

                        بررسی جمله

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

            </div>

        `;


        this.bindSentenceOrderEvents();

    },


    // =====================================
    // SENTENCE GRAMMAR
    // =====================================

    showSentenceGrammar: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const words =
            Array.isArray(
                state.words
            )
                ? state.words
                : [];


        const answers =
            Array.isArray(
                state.answers
            )
                ? state.answers
                : [];


        const targets =
            Array.isArray(
                state.targets
            )
                ? state.targets
                : [];


        let targetHTML =
            "";


        const roleOptions = [

            {
                value: "subject",
                label: "نهاد"
            },

            {
                value: "predicate",
                label: "گزاره"
            },

            {
                value: "verb",
                label: "فعل"
            },

            {
                value: "object",
                label: "مفعول"
            },

            {
                value: "adjective",
                label: "صفت"
            },

            {
                value: "adverb",
                label: "قید"
            }

        ];


        targets.forEach(
            function (
                target,
                index
            ) {

                const wordIndex =
                    Number(
                        target
                    );


                const word =
                    words[
                        wordIndex
                    ];


                const currentAnswer =
                    answers[index] ||
                    "";


                const optionsHTML =
                    roleOptions
                        .map(
                            function (
                                option
                            ) {

                                return `

                                    <option
                                        value="${option.value}"
                                        ${
                                            currentAnswer ===
                                            option.value
                                                ? "selected"
                                                : ""
                                        }>

                                        ${option.label}

                                    </option>

                                `;

                            }
                        )
                        .join("");


                targetHTML += `

                    <div
                        class="grammarRow">

                        <span
                            class="grammarWord">

                            ${PuzzleScreen.escapeHTML(
                                word
                            )}

                        </span>

                        <select
                            class="grammarSelect"
                            data-target-index="${index}">

                            <option value="">
                                انتخاب نقش
                            </option>

                            ${optionsHTML}

                        </select>

                    </div>

                `;

            }
        );


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    نقش دستوری
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="grammarRows">

                    ${targetHTML}

                </div>

                <div class="puzzleControls">

                    <button
                        id="grammarCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

            </div>

        `;


        this.bindSentenceGrammarEvents();

    },


    // =====================================
    // PATTERN
    // =====================================

    showPattern: function (state) {
        const app = this.getApp();
        if (!app) return;

        const items = Array.isArray(state.items) ? state.items : [];
        const options = Array.isArray(state.options) ? state.options : [];
        const selected = state.userAnswer === null || state.userAnswer === undefined
            ? ""
            : String(state.userAnswer);

        const toPersianDigits = function (value) {
            return String(value === null || value === undefined ? "" : value)
                .replace(/[0-9]/g, function (digit) {
                    return "۰۱۲۳۴۵۶۷۸۹"[Number(digit)];
                });
        };

        const renderValue = function (value) {
            if (value === null || value === undefined || value === "") return "؟";
            return PuzzleScreen.escapeHTML(toPersianDigits(value));
        };

        const itemsHTML = items.map(function (item, index) {
            const missing = index === Number(state.missingIndex);
            const arrow = index < items.length - 1
                ? "<span class=\"patternArrow\" aria-hidden=\"true\">←</span>"
                : "";

            return "<div class=\"patternStep\">" +
                "<div class=\"patternItem " + (missing ? "patternMissing" : "") + "\">" +
                    renderValue(item) +
                "</div>" +
                arrow +
            "</div>";
        }).join("");

        const optionsHTML = options.map(function (option) {
            const value = String(option);
            const selectedClass = selected === value ? " selected" : "";

            return "<button type=\"button\" class=\"patternOption" + selectedClass +
                "\" data-pattern-value=\"" + PuzzleScreen.escapeHTML(value) + "\">" +
                renderValue(option) +
            "</button>";
        }).join("");

        app.innerHTML =
            "<div class=\"screen puzzleScreen patternScreen\" dir=\"rtl\">" +
                "<div class=\"patternCard\">" +
                    "<div class=\"patternHeader\">" +
                        "<div class=\"patternBadge\">پازل الگو</div>" +
                        "<h1>الگو را کشف کن</h1>" +
                        "<p class=\"puzzleInstruction\">" +
                            PuzzleScreen.escapeHTML(state.instruction) +
                        "</p>" +
                    "</div>" +

                    "<div class=\"patternBoard\" aria-label=\"الگوی عددی\">" +
                        itemsHTML +
                    "</div>" +

                    "<div class=\"patternPrompt\">" +
                        "<span>عدد مناسب برای جای خالی را انتخاب کن</span>" +
                    "</div>" +

                    "<div class=\"patternOptions\">" +
                        optionsHTML +
                    "</div>" +

                    "<div class=\"puzzleControls patternControls\">" +
                        "<button type=\"button\" id=\"patternCheckBtn\">بررسی پاسخ</button>" +
                        "<button type=\"button\" id=\"puzzleResetBtn\">شروع دوباره</button>" +
                    "</div>" +

                    "<div id=\"puzzleMessage\" class=\"puzzleMessage\"></div>" +
                "</div>" +
            "</div>" +

            "<style>" +
                ".patternScreen{width:min(900px,100%);margin:0 auto;padding:24px 14px 40px;}" +
                ".patternCard{width:min(820px,100%);margin:0 auto;padding:24px 18px 28px;background:var(--ui-surface,#fff);border:1px solid var(--ui-border,#dbe4ef);border-radius:24px;box-shadow:var(--ui-shadow-card,0 7px 20px rgba(31,41,55,.06));text-align:center;}" +
                ".patternHeader h1{margin:8px 0 6px;font-size:clamp(25px,4vw,34px);color:var(--ui-text,#172033);}" +
                ".patternBadge{display:inline-block;padding:6px 14px;border-radius:999px;background:var(--ui-surface-soft,#f8fbff);border:1px solid var(--ui-border-soft,#e4e9f0);font-size:14px;color:var(--ui-muted,#667085);}" +
                ".patternHeader .puzzleInstruction{max-width:650px;margin:8px auto 22px;line-height:1.9;color:var(--ui-muted,#667085);}" +
                ".patternBoard{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin:10px auto 22px;padding:18px 12px;border-radius:20px;background:var(--ui-surface-soft,#f8fbff);border:1px solid var(--ui-border-soft,#e4e9f0);direction:rtl;}" +
                ".patternStep{display:flex;align-items:center;gap:8px;}" +
                ".patternItem{min-width:64px;height:64px;padding:0 12px;display:flex;align-items:center;justify-content:center;border:2px solid var(--ui-border,#dbe4ef);border-radius:16px;background:#fff;font-family:\"Tahouri Yekan\",\"B Yekan\",Tahoma,sans-serif;font-size:clamp(25px,5vw,34px);font-weight:700;color:var(--ui-text,#172033);box-shadow:0 3px 8px rgba(31,41,55,.06);}" +
                ".patternMissing{border-style:dashed;font-size:34px;color:var(--ui-muted,#667085);background:var(--ui-surface-soft,#f8fbff);}" +
                ".patternArrow{font-size:25px;color:var(--ui-muted,#667085);line-height:1;}" +
                ".patternPrompt{margin:4px auto 12px;font-size:16px;color:var(--ui-muted,#667085);}" +
                ".patternOptions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:0 auto 20px;}" +
                ".patternOption{min-width:76px;height:58px;padding:0 18px;border:2px solid var(--ui-border,#dbe4ef);border-radius:15px;background:#fff;font-family:\"Tahouri Yekan\",\"B Yekan\",Tahoma,sans-serif;font-size:24px;font-weight:700;color:var(--ui-text,#172033);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;}" +
                ".patternOption:hover{transform:translateY(-2px);box-shadow:0 5px 12px rgba(31,41,55,.09);}" +
                ".patternOption.selected{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.14);}" +
                ".patternControls{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;}" +
                ".patternControls button{min-width:130px;}" +
                "@media(max-width:600px){.patternCard{padding:18px 10px 24px;border-radius:20px}.patternBoard{gap:5px;padding:14px 6px}.patternStep{gap:5px}.patternItem{min-width:52px;height:54px;padding:0 8px}.patternArrow{font-size:19px}.patternOption{min-width:64px;height:52px;padding:0 14px}}" +
            "</style>";

        app.querySelectorAll(".patternOption").forEach(function (button) {
            button.onclick = function () {
                PuzzleEngine.setTypeAnswer(this.dataset.patternValue);
                app.querySelectorAll(".patternOption").forEach(function (item) {
                    item.classList.remove("selected");
                });
                this.classList.add("selected");
            };
        });

        const check = app.querySelector("#patternCheckBtn");
        if (check) {
            check.onclick = function () {
                PuzzleScreen.checkPuzzle();
            };
        }

        this.bindResetButton();
    },

    // =====================================
    // GRID
    // =====================================

    showGrid: function (
        state
    ) {

        this.showGenericGrid(
            state,
            "grid",
            "جدول عددی"
        );

    },


    // =====================================
    // WORD GRID
    // =====================================

    showWordGrid: function (
        state
    ) {

        this.showGenericGrid(
            state,
            "wordGrid",
            "جدول واژه‌ها"
        );

    },


    // =====================================
    // GENERIC GRID
    // =====================================

    showGenericGrid: function (
        state,
        type,
        title
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const rows =
            Number(
                state.rows
            );


        const cols =
            Number(
                state.cols
            );


        const cells =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const missing =
            Array.isArray(
                state.missingIndices
            )
                ? state.missingIndices
                : [];


        let html =
            "";


        for (
            let row = 0;

            row < rows;

            row++
        ) {

            for (
                let col = 0;

                col < cols;

                col++
            ) {

                const index =
                    (
                        row *
                        cols
                    )
                    +
                    col;


                const value =
                    cells[
                        index
                    ];


                if (
                    missing.includes(
                        index
                    )
                ) {

                    const inputType =
                        type ===
                        "wordGrid"
                            ? "text"
                            : "number";


                    html += `

                        <div
                            class="gridCell gridMissing">

                            <input
                                class="gridAnswerInput"
                                data-index="${index}"
                                type="${inputType}"
                                ${
                                    type ===
                                    "wordGrid"
                                        ? ""
                                        : 'inputmode="numeric"'
                                }
                                value=""
                                autocomplete="off"
                                placeholder="؟">

                        </div>

                    `;

                }

                else {

                    html += `

                        <div
                            class="gridCell">

                            ${PuzzleScreen.escapeHTML(
                                value
                            )}

                        </div>

                    `;

                }

            }

        }


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    ${title}
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="genericGrid"
                    style="--grid-cols:${cols}">

                    ${html}

                </div>

                <div
                    class="puzzleControls">

                    <button
                        id="gridCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

            </div>

        `;


        this.bindGridEvents(
            type
        );

    },


    // =====================================
    // CROSS GRID
    // =====================================

    showCrossGrid: function (
        state
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        const rows =
            Number(
                state.rows
            );


        const cols =
            Number(
                state.cols
            );


        const items =
            Array.isArray(
                state.items
            )
                ? state.items
                : [];


        const cells =
            Array.isArray(
                state.cells
            )
                ? state.cells
                : [];


        const missing =
            Array.isArray(
                state.missingIndices
            )
                ? state.missingIndices
                : [];


        let html =
            "";


        for (
            let row = 0;

            row < rows;

            row++
        ) {

            for (
                let col = 0;

                col < cols;

                col++
            ) {

                const index =
                    (
                        row *
                        cols
                    )
                    +
                    col;


                const cell =
                    cells[
                        index
                    ] ||
                    {};


                const value =
                    items[
                        index
                    ];


                // =================================
                // OPERATION CELL
                // =================================

                if (
                    cell.type ===
                    "operation"
                ) {

                    const operator =
                        cell.operator ||
                        cell.value ||
                        "";


                    html += `

                        <div
                            class="crossGridCell crossOperationCell">

                            ${PuzzleScreen.escapeHTML(
                                operator
                            )}

                        </div>

                    `;


                    continue;

                }


                // =================================
                // BLOCK
                // =================================

                if (
                    cell.type ===
                    "blocked"
                ) {

                    html += `

                        <div
                            class="crossGridCell crossBlockedCell">
                        </div>

                    `;


                    continue;

                }


                // =================================
                // MISSING
                // =================================

                if (
                    missing.includes(
                        index
                    )
                ) {

                    html += `

                        <div
                            class="crossGridCell crossMissingCell">

                            <input
                                class="crossGridAnswerInput"
                                data-index="${index}"
                                type="number"
                                inputmode="numeric"
                                autocomplete="off"
                                placeholder="?">

                        </div>

                    `;


                    continue;

                }


                // =================================
                // VALUE
                // =================================

                html += `

                    <div
                        class="crossGridCell">

                        ${
                            value !==
                            null &&
                            value !==
                            undefined

                                ?

                                PuzzleScreen.escapeHTML(
                                    value
                                )

                                :

                                "·"
                        }

                    </div>

                `;

            }

        }


        const pathsInfo =
            this.renderCrossGridPaths(
                state
            );


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل شبکه‌ای
                </h1>

                <p class="puzzleInstruction">
                    ${PuzzleScreen.escapeHTML(
                        state.instruction
                    )}
                </p>

                <div
                    class="crossGridContainer"
                    style="--grid-cols:${cols}">

                    ${html}

                </div>

                ${
                    pathsInfo
                }

                <div
                    class="puzzleControls">

                    <button
                        id="crossGridCheckBtn">

                        بررسی پاسخ

                    </button>

                    <button
                        id="puzzleResetBtn">

                        شروع دوباره

                    </button>

                </div>

                <div
                    id="puzzleMessage"
                    class="puzzleMessage">
                </div>

            </div>

        `;


        this.bindCrossGridEvents();

    },


    // =====================================
    // CROSS GRID PATHS
    // =====================================

    renderCrossGridPaths: function (
        state
    ) {

        const paths = [

            ...(
                Array.isArray(
                    state.horizontalPaths
                )
                    ? state.horizontalPaths
                    : []
            ),

            ...(
                Array.isArray(
                    state.verticalPaths
                )
                    ? state.verticalPaths
                    : []
            ),

            ...(
                Array.isArray(
                    state.paths
                )
                    ? state.paths
                    : []
            )

        ];


        if (
            paths.length === 0
        ) {

            return "";

        }


        const unique = [];


        paths.forEach(
            function (
                path
            ) {

                if (!path) {

                    return;

                }


                const id =
                    path.id ||
                    (
                        path.direction +
                        "_" +
                        path.index
                    );


                if (
                    unique.some(
                        function (
                            item
                        ) {

                            return (
                                item.id ===
                                id
                            );

                        }
                    )
                ) {

                    return;

                }


                unique.push({

                    id:
                        id,

                    direction:
                        path.direction ||
                        "",

                    rule:
                        path.rule ||
                        "",

                    operation:
                        path.operation ||
                        ""

                });

            }
        );


        return `

            <div
                class="crossGridPaths">

                ${
                    unique
                        .map(
                            function (
                                path
                            ) {

                                const label =

                                    path.operation ||
                                    path.rule ||
                                    path.direction;


                                return `

                                    <span
                                        class="crossGridPathTag">

                                        ${PuzzleScreen.escapeHTML(
                                            label
                                        )}

                                    </span>

                                `;

                            }
                        )
                        .join("")
                }

            </div>

        `;

    },


    // =====================================
    // VISUAL GROUP
    // =====================================

    renderVisualGroup: function (
        group
    ) {

        if (!group) {

            return "";

        }


        const image =
            group.image;


        const count =
            Number(
                group.count
            ) || 0;


        let html =
            "";


        for (
            let i = 0;

            i < count;

            i++
        ) {

            html += `

                <img
                    class="visualMathImage"
                    src="${image}"
                    alt="شکل"
                    draggable="false">

            `;

        }


        return html;

    },


    // =====================================
    // ORDERING EVENTS
    // =====================================

    bindOrderingEvents: function () {

        const container =
            document.getElementById(
                "puzzleItems"
            );


        if (!container) {

            return;

        }


        let selectedIndex =
            null;


        container
            .querySelectorAll(
                ".puzzleItem"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            const index =
                                Number(
                                    this.dataset.index
                                );


                            if (
                                selectedIndex ===
                                null
                            ) {

                                selectedIndex =
                                    index;


                                this.classList.add(
                                    "selected"
                                );


                                return;

                            }


                            if (
                                selectedIndex ===
                                index
                            ) {

                                this.classList.remove(
                                    "selected"
                                );


                                selectedIndex =
                                    null;


                                return;

                            }


                            const temp =
                                PuzzleScreen
                                    .currentOrder[
                                        selectedIndex
                                    ];


                            PuzzleScreen
                                .currentOrder[
                                    selectedIndex
                                ] =
                                PuzzleScreen
                                    .currentOrder[
                                        index
                                    ];


                            PuzzleScreen
                                .currentOrder[
                                    index
                                ] =
                                temp;


                            PuzzleEngine.setOrder(
                                PuzzleScreen.currentOrder
                            );


                            selectedIndex =
                                null;


                            PuzzleScreen.renderState();

                        };

                }
            );


        const checkBtn =
            document.getElementById(
                "puzzleCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // SEQUENCE EVENTS
    // =====================================

    bindSequenceEvents: function () {

        const input =
            document.getElementById(
                "sequenceAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "sequenceCheckBtn"
            );


        if (
            input &&
            checkBtn
        ) {

            const submit =
                function () {

                    if (
                        input.value ===
                        ""
                    ) {

                        PuzzleScreen.showMessage(
                            "لطفاً پاسخ را وارد کن."
                        );


                        input.focus();


                        return;

                    }


                    PuzzleEngine.setSequenceAnswer(
                        Number(
                            input.value
                        )
                    );


                    PuzzleScreen.checkPuzzle();

                };


            checkBtn.onclick =
                submit;


            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // VISUAL MATH EVENTS
    // =====================================

    bindVisualMathEvents: function () {

        const input =
            document.getElementById(
                "visualMathAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "visualMathCheckBtn"
            );


        if (
            input &&
            checkBtn
        ) {

            const submit =
                function () {

                    if (
                        input.value ===
                        ""
                    ) {

                        PuzzleScreen.showMessage(
                            "لطفاً پاسخ را وارد کن."
                        );


                        input.focus();


                        return;

                    }


                    PuzzleEngine.setVisualMathAnswer(
                        Number(
                            input.value
                        )
                    );


                    PuzzleScreen.checkPuzzle();

                };


            checkBtn.onclick =
                submit;


            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // COMPARISON EVENTS
    // =====================================

    bindVisualComparisonEvents: function () {

        const buttons =
            document.querySelectorAll(
                ".visualComparisonBtn"
            );


        buttons.forEach(
            function (
                button
            ) {

                button.onclick =
                    function () {

                        const answer =
                            this.dataset.answer;


                        buttons.forEach(
                            function (
                                item
                            ) {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                        this.classList.add(
                            "selected"
                        );


                        PuzzleEngine
                            .setVisualMathAnswer(
                                answer
                            );


                        PuzzleScreen
                            .checkPuzzle();

                    };

            }
        );


        this.bindResetButton();

    },


    // =====================================
    // INPUT / OUTPUT EVENTS
    // =====================================

    bindInputOutputEvents: function () {

        const input =
            document.querySelector(
                ".ioAnswerInput"
            );


        const checkBtn =
            document.getElementById(
                "ioCheckBtn"
            );


        const submit =
            function () {

                if (
                    !input
                    ||
                    input.value ===
                    ""
                ) {

                    PuzzleScreen.showMessage(
                        "لطفاً خروجی را وارد کن."
                    );


                    if (input) {

                        input.focus();

                    }


                    return;

                }


                PuzzleEngine.setGenericAnswer(
                    Number(
                        input.value
                    )
                );


                PuzzleScreen.checkPuzzle();

            };


        if (checkBtn) {

            checkBtn.onclick =
                submit;

        }


        if (input) {

            input.onkeydown =
                function (
                    event
                ) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        submit();

                    }

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // SENTENCE ORDER EVENTS
    // =====================================

    bindSentenceOrderEvents: function () {

        const container =
            document.getElementById(
                "sentenceWords"
            );


        if (!container) {

            return;

        }


        let order =
            Array.isArray(
                PuzzleEngine.items
            )
                ? [
                    ...PuzzleEngine.items
                ]
                : [];


        const render =
            function () {

                const preview =
                    document.getElementById(
                        "sentencePreview"
                    );


                if (!preview) {

                    return;

                }


                const words =
                    PuzzleEngine.puzzle &&
                    Array.isArray(
                        PuzzleEngine.puzzle.words
                    )
                        ? PuzzleEngine.puzzle.words
                        : [];


                preview.textContent =
                    order
                        .map(
                            function (
                                index
                            ) {

                                return (
                                    words[
                                        index
                                    ] ||
                                    ""
                                );

                            }
                        )
                        .join(
                            " "
                        );

            };


        container
            .querySelectorAll(
                ".sentenceWord"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            const index =
                                Number(
                                    this.dataset.index
                                );


                            if (
                                index ===
                                0
                            ) {

                                return;

                            }


                            const temp =
                                order[
                                    index
                                ];


                            order[
                                index
                            ] =
                                order[
                                    index - 1
                                ];


                            order[
                                index - 1
                            ] =
                                temp;


                            PuzzleEngine.setTypeAnswer(
                                order
                            );


                            PuzzleScreen.renderState();

                        };

                }
            );


        const checkBtn =
            document.getElementById(
                "sentenceCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleEngine.setTypeAnswer(
                        order
                    );


                    PuzzleScreen.checkPuzzle();

                };

        }


        render();


        this.bindResetButton();

    },


    // =====================================
    // SENTENCE GRAMMAR EVENTS
    // =====================================

    bindSentenceGrammarEvents: function () {

        const checkBtn =
            document.getElementById(
                "grammarCheckBtn"
            );


        const submit =
            function () {

                const answers =
                    Array.from(
                        document.querySelectorAll(
                            ".grammarSelect"
                        )
                    )
                        .map(
                            function (
                                select
                            ) {

                                return (
                                    select.value
                                    ||
                                    ""
                                );

                            }
                        );


                PuzzleEngine.setGenericAnswer(
                    answers
                );


                PuzzleScreen.checkPuzzle();

            };


        if (checkBtn) {

            checkBtn.onclick =
                submit;

        }


        this.bindResetButton();

    },


    // =====================================
    // GRID EVENTS
    // =====================================

    bindGridEvents: function (
        type
    ) {

        const inputs =
            document.querySelectorAll(
                ".gridAnswerInput"
            );


        inputs.forEach(
            function (
                input
            ) {

                input.oninput =
                    function () {

                        const index =
                            Number(
                                this.dataset.index
                            );


                        const value =
                            type ===
                            "wordGrid"

                                ?

                                this.value

                                :

                                Number(
                                    this.value
                                );


                        if (
                            type ===
                            "wordGrid"
                        ) {

                            PuzzleEngine.setCell(
                                index,
                                value
                            );

                        }

                        else if (
                            this.value !==
                            ""
                        ) {

                            PuzzleEngine.setCell(
                                index,
                                value
                            );

                        }

                    };

            }
        );


        const checkBtn =
            document.getElementById(
                "gridCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // CROSS GRID EVENTS
    // =====================================

    bindCrossGridEvents: function () {

        const inputs =
            document.querySelectorAll(
                ".crossGridAnswerInput"
            );


        inputs.forEach(
            function (
                input
            ) {

                input.oninput =
                    function () {

                        if (
                            this.value ===
                            ""
                        ) {

                            return;

                        }


                        const index =
                            Number(
                                this.dataset.index
                            );


                        PuzzleEngine.setCell(
                            index,
                            Number(
                                this.value
                            )
                        );

                    };

            }
        );


        const checkBtn =
            document.getElementById(
                "crossGridCheckBtn"
            );


        if (checkBtn) {

            checkBtn.onclick =
                function () {

                    PuzzleScreen.checkPuzzle();

                };

        }


        this.bindResetButton();

    },


    // =====================================
    // CHECK
    // =====================================

    checkPuzzle: function () {

        const correct =
            PuzzleEngine.check();


        if (
            correct
        ) {

            this.showMessage(
                "آفرین! پاسخ درست است. 🎉"
            );

        }

        else {

            this.showMessage(
                "هنوز درست نیست؛ دوباره فکر کن."
            );

        }

    },


    // =====================================
    // RESET
    // =====================================

    resetPuzzle: function () {

        const activity =
            ActivityManager.currentActivity;


        if (!activity) {

            return;

        }


        Promise
            .resolve(
                PuzzleEngine.start(
                    activity
                )
            )
            .then(
                function (
                    state
                ) {

                    if (state) {

                        PuzzleScreen.show(
                            state
                        );

                    }

                }
            );

    },


    // =====================================
    // RENDER STATE
    // =====================================

    renderState: function () {

        const state =
            PuzzleEngine.getState();


        this.show(
            state
        );

    },


    // =====================================
    // RESET BUTTON
    // =====================================

    bindResetButton: function () {

        const resetBtn =
            document.getElementById(
                "puzzleResetBtn"
            );


        if (resetBtn) {

            resetBtn.onclick =
                function () {

                    PuzzleScreen.resetPuzzle();

                };

        }

    },


    // =====================================
    // STANDARD FOOTER
    // =====================================

    renderStandardFooter: function (
        moves
    ) {

        return `

            <div
                id="puzzleMessage"
                class="puzzleMessage">
            </div>

            <div class="puzzleControls">

                <button
                    id="puzzleResetBtn">

                    شروع دوباره

                </button>

            </div>

            <div class="puzzleMoves">

                تلاش:
                <span id="puzzleMoveCount">

                    ${moves || 0}

                </span>

            </div>

        `;

    },


    // =====================================
    // APP
    // =====================================

    getApp: function () {

        const app =
            document.getElementById(
                "app"
            );


        if (!app) {

            console.error(
                "Puzzle Screen: App Container Not Found"
            );

            return null;

        }


        return app;

    },


    // =====================================
    // MESSAGE
    // =====================================

    showMessage: function (
        message
    ) {

        const element =
            document.getElementById(
                "puzzleMessage"
            );


        if (element) {

            element.textContent =
                message;

        }

    },


    // =====================================
    // UNSUPPORTED
    // =====================================

    showUnsupported: function (
        message
    ) {

        const app =
            this.getApp();


        if (!app) {

            return;

        }


        app.innerHTML = `

            <div
                class="screen puzzleScreen"
                dir="rtl">

                <h1>
                    پازل
                </h1>

                <p class="puzzleMessage">
                    ${PuzzleScreen.escapeHTML(
                        message
                    )}
                </p>

                <button
                    id="puzzleResetBtn">

                    شروع دوباره

                </button>

            </div>

        `;


        this.bindResetButton();

    },


    valuesEqualForDisplay: function (a, b) {
        if (a === null || a === undefined || b === null || b === undefined) return a === b;
        return String(a) === String(b);
    },

    // =====================================
    // HTML ESCAPE
    // =====================================

    escapeHTML: function (
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(
            value
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    },


    // =====================================
    // STYLES
    // =====================================

    injectStyles: function () {

        const oldStyle =
            document.getElementById(
                "puzzleScreenStyles"
            );


        if (oldStyle) {

            oldStyle.remove();

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "puzzleScreenStyles";


        style.textContent = `

            /* ============================= */
            /* BASE */
            /* ============================= */

            .puzzleScreen {
                text-align: center;
                padding: 20px;
            }

            .puzzleInstruction {
                font-size: 18px;
                margin-bottom: 24px;
            }

            .puzzleControls {
                display: flex;
                justify-content: center;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 20px;
            }

            .puzzleControls button,
            #puzzleCheckBtn,
            #sequenceCheckBtn,
            #visualMathCheckBtn,
            #ioCheckBtn,
            #sentenceCheckBtn,
            #grammarCheckBtn,
            #gridCheckBtn,
            #crossGridCheckBtn {
                padding: 12px 22px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
            }

            .puzzleMessage {
                min-height: 30px;
                margin-top: 18px;
                font-size: 18px;
            }

            .puzzleMoves {
                margin-top: 14px;
                opacity: .7;
            }

            /* ============================= */
            /* PATTERN */
            /* ============================= */

            .patternItems { display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap; margin: 30px auto; }
            .patternItem, .patternOption { min-width: 70px; min-height: 70px; padding: 12px 18px; border: 2px solid #ddd; border-radius: 14px; background: white; font-size: 28px; display: flex; align-items: center; justify-content: center; }
            .patternMissing { border-style: dashed; }
            .patternOptions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 20px auto; }
            .patternOption { cursor: pointer; }
            .patternOption.selected { border-color: #333; transform: scale(1.04); }

            /* ============================= */
            /* SPATIAL */
            /* ============================= */

            .spatialQuestion { max-width: 720px; margin: 18px auto; font-size: 20px; font-weight: bold; }
            .spatialGrid { display: grid; grid-template-columns: repeat(var(--spatial-cols), minmax(65px, 100px)); gap: 6px; justify-content: center; margin: 28px auto; width: fit-content; }
            .spatialCell { min-width: 65px; min-height: 65px; display: flex; align-items: center; justify-content: center; border: 2px solid #ddd; border-radius: 12px; background: white; font-size: 20px; font-weight: bold; }
            .spatialOptions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin: 22px auto; }
            .spatialOption { min-width: 100px; padding: 12px 18px; border: 2px solid #ddd; border-radius: 12px; background: white; cursor: pointer; font-size: 17px; }
            .spatialOption.selected { border-color: #333; transform: scale(1.04); }

            .spatialDropCell {
                position: relative;
                min-width: 88px;
                min-height: 88px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #d8d8d8;
                border-radius: 14px;
                background: #fff;
                overflow: hidden;
            }

            .spatialDropCell.hasTarget {
                border-style: dashed;
            }

            .spatialTargetGhost {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 68%;
                height: 68%;
                border: 2px dashed #aaa;
                border-radius: 12px;
                opacity: .28;
                font-size: 34px;
                font-weight: bold;
                pointer-events: none;
            }

            .spatialSourceCell { background: #fafafa; }
            .spatialAxisCell { box-shadow: inset 0 0 0 2px rgba(120, 120, 120, 0.25); }
            .spatialSourcePiece { font-size: 26px; font-weight: bold; opacity: 0.9; }
            .spatialAxisLabel { margin: 10px auto 18px; text-align: center; font-size: 15px; opacity: 0.75; }
            .spatialSlotHint {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                opacity: .12;
                background: currentColor;
            }

            /* ============================= */
            /* ORDERING */
            /* ============================= */

            .puzzleItems {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 14px;
                margin: 30px 0;
            }

            .puzzleItem {
                min-width: 80px;
                min-height: 80px;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 14px;
                background: white;
                cursor: pointer;
                font-size: 22px;
            }

            .puzzleItem.selected {
                border-color: #333;
                transform: scale(1.05);
            }

            .puzzleImageItem {
                width: 150px;
                height: 150px;
                padding: 8px;
                overflow: hidden;
            }

            .puzzleImageItem img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
                pointer-events: none;
            }

            /* ============================= */
            /* SEQUENCE */
            /* ============================= */

            .sequenceItems {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin: 30px 0;
                font-size: 28px;
            }

            .sequenceItem,
            .sequenceMissing {
                min-width: 70px;
                padding: 14px 18px;
                border: 2px solid #ddd;
                border-radius: 14px;
            }

            .sequenceMissing {
                border-style: dashed;
                font-weight: bold;
            }

            .sequenceAnswerArea,
            .visualMathAnswerArea {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin: 20px 0;
            }

            #sequenceAnswerInput,
            #visualMathAnswerInput {
                width: 140px;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 10px;
                font-size: 20px;
                text-align: center;
            }

            /* ============================= */
            /* VISUAL MATH */
            /* ============================= */

            .visualMathEquation {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 22px;
                margin: 35px auto;
                direction: ltr;
                flex-wrap: wrap;
            }

            .visualMathGroup {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 8px;
                max-width: 220px;
            }

            .visualMathImage {
                width: 65px;
                height: 65px;
                object-fit: contain;
                display: block;
                border-radius: 10px;
            }

            .visualMathOperator {
                font-size: 36px;
                font-weight: bold;
            }

            .visualMathQuestion {
                width: 70px;
                height: 70px;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 2px dashed #999;
                border-radius: 12px;
                font-size: 32px;
                font-weight: bold;
            }

            .visualMathCountingGroup {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 10px;
                max-width: 500px;
                margin: 35px auto;
            }

            .visualComparisonArea {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 25px;
                margin: 35px auto;
                flex-wrap: wrap;
            }

            .visualComparisonGroup {
                width: 240px;
                min-height: 130px;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 8px;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 16px;
                background: white;
            }

            .visualComparisonSeparator {
                font-size: 34px;
                font-weight: bold;
            }

            .visualComparisonChoices {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin: 25px auto;
                flex-wrap: wrap;
            }

            .visualComparisonBtn {
                min-width: 120px;
                padding: 14px 22px;
                border: 2px solid #ddd;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                font-size: 17px;
            }

            .visualComparisonBtn.selected {
                border-color: #333;
                transform: scale(1.04);
            }

            /* ============================= */
            /* INPUT OUTPUT */
            /* ============================= */

            .ioMachine {
                width: min(620px, 100%);
                margin: 30px auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .ioRow {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                gap: 12px;
                padding: 14px;
                border: 2px solid #ddd;
                border-radius: 14px;
                background: white;
            }

            .ioInputValue,
            .ioOutputValue {
                font-size: 22px;
                font-weight: bold;
            }

            .ioArrow {
                font-size: 25px;
            }

            .ioAnswerInput {
                width: 110px;
                margin: auto;
                padding: 10px;
                border: 2px dashed #999;
                border-radius: 10px;
                font-size: 20px;
                text-align: center;
            }

            /* ============================= */
            /* SENTENCE */
            /* ============================= */

            .sentenceWords {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 10px;
                margin: 30px auto;
            }

            .sentenceWord {
                padding: 14px 18px;
                border: 2px solid #ddd;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                font-size: 18px;
            }

            .sentencePreview {
                min-height: 55px;
                max-width: 800px;
                margin: 20px auto;
                padding: 14px;
                border: 2px dashed #aaa;
                border-radius: 12px;
                font-size: 21px;
            }

            .grammarRows {
                width: min(650px, 100%);
                margin: 25px auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .grammarRow {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                align-items: center;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 12px;
            }

            .grammarWord {
                font-size: 20px;
                font-weight: bold;
            }

            .grammarSelect {
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 10px;
                font-size: 16px;
            }

            /* ============================= */
            /* GRID */
            /* ============================= */

            .genericGrid,
            .crossGridContainer {
                display: grid;
                grid-template-columns:
                    repeat(
                        var(--grid-cols),
                        minmax(65px, 110px)
                    );
                justify-content: center;
                gap: 5px;
                margin: 30px auto;
                width: fit-content;
                max-width: 100%;
            }

            .gridCell,
            .crossGridCell {
                min-width: 65px;
                min-height: 65px;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 8px;
                border: 2px solid #ddd;
                border-radius: 8px;
                background: white;
                font-size: 22px;
                font-weight: bold;
            }

            .gridMissing,
            .crossMissingCell {
                border-style: dashed;
            }

            .gridAnswerInput,
            .crossGridAnswerInput {
                width: 80%;
                min-width: 45px;
                padding: 8px;
                border: 0;
                outline: none;
                background: transparent;
                text-align: center;
                font-size: 20px;
            }

            /* ============================= */
            /* CROSS GRID */
            /* ============================= */

            .crossOperationCell {
                background: #f4f4f4;
                font-size: 22px;
            }

            .crossBlockedCell {
                background: transparent;
                border-color: transparent;
            }

            .crossGridPaths {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                gap: 8px;
                margin: 18px auto;
            }

            .crossGridPathTag {
                display: inline-block;
                padding: 6px 10px;
                border-radius: 10px;
                border: 1px solid #ddd;
                font-size: 14px;
            }

            /* ============================= */
            /* MOBILE */
            /* ============================= */

            @media (
                max-width: 700px
            ) {

                .visualMathEquation {
                    gap: 12px;
                }

                .visualMathImage {
                    width: 52px;
                    height: 52px;
                }

                .gridCell,
                .crossGridCell {
                    min-width: 52px;
                    min-height: 52px;
                    font-size: 18px;
                }

                .genericGrid,
                .crossGridContainer {
                    grid-template-columns:
                        repeat(
                            var(--grid-cols),
                            minmax(48px, 75px)
                        );
                }

                .ioRow {
                    grid-template-columns: 1fr auto 1fr;
                }

                .sentencePreview {
                    font-size: 18px;
                }

            }

        `;


        document.head.appendChild(
            style
        );

    }

};




// =====================================
// SPATIAL SYMMETRY v2 UI OVERRIDE
// =====================================
PuzzleScreen.showSpatialSymmetry = function (state) {
    // Initialize the activation timestamp when the symmetry screen is first rendered.
    // handleActivityReady resets it to 0; without this assignment the 900ms launch-gesture
    // guard compares Date.now() against 0 and is effectively disabled.
    if (!PuzzleScreen.spatialScreenActivatedAt) {
        PuzzleScreen.spatialScreenActivatedAt = Date.now();
        PuzzleScreen.spatialUserInitiatedDragAt = 0;
    }

    const app = this.getApp();
    if (!app) return;

    const grid = state.grid || {};
    const rows = Math.max(1, Number(grid.rows) || 1);
    const cols = Math.max(1, Number(grid.cols) || 1);
    const pieces = Array.isArray(state.pieces) ? state.pieces : [];
    const placements = state.placements || {};
    const sourceByCell = {};
    const placedByCell = {};

    pieces.forEach(function (piece) {
        if (piece.source) {
            sourceByCell[Number(piece.source.row) + ":" + Number(piece.source.col)] = piece;
        }
        const placement = placements[String(piece.id)];
        if (placement) {
            placedByCell[Number(placement.row) + ":" + Number(placement.col)] = piece;
        }
    });

    const cells = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const key = row + ":" + col;
            const sourcePiece = sourceByCell[key];
            const placedPiece = placedByCell[key];
            const isAxis = state.axis === "vertical"
                ? (cols % 2 === 1 && col === Math.floor(cols / 2))
                : (rows % 2 === 1 && row === Math.floor(rows / 2));

            cells.push(
                "<div class=\"spatialDropCell spatialSymmetryCell" +
                    (placedPiece ? " filled" : "") +
                    (sourcePiece ? " spatialSourceCell" : "") +
                    (isAxis ? " spatialAxisCell" : "") +
                    "\" data-row=\"" + row + "\" data-col=\"" + col + "\">" +
                    (sourcePiece
                        ? "<div class=\"spatialSourcePiece\">" + this.escapeHTML(sourcePiece.label || sourcePiece.id) + "</div>"
                        : placedPiece
                            ? "<div class=\"spatialPlacedPiece\" data-piece-id=\"" + this.escapeHTML(placedPiece.id) + "\">" + this.escapeHTML(placedPiece.label || placedPiece.id) + "</div>"
                            : "<span class=\"spatialSlotHint\"></span>") +
                "</div>"
            );
        }
    }

    const tray = pieces.map(function (piece) {
        if (placements[String(piece.id)]) return "";
        return "<div class=\"spatialDragPiece\" data-piece-id=\"" +
            PuzzleScreen.escapeHTML(piece.id) +
            "\" tabindex=\"0\">" +
            PuzzleScreen.escapeHTML(piece.label || piece.id) +
            "</div>";
    }).join("");

    const axisText = state.axis === "horizontal" ? "افقی" : "عمودی";

    app.innerHTML =
        "<div class=\"screen puzzleScreen spatialScreen spatialSymmetryScreen\" dir=\"rtl\">" +
            "<div class=\"spatialSymmetryHeader\">" +
                "<h1>تقارن شکل‌ها</h1>" +
                "<p class=\"puzzleInstruction\">شکل‌ها را در جای قرینه قرار بده.</p>" +
            "</div>" +
            "<div class=\"spatialAxisLabel\">محور تقارن: " + axisText + "</div>" +
            "<div class=\"spatialPlacementLayout\">" +
                "<div class=\"spatialBoardWrap\">" +
                    "<div class=\"spatialBoard\" style=\"--spatial-cols:" + cols + ";--spatial-rows:" + rows + "\">" +
                        cells.join("") +
                    "</div>" +
                "</div>" +
                "<div class=\"spatialTray\">" +
                    "<div class=\"spatialTrayTitle\">شکل‌ها</div>" +
                    "<div class=\"spatialTrayPieces\">" + tray + "</div>" +
                "</div>" +
            "</div>" +
            "<button id=\"spatialSymmetryCheckBtn\" class=\"spatialCheckButton\" type=\"button\" disabled>بررسی پاسخ</button>" +
            "<div id=\"spatialSymmetryMessage\" class=\"puzzleMessage\" role=\"status\"></div>" +
            this.renderStandardFooter(state.moves) +
        "</div>";

    const beginDrag = function (pieceElement) {
        const pieceId = pieceElement.dataset.pieceId;
        if (!pieceId) return;

        // Do not let the pointer gesture that launched the activity become
        // the first puzzle drag when the screen appears underneath it.
        if (Date.now() - PuzzleScreen.spatialScreenActivatedAt < 900) return;
        PuzzleScreen.spatialUserInitiatedDragAt = Date.now();

        const ghost = document.createElement("div");
        ghost.className = "spatialDragGhost";
        ghost.textContent = pieceElement.textContent || "";
        document.body.appendChild(ghost);

        const moveGhost = function (event) {
            ghost.style.left = (event.clientX - 28) + "px";
            ghost.style.top = (event.clientY - 28) + "px";
        };

        const cancelDrag = function () {
            document.removeEventListener("pointermove", moveGhost);
            document.removeEventListener("pointerup", finishDrag);
            document.removeEventListener("pointercancel", cancelDrag);
            ghost.remove();
        };

        const finishDrag = function (event) {
            document.removeEventListener("pointermove", moveGhost);
            document.removeEventListener("pointerup", finishDrag);
            document.removeEventListener("pointercancel", cancelDrag);
            ghost.remove();

            const target = document.elementFromPoint(event.clientX, event.clientY);
            const cell = target && target.closest
                ? target.closest(".spatialDropCell")
                : null;

            if (cell && app.contains(cell) && !cell.classList.contains("spatialSourceCell")) {
                PuzzleEngine.setTypeAnswer({
                    pieceId: pieceId,
                    row: Number(cell.dataset.row),
                    col: Number(cell.dataset.col)
                });
                PuzzleScreen.show(PuzzleEngine.getState());
            }
        };

        document.addEventListener("pointermove", moveGhost);
        document.addEventListener("pointerup", finishDrag, { once: true });
        document.addEventListener("pointercancel", cancelDrag, { once: true });
        moveGhost(event);
    };

    app.querySelectorAll(".spatialDragPiece, .spatialPlacedPiece").forEach(function (pieceElement) {
        pieceElement.addEventListener("pointerdown", function (event) {
            event.preventDefault();
            beginDrag(pieceElement);
        });
    });

    const checkButton = app.querySelector("#spatialSymmetryCheckBtn");
    if (checkButton) {
        // Ignore release/click events that belong to the activity-launch
        // gesture and arrive while the newly rendered puzzle is taking over.
        const screenReadyAt = Date.now();
        let userActivatedCheckAt = 0;

        checkButton.addEventListener("pointerdown", function () {
            userActivatedCheckAt = Date.now();
        });

        setTimeout(function () {
            if (!checkButton.isConnected) return;
            checkButton.disabled = !(Number(state.moves) > 0);
        }, 0);

        checkButton.addEventListener("click", function () {
            const now = Date.now();
            const pointerStartedAt = userActivatedCheckAt;
            userActivatedCheckAt = 0;

            // A check is accepted only after the screen has settled and the
            // button itself received a fresh pointerdown for this click.
            if (now - screenReadyAt < 700) return;
            if (!pointerStartedAt || pointerStartedAt < screenReadyAt ||
                now - pointerStartedAt > 1500) return;

            const currentState = PuzzleEngine.getState();
            const currentPlacements = currentState.placements || {};
            const currentPieces = currentState.pieces || [];
            if (!PuzzleScreen.spatialUserInitiatedDragAt ||
                PuzzleScreen.spatialUserInitiatedDragAt < PuzzleScreen.spatialScreenActivatedAt ||
                Number(currentState.moves) <= 0 ||
                Object.keys(currentPlacements).length === 0 ||
                currentPieces.length === 0) {
                checkButton.disabled = true;
                return;
            }

            const correct = PuzzleEngine.check();
            const message = app.querySelector("#spatialSymmetryMessage");
            if (message) {
                message.textContent = correct
                    ? "آفرین! تقارن کامل است."
                    : "هنوز درست نیست؛ شکل‌ها را جابه‌جا کن و دوباره بررسی کن.";
            }
        });
    }
};

// =====================================
// GLOBAL
// =====================================

window.PuzzleScreen =
    PuzzleScreen;


// =====================================
// INITIALIZE
// =====================================

PuzzleScreen.injectStyles();

PuzzleScreen.init();


console.log(
    "Puzzle Screen v2.5 Ready"
);