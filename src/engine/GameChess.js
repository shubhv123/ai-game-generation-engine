// Infinite Arcade Engine - Rule-Abiding 3D & 2D Chess Engine
import * as THREE from 'three';
import { soundManager } from '../audio.js';
import confetti from 'canvas-confetti';

// Core Chess Logic Helper
export class ChessRules {
  static createInitialBoard() {
    return [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
  }

  static isWhite(p) { return p && p === p.toUpperCase(); }
  static isBlack(p) { return p && p === p.toLowerCase(); }
  static isSameTeam(p1, p2) {
    if (!p1 || !p2) return false;
    return (ChessRules.isWhite(p1) && ChessRules.isWhite(p2)) || (ChessRules.isBlack(p1) && ChessRules.isBlack(p2));
  }

  static getRawMoves(r, c, board) {
    const p = board[r][c];
    if (!p) return [];
    const moves = [];
    const type = p.toLowerCase();
    const white = ChessRules.isWhite(p);
    const dir = white ? -1 : 1;

    if (type === 'p') {
      // Forward 1
      const fR = r + dir;
      if (fR >= 0 && fR < 8 && !board[fR][c]) {
        moves.push([fR, c]);
        // Forward 2 from start row
        const startRow = white ? 6 : 1;
        const fR2 = r + dir * 2;
        if (r === startRow && !board[fR2][c]) {
          moves.push([fR2, c]);
        }
      }
      // Captures
      [-1, 1].forEach(dc => {
        const cC = c + dc;
        if (fR >= 0 && fR < 8 && cC >= 0 && cC < 8) {
          const target = board[fR][cC];
          if (target && !ChessRules.isSameTeam(p, target)) {
            moves.push([fR, cC]);
          }
        }
      });
    } else if (type === 'n') {
      const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      offsets.forEach(([dr, dc]) => {
        const nR = r + dr, nC = c + dc;
        if (nR >= 0 && nR < 8 && nC >= 0 && nC < 8) {
          if (!board[nR][nC] || !ChessRules.isSameTeam(p, board[nR][nC])) {
            moves.push([nR, nC]);
          }
        }
      });
    } else if (type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nR = r + dr, nC = c + dc;
          if (nR >= 0 && nR < 8 && nC >= 0 && nC < 8) {
            if (!board[nR][nC] || !ChessRules.isSameTeam(p, board[nR][nC])) {
              moves.push([nR, nC]);
            }
          }
        }
      }
    } else {
      // Ray-casting for Rook, Bishop, Queen
      const dirs = [];
      if (type === 'r' || type === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      if (type === 'b' || type === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);

      dirs.forEach(([dr, dc]) => {
        let nR = r + dr, nC = c + dc;
        while (nR >= 0 && nR < 8 && nC >= 0 && nC < 8) {
          const target = board[nR][nC];
          if (!target) {
            moves.push([nR, nC]);
          } else {
            if (!ChessRules.isSameTeam(p, target)) {
              moves.push([nR, nC]);
            }
            break;
          }
          nR += dr;
          nC += dc;
        }
      });
    }

    return moves;
  }

  static findKing(board, isWhite) {
    const kChar = isWhite ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === kChar) return [r, c];
      }
    }
    return null;
  }

  static isKingInCheck(board, isWhite) {
    const kPos = ChessRules.findKing(board, isWhite);
    if (!kPos) return false;
    const [kR, kC] = kPos;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && ChessRules.isWhite(p) !== isWhite) {
          const raw = ChessRules.getRawMoves(r, c, board);
          if (raw.some(([mR, mC]) => mR === kR && mC === kC)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  static getLegalMoves(r, c, board) {
    const p = board[r][c];
    if (!p) return [];
    const isWhite = ChessRules.isWhite(p);
    const raw = ChessRules.getRawMoves(r, c, board);

    return raw.filter(([tR, tC]) => {
      // Simulate move
      const temp = board.map(row => [...row]);
      temp[tR][tC] = temp[r][c];
      temp[r][c] = null;
      return !ChessRules.isKingInCheck(temp, isWhite);
    });
  }

  static getAllLegalMoves(board, isWhite) {
    const all = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && ChessRules.isWhite(p) === isWhite) {
          const legals = ChessRules.getLegalMoves(r, c, board);
          legals.forEach(([tR, tC]) => {
            all.push({ from: [r, c], to: [tR, tC], piece: p });
          });
        }
      }
    }
    return all;
  }
}

export class GameChess3D {
  constructor(threeEngine, translatorState, callbacks) {
    this.engine = threeEngine;
    this.state = translatorState;
    this.callbacks = callbacks;

    this.active = false;
    this.board = ChessRules.createInitialBoard();
    this.turn = 'white'; // 'white' or 'black'
    this.selectedSquare = null;
    this.validMoves = [];
    this.pieceMeshes = {}; // "r_c" => Mesh
    this.score = 0;

    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.initScene();
    this.bindControls();
  }

  initScene() {
    this.engine.clearGameGroup();
    this.engine.applyTheme(this.state.theme || { bg: 0x0f172a, light: 0x38bdf8 });

    // Camera for 3D Board
    this.engine.camera.position.set(0, 18, 16);
    this.engine.camera.lookAt(0, 0, 0);

    this.createBoardMesh();
    this.createPieceMeshes();

    this.active = true;
    this.callbacks.onScoreUpdate(this.score, 0);
    this.callbacks.onGuideUpdate("3D Chess Rules Active: Click White Piece to Select • Click Green Tile to Move!");
  }

  createBoardMesh() {
    const boardGroup = new THREE.Group();

    // Wood Base Border
    const baseGeo = new THREE.BoxGeometry(18, 1, 18);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.5;
    boardGroup.add(base);

    // 8x8 Tiles
    this.tileMeshes = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isWhiteTile = (r + c) % 2 === 0;
        const tileGeo = new THREE.BoxGeometry(1.9, 0.2, 1.9);
        const tileMat = new THREE.MeshStandardMaterial({
          color: isWhiteTile ? 0xe2e8f0 : 0x1e293b,
          roughness: 0.2
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);

        const x = (c - 3.5) * 2.0;
        const z = (r - 3.5) * 2.0;
        tile.position.set(x, 0.1, z);
        tile.userData = { r, c, isTile: true };

        boardGroup.add(tile);
        this.tileMeshes.push(tile);
      }
    }

    // Move Highlight Ring Mesh
    this.highlightGroup = new THREE.Group();
    boardGroup.add(this.highlightGroup);

    this.engine.gameGroup.add(boardGroup);
  }

  createPieceMeshes() {
    // Clear old pieces
    Object.values(this.pieceMeshes).forEach(m => this.engine.gameGroup.remove(m));
    this.pieceMeshes = {};

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) {
          const mesh = this.buildPieceGeometry(p);
          const x = (c - 3.5) * 2.0;
          const z = (r - 3.5) * 2.0;
          mesh.position.set(x, 0.2, z);
          mesh.userData = { r, c, piece: p };
          this.engine.gameGroup.add(mesh);
          this.pieceMeshes[`${r}_${c}`] = mesh;
        }
      }
    }
  }

  buildPieceGeometry(p) {
    const isWhite = ChessRules.isWhite(p);
    const color = isWhite ? 0xf8fafc : 0x0f172a;
    const metal = isWhite ? 0.3 : 0.8;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: metal });
    const group = new THREE.Group();

    const type = p.toLowerCase();
    let body;

    if (type === 'p') {
      body = new THREE.CylinderGeometry(0.5, 0.6, 1.2, 12);
      const head = new THREE.SphereGeometry(0.4, 12, 12);
      const headMesh = new THREE.Mesh(head, mat);
      headMesh.position.y = 0.8;
      group.add(headMesh);
    } else if (type === 'r') {
      body = new THREE.CylinderGeometry(0.6, 0.7, 1.6, 12);
    } else if (type === 'n') {
      body = new THREE.ConeGeometry(0.6, 1.8, 4);
    } else if (type === 'b') {
      body = new THREE.CylinderGeometry(0.4, 0.7, 2.0, 12);
    } else if (type === 'q') {
      body = new THREE.CylinderGeometry(0.5, 0.8, 2.4, 16);
      const crown = new THREE.SphereGeometry(0.5, 12, 12);
      const crownMesh = new THREE.Mesh(crown, mat);
      crownMesh.position.y = 1.3;
      group.add(crownMesh);
    } else {
      // King
      body = new THREE.CylinderGeometry(0.6, 0.85, 2.6, 16);
      const cross = new THREE.BoxGeometry(0.3, 0.6, 0.3);
      const crossMesh = new THREE.Mesh(cross, mat);
      crossMesh.position.y = 1.5;
      group.add(crossMesh);
    }

    const bodyMesh = new THREE.Mesh(body, mat);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    return group;
  }

  bindControls() {
    this.mm = (e) => {
      const rect = this.engine.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    this.md = (e) => {
      if (!this.active || this.turn !== 'white') return;

      this.raycaster.setFromCamera(this.mouse, this.engine.camera);
      const intersects = this.raycaster.intersectObjects(this.engine.gameGroup.children, true);

      if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        while (hitObj.parent && !hitObj.userData.r && hitObj.userData.r !== 0) {
          hitObj = hitObj.parent;
        }

        const data = hitObj.userData;
        if (data.r !== undefined && data.c !== undefined) {
          this.handleSquareClick(data.r, data.c);
        }
      }
    };

    this.engine.canvas.addEventListener('mousemove', this.mm);
    this.engine.canvas.addEventListener('mousedown', this.md);
  }

  handleSquareClick(r, c) {
    const piece = this.board[r][c];

    // Case A: Selecting own White piece
    if (piece && ChessRules.isWhite(piece)) {
      this.selectedSquare = [r, c];
      this.validMoves = ChessRules.getLegalMoves(r, c, this.board);
      soundManager.playJump();
      this.renderHighlights();
      return;
    }

    // Case B: Move selected piece to valid destination
    if (this.selectedSquare) {
      const [sR, sC] = this.selectedSquare;
      const isLegal = this.validMoves.some(([mR, mC]) => mR === r && mC === c);

      if (isLegal) {
        this.executeMove(sR, sC, r, c);
        this.selectedSquare = null;
        this.validMoves = [];
        this.clearHighlights();

        // AI Black Turn
        if (this.active && this.turn === 'black') {
          setTimeout(() => this.makeAIMove(), 400);
        }
      } else {
        this.selectedSquare = null;
        this.validMoves = [];
        this.clearHighlights();
      }
    }
  }

  executeMove(fromR, fromC, toR, toC) {
    const movingPiece = this.board[fromR][fromC];
    const targetPiece = this.board[toR][toC];

    if (targetPiece) {
      soundManager.playExplosion();
      this.score += 100;
      this.callbacks.onScoreUpdate(this.score, 0);
    } else {
      soundManager.playCoin();
    }

    // Apply move to board state
    this.board[toR][toC] = movingPiece;
    this.board[fromR][fromC] = null;

    // Pawn Promotion (to Queen)
    if (movingPiece === 'P' && toR === 0) this.board[toR][toC] = 'Q';
    if (movingPiece === 'p' && toR === 7) this.board[toR][toC] = 'q';

    this.createPieceMeshes();

    // Checkmate / Check status check
    const nextIsWhite = this.turn === 'white' ? false : true;
    this.turn = nextIsWhite ? 'white' : 'black';

    const enemyLegals = ChessRules.getAllLegalMoves(this.board, nextIsWhite);
    const inCheck = ChessRules.isKingInCheck(this.board, nextIsWhite);

    if (enemyLegals.length === 0) {
      if (inCheck) {
        this.gameOver(nextIsWhite ? "💥 CHECKMATE! BLACK WINS!" : "🏆 CHECKMATE! WHITE WINS!");
      } else {
        this.gameOver("🤝 STALEMATE! IT'S A DRAW!");
      }
    } else if (inCheck) {
      soundManager.playJump();
      this.callbacks.onGuideUpdate(`⚠️ CHECK! ${nextIsWhite ? "White" : "Black"} King is under attack!`);
    } else {
      this.callbacks.onGuideUpdate(`${this.turn === 'white' ? "White's Turn" : "Black AI's Turn"}`);
    }
  }

  makeAIMove() {
    const legals = ChessRules.getAllLegalMoves(this.board, false); // Black legals
    if (legals.length === 0) return;

    // Prefer capture moves
    const captures = legals.filter(m => this.board[m.to[0]][m.to[1]]);
    const move = captures.length > 0
      ? captures[Math.floor(Math.random() * captures.length)]
      : legals[Math.floor(Math.random() * legals.length)];

    this.executeMove(move.from[0], move.from[1], move.to[0], move.to[1]);
  }

  renderHighlights() {
    this.clearHighlights();
    if (!this.selectedSquare) return;

    const [sR, sC] = this.selectedSquare;
    
    // Highlight Selected Tile
    const selectGeo = new THREE.RingGeometry(0.6, 0.8, 16);
    const selectMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const selectRing = new THREE.Mesh(selectGeo, selectMat);
    selectRing.rotation.x = Math.PI / 2;
    selectRing.position.set((sC - 3.5) * 2.0, 0.25, (sR - 3.5) * 2.0);
    this.highlightGroup.add(selectRing);

    // Highlight Valid Target Squares
    this.validMoves.forEach(([r, c]) => {
      const isCapture = !!this.board[r][c];
      const targetGeo = new THREE.CircleGeometry(0.5, 16);
      const targetMat = new THREE.MeshBasicMaterial({ color: isCapture ? 0xf43f5e : 0x10b981, side: THREE.DoubleSide });
      const targetCircle = new THREE.Mesh(targetGeo, targetMat);
      targetCircle.rotation.x = Math.PI / 2;
      targetCircle.position.set((c - 3.5) * 2.0, 0.25, (r - 3.5) * 2.0);
      this.highlightGroup.add(targetCircle);
    });
  }

  clearHighlights() {
    while (this.highlightGroup.children.length > 0) {
      const obj = this.highlightGroup.children[0];
      this.highlightGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }

  gameOver(message) {
    this.active = false;
    confetti({ particleCount: 150, spread: 90 });
    this.callbacks.onGameOver({
      title: message,
      subtitle: `Final Score: ${this.score} pts!`,
      score: this.score,
      highScore: this.score
    });
  }

  update(dt) {}

  destroy() {
    this.active = false;
    this.engine.canvas.removeEventListener('mousemove', this.mm);
    this.engine.canvas.removeEventListener('mousedown', this.md);
  }
}
