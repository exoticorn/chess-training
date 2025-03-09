import { Chessground } from 'chessground';
import * as cg from 'chessground/types';
import { Chess, SQUARES, Square } from 'chess.js';

const config = {
  movable: {
    free: false,
    colors: 'white'
  }
};
const board = Chessground(document.getElementById('board')!, config);

const chess = new Chess();

function setPlayerMove() {
  const dests = new Map();
  for(const square of SQUARES) {
    const moves = chess.moves({ square, verbose: true });
    if(moves.length > 0) {
      dests.set(square, moves.map(m => m.to));
    }
  }
  board.set({
    fen: chess.fen(),
    movable: {
      dests,
      events: {
        after: applyPlayerMove
      }
    }
  });
}

function applyPlayerMove(from: cg.Key, to: cg.Key, _meta: cg.MoveMetadata) {
  const move = { from, to, promotion: undefined as string | undefined };
  const piece = chess.get(from as Square);
  if(piece && piece.type == 'p' && (to.charAt(1) == '8' || to.charAt(1) == '1')) {
    move.promotion = 'q';
  }
  chess.move(move);
  if(!chess.isGameOver()) {
    doDbMove();
  }
}

async function doDbMove() {
  board.set({
    fen: chess.fen()
  });

  const response = await fetch('https://explorer.lichess.ovh/lichess' + toQuery({
    fen: chess.fen(),
    speeds: 'blitz',
    ratings: '1800',
    topGames: 0,
    recentGames: 0
  }));

  const entry = await response.json();

  let total = 0;
  let moves: {move: string, count: number}[] = [];
  for(let move of entry.moves) {
    const count = move.white + move.draws + move.black;
    total += count;
    moves.push({move: move.san, count});
  }

  let cursor = Math.random() * total;
  for(let i = 0; i < moves.length; ++i) {
    const move = moves[i];
    cursor -= move.count;
    if(cursor <= 0) {
      chess.move(move.move);
      if(!chess.isGameOver()) {
        setPlayerMove();
        break;
      }
    }
  }
}

function toQuery(query: Object): string {
  let q = '';
  for(let key in query) {
    let value = query[key];
    q += (q.length == 0 ? '?' : '&');
    q += key;
    q += '=';
    q += encodeURIComponent(value);
  }
  return q;
}

setPlayerMove();
