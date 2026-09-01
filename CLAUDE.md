# Divine Wrath — Frontend

## Qué es

Juego de deducción social hecho para una hackathon: 3 "Mortals" se esconden de un "God" en un tablero de 3x3. Los mortales hacen *claims* sobre su posición ("estoy en la fila 2", "soy adyacente al jugador X") que el God puede verificar como verdaderas o falsas sin aprender la posición real — por default con lógica simple del server, opcionalmente con **zero-knowledge proofs** (Circom/Groth16 vía `snarkjs`) generadas en el navegador y verificadas on-chain (ver "Flujo de ZK proofs" abajo).

Este repo es uno de varios hermanos, clonados juntos en una carpeta padre (`divine-wrath/`, no es repo git):
- [`divine-wrath-server`](https://github.com/Sen-Elsecaller/divine-wrath-server) — Socket.io + lógica de juego + relayer on-chain. **Este frontend no funciona solo** — necesita el server corriendo (`VITE_SERVER_URL`, default `http://localhost:3001`).
- `divine-wrath-contracts` (privado) — contratos Soroban + circuito Circom. **`docs/CLAUDE.md` ahí es el hub de contexto compartido de las 3 capas** (arquitectura completa, gotchas, bitácora de sesiones) — leerlo antes de asumir algo que cruce las capas. Las **reglas de trabajo** viven en `divine-wrath/CLAUDE.md`, la raíz de la carpeta padre.

> ## Este repo está congelado
>
> El juego se rehace en Godot 4.7 / C# (`divine-wrath-godot`, ver el plan en el hub). Este frontend sigue deployado en Vercel y va a seguir siendo **la única versión jugable por link**, porque Godot 4.7 no soporta C# en web export. Pero **no se invierte tiempo en limpiarlo, refactorizarlo ni extenderlo** — el trabajo nuevo va al port.
>
> Consecuencia concreta: **los pendientes que este documento anota más abajo no se resuelven** — la duplicación de constantes de claims, el `eslint.config.js` que falta, los dos lockfiles y el puerto de dev 3000 vs 5173. Siguen documentados porque describen el repo tal como está, no porque haya que arreglarlos. Si vas a tocar algo igual, leelos; si venías a limpiarlos, no.

## Stack y comandos

- React 19 + TypeScript + Vite 7, TailwindCSS v4, Socket.io-client, `snarkjs` (proofs), Zustand (solo para el wallet store, ver más abajo).
- `npm install && npm run dev` → abre en `http://localhost:5173` (el `vite.config.ts` en realidad fija `port: 3000`; confirmar cuál puerto usa el server esperado antes de asumir).
- `npm run build` (`tsc -b && vite build`), `npm run preview`.
- `npm run lint` → **no va a correr**: no existe `eslint.config.js`/`.mjs`/`.cjs` en el repo pese a que `package.json` trae ESLint 9 + `typescript-eslint` como devDependencies. Si vas a lintear, hay que crear la config flat primero (preguntar si seguir el default de `@eslint/js` + `typescript-eslint` recomendado, o si el hackathon tenía uno que no se commiteó).
- Hay **dos lockfiles commiteados**: `package-lock.json` y `bun.lock`. El README usa `npm`. No asumas cuál es el gestor de paquetes "oficial" del equipo — preguntar antes de generar/actualizar uno u otro.
- `.npmrc` apunta `@jsr:registry` a `npm.jsr.io` — es necesario para instalar `@creit-tech/stellar-wallets-kit` (se importa como paquete JSR). No quitar esa línea.

## Arquitectura

### Punto de entrada y flujo de estado

`main.tsx` renderiza `<App />` directo — **no** pasa por `Layout`/`LayoutStandalone` (ver "Código sin usar" abajo).

Todo el estado del juego vive en el hook `useSocket()` (`src/hooks/useSocket.ts`): abre un socket contra `VITE_SERVER_URL`, escucha los eventos del server y expone un único objeto `room` (tipo `Room`, `src/shared/types.ts`) que es la fuente de verdad. `App.tsx` decide qué pantalla mostrar según `room.phase`:

```
lobby → setup → claiming → deduction → round_transition → ended
```

- `Lobby.tsx` — crear/unirse a sala, elegir avatar (persistido en localStorage vía `usePlayerData`), listo/empezar partida.
- `Game.tsx` — toda la UI de una ronda: tablero (`Grid.tsx`), selección de posición, panel de claims (`ClaimPanel.tsx`), lista de claims con verificación (God), ataque.
- `RoundTransition.tsx` — pantalla entre rondas (God se queda o cede el rol).

Cada acción del jugador es un método devuelto por `useSocket` (`createRoom`, `submitClaim`, `attackCell`, `verifyClaim`, etc.) que hace `socket.emit(...)`; el server responde actualizando `room` vía los listeners ya registrados. No hay lógica de juego en el cliente más allá de UI derivada — las reglas (turnos, puntajes, quién gana) las decide el server.

### Flujo de ZK proofs

1. Un mortal arma un claim en `ClaimPanel` (dentro de `Game.tsx`).
2. Si `room.zkEnabled`, `Game.tsx::handleClaim` llama `generateClaimProof` (`src/utils/zkProof.ts`), que corre `snarkjs.groth16.fullProve` contra los artifacts en `public/circuits/` (`divine_wrath.wasm`, `divine_wrath_final.zkey`). Toma ~2-3s en el navegador.
3. El proof + `publicSignals` se mandan al server dentro del mismo `submit_claim` (no hay paso separado).
4. El God dispara `verifyClaim` → en `divine-wrath-server/index.js`, el handler `verify_claim` llama `submitClaimRelayed` (`relayer.js`) cuando `room.zkEnabled`: el server firma con su propia cuenta admin (**patrón relayer** — los jugadores nunca necesitan wallet propia) y llama al contrato Soroban `divine-wrath`, que corre el verifier Groth16 on-chain en Testnet. El resultado vuelve como `claim_verified`.

Confirmado cruzando `divine-wrath-contracts/docs/CLAUDE.md` y `divine-wrath-server/relayer.js` — **en pausa desde 2026-07-01**: funciona, pero el contrato on-chain solo soporta una partida entre 2 direcciones a la vez (límite específico del hackathon), así que no se espera mantenerlo activamente. No invertir tiempo ahí salvo pedido explícito.

Los artifacts de `public/circuits/` son binarios generados por un toolchain de Circom que **no está en este repo** — el `.circom` fuente vive en `divine-wrath-contracts/circom/circuits/`. No regenerarlos desde acá.

### Código de wallet sin conectar al juego — por qué

Ningún import de `App.tsx`/`main.tsx`/`Game.tsx`/`Lobby.tsx` llega a: `components/Layout.tsx`, `LayoutStandalone.tsx`, `WalletSwitcher.tsx`, `WalletStandalone.tsx`, `hooks/useWallet.ts`, `useWalletStandalone.ts`, `services/devWalletService.ts`, `store/walletSlice.ts`, `utils/ledgerUtils.ts`, `transactionHelper.ts`, `simulationUtils.ts`, `authEntryUtils.ts`, `requestCache.ts`, `runtimeConfig.ts`, `types/signer.ts`.

**Esto no es un resabio roto de otra plantilla** — es intencional: el patrón relayer (ver arriba) hace que el jugador no necesite conectar wallet para que la verificación on-chain funcione, así que este código de conexión de wallet real (Freighter/stellar-wallets-kit) quedó sin usar. `useSocket().submitClaimBlockchain`/`blockchainResult` sí es una ruta muerta genuina — `verify_claim` ya dispara el relay on-chain, esa función paralela nunca se invoca desde ninguna UI.

Dado que ZK Mode está en pausa (ver arriba), no hace falta tocar nada de esta lista salvo que el usuario pida retomar el modo on-chain.

### Duplicación de constantes de claims — revisar ambos antes de asumir

Hay **dos** archivos de constantes de claim types que no son el mismo:
- `src/constants.ts` — `CLAIM_TYPES`, `isClaimTaken`, `formatClaimText`. Usado por `Game.tsx`.
- `src/shared/constants.ts` — `CLAIM_TYPES`, `CLAIM_TYPE_CONFIG`, `PHASES`, `ROLES`, `ADJACENCY_MAP`, `POINTS`, etc. Usado por `ClaimPanel.tsx` (solo `POINTS`) y probablemente espejado en `divine-wrath-server`.
- `src/shared/types.ts` también trae su propia `claimExists`, funcionalmente igual a `isClaimTaken` de `src/constants.ts`.

Antes de agregar o modificar algo relacionado a claim types, revisar los tres lugares — no asumir que uno es "el" archivo de constantes del proyecto.

### Mapa de directorios

| Ruta | Contenido |
|---|---|
| `src/hooks/useSocket.ts` | Cliente Socket.io, única fuente de estado del juego (`room`) |
| `src/hooks/useAudio.ts` | Música de fondo por fase (`main-menu`/`earlygame`/`endgame`), archivos en `public/audio/` |
| `src/hooks/usePlayerData.ts` | Nombre + avatar del jugador persistidos en `localStorage` |
| `src/components/Game.tsx` | Pantalla principal de una ronda, toda la lógica de fase |
| `src/components/Lobby.tsx` | Crear/unirse a sala |
| `src/components/Grid.tsx`, `CellExplosion.tsx` | Tablero 3x3 y animación de ataque |
| `src/components/Avatar/` | Configurador y render de avatar (color + cejas) |
| `src/utils/zkProof.ts` | Generación/verificación local de ZK proofs con `snarkjs` |
| `src/shared/` | Tipos y constantes que deberían (o debieron) estar espejados con `divine-wrath-server` |
| `public/circuits/` | Artifacts compilados del circuito Circom (binarios, no editar) |

## Reglas para Claude

Las reglas generales (nunca push sin preguntar, fragmentar, preguntar antes de asumir, citar fuentes inline, explicar genuinamente ante un "¿por qué?", estilo de código) están en `divine-wrath/CLAUDE.md`. Lo propio de esta capa:

1. **Este repo está congelado** — ver arriba. Cualquier cambio acá necesita pedido explícito del usuario.
2. **Leer archivos relevantes antes de tocar un módulo** — en particular, antes de tocar algo de claims o tipos compartidos, revisar `src/constants.ts`, `src/shared/constants.ts` y `src/shared/types.ts` juntos (ver duplicación arriba).
3. **No asumir sin verificar contra el server** — este repo es solo frontend; cualquier afirmación sobre cómo se verifican los claims, se calculan puntajes o se decide el ganador debe verificarse contra `divine-wrath-server`, no inferirse del cliente.
4. **No regenerar ni editar los artifacts de `public/circuits/`** — son binarios compilados; el fuente del circuito vive en `divine-wrath-contracts/circom/circuits/`.
5. **Cambios en gestor de paquetes** — no agregar ni actualizar `bun.lock` o `package-lock.json` unilateralmente; preguntar cuál se mantiene antes de instalar dependencias.
6. **ZK Mode está en pausa** — no invertir tiempo manteniendo ni extendiendo el código de wallet/blockchain (ver arriba) salvo pedido explícito.
