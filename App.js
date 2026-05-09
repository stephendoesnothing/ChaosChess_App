const { useState, useEffect } = React;
const Zap = () => <span>⚡</span>;
const ShieldAlert = () => <span>⚠️</span>;
const Skull = ({className}) => <span className={className}>💀</span>;
const Trophy = ({className}) => <span className={className}>🏆</span>;
const FlipVertical = () => <span>↔️</span>;
const RefreshCw = () => <span>🔄</span>;
const ChevronRight = ({className}) => <span className={className}>›</span>;

// --- Custom CSS for Juice Effects ---
const juiceStyles = `
  @keyframes shake {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    20% { transform: translate(-4px, 4px) rotate(-1deg); }
    40% { transform: translate(4px, -4px) rotate(1deg); }
    60% { transform: translate(-4px, -4px) rotate(-1deg); }
    80% { transform: translate(4px, 4px) rotate(1deg); }
  }
  .animate-shake {
    animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
  }
  @keyframes floatUp {
    0% { transform: translateY(0) scale(1); opacity: 0.8; filter: grayscale(0%); }
    100% { transform: translateY(-50px) scale(1.5); opacity: 0; filter: grayscale(100%); }
  }
  .animate-float-up {
    animation: floatUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }
  @keyframes popIn {
    0% { transform: scale(0.5); opacity: 0; }
    70% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .animate-pop-in {
    animation: popIn 0.3s ease-out forwards;
  }
`;

// --- Chaos Rules Definitions ---
const MASTER_RULES = [
  { id: 'hobbit', name: 'Hobbit Battle', desc: 'Only Pawns and Royals can move for the next 3 turns.', type: 'duration', duration: 3 },
  { id: 'short_stop', name: 'Short Stop', desc: 'Sliding pieces (Queens, Rooks, Bishops) can only move 1 square per turn for 3 turns.', type: 'duration', duration: 3 },
  { id: 'peace', name: 'Peace Treaty', desc: 'Capturing pieces is illegal for the next 2 turns.', type: 'duration', duration: 2 },
  { id: 'pit', name: 'Bottomless Pit', desc: 'Creates a Pit on a random empty square. Any piece that enters it dies instantly.', type: 'instant' },
  { id: 'chest', name: 'Treasure Chest', desc: 'Creates a Chest on a random empty square. The first piece to step on it promotes to a Queen.', type: 'instant' },
  { id: 'swap', name: 'Anti-Camping', desc: 'Instantly swaps the position of a random White piece and a random Black piece (Royals excluded).', type: 'instant' },
  { id: 'strike', name: 'Orbital Strike', desc: 'Destroys all pieces (except Royals) in a random 3x3 area on the board.', type: 'instant' },
  { id: 'earthquake', name: 'Earthquake', desc: 'Instantly destroys all Pawns currently on the board.', type: 'instant' },
  { id: 'reinforcements', name: 'Reinforcements', desc: 'Spawns two friendly Pawns on random empty squares.', type: 'instant' },
  { id: 'mutant_pawns', name: 'Mutant Pawns', desc: 'Instantly transforms all your existing Pawns into Knights.', type: 'instant' },
  { id: 'no_retreat', name: 'No Retreat', desc: 'Pieces cannot move backwards for the next 3 turns.', type: 'duration', duration: 3 },
  { id: 'pacifist', name: 'Pacifist Pawns', desc: 'Pawns become invincible walls but cannot capture for 3 turns.', type: 'duration', duration: 3 }
];

const PIECE_IMAGES = {
  wk: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  wq: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  wr: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  wb: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  wn: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  wp: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  bk: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  bq: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  br: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  bb: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  bn: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  bp: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
};

// --- Chess Engine Logic ---
const setupBoard = () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let i = 0; i < 8; i++) {
    board[0][i] = { type: backRank[i], color: 'b', hasMoved: false, isRoyal: backRank[i] === 'k' };
    board[1][i] = { type: 'p', color: 'b', hasMoved: false, isRoyal: false };
    board[6][i] = { type: 'p', color: 'w', hasMoved: false, isRoyal: false };
    board[7][i] = { type: backRank[i], color: 'w', hasMoved: false, isRoyal: backRank[i] === 'k' };
  }
  return board;
};

const isEnemy = (board, r, c, color, activeRules) => {
  if (activeRules.some(ar => ar.id === 'peace')) return false; 
  if (activeRules.some(ar => ar.id === 'pacifist') && board[r]?.[c]?.type === 'p') return false;
  return board[r]?.[c] && board[r][c].color !== color;
};

const isEmpty = (board, r, c) => board[r]?.[c] === null;

const isEnemyOrEmpty = (board, r, c, color, activeRules) => 
  isEmpty(board, r, c) || isEnemy(board, r, c, color, activeRules);

const getLegalMoves = (board, r, c, lastMove, activeRules) => {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  
  if (activeRules.some(ar => ar.id === 'hobbit') && piece.type !== 'p' && !piece.isRoyal) return [];

  const hasShortStop = activeRules.some(ar => ar.id === 'short_stop');
  const maxSlide = hasShortStop ? 1 : 8;

  const dirs = {
    r: [[0, 1], [0, -1], [1, 0], [-1, 0]],
    b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    q: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
    k: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
    n: [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]
  };

  if (dirs[piece.type]) {
    if (['r', 'b', 'q'].includes(piece.type)) {
      for (let [dr, dc] of dirs[piece.type]) {
        let nr = r + dr, nc = c + dc;
        let dist = 0;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && dist < maxSlide) {
          if (isEmpty(board, nr, nc)) {
            moves.push([nr, nc]);
          } else {
            if (isEnemy(board, nr, nc, piece.color, activeRules)) moves.push([nr, nc]);
            break;
          }
          nr += dr; nc += dc;
          dist++;
        }
      }
    } else {
      for (let [dr, dc] of dirs[piece.type]) {
        let nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && isEnemyOrEmpty(board, nr, nc, piece.color, activeRules)) {
          moves.push([nr, nc]);
        }
      }
    }
  }

  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    const isPacifist = activeRules.some(ar => ar.id === 'pacifist');
    
    if (r + dir >= 0 && r + dir < 8 && isEmpty(board, r + dir, c)) {
      moves.push([r + dir, c]);
      if (r === startRow && isEmpty(board, r + dir * 2, c)) moves.push([r + dir * 2, c]);
    }
    
    if (!isPacifist) {
      if (r + dir >= 0 && r + dir < 8) {
        if (c - 1 >= 0 && isEnemy(board, r + dir, c - 1, piece.color, activeRules)) moves.push([r + dir, c - 1]);
        if (c + 1 >= 0 && isEnemy(board, r + dir, c + 1, piece.color, activeRules)) moves.push([r + dir, c + 1]);
      }
      if (lastMove && lastMove.piece.type === 'p') {
        const [lr, lc] = lastMove.to;
        const [lfr, lfc] = lastMove.from;
        if (Math.abs(lr - lfr) === 2 && lr === r && Math.abs(lc - c) === 1) {
          if (!activeRules.some(ar => ar.id === 'peace')) moves.push([r + dir, lc, 'ep']);
        }
      }
    }
  }

  if (piece.isRoyal && piece.type === 'k' && !piece.hasMoved) {
    if (board[r][7]?.type === 'r' && !board[r][7].hasMoved && isEmpty(board, r, 5) && isEmpty(board, r, 6)) moves.push([r, 6, 'castle_k']);
    if (board[r][0]?.type === 'r' && !board[r][0].hasMoved && isEmpty(board, r, 1) && isEmpty(board, r, 2) && isEmpty(board, r, 3)) moves.push([r, 2, 'castle_q']);
  }

  let finalMoves = moves;
  if (activeRules.some(ar => ar.id === 'no_retreat')) {
    finalMoves = finalMoves.filter(([mr, mc]) => {
      if (piece.color === 'w') return mr <= r; 
      return mr >= r; 
    });
  }

  return finalMoves;
};

// --- React Component ---
function App() {
  const [board, setBoard] = useState(setupBoard());
  const [turn, setTurn] = useState('w');
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [status, setStatus] = useState('active'); 
  const [winner, setWinner] = useState(null);
  const [autoFlip, setAutoFlip] = useState(false);

  // Chaos Engine State
  const [plyCount, setPlyCount] = useState(0);
  const [activeRules, setActiveRules] = useState([]);
  const [boardMods, setBoardMods] = useState({ pit: null, chest: null });
  const [draftOptions, setDraftOptions] = useState([]);
  const [chaosLog, setChaosLog] = useState([]);
  
  // Visual Juice State
  const [shake, setShake] = useState(false);
  const [vfx, setVfx] = useState([]);

  const resetGame = () => {
    setBoard(setupBoard());
    setTurn('w');
    setSelected(null);
    setValidMoves([]);
    setLastMove(null);
    setStatus('active');
    setWinner(null);
    setPlyCount(0);
    setActiveRules([]);
    setBoardMods({ pit: null, chest: null });
    setDraftOptions([]);
    setChaosLog([]);
    setVfx([]);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 350);
  };

  const spawnEffect = (r, c, content, type) => {
    const id = Math.random();
    setVfx(prev => [...prev, { id, r, c, content, type }]);
    setTimeout(() => {
      setVfx(prev => prev.filter(e => e.id !== id));
    }, 800); // Remove after animation completes
  };

  const logEvent = (msg) => {
    setChaosLog(prev => [{ id: Date.now(), msg }, ...prev].slice(0, 6));
  };

  const triggerChaosDraft = () => {
    const shuffled = [...MASTER_RULES].sort(() => 0.5 - Math.random());
    setDraftOptions(shuffled.slice(0, 3));
  };

  const getEmptySquares = (currentBoard) => {
    const empty = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (!currentBoard[i][j]) empty.push([i, j]);
      }
    }
    return empty;
  };

  const applyRule = (rule) => {
    setDraftOptions([]);
    logEvent(`Activated: ${rule.name}`);

    if (rule.type === 'duration') {
      setActiveRules(prev => {
        const filtered = prev.filter(r => r.id !== rule.id);
        return [...filtered, { ...rule }];
      });
      return;
    }

    let newBoard = board.map(row => [...row]);
    
    if (rule.id === 'pit' || rule.id === 'chest') {
      const emptySq = getEmptySquares(newBoard);
      if (emptySq.length > 0) {
        const sq = emptySq[Math.floor(Math.random() * emptySq.length)];
        setBoardMods(prev => ({ ...prev, [rule.id]: sq }));
      }
    } 
    else if (rule.id === 'swap') {
      const wPieces = [];
      const bPieces = [];
      for(let i=0; i<8; i++){
        for(let j=0; j<8; j++){
          const p = newBoard[i][j];
          if(p && !p.isRoyal){
            if(p.color === 'w') wPieces.push([i, j]);
            else bPieces.push([i, j]);
          }
        }
      }
      if(wPieces.length > 0 && bPieces.length > 0) {
        const [wr, wc] = wPieces[Math.floor(Math.random() * wPieces.length)];
        const [br, bc] = bPieces[Math.floor(Math.random() * bPieces.length)];
        const temp = newBoard[wr][wc];
        newBoard[wr][wc] = newBoard[br][bc];
        newBoard[br][bc] = temp;
        
        spawnEffect(wr, wc, '🌀', 'teleport');
        spawnEffect(br, bc, '🌀', 'teleport');
      }
      setBoard(newBoard);
    }
    else if (rule.id === 'strike') {
      triggerShake();
      const centerR = Math.floor(Math.random() * 6) + 1;
      const centerC = Math.floor(Math.random() * 6) + 1;
      for(let i = centerR - 1; i <= centerR + 1; i++) {
        for(let j = centerC - 1; j <= centerC + 1; j++) {
          if(newBoard[i][j] && !newBoard[i][j].isRoyal) {
             const destroyed = newBoard[i][j];
             spawnEffect(i, j, PIECE_IMAGES[destroyed.color + destroyed.type], 'ghost');
             newBoard[i][j] = null;
          }
          spawnEffect(i, j, '💥', 'explosion');
        }
      }
      setBoard(newBoard);
    }
    else if (rule.id === 'earthquake') {
      triggerShake();
      for(let i=0; i<8; i++) {
        for(let j=0; j<8; j++) {
          if(newBoard[i][j] && newBoard[i][j].type === 'p') {
            const destroyed = newBoard[i][j];
            spawnEffect(i, j, PIECE_IMAGES[destroyed.color + destroyed.type], 'ghost');
            spawnEffect(i, j, '🪨', 'explosion');
            newBoard[i][j] = null;
          }
        }
      }
      setBoard(newBoard);
    }
    else if (rule.id === 'reinforcements') {
      const emptySq = getEmptySquares(newBoard);
      for(let i=0; i<2; i++) {
        if (emptySq.length > 0) {
          const idx = Math.floor(Math.random() * emptySq.length);
          const [er, ec] = emptySq.splice(idx, 1)[0];
          newBoard[er][ec] = { type: 'p', color: turn, hasMoved: false, isRoyal: false };
          spawnEffect(er, ec, '✨', 'spawn');
        }
      }
      setBoard(newBoard);
    }
    else if (rule.id === 'mutant_pawns') {
      for(let i=0; i<8; i++) {
        for(let j=0; j<8; j++) {
          if(newBoard[i][j] && newBoard[i][j].type === 'p' && newBoard[i][j].color === turn) {
            newBoard[i][j].type = 'n';
            spawnEffect(i, j, '🧬', 'spawn');
          }
        }
      }
      setBoard(newBoard);
    }
    
    checkGameStatus(newBoard, turn, lastMove, activeRules);
  };

  const executeMove = (r, c, mr, mc, flag) => {
    let newBoard = board.map(row => [...row]);
    const piece = newBoard[r][c];
    const targetPiece = newBoard[mr][mc];

    // Juice: Capture Effect
    if (targetPiece) {
      triggerShake();
      spawnEffect(mr, mc, PIECE_IMAGES[targetPiece.color + targetPiece.type], 'ghost');
      spawnEffect(mr, mc, '💨', 'poof');
    }

    newBoard[mr][mc] = { ...piece, hasMoved: true };
    newBoard[r][c] = null;

    if (piece.type === 'p' && (mr === 0 || mr === 7)) {
      newBoard[mr][mc].type = 'q';
      spawnEffect(mr, mc, '✨', 'spawn');
    }
    
    if (flag === 'ep') {
      const epPiece = newBoard[r][mc];
      triggerShake();
      spawnEffect(r, mc, PIECE_IMAGES[epPiece.color + epPiece.type], 'ghost');
      newBoard[r][mc] = null;
    }
    
    if (flag === 'castle_k') { newBoard[r][5] = { ...newBoard[r][7], hasMoved: true }; newBoard[r][7] = null; }
    if (flag === 'castle_q') { newBoard[r][3] = { ...newBoard[r][0], hasMoved: true }; newBoard[r][0] = null; }

    if (boardMods.pit && mr === boardMods.pit[0] && mc === boardMods.pit[1]) {
      newBoard[mr][mc] = null;
      triggerShake();
      spawnEffect(mr, mc, PIECE_IMAGES[piece.color + piece.type], 'ghost');
      logEvent(`${piece.isRoyal ? 'Royal ' : ''}${piece.color === 'w' ? 'White' : 'Black'} fell in the Pit!`);
    }
    if (boardMods.chest && mr === boardMods.chest[0] && mc === boardMods.chest[1]) {
      newBoard[mr][mc].type = 'q';
      setBoardMods(prev => ({ ...prev, chest: null }));
      spawnEffect(mr, mc, '✨', 'spawn');
      logEvent(`${piece.isRoyal ? 'Royal ' : ''}${piece.color === 'w' ? 'White' : 'Black'} found the Chest!`);
    }

    setBoard(newBoard);
    setLastMove({ from: [r, c], to: [mr, mc], piece });
    setSelected(null);
    setValidMoves([]);

    const nextRules = activeRules.map(ar => ({ ...ar, duration: ar.duration - 1 })).filter(ar => ar.duration > 0);
    setActiveRules(nextRules);

    const nextTurn = turn === 'w' ? 'b' : 'w';
    setTurn(nextTurn);
    
    const newPly = plyCount + 1;
    setPlyCount(newPly);

    if (newPly > 0 && newPly % 5 === 0 && status === 'active') {
      triggerChaosDraft();
    }

    checkGameStatus(newBoard, nextTurn, { from: [r, c], to: [mr, mc], piece }, nextRules);
  };

  const checkGameStatus = (currentBoard, nextTurnColor, currentLastMove, currentRules) => {
    let wRoyalExists = false;
    let bRoyalExists = false;
    let hasLegalMoves = false;

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const p = currentBoard[i][j];
        if (p) {
          if (p.isRoyal && p.color === 'w') wRoyalExists = true;
          if (p.isRoyal && p.color === 'b') bRoyalExists = true;
          
          if (p.color === nextTurnColor) {
            if (getLegalMoves(currentBoard, i, j, currentLastMove, currentRules).length > 0) {
              hasLegalMoves = true;
            }
          }
        }
      }
    }

    if (!wRoyalExists && !bRoyalExists) {
      setStatus('draw');
    } else if (!wRoyalExists) {
      setStatus('assassinated');
      setWinner('Black');
      logEvent('White Royal was Assassinated!');
    } else if (!bRoyalExists) {
      setStatus('assassinated');
      setWinner('White');
      logEvent('Black Royal was Assassinated!');
    } else if (!hasLegalMoves) {
      setStatus('stalemate');
    }
  };

  const handleSquareClick = (r, c) => {
    if (status !== 'active' || draftOptions.length > 0) return; 

    if (selected) {
      const [sr, sc] = selected;
      const move = validMoves.find(m => m[0] === r && m[1] === c);
      
      if (move) {
        executeMove(sr, sc, move[0], move[1], move[2]);
      } else if (board[r][c]?.color === turn) {
        setSelected([r, c]);
        setValidMoves(getLegalMoves(board, r, c, lastMove, activeRules));
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    } else {
      if (board[r][c]?.color === turn) {
        setSelected([r, c]);
        setValidMoves(getLegalMoves(board, r, c, lastMove, activeRules));
      }
    }
  };

  const isFlipped = autoFlip ? turn === 'b' : false;
  const rows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const turnsToNextDraft = 5 - (plyCount % 5);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4 lg:p-8 font-sans selection:bg-transparent overflow-hidden">
      {/* Inject Juice Styles */}
      <style>{juiceStyles}</style>
      
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start justify-center">

        {/* --- Left Column: The Board --- */}
        <div className="w-full max-w-[550px] flex flex-col gap-4 relative z-10">
          
          <div className="flex items-center justify-between px-2 bg-stone-900 p-3 rounded-2xl border border-stone-800 shadow-lg">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${turn === 'w' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,1)]' : 'bg-stone-500 shadow-[0_0_10px_rgba(0,0,0,1)]'} transition-all duration-300`} />
              <h1 className="text-2xl font-bold tracking-tight">
                {status === 'active' ? (turn === 'w' ? "White's Turn" : "Black's Turn") : "Game Over"}
              </h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAutoFlip(!autoFlip)} className={`p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${autoFlip ? 'bg-indigo-600 text-white shadow-lg' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`} title="Auto-flip Board">
                <FlipVertical size={20} />
              </button>
              <button onClick={resetGame} className="p-2.5 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 transition-all hover:rotate-180 active:scale-95" title="Reset Game">
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          <div className={`w-full aspect-square bg-stone-800 rounded-xl p-2 shadow-2xl relative transition-transform ${shake ? 'animate-shake' : ''}`}>
            <div className="w-full h-full rounded-lg overflow-hidden grid grid-cols-8 grid-rows-8 border-[3px] border-stone-800 relative shadow-inner bg-[#ebecd0]">
              {rows.map(r => cols.map(c => {
                const isDark = (r + c) % 2 !== 0;
                const piece = board[r][c];
                const isSelected = selected && selected[0] === r && selected[1] === c;
                const isValidMove = validMoves.some(m => m[0] === r && m[1] === c);
                const isLastMove = lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c));
                const hasEnemyPiece = isValidMove && isEnemy(board, r, c, turn, activeRules);
                const isPit = boardMods.pit && boardMods.pit[0] === r && boardMods.pit[1] === c;
                const isChest = boardMods.chest && boardMods.chest[0] === r && boardMods.chest[1] === c;

                return (
                  <div key={`${r}-${c}`} onClick={() => handleSquareClick(r, c)}
                    className={`relative flex items-center justify-center cursor-pointer transition-colors duration-200
                      ${isDark ? 'bg-[#739552]' : ''}
                      ${isSelected ? (isDark ? '!bg-[#d6d654]' : '!bg-[#f5f682]') : ''}
                      ${isLastMove && !isSelected ? (isDark ? '!bg-[#b9ca43]' : '!bg-[#f5f682]') : ''}
                      ${isPit ? '!bg-black' : ''}
                    `}
                  >
                    {isPit && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900 to-black rounded-lg scale-90 flex items-center justify-center opacity-80 shadow-inner"><Skull size={20} className="text-stone-700"/></div>}
                    {isChest && !piece && <div className="absolute z-0 text-3xl animate-bounce drop-shadow-md">🎁</div>}

                    {/* Visual Effects Layer */}
                    {vfx.filter(e => e.r === r && e.c === c).map(effect => (
                      <div key={effect.id} className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                        {effect.type === 'ghost' && <img src={effect.content} className="w-[85%] h-[85%] animate-float-up" />}
                        {effect.type === 'explosion' && <span className="text-4xl animate-pop-in drop-shadow-xl">{effect.content}</span>}
                        {effect.type === 'poof' && <span className="text-2xl animate-float-up drop-shadow-md">{effect.content}</span>}
                        {effect.type === 'teleport' && <span className="text-3xl animate-spin drop-shadow-lg">{effect.content}</span>}
                        {effect.type === 'spawn' && <span className="text-3xl animate-ping text-yellow-300 drop-shadow-md">{effect.content}</span>}
                      </div>
                    ))}

                    {/* Official SVG Pieces with Juice (Smooth scaling and hover lift) */}
                    <div className={`absolute inset-0 flex items-center justify-center z-20 transition-all duration-300 ease-out 
                      ${isSelected ? 'scale-125 -translate-y-2 drop-shadow-2xl z-40' : 'hover:scale-110 hover:-translate-y-1 drop-shadow-md'}`}
                    >
                      {piece?.isRoyal && <div className="absolute inset-0 m-1 bg-yellow-400/60 rounded-full blur-md animate-pulse pointer-events-none" />}
                      {piece && <img src={PIECE_IMAGES[piece.color + piece.type]} alt={piece.type} className="w-[85%] h-[85%] select-none pointer-events-none relative z-20" draggable={false} />}
                    </div>

                    {/* Move Indicators */}
                    {isValidMove && !hasEnemyPiece && <div className="absolute w-[30%] h-[30%] rounded-full bg-black/25 z-30 pointer-events-none transition-transform hover:scale-125" />}
                    {isValidMove && hasEnemyPiece && <div className="absolute inset-0 m-1 rounded-full border-[8px] border-black/25 z-30 pointer-events-none" />}
                  </div>
                );
              }))}
            </div>
            
            {status !== 'active' && (
              <div className="absolute inset-0 z-50 bg-black/80 rounded-xl backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                {status === 'assassinated' ? <Skull className="text-red-500 mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" size={72} /> : <Trophy className="text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" size={72} />}
                <h2 className="text-5xl font-black text-white mb-2 drop-shadow-xl tracking-tight">
                  {status === 'assassinated' ? `${winner} Wins!` : 'Draw!'}
                </h2>
                <p className="text-stone-300 mb-8 font-bold text-xl uppercase tracking-[0.2em] text-red-400">
                  {status === 'assassinated' ? 'Royal Assassination' : 'Stalemate / No Royals'}
                </p>
                <button onClick={resetGame} className="px-8 py-4 bg-white text-stone-900 rounded-full font-black shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:bg-stone-200 transition-all hover:scale-110 active:scale-95 flex items-center gap-3 text-lg group">
                  <RefreshCw size={24} className="group-hover:-rotate-180 transition-transform duration-500" /> Play Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- Right Column: Chaos Dashboard --- */}
        <div className="w-full max-w-[550px] lg:max-w-[360px] flex flex-col gap-4">
          
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
             <div className={`absolute top-0 right-0 p-4 opacity-10 text-yellow-400 transition-transform duration-700 ${turnsToNextDraft === 1 ? 'animate-pulse scale-110 opacity-30' : 'group-hover:rotate-12'}`}><Zap size={100} /></div>
             <h3 className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-1">Chaos Engine</h3>
             <div className="text-3xl font-black text-white flex items-baseline gap-2">
                Draft in {turnsToNextDraft}
                <span className="text-lg text-stone-500 font-medium">turn{turnsToNextDraft !== 1 ? 's' : ''}</span>
             </div>
             <div className="w-full bg-stone-800 h-3 rounded-full mt-4 overflow-hidden shadow-inner">
                <div className={`h-full transition-all duration-700 ease-out ${turnsToNextDraft === 1 ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'}`} style={{ width: `${((5 - turnsToNextDraft) / 5) * 100}%` }} />
             </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg flex-grow min-h-[150px]">
            <h3 className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldAlert size={16} /> Active Rules
            </h3>
            {activeRules.length === 0 ? (
              <div className="text-stone-600 text-sm italic py-4 text-center">No active rules. Play standard chess... for now.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeRules.map(ar => (
                  <div key={ar.id} className="bg-indigo-900/40 border border-indigo-500/30 p-3 rounded-xl animate-pop-in">
                    <div className="flex justify-between items-center mb-1">
                       <span className="font-bold text-indigo-200">{ar.name}</span>
                       <span className="text-xs font-black bg-indigo-950 px-2 py-0.5 rounded text-indigo-300 shadow-inner">{ar.duration} left</span>
                    </div>
                    <p className="text-xs text-indigo-100/70 leading-tight">{ar.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg hidden md:block">
            <h3 className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-3">Recent Events</h3>
            <div className="flex flex-col gap-2">
               {chaosLog.length === 0 && <span className="text-stone-600 text-xs italic">Waiting for chaos...</span>}
               {chaosLog.map(log => (
                 <div key={log.id} className="text-sm text-stone-300 flex items-start gap-2 animate-pop-in">
                   <ChevronRight size={14} className="mt-0.5 text-stone-500 shrink-0" />
                   <span>{log.msg}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Global Draft Overlay */}
        {draftOptions.length > 0 && (
          <div className="fixed inset-0 z-[100] bg-stone-950/90 backdrop-blur-xl p-4 flex flex-col items-center justify-center animate-in fade-in duration-300">
             <div className="max-w-2xl w-full">
               <div className="text-center mb-10 animate-pop-in">
                  <h2 className="text-5xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] flex items-center justify-center gap-4 uppercase tracking-tighter">
                    <Zap size={48} className="fill-yellow-400 animate-pulse" /> Chaos Draft <Zap size={48} className="fill-yellow-400 animate-pulse" />
                  </h2>
                  <p className="text-xl text-stone-300 mt-4 font-bold">{turn === 'w' ? 'White' : 'Black'}, pick your poison.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {draftOptions.map((opt, i) => (
                   <button
                      key={i}
                      onClick={() => applyRule(opt)}
                      className="group bg-stone-900 border-2 border-stone-700 hover:border-yellow-400 hover:bg-stone-800 p-6 rounded-2xl transition-all duration-300 text-left relative overflow-hidden flex flex-col hover:-translate-y-2 shadow-2xl hover:shadow-[0_10px_30px_rgba(250,204,21,0.2)] animate-pop-in"
                      style={{ animationDelay: `${i * 100}ms` }}
                   >
                      <div className="mb-4">
                        {opt.type === 'duration' && <span className="inline-block text-xs font-black uppercase bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">Duration: {opt.duration}</span>}
                        {opt.type === 'instant' && <span className="inline-block text-xs font-black uppercase bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)]">Instant Effect</span>}
                      </div>
                      <div className="font-black text-2xl text-white mb-2 group-hover:text-yellow-400 transition-colors">{opt.name}</div>
                      <div className="text-sm text-stone-400 group-hover:text-stone-300 leading-relaxed font-medium">{opt.desc}</div>
                   </button>
                 ))}
               </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Ensure the rendering logic works in a browser environment
if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(<App />);
  }
}
