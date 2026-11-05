// --- VARIÁVEIS DE ESTADO ---
let playerX = 0;          // Posição horizontal do carro (-1 a 1)
let speed = 8;            // Velocidade atual de teste
const maxSpeed = 10;      // Velocidade máxima
let playerPosition = 0;   // Posição do jogador na pista

// Definição da Pista
const segments = [];
const TOTAL_SEGMENTS = 300;

// Criando a pista com uma curva para a direita no meio
for (let i = 0; i < TOTAL_SEGMENTS; i++) {
  let curveValue = 0;
  // Entre o segmento 50 e 150, cria uma curva acentuada para a direita
  if (i > 50 && i < 150) {
    curveValue = 1.5; 
  }
  // Uma curva para a esquerda mais à frente
  if (i > 200 && i < 250) {
    curveValue = -2.0;
  }
  
  segments.push({
    index: i,
    curve: curveValue,
    color: Math.floor(i / 3) % 2 === 0 ? '#666555' : '#888777' // Cores zebradas do asfalto
  });
}

// --- LOOP DE ATUALIZAÇÃO E RENDERIZAÇÃO ---
function updateAndRender(ctx, canvasWidth, canvasHeight) {
  // 1. Movimento automático para a frente
  playerPosition += speed / 5;
  if (playerPosition >= segments.length) {
    playerPosition = 0;
  }

  // 2. Descobre em qual segmento o carro está
  let currentSegmentIndex = Math.floor(playerPosition) % segments.length;
  let currentSegment = segments[currentSegmentIndex];

  // 3. Força centrífuga empurrando o carro para fora na curva
  let centrifugalForce = (speed / maxSpeed) * currentSegment.curve * 0.04;
  playerX -= centrifugalForce;

  // 4. Input do Jogador (Setas para controlar)
  // Certifique-se de atualizar o objeto 'keys' quando pressionarem as setas
  if (typeof keys !== 'undefined') {
    if (keys['ArrowLeft'])  playerX -= 0.04;
    if (keys['ArrowRight']) playerX += 0.04;
  }

  // Limites da pista
  if (playerX < -1.5 || playerX > 1.5) {
    speed *= 0.95; // Reduz a velocidade se sair da pista
  }

  // --- DESENHO DA PISTA (Efeito Enduro) ---
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Fundo (Céu / Terra estática)
  ctx.fillStyle = '#4169E1'; // Azul céu
  ctx.fillRect(0, 0, canvasWidth, canvasHeight / 2);
  ctx.fillStyle = '#228B22'; // Grama/horizonte
  ctx.fillRect(0, canvasHeight / 2, canvasWidth, canvasHeight / 2);

  let dx = 0;   // Acumulador de curvatura para deslocar a pista
  let x = 0;    // Posição central da estrada
  
  let drawDistance = 100; // Quantos segmentos desenhar em profundidade
  let startPos = Math.floor(playerPosition);

  // Renderiza de trás para frente (do horizonte para a base da tela)
  for (let n = drawDistance; n > 0; n--) {
    let segmentIndex = (startPos + n) % segments.length;
    let segment = segments[segmentIndex];

    // Acumula a curva: quanto mais longe, mais a estrada entorta
    dx += segment.curve;
    x += dx;

    // Perspectiva Y e Largura
    let y = canvasHeight - (n * (canvasHeight / 2 / drawDistance)) * 2; 
    let trackWidth = n * 4; // Abre conforme se aproxima
    
    // O pulo do gato: o 'x' acumulado desloca a pista inteira para o lado
    let screenX = (canvasWidth / 2) + (x * 2) - (trackWidth / 2) - (playerX * n * 2);

    // Desenha o segmento de asfalto se ele estiver visível na tela
    if (y >= 0 && y < canvasHeight) {
      ctx.fillStyle = segment.color;
      ctx.fillRect(screenX, y, trackWidth, canvasHeight / drawDistance + 1);
    }
  }

  // 5. Desenha o Carro do Jogador fixo na parte inferior
  ctx.fillStyle = '#FF0000'; // Carro Vermelho estilo Enduro
  let carWidth = 60;
  let carHeight = 40;
  let carX = (canvasWidth / 2) - (carWidth / 2) + (playerX * 50);
  let carY = canvasHeight - 70;
  ctx.fillRect(carX, carY, carWidth, carHeight);
}