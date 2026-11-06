
"use strict";

// ==========================================
// MARCELO RACE - Jogo de corrida estilo Enduro
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
// CONFIGURAÇÃO DA PISTA
// ==========================================

function curveAt(z) {
    return (
        Math.sin(z * 0.00065) * 1.1 +
        Math.sin(z * 0.0017) * 0.45 +
        Math.sin(z * 0.00019) * 1.5
    );
}

function hillAt(z) {
    return (
        Math.sin(z * 0.0008) * 75 +
        Math.sin(z * 0.0021) * 24
    );
}

function roadAt(z) {
    const curve = curveAt(z);
    const hill = hillAt(z);

    return {
        center: WIDTH / 2 + curve * 95,
        width: 80 + (z / 6500) * 560,
        y: HEIGHT * 0.35 + hill * (z / 6500),
        curve,
        hill
    };
}

// ==========================================
// JOGADOR
// ==========================================

function createPlayer() {
    return {
        x: 0,
        y: HEIGHT - 120,
        width: 48,
        height: 85,
        steering: 0,
        color: "#19e85b"
    };
}

// ==========================================
// INIMIGOS
// ==========================================

function createEnemy() {
    const colors = [
        "#e53935",
        "#2196f3",
        "#ffca28",
        "#eeeeee",
        "#9c27b0"
    ];

    return {
        z: 5000 + Math.random() * 5000,
        lane: Math.random() * 1.4 - 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
        width: 45,
        height: 75
    };
}

function spawnEnemies() {
    while (enemies.length < 7) {
        enemies.push(createEnemy());
    }
}

// ==========================================
// DESENHO DO CENÁRIO
// ==========================================

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

    if (level === 1) {
        gradient.addColorStop(0, "#58a9e8");
        gradient.addColorStop(1, "#d7edff");
    } else if (level === 2) {
        gradient.addColorStop(0, "#ef7840");
        gradient.addColorStop(1, "#ffd18b");
    } else if (level === 3) {
        gradient.addColorStop(0, "#06142e");
        gradient.addColorStop(1, "#243d59");
    } else {
        gradient.addColorStop(0, "#777");
        gradient.addColorStop(1, "#c1c1c1");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Sol
    if (level === 1 || level === 2) {
        ctx.fillStyle = level === 1 ? "#fff2a8" : "#ffb34d";
        ctx.beginPath();
        ctx.arc(550, 105, 42, 0, Math.PI * 2);
        ctx.fill();
    }

    // Montanhas
    ctx.fillStyle = level === 3 ? "#142b3a" : "#547b62";

    ctx.beginPath();
    ctx.moveTo(0, HEIGHT * 0.36);

    for (let x = 0; x <= WIDTH; x += 35) {
        const y =
            HEIGHT * 0.31 +
            Math.sin(x * 0.018) * 35 +
            Math.sin(x * 0.04) * 15;

        ctx.lineTo(x, y);
    }

    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Grama
    ctx.fillStyle = level === 3 ? "#172b23" : "#367a38";
    ctx.fillRect(0, HEIGHT * 0.37, WIDTH, HEIGHT);
}

// ==========================================
// DESENHO DA ESTRADA
// ==========================================

function drawRoad() {
    const segments = 90;
    const segmentLength = 6500 / segments;

    for (let i = segments - 1; i >= 0; i--) {
        const z1 = i * segmentLength;
        const z2 = (i + 1) * segmentLength;

        const p1 = roadAt(z1);
        const p2 = roadAt(z2);

        const y1 = HEIGHT - (z1 / 6500) * (HEIGHT * 0.65);
        const y2 = HEIGHT - (z2 / 6500) * (HEIGHT * 0.65);

        const perspective1 = z1 / 6500;
        const perspective2 = z2 / 6500;

        const width1 = 80 + perspective1 * 560;
        const width2 = 80 + perspective2 * 560;

        const center1 = p1.center;
        const center2 = p2.center;

        const stripe = Math.floor((z1 + roadPosition) / 180) % 2;

        // Faixa lateral vermelha e branca
        ctx.fillStyle = stripe ? "#fff" : "#e53935";

        ctx.beginPath();
        ctx.moveTo(center1 - width1 * 0.58, y1);
        ctx.lineTo(center1 + width1 * 0.58, y1);
        ctx.lineTo(center2 + width2 * 0.58, y2);
        ctx.lineTo(center2 - width2 * 0.58, y2);
        ctx.closePath();
        ctx.fill();

        // Asfalto
        ctx.fillStyle = stripe ? "#424242" : "#383838";

        ctx.beginPath();
        ctx.moveTo(center1 - width1 / 2, y1);
        ctx.lineTo(center1 + width1 / 2, y1);
        ctx.lineTo(center2 + width2 / 2, y2);
        ctx.lineTo(center2 - width2 / 2, y2);
        ctx.closePath();
        ctx.fill();

        // Linhas centrais
        if (stripe) {
            ctx.strokeStyle = "#f5f5f5";
            ctx.lineWidth = 2 + perspective1 * 4;
            ctx.setLineDash([12 + perspective1 * 20, 15 + perspective1 * 15]);

            ctx.beginPath();
            ctx.moveTo(center1, y1);
            ctx.lineTo(center2, y2);
            ctx.stroke();

            ctx.setLineDash([]);
        }
    }
}

// ==========================================
// DESENHO DOS CARROS
// ==========================================

function drawCar(x, y, width, height, color, isPlayer = false) {
    ctx.save();
    ctx.translate(x, y);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, height * 0.48, width * 0.65, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rodas
    ctx.fillStyle = "#111";
    ctx.fillRect(-width * 0.52, -height * 0.25, width * 0.2, height * 0.38);
    ctx.fillRect(width * 0.32, -height * 0.25, width * 0.2, height * 0.38);

    // Corpo do carro
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-width * 0.42, height * 0.45);
    ctx.lineTo(-width * 0.48, -height * 0.15);
    ctx.lineTo(-width * 0.28, -height * 0.43);
    ctx.lineTo(width * 0.28, -height * 0.43);
    ctx.lineTo(width * 0.48, -height * 0.15);
    ctx.lineTo(width * 0.42, height * 0.45);
    ctx.closePath();
    ctx.fill();

    // Vidro
    ctx.fillStyle = "#152d3a";
    ctx.beginPath();
    ctx.moveTo(-width * 0.27, -height * 0.12);
    ctx.lineTo(-width * 0.2, -height * 0.35);
    ctx.lineTo(width * 0.2, -height * 0.35);
    ctx.lineTo(width * 0.27, -height * 0.12);
    ctx.closePath();
    ctx.fill();

    // Faróis
    ctx.fillStyle = isPlayer ? "#d7ff8a" : "#fff3b0";
    ctx.fillRect(-width * 0.34, height * 0.27, width * 0.19, height * 0.09);
    ctx.fillRect(width * 0.15, height * 0.27, width * 0.19, height * 0.09);

    // Detalhe traseiro
    ctx.fillStyle = "#b80000";
    ctx.fillRect(-width * 0.34, -height * 0.43, width * 0.68, height * 0.07);

    ctx.restore();
}

// ==========================================
// POSIÇÃO DOS INIMIGOS NA PISTA
// ==========================================

function drawEnemies() {
    enemies.forEach(enemy => {
        const progress = 1 - enemy.z / 6500;

        if (progress <= 0 || progress >= 1) return;

        const road = roadAt(enemy.z);
        const y = HEIGHT - progress * (HEIGHT * 0.65);

        const x = road.center + enemy.lane * road.width * 0.38;
        const size = 0.25 + progress * 0.85;

        drawCar(
            x,
            y,
            enemy.width * size,
            enemy.height * size,
            enemy.color
        );
    });
}

// ==========================================
// ATUALIZAÇÃO DO JOGO
// ==========================================

function update(delta) {
    if (gameOver) return;

    const dt = Math.min(delta / 16.67, 2);

    speed = Math.min(speed + 0.08 * dt, maxSpeed);
    distance += speed * dt * 0.8;
    roadPosition += speed * dt;

    score = Math.floor(distance / 10);

    if (score > 1000) level = 2;
    if (score > 2500) level = 3;
    if (score > 4500) level = 4;

    if (keys.left) {
        player.x -= 5 * dt;
    }

    if (keys.right) {
        player.x += 5 * dt;
    }

    player.x = Math.max(-260, Math.min(260, player.x));

    // Curva influencia o movimento visual
    player.steering = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);

    enemies.forEach(enemy => {
        enemy.z -= speed * dt * 2.2;

        if (enemy.z < 0) {
            enemy.z = 6500 + Math.random() * 3000;
            enemy.lane = Math.random() * 1.4 - 0.7;
        }

        const progress = 1 - enemy.z / 6500;

        if (progress > 0.87 && progress < 1) {
            const road = roadAt(enemy.z);
            const enemyX = road.center + enemy.lane * road.width * 0.38;
            const playerX = WIDTH / 2 + player.x;

            if (Math.abs(enemyX - playerX) < 48) {
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
// HUD E FIM DE JOGO
// ==========================================

function endGame() {
    gameOver = true;

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff3838";
    ctx.font = "bold 54px Arial";
    ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 30);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.fillText("Pontuação: " + score, WIDTH / 2, HEIGHT / 2 + 20);

    ctx.font = "18px Arial";
    ctx.fillText("Pressione ESPAÇO para reiniciar", WIDTH / 2, HEIGHT / 2 + 65);
}

// ==========================================
// DESENHO DO JOGADOR
// ==========================================

function drawPlayer() {
    const road = roadAt(6500);
    const curveOffset = curveAt(distance) * 25;

    const x = WIDTH / 2 + player.x - curveOffset;

    drawCar(
        x,
        player.y,
        player.width,
        player.height,
        player.color,
        true
    );
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
// CONTROLES DE TECLADO
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
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keys.left = false;
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keys.right = false;
    }
});

// ==========================================
// CONTROLES DE TOQUE
// ==========================================

function setupTouchButton(button, direction) {
    if (!button) return;

    button.addEventListener("pointerdown", event => {
        event.preventDefault();
        keys[direction] = true;
        button.setPointerCapture(event.pointerId);
    });

    button.addEventListener("pointerup", event => {
        event.preventDefault();
        keys[direction] = false;
    });

    button.addEventListener("pointercancel", () => {
        keys[direction] = false;
    });

    button.addEventListener("lostpointercapture", () => {
        keys[direction] = false;
    });
}

setupTouchButton(btnLeft, "left");
setupTouchButton(btnRight, "right");

// ==========================================
// REINICIAR
// ==========================================

function restartGame() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

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

// ==========================================
// INICIAR
// ==========================================

restartGame();
