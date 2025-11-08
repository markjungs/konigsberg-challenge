/*  CSC108 - ABCF1
    Problem #2 - Project Title: Konigsberg Challenge
    Members:
            Judith Isaga
            Bonifacio Allego
            Mark Jun Salva
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const undoBtn = document.getElementById("undoBtn");

// sub-node layout 
const nodes = [
  // A-land
  { id: "A1", x: 270, y: 270 },
  { id: "A2", x: 230, y: 270 },
  { id: "A4", x: 250, y: 225 },

  // B-land
  { id: "B5", x: 675, y: 270 },
  { id: "B6", x: 635, y: 270 },
  { id: "B7", x: 655, y: 225 },

  // C-land
  { id: "C3", x: 450, y: 125 },
  { id: "C4", x: 425, y: 100 },
  { id: "C7", x: 475, y: 100 },

  // D-land
  { id: "D1", x: 420, y: 440 },
  { id: "D2", x: 420, y: 490 },
  { id: "D3", x: 450, y: 420 },
  { id: "D5", x: 480, y: 490 },
  { id: "D6", x: 480, y: 440 }
];

// bridges
const bridges = [
  { from: "A1", to: "D1", num: 1 },
  { from: "A2", to: "D2", num: 2 },
  { from: "C3", to: "D3", num: 3 },
  { from: "A4", to: "C4", num: 4 },
  { from: "B5", to: "D5", num: 5 },
  { from: "B6", to: "D6", num: 6 },
  { from: "B7", to: "C7", num: 7 }
];

// land groups
const landGroups = {
  A: ["A1", "A2", "A4"],
  B: ["B5", "B6", "B7"],
  C: ["C3", "C4", "C7"],
  D: ["D1", "D2", "D3", "D5", "D6"]
};

// main node centers
const landCenters = {
  A: { x: 250, y: 250 },
  B: { x: 655, y: 250 },
  C: { x: 450, y: 100 },
  D: { x: 450, y: 460 }
};

// colors
const backgroundColor = "#007bff";
const bridgeColor = "gold";
const nodeColor = "#8B4513";
const textColor = "#000";
const landOutline = "#000";

let currentLand = null;
let currentNode = null;
let usedBridges = [];
let moveHistory = [];
let gameOver = false;

// helpers
function getNode(id) {
  return nodes.find(n => n.id === id);
}
function getLandFromNode(nodeId) {
  return nodeId.charAt(0);
}
function checkIfStranded(land) {
  const landNodes = landGroups[land];
  const available = bridges.some(
    b =>
      !usedBridges.includes(b.num) &&
      (landNodes.includes(b.from) || landNodes.includes(b.to))
  );
  return !available;
}

function drawGame() {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw lands
  Object.entries(landCenters).forEach(([label, pos]) => {
    const { x, y } = pos;
    const size = label === "D" ? 70 : 45;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = nodeColor;
    ctx.strokeStyle = landOutline;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#000";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  });

  // draw bridges
  bridges.forEach(b => {
    const a = getNode(b.from);
    const c = getNode(b.to);
    if (usedBridges.includes(b.num)) return;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineWidth = 20;
    ctx.strokeStyle = bridgeColor;
    ctx.lineCap = "round";
    ctx.stroke();

    const midX = (a.x + c.x) / 2;
    const midY = (a.y + c.y) / 2;
    ctx.fillStyle = textColor;
    ctx.font = "bold 16px Arial";
    ctx.fillText(b.num, midX + 5, midY - 5);
  });

  // highlight sub-node choices
  if (!gameOver && currentLand && currentNode) {
    const sameLandNodes = landGroups[currentLand];
    const nextMoves = bridges.filter(
      b =>
        !usedBridges.includes(b.num) &&
        (sameLandNodes.includes(b.from) || sameLandNodes.includes(b.to))
    );
    nextMoves.forEach(b => {
      const nextId = sameLandNodes.includes(b.from) ? b.to : b.from;
      const n = getNode(nextId);
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 10;
      ctx.stroke();
    });
  }

  // draw sub-nodes
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
    const isConnectedToUsed = usedBridges.some(b =>
      bridges.find(br => br.num === b && (br.from === n.id || br.to === n.id))
    );
    ctx.fillStyle = isConnectedToUsed ? "#999" : "#fff";
    ctx.fill();
    ctx.strokeStyle = "#e7f302ff";
    ctx.lineWidth = 8;
    ctx.stroke();
  });
}

canvas.addEventListener("click", e => {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // detect land click
  const clickedLand = Object.entries(landCenters).find(
    ([, pos]) => Math.hypot(pos.x - x, pos.y - y) < 45
  );
  const clickedNode = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 10);

  // start
  if (!currentLand && clickedLand) {
    currentLand = clickedLand[0];
    currentNode = getNode(landGroups[currentLand][0]);
    drawGame();
    return;
  }

  // after starting
  if (currentLand && clickedNode) {
    const sameLandNodes = landGroups[currentLand];

    const bridge = bridges.find(
      b =>
        !usedBridges.includes(b.num) &&
        ((sameLandNodes.includes(b.from) && b.to === clickedNode.id) ||
          (sameLandNodes.includes(b.to) && b.from === clickedNode.id))
    );

    if (bridge) {
      usedBridges.push(bridge.num);
      moveHistory.push({
        bridgeNum: bridge.num,
        previousNodeId: currentNode.id,
        previousLand: currentLand
      });

      const landedLand = getLandFromNode(
        sameLandNodes.includes(bridge.from) ? bridge.to : bridge.from
      );
      currentLand = landedLand;
      currentNode = getNode(landGroups[landedLand][0]);

      // check stranded condition
      if (checkIfStranded(currentLand) && usedBridges.length < bridges.length) {
        gameOver = true;
        statusText.textContent = `🏝️ You failed! You are stranded on Land ${currentLand}.`;
      }
    }

    // check win condition
    if (!gameOver && usedBridges.length === bridges.length) {
      const degrees = {};
      bridges.forEach(b => {
        degrees[b.from] = (degrees[b.from] || 0) + 1;
        degrees[b.to] = (degrees[b.to] || 0) + 1;
      });
      const oddNodes = Object.keys(degrees).filter(k => degrees[k] % 2 !== 0);
      gameOver = true;
      if (oddNodes.length === 0)
        statusText.textContent = "🎉 Eulerian circuit completed!";
      else if (oddNodes.length === 2)
        statusText.textContent = "🎉 Eulerian path completed!";
      else statusText.textContent = "⚠️ No valid Eulerian path!";
    }

    drawGame();
  }
});

// Undo
undoBtn.addEventListener("click", () => {
  if (moveHistory.length === 0) return;
  const lastMove = moveHistory.pop();
  usedBridges = usedBridges.filter(b => b !== lastMove.bridgeNum);
  currentNode = getNode(lastMove.previousNodeId);
  currentLand = lastMove.previousLand;
  gameOver = false;
  statusText.textContent = "";
  drawGame();
});

// Reset
resetBtn.addEventListener("click", () => {
  usedBridges = [];
  currentNode = null;
  currentLand = null;
  moveHistory = [];
  gameOver = false;
  statusText.textContent = "";
  drawGame();
});

drawGame();
