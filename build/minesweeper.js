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
            if (_this.isRevealed() && _this.adjacent() > 0)
                return _this.adjacent();
            if (_this.isFlagged())
                return '⚐';
            return '&nbsp;';
        });
        this.cellCss = ko.pureComputed(function () {
            var classes = [];
            if (!_this.isMine && _this.adjacent() > 0)
                classes.push("cell-adjacent-" + _this.adjacent());
            if (_this.isFlagged())
                (_a = ["flagged"], _a.raw = ["flagged"], classes.push(_a));
            if (_this.isMine)
                (_b = ["mine"], _b.raw = ["mine"], classes.push(_b));
            if (_this.isRevealed())
                (_c = ["revealed"], _c.raw = ["revealed"], classes.push(_c));
            if (_this.parent.touchScreen)
                (_d = ["touch-screen"], _d.raw = ["touch-screen"], classes.push(_d));
            return (_e = [" "], _e.raw = [" "], classes.join(_e));
            var _a, _b, _c, _d, _e;
        });
        this.isFlagged = ko.observable(false);
        this.isRevealed = ko.observable(false);
        this.adjacent = ko.observable(0);
        this.isMine = false;
    }
    MinesweeperCell.prototype.reveal = function () {
        if (this.parent.isGameOver() || this.isRevealed() || this.isFlagged())
            return;
        this.parent.mouseDown(false);
        if (this.isMine) {
            this.parent.revealMines();
            if ('vibrate' in navigator) {
                navigator.vibrate(1500);
            }
        }
        else {
            this.isRevealed(true);
            this.parent.incrementRevealed();
            if (this.adjacent() === 0) {
                // propogate through and auto-reveal recursively. 
                this.parent.revealAdjacentCells(this);
            }
        }
    };
    // when mouse is being held down
    MinesweeperCell.prototype.suspense = function () {
        if (!this.isRevealed() && !this.isFlagged())
            this.parent.mouseDown(true);
    };
    // when mouse is lifted
    MinesweeperCell.prototype.relief = function () {
        this.parent.mouseDown(false);
    };
    MinesweeperCell.prototype.flag = function () {
        if (this.parent.isGameOver() || this.isRevealed())
            return;
        this.parent.mouseDown(false);
        if (this.isFlagged()) {
            this.parent.removeFlag();
        }
        else {
            this.parent.useFlag();
        }
        if ('vibrate' in navigator) {
            navigator.vibrate(this.isFlagged() ? [100, 100, 100] : [200]);
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
            _this.start();
        };
        this.hardReset = function () {
            _this.grid(null);
            _this.started(false);
        };
        this.difficulties = ko.observableArray([
            {
                name: 'Beginner',
                width: ko.observable(8),
                height: ko.observable(8),
                mines: ko.observable(10)
            },
            {
                name: 'Intermediate',
                width: ko.observable(16),
                height: ko.observable(16),
                mines: ko.observable(40)
            },
            {
                name: 'Expert',
                width: ko.observable(30),
                height: ko.observable(16),
                mines: ko.observable(99)
            },
            {
                name: 'Custom',
                width: ko.observable(20),
                height: ko.observable(20),
                mines: ko.observable(50)
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
        var _a = this.selectedDifficulty(), width = _a.width, height = _a.height, mines = _a.mines;
        this.ensureNumber(width, height, mines);
        if (width() < 5 || height() < 5) {
            alert('Playing space is too small. Must be at least 5x5.');
            return;
        }
        if (width() > 45 || height() > 45) {
            alert('Playing space is too large. May be at most 45x45.');
            return;
        }
        if ((width() * height()) <= mines() + 1) {
            alert('Too many mines! Need at least two blank cells.');
            return;
        }
        if (mines() < 2) {
            alert('Need at least two mines!');
            return;
        }
        this.started(true);
        this.grid(new MinesweeperGrid(this.selectedDifficulty()));
        this.grid().isGameOver.subscribe(function (gameOver) {
            if (gameOver)
                _this.gameOver(_this.grid().wonGame);
        });
    };
    // ensures that an obserable holds a numerical value (not a string from user input)
    MinesweeperGame.prototype.ensureNumber = function () {
        var observables = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            observables[_i - 0] = arguments[_i];
        }
        observables.forEach(function (observable) {
            var value = observable();
            if (typeof value !== 'number') {
                observable(Number(value));
            }
        });
    };
    MinesweeperGame.prototype.gameOver = function (won) {
        var res = won ? 'Congratulations!\n' : 'Game over!\n';
        console.info(res);
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
                    return 'status-winner';
                else
                    return 'status-dead';
            }
            if (_this.mouseDown())
                return 'status-worried';
            else
                return 'status-happy';
        });
        this.cellRows = ko.pureComputed(function () {
            return _.chunk(_this.cells(), _this.difficulty.width());
        });
        this.flagsRemaining = ko.pureComputed(function () {
            return _this.difficulty.mines() - _this.usedFlags();
        });
        this.timeString = ko.pureComputed(function () {
            var seconds = _this.secondsPlayed();
            var minutes = Math.floor(seconds / 60);
            if (minutes)
                seconds %= 60;
            var str = ((seconds < 10) ? "0" + seconds : String(seconds)) + "s";
            if (minutes)
                str = ((minutes < 10) ? "0" + minutes : String(minutes)) + "m " + str;
            return str;
        });
        this.tick = function () {
            _this.secondsPlayed(_this.secondsPlayed() + 1);
        };
        this.isGameOver = ko.observable(false);
        this.wonGame = false;
        this.usedFlags = ko.observable(0);
        this.mouseDown = ko.observable(false);
        this.totalRevealed = 0;
        this.initialized = false;
        this.touchScreen = 'ontouchstart' in window;
        this.timer = 0;
        this.secondsPlayed = ko.observable(0);
        this.createCells();
        // this.init(); // do this after first reveal
    }
    MinesweeperGrid.prototype.init = function () {
        this.assignMines();
        this.computeAdjacencies();
        this.initialized = true;
        this.timer = setInterval(this.tick, 1000);
    };
    MinesweeperGrid.prototype.createCells = function () {
        var _this = this;
        var _a = this.difficulty, width = _a.width, height = _a.height;
        this.cells = ko.observableArray(_.flatten(_.range(height()).map(function (y) { return _.range(width()).map(function (x) {
            return new MinesweeperCell(x, y, _this);
        }); })));
    };
    MinesweeperGrid.prototype.assignMines = function () {
        var mines = this.difficulty.mines;
        var cells = this.cells().filter(function (cell) { return !cell.isRevealed(); });
        var mineCells = _.sampleSize(cells, mines());
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
                cell.adjacent(adjacent);
            });
        });
    };
    MinesweeperGrid.prototype.inRange = function (grid, x, y) {
        return (y in grid) && (x in grid[y]);
    };
    MinesweeperGrid.prototype.revealMines = function () {
        var _this = this;
        this.cells().forEach(function (cell) {
            if (cell.isMine) {
                if (!cell.isRevealed())
                    _this.totalRevealed++;
                cell.isRevealed(true);
            }
        });
        this.gameOver(false);
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
        var numNonMines = (width() * height()) - mines();
        if (this.totalRevealed === numNonMines) {
            this.autoFlag();
            this.gameOver(true);
        }
        if (!this.initialized)
            this.init();
    };
    MinesweeperGrid.prototype.gameOver = function (won) {
        this.wonGame = won;
        this.isGameOver(true);
        clearInterval(this.timer);
        this.timer = 0;
        var state = JSON.stringify({ won: won, seconds: this.secondsPlayed(), difficulty: this.difficulty.name });
        if (window.ga) {
            window.ga('send', 'event', 'Game', 'end', state);
            window.ga('send', 'event', 'Game', won ? 'win' : 'lose', state);
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
                if (next.adjacent() === 0) {
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
        if (window.ga) {
            window.ga('send', 'event', 'Game', 'start', 'difficulty=' + game.selectedDifficulty().name);
        }
    }
});
