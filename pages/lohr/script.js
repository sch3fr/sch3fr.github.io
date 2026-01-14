const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 600;

// Nastavení hry
const roadWidth = 100;
const roadX = (canvas.width - roadWidth) / 2;
const roadY = (canvas.height - roadWidth) / 2;
let gameOver = false;
let gameOverReason = "";
let score = 0;

// Obtížnost a levely
let level = 1;
const levelElement = document.getElementById('level');

// Výchozí hodnoty (Level 1)
let minSpeed = 3;
let maxSpeed = 5;
let spawnIntervalMin = 1000; 
let spawnIntervalMax = 2000; 

// UI elementy
const scoreElement = document.getElementById('score');

// --- TŘÍDA SEMAFOR ---
class TrafficLight {
    constructor(x, y, defaultState) {
        this.x = x;
        this.y = y;
        this.state = defaultState; // 'red' nebo 'green'
        this.radius = 12;
    }

    draw() {
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.state === 'red' ? '#ff4444' : '#44ff44';
        ctx.fill();
        ctx.closePath();
    }

    toggle() {
        this.state = (this.state === 'red') ? 'green' : 'red';
    }
}

// --- TŘÍDA AUTO ---
class Car {
    constructor(direction, speed) {
        this.direction = direction; 
        this.speed = speed;
        this.passed = false; 
        
        // Počítadlo čekání (v počtu snímků)
        this.waitingTime = 0; 

        if (direction === 'right') {
            this.x = -60;
            this.y = roadY + 60; 
            this.width = 40;
            this.height = 20;
            this.color = '#3498db'; 
        } else if (direction === 'down') {
            this.x = roadX + 65; 
            this.y = -60;
            this.width = 20;
            this.height = 40;
            this.color = '#e74c3c'; 
        }
    }

    update(lightHorizontal, lightVertical, allCars) {
        let shouldStop = false;
        const stopDistanceBuffer = 25; 

        // --- 1. KONTROLA SEMAFORU ---
        if (this.direction === 'right') {
            const stopLineX = roadX - 10;
            const dist = stopLineX - (this.x + this.width);
            if (lightHorizontal.state === 'red' && dist > 0 && dist < stopDistanceBuffer) {
                shouldStop = true;
            }
        } else {
            const stopLineY = roadY - 10;
            const dist = stopLineY - (this.y + this.height);
            if (lightVertical.state === 'red' && dist > 0 && dist < stopDistanceBuffer) {
                shouldStop = true;
            }
        }

        // --- 2. DETEKCE AUTA PŘED NÁMI ---
        for (let otherCar of allCars) {
            if (otherCar === this) continue; 

            if (otherCar.direction === this.direction) {
                let distanceToCar;
                if (this.direction === 'right') {
                    if (otherCar.x > this.x) {
                        distanceToCar = otherCar.x - (this.x + this.width);
                        if (distanceToCar > 0 && distanceToCar < (this.speed + 15)) shouldStop = true;
                    }
                } else { 
                     if (otherCar.y > this.y) {
                        distanceToCar = otherCar.y - (this.y + this.height);
                        if (distanceToCar > 0 && distanceToCar < (this.speed + 15)) shouldStop = true;
                    }
                }
            }
        }

        // --- 3. POHYB NEBO PENALIZACE ---
        if (!shouldStop) {
            // Auto jede
            if (this.direction === 'right') this.x += this.speed;
            if (this.direction === 'down') this.y += this.speed;
            
            // Když se auto hýbe, vynulujeme čekání (řidič se uklidní)
            this.waitingTime = 0; 
        } else {
            // Auto stojí -> zvyšujeme frustraci
            this.waitingTime++;

            // Každých 60 snímků (cca 1 sekunda) odečteme bod
            if (this.waitingTime % 60 === 0) {
                score--;
                scoreElement.innerText = score;
                
                // Vizuální efekt (volitelné): změníme barvu UI na chvíli na červenou
                scoreElement.style.color = "red";
                setTimeout(() => scoreElement.style.color = "white", 200);
            }
        }

        // --- 4. SKÓRE A LEVEL UP ---
        if (!this.passed) {
            if ((this.direction === 'right' && this.x > roadX + roadWidth) || 
                (this.direction === 'down' && this.y > roadY + roadWidth)) {
                
                score++;
                scoreElement.innerText = score;
                this.passed = true;

                if (score > 0 && score % 10 === 0) {
                    levelUp();
                }
            }
        }
    }

    draw() {
        ctx.save(); 
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // Pokud auto dlouho čeká, nakreslíme nad ním malý vykřičník (!)
        if (this.waitingTime > 120) { // Čeká déle než 2 vteřiny
            ctx.fillStyle = "red";
            ctx.font = "bold 20px Arial";
            ctx.fillText("!", this.x + this.width/2 - 5, this.y - 10);
        }

        // Zbytek vykreslování (světla, okna) zůstává stejný...
        if (this.direction === 'right') {
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.fillRect(this.x + 5, this.y + 2, 15, this.height - 4);
            ctx.fillStyle = "#ffeb3b"; 
            ctx.fillRect(this.x + this.width - 2, this.y, 2, 4); 
            ctx.fillRect(this.x + this.width - 2, this.y + this.height - 4, 2, 4); 
            ctx.fillStyle = "#ff4444";
            ctx.fillRect(this.x, this.y, 2, 4);
            ctx.fillRect(this.x, this.y + this.height - 4, 2, 4);
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.fillRect(this.x + 2, this.y + 5, this.width - 4, 15);
            ctx.fillStyle = "#ffeb3b";
            ctx.fillRect(this.x, this.y + this.height - 2, 4, 2);
            ctx.fillRect(this.x + this.width - 4, this.y + this.height - 2, 4, 2);
            ctx.fillStyle = "#ff4444";
            ctx.fillRect(this.x, this.y, 4, 2);
            ctx.fillRect(this.x + this.width - 4, this.y, 4, 2);
        }
        ctx.restore(); 
    }
}

// --- HERNÍ LOGIKA A FUNKCE ---

const lightH = new TrafficLight(roadX - 30, roadY + roadWidth + 30, 'red');
const lightV = new TrafficLight(roadX - 30, roadY - 30, 'green'); 
const cars = []; 

function checkCollision(car1, car2) {
    // 1. Základní kontrola překrytí (jako doteď)
    const overlap = (car1.x < car2.x + car2.width &&
                     car1.x + car1.width > car2.x &&
                     car1.y < car2.y + car2.height &&
                     car1.y + car1.height > car2.y);

    if (!overlap) return false; // Pokud se nedotýkají, je to OK

    // 2. NOVÉ: Pokud se dotýkají, zkontrolujeme směr
    // Pokud jedou stejným směrem, je to jen "nedobrzdění" -> Ignorujeme to (není Game Over)
    if (car1.direction === car2.direction) {
        return false;
    }

    // Pokud jedou různými směry (kříží se), je to bouračka -> Game Over
    return true;
}
function levelUp() {
    level++;
    levelElement.innerText = level;
    console.log("Level Up! Nyní level: " + level);

    if (level % 2 === 0) {
        // Sudý level: Zrychlení
        minSpeed += 1;
        maxSpeed += 1;
    } else {
        // Lichý level: Více aut
        if (spawnIntervalMin > 10) {
            spawnIntervalMin -= 400;
            spawnIntervalMax -= 400;
        }
    }
}

function spawnCar() {
    if (gameOver) return;

    const dir = Math.random() < 0.5 ? 'right' : 'down';
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    
    cars.push(new Car(dir, speed));

    const nextSpawnTime = spawnIntervalMin + Math.random() * (spawnIntervalMax - spawnIntervalMin);
    setTimeout(spawnCar, nextSpawnTime);
}

canvas.addEventListener('click', () => {
    if (gameOver) {
        location.reload(); 
        return;
    }
    lightH.toggle();
    lightV.toggle();
});

function drawBackground() {
    ctx.fillStyle = "#555";
    ctx.fillRect(roadX, 0, roadWidth, canvas.height); 
    ctx.fillRect(0, roadY, canvas.width, roadWidth);  
    
    // Přerušované čáry
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]); 

    const centerX = roadX + roadWidth / 2;
    const centerY = roadY + roadWidth / 2;

    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, roadY);
    ctx.moveTo(centerX, roadY + roadWidth);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(roadX, centerY);
    ctx.moveTo(roadX + roadWidth, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    ctx.setLineDash([]); 

    // Stop čáry
    ctx.fillStyle = "white";
    ctx.fillRect(roadX - 10, roadY + roadWidth/2, 10, roadWidth/2); 
    ctx.fillRect(roadX + roadWidth/2, roadY - 10, roadWidth/2, 10); 
}

function gameLoop() {
    // --- VYKRESLENÍ GAME OVER OBRAZOVKY ---
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; // Trochu tmavší pozadí
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        
        // Vypíšeme důvod prohry
        if (gameOverReason === "crash") {
            ctx.fillText("NEHODA!", canvas.width/2, canvas.height/2 - 30);
        } else {
            ctx.fillText("KOLAPS DOPRAVY!", canvas.width/2, canvas.height/2 - 30);
            ctx.font = "20px Arial";
            ctx.fillStyle = "#ffeb3b"; // Žlutá pro doplňující text
            ctx.fillText("Příliš dlouhá kolona (max 7 aut)", canvas.width/2, canvas.height/2 + 10);
        }
        
        ctx.fillStyle = "white";
        ctx.font = "25px Arial";
        ctx.fillText("Finální skóre: " + score, canvas.width/2, canvas.height/2 + 60);
        
        ctx.font = "18px Arial";
        ctx.fillStyle = "#aaa";
        ctx.fillText("Klikni pro restart", canvas.width/2, canvas.height/2 + 100);
        return;
    }

    // --- BĚŽNÁ HERNÍ SMYČKA ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    lightH.draw();
    lightV.draw();

    // Proměnné pro počítání kolony v tomto snímku
    let waitingRight = 0;
    let waitingDown = 0;

    for (let i = 0; i < cars.length; i++) {
        let car = cars[i];
        
        car.update(lightH, lightV, cars);
        car.draw();

        // 1. Počítání čekajících aut pro Game Over
        // Pokud auto stojí (waitingTime > 0), přičteme ho k danému směru
        if (car.waitingTime > 0) {
            if (car.direction === 'right') waitingRight++;
            if (car.direction === 'down') waitingDown++;
        }

        // 2. Odstranění aut mimo obrazovku
        if (car.x > canvas.width || car.y > canvas.height) {
            cars.splice(i, 1);
            i--;
            continue;
        }

        // 3. Kontrola kolizí
        for (let j = i + 1; j < cars.length; j++) {
            if (checkCollision(car, cars[j])) {
                gameOver = true; 
                gameOverReason = "crash"; // Nastavíme důvod: Nehoda
            }
        }
    }

    // --- KONTROLA LIMITU KOLONY ---
    // Pokud v jakémkoliv směru stojí více než 7 aut -> Konec hry
    if (waitingRight > 7 || waitingDown > 7) {
        gameOver = true;
        gameOverReason = "jam"; // Nastavíme důvod: Zácpa
    }

    // (Volitelné) Debug výpis do rohu obrazovky, abys viděl aktuální stav
    // Můžeš smazat, pokud to tam nechceš
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Fronta H: ${waitingRight}/7`, 10, canvas.height - 30);
    ctx.fillText(`Fronta V: ${waitingDown}/7`, 10, canvas.height - 15);

    requestAnimationFrame(gameLoop);
}

// Start
spawnCar(); 
gameLoop();