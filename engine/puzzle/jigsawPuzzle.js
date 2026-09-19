// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Core
// Version 2.0
// Supports image jigsaw + word/sentence jigsaw
// =====================================

const JigsawPuzzle = {
    VERSION: "2.0",
    state: null,

    resolveImagePath: function (image) {
        if (!image) return image;
        const raw = String(image).trim();
        if (!raw) return raw;

        // Activity content stores repository-relative asset paths. Always resolve
        // those paths from the application root, not from the current route and
        // not from a previously persisted absolute URL.
        let assetPath = raw;
        try {
            const parsed = new URL(raw, document.baseURI);
            assetPath = parsed.pathname || raw;
        } catch (e) {}

        const match = assetPath.match(/(?:^|\/)assets\/(.*)$/);
        if (match) {
            const script = Array.from(document.scripts || []).find(function (item) {
                return item.src && /(?:^|\/)engine\//.test(item.src);
            });
            if (script && script.src) {
                const root = new URL(".", new URL(script.src, document.baseURI));
                return new URL("assets/" + match[1], root).href;
            }
            const basePath = document.baseURI.replace(/[^/]*$/, "");
            return new URL("assets/" + match[1], basePath).href;
        }

        return new URL(raw, document.baseURI).href;
    },

    start: function (definition) {
        const puzzle = definition || {};
        const content = puzzle.content || {};
        const words = Array.isArray(content.words) ? content.words.map(function (word) { return String(word); }) : null;
        if (words && words.length >= 2) {
            const pieces = words.map(function (word, index) { return { id: `word-${index}`, word: word, correctIndex: index, currentIndex: index }; });
            const arrangement = this.shuffleIndexes(words.length);
            pieces.forEach(function (piece, index) { piece.currentIndex = arrangement[index]; });
            this.state = { type: "jigsaw", mode: "words", words: words.slice(), pieceCount: words.length, difficulty: Number(puzzle.difficulty || 1), pieces: pieces, moves: 0, solved: false };
            if (this.isSolved() && pieces.length > 1) {
                const last = pieces[pieces.length - 1].currentIndex;
                pieces[pieces.length - 1].currentIndex = pieces[pieces.length - 2].currentIndex;
                pieces[pieces.length - 2].currentIndex = last;
            }
            console.log("Word Jigsaw Started", { pieceCount: words.length, difficulty: this.state.difficulty });
            return this.getState();
        }
        const rows = Number(content.rows), cols = Number(content.cols), image = content.image;
        if (!Number.isInteger(rows) || rows < 2 || !Number.isInteger(cols) || cols < 2 || !image) {
            console.error("Jigsaw Puzzle: Invalid image definition");
            return null;
        }
        // Resolve repository-relative image paths against the actual application URL.
        // This prevents the CSS background-image from resolving the asset against
        // whatever route/path the activity was opened from (including GitHub Pages).
        const resolvedImage = this.resolveImagePath(image);
        const count = rows * cols;
        const pieces = [];
        for (let correctIndex = 0; correctIndex < count; correctIndex += 1) pieces.push({ id: `piece-${correctIndex}`, correctIndex: correctIndex, currentIndex: correctIndex });
        const arrangement = this.shuffleIndexes(count);
        pieces.forEach(function (piece, index) { piece.currentIndex = arrangement[index]; });
        this.state = { type: "jigsaw", mode: "image", image: resolvedImage, rows: rows, cols: cols, pieceCount: count, difficulty: Number(puzzle.difficulty || 1), pieces: pieces, moves: 0, solved: false };
        if (this.isSolved() && count > 1) {
            const last = pieces[count - 1].currentIndex;
            pieces[count - 1].currentIndex = pieces[count - 2].currentIndex;
            pieces[count - 2].currentIndex = last;
        }
        console.log("Jigsaw Puzzle Started", { rows: rows, cols: cols, pieceCount: count, difficulty: this.state.difficulty });
        return this.getState();
    },

    restoreFromEngine: function () {
        if (typeof PuzzleEngine === "undefined" || !PuzzleEngine.puzzle || PuzzleEngine.puzzle.type !== "jigsaw") return false;
        const puzzle = PuzzleEngine.puzzle;
        const items = Array.isArray(PuzzleEngine.items) ? PuzzleEngine.items : [];
        const words = Array.isArray(puzzle.words) ? puzzle.words.map(function (word) { return String(word); }) : null;
        let pieces = [];
        let mode = puzzle.mode === "words" || words ? "words" : "image";
        if (mode === "words" && words && words.length >= 2) {
            pieces = words.map(function (word, index) { return { id: `word-${index}`, word: word, correctIndex: index, currentIndex: index }; });
        } else {
            const count = Number(puzzle.pieceCount || (Number(puzzle.rows) * Number(puzzle.cols)));
            if (!Number.isInteger(count) || count < 2) return false;
            for (let i = 0; i < count; i += 1) pieces.push({ id: `piece-${i}`, correctIndex: i, currentIndex: i });
            mode = "image";
        }
        // Rebuild from the persisted engine state every time. Never reuse a
        // previous in-memory Jigsaw state, because it may belong to another
        // attempt and may already be solved.
        if (items.length === pieces.length) {
            const used = new Set();
            let valid = true;
            items.forEach(function (id, position) {
                const piece = pieces.find(function (item) { return item.id === id && !used.has(item.id); });
                if (!piece) { valid = false; return; }
                piece.currentIndex = position;
                used.add(piece.id);
            });
            if (!valid || used.size !== pieces.length) {
                pieces.forEach(function (piece, index) { piece.currentIndex = index; });
            }
        }
        const restoredImage = this.resolveImagePath(puzzle.image);
        this.state = {
            type: "jigsaw", mode: mode, image: restoredImage, rows: puzzle.rows, cols: puzzle.cols,
            words: words || undefined, pieceCount: pieces.length, difficulty: Number(puzzle.difficulty || 1),
            pieces: pieces, moves: Number(PuzzleEngine.moves || 0), solved: false
        };
        this.state.solved = this.isSolved();
        console.log("Jigsaw Puzzle State Restored", { mode: mode, pieceCount: pieces.length, moves: this.state.moves, solved: this.state.solved });
        return true;
    },

    move: function (fromIndex, toIndex) {
        if (!this.state || this.state.solved) return false;
        const from = Number(fromIndex), to = Number(toIndex);
        if (!this.isValidPosition(from) || !this.isValidPosition(to) || from === to) return false;
        const fromPiece = this.getPieceAt(from), toPiece = this.getPieceAt(to);
        if (!fromPiece || !toPiece) return false;
        fromPiece.currentIndex = to; toPiece.currentIndex = from;
        this.state.moves += 1; this.state.solved = this.isSolved();
        return true;
    },

    check: function () { if (!this.state) return false; this.state.solved = this.isSolved(); return this.state.solved; },

    isSolved: function () {
        if (!this.state || !Array.isArray(this.state.pieces)) return false;
        if (this.state.mode === "words") return this.state.words.every(function (expectedWord, position) { const piece = JigsawPuzzle.getPieceAt(position); return !!piece && JigsawPuzzle.normalizeWord(piece.word) === JigsawPuzzle.normalizeWord(expectedWord); });
        return this.state.pieces.every(function (piece) { return piece.currentIndex === piece.correctIndex; });
    },

    reset: function () {
        if (!this.state) return null;
        const count = this.state.pieceCount, arrangement = this.shuffleIndexes(count), pieces = this.state.pieces;
        pieces.forEach(function (piece, index) { piece.currentIndex = arrangement[index]; });
        if (this.isSolved() && count > 1) { const last = pieces[count - 1].currentIndex; pieces[count - 1].currentIndex = pieces[count - 2].currentIndex; pieces[count - 2].currentIndex = last; }
        this.state.moves = 0; this.state.solved = false;
        return this.getState();
    },

    getState: function () {
        if (!this.state) this.restoreFromEngine();
        if (!this.state) return null;
        return { type: this.state.type, mode: this.state.mode, image: this.state.image, rows: this.state.rows, cols: this.state.cols, words: this.state.words ? this.state.words.slice() : undefined, pieceCount: this.state.pieceCount, difficulty: this.state.difficulty, pieces: this.state.pieces.map(function (piece) { return { id: piece.id, word: piece.word, correctIndex: piece.correctIndex, currentIndex: piece.currentIndex }; }), moves: this.state.moves, solved: this.state.solved };
    },

    getPieceAt: function (position) { if (!this.state) return null; return this.state.pieces.find(function (piece) { return piece.currentIndex === position; }) || null; },
    isValidPosition: function (position) { return Number.isInteger(position) && position >= 0 && this.state && position < this.state.pieceCount; },
    normalizeWord: function (word) { return String(word == null ? "" : word).replace(/\u200c/g, " ").replace(/\s+/g, " ").trim(); },
    shuffleIndexes: function (count) { const indexes = Array.from({ length: count }, function (_, index) { return index; }); for (let i = indexes.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); const temp = indexes[i]; indexes[i] = indexes[j]; indexes[j] = temp; } return indexes; }
};

window.JigsawPuzzle = JigsawPuzzle;
console.log("Jigsaw Puzzle Core v2.0 Ready");