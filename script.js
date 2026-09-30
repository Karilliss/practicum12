let currentUnits = 'metric';
let selectedCityData = null;
let bgParticles = [];
let bgClouds = [];
let bgAnimationId = null;
let widgetAnimationId = null;

let isCatLoaded = false;
const catImage = new Image();
catImage.src = 'meowl.png';
catImage.onload = () => {
  isCatLoaded = true;
  drawWidgetAnimation();
};

let canvas, ctx;
let bgCanvas, bgCtx;
let animAngle = 0;
let currentCategory = 'cloud';

let widgetRainDrops = [];
let widgetSnowFlakes = [];

function initWidgetParticles() {
  widgetRainDrops = [];
  widgetSnowFlakes = [];

  for (let i = 0; i < 25; i++) {
    widgetRainDrops.push({
      x: Math.random() * (canvas ? canvas.width : 200),
      y: Math.random() * (canvas ? canvas.height : 200),
      speed: Math.random() * 2 + 3,
      length: Math.random() * 6 + 6
    });
  }

  for (let i = 0; i < 20; i++) {
    widgetSnowFlakes.push({
      x: Math.random() * (canvas ? canvas.width : 200),
      y: Math.random() * (canvas ? canvas.height : 200),
      speed: Math.random() * 0.8 + 0.5,
      radius: Math.random() * 1.5 + 1.5,
      drift: Math.random() * 0.5 - 0.25
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('weatherCanvas');
  if (canvas) {
    ctx = canvas.getContext('2d');
  }

  bgCanvas = document.getElementById('bgCanvas');
  if (bgCanvas) {
    bgCtx = bgCanvas.getContext('2d');
    resizeBgCanvas();
    window.addEventListener('resize', resizeBgCanvas);
  }

  insertHeaderAnimation();
  initWidgetParticles();
  setupEventListeners();
  loadSavedData();
});

function insertHeaderAnimation() {
  const header = document.querySelector('h1') || document.querySelector('.header') || document.querySelector('header');
  if (header && !document.getElementById('headerAnimationMedia')) {
    const media = document.createElement('video');
    media.id = 'headerAnimationMedia';
    media.src = 'animation.gif.mp4';
    media.autoplay = true;
    media.loop = true;
    media.muted = true;
    media.playsInline = true;
    media.style.height = '40px';
    media.style.width = 'auto';
    media.style.verticalAlign = 'middle';
    media.style.marginLeft = '10px';
    media.style.borderRadius = '8px';

    header.appendChild(media);
  }
}

function resizeBgCanvas() {
  if (!bgCanvas) return;
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  if (currentCategory) {
    initBgElements(currentCategory);
  }
}

function setupEventListeners() {
  const citySelect = document.getElementById('citySelect');
  if (citySelect) {
    citySelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption && selectedOption.dataset.lat) {
        document.getElementById('latInput').value = selectedOption.dataset.lat;
        document.getElementById('lonInput').value = selectedOption.dataset.lon;
      }
    });
  }

  const loadBtn = document.getElementById('loadBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', handleLoadWeather);
  }
}

function handleLoadWeather() {
  const lat = document.getElementById('latInput').value;
  const lon = document.getElementById('lonInput').value;
  const citySelect = document.getElementById('citySelect');
  const cityName = citySelect.options[citySelect.selectedIndex] ? citySelect.options[citySelect.selectedIndex].text : 'Місто';

  if (!lat || !lon) {
    alert('Будь ласка, введіть широту та довготу');
    return;
  }

  selectedCityData = { lat, lon, name: cityName };
  fetchWeatherData(lat, lon, cityName);
}

function getWmoDescription(code) {
  const descriptions = {
    0: 'Ясно',
    1: 'Переважно ясно',
    2: 'Мінлива хмарність',
    3: 'Хмарно',
    45: 'Туман',
    48: 'Паморозь',
    51: 'Легка мряка',
    53: 'Помірна мряка',
    55: 'Густа мряка',
    61: 'Невеликий дощ',
    63: 'Помірний дощ',
    65: 'Сильний дощ',
    71: 'Невеликий сніг',
    73: 'Помірний сніг',
    75: 'Сильний сніг',
    77: 'Снігові зерна',
    80: 'Злива',
    81: 'Сильна злива',
    82: 'Дуже сильна злива',
    85: 'Невеликий снігопад',
    86: 'Сильний снігопад',
    95: 'Гроза',
    96: 'Гроза з градом'
  };
  return descriptions[code] || 'Погодні умови';
}

async function fetchWeatherData(lat, lon, cityName) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Помилка завантаження даних');
    }

    const data = await response.json();
    displayCurrentWeather(data, cityName);
    displayForecast(data);
    saveToLocalStorage(data, cityName);
  } catch (error) {
    console.error(error);
    alert('Не вдалося отримати дані про погоду.');
  }
}

function displayCurrentWeather(data, cityName) {
  const current = data.current_weather;
  const weatherDesc = getWmoDescription(current.weathercode);

  document.getElementById('currentCity').textContent = cityName;
  document.getElementById('currentDate').textContent = current.time ? current.time.split('T')[0] : new Date().toISOString().split('T')[0];
  document.getElementById('currentTemp').textContent = `${Math.round(current.temperature)}°C`;
  document.getElementById('weatherDesc').textContent = weatherDesc;

  const maxTemp = data.daily ? data.daily.temperature_2m_max[0] : current.temperature;
  const minTemp = data.daily ? data.daily.temperature_2m_min[0] : current.temperature;
  const precip = data.daily ? data.daily.precipitation_sum[0] : 0;

  document.getElementById('tempRange').textContent = `${Math.round(maxTemp)}° / ${Math.round(minTemp)}°`;
  document.getElementById('windSpeed').textContent = `${current.windspeed} м/с`;
  document.getElementById('precipitation').textContent = `${precip} мм`;
  document.getElementById('wmoCode').textContent = current.weathercode;

  const category = getWeatherCategory(current.weathercode);
  currentCategory = category;

  initBgElements(category);
  startBgAnimation();
  startWidgetAnimation();
}

function displayForecast(data) {
  const forecastContainer = document.getElementById('forecastContainer');
  forecastContainer.innerHTML = '';

  if (!data.daily || !data.daily.time) return;

  const times = data.daily.time;

  times.forEach((date, index) => {
    const code = data.daily.weathercode[index];
    const maxTemp = data.daily.temperature_2m_max[index];
    const minTemp = data.daily.temperature_2m_min[index];
    const desc = getWmoDescription(code);
    const weatherCategory = getWeatherCategory(code);

    const card = document.createElement('div');
    card.className = 'forecast-card-item';
    if (index === 0) card.classList.add('active');
    card.dataset.date = date;

    card.innerHTML = `
      <div class="forecast-date-info">
        <span class="forecast-date">${date}</span>
        <span class="forecast-desc">${desc}</span>
      </div>
      <div class="forecast-temp">${Math.round(maxTemp)}° / ${Math.round(minTemp)}°</div>
      <div class="forecast-icon-container">
        <canvas class="forecast-canvas" width="40" height="40" data-category="${weatherCategory}"></canvas>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.forecast-card-item').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      displayDayDetails(data, index);
    });

    forecastContainer.appendChild(card);

    const miniCanvas = card.querySelector('.forecast-canvas');
    drawMiniIcon(miniCanvas, weatherCategory);
  });
}

function displayDayDetails(data, index) {
  const date = data.daily.time[index];
  const code = data.daily.weathercode[index];
  const maxTemp = data.daily.temperature_2m_max[index];
  const minTemp = data.daily.temperature_2m_min[index];
  const wind = data.daily.windspeed_10m_max[index];
  const precip = data.daily.precipitation_sum[index];

  document.getElementById('currentDate').textContent = date;
  document.getElementById('currentTemp').textContent = `${Math.round(maxTemp)}°C`;
  document.getElementById('weatherDesc').textContent = getWmoDescription(code);
  document.getElementById('tempRange').textContent = `${Math.round(maxTemp)}° / ${Math.round(minTemp)}°`;
  document.getElementById('windSpeed').textContent = `${wind} м/с`;
  document.getElementById('precipitation').textContent = `${precip} мм`;
  document.getElementById('wmoCode').textContent = code;

  const category = getWeatherCategory(code);
  currentCategory = category;

  initBgElements(category);
}

function getWeatherCategory(weatherCode) {
  if (weatherCode === 0 || weatherCode === 1) return 'sun';
  if (weatherCode === 2 || weatherCode === 3) return 'cloud';
  if (weatherCode >= 45 && weatherCode <= 48) return 'fog';
  if (weatherCode >= 51 && weatherCode <= 67) return 'rain';
  if (weatherCode >= 71 && weatherCode <= 77) return 'snow';
  if (weatherCode >= 80 && weatherCode <= 82) return 'rain';
  if (weatherCode >= 85 && weatherCode <= 86) return 'snow';
  if (weatherCode >= 95) return 'thunder';
  return 'cloud';
}

function startWidgetAnimation() {
  if (widgetAnimationId) cancelAnimationFrame(widgetAnimationId);

  function animate() {
    animAngle += 0.03;
    drawWidgetAnimation();
    widgetAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

function drawWidgetAnimation() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  switch (currentCategory) {
    case 'sun':
      drawSunWidget(ctx, canvas);
      break;
    case 'cloud':
      drawCloudsWidget(ctx, canvas);
      break;
    case 'rain':
      drawRainDropsWidget(ctx, canvas);
      break;
    case 'snow':
      drawSnowFlakesWidget(ctx, canvas);
      break;
    case 'fog':
      drawFogWidget(ctx, canvas);
      break;
    case 'thunder':
      drawThunderWidget(ctx, canvas);
      break;
  }

  drawCatCharacter(currentCategory);

  ctx.restore();
}

function drawSunWidget(targetCtx, targetCanvas) {
  const centerX = targetCanvas.width * 0.35;
  const centerY = targetCanvas.height * 0.4;
  const radius = 22;

  targetCtx.fillStyle = '#f59e0b';
  targetCtx.beginPath();
  targetCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.strokeStyle = '#fbbf24';
  targetCtx.lineWidth = 3.5;
  targetCtx.lineCap = 'round';

  const rayCount = 8;
  const rayLength = 10;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i * Math.PI * 2) / rayCount + animAngle * 0.5;
    const x1 = centerX + Math.cos(angle) * (radius + 4);
    const y1 = centerY + Math.sin(angle) * (radius + 4);
    const x2 = centerX + Math.cos(angle) * (radius + 4 + rayLength);
    const y2 = centerY + Math.sin(angle) * (radius + 4 + rayLength);

    targetCtx.beginPath();
    targetCtx.moveTo(x1, y1);
    targetCtx.lineTo(x2, y2);
    targetCtx.stroke();
  }
}

function drawCloudsWidget(targetCtx, targetCanvas) {
  const offsetX = Math.sin(animAngle) * 6;

  targetCtx.fillStyle = 'rgba(203, 213, 225, 0.85)';
  targetCtx.beginPath();
  targetCtx.arc(50 + offsetX, 50, 18, 0, Math.PI * 2);
  targetCtx.arc(70 + offsetX, 40, 24, 0, Math.PI * 2);
  targetCtx.arc(95 + offsetX, 50, 18, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  targetCtx.beginPath();
  targetCtx.arc(90 - offsetX, 75, 14, 0, Math.PI * 2);
  targetCtx.arc(110 - offsetX, 68, 18, 0, Math.PI * 2);
  targetCtx.arc(128 - offsetX, 75, 14, 0, Math.PI * 2);
  targetCtx.fill();
}

function drawRainDropsWidget(targetCtx, targetCanvas) {
  if (widgetRainDrops.length === 0) initWidgetParticles();

  targetCtx.strokeStyle = '#38bdf8';
  targetCtx.lineWidth = 1.5;

  widgetRainDrops.forEach(drop => {
    targetCtx.beginPath();
    targetCtx.moveTo(drop.x, drop.y);
    targetCtx.lineTo(drop.x - 0.5, drop.y + drop.length);
    targetCtx.stroke();

    drop.y += drop.speed;
    drop.x -= 0.2;

    if (drop.y > targetCanvas.height) {
      drop.y = -drop.length;
      drop.x = Math.random() * targetCanvas.width;
    }
  });
}

function drawSnowFlakesWidget(targetCtx, targetCanvas) {
  if (widgetSnowFlakes.length === 0) initWidgetParticles();

  targetCtx.fillStyle = '#ffffff';

  widgetSnowFlakes.forEach(flake => {
    targetCtx.beginPath();
    targetCtx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
    targetCtx.fill();

    flake.y += flake.speed;
    flake.x += Math.sin(animAngle + flake.y * 0.05) * 0.3;

    if (flake.y > targetCanvas.height) {
      flake.y = -5;
      flake.x = Math.random() * targetCanvas.width;
    }
  });
}

function drawFogWidget(targetCtx, targetCanvas) {
  targetCtx.fillStyle = 'rgba(226, 232, 240, 0.3)';
  for (let i = 0; i < 4; i++) {
    const y = 30 + i * 22;
    const wave = Math.sin(animAngle + i) * 12;

    targetCtx.beginPath();
    targetCtx.roundRect(20 + wave, y, 110, 10, 5);
    targetCtx.fill();
  }
}

function drawThunderWidget(targetCtx, targetCanvas) {
  drawRainDropsWidget(targetCtx, targetCanvas);

  if (Math.random() < 0.06) {
    targetCtx.strokeStyle = '#facc15';
    targetCtx.lineWidth = 2.5;
    targetCtx.beginPath();
    targetCtx.moveTo(70, 20);
    targetCtx.lineTo(55, 50);
    targetCtx.lineTo(68, 50);
    targetCtx.lineTo(50, 85);
    targetCtx.stroke();
  }
}

function drawCatCharacter(category) {
  if (!isCatLoaded) return;

  const imgWidth = 55;
  const imgHeight = 70;
  const catX = canvas.width - imgWidth - 10;
  let catY = canvas.height - imgHeight - 10;

  if (category === 'cloud') {
    const jump = Math.abs(Math.sin(animAngle * 4)) * 18;
    catY -= jump;
  }

  ctx.save();
  ctx.drawImage(catImage, catX, catY, imgWidth, imgHeight);

  if (category === 'sun') {
    const glassY = catY + 11;

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(catX + 14, glassY, 12, 7, 2);
    ctx.roundRect(catX + 28, glassY, 12, 7, 2);
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(catX + 25, glassY + 2);
    ctx.lineTo(catX + 29, glassY + 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(catX + 16, glassY + 1.5);
    ctx.lineTo(catX + 19, glassY + 5);
    ctx.moveTo(catX + 30, glassY + 1.5);
    ctx.lineTo(catX + 33, glassY + 5);
    ctx.stroke();
  }

  if (category === 'rain' || category === 'thunder') {
    const umbX = catX + imgWidth / 2;
    const umbY = catY - 15;
    const tilt = Math.sin(animAngle * 3) * 0.08;

    ctx.save();
    ctx.translate(umbX, umbY + 20);
    ctx.rotate(tilt);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 22);
    ctx.arc(-3, 22, 3, 0, Math.PI, false);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -18, 26, Math.PI, 0);
    ctx.fill();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(0, -18);
    ctx.moveTo(-13, -41);
    ctx.quadraticCurveTo(-8, -28, -10, -18);
    ctx.moveTo(13, -41);
    ctx.quadraticCurveTo(8, -28, 10, -18);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, -44, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  if (category === 'fog') {
    const binY = catY + 11;
    const leftEyeX = catX + 19;
    const rightEyeX = catX + 33;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(leftEyeX - 5, binY - 4, 10, 10, 2);
    ctx.roundRect(rightEyeX - 5, binY - 4, 10, 10, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(leftEyeX + 3, binY - 1, 5, 3);

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(leftEyeX, binY + 1, 3.5, 0, Math.PI * 2);
    ctx.arc(rightEyeX, binY + 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (category === 'snow') {
    const hatX = catX + 12;
    const hatY = catY - 2;

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.roundRect(hatX, hatY + 6, 31, 7, 3);
    ctx.fill();

    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(hatX + 15.5, hatY + 7, 13, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hatX + 15.5, hatY - 7, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawMiniIcon(miniCanvas, category) {
  if (!miniCanvas) return;
  const mCtx = miniCanvas.getContext('2d');
  mCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);

  if (category === 'sun') {
    mCtx.fillStyle = '#f59e0b';
    mCtx.beginPath();
    mCtx.arc(20, 20, 10, 0, Math.PI * 2);
    mCtx.fill();
  } else if (category === 'cloud') {
    mCtx.fillStyle = '#94a3b8';
    mCtx.beginPath();
    mCtx.arc(16, 22, 7, 0, Math.PI * 2);
    mCtx.arc(22, 18, 9, 0, Math.PI * 2);
    mCtx.arc(28, 22, 7, 0, Math.PI * 2);
    mCtx.fill();
  } else if (category === 'rain' || category === 'thunder') {
    mCtx.fillStyle = '#64748b';
    mCtx.beginPath();
    mCtx.arc(18, 16, 6, 0, Math.PI * 2);
    mCtx.arc(24, 14, 8, 0, Math.PI * 2);
    mCtx.fill();

    mCtx.strokeStyle = '#38bdf8';
    mCtx.lineWidth = 1.5;
    mCtx.beginPath();
    mCtx.moveTo(18, 24);
    mCtx.lineTo(16, 29);
    mCtx.moveTo(24, 24);
    mCtx.lineTo(22, 29);
    mCtx.stroke();
  } else if (category === 'snow') {
    mCtx.fillStyle = '#ffffff';
    mCtx.beginPath();
    mCtx.arc(15, 18, 2, 0, Math.PI * 2);
    mCtx.arc(24, 15, 2.5, 0, Math.PI * 2);
    mCtx.arc(20, 25, 2, 0, Math.PI * 2);
    mCtx.fill();
  } else {
    mCtx.fillStyle = '#cbd5e1';
    mCtx.fillRect(10, 16, 20, 3);
    mCtx.fillRect(13, 22, 14, 3);
  }
}

function initBgElements(category) {
  bgParticles = [];
  bgClouds = [];

  if (!bgCanvas) return;

  const width = bgCanvas.width;
  const height = bgCanvas.height;

  if (category === 'rain' || category === 'thunder') {
    const particleCount = Math.floor((width * height) / 8000);
    for (let i = 0; i < particleCount; i++) {
      bgParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: Math.random() * 4 + 4,
        length: Math.random() * 15 + 10
      });
    }
  } else if (category === 'snow') {
    const particleCount = Math.floor((width * height) / 6000);
    for (let i = 0; i < particleCount; i++) {
      bgParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: Math.random() * 1.2 + 0.8,
        size: Math.random() * 3 + 2
      });
    }
  }

  if (category === 'cloud' || category === 'rain' || category === 'snow' || category === 'thunder') {
    const cloudCount = Math.floor(width / 180) + 2;
    for (let i = 0; i < cloudCount; i++) {
      bgClouds.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.4),
        scale: Math.random() * 1.5 + 1.2,
        speed: Math.random() * 0.4 + 0.2
      });
    }
  }

  initWidgetParticles();
}

function startBgAnimation() {
  if (bgAnimationId) cancelAnimationFrame(bgAnimationId);

  function animate() {
    drawBgAnimation();
    bgAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

function drawBgAnimation() {
  if (!bgCtx || !bgCanvas) return;

  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

  if (currentCategory === 'sun') {
    drawBgSun(bgCtx, bgCanvas);
  } else if (currentCategory === 'fog') {
    drawBgFog(bgCtx, bgCanvas);
  } else if (currentCategory === 'rain' || currentCategory === 'thunder') {
    bgCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    bgCtx.lineWidth = 1.2;

    bgParticles.forEach(p => {
      bgCtx.beginPath();
      bgCtx.moveTo(p.x, p.y);
      bgCtx.lineTo(p.x - 2, p.y + p.length);
      bgCtx.stroke();

      p.y += p.speed;
      p.x -= 0.5;

      if (p.y > bgCanvas.height) {
        p.y = -p.length;
        p.x = Math.random() * bgCanvas.width;
      }
    });
  } else if (currentCategory === 'snow') {
    bgCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';

    bgParticles.forEach(p => {
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      bgCtx.fill();

      p.y += p.speed;
      p.x += Math.sin(animAngle + p.y * 0.01) * 0.5;

      if (p.y > bgCanvas.height) {
        p.y = -5;
        p.x = Math.random() * bgCanvas.width;
      }
    });
  }

  bgClouds.forEach(c => {
    bgCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    bgCtx.beginPath();
    bgCtx.arc(c.x, c.y, 30 * c.scale, 0, Math.PI * 2);
    bgCtx.arc(c.x + 25 * c.scale, c.y - 10 * c.scale, 40 * c.scale, 0, Math.PI * 2);
    bgCtx.arc(c.x + 60 * c.scale, c.y, 30 * c.scale, 0, Math.PI * 2);
    bgCtx.fill();

    c.x += c.speed;
    if (c.x - 100 * c.scale > bgCanvas.width) {
      c.x = -100 * c.scale;
    }
  });
}

function drawBgSun(targetCtx, targetCanvas) {
  const centerX = targetCanvas.width * 0.85;
  const centerY = targetCanvas.height * 0.2;
  const radius = Math.min(targetCanvas.width, targetCanvas.height) * 0.08;

  targetCtx.save();

  const gradient = targetCtx.createRadialGradient(
    centerX, centerY, radius * 0.5,
    centerX, centerY, radius * 2.5
  );
  gradient.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
  gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');

  targetCtx.fillStyle = gradient;
  targetCtx.beginPath();
  targetCtx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.fillStyle = '#f59e0b';
  targetCtx.beginPath();
  targetCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
  targetCtx.lineWidth = 4;
  targetCtx.lineCap = 'round';

  const rayCount = 12;
  const rayLength = radius * 0.4;

  for (let i = 0; i < rayCount; i++) {
    const angle = (i * Math.PI * 2) / rayCount + animAngle * 0.2;
    const x1 = centerX + Math.cos(angle) * (radius + 10);
    const y1 = centerY + Math.sin(angle) * (radius + 10);
    const x2 = centerX + Math.cos(angle) * (radius + 10 + rayLength);
    const y2 = centerY + Math.sin(angle) * (radius + 10 + rayLength);

    targetCtx.beginPath();
    targetCtx.moveTo(x1, y1);
    targetCtx.lineTo(x2, y2);
    targetCtx.stroke();
  }

  targetCtx.restore();
}

function drawBgFog(targetCtx, targetCanvas) {
  targetCtx.save();
  targetCtx.fillStyle = 'rgba(226, 232, 240, 0.08)';

  const bands = 6;
  const bandHeight = targetCanvas.height / bands;

  for (let i = 0; i < bands; i++) {
    const y = i * bandHeight + 30;
    const wave = Math.sin(animAngle * 0.8 + i) * 30;

    targetCtx.beginPath();
    targetCtx.roundRect(
      -50 + wave,
      y,
      targetCanvas.width + 100,
      bandHeight * 0.6,
      20
    );
    targetCtx.fill();
  }

  targetCtx.restore();
}

function saveToLocalStorage(data, cityName) {
  const payload = {
    cityName,
    data,
    timestamp: new Date().getTime()
  };
  localStorage.setItem('weather_catboard_data', JSON.stringify(payload));
}

function loadSavedData() {
  const saved = localStorage.getItem('weather_catboard_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.data && parsed.data.latitude) {
        selectedCityData = {
          lat: parsed.data.latitude,
          lon: parsed.data.longitude,
          name: parsed.cityName
        };
        displayCurrentWeather(parsed.data, parsed.cityName);
        displayForecast(parsed.data);
      } else {
        localStorage.removeItem('weather_catboard_data');
      }
    } catch (e) {
      console.error('Помилка зчитування з localStorage', e);
      localStorage.removeItem('weather_catboard_data');
    }
  }
}