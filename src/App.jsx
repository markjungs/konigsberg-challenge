import React, { useState, useEffect, useRef } from 'react';

// Königsberg Challenge - Single file React app
// Updated layout: Graph and Info Panel appear side-by-side on one screen

// --------------------------- Helper graph utilities ---------------------------
function cloneGraph(graph) {
  return {
    nodes: graph.nodes.map(n => ({ ...n })),
    edges: graph.edges.map(e => ({ ...e })),
  };
}

function adjacencyList(graph) {
  const adj = {};
  graph.nodes.forEach(n => (adj[n.id] = []));
  graph.edges.forEach(e => {
    if (!e.used) {
      adj[e.a].push({ to: e.b, id: e.id });
      adj[e.b].push({ to: e.a, id: e.id });
    }
  });
  return adj;
}

function degreeCounts(graph) {
  const deg = {};
  graph.nodes.forEach(n => (deg[n.id] = 0));
  graph.edges.forEach(e => {
    deg[e.a] += 1;
    deg[e.b] += 1;
  });
  return deg;
}

function eulerianType(graph) {
  const deg = degreeCounts(graph);
  const odd = Object.entries(deg)
    .filter(([_, v]) => v % 2 === 1)
    .map(([k]) => k);
  if (odd.length === 0) return { type: 'circuit', odds: odd };
  if (odd.length === 2) return { type: 'trail', odds: odd };
  return { type: 'none', odds: odd };
}

function hierholzer(graph) {
  const adj = {};
  graph.nodes.forEach(n => (adj[n.id] = []));
  graph.edges.forEach(e => {
    adj[e.a].push({ id: e.id, to: e.b });
    adj[e.b].push({ id: e.id, to: e.a });
  });
  const deg = degreeCounts(graph);
  let start = graph.nodes.length ? graph.nodes[0].id : null;
  const oddNodes = Object.entries(deg)
    .filter(([_, v]) => v % 2 === 1)
    .map(([k]) => k);
  if (oddNodes.length > 0) start = oddNodes[0];
  if (!start) return null;

  const stack = [start];
  const path = [];
  const usedEdge = new Set();
  while (stack.length) {
    const v = stack[stack.length - 1];
    while (adj[v].length && usedEdge.has(adj[v][0].id)) adj[v].shift();
    if (adj[v].length === 0) {
      path.push(v);
      stack.pop();
    } else {
      const e = adj[v].shift();
      if (usedEdge.has(e.id)) continue;
      usedEdge.add(e.id);
      stack.push(e.to);
    }
  }

  const edgesSequence = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const edge = graph.edges.find(e => {
      const between = (e.a === a && e.b === b) || (e.a === b && e.b === a);
      const already = edgesSequence.includes(e.id);
      return between && !already;
    });
    if (edge) edgesSequence.push(edge.id);
  }
  return edgesSequence.reverse();
}

// --------------------------- Random graph generator ---------------------------
function generateRandomGraph(numNodes = 4, numEdges = 5, width = 800, height = 500) {
  const nodes = [];
  for (let i = 0; i < numNodes; i++) {
    nodes.push({
      id: String(i),
      x: 80 + Math.random() * (width - 160),
      y: 80 + Math.random() * (height - 160),
    });
  }
  const edges = [];
  let idCounter = 0;
  const perm = nodes.map(n => n.id);
  for (let i = 1; i < perm.length; i++) {
    const a = perm[i];
    const b = perm[Math.floor(Math.random() * i)];
    edges.push({ id: 'e' + idCounter++, a, b, used: false });
  }
  while (edges.length < numEdges) {
    const a = nodes[Math.floor(Math.random() * nodes.length)].id;
    const b = nodes[Math.floor(Math.random() * nodes.length)].id;
    if (a === b) continue;
    edges.push({ id: 'e' + idCounter++, a, b, used: false });
  }
  return { nodes, edges };
}

// --------------------------- Main React Component ---------------------------
export default function App() {
  const [graph, setGraph] = useState(() => generateRandomGraph(4, 5, 800, 500));
  const [currentNode, setCurrentNode] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('play');
  const [difficulty, setDifficulty] = useState('easy');
  const [animating, setAnimating] = useState(false);
  const animRef = useRef(null);

  useEffect(() => {
    if (difficulty === 'easy') setGraph(generateRandomGraph(4, 5, 800, 500));
    if (difficulty === 'medium') setGraph(generateRandomGraph(6, 8, 800, 500));
    if (difficulty === 'hard') setGraph(generateRandomGraph(8, 12, 800, 500));
    resetGame();
  }, [difficulty]);

  function resetGame() {
    setMoveHistory([]);
    setCurrentNode(null);
    setMessage('');
    setAnimating(false);
    if (animRef.current) {
      clearTimeout(animRef.current);
      animRef.current = null;
    }
    setGraph(g => {
      const copy = cloneGraph(g);
      copy.edges.forEach(e => (e.used = false));
      return copy;
    });
  }

  function handleNodeClick(nodeId) {
    if (animating) return;
    if (!currentNode) {
      setCurrentNode(nodeId);
      setMessage('Start at node ' + nodeId);
      return;
    }
    const edge = graph.edges.find(
      e => !e.used && ((e.a === currentNode && e.b === nodeId) || (e.b === currentNode && e.a === nodeId))
    );
    if (!edge) {
      setMessage('Invalid move — no unused bridge connects those nodes');
      return;
    }
    setGraph(g => {
      const copy = cloneGraph(g);
      const eidx = copy.edges.findIndex(x => x.id === edge.id);
      copy.edges[eidx].used = true;
      return copy;
    });
    setMoveHistory(h => [...h, edge.id]);
    setCurrentNode(nodeId);
    setMessage('Crossed bridge ' + edge.id);
  }

  function askAI() {
    const type = eulerianType(graph);
    if (type.type === 'none') {
      setMessage('Unsolvable: Odd-degree nodes: ' + type.odds.join(', '));
      return;
    }
    const seq = hierholzer(graph);
    if (!seq || seq.length === 0) {
      setMessage('AI could not compute a path');
      return;
    }
    setAnimating(true);
    setMoveHistory([]);
    setGraph(g => {
      const copy = cloneGraph(g);
      copy.edges.forEach(e => (e.used = false));
      return copy;
    });
    let i = 0;
    const animateStep = () => {
      if (i >= seq.length) {
        setAnimating(false);
        setMessage('AI finished traversal');
        return;
      }
      const eid = seq[i];
      setGraph(g => {
        const copy = cloneGraph(g);
        const eidx = copy.edges.findIndex(x => x.id === eid);
        if (eidx >= 0) copy.edges[eidx].used = true;
        return copy;
      });
      setMoveHistory(h => [...h, eid]);
      i++;
      animRef.current = setTimeout(animateStep, 600);
    };
    animateStep();
  }

  function giveHint() {
    const type = eulerianType(graph);
    if (type.type === 'none') {
      setMessage('No valid Eulerian path exists.');
      return;
    }
    const seq = hierholzer(graph);
    const next = seq.find(id => !graph.edges.find(e => e.id === id).used);
    if (!next) {
      setMessage('No unused edges left');
      return;
    }
    const e = graph.edges.find(x => x.id === next);
    setMessage('Hint: cross bridge between ' + e.a + ' and ' + e.b);
  }

  function suggestFixes() {
    const type = eulerianType(graph);
    if (type.type !== 'none') {
      setMessage('Already solvable (' + type.type + ')');
      return;
    }
    setMessage('Add bridges between odd nodes: ' + type.odds.join(' - '));
  }

  function newPuzzle() {
    if (difficulty === 'easy') setGraph(generateRandomGraph(4, 5, 800, 500));
    if (difficulty === 'medium') setGraph(generateRandomGraph(6, 8, 800, 500));
    if (difficulty === 'hard') setGraph(generateRandomGraph(8, 12, 800, 500));
    resetGame();
  }

  function edgeColor(e) {
    return e.used ? '#999' : '#0b69ff';
  }

  // --------------------------- UI Layout ---------------------------
  return (
    <div style={{
      fontFamily: 'Inter, Arial, sans-serif',
      height: '100vh',
      margin: 0,
      padding: '20px',
      backgroundColor: '#f0f4f8',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        margin: '0 0 20px 0',
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#1a365d'
      }}>
        The Königsberg Challenge — Eulerian Path Puzzle
      </h1>

      <div style={{
        display: 'flex',
        flex: 1,
        gap: '20px',
        minHeight: 0
      }}>
        {/* Graph Section - Left Side */}
        <div style={{
          flex: 3,
          backgroundColor: '#f7f7fb',
          borderRadius: '12px',
          padding: '15px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '15px',
            flexWrap: 'wrap'
          }}>
            <button style={buttonStyle} onClick={() => { setMode('play'); setMessage('Play mode'); }}>Play</button>
            <button style={buttonStyle} onClick={() => { setMode('add-edge'); setMessage('Add-edge mode'); }}>Add Bridge</button>
            <select style={buttonStyle} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button style={buttonStyle} onClick={newPuzzle}>New Puzzle</button>
            <button style={buttonStyle} onClick={resetGame}>Reset</button>
          </div>

          <div style={{
            flex: 1,
            backgroundColor: '#eaf3ff',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0
          }}>
            <svg 
              width="100%" 
              height="100%" 
              viewBox="0 0 800 500"
              style={{ display: 'block' }}
            >
              {graph.edges.map(e => {
                const a = graph.nodes.find(n => n.id === e.a);
                const b = graph.nodes.find(n => n.id === e.b);
                if (!a || !b) return null;
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                return (
                  <g key={e.id}>
                    <line 
                      x1={a.x} y1={a.y} 
                      x2={b.x} y2={b.y} 
                      stroke={edgeColor(e)} 
                      strokeWidth={4} 
                      strokeLinecap="round" 
                      opacity={e.used ? 0.3 : 1} 
                    />
                    <circle 
                      cx={midX} cy={midY} r={10} 
                      fill={e.used ? '#ddd' : '#fff'} 
                      stroke="#333" 
                      strokeWidth={1} 
                      opacity={0.9} 
                    />
                  </g>
                );
              })}
              {graph.nodes.map(n => (
                <g key={n.id} onClick={() => handleNodeClick(n.id)} style={{ cursor: 'pointer' }}>
                  <circle 
                    cx={n.x} cy={n.y} r={18} 
                    fill={currentNode === n.id ? '#ffcc00' : '#fff'} 
                    stroke="#333" 
                    strokeWidth={2} 
                  />
                  <text 
                    x={n.x} y={n.y + 5} 
                    textAnchor="middle" 
                    fontWeight={700}
                    fontSize="14"
                  >
                    {n.id}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Info Panel - Right Side */}
        <div style={{
          flex: 1,
          minWidth: '300px',
          maxWidth: '350px',
          backgroundColor: '#f7f7fb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600' }}>Game Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ margin: 0 }}>Mode: <strong>{mode}</strong></p>
              <p style={{ margin: 0 }}>Current node: <strong>{currentNode ?? '—'}</strong></p>
              <p style={{ margin: 0 }}>Moves: <strong>{moveHistory.length}</strong> / {graph.edges.length}</p>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button style={buttonStyle} onClick={askAI} disabled={animating}>AI Solve</button>
              <button style={buttonStyle} onClick={giveHint}>Hint</button>
              <button style={buttonStyle} onClick={suggestFixes}>Suggest Fix</button>
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Eulerian Check</h3>
            <EulerianStatus graph={graph} />
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Rules</h3>
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '14px', lineHeight: '1.4' }}>
              <li>Start on any land area (node)</li>
              <li>Move along one bridge at a time</li>
              <li>Each bridge disappears once crossed</li>
              <li>Use all bridges exactly once to win</li>
            </ol>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Status</h3>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              minHeight: '60px',
              fontSize: '14px',
              border: '1px solid #e2e8f0'
            }}>
              {message || 'Ready to play...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------- Eulerian Status ---------------------------
function EulerianStatus({ graph }) {
  const { type, odds } = eulerianType(graph);
  return (
    <div style={{ fontSize: '14px' }}>
      <p style={{ margin: '4px 0' }}>Type: <strong>{type}</strong></p>
      <p style={{ margin: '4px 0' }}>Odd-degree nodes: {odds.length ? odds.join(', ') : 'None'}</p>
    </div>
  );
}

// --------------------------- Button Style ---------------------------
const buttonStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e0',
  backgroundColor: 'white',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500'
};