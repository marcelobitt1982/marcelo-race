<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enduro - Web Edition</title>
    <style>
        body {
            background-color: #111;
            color: #fff;
            font-family: 'Courier New', Courier, monospace;
            text-align: center;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        h1 { margin: 5px 0; font-size: 20px; color: #ffcc00; }
        #game-container {
            position: relative;
            width: 600px;
            height: 450px;
            margin: 0 auto;
            background: #87CEEB;
            border: 4px solid #555;
            overflow: hidden;
        }
        canvas {
            display: block;
            background: linear-gradient(to bottom, #555 50%, #333 50%);
        }
        #ui {
            width: 600px;
            margin: 10px auto;
            background: #222;
            border: 2px solid #444;
            padding: 10px;
            display: flex;
            justify-content: space-around;
            font-size: 14px;
            box-sizing: border-box;
        }
        .hud-box {
            text-align: center;
        }
        .hud-value {
            font-size: 18px;
            color: #00ff00;
            font-weight: bold;
        }
        #instructions {
            font-size: 12px;
            color: #aaa;
            margin-top: 5px;
        }
    </style>
</head>
<body>

    <h1>ENDURO - ATARI</h1>
    <div id="game-container">
        <canvas id="gameCanvas" width="600" height="450"></canvas>
    </div>

    <div id="ui">
        <div class="hud-box">DIAS<br><span id="hud-day" class="hud-value">1</span></div>
        <div class="hud-box">KM<br><span id="hud-km" class="hud-value">0</span></div>
        <div class="hud-box">PASSADOS<br><span id="hud-passed" class="hud-value">0/200</span></div>
        <div class="hud-box">CLIMA / HORA<br><span id="hud-weather" class="hud-value">DIA</span></div>
    </div>

    <div id="instructions">
        Controles: Setas <b>ESQUERDA / DIREITA</b> para guiar | <b>SETA ACIMA</b> para Acelerar | <b>SETA ABAIXO</b> para Frear
    </div>

<script>
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Estado do Jogo
let gameState = "START"; // START, PLAYING, GAMEOVER, DAYCLEAR
let scoreKm = 0;
let day = 1;
let carsPassed = 0;
let carsRequired = 200;

// Jogador
let player = {
    x: 300,
    y: 380,
    width: 40,
    height: 25,
    speed: 0,
    maxSpeed: 8,
    vx: 0
};

// Estrada e Ambiente
let roadWidthNear = 500;
let roadWidthFar = 60;
let roadCenter = 300;
let horizonY = 180;

let timeOfDay = 0; // 0 a 100 (Dia -> Noite -> Amanhecer)
let weather = "CLEAR"; // CLEAR, ICE, FOG, NIGHT
let weatherTimer = 0;

let cars = [];
let keys = {};

// Teclado
window.addEventListener("keydown", e => { keys[e.code] = true; if(gameState === "START" && e.code === "Space") resetGame(); });
window.addEventListener("keyup", e => { keys[e.code] = false; });

function resetGame() {
    gameState = "PLAYING";
    scoreKm = 0;
    day = 1;
    carsPassed = 0;
    carsRequired = 200;
    timeOfDay = 0;
    weather = "CLEAR";
    player.x = 300;
    player.speed = 0;
    cars = [];
}

// Spawn de carros inimigos
function spawnCar() {
    if (cars.length < 6 && Math.random() < 0.05 + (day * 0.005)) {
        let laneOffset = (Math.random() - 0.5) * 300;
        cars.push({
            x: roadCenter + laneOffset,
            y: horizonY + 5,
            z: 0.01, // Profundidade (0 = horizonte, 1 = perto)
            speed: 2 + Math.random() * 2 + (day * 0.2),
            color: ["#ff0000", "#0000ff", "#ffff00", "#ff00ff"][Math.floor(Math.random()*4)]
        });
    }
}

// Atualização da Lógica
function update() {
    if (gameState !== "PLAYING") return;

    // Horário e Clima dinâmico por dia
    timeOfDay += 0.05;
    if (timeOfDay > 200) {
        timeOfDay = 0;
        day++;
        carsPassed = 0;
        carsRequired = 300; // Dias seguintes exigem 300 carros
    }

    // Definir clima com base no ciclo do dia
    if (timeOfDay < 70) {
        weather = "CLEAR";
    } else if (timeOfDay < 110) {
        weather = "FOG";
    } else if (timeOfDay < 150) {
        weather = "ICE"; // Pista escorregadia
    } else {
        weather = "NIGHT"; // Apenas lanternas
    }

    // Controles do Jogador
    let steeringPower = (weather === "ICE") ? 2 : 4; // No gelo vira menos
    
    if (keys["ArrowLeft"]) player.x -= steeringPower;
    if (keys["ArrowRight"]) player.x += steeringPower;
    
    if (keys["ArrowUp"]) {
        if (player.speed < player.maxSpeed) player.speed += 0.1;
    } else if (keys["ArrowDown"]) {
        player.speed -= 0.3; // Freio
        if (player.speed < 0) player.speed = 0;
    } else {
        player.speed -= 0.02; // Atrito natural
        if (player.speed < 0) player.speed = 0;
    }

    scoreKm += player.speed * 0.01;

    // Movimento dos Carros
    spawnCar();
    for (let i = cars.length - 1; i >= 0; i--) {
        let c = cars[i];
        // O carro se aproxima baseada na velocidade relativa
        c.z += (player.speed - c.speed * 0.5) * 0.0008;
        c.z = Math.max(0.001, c.z);

        // Mapear posição 3D para 2D na tela
        let currentRoadWidth = roadWidthFar + (roadWidthNear - roadWidthFar) * c.z;
        let screenX = roadCenter + (c.x - roadCenter) * c.z;
        let screenY = horizonY + (canvas.height - horizonY) * c.z;

        // Se o carro passou por você
        if (c.z > 1.0) {
            cars.splice(i, 1);
            carsPassed++;
            continue;
        }

        // Colisão
        if (c.z > 0.85 && c.z < 0.98) {
            let playerScreenX = player.x;
            if (Math.abs(screenX - playerScreenX) < 30) {
                player.speed = 2; // Bateu e desacelerou
            }
        }
    }

    // Limites da pista
    if (player.x < 150 || player.x > 450) {
        player.speed *= 0.95; // Saiu da pista grama/neve desacelera
    }

    // Atualizar HUD na tela
    document.getElementById("hud-day").innerText = day;
    document.getElementById("hud-km").innerText = Math.floor(scoreKm);
    document.getElementById("hud-passed").innerText = `${carsPassed}/${carsRequired}`;
    document.getElementById("hud-weather").innerText = weather;
}

// Renderização Gráfica (Estilo Pseudo-3D retrô)
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Céu dinâmico
    let skyColor = "#87CEEB";
    if (weather === "NIGHT") skyColor = "#050515";
    if (weather === "FOG") skyColor = "#aaaaaa";
    if (weather === "ICE") skyColor = "#d0e0f0";
    
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, canvas.width, horizonY);

    // Sol / Lua
    if (weather !== "NIGHT") {
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.arc(450, 80, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // Chão / Terra
    ctx.fillStyle = (weather === "ICE") ? "#e0f0ff" : "#2e8b57";
    ctx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);

    // Estrada
    ctx.fillStyle = (weather === "ICE") ? "#ffffff" : "#444444";
    ctx.beginPath();
    ctx.moveTo(roadCenter - roadWidthFar / 2, horizonY);
    ctx.lineTo(roadCenter + roadWidthFar / 2, horizonY);
    ctx.lineTo(roadCenter + roadWidthNear / 2, canvas.height);
    ctx.lineTo(roadCenter - roadWidthNear / 2, canvas.height);
    ctx.fill();

    // Faixas da Estrada (Efeito de movimento)
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 3;
    let offset = (Date.now() * player.speed * 0.1) % 40;
    for (let y = horizonY; y < canvas.height; y += 40) {
        let currentY = y + offset;
        if (currentY > canvas.height) continue;
        let scale = (currentY - horizonY) / (canvas.height - horizonY);
        let w = roadWidthFar + (roadWidthNear - roadWidthFar) * scale;
        ctx.fillStyle = "#fff";
        ctx.fillRect(roadCenter - 5, currentY, 10, 15 * scale);
    }

    // Desenhar Carros Inimigos
    // Ordenar por profundidade para desenhar do fundo para frente
    let sortedCars = [...cars].sort((a, b) => a.z - b.z);
    for (let c of sortedCars) {
        let scale = c.z;
        let screenX = roadCenter + (c.x - roadCenter) * scale;
        let screenY = horizonY + (canvas.height - horizonY) * scale;
        
        let cWidth = 60 * scale;
        let cHeight = 35 * scale;

        if (weather === "NIGHT") {
            // À noite só aparecem as lanternas vermelhas
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(screenX - cWidth * 0.3, screenY - cHeight * 0.5, 6, 4);
            ctx.fillRect(screenX + cWidth * 0.1, screenY - cHeight * 0.5, 6, 4);
        } else {
            ctx.fillStyle = c.color;
            ctx.fillRect(screenX - cWidth / 2, screenY - cHeight, cWidth, cHeight);
            // Janela do carro
            ctx.fillStyle = "#111";
            ctx.fillRect(screenX - cWidth * 0.3, screenY - cHeight * 0.8, cWidth * 0.6, cHeight * 0.4);
        }
    }

    // Desenhar Jogador (Carro Vermelho clássico)
    let pWidth = 80;
    let pHeight = 45;
    let px = player.x - pWidth / 2;
    let py = player.y;

    // Sombra do jogador
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(px + 10, py + pHeight - 5, pWidth - 20, 10);

ografia do carro do jogador
    ctx.fillStyle = "#d92b2b"; // Vermelho Atari
    ctx.fillRect(px, py + 10, pWidth, pHeight - 10);
    ctx.fillRect(px + 15, py, pWidth - 30, 15); // Teto/Vidro

    ctx.fillStyle = "#111"; // Janelas
    ctx.fillRect(px + 20, py + 4, pWidth - 40, 10);

    // Efeito de Nevoeiro na tela
    if (weather === "FOG") {
        ctx.fillStyle = "rgba(200, 200, 200, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Tela Inicial
    if (gameState === "START") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 28px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillText("ENDURO", canvas.width / 2, 160);
        ctx.font = "16px 'Courier New'";
        ctx.fillStyle = "#fff";
        ctx.fillText("Pressione ESPAÇO para Iniciar", canvas.width / 2, 220);
        ctx.fillText("Desvie dos carros e passe a meta diária!", canvas.width / 2, 260);
    }
}

// Loop Principal do Jogo
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
</script>

</body>
</html>