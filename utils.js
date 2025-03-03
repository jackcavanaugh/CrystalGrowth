// Utility functions for crystal growth simulations

// Map temperature to a color for visualization
// T_infty (coldest) -> dark blue
// 0 (warmest) -> light blue
function temperatureToColor(temp, T_infty) {
    const ratio = (temp - T_infty) / (0 - T_infty);
    const r = Math.round(0 + ratio * 135);
    const g = Math.round(0 + ratio * 206);
    const b = Math.round(80 + ratio * 170);
    return `rgb(${r},${g},${b})`;
}

// Initialize a 2D grid with given dimensions and initial values
function initializeGrid(width, height, initialValue) {
    let grid = [];
    for (let i = 0; i < width; i++) {
        grid[i] = [];
        for (let j = 0; j < height; j++) {
            grid[i][j] = initialValue;
        }
    }
    return grid;
}

// Fisher-Yates shuffle algorithm for arrays
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Setup canvas with container dimensions
function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    
    // Use fixed dimensions matching our CSS
    canvas.width = 500;
    canvas.height = 250;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    return {
        canvas,
        ctx
    };
}

// Calculate grid dimensions based on canvas size and cell size
function calculateGridDimensions(canvasWidth, canvasHeight, cellWidth, cellHeight) {
    // Leave some margin around the edges
    const effectiveWidth = canvasWidth - 2 * cellWidth;
    const effectiveHeight = canvasHeight - 2 * cellHeight;
    
    return {
        width: Math.max(3, Math.floor(effectiveWidth / cellWidth)),
        height: Math.max(3, Math.floor(effectiveHeight / cellHeight))
    };
}

// Common state initialization for all grid types
function initializeState(canvasId, cellSize, T_infty, gridWidth, gridHeight) {
    const { canvas, ctx } = setupCanvas(canvasId);
    
    // Initialize grid arrays for phase (0: melt, 1: crystal) and temperature field
    const grid = Array(gridWidth).fill().map(() => Array(gridHeight).fill(0));
    const T = Array(gridWidth).fill().map(() => Array(gridHeight).fill(T_infty));
    
    return {
        canvas,
        ctx,
        cellSize,
        gridWidth,
        gridHeight,
        grid,
        T,
        T_infty
    };
}

// Calculate angle between two points
function calculateAngle(point1, point2) {
    return Math.atan2(point2.y - point1.y, point2.x - point1.x);
}

// Apply periodic boundary conditions to coordinates
function applyPeriodicBoundary(coord, max) {
    return (coord + max) % max;
}

// Calculate effective growth threshold with anisotropy
function calculateEffectiveThreshold(baseThreshold, anisotropyFactor, theta) {
    return baseThreshold * (1 + anisotropyFactor * Math.cos(4 * theta));
}

// Generalized animation function for all grid types
function animate(state, relaxTemperature, interfaceGrowth, drawGrid, relaxIterations, onAnimationFrame) {
    for (let k = 0; k < relaxIterations; k++) {
        relaxTemperature();
    }
    interfaceGrowth();
    drawGrid(state);
    const animationId = requestAnimationFrame(() => animate(state, relaxTemperature, interfaceGrowth, drawGrid, relaxIterations, onAnimationFrame));
    if (onAnimationFrame) {
        onAnimationFrame(animationId);
    }
} 