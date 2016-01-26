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

        if (this.isMine) {
            this.parent.revealMines();
            if ('vibrate' in navigator) {
                navigator.vibrate(1500);
            }            
        } else {
            this.isRevealed(true);
            this.parent.incrementRevealed();
            
            if (this.adjacent() === 0) {
                // propogate through and auto-reveal recursively. 
                this.parent.revealAdjacentCells(this);
            }                
        }
    }
    
    // when mouse is being held down
    suspense() {
        if (!this.isRevealed() && !this.isFlagged())
            this.parent.mouseDown(true);
    }

    // when mouse is lifted
    relief() {
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
            navigator.vibrate(this.isFlagged() ? [100, 100, 100] : [200]);
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
    width: KnockoutObservable<number>;
    height: KnockoutObservable<number>;
    mines: KnockoutObservable<number>;
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
    
    start() {         
        if (!this.selectedDifficulty()) return;
               
        const { width, height, mines } = this.selectedDifficulty();

        if (width() < 5 || height() < 5) {
            alert('Playing space is too small. Must be at least 5x5');
            return;
        }

        if ((width() * height()) <= mines()) {
            alert('Too many mines!');
            return;
        }               
        
        if (mines() < 1) {
            alert('Need at least one mine!');
            return;
        }               
                       
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
    timer: number;
    secondsPlayed: KnockoutObservable<number>;
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
        this.initialized = false;
        this.touchScreen = 'ontouchstart' in window;
        this.timer = 0;
        this.secondsPlayed = ko.observable(0);

        this.createCells();
        // this.init(); // do this after first reveal
    }

    init() {
        this.assignMines();
        this.computeAdjacencies();
        this.initialized = true;
        this.timer = setInterval(this.tick, 1000);
    }
    
    createCells() {
        const { width, height } = this.difficulty;
        this.cells = ko.observableArray(_.flatten(
            _.range(height()).map(y => _.range(width()).map(x =>
                new MinesweeperCell(x, y, this)
            ))
        ));
    }
    
    assignMines() {
        const { mines } = this.difficulty;
        const cells = this.cells().filter(cell => !cell.isRevealed());
        const mineCells = _.sampleSize(cells, mines());
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
        this.cells().forEach(cell => {
            if (cell.isMine) {
                if (!cell.isRevealed())
                    this.totalRevealed++;
                    
                cell.isRevealed(true);                
            }
        });
        this.gameOver(false);
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
        const numNonMines = (width() * height()) - mines();
        if (this.totalRevealed === numNonMines) {
            this.autoFlag();
            this.gameOver(true);
        }
        
        if (!this.initialized)
            this.init();
    }
    
    gameOver(won: boolean) {
        this.wonGame = won;
        this.isGameOver(true);        
        clearInterval(this.timer);
        this.timer = 0;
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
            if (this.wonGame) 
                return 'status-winner';
            else 
                return 'status-dead'; 
        }    
        if (this.mouseDown()) 
            return 'status-worried';
        else 
            return 'status-happy'; 
    });
    
    cellRows = ko.pureComputed(() => {
        return _.chunk(this.cells(), this.difficulty.width());
    });
    
    flagsRemaining = ko.pureComputed(() => {
        return this.difficulty.mines() - this.usedFlags();
    });
    
    timeString = ko.pureComputed(() => {
        let seconds = this.secondsPlayed();
        let minutes = Math.floor(seconds / 60);        
        
        if (minutes) seconds %= 60;
        
        let str: string = ((seconds < 10) ? "0" + seconds : String(seconds)) + "s";    
        if (minutes)
           str = ((minutes < 10) ? "0" + minutes : String(minutes)) + "m " + str;

        return str;    
    });
    
    tick = () => {
        this.secondsPlayed(this.secondsPlayed() + 1);    
    };
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
