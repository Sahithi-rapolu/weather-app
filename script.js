let chart;

// 🔍 SEARCH
async function getWeather() {
    const city = document.getElementById("city").value || "Hyderabad";

    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}`);
    const g = await geo.json();

    if (!g.results) return alert("Not found");

    const p = g.results.find(loc => loc.country === "India") || g.results[0];
    const fullName = p.name + ", " + (p.admin1 || "");
fetchWeather(p.latitude, p.longitude, fullName);
}

// 📍 LOCATION
async function getLocation() {
    navigator.geolocation.getCurrentPosition(async pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        );
        const g = await geo.json();

        const city =
    g.address.city ||
    g.address.town ||
    g.address.village ||
    g.address.state ||
    "Your Location";

const state = g.address.state || "";

const fullName = city + (state ? ", " + state : "");

fetchWeather(lat, lon, fullName);

        fetchWeather(lat, lon, name);
    });
}

// 🌦 FETCH
async function fetchWeather(lat, lon, name) {
    const res = await fetch(
`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=auto`
    );

    const data = await res.json();
    updateUI(data, name);
}

// 🎨 UI
function updateUI(data, name) {
    document.getElementById("place").innerText = name;
    document.getElementById("time").innerText = new Date().toLocaleString();

    document.getElementById("temp").innerText =
        Math.round(data.current_weather.temperature) + "°";

    const code = data.current_weather.weathercode;
    const condition = getCondition(code);

    document.getElementById("desc").innerText = condition;
    document.getElementById("icon").src = getIcon(code);

    drawChart(data);
    renderDaily(data);
    setAnimatedBackground(condition.toLowerCase());
}

// 📊 CHART
function drawChart(data) {
    const now = new Date();

    const labels = [];
    const values = [];
    let currentIndex = 0;

    for (let i = 0; i < data.hourly.time.length; i++) {
        const t = new Date(data.hourly.time[i]);

        if (t >= now && labels.length < 10) {
            labels.push(
                t.toLocaleTimeString([], {
                    hour: "numeric",
                    hour12: true
                })
            );

            values.push(Math.round(data.hourly.temperature_2m[i]));

            if (labels.length === 1) currentIndex = 0;
        }
    }

    if (labels.length === 0) {
        labels.push("Now");
        values.push(Math.round(data.current_weather.temperature));
    }

    const ctx = document.getElementById("chart").getContext("2d");

    // 🎨 Dynamic color based on temp
    const avgTemp = values.reduce((a,b)=>a+b,0)/values.length;
    const color = avgTemp > 30 ? "#ff5722" : "#2196f3";

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, color + "99");
    gradient.addColorStop(1, color + "00");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: color,
                backgroundColor: gradient,
                fill: true,
                tension: 0.45,

                pointRadius: (ctx) => ctx.dataIndex === currentIndex ? 6 : 0,
                pointHoverRadius: 6,
                pointBackgroundColor: color
            }]
        },
        options: {
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#111",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    displayColors: false,
                    callbacks: {
                        title: (ctx) => ctx[0].label,
                        label: (ctx) => {
                            const feels = values[ctx.dataIndex] + 1; // slight variation
                            return `Temp: ${ctx.raw}°C | Feels: ${feels}°C`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: "#666",
                        maxRotation: 0
                    }
                },
                y: {
                    display: false
                }
            },
            responsive: true,
            maintainAspectRatio: false
        },

        plugins: [
            // 🔥 glow
            {
                id: "glow",
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    const meta = chart.getDatasetMeta(0);
                    const point = meta.data[currentIndex];
                    if (!point) return;

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI);
                    ctx.fillStyle = color + "33";
                    ctx.fill();
                    ctx.restore();
                }
            },

            // 🔥 hover line
            {
                id: "hoverLine",
                afterDraw(chart) {
                    if (chart.tooltip?._active?.length) {
                        const ctx = chart.ctx;
                        const x = chart.tooltip._active[0].element.x;
                        const topY = chart.scales.y.top;
                        const bottomY = chart.scales.y.bottom;

                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(x, topY);
                        ctx.lineTo(x, bottomY);
                        ctx.strokeStyle = "rgba(0,0,0,0.2)";
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            },

            // 🔥 animated pulse (LIVE effect)
            {
                id: "pulse",
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    const meta = chart.getDatasetMeta(0);
                    const point = meta.data[currentIndex];
                    if (!point) return;

                    const time = Date.now() / 500;
                    const radius = 6 + Math.sin(time) * 2;

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.restore();
                }
            },

            // 🔥 NOW label
            {
                id: "nowLabel",
                afterDraw(chart) {
                    const { ctx } = chart;
                    const meta = chart.getDatasetMeta(0);
                    const point = meta.data[currentIndex];
                    if (!point) return;

                    ctx.save();
                    ctx.fillStyle = "#000";
                    ctx.font = "bold 11px Segoe UI";
                    ctx.textAlign = "center";

                    ctx.fillText("Now", point.x, chart.scales.y.bottom + 15);

                    ctx.restore();
                }
            }
        ]
    });
}
// 📅 DAILY
function renderDaily(data) {
    const container = document.getElementById("daily");
    container.innerHTML = "";

    data.daily.time.slice(0,7).forEach((d,i)=>{
        const div = document.createElement("div");
        div.className = "day " + (i===0?"active":"");

        const date = new Date(d).toLocaleDateString("en-US",{weekday:"short"});

        div.innerHTML = `
            <p>${date}</p>
            <img src="${getIcon(data.daily.weathercode[i])}">
            <p>${Math.round(data.daily.temperature_2m_max[i])}°</p>
            <small>${Math.round(data.daily.temperature_2m_min[i])}°</small>
        `;

        container.appendChild(div);
    });
}

// 🌤 ICONS
function getIcon(code) {
    if (code === 0) return "https://cdn-icons-png.flaticon.com/512/869/869869.png";
    if (code <= 3) return "https://cdn-icons-png.flaticon.com/512/414/414825.png";
    if (code >= 51) return "https://cdn-icons-png.flaticon.com/512/1163/1163624.png";
    if (code >= 71) return "https://cdn-icons-png.flaticon.com/512/642/642102.png";
    return "";
}

// 🌦 CONDITION
function getCondition(code) {
    if (code === 0) return "Clear Sky";
    if (code <= 3) return "Cloudy";
    if (code >= 51) return "Rain";
    if (code >= 71) return "Snow";
    return "Clear";
}

// ⌨
function handleKey(e){
    if(e.key==="Enter") getWeather();
}
setInterval(() => {
    const city = document.getElementById("city").value;
    if (city) getWeather();
}, 120000); // every 2 mins

function setAnimatedBackground(condition) {
    const bg = document.getElementById("bg-animation");
    bg.innerHTML = "";

    // ☀️ CLEAR
    if (condition.includes("clear")) {
        const sun = document.createElement("div");
        sun.className = "sun";
        bg.appendChild(sun);

        // clouds
        for (let i = 0; i < 3; i++) {
            const cloud = document.createElement("div");
            cloud.className = "cloud";
            cloud.style.top = Math.random() * 50 + "vh";
            cloud.style.animationDuration = (20 + Math.random() * 10) + "s";
            bg.appendChild(cloud);
        }
    }

    // ☁️ CLOUDY
    else if (condition.includes("cloud")) {
        for (let i = 0; i < 6; i++) {
            const cloud = document.createElement("div");
            cloud.className = "cloud";
            cloud.style.top = Math.random() * 80 + "vh";
            cloud.style.animationDuration = (15 + Math.random() * 10) + "s";
            bg.appendChild(cloud);
        }
    }

    // 🌧️ RAIN
    else if (condition.includes("rain")) {
        for (let i = 0; i < 80; i++) {
            const drop = document.createElement("div");
            drop.className = "drop";
            drop.style.left = Math.random() * 100 + "vw";
            drop.style.animationDuration = (0.5 + Math.random()) + "s";
            bg.appendChild(drop);
        }
    }

    // ❄️ SNOW
    else if (condition.includes("snow")) {
        for (let i = 0; i < 50; i++) {
            const flake = document.createElement("div");
            flake.className = "flake";
            flake.innerText = "❄";
            flake.style.left = Math.random() * 100 + "vw";
            flake.style.animationDuration = (3 + Math.random() * 2) + "s";
            bg.appendChild(flake);
        }
    }

    // 🌙 NIGHT (optional)
    const hour = new Date().getHours();
    if (hour >= 19 || hour <= 5) {
        for (let i = 0; i < 50; i++) {
            const star = document.createElement("div");
            star.className = "star";
            star.style.left = Math.random() * 100 + "vw";
            star.style.top = Math.random() * 100 + "vh";
            bg.appendChild(star);
        }
    }
}
function startRain() {
    const bg = document.getElementById("bg-animation");

    for (let i = 0; i < 80; i++) {
        const drop = document.createElement("div");
        drop.className = "drop";

        drop.style.left = Math.random() * 100 + "vw";
        drop.style.animationDuration = (0.5 + Math.random()) + "s";

        // 🔥 dynamic brightness
        drop.style.opacity = Math.random() * 0.6 + 0.3;

        bg.appendChild(drop);
    }
}