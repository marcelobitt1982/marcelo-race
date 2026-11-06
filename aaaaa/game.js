"use strict";

// ==========================================
// MARCELO RACE - Estilo Enduro Clássico
// ==========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 700;
const HEIGHT = 650;

canvas.width = WIDTH;
canvas.height = HEIGHT;

const scoreElement = document.getElementById("score");
const speedElement = document.getElementById("speed");
const levelElement = document.getElementById("level");
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
const restartButton = document.getElementById("restartButton");

let player;
let enemies = [];
let score = 0;
let speed = 0;
let maxSpeed = 220;
let level = 1;
let distance = 0;
let gameOver = false;
let lastTime = 0;
let animationId = null;
let roadPosition = 0;

const keys = {
    left: false,
    right: false
};

// ==========================================
// SISTEMA DE CURVAS E ESTRADA (PERSPECTIVA ENDURO)
// ==========================================

function curveAt(z) {
    return (
        Math.sin(z * 0.0005) * 1.2 +
        Math.sin(z * 0.0012) * 0.5
    );
}

function hillAt(z) {
    return Math.sin(z * 0.0007) * 50;
}

// ==========================================
// JOGADOR
// ==========================================

function createPlayer() {
    return {
        x: 0, // Posição relativa ao centro da estrada (-1 a 1)
        width: 52,
        height: 75,
        color: "#00ffcc"
    };
}

// ==========================================
// INIMIGOS
// ==========================================

function createEnemy() {
    const colors = [
        "#ff3333", // Vermelho
        "#3399ff", // Azul
        "#ffcc00", // Amarelo
        "#ff66cc", // Rosa
        "#ffffff"  // Branco
    ];

    return {
        z: 1500 + Math.random() * 4500,
        lane: (Math.random() - 0.5) * 1.4, // Posição lateral na pista
        color: colors[Math.floor(Math.random() * colors.length)],
        width: 48,
        height: 70
    };
}

function spawnEnemies() {
    while (enemies.length < 6) {
        enemies.push(createEnemy());
    }
}

// ==========================================
// CENÁRIO (CÉU E MONTANHAS)
// ==========================================

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.4);

    if (level === 1) {
        gradient.addColorStop(0, "#2c82c9");
        gradient.addColorStop(1, "#99d6ff");
    } else if (level === 2) {
        gradient.addColorStop(0, "#d9531e");
        gradient.addColorStop(1, "#ffb366");
    } else if (level === 3) {
        gradient.addColorStop(0, "#050b14");
        gradient.addColorStop(1, "#18283c");
    } else {
        gradient.addColorStop(0, "#444");
        gradient.addColorStop(1, "#888");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT * 0.4);

    // Sol / Lua
    if (level === 1 || level === 2) {
        ctx.fillStyle = level === 1 ? "#fff9d6" : "#ff9933";
        ctx.beginPath();
        ctx.arc(520, 100, 35, 0, Math.PI * 2);
        ctx.fill();
    }

    // Montanhas ao fundo
    ctx.fillStyle = level === 3 ? "#0a121c" : "#3b5c46";
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT * 0.4);
    for (let x = 0; x <= WIDTH; x += 40) {
        const y = HEIGHT * 0.33 + Math.sin(x * 0.02) * 20 + Math.sin(x * 0.05) * 10;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(WIDTH, HEIGHT * 0.4);
    ctx.closePath();
    ctx.fill();

    // Grama / Horizonte
    ctx.fillStyle = level === 3 ? "#0f1d15" : "#225522";
    ctx.fillRect(0, HEIGHT * 0.4, WIDTH, HEIGHT * 0.6);
}

// ==========================================
// DESENHO DA ESTRADA (PERSPECTIVA CORRETA)
// ==========================================

function drawRoad() {
    const segments = 120;
    const segmentLength = 6000 / segments;
    const horizonY = HEIGHT * 0.4;
    const baseRoadWidth = 30;
    const bottomRoadWidth = 620;

    let prevX = WIDTH / 2;
    let prevY = horizonY;
    let prevW = baseRoadWidth;

    for (let i = segments; i >= 0; i--) {
        const z = i * segmentLength;
        const p = z / 6000; // 0 no horizonte, 1 na base da tela

        // Curva e elevação baseadas na distância Z
        const curve = curveAt(z + roadPosition);
        const hill = hillAt(z + roadPosition);

        // Interpolação suave de Y (horizonte até embaixo)
        const y = horizonY + Math.pow(p, 1.8) * (HEIGHT - horizonY - 20) + hill * 0.2;
        
        // Largura da estrada cresce perfeitamente de cima para baixo
        const roadW = baseRoadWidth + Math.pow(p, 1.4) * (bottomRoadWidth - baseRoadWidth);
        
        // Centro da estrada afetado pelas curvas
        const center = WIDTH / 2 + curve * Math.pow(p, 1.5) * 220;

        if (i < segments) {
            const stripeColor = Math.floor((z + roadPosition * 1.5) / 120) % 2 === 0;

            // 1. Zonas/Zebras Laterais (Vermelho e Branco)
            ctx.fillStyle = stripeColor ? "#ffffff" : "#cc2222";
            ctx.beginPath();
            ctx.moveTo(prevX - prevW * 0.6, prevY);
            ctx.lineTo(prevX + prevW * 0.6, prevY);
            ctx.lineTo(center + roadW * 0.6, y);
            ctx.lineTo(center - roadW * 0.6, y);
            ctx.closePath();
            ctx.fill();

            // 2. Asfalto Principal
            ctx.fillStyle = stripeColor ? "#2c2c2c" : "#222222";
            ctx.beginPath();
            ctx.moveTo(prevX - prevW / 2, prevY);
            ctx.lineTo(prevX + prevW / 2, prevY);
            ctx.lineTo(center + roadW / 2, y);
            ctx.lineTo(center - roadW / 2, y);
            ctx.closePath();
            ctx.fill();

            // 3. Linha central tracejada
            if (stripeColor && p > 0.05) {
                ctx.strokeStyle = "#dddddd";
                ctx.lineWidth = Math.max(1, p * 4);
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(center, y);
                ctx.stroke();
            }
        }

        prevX = center;
        prevY = y;
        prevW = roadW;
    }
}

// ==========================================
// DESENHO DE CARROS (ESTILO RETRÔ / ENDURO)
// ==========================================

function drawCar(x, y, scale, color, isPlayer = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const w = isPlayer ? 56 : 50;
    const h = isPlayer ? 80 : 72;

    // Sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, h * 0.42, w * 0.55, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rodas
    ctx.fillStyle = "#111";
    ctx.fillRect(-w * 0.52, -h * 0.2, w * 0.15, h * 0.4);
    ctx.fillRect(w * 0.37, -h * 0.2, w * 0.15, h * 0.4);

    // Carroceria principal (Estilo Pixel Art / Retrô limpo)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w * 0.38, h * 0.4);
    ctx.lineTo(-w * 0.45, -h * 0.1);
    ctx.lineTo(-w * 0.25, -h * 0.42);
    ctx.lineTo(w * 0.25, -h * 0.42);
    ctx.lineTo(w * 0.45, -h * 0.1);
    ctx.lineTo(w * 0.38, h * 0.4);
    ctx.closePath();
    ctx.fill();

    // Teto / Cabine
    ctx.fillStyle = adjustBrightness(color, -30);
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, -h * 0.12);
    ctx.lineTo(-w * 0.16, -h * 0.36);
    ctx.lineTo(w * 0.16, -h * 0.36);
    ctx.lineTo(w * 0.22, -h * 0.12);
    ctx.closePath();
    ctx.fill();

    // Vidro traseiro / Para-brisa
    ctx.fillStyle = "#0a192f";
    ctx.beginPath();
    ctx.moveTo(-w * 0.19, -h * 0.15);
    ctx.lineTo(-w * 0.13, -h * 0.33);
    ctx.lineTo(w * 0.13, -h * 0.33);
    ctx.lineTo(w * 0.19, -h * 0.15);
    ctx.closePath();
    ctx.fill();

    // Lanternas traseiras / Detalhes
    ctx.fillStyle = isPlayer ? "#ffcc00" : "#ff2222";
    ctx.fillRect(-w * 0.35, -h * 0.42, w * 0.2, h * 0.06);
    ctx.fillRect(w * 0.15, -h * 0.42, w * 0.2, h * 0.06);

    // Para-choque
    ctx.fillStyle = "#222";
    ctx.fillRect(-w * 0.3, h * 0.34, w * 0.6, h * 0.07);

    ctx.restore();
}

function adjustBrightness(hex, percent) {
    let num = parseInt(hex.replace("#", ""), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ==========================================
// DESENHO DOS INIMIGOS NA PISTA
// ==========================================

function drawEnemies() {
    // Ordena do mais distante para o mais próximo (ordem de desenho correta)
    enemies.sort((a, b) => b.z - a.z);

    enemies.forEach(enemy => {
        const p = 1 - enemy.z / 6000;
        if (p <= 0 || p >= 1) return;

        const horizonY = HEIGHT * 0.4;
        const baseRoadWidth = 30;
        const bottomRoadWidth = 620;
        
        const curve = curveAt(enemy.z + roadPosition);
        const hill = hillAt(enemy.z + roadPosition);

        const y = horizonY + Math.pow(p, 1.8) * (HEIGHT - horizonY - 20) + hill * 0.2;
        const roadW = baseRoadWidth + Math.pow(p, 1.4) * (bottomRoadWidth - baseRoadWidth);
        const center = WIDTH / 2 + curve * Math.pow(p, 1.5) * 220;

        const x = center + enemy.lane * roadW * 0.42;
        const scale = 0.15 + p * 0.85;

        drawCar(x, y, scale, enemy.color, false);
    });
}

// ==========================================
// DESENHO DO JOGADOR
// ==========================================

function drawPlayer() {
    const horizonY = HEIGHT * 0.4;
    const y = HEIGHT - 95;
    const curve = curveAt(roadPosition);
    const x = WIDTH / 2 + player.x * 240 - curve * 40;

    drawCar(x, y, 1.0, player.color, true);
}

// ==========================================
// ATUALIZAÇÃO DO JOGO
// ==========================================

function update(delta) {
    if (gameOver) return;

    const dt = Math.min(delta / 16.67, 2);

    speed = Math.min(speed + 0.08 * dt, maxSpeed);
    distance += speed * dt * 0.75;
    roadPosition += speed * dt * 1.2;

    score = Math.floor(distance / 10);

    if (score > 1200) level = 2;
    if (score > 3000) level = 3;
    if (score > 5500) level = 4;

    if (keys.left) player.x -= 0.035 * dt;
    if (keys.right) player.x += 0.035 * dt;

    player.x = Math.max(-1.1, Math.min(1.1, player.x));

    // Movimentação dos inimigos
    enemies.forEach(enemy => {
        enemy.z -= speed * dt * 2.0;

        if (enemy.z < 100) {
            enemy.z = 5500 + Math.random() * 1500;
            enemy.lane = (Math.random() - 0.5) * 1.4;
        }

        // Colisão
        const p = 1 - enemy.z / 6000;
        if (p > 0.82 && p < 0.98) {
            const curve = curveAt(enemy.z + roadPosition);
            const baseRoadWidth = 30;
            const bottomRoadWidth = 620;
            const roadW = baseRoadWidth + Math.pow(p, 1.4) * (bottomRoadWidth - baseRoadWidth);
            const center = WIDTH / 2 + curve * Math.pow(p, 1.5) * 220;
            const enemyX = center + enemy.lane * roadW * 0.42;

            const playerCurve = curveAt(roadPosition);
            const playerX = WIDTH / 2 + player.x * 240 - playerCurve * 40;

            if (Math.abs(enemyX - playerX) < 42) {
                endGame();
            }
        }
    });

    spawnEnemies();

    if (scoreElement) scoreElement.textContent = score;
    if (speedElement) speedElement.textContent = Math.floor(speed);
    if (levelElement) levelElement.textContent = level;
}

// ==========================================
// FIM DE JOGO E HUD
// ==========================================

function endGame() {
    gameOver = true;

    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff3838";
    ctx.font = "bold 52px Arial";
    ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 30);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px Arial";
    ctx.fillText("Pontuação: " + score, WIDTH / 2, HEIGHT / 2 + 20);

    ctx.font = "16px Arial";
    ctx.fillText("Pressione ESPAÇO para reiniciar", WIDTH / 2, HEIGHT / 2 + 65);
}

// ==========================================
// LOOP PRINCIPAL
// ==========================================

function draw() {
    drawBackground();
    drawRoad();
    drawEnemies();
    drawPlayer();
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    update(delta);
    draw();

    if (!gameOver) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// ==========================================
// CONTROLES
// ==========================================

document.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keys.left = true;
        event.preventDefault();
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keys.right = true;
        event.preventDefault();
    }
    if (event.code === "Space" && gameOver) {
        restartGame();
        event.preventDefault();
    }
});

document.addEventListener("keyup", event => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keys.left = false;
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keys.right = false;
});

function setupTouchButton(button, direction) {
    if (!button) return;
    button.addEventListener("pointerdown", e => {
        e.preventDefault();
        keys[direction] = true;
        button.setPointerCapture(e.pointerId);
    });
    button.addEventListener("pointerup", e => {
        e.preventDefault();
        keys[direction] = false;
    });
    button.addEventListener("pointercancel", () => { keys[direction] = false; });
}

setupTouchButton(btnLeft, "left");
setupTouchButton(btnRight, "right");

function restartGame() {
    if (animationId) cancelAnimationFrame(animationId);

    player = createPlayer();
    enemies = [];
    score = 0;
    speed = 0;
    level = 1;
    distance = 0;
    roadPosition = 0;
    gameOver = false;
    lastTime = 0;

    keys.left = false;
    keys.right = false;

    spawnEnemies();

    if (scoreElement) scoreElement.textContent = "0";
    if (speedElement) speedElement.textContent = "0";
    if (levelElement) levelElement.textContent = "1";

    animationId = requestAnimationFrame(gameLoop);
}

if (restartButton) {
    restartButton.addEventListener("click", restartGame);
}

// Iniciar o jogo
restartGame();