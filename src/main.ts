import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import * as cg from 'chessground/types';
import { Chess, SQUARES, Square } from 'chess.js';
import { render, h } from 'preact';
import { useRef, useEffect, useState } from 'preact/hooks';

const Board = ({moves, color, onMove}) => {
  const boardDiv = useRef(null as HTMLElement | null);
  const boardRef = useRef(null as Api | null);

  useEffect(() => {
    if(!boardRef.current) {
      boardRef.current = Chessground(boardDiv.current!, { movable: { free: false } });
    }

    const board = boardRef.current;

    const chess = new Chess();
    for(const move of moves) {
      chess.move(move);
    }
    
    const dests = new Map();

    if(chess.turn() == color) {
      for(const square of SQUARES) {
        const moves = chess.moves({ square, verbose: true });
        if(moves.length > 0) {
          dests.set(square, moves.map(m => m.to));
        }
      }
    }
    
    board.set({
      fen: chess.fen(),
      turnColor: {w: 'white', b: 'black'}[chess.turn()] as cg.Color,
      movable: {
        color: {w: 'white', b: 'black'}[color],
        dests,
        events: {
          after: (from, to) => {
            const move = { from, to, promotion: undefined as string | undefined };
            const piece = chess.get(from as Square);
            if(piece && piece.type == 'p' && (to.charAt(1) == '8' || to.charAt(1) == '1')) {
              move.promotion = 'q';
            }
            onMove(chess.move(move).san);
          }
        }
      }
    });
  }, [moves, color]);

  return h('div', {id: 'board', ref: boardDiv});
};

const App = () => {
  const [moves, setMoves] = useState<string[]>([]);
  const [color, setColor] = useState('w');

  useEffect(() => {
    const whiteTurn = (moves.length & 1) == 0;
    if(whiteTurn != (color == 'w')) {
      const chess = new Chess();
      for(const move of moves) {
        chess.move(move);
      }

      (async () => {
        const response = await fetch('https://explorer.lichess.ovh/lichess' + toQuery({
          fen: chess.fen(),
          speeds: 'blitz',
          ratings: '1800',
          topGames: 0,
          recentGames: 0
        }));

        const entry = await response.json();

        let total = 0;
        let dbMoves: {move: string, count: number}[] = [];
        for(let move of entry.moves) {
          const count = move.white + move.draws + move.black;
          total += count;
          dbMoves.push({move: move.san, count});
        }

        let cursor = Math.random() * total;
        for(const move of dbMoves) {
          cursor -= move.count;
          if(cursor <= 0) {
            const mvs = moves.slice();
            mvs.push(move.move);
            setMoves(mvs);
            break;
          }
        }
      })()
    }
  }, [moves, color])

  return h(Board, {moves, color, onMove: (m: string) => {
    const mvs = moves.slice();
    mvs.push(m);
    setMoves(mvs);
  }});
};

render(h(App, null), document.body);

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
