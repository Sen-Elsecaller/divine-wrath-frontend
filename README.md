# Divine Wrath - Frontend

A social deduction game where mortals hide from an angry god. Built with React, TypeScript, and zero-knowledge proofs.

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Requires the [server](https://github.com/Sen-Elsecaller/divine-wrath-server) running.

## How to Play

1. **Create or join a room** (4 players needed)
2. **Roles are assigned**: 1 God, 3 Mortals
3. **Mortals**: Pick a hiding spot on the 3x3 grid (secretly)
4. **Each round**:
   - Mortals make claims about their position ("I'm in row 2", "I'm adjacent to player X")
   - God verifies claims and attacks a cell
   - Survive 3 turns to win

## Zero-Knowledge Proofs

Claims are verified using ZK proofs (Circom/Groth16). When a mortal says "I'm in row 2":
- Browser generates a proof locally (~2-3 seconds)
- Proof is verified on Stellar blockchain
- God learns if the claim is true/false, but never the actual position

This prevents cheating while keeping positions private.

## Environment Variables

```bash
# .env (optional, defaults to localhost)
VITE_SERVER_URL=https://your-server.render.com
```

## Tech Stack

- React + TypeScript + Vite
- TailwindCSS v4
- Socket.io (WebSocket)
- snarkjs (ZK proof generation)
