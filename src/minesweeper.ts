/// <reference path="../decl/knockout.d.ts" />
declare var ko: KnockoutStatic;

/// <reference path="../decl/lodash.d.ts" />

class MinesweeperCell {
    
    isFlagged: KnockoutObservable<boolean>;
    isRevealed: KnockoutObservable<boolean>;
    isMine: boolean;
    adjacent: KnockoutObservable<number>;
    
    constructor(public x: number, public y: number, private parent: MinesweeperGrid) {
        this.isFlagged = ko.observable(false);
        this.isRevealed = ko.observable(false);
        this.adjacent = ko.observable(0);
        this.isMine = false;
    }
    
    reveal() { 
        if (this.parent.isGameOver() || this.isRevealed() || this.isFlagged()) 
            return;
        
        this.parent.mouseDown(false);

        this.isRevealed(true);
        this.parent.incrementRevealed();
        
        if (!this.isMine && this.adjacent() === 0) {
            // propogate through and auto-reveal recursively. 
            this.parent.revealAdjacentCells(this);
        }
        
        if (this.isMine) {
            this.parent.revealMines();
            if ('vibrate' in navigator) {
                navigator.vibrate(1500);
            }
        }
    }
    
    // when mouse is being held down
    suspense() {
        if (!this.isRevealed())
            this.parent.mouseDown(true);
    }

    // when mouse is lifted
    relief() {
        if (!this.isRevealed())
            this.parent.mouseDown(false);
    }
    
    flag() {        
        if (this.parent.isGameOver() || this.isRevealed())
            return;

        this.parent.mouseDown(false);

        if (this.isFlagged()) {
            this.parent.removeFlag();
        } else {
            this.parent.useFlag();
        }        
        
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
        
        this.isFlagged(!this.isFlagged());        
        return false; // prevent event propogation
    }
    
    cellText = ko.pureComputed(() => {        
        if (this.isRevealed() && this.isMine)
            return '✺';

        if (this.isRevealed() && this.adjacent() > 0)
            return this.adjacent();
        
        if (this.isFlagged())
            return '⚐';
                        
        return '&nbsp;'
    })
    
    cellCss = ko.pureComputed(() => {
        let classes: string[] = [];
        if (!this.isMine && this.adjacent() > 0)
            classes.push(`cell-adjacent-${this.adjacent()}`);       
        if (this.isFlagged())
            classes.push`flagged`;
        if (this.isMine)
            classes.push`mine`;
        if (this.isRevealed())
            classes.push`revealed`;
        if (this.parent.touchScreen)
            classes.push`touch-screen`;    
                    
        return classes.join` `;        
    })
}

interface MinesweeperDifficulty {
    name: string;
    width: number;
    height: number;
    mines: number;
}

class MinesweeperGame {
    difficulties: KnockoutObservableArray<MinesweeperDifficulty>;
    started: KnockoutObservable<boolean>;
    selectedDifficulty: KnockoutObservable<MinesweeperDifficulty>;
    grid: KnockoutObservable<MinesweeperGrid>;
    
    
    constructor() {
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
    
    start() {         
        if (!this.selectedDifficulty()) return;
               
        this.started(true);
        this.grid(new MinesweeperGrid(this.selectedDifficulty()));
        this.grid().isGameOver.subscribe(gameOver => {
            if (gameOver) this.gameOver(this.grid().wonGame);
        });
    }
    
    gameOver(won: boolean) {
        const res = won ? 'Congratulations!\n' : 'Game over!\n';
        console.info(res);
    }
    
    reset = () => {
        this.grid(null);
        this.start();
    }
    
    hardReset = () => {
        this.grid(null);
        this.started(false);
    }
} 

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
    usedFlags: KnockoutObservable<number>;
    mouseDown: KnockoutObservable<boolean>;
    wonGame: boolean;
    totalRevealed: number;
    initialized: boolean;
    touchScreen: boolean;

    constructor(public difficulty: MinesweeperDifficulty) {        
        this.isGameOver = ko.observable(false);
        this.wonGame = false;
        this.usedFlags = ko.observable(0);
        this.mouseDown = ko.observable(false);
        this.totalRevealed = 0;
        this.createCells();
        this.initialized = false;
        this.touchScreen = 'ontouchstart' in window;
        // this.init(); // do this after first reveal
    }

    init() {
        this.assignMines();
        this.computeAdjacencies();
        this.initialized = true;
    }
    
    createCells() {
        const { width, height } = this.difficulty;
        this.cells = ko.observableArray(_.flatten(
            _.range(height).map(y => _.range(width).map(x =>
                new MinesweeperCell(x, y, this)
            ))
        ));
    }
    
    assignMines() {
        const { mines } = this.difficulty;
        const cells = this.cells().filter(cell => !cell.isRevealed());
        const mineCells = _.sampleSize(cells, mines);
        mineCells.forEach(cell => cell.isMine = true);
    }
    
    computeAdjacencies() {
        const grid = this.cellRows();
        grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                const adjacent = _.sumBy(MinesweeperGrid.offsets, offset => {
                    const cX = x + offset.x;
                    const cY = y + offset.y;
                    if (this.inRange(grid, cX, cY)) {
                        return grid[cY][cX].isMine ? 1 : 0;
                    }
                    return 0;
                });
                cell.adjacent(adjacent);
            })
        })
    }
    
    inRange(grid: MinesweeperCell[][], x: number, y: number) {
        return (y in grid) && (x in grid[y]);
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
        this.wonGame = won;
        if (won) {
            this.autoFlag();
        }
        
        this.isGameOver(true);
    }
    
    useFlag() {
        this.usedFlags(this.usedFlags() + 1);
    }
    
    removeFlag() {
        this.usedFlags(this.usedFlags() - 1);
    }
    
    autoFlag() {
        this.cells().forEach(cell => {
            if (cell.isFlagged()) return;
            if (cell.isMine) {
                cell.isFlagged(true);
                this.useFlag();
            }
        });
    }
    
    incrementRevealed() {
        this.totalRevealed++;
        const { width, height, mines } = this.difficulty;
        const numNonMines = (width * height) - mines;
        if (this.totalRevealed === numNonMines) {
            this.wonGame = true;
            this.isGameOver(true);
        }
        
        if (!this.initialized)
            this.init();
    }
    
    revealAdjacentCells(current: MinesweeperCell, done: MinesweeperCell[] = []) {
        done.push(current);
        const grid = this.cellRows();
        MinesweeperGrid.offsets.forEach(offset => {
            const nX = current.x + offset.x;
            const nY = current.y + offset.y;
            if (this.inRange(grid, nX, nY)) {
                let next = grid[nY][nX];
                if (done.indexOf(next) > -1) 
                    return;
                
                if (next.adjacent() === 0) {      
                    this.revealAdjacentCells(next, done);
                }
                if (!next.isRevealed()) {
                    this.incrementRevealed();        
                }
                if (next.isFlagged()) {
                    this.removeFlag();
                    next.isFlagged(false);
                }
                next.isRevealed(true);  
            }
        })
    }

    gameState = ko.pureComputed(() => {
        if (this.isGameOver()) {
            if (this.wonGame) return 'status-winner';
            else return 'status-dead'; 
        }    
        if (this.mouseDown())
            return 'status-worried';
                    
        return 'status-happy'; 
    });
    
    cellRows = ko.pureComputed(() => {
        return _.chunk(this.cells(), this.difficulty.width);
    });
    
    flagsRemaining = ko.pureComputed(() => {
        return this.difficulty.mines - this.usedFlags();
    })
}

const game = new MinesweeperGame;
window.onload = () => {
    ko.applyBindings(game);
};

game.started.subscribe(started => {
    if (started) {
        console.log('Started a new game!', 'Difficulty:', game.selectedDifficulty().name);
    }
})
