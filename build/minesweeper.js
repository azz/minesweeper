/// <reference path="../decl/knockout.d.ts" />
/// <reference path="../decl/lodash.d.ts" />
var MinesweeperCell = (function () {
    function MinesweeperCell(x, y, parent) {
        var _this = this;
        this.x = x;
        this.y = y;
        this.parent = parent;
        this.cellText = ko.pureComputed(function () {
            if (_this.isRevealed() && _this.adjacent > 0)
                return _this.adjacent;
            if (_this.isRevealed() && _this.isMine())
                return '✺';
            if (_this.isFlagged())
                return '🚩';
            return '&nbsp;';
        });
        this.cellCss = ko.pureComputed(function () {
            var classes = [];
            if (_this.adjacent > 0)
                classes.push("cell-adjacent-" + _this.adjacent);
            if (_this.isFlagged())
                (_a = ["flagged"], _a.raw = ["flagged"], classes.push(_a));
            if (_this.isMine())
                (_b = ["mine"], _b.raw = ["mine"], classes.push(_b));
            if (_this.isRevealed())
                (_c = ["revealed"], _c.raw = ["revealed"], classes.push(_c));
            return (_d = [" "], _d.raw = [" "], classes.join(_d));
            var _a, _b, _c, _d;
        });
        this.isMine = ko.observable(false);
        this.isFlagged = ko.observable(false);
        this.adjacent = 0;
        this.isRevealed = ko.observable(false);
    }
    MinesweeperCell.prototype.reveal = function () {
        if (this.isRevealed())
            return;
        if (this.isFlagged())
            return;
        this.isRevealed(true);
        if (this.adjacent > 0) {
        }
        if (this.isMine()) {
            this.parent.revealMines();
            alert("You lose!");
            window.location.reload();
        }
    };
    MinesweeperCell.prototype.flag = function () {
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
function range(n) {
    var i = 0;
    var a = Array(n);
    for (var i_1 = 0; i_1 < n; ++i_1) {
        a[i_1] = i_1;
    }
    return a;
}
var MinesweeperDifficulties = {
    beginner: {
        width: 8,
        height: 8,
        mines: 10
    },
    intermediate: {
        width: 16,
        height: 16,
        mines: 40
    },
    expert: {
        width: 30,
        height: 16,
        mines: 99
    }
};
function computed(target) {
    return ko.computed(target);
}
var MinesweeperGrid = (function () {
    function MinesweeperGrid(difficulty) {
        var _this = this;
        this.difficulty = difficulty;
        this.gameState = ko.pureComputed(function () {
            if (_this.isGameOver()) {
                if (_this.wonGame())
                    return '😎�';
                else
                    return '☹';
            }
            return '☺';
        });
        this.cellRows = ko.pureComputed(function () {
            return _.chunk(_this.cells(), _this.difficulty.width);
        });
        this.flagsRemaining = ko.pureComputed(function () {
            return _this.difficulty.mines - _this.usedFlags();
        });
        this.isGameOver = ko.observable(false);
        this.wonGame = ko.observable(false);
        this.usedFlags = ko.observable(0);
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
        this.cells = ko.observableArray(_.flatten(_.range(width).map(function (x) { return _.range(height).map(function (y) {
            return new MinesweeperCell(x, y, _this);
        }); })));
    };
    MinesweeperGrid.prototype.assignMines = function () {
        var mines = this.difficulty.mines;
        var mineCells = _.sampleSize(this.cells(), mines);
        mineCells.forEach(function (cell) { return cell.isMine(true); });
    };
    MinesweeperGrid.prototype.computeAdjacencies = function () {
        var grid = _.chunk(this.cells(), this.difficulty.width);
        grid.forEach(function (row, x) {
            row.forEach(function (cell, y) {
                if (cell.isMine())
                    return;
                var adjacent = _.sumBy(MinesweeperGrid.offsets, function (offset) {
                    if (x + offset.x in grid && y + offset.y in grid[x]) {
                        return grid[x + offset.x][y + offset.y].isMine() ? 1 : 0;
                    }
                    return 0;
                });
                cell.adjacent = adjacent;
            });
        });
    };
    MinesweeperGrid.prototype.revealMines = function () {
        var won = true;
        this.cells().forEach(function (cell) {
            if (cell.isMine) {
                if (cell.isRevealed()) {
                    won = false;
                }
                cell.isRevealed(true);
            }
        });
        this.isGameOver(true);
        this.wonGame(won);
    };
    MinesweeperGrid.prototype.useFlag = function () {
        this.usedFlags(this.usedFlags() + 1);
    };
    MinesweeperGrid.prototype.removeFlag = function () {
        this.usedFlags(this.usedFlags() - 1);
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
var game = new MinesweeperGrid(MinesweeperDifficulties.beginner);
ko.applyBindings(game);
