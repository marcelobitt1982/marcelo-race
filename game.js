const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const speedDisplay = document.getElementById("speed");
const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const message = document.getElementById("message");

let W = 800;
let H = 500;
canvas.width = W;
canvas.height = H;

let running = true;
let gameOver = false;

let speed = 0;
let score = 0;
let time = 90;
let playerX = 0;
let distance = 0;
let traffic = [];
let spawnTimer = 0;
let lastTime = 0;

const keys = {
    left: false,
    right: false,
    accelerate: false,
    brake: false
};

function roadCurve(z) {
    return Math.sin(z * 0.0003) * 0.35;
}

function project(y, curve) {
    const horizon = H * 0.4;
    const depth = Math.max(0, (y - horizon) / (H - horizon));

    const roadWidth = W * (0.03 + depth * 0.35);
    const center = W / 2 + curve * W * depth * 0.45;

    return {
        center,
        width: roadWidth,
        depth
    };
}

function drawBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    skyGrad.addColorStop(0, "#09121e");
    skyGrad.addColorStop(1, "#1a2f4c");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.4);

    ctx.fillStyle = "#1e3a5f";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.4);
    for (let x = 0; x <= W; x += 40) {
        ctx.lineTo(x, H * 0.35 + Math.sin(x * 0.02) * 10);
    }
    ctx.lineTo(W, H * 0.4);
    ctx.fill();

    ctx.fillStyle = "#11221c";
    ctx.fillRect(0, H * 0.4, W, H * 0.6);
}

function drawRoad() {
    const horizon = H * 0.4;
    const segments = 100;

    for (let i = 0; i < segments; i++) {
        const y1 = horizon + (H - horizon) * i / segments;
        const y2 = horizon + (H - horizon) * (i + 1) / segments;

        const p1 = project(y1, roadCurve(distance + (1 - i / segments) * 1000));
        const p2 = project(y2, roadCurve(distance + (1 - (i + 1) / segments) * 1000));

        const stripe = Math.floor(distance / 140 + i / 4) % 2;

        ctx.fillStyle = stripe ? "#1e3d2f" : "#173024";
        ctx.fillRect(0, y1, W, y2 - y1 + 1);

        ctx.fillStyle = "#1e242b";
        ctx.beginPath();
        ctx.moveTo(p1.center - p1.width, y1);
        ctx.lineTo(p1.center + p1.width, y1);
        ctx.lineTo(p2.center + p2.width, y2);
        ctx.lineTo(p2.center - p2.width, y2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = Math.max(1, p2.depth * 3);

        ctx.beginPath();
        ctx.moveTo(p1.center - p1.width, y1);
        ctx.lineTo(p2.center - p2.width, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.center + p1.width, y1);
        ctx.lineTo(p2.center + p2.width, y2);
        ctx.stroke();

        if (Math.floor(distance / 90 + i) % 8 < 4) {
            ctx.fillStyle = "#fbbf24";
            const lineWidth = Math.max(2, p2.width * 0.035);
            ctx.fillRect(p2.center - lineWidth / 2, y1, lineWidth, y2 - y1);
        }
    }
}

// Carros mais baixos e proporcionais (altura reduzida)
function drawCar(x, y, width, height, color, player = false) {
    ctx.save();
    ctx.translate(x, y);

    // Sombra
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(0, height * 0.45, width * 0.65, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rodas
    ctx.fillStyle = "#090d16";
    ctx.fillRect(-width * 0.48, -height * 0.2, width * 0.12, height * 0.3);
    ctx.fillRect(width * 0.36, -height * 0.2, width * 0.12, height * 0.3);
    ctx.fillRect(-width * 0.48, height * 0.05, width * 0.12, height * 0.3);
    ctx.fillRect(width * 0.36, height * 0.05, width * 0.12, height * 0.3);

    // Chassi mais baixo (altura menor)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height * 0.3, width, height * 0.7, [4, 4, 3, 3]);
    ctx.fill();

    // Teto baixo (estilo Enduro / carros clássicos rebaixados)
    ctx.fillStyle = player ? "#0f172a" : "#020617";
    ctx.beginPath();
    ctx.roundRect(-width * 0.3, -height * 0.25, width * 0.6, height * 0.35, [2]);
    ctx.fill();

    // Para-brisa
    ctx.fillStyle = player ? "#38bdf8" : "#94a3b8";
    ctx.fillRect(-width * 0.24, -height * 0.2, width * 0.48, height * 0.15);

    // Lanternas / Faróis
    ctx.fillStyle = player ? "#ef4444" : "#fef08a";
    ctx.fillRect(-width * 0.34, height * 0.2, width * 0.16, height * 0.08);
    ctx.fillRect(width * 0.18, height * 0.2, width * 0.16, height * 0.08);

    ctx.restore();
}

function spawnTraffic() {
    const lanes = [-0.55, 0, 0.55];
    traffic.push({
        x: lanes[Math.floor(Math.random() * lanes.length)],
        z: 0.02,
        color: ["#ef4444", "#3b82f6", "#eab308", "#ec4899", "#8b5cf6"][Math.floor(Math.random() * 5)],
        passed: false
    });
}

function drawTraffic() {
    traffic.forEach(car => {
        const y = H * 0.4 + car.z * H * 0.6;
        const curve = roadCurve(distance + (1 - car.z) * 1000);
        const p = project(y, curve);

        const x = p.center + car.x * p.width * 0.8;
        const size = 0.1 + car.z * 0.9;

        const carWidth = Math.max(12, W * 0.07 * size);
        const carHeight = carWidth * 1.0; // Carros bem mais baixos

        drawCar(x, y, carWidth, carHeight, car.color);
    });
}

function drawPlayer() {
    const p = project(H * 0.88, roadCurve(distance));
    const x = p.center + playerX * p.width * 0.8;

    const carWidth = Math.max(45, W * 0.1);
    const carHeight = carWidth * 1.0; // Jogador também mais baixo e proporcional

    drawCar(x, H * 0.84, carWidth, carHeight, "#00ff91", true);
}

function update(dt) {
    if (!running) return;

    if (keys.accelerate) {
        speed += 100 * dt;
    } else {
        speed -= 25 * dt;
    }

    if (keys.brake) {
        speed -= 160 * dt;
    }

    speed = Math.max(0, Math.min(220, speed));

    const steering = 1.6 * dt;
    if (keys.left) playerX -= steering;
    if (keys.right) playerX += steering;

    playerX = Math.max(-0.95, Math.min(0.95, playerX));

    if (Math.abs(playerX) > 0.8) {
        speed = Math.max(0, speed - 50 * dt);
    }

    distance += speed * dt * 5;
    score += Math.floor(speed * dt);

    // Intervalo muito maior para vir BEM MENOS carros na tela ao mesmo tempo
    spawnTimer += dt;
    if (spawnTimer > 2.2) { 
        spawnTraffic();
        spawnTimer = 0;
    }

    traffic.forEach(car => {
        car.z += speed * dt * 0.00055;

        if (car.z > 0.78 && car.z < 0.90 && Math.abs(car.x - playerX) < 0.28) {
            speed *= 0.4;
            car.z = 1.1;
            message.textContent = "COLISÃO!";
            setTimeout(() => {
                if (!gameOver) message.textContent = "";
            }, 500);
        }

        if (car.z > 0.95 && !car.passed) {
            score += 200;
            car.passed = true;
        }
    });

    traffic = traffic.filter(car => car.z < 1.15);

    time -= dt;
    if (time <= 0) {
        time = 0;
        endGame();
    }

    speedDisplay.textContent = String(Math.floor(speed)).padStart(3, "0");
    scoreDisplay.textContent = String(score).padStart(6, "0");
    timeDisplay.textContent = Math.ceil(time);
}

function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawRoad();
    drawTraffic();
    drawPlayer();
}

function endGame() {
    running = false;
    gameOver = true;
    message.textContent = `FIM DE CORRIDA!\nPONTUAÇÃO: ${score}\n\nTOQUE NA TELA PARA RECOMEÇAR`;
}

function startGame() {
    speed = 0;
    score = 0;
    time = 90;
    playerX = 0;
    distance = 0;
    traffic = [];
    spawnTimer = 0;
    gameOver = false;
    running = true;
    message.textContent = "";

    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });

    speedDisplay.textContent = "000";
    scoreDisplay.textContent = "000000";
    timeDisplay.textContent = "90";
}

canvas.addEventListener("pointerdown", () => {
    if (gameOver) startGame();
});

function bindButton(id, keyName) {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (gameOver) return;
        keys[keyName] = true;
        btn.setPointerCapture(e.pointerId);
    });

    const release = (e) => {
        e.preventDefault();
        keys[keyName] = false;
    };

    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);
}

bindButton("leftButton", "left");
bindButton("rightButton", "right");
bindButton("brakeButton", "brake");
bindButton("accelerateButton", "accelerate");

window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) {
        e.preventDefault();
    }
    if (gameOver && key === " ") {
        startGame();
        return;
    }
    if (key === "arrowleft" || key === "a") keys.left = true;
    if (key === "arrowright" || key === "d") keys.right = true;
    if (key === "arrowup" || key === "w") keys.accelerate = true;
    if (key === "arrowdown" || key === "s") keys.brake = true;
});

window.addEventListener("keyup", e => {
    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") keys.left = false;
    if (key === "arrowright" || key === "d") keys.right = false;
    if (key === "arrowup" || key === "w") keys.accelerate = false;
    if (key === "arrowdown" || key === "s") keys.brake = false;
});

function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.04);
    lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(loop);
}

startGame();
requestAnimationFrame(loop);