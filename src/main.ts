import { Chessground } from 'chessground';
import { Key, MoveMetadata } from 'chessground/types';
import { Chess, SQUARES } from 'chess.js';

const config = {
  movable: {
    free: false
  }
};
const cg = Chessground(document.getElementById('board')!, config);

const chess = new Chess();

function setPlayerMove() {
  const dests = new Map();
  for(const square of SQUARES) {
    const moves = chess.moves({ square, verbose: true });
    if(moves.length > 0) {
      dests.set(square, moves.map(m => m.to));
    }
  }
  cg.set({
    fen: chess.fen(),
    movable: {
      dests,
      events: {
        after: applyPlayerMove
      }
    }
  });
}

function applyPlayerMove(from: Key, to: Key, _meta: MoveMetadata) {
  chess.move({ from, to });
  if(!chess.isGameOver()) {
    setPlayerMove();
  }
}

setPlayerMove();
