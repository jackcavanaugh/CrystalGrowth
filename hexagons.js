// Hexagonal grid simulation of crystal growth with periodic boundaries

function initHexagons(params) {
    // Hexagon geometry (pointy-topped)
    const hexRadius = params.hexRadius;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const horizSpacing = 1.5 * hexRadius;  // Simplified from (2 * hexRadius * 0.75)
    
    const { canvas, ctx } = setupCanvas('canvasHexagon');
    const { width, height } = calculateGridDimensions(canvas.width, canvas.height, horizSpacing, hexHeight);

    // Initialize grid arrays for phase (0: melt, 1: crystal) and temperature field
    const grid = Array(width).fill().map(() => Array(height).fill(0));
    const T = Array(width).fill().map(() => Array(height).fill(params.T_infty));
    
    // Create initial seed: center plus 2 random neighbors
    const centerQ = Math.floor(width / 2);
    const centerR = Math.floor(height / 2);
    
    // Always include the center
    grid[centerQ][centerR] = 1;
    T[centerQ][centerR] = params.T_m;
    
    // Get immediate neighbors of center
    let neighbors = [];
    if (centerQ % 2 === 0) {
        neighbors = [
            { q: centerQ + 1, r: centerR },     // East
            { q: centerQ,     r: centerR - 1 }, // North
            { q: centerQ - 1, r: centerR - 1 }, // Northwest
            { q: centerQ - 1, r: centerR },     // West
            { q: centerQ - 1, r: centerR + 1 }, // Southwest
            { q: centerQ,     r: centerR + 1 }  // South
        ];
    } else {
        neighbors = [
            { q: centerQ + 1, r: centerR },     // East
            { q: centerQ + 1, r: centerR - 1 }, // Northeast
            { q: centerQ,     r: centerR - 1 }, // North
            { q: centerQ - 1, r: centerR },     // West
            { q: centerQ,     r: centerR + 1 }, // South
            { q: centerQ + 1, r: centerR + 1 }  // Southeast
        ];
    }
    
    // Apply periodic boundaries and select 2 random neighbors
    neighbors = neighbors.map(n => ({
        q: applyPeriodicBoundary(n.q, width),
        r: applyPeriodicBoundary(n.r, height)
    }));
    neighbors = shuffleArray(neighbors).slice(0, 2);
    
    // Set the selected neighbors as crystal
    for (let n of neighbors) {
        grid[n.q][n.r] = 1;
        T[n.q][n.r] = params.T_m;
    }
    
    return {
        canvas,
        ctx,
        hexRadius,
        gridWidth: width,
        gridHeight: height,
        grid,
        T,
        T_infty: params.T_infty,
        horizSpacing,
        vertSpacing: hexHeight
    };
}

function runHexagons(state, params, onAnimationFrame) {
    const T_m = params.T_m;
    const baseGrowthThreshold = params.baseGrowthThreshold;
    const anisotropyFactor = params.anisotropyFactor;
    const relaxIterations = params.relaxIterations;
    const centerQ = Math.floor(state.gridWidth / 2);
    const centerR = Math.floor(state.gridHeight / 2);

    function getNeighbors(q, r) {
        let neighbors;
        if (q % 2 === 0) {
            neighbors = [
                { q: q + 1, r: r },     // East
                { q: q,     r: r - 1 }, // North
                { q: q - 1, r: r - 1 }, // Northwest
                { q: q - 1, r: r },     // West
                { q: q - 1, r: r + 1 }, // Southwest
                { q: q,     r: r + 1 }  // South
            ];
        } else {
            neighbors = [
                { q: q + 1, r: r },     // East
                { q: q + 1, r: r - 1 }, // Northeast
                { q: q,     r: r - 1 }, // North
                { q: q - 1, r: r },     // West
                { q: q,     r: r + 1 }, // South
                { q: q + 1, r: r + 1 }  // Southeast
            ];
        }
        return neighbors.map(n => ({
            q: applyPeriodicBoundary(n.q, state.gridWidth),
            r: applyPeriodicBoundary(n.r, state.gridHeight)
        }));
    }

    function relaxTemperature() {
        let newT = [];
        for (let q = 0; q < state.gridWidth; q++) {
            newT[q] = [];
            for (let r = 0; r < state.gridHeight; r++) {
                if (state.grid[q][r] === 1) {
                    newT[q][r] = T_m;
                } else {
                    const neighbors = getNeighbors(q, r);
                    let sum = 0;
                    for (let n of neighbors) {
                        sum += state.T[n.q][n.r];
                    }
                    newT[q][r] = sum / neighbors.length;
                }
            }
        }
        state.T = newT;
    }

    function adjacentToCrystal(q, r) {
        const neighbors = getNeighbors(q, r);
        for (let n of neighbors) {
            if (state.grid[n.q][n.r] === 1) return true;
        }
        return false;
    }

    function interfaceGrowth() {
        let interfaceCells = [];
        for (let q = 0; q < state.gridWidth; q++) {
            for (let r = 0; r < state.gridHeight; r++) {
                if (state.grid[q][r] === 0 && adjacentToCrystal(q, r)) {
                    interfaceCells.push({ q, r });
                }
            }
        }

        shuffleArray(interfaceCells);

        for (let cell of interfaceCells) {
            let { q, r } = cell;
            let { x, y } = hexToPixel(q, r, state);
            let centerPixel = hexToPixel(centerQ, centerR, state);
            
            let theta = calculateAngle(centerPixel, { x, y });
            let effectiveThreshold = calculateEffectiveThreshold(baseGrowthThreshold, anisotropyFactor, theta);
            
            if (state.T[q][r] > effectiveThreshold) {
                state.grid[q][r] = 1;
                state.T[q][r] = T_m;
            }
        }
    }

    function animate() {
        for (let k = 0; k < relaxIterations; k++) {
            relaxTemperature();
        }
        interfaceGrowth();
        drawHexagonGrid(state);
        const animationId = requestAnimationFrame(animate);
        if (onAnimationFrame) {
            onAnimationFrame(animationId);
        }
    }

    animate();
}

function hexToPixel(q, r, state) {
    // Center the grid in the canvas
    const offsetX = (state.canvas.width - state.gridWidth * state.horizSpacing) / 2;
    const offsetY = (state.canvas.height - state.gridHeight * state.vertSpacing) / 2;
    
    return {
        x: q * state.horizSpacing + offsetX,
        y: r * state.vertSpacing + offsetY + (q % 2 ? state.vertSpacing / 2 : 0)
    };
}

function hexagonTemperatureToColor(temp, state) {
    // Map temperature from T_infty to 0 to a color gradient
    // T_infty (coldest) -> dark blue
    // 0 (warmest) -> light blue
    const ratio = (temp - state.T_infty) / (0 - state.T_infty);
    const r = Math.round(0 + ratio * 135);
    const g = Math.round(0 + ratio * 206);
    const b = Math.round(80 + ratio * 170);
    return `rgb(${r},${g},${b})`;
}

// Draw a single pointy-topped hexagon centered at (x, y) with a given radius.
function drawHexagon(x, y, radius, fillStyle, ctx) {
    ctx.beginPath();
    // Pre-calculate the angle increment
    const angleStep = Math.PI / 3;  // 60 degrees in radians
    const startAngle = -Math.PI / 6;  // -30 degrees in radians
    
    for (let i = 0; i < 6; i++) {
        const angle = startAngle + i * angleStep;
        const vx = x + radius * Math.cos(angle);
        const vy = y + radius * Math.sin(angle);
        ctx[i ? 'lineTo' : 'moveTo'](vx, vy);
    }
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
}

function drawHexagonGrid(state) {
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    
    for (let q = 0; q < state.gridWidth; q++) {
        for (let r = 0; r < state.gridHeight; r++) {
            const { x, y } = hexToPixel(q, r, state);
            drawHexagon(x, y, state.hexRadius, 
                state.grid[q][r] === 1 ? "#FFF" : temperatureToColor(state.T[q][r], state.T_infty), 
                state.ctx);
        }
    }
}