// 获取Canvas和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 设置Canvas尺寸为窗口大小
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// 初始化时调整Canvas尺寸
resizeCanvas();

// 监听窗口大小变化
window.addEventListener('resize', () => {
    resizeCanvas();
});

// 添加音效对象
const sounds = {
    shoot: new Audio('./sounds/shoot.mp3'),
    hit: new Audio('./sounds/hit.mp3'),
    destroy: new Audio('./sounds/destroy.mp3')
};

// 添加备用音效（如果没有实际音频文件）
function createAudioElement(frequency, duration, volume) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
    }, duration);
    
    return { play: () => {} }; // 返回一个带有play方法的对象
}

// 如果音频文件不存在，创建备用音效
if (!sounds.shoot.src) {
    sounds.shoot = createAudioElement(880, 100, 0.3); // 高音调短声音
}
if (!sounds.hit.src) {
    sounds.hit = createAudioElement(440, 200, 0.3); // 中音调声音
}
if (!sounds.destroy.src) {
    sounds.destroy = createAudioElement(220, 500, 0.3); // 低音调长声音
}

// 添加背景图像
const background = {
    color: '#87CEEB', // 天空蓝色
    grassColor: '#228B22', // 森林绿
    grassHeight: canvas.height * 0.15 // 草地高度为屏幕高度的15%
};

// 游戏状态
let score = 0;
let gameOver = false;

// 玩家（鼠标控制的准星）
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: Math.min(canvas.width, canvas.height) * 0.02, // 根据屏幕大小调整准星大小
    color: 'red'
};

// 添加枪支对象
const gun = {
    width: Math.min(canvas.width, canvas.height) * 0.04,
    height: Math.min(canvas.width, canvas.height) * 0.015,
    color: '#555',
    barrelLength: Math.min(canvas.width, canvas.height) * 0.03,
    barrelWidth: Math.min(canvas.width, canvas.height) * 0.008,
    recoil: 0,
    maxRecoil: Math.min(canvas.width, canvas.height) * 0.01
};

// 小蛋仔数组
let eggies = [];

// 子弹数组
let bullets = [];

// 爆炸效果数组
let explosions = [];

// 生成小蛋仔
function spawnEggy() {
    const size = Math.min(canvas.width, canvas.height) * (0.03 + Math.random() * 0.02);
    const speed = 1 + Math.random() * 2;
    
    // 决定从哪个边缘生成
    const side = Math.floor(Math.random() * 4);
    let x, y, dx, dy;
    
    switch(side) {
        case 0: // 上边
            x = Math.random() * canvas.width;
            y = -size;
            dx = (Math.random() - 0.5) * 2;
            dy = speed;
            break;
        case 1: // 右边
            x = canvas.width + size;
            y = Math.random() * canvas.height;
            dx = -speed;
            dy = (Math.random() - 0.5) * 2;
            break;
        case 2: // 下边
            x = Math.random() * canvas.width;
            y = canvas.height + size;
            dx = (Math.random() - 0.5) * 2;
            dy = -speed;
            break;
        case 3: // 左边
            x = -size;
            y = Math.random() * canvas.height;
            dx = speed;
            dy = (Math.random() - 0.5) * 2;
            break;
    }
    
    // 随机选择外套颜色
    const coatColors = ['#8a2be2', '#ff4500', '#32cd32', '#1e90ff', '#ff69b4', '#ffa500'];
    const coatColor = coatColors[Math.floor(Math.random() * coatColors.length)];
    
    eggies.push({
        x,
        y,
        dx,
        dy,
        size,
        health: 100,
        coatColor: coatColor,
        isHit: false,
        hitTimer: 0
    });
}

// 绘制背景
function drawBackground() {
    // 绘制天空
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 更新草地高度为屏幕高度的15%
    background.grassHeight = canvas.height * 0.15;
    
    // 绘制草地
    ctx.fillStyle = background.grassColor;
    ctx.fillRect(0, canvas.height - background.grassHeight, canvas.width, background.grassHeight);
    
    // 添加一些装饰性的草
    ctx.fillStyle = '#32CD32'; // 酸橙绿
    for (let i = 0; i < canvas.width; i += canvas.width * 0.015) {
        const height = canvas.height * 0.01 + Math.random() * canvas.height * 0.02;
        ctx.fillRect(i, canvas.height - background.grassHeight, canvas.width * 0.003, -height);
    }
    
    // 添加几朵云
    ctx.fillStyle = 'white';
    drawCloud(canvas.width * 0.1, canvas.height * 0.1, canvas.width * 0.06);
    drawCloud(canvas.width * 0.3, canvas.height * 0.08, canvas.width * 0.04);
    drawCloud(canvas.width * 0.6, canvas.height * 0.15, canvas.width * 0.05);
    drawCloud(canvas.width * 0.8, canvas.height * 0.12, canvas.width * 0.045);
}

// 绘制云朵
function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制小蛋仔
function drawEggy(eggy) {
    // 绘制蛋形身体
    ctx.fillStyle = '#f5f5dc'; // 蛋黄色
    ctx.beginPath();
    ctx.ellipse(eggy.x, eggy.y, eggy.size, eggy.size * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制彩色外套
    ctx.fillStyle = eggy.coatColor;
    ctx.beginPath();
    ctx.ellipse(eggy.x, eggy.y + eggy.size * 0.3, eggy.size * 0.9, eggy.size, 0, 0, Math.PI);
    ctx.fill();
    
    // 绘制手臂
    ctx.strokeStyle = '#f5f5dc';
    ctx.lineWidth = eggy.size * 0.15;
    
    // 左手
    ctx.beginPath();
    ctx.moveTo(eggy.x - eggy.size * 0.7, eggy.y + eggy.size * 0.2);
    ctx.lineTo(eggy.x - eggy.size * 1.1, eggy.y + eggy.size * 0.5);
    ctx.stroke();
    
    // 右手
    ctx.beginPath();
    ctx.moveTo(eggy.x + eggy.size * 0.7, eggy.y + eggy.size * 0.2);
    ctx.lineTo(eggy.x + eggy.size * 1.1, eggy.y + eggy.size * 0.5);
    ctx.stroke();
    
    // 绘制手掌
    ctx.fillStyle = '#f5f5dc';
    ctx.beginPath();
    ctx.arc(eggy.x - eggy.size * 1.1, eggy.y + eggy.size * 0.5, eggy.size * 0.15, 0, Math.PI * 2);
    ctx.arc(eggy.x + eggy.size * 1.1, eggy.y + eggy.size * 0.5, eggy.size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制腿
    ctx.strokeStyle = '#f5f5dc';
    
    // 左腿
    ctx.beginPath();
    ctx.moveTo(eggy.x - eggy.size * 0.4, eggy.y + eggy.size * 0.9);
    ctx.lineTo(eggy.x - eggy.size * 0.5, eggy.y + eggy.size * 1.5);
    ctx.stroke();
    
    // 右腿
    ctx.beginPath();
    ctx.moveTo(eggy.x + eggy.size * 0.4, eggy.y + eggy.size * 0.9);
    ctx.lineTo(eggy.x + eggy.size * 0.5, eggy.y + eggy.size * 1.5);
    ctx.stroke();
    
    // 绘制脚
    ctx.fillStyle = '#8B4513'; // 棕色鞋子
    ctx.beginPath();
    ctx.ellipse(eggy.x - eggy.size * 0.5, eggy.y + eggy.size * 1.6, eggy.size * 0.25, eggy.size * 0.15, 0, 0, Math.PI * 2);
    ctx.ellipse(eggy.x + eggy.size * 0.5, eggy.y + eggy.size * 1.6, eggy.size * 0.25, eggy.size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制眼睛和表情
    if (eggy.isHit) {
        // 被击中时的哭泣表情
        // 眼睛变成 X 形
        ctx.strokeStyle = 'black';
        ctx.lineWidth = eggy.size * 0.05;
        
        // 左眼 X
        ctx.beginPath();
        ctx.moveTo(eggy.x - eggy.size * 0.4, eggy.y - eggy.size * 0.3);
        ctx.lineTo(eggy.x - eggy.size * 0.2, eggy.y - eggy.size * 0.1);
        ctx.moveTo(eggy.x - eggy.size * 0.2, eggy.y - eggy.size * 0.3);
        ctx.lineTo(eggy.x - eggy.size * 0.4, eggy.y - eggy.size * 0.1);
        ctx.stroke();
        
        // 右眼 X
        ctx.beginPath();
        ctx.moveTo(eggy.x + eggy.size * 0.4, eggy.y - eggy.size * 0.3);
        ctx.lineTo(eggy.x + eggy.size * 0.2, eggy.y - eggy.size * 0.1);
        ctx.moveTo(eggy.x + eggy.size * 0.2, eggy.y - eggy.size * 0.3);
        ctx.lineTo(eggy.x + eggy.size * 0.4, eggy.y - eggy.size * 0.1);
        ctx.stroke();
        
        // 哭泣的嘴巴
        ctx.beginPath();
        ctx.arc(eggy.x, eggy.y + eggy.size * 0.2, eggy.size * 0.2, Math.PI, 0);
        ctx.stroke();
        
        // 眼泪
        ctx.fillStyle = '#1e90ff';
        ctx.beginPath();
        ctx.arc(eggy.x - eggy.size * 0.3, eggy.y, eggy.size * 0.08, 0, Math.PI * 2);
        ctx.arc(eggy.x + eggy.size * 0.3, eggy.y, eggy.size * 0.08, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // 正常表情
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(eggy.x - eggy.size * 0.3, eggy.y - eggy.size * 0.2, eggy.size * 0.1, 0, Math.PI * 2);
        ctx.arc(eggy.x + eggy.size * 0.3, eggy.y - eggy.size * 0.2, eggy.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制嘴巴
        ctx.beginPath();
        ctx.arc(eggy.x, eggy.y + eggy.size * 0.1, eggy.size * 0.2, 0, Math.PI);
        ctx.stroke();
    }
    
    // 绘制生命条
    const healthBarWidth = eggy.size * 2;
    const healthBarHeight = 5;
    const healthPercentage = eggy.health / 100;
    
    ctx.fillStyle = 'red';
    ctx.fillRect(eggy.x - healthBarWidth / 2, eggy.y - eggy.size * 1.5, healthBarWidth, healthBarHeight);
    
    ctx.fillStyle = 'green';
    ctx.fillRect(eggy.x - healthBarWidth / 2, eggy.y - eggy.size * 1.5, healthBarWidth * healthPercentage, healthBarHeight);
}

// 更新子弹位置
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 计算子弹移动方向
        const angle = Math.atan2(bullet.targetY - bullet.startY, bullet.targetX - bullet.startX);
        bullet.x += Math.cos(angle) * bullet.speed;
        bullet.y += Math.sin(angle) * bullet.speed;
        
        // 检测子弹是否击中小蛋仔
        for (let j = eggies.length - 1; j >= 0; j--) {
            const eggy = eggies[j];
            const dx = bullet.x - eggy.x;
            const dy = bullet.y - eggy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < eggy.size) {
                // 子弹击中小蛋仔
                eggy.health -= 25;
                
                // 设置被击中状态和计时器
                eggy.isHit = true;
                eggy.hitTimer = 30; // 30帧后恢复正常表情
                
                // 创建爆炸效果
                createExplosion(bullet.x, bullet.y);
                
                // 移除子弹
                bullets.splice(i, 1);
                
                // 播放击中音效
                playSound('hit');
                
                if (eggy.health <= 0) {
                    // 小蛋仔被消灭
                    eggies.splice(j, 1);
                    score += 100;
                    scoreElement.textContent = `分数: ${score}`;
                    
                    // 播放消灭音效
                    playSound('destroy');
                }
                
                break;
            }
        }
        
        // 检测子弹是否超出画布
        if (bullets[i] && (bullets[i].x < 0 || bullets[i].x > canvas.width || bullets[i].y < 0 || bullets[i].y > canvas.height)) {
            bullets.splice(i, 1);
        }
    }
}

// 更新小蛋仔位置
function updateEggies() {
    for (let i = eggies.length - 1; i >= 0; i--) {
        const eggy = eggies[i];
        
        // 更新位置
        eggy.x += eggy.dx;
        eggy.y += eggy.dy;
        
        // 更新被击中状态
        if (eggy.isHit) {
            eggy.hitTimer--;
            if (eggy.hitTimer <= 0) {
                eggy.isHit = false;
            }
        }
        
        // 检测是否超出画布
        if (eggy.x < -eggy.size * 2 || eggy.x > canvas.width + eggy.size * 2 || 
            eggy.y < -eggy.size * 2 || eggy.y > canvas.height + eggy.size * 2) {
            eggies.splice(i, 1);
        }
    }
}

// 绘制玩家准星和枪支
function drawPlayer() {
    // 绘制枪支
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height - canvas.height * 0.1);
    
    // 计算枪的旋转角度 (朝向鼠标位置)
    const dx = player.x - canvas.width / 2;
    const dy = player.y - (canvas.height - canvas.height * 0.1);
    const angle = Math.atan2(dy, dx);
    
    // 旋转画布
    ctx.rotate(angle);
    
    // 绘制枪身
    ctx.fillStyle = gun.color;
    ctx.fillRect(0, -gun.height / 2, gun.width - gun.recoil, gun.height);
    
    // 绘制枪管
    ctx.fillStyle = '#333';
    ctx.fillRect(gun.width - gun.recoil, -gun.barrelWidth / 2, gun.barrelLength, gun.barrelWidth);
    
    // 恢复画布状态
    ctx.restore();
    
    // 减少后坐力效果
    if (gun.recoil > 0) {
        gun.recoil -= 1;
    }
    
    // 绘制准星
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 2;
    
    // 绘制十字准星
    ctx.beginPath();
    ctx.moveTo(player.x - player.size / 2, player.y);
    ctx.lineTo(player.x + player.size / 2, player.y);
    ctx.moveTo(player.x, player.y - player.size / 2);
    ctx.lineTo(player.x, player.y + player.size / 2);
    ctx.stroke();
    
    // 绘制圆形准星
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.stroke();
}

// 发射子弹
function shootBullet() {
    // 添加后坐力效果
    gun.recoil = gun.maxRecoil;
    
    // 计算子弹发射位置（从枪口发射）
    const dx = player.x - canvas.width / 2;
    const dy = player.y - (canvas.height - canvas.height * 0.1);
    const angle = Math.atan2(dy, dx);
    const distance = gun.width + gun.barrelLength;
    
    const bulletStartX = canvas.width / 2 + Math.cos(angle) * distance;
    const bulletStartY = (canvas.height - canvas.height * 0.1) + Math.sin(angle) * distance;
    
    bullets.push({
        x: bulletStartX,
        y: bulletStartY,
        startX: bulletStartX,
        startY: bulletStartY,
        targetX: player.x,
        targetY: player.y,
        speed: Math.min(canvas.width, canvas.height) * 0.01,
        size: Math.min(canvas.width, canvas.height) * 0.005,
        color: '#ffff00'
    });
    
    // 添加枪口闪光效果
    createMuzzleFlash(bulletStartX, bulletStartY, angle);
    
    // 播放射击音效
    playSound('shoot');
}

// 添加枪口闪光效果
function createMuzzleFlash(x, y, angle) {
    explosions.push({
        x,
        y,
        radius: 10,
        maxRadius: 15,
        alpha: 1,
        color: '#ff9900',
        duration: 5,
        currentFrame: 0
    });
}

// 确保鼠标点击事件正确绑定
canvas.addEventListener('click', (e) => {
    if (gameOver) {
        resetGame();
    } else {
        shootBullet();
    }
});

// 绘制子弹
function drawBullet(bullet) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
    ctx.fill();
}

// 创建爆炸效果
function createExplosion(x, y) {
    explosions.push({
        x,
        y,
        radius: 5,
        maxRadius: 20,
        alpha: 1,
        color: '#ffcc00'
    });
}

// 更新和绘制爆炸效果
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        
        // 更新爆炸效果
        if (explosion.duration) {
            // 枪口闪光效果
            explosion.currentFrame++;
            explosion.alpha = 1 - (explosion.currentFrame / explosion.duration);
            
            if (explosion.currentFrame >= explosion.duration) {
                explosions.splice(i, 1);
                continue;
            }
        } else {
            // 普通爆炸效果
            explosion.radius += 1;
            explosion.alpha -= 0.05;
            
            if (explosion.alpha <= 0 || explosion.radius >= explosion.maxRadius) {
                explosions.splice(i, 1);
                continue;
            }
        }
        
        // 绘制爆炸效果
        ctx.globalAlpha = explosion.alpha;
        ctx.fillStyle = explosion.color;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// 更新小蛋仔位置
function updateEggies() {
    for (let i = eggies.length - 1; i >= 0; i--) {
        const eggy = eggies[i];
        
        // 更新位置
        eggy.x += eggy.dx;
        eggy.y += eggy.dy;
        
        // 检测是否超出画布
        if (eggy.x < -eggy.size * 2 || eggy.x > canvas.width + eggy.size * 2 || 
            eggy.y < -eggy.size * 2 || eggy.y > canvas.height + eggy.size * 2) {
            eggies.splice(i, 1);
        }
    }
}

// 播放音效
function playSound(type) {
    // 克隆音频对象以允许重叠播放
    if (sounds[type]) {
        const sound = sounds[type].cloneNode();
        sound.volume = 0.5; // 设置音量
        
        // 添加随机音高变化，使声音更有变化
        if (type === 'hit') {
            sound.playbackRate = 0.8 + Math.random() * 0.4; // 0.8-1.2 之间的随机速率
        }
        
        // 播放声音
        sound.play().catch(error => {
            console.log('音频播放失败:', error);
            
            // 如果播放失败，使用备用音效
            if (type === 'shoot') {
                createAudioElement(880, 100, 0.3);
            } else if (type === 'hit') {
                createAudioElement(440, 200, 0.3);
            } else if (type === 'destroy') {
                createAudioElement(220, 500, 0.3);
            }
        });
    }
}

// 游戏主循环
function gameLoop() {
    if (gameOver) {
        drawGameOver();
        return;
    }
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    drawBackground();
    
    // 随机生成小蛋仔
    if (Math.random() < 0.02 && eggies.length < 20) {
        spawnEggy();
    }
    
    // 更新和绘制游戏元素
    updateEggies();
    updateBullets();
    updateExplosions();
    
    // 绘制小蛋仔
    eggies.forEach(drawEggy);
    
    // 绘制子弹
    bullets.forEach(drawBullet);
    
    // 绘制玩家准星
    drawPlayer();
    
    // 继续游戏循环
    requestAnimationFrame(gameLoop);
}

// 绘制游戏结束画面
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = `${Math.min(canvas.width, canvas.height) * 0.05}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - canvas.height * 0.05);
    
    ctx.font = `${Math.min(canvas.width, canvas.height) * 0.025}px Arial`;
    ctx.fillText(`最终分数: ${score}`, canvas.width / 2, canvas.height / 2);
    
    ctx.font = `${Math.min(canvas.width, canvas.height) * 0.02}px Arial`;
    ctx.fillText('点击重新开始', canvas.width / 2, canvas.height / 2 + canvas.height * 0.05);
}

// 重置游戏
function resetGame() {
    score = 0;
    scoreElement.textContent = `分数: ${score}`;
    eggies = [];
    bullets = [];
    explosions = [];
    gameOver = false;
    gameLoop();
}

// 鼠标移动事件
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left;
    player.y = e.clientY - rect.top;
});

// 鼠标点击事件
canvas.addEventListener('click', (e) => {
    if (gameOver) {
        resetGame();
    } else {
        shootBullet();
    }
});

// 开始游戏
gameLoop();