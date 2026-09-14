// =====================================
// Tahouri Edu Platform
// Jigsaw Puzzle Core
// Version 1.0
//
// Purpose:
// - Real image-piece puzzle foundation
// - Piece-to-board manipulation
// - Correct-position validation
// - Move tracking
// - Difficulty-aware configuration
// - No dependency on legacy Puzzle types
//
// This module defines puzzle logic only.
// Rendering and pointer/touch interaction belong to the UI layer.
// =====================================

const JigsawPuzzle = {

    VERSION: "1.0",

    state: null,

    // =====================================
    // START
    // =====================================

    start: function (definition) {

        const puzzle = definition || {};
        const content = puzzle.content || {};
        const rows = Number(content.rows);
        const cols = Number(content.cols);
        const image = content.image;

        if (!Number.isInteger(rows) || rows < 2) {
            console.error("Jigsaw Puzzle: Invalid Rows");
            return null;
        }

        if (!Number.isInteger(cols) || cols < 2) {
            console.error("Jigsaw Puzzle: Invalid Columns");
            return null;
        }

        if (!image || typeof image !== "string") {
            console.error("Jigsaw Puzzle: Image Missing");
            return null;
        }

        const count = rows * cols;
        const pieces = [];

        for (let correctIndex = 0; correctIndex < count; correctIndex += 1) {
            pieces.push({
                id: `piece-${correctIndex}`,
                correctIndex: correctIndex,
                currentIndex: correctIndex
            });
        }

        const arrangement = this.shuffleIndexes(count);

        pieces.forEach(function (piece, index) {
            piece.currentIndex = arrangement[index];
        });

        this.state = {
            type: "jigsaw",
            image: image,
            rows: rows,
            cols: cols,
            pieceCount: count,
            difficulty: Number(puzzle.difficulty || 1),
            pieces: pieces,
            moves: 0,
            solved: false
        };

        // Avoid presenting an already solved board as a normal puzzle.
        if (count > 1 && this.isSolved()) {
            const last = pieces[count - 1].currentIndex;
            pieces[count - 1].currentIndex = pieces[count - 2].currentIndex;
            pieces[count - 2].currentIndex = last;
        }

        console.log("Jigsaw Puzzle Started", {
            rows: rows,
            cols: cols,
            pieceCount: count,
            difficulty: this.state.difficulty
        });

        return this.getState();
    },

    // =====================================
    // MOVE / SWAP
    // =====================================

    move: function (fromIndex, toIndex) {

        if (!this.state) return false;
        if (this.state.solved) return false;

        const from = Number(fromIndex);
        const to = Number(toIndex);

        if (!this.isValidPosition(from) || !this.isValidPosition(to)) {
            return false;
        }

        if (from === to) return false;

        const fromPiece = this.getPieceAt(from);
        const toPiece = this.getPieceAt(to);

        if (!fromPiece || !toPiece) return false;

        fromPiece.currentIndex = to;
        toPiece.currentIndex = from;
        this.state.moves += 1;
        this.state.solved = this.isSolved();

        return true;
    },

    // =====================================
    // CHECK
    // =====================================

    check: function () {

        if (!this.state) return false;

        this.state.solved = this.isSolved();
        return this.state.solved;
    },

    isSolved: function () {

        if (!this.state || !Array.isArray(this.state.pieces)) {
            return false;
        }

        return this.state.pieces.every(function (piece) {
            return piece.currentIndex === piece.correctIndex;
        });
    },

    // =====================================
    // RESET
    // =====================================

    reset: function () {

        if (!this.state) return null;

        const count = this.state.pieceCount;
        const arrangement = this.shuffleIndexes(count);
        const pieces = this.state.pieces;

        pieces.forEach(function (piece, index) {
            piece.currentIndex = arrangement[index];
        });

        if (this.isSolved() && count > 1) {
            const last = pieces[count - 1].currentIndex;
            pieces[count - 1].currentIndex = pieces[count - 2].currentIndex;
            pieces[count - 2].currentIndex = last;
        }

        this.state.moves = 0;
        this.state.solved = false;

        return this.getState();
    },

    // =====================================
    // STATE
    // =====================================

    getState: function () {

        if (!this.state) return null;

        return {
            type: this.state.type,
            image: this.state.image,
            rows: this.state.rows,
            cols: this.state.cols,
            pieceCount: this.state.pieceCount,
            difficulty: this.state.difficulty,
            pieces: this.state.pieces.map(function (piece) {
                return {
                    id: piece.id,
                    correctIndex: piece.correctIndex,
                    currentIndex: piece.currentIndex
                };
            }),
            moves: this.state.moves,
            solved: this.state.solved
        };
    },

    // =====================================
    // HELPERS
    // =====================================

    getPieceAt: function (position) {

        if (!this.state) return null;

        return this.state.pieces.find(function (piece) {
            return piece.currentIndex === position;
        }) || null;
    },

    isValidPosition: function (position) {

        return Number.isInteger(position)
            && position >= 0
            && this.state
            && position < this.state.pieceCount;
    },

    shuffleIndexes: function (count) {

        const indexes = Array.from(
            { length: count },
            function (_, index) {
                return index;
            }
        );

        for (let i = indexes.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = indexes[i];
            indexes[i] = indexes[j];
            indexes[j] = temp;
        }

        return indexes;
    }
};

window.JigsawPuzzle = JigsawPuzzle;

console.log("Jigsaw Puzzle Core v1.0 Ready");
