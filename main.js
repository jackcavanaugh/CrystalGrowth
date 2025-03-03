// Global variables to store simulation states
let hexagonState = null;
let triangleState = null;
let squareState = null;

// Animation IDs for each simulation type
let hexagonAnimationId = null;
let triangleAnimationId = null;
let squareAnimationId = null;

// Function to stop all running animations
function stopAllAnimations() {
    if (hexagonAnimationId) {
        cancelAnimationFrame(hexagonAnimationId);
        hexagonAnimationId = null;
    }
    if (triangleAnimationId) {
        cancelAnimationFrame(triangleAnimationId);
        triangleAnimationId = null;
    }
    if (squareAnimationId) {
        cancelAnimationFrame(squareAnimationId);
        squareAnimationId = null;
    }
}

// Wait for the user to click "Initialize" to set up the simulation state
document.getElementById('initButton').addEventListener('click', () => {
    // Stop any running animations before reinitializing
    stopAllAnimations();
    
    // Read parameter values
    const params = {
        hexRadius: parseFloat(document.getElementById('hexRadius').value),
        triangleEdge: parseFloat(document.getElementById('triangleEdge').value),
        squareEdge: parseFloat(document.getElementById('squareEdge').value),
        T_infty: parseFloat(document.getElementById('T_infty').value),
        T_m: parseFloat(document.getElementById('T_m').value),
        baseGrowthThreshold: parseFloat(document.getElementById('baseGrowthThreshold').value),
        anisotropyFactor: parseFloat(document.getElementById('anisotropyFactor').value),
        relaxIterations: parseInt(document.getElementById('relaxIterations').value)
    };

    // Initialize states
    hexagonState = initHexagons(params);
    triangleState = initTriangles(params);
    squareState = initSquares(params);

    // Draw initial states
    drawHexagonGrid(hexagonState);
    drawTriangleGrid(triangleState);
    drawSquareGrid(squareState);

});
  
// Wait for the user to click "Start" to set up the simulation state
document.getElementById('startButton').addEventListener('click', () => {
    if (!hexagonState || !triangleState || !squareState) {
        alert('Please initialize the simulation first!');
        return;
    }

    // Stop any existing animations before starting new ones
    stopAllAnimations();

    // Read current parameter values
    const params = {
        T_m: parseFloat(document.getElementById('T_m').value),
        baseGrowthThreshold: parseFloat(document.getElementById('baseGrowthThreshold').value),
        anisotropyFactor: parseFloat(document.getElementById('anisotropyFactor').value),
        relaxIterations: parseInt(document.getElementById('relaxIterations').value)
    };

    // Start animations with ID tracking
    runHexagons(hexagonState, params, id => hexagonAnimationId = id);
    runTriangles(triangleState, params, id => triangleAnimationId = id);
    runSquares(squareState, params, id => squareAnimationId = id);
});
  
// Add stop button handler
document.getElementById('stopButton').addEventListener('click', stopAllAnimations);
  