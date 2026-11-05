// Variáveis do estado do jogador
let playerX = 0;          // Posição horizontal (-1 a 1)
let speed = 0;            // Velocidade atual
const maxSpeed = 10;      // Velocidade máxima

// No loop principal do jogo (chamado a cada frame):
function updateGame() {
  // 1. Descobre em qual segmento da pista o carro está no momento
  let currentSegmentIndex = Math.floor(playerPosition) % segments.length;
  let currentSegment = segments[currentSegmentIndex];

  // 2. Aplica a Força Centrífuga baseada na velocidade e na curva do segmento
  // Se a curva é positiva (direita), ela "empurra" o carro para a esquerda
  let centrifugalForce = (speed / maxSpeed) * currentSegment.curve * 0.05;
  playerX -= centrifugalForce;

  // 3. Processa o input do jogador (tentando combater a curva)
  if (keys['ArrowLeft']) {
    playerX -= 0.03; // Jogador esterça para a esquerda
  }
  if (keys['ArrowRight']) {
    playerX += 0.03; // Jogador esterça para a direita
  }

  // 4. Penalidade por sair da pista (Grama/Areia)
  if (playerX < -1 || playerX > 1) {
    speed *= 0.95; // O carro desacelera bruscamente fora do asfalto
    // Opcional: travar o playerX nos limites para não sumir da tela
    playerX = Math.max(-1.5, Math.min(1.5, playerX));
  }
}