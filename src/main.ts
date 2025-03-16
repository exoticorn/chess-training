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

    let lastMove: cg.Key[] = [];
    const chess = new Chess();
    for(const move of moves) {
      const m = chess.move(move);
      lastMove = [m.from, m.to];
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

    const cgColor = {w: 'white', b: 'black'}[color];
    
    board.set({
      fen: chess.fen(),
      turnColor: {w: 'white', b: 'black'}[chess.turn()] as cg.Color,
      orientation: cgColor,
      lastMove: lastMove,
      movable: {
        color: cgColor,
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
  const [speeds, setSpeeds] = useState(['blitz']);
  const [ratings, setRatings] = useState([1800]);

  const chess = new Chess();
  let analysisPgn = '';
  for(const move of moves) {
    if(analysisPgn.length > 0) {
      analysisPgn += '_';
    }
    analysisPgn += move;
    chess.move(move);
  }

  useEffect(() => {
    const whiteTurn = (moves.length & 1) == 0;
    if(whiteTurn != (color == 'w')) {
      (async () => {
        const response = await fetch('https://explorer.lichess.ovh/lichess' + toQuery({
          fen: chess.fen(),
          speeds: speeds.join(),
          ratings: ratings.join(),
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

  const cb = (set, value, setFunc) => [
    h('input', { type: 'checkbox', id: 'cb' + value, checked: set.includes(value), onChange: () => {
      const index = set.indexOf(value);
      if(index < 0) {
        setFunc(set.toSpliced(set.length, 0, value));
      } else {
        setFunc(set.toSpliced(index, 1));
      }
    }}),
    h('label', {for: 'cb' + value}, value.toString())
  ];

  return [
    h('div', {id: 'sourceLink'}, h('a', {href: 'https://github.com/exoticorn/chess-training'}, 'Source [GPLv3]')),
    h(Board, {moves, color, onMove: (m: string) => {
      const mvs = moves.slice();
      mvs.push(m);
      setMoves(mvs);
    }}),

    h('div', null, h('button', {onclick: () => { setMoves([]); }}, 'Restart')),

    h('div', null, [
      'Play as: ',
      h('input', {type: 'radio', id: 'colorWhite', checked: color == 'w', onChange: () => setColor('w')}), h('label', {for: 'colorWhite'}, 'White'),
      h('input', {type: 'radio', id: 'colorBlack', checked: color == 'b', onChange: () => setColor('b')}), h('label', {for: 'colorBlack'}, 'Black')
    ]),

    h('div', null, [
      'Speeds: ',
      cb(speeds, 'ultraBullet', setSpeeds),
      cb(speeds, 'bullet', setSpeeds),
      cb(speeds, 'blitz', setSpeeds),
      cb(speeds, 'rapid', setSpeeds),
      cb(speeds, 'classical', setSpeeds),
      cb(speeds, 'correspondence', setSpeeds),
    ]),

    h('div', null, [
      'Ratings: ',
      cb(ratings, 0, setRatings),
      cb(ratings, 1000, setRatings),
      cb(ratings, 1200, setRatings),
      cb(ratings, 1400, setRatings),
      cb(ratings, 1600, setRatings),
      cb(ratings, 1800, setRatings),
      cb(ratings, 2000, setRatings),
      cb(ratings, 2200, setRatings),
      cb(ratings, 2500, setRatings),
    ]),

    h('div', null, h('a', {href: 'https://lichess.org/analysis/pgn/' + analysisPgn, target: '_black'}, 'Analysis'))
  ];
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
