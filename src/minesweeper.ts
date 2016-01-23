/// <reference path="../decl/knockout.d.ts" />
declare var ko: KnockoutStatic;

/// <reference path="../decl/lodash.d.ts" />

class MinesweeperCell {
    
    isFlagged: KnockoutObservable<boolean>;
    isRevealed: KnockoutObservable<boolean>;
    isMine: boolean;
    adjacent: number;
    
    constructor(public x: number, public y: number, private parent: MinesweeperGrid) {
        this.isFlagged = ko.observable(false);
        this.isRevealed = ko.observable(false);
        this.isMine = false;
        this.adjacent = 0;
    }
    
    reveal() {
        if (this.isRevealed()) return;
        
        if (this.isFlagged()) return;
        
        this.isRevealed(true);
        this.parent.incrementRevealed();
        
        if (this.adjacent > 0) {
            // propogate through and auto-reveal recursively. 
        }
        
        if (this.isMine) {
            this.parent.revealMines();
            alert("You lose!");
            window.location.reload();
        }
    }
    
    flag() {
        if (this.isFlagged()) {
            this.parent.removeFlag();
        } else {
            this.parent.useFlag();
        }
         
        this.isFlagged(!this.isFlagged());        
        return false; // prevent event propogation
    }
    
    cellText = ko.pureComputed(() => {        
        if (this.isRevealed() && this.adjacent > 0)
            return this.adjacent;
        
        if (this.isRevealed() && this.isMine)
            return '✺';

        if (this.isFlagged())
            return '🚩';
                        
        return '&nbsp;'
    })
    
    cellCss = ko.pureComputed(() => {
        let classes: string[] = [];
        if (this.adjacent > 0)
            classes.push(`cell-adjacent-${this.adjacent}`);       
        if (this.isFlagged())
            classes.push`flagged`;
        if (this.isMine)
            classes.push`mine`;
        if (this.isRevealed())
            classes.push`revealed`;
            
        return classes.join` `;        
    })
}

interface MinesweeperDifficulty {
    width: number;
    height: number;
    mines: number;
}

const MinesweeperDifficulties = {    
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

function computed(target: () => any) {
    return ko.computed(target);
}

class MinesweeperGrid {
    
    static offsets = [
        { x: -1, y: -1 },
        { x:  0, y: -1 },
        { x:  1, y: -1 },

        { x: -1, y:  0 },
        { x:  1, y:  0 },

        { x: -1, y:  1 },
        { x:  0, y:  1 },
        { x:  1, y:  1 },
    ];
    
    cells: KnockoutObservableArray<MinesweeperCell>;
    isGameOver: KnockoutObservable<boolean>;
    wonGame: KnockoutObservable<boolean>;
    usedFlags: KnockoutObservable<number>;
    totalRevealed: number;
    
    constructor(public difficulty: MinesweeperDifficulty) {        
        this.isGameOver = ko.observable(false);
        this.wonGame = ko.observable(false);
        this.usedFlags = ko.observable(0);
        this.totalRevealed = 0;
        this.init();
    }

    init() {
        this.createCells();
        this.assignMines();
        this.computeAdjacencies();
    }
    
    createCells() {
        const { width, height } = this.difficulty;
        this.cells = ko.observableArray(_.flatten(
            _.range(width).map(x => _.range(height).map(y =>
                new MinesweeperCell(x, y, this)
            ))
        ));
    }
    
    assignMines() {
        const { mines } = this.difficulty;
        const mineCells = _.sampleSize(this.cells(), mines);
        mineCells.forEach(cell => cell.isMine = true);
    }
    
    computeAdjacencies() {
        const grid = _.chunk(this.cells(), this.difficulty.width);
        grid.forEach((row, x) => {
            row.forEach((cell, y) => {
                if (cell.isMine) return;
                
                const adjacent = _.sumBy(MinesweeperGrid.offsets, offset => {
                    if (x + offset.x in grid && y + offset.y in grid[x]) {
                        return grid[x + offset.x][y + offset.y].isMine ? 1 : 0;
                    }
                    return 0;
                });
                cell.adjacent = adjacent;
            })
        })
    }
    
    revealMines() {
        let won = true;
        this.cells().forEach(cell => {
            if (cell.isMine) {
                if (cell.isRevealed()) {
                    won = false;
                }
                if (!cell.isRevealed())
                    this.totalRevealed++;
                    
                cell.isRevealed(true);                
            }
        });
        this.isGameOver(true);
        this.wonGame(won);
    }
    
    useFlag() {
        this.usedFlags(this.usedFlags() + 1);
    }
    
    removeFlag() {
        this.usedFlags(this.usedFlags() - 1);
    }
    
    incrementRevealed() {
        this.totalRevealed++;
        const { width, height, mines } = this.difficulty;
        const numNonMines = (width * height) - mines;
        if (this.totalRevealed === numNonMines) {
            this.isGameOver(true);
            this.wonGame(true);
            
            alert('Congratulations!');
        }
    }

    gameState = ko.pureComputed(() => {
        if (this.isGameOver()) {
            if (this.wonGame()) return '😎';
            else return '☹';
        }    
        return '☺';
    });
    
    cellRows = ko.pureComputed(() => {
        return _.chunk(this.cells(), this.difficulty.width);
    });
    
    flagsRemaining = ko.pureComputed(() => {
        return this.difficulty.mines - this.usedFlags();
    })
}

let game = new MinesweeperGrid(MinesweeperDifficulties.beginner);
ko.applyBindings(game);