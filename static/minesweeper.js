function initMinesweeper(difficulty) {
    const board = document.getElementById('minesweeper-board');
    const timerDisplay = document.getElementById('minesweeper-timer');
    board.innerHTML = '';
    let width, height, mines, cellSize;
    if (difficulty === 'easy') {
        width = 9;
        height = 9;
        mines = 10;
        cellSize = 34;
    } else { // expert
        width = 30;
        height = 16;
        mines = 80; // Reduced from 99 to 80
        cellSize = 25; // Increased from 20 to 25
    }
    const cells = [];
    let gameOver = false;
    let timeLeft = 300000; // 5 minutes in milliseconds
    let startTime = null;
    let firstClick = true;

    // Set up grid with fixed dimensions
    board.style.gridTemplateColumns = `repeat(${width}, ${cellSize}px)`;
    board.style.gridTemplateRows = `repeat(${height}, ${cellSize}px)`;
    board.style.width = `${width * cellSize}px`;
    board.style.height = `${height * cellSize}px`;

    // Initialize board
    for (let i = 0; i < height; i++) {
        cells[i] = [];
        for (let j = 0; j < width; j++) {
            const cell = document.createElement('div');
            cell.classList.add('minesweeper-cell');
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.fontSize = `${cellSize * 0.6}px`;
            cell.dataset.row = i;
            cell.dataset.col = j;
            cells[i][j] = { mine: false, revealed: false, flagged: false, count: 0 };
            board.appendChild(cell);
        }
    }

    // Timer
    function updateTimer() {
        if (gameOver || timeLeft <= 0) {
            if (timeLeft <= 0) {
                endMinesweeperGame();
                alert('Time’s up!');
            }
            return;
        }
        const now = performance.now();
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        timeLeft = Math.max(0, 300000 - elapsed);
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        requestAnimationFrame(updateTimer);
    }
    requestAnimationFrame(updateTimer);

    // Event listeners
    board.addEventListener('click', (e) => {
        if (gameOver) return;
        const cell = e.target.closest('.minesweeper-cell');
        if (!cell || cell.classList.contains('revealed') || cell.classList.contains('flagged')) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (firstClick) {
            placeMines(row, col);
            firstClick = false;
        }
        
        revealCell(row, col);
        checkWin();
    });

    board.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (gameOver) return;
        const cell = e.target.closest('.minesweeper-cell');
        if (!cell || cell.classList.contains('revealed')) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        toggleFlag(row, col, cell);
    });

    function placeMines(excludeRow, excludeCol) {
        let placed = 0;
        while (placed < mines) {
            const row = Math.floor(Math.random() * height);
            const col = Math.floor(Math.random() * width);
            if (!(row === excludeRow && col === excludeCol) && !cells[row][col].mine) {
                cells[row][col].mine = true;
                placed++;
            }
        }
        calculateNumbers();
    }

    function calculateNumbers() {
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (!cells[i][j].mine) {
                    let count = 0;
                    for (let di = -1; di <= 1; di++) {
                        for (let dj = -1; dj <= 1; dj++) {
                            const ni = i + di;
                            const nj = j + dj;
                            if (ni >= 0 && ni < height && nj >= 0 && nj < width && cells[ni][nj].mine) {
                                count++;
                            }
                        }
                    }
                    cells[i][j].count = count;
                }
            }
        }
    }

    function revealCell(row, col) {
        const cell = cells[row][col];
        if (cell.revealed || cell.flagged) return;
        cell.revealed = true;
        const domCell = board.children[row * width + col];
        domCell.classList.add('revealed');
        if (cell.mine) {
            domCell.classList.add('mine');
            domCell.textContent = '💣';
            gameOver = true;
            revealAllMines();
            setTimeout(() => {
                alert('Game Over! You hit a mine.');
                endMinesweeperGame();
            }, 100);
        } else if (cell.count > 0) {
            domCell.textContent = cell.count;
        } else {
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    const ni = row + di;
                    const nj = col + dj;
                    if (ni >= 0 && ni < height && nj >= 0 && nj < width) {
                        revealCell(ni, nj);
                    }
                }
            }
        }
    }

    function toggleFlag(row, col, domCell) {
        const cell = cells[row][col];
        if (cell.revealed) return;
        if (!cell.flagged) {
            cell.flagged = true;
            domCell.textContent = '🚩';
            domCell.classList.add('flagged');
        } else {
            cell.flagged = false;
            domCell.textContent = '';
            domCell.classList.remove('flagged');
        }
    }

    function revealAllMines() {
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (cells[i][j].mine) {
                    const domCell = board.children[i * width + j];
                    domCell.classList.add('revealed', 'mine');
                    domCell.textContent = '💣';
                }
            }
        }
    }

    function checkWin() {
        let unrevealedNonMines = 0;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (!cells[i][j].mine && !cells[i][j].revealed) {
                    unrevealedNonMines++;
                }
            }
        }
        if (unrevealedNonMines === 0) {
            gameOver = true;
            setTimeout(() => {
                alert('You win! All non-mine cells revealed.');
                endMinesweeperGame();
            }, 100);
        }
    }
}