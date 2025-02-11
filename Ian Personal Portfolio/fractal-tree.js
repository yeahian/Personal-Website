const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

// Parameters for the fractal tree
const angle = Math.PI / 6; // Angle between branches
const branchLength = 100;  // Initial branch length

// Function to draw the fractal tree
function drawFractalTree(x, y, length, angle, depth) {
    if (depth === 0) return;

    // Draw the current branch
    ctx.beginPath();
    ctx.moveTo(x, y);
    const newX = x + Math.cos(angle) * length;
    const newY = y - Math.sin(angle) * length;
    ctx.lineTo(newX, newY);
    ctx.stroke();

    // Draw the right branch
    drawFractalTree(newX, newY, length * 0.7, angle - Math.PI / 6, depth - 1);
    
    // Draw the left branch
    drawFractalTree(newX, newY, length * 0.7, angle + Math.PI / 6, depth - 1);
}

// Set up the canvas
ctx.strokeStyle = 'green';
ctx.lineWidth = 2;

// Start drawing the tree from the bottom center of the canvas
drawFractalTree(canvas.width / 2, canvas.height, branchLength, -Math.PI / 2, 10);
