/// <reference path="../decl/knockout.d.ts" />
/// <reference path="../decl/lodash.d.ts" />
var MinesweeperCell = (function () {
    function MinesweeperCell(x, y, parent) {
        var _this = this;
        this.x = x;
        this.y = y;
        this.parent = parent;
        this.cellText = ko.pureComputed(function () {
            if (_this.isRevealed() && _this.isMine)
                return '✺';
            if (_this.isRevealed() && _this.adjacent > 0)
                return _this.adjacent;
            if (_this.isFlagged())
                return '⚐';
            return '&nbsp;';
        });
        this.cellCss = ko.pureComputed(function () {
            var classes = [];
            if (!_this.isMine && _this.adjacent > 0)
                classes.push("cell-adjacent-" + _this.adjacent);
            if (_this.isFlagged())
                (_a = ["flagged"], _a.raw = ["flagged"], classes.push(_a));
            if (_this.isMine)
                (_b = ["mine"], _b.raw = ["mine"], classes.push(_b));
            if (_this.isRevealed())
                (_c = ["revealed"], _c.raw = ["revealed"], classes.push(_c));
            return (_d = [" "], _d.raw = [" "], classes.join(_d));
            var _a, _b, _c, _d;
        });
        this.isFlagged = ko.observable(false);
        this.isRevealed = ko.observable(false);
        this.isMine = false;
        this.adjacent = 0;
    }
    MinesweeperCell.prototype.reveal = function () {
        if (this.parent.isGameOver())
            return;
        if (this.isRevealed())
            return;
        if (this.isFlagged())
            return;
        this.isRevealed(true);
        this.parent.incrementRevealed();
        if (!this.isMine && this.adjacent === 0) {
            // propogate through and auto-reveal recursively. 
            this.parent.revealAdjacentCells(this);
        }
        if (this.isMine) {
            this.parent.revealMines();
        }
    };
    // when mouse is being held down
    MinesweeperCell.prototype.suspense = function () {
        if (!this.isRevealed())
            this.parent.mouseDown(true);
    };
    // when mouse is lifted
    MinesweeperCell.prototype.relief = function () {
        if (!this.isRevealed())
            this.parent.mouseDown(false);
    };
    MinesweeperCell.prototype.flag = function () {
        if (this.parent.isGameOver())
            return;
        if (this.isFlagged()) {
            this.parent.removeFlag();
        }
        else {
            this.parent.useFlag();
        }
        this.isFlagged(!this.isFlagged());
        return false; // prevent event propogation
    };
    return MinesweeperCell;
})();
var MinesweeperGame = (function () {
    function MinesweeperGame() {
        var _this = this;
        this.reset = function () {
            _this.grid(null);
            _this.started(false);
        };
        this.difficulties = ko.observableArray([
            {
                name: 'Beginner',
                width: 8,
                height: 8,
                mines: 10
            },
            {
                name: 'Intermediate',
                width: 16,
                height: 16,
                mines: 40
            },
            {
                name: 'Expert',
                width: 30,
                height: 16,
                mines: 99
            }
        ]);
        this.started = ko.observable(false);
        this.selectedDifficulty = ko.observable(null);
        this.grid = ko.observable(null);
    }
    MinesweeperGame.prototype.start = function () {
        var _this = this;
        if (!this.selectedDifficulty())
            return;
        this.started(true);
        this.grid(new MinesweeperGrid(this.selectedDifficulty()));
        this.grid().isGameOver.subscribe(function (gameOver) {
            if (gameOver)
                _this.gameOver(_this.grid().wonGame);
        });
    };
    MinesweeperGame.prototype.gameOver = function (won) {
        // const res = won ? 'Congratulations!\n' : 'Game over!\n';
        // _.defer(() => {
        //     const again = confirm(res + 'Would you like to play again?');
        //     if (again) {
        //         this.reset();
        //     }
        // });
    };
    return MinesweeperGame;
})();
function computed(target) {
    return ko.computed(target);
}
var MinesweeperGrid = (function () {
    function MinesweeperGrid(difficulty) {
        var _this = this;
        this.difficulty = difficulty;
        this.gameState = ko.pureComputed(function () {
            if (_this.isGameOver()) {
                if (_this.wonGame)
                    return 'img/winner.png';
                else
                    return 'img/dead.png';
            }
            if (_this.mouseDown())
                return 'img/worried.png';
            return 'img/happy.png';
        });
        this.cellRows = ko.pureComputed(function () {
            return _.chunk(_this.cells(), _this.difficulty.width);
        });
        this.flagsRemaining = ko.pureComputed(function () {
            return _this.difficulty.mines - _this.usedFlags();
        });
        this.isGameOver = ko.observable(false);
        this.wonGame = false;
        this.usedFlags = ko.observable(0);
        this.mouseDown = ko.observable(false);
        this.totalRevealed = 0;
        this.init();
    }
    MinesweeperGrid.prototype.init = function () {
        this.createCells();
        this.assignMines();
        this.computeAdjacencies();
    };
    MinesweeperGrid.prototype.createCells = function () {
        var _this = this;
        var _a = this.difficulty, width = _a.width, height = _a.height;
        this.cells = ko.observableArray(_.flatten(_.range(height).map(function (y) { return _.range(width).map(function (x) {
            return new MinesweeperCell(x, y, _this);
        }); })));
        console.log(this.cellRows());
    };
    MinesweeperGrid.prototype.assignMines = function () {
        var mines = this.difficulty.mines;
        var mineCells = _.sampleSize(this.cells(), mines);
        mineCells.forEach(function (cell) { return cell.isMine = true; });
    };
    MinesweeperGrid.prototype.computeAdjacencies = function () {
        var _this = this;
        var grid = this.cellRows();
        grid.forEach(function (row, y) {
            row.forEach(function (cell, x) {
                var adjacent = _.sumBy(MinesweeperGrid.offsets, function (offset) {
                    var cX = x + offset.x;
                    var cY = y + offset.y;
                    if (_this.inRange(grid, cX, cY)) {
                        return grid[cY][cX].isMine ? 1 : 0;
                    }
                    return 0;
                });
                cell.adjacent = adjacent;
            });
        });
    };
    MinesweeperGrid.prototype.inRange = function (grid, x, y) {
        return (y in grid) && (x in grid[y]);
    };
    MinesweeperGrid.prototype.revealMines = function () {
        var _this = this;
        var won = true;
        this.cells().forEach(function (cell) {
            if (cell.isMine) {
                if (cell.isRevealed()) {
                    won = false;
                }
                if (!cell.isRevealed())
                    _this.totalRevealed++;
                cell.isRevealed(true);
            }
        });
        this.wonGame = won;
        if (won) {
            this.autoFlag();
        }
        this.isGameOver(true);
    };
    MinesweeperGrid.prototype.useFlag = function () {
        this.usedFlags(this.usedFlags() + 1);
    };
    MinesweeperGrid.prototype.removeFlag = function () {
        this.usedFlags(this.usedFlags() - 1);
    };
    MinesweeperGrid.prototype.autoFlag = function () {
        var _this = this;
        this.cells().forEach(function (cell) {
            if (cell.isFlagged())
                return;
            if (cell.isMine) {
                cell.isFlagged(true);
                _this.useFlag();
            }
        });
    };
    MinesweeperGrid.prototype.incrementRevealed = function () {
        this.totalRevealed++;
        var _a = this.difficulty, width = _a.width, height = _a.height, mines = _a.mines;
        var numNonMines = (width * height) - mines;
        if (this.totalRevealed === numNonMines) {
            this.wonGame = true;
            this.isGameOver(true);
        }
    };
    MinesweeperGrid.prototype.revealAdjacentCells = function (current, done) {
        var _this = this;
        if (done === void 0) { done = []; }
        done.push(current);
        var grid = this.cellRows();
        MinesweeperGrid.offsets.forEach(function (offset) {
            var nX = current.x + offset.x;
            var nY = current.y + offset.y;
            if (_this.inRange(grid, nX, nY)) {
                var next = grid[nY][nX];
                if (done.indexOf(next) > -1)
                    return;
                if (next.adjacent === 0) {
                    _this.revealAdjacentCells(next, done);
                }
                if (!next.isRevealed()) {
                    _this.incrementRevealed();
                }
                if (next.isFlagged()) {
                    _this.removeFlag();
                    next.isFlagged(false);
                }
                next.isRevealed(true);
            }
        });
    };
    MinesweeperGrid.offsets = [
        { x: -1, y: -1 },
        { x: 0, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
    ];
    return MinesweeperGrid;
})();
var game = new MinesweeperGame;
window.onload = function () {
    ko.applyBindings(game);
};
game.started.subscribe(function (started) {
    if (started) {
        console.log('Started a new game!', 'Difficulty:', game.selectedDifficulty().name);
    }
});
