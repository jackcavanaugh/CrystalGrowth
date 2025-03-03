// Square grid simulation of dendritic crystal growth with periodic boundaries

function initSquares(params) {
    const { canvas, ctx } = setupCanvas('canvasSquare');
    const { width, height } = calculateGridDimensions(canvas.width, canvas.height, params.squareEdge, params.squareEdge);

    // Initialize grid arrays for phase (0: melt, 1: crystal) and temperature field
    const grid = Array(width).fill().map(() => Array(height).fill(0));
    const T = Array(width).fill().map(() => Array(height).fill(params.T_infty));
    
    // Create initial seed: center plus 2 random neighbors
    const centerI = Math.floor(width / 2);
    const centerJ = Math.floor(height / 2);
    
    // Always include the center
    grid[centerI][centerJ] = 1;
    T[centerI][centerJ] = params.T_m;
    
    function getNeighbors(i, j) {
        // Only use direct neighbors (no diagonals)
        const neighbors = [
            { i: i + 1, j: j },     // right
            { i: i - 1, j: j },     // left
            { i: i, j: j + 1 },     // down
            { i: i, j: j - 1 }      // up
        ];
        return neighbors.map(n => ({
            i: applyPeriodicBoundary(n.i, width),
            j: applyPeriodicBoundary(n.j, height)
        }));
    }
    
    // Get all neighbors and randomly select 2
    let neighbors = getNeighbors(centerI, centerJ);
    neighbors = shuffleArray(neighbors).slice(0, 2);
    for (let n of neighbors) {
        grid[n.i][n.j] = 1;
        T[n.i][n.j] = params.T_m;
    }
    
    return {
        canvas,
        ctx,
        cellSize: params.squareEdge,
        gridWidth: width,
        gridHeight: height,
        grid,
        T,
        T_infty: params.T_infty
    };
}

function runSquares(state, params, onAnimationFrame) {
    const T_m = params.T_m;
    const baseGrowthThreshold = params.baseGrowthThreshold;
    const anisotropyFactor = params.anisotropyFactor;
    const relaxIterations = params.relaxIterations;
    const centerI = Math.floor(state.gridWidth / 2);
    const centerJ = Math.floor(state.gridHeight / 2);

    function getNeighbors(i, j) {
        // Only use direct neighbors (no diagonals)
        const neighbors = [
            { i: i + 1, j: j },     // right
            { i: i - 1, j: j },     // left
            { i: i, j: j + 1 },     // down
            { i: i, j: j - 1 }      // up
        ];
        return neighbors.map(n => ({
            i: applyPeriodicBoundary(n.i, state.gridWidth),
            j: applyPeriodicBoundary(n.j, state.gridHeight)
        }));
    }

    function relaxTemperature() {
        let newT = [];
        for (let i = 0; i < state.gridWidth; i++) {
            newT[i] = [];
            for (let j = 0; j < state.gridHeight; j++) {
                if (state.grid[i][j] === 1) {
                    newT[i][j] = T_m;
                } else {
                    let neighbors = getNeighbors(i, j);
                    let sum = 0;
                    for (let n of neighbors) {
                        sum += state.T[n.i][n.j];
                    }
                    newT[i][j] = sum / neighbors.length;
                }
            }
        }
        state.T = newT;
    }

    function adjacentToCrystal(i, j) {
        let neighbors = getNeighbors(i, j);
        for (let n of neighbors) {
            if (state.grid[n.i][n.j] === 1) return true;
        }
        return false;
    }

    function interfaceGrowth() {
        let interfaceCells = [];
        for (let i = 0; i < state.gridWidth; i++) {
            for (let j = 0; j < state.gridHeight; j++) {
                if (state.grid[i][j] === 0 && adjacentToCrystal(i, j)) {
                    interfaceCells.push({ i, j });
                }
            }
        }
        
        shuffleArray(interfaceCells);
        
        for (let cell of interfaceCells) {
            let { i, j } = cell;
            let cellCenter = { 
                x: i * state.cellSize + state.cellSize / 2, 
                y: j * state.cellSize + state.cellSize / 2 
            };
            let clusterCenter = { 
                x: centerI * state.cellSize + state.cellSize / 2, 
                y: centerJ * state.cellSize + state.cellSize / 2 
            };
            
            let theta = calculateAngle(clusterCenter, cellCenter);
            let effectiveThreshold = calculateEffectiveThreshold(baseGrowthThreshold, anisotropyFactor, theta);
            
            if (state.T[i][j] > effectiveThreshold) {
                state.grid[i][j] = 1;
                state.T[i][j] = T_m;
            }
        }
    }

    function animate() {
        for (let k = 0; k < relaxIterations; k++) {
            relaxTemperature();
        }
        interfaceGrowth();
        drawSquareGrid(state);
        const animationId = requestAnimationFrame(animate);
        if (onAnimationFrame) {
            onAnimationFrame(animationId);
        }
    }

    animate();
}

function squareTemperatureToColor(temp, state) {
    // Map temperature from T_infty to 0 to a color gradient
    // T_infty (coldest) -> dark blue
    // 0 (warmest) -> light blue
    const ratio = (temp - state.T_infty) / (0 - state.T_infty);
    const r = Math.round(0 + ratio * 135);
    const g = Math.round(0 + ratio * 206);
    const b = Math.round(80 + ratio * 170);
    return `rgb(${r},${g},${b})`;
}

function drawSquareGrid(state) {
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    
    for (let i = 0; i < state.gridWidth; i++) {
        for (let j = 0; j < state.gridHeight; j++) {
            let x = i * state.cellSize;
            let y = j * state.cellSize;
            let fill = state.grid[i][j] === 1 ? "#FFF" : temperatureToColor(state.T[i][j], state.T_infty);
            state.ctx.fillStyle = fill;
            state.ctx.fillRect(x, y, state.cellSize, state.cellSize);
        }
    }
}