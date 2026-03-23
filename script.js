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

        const name =
    g.address.city ||
    g.address.town ||
    g.address.village ||
    "";

const state = g.address.state || "";
const country = g.address.country || "";

fetchWeather(lat, lon, `${name}, ${state}, ${country}`);
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
    borderColor: "#fbbc04",
    backgroundColor: gradient,
    fill: true,
    tension: 0.4,
    pointRadius: 4,
    pointBackgroundColor: "#fbbc04",
    pointHoverRadius: 6
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
        callbacks: {
            label: (ctx) => ctx.raw + "°C"
        }
    }
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
    <img src="${getIcon(data.daily.weathercode[i])}" />
    <p>${Math.round(data.daily.temperature_2m_max[i])}°</p>
    <small>${Math.round(data.daily.temperature_2m_min[i])}°</small>
`;

        container.appendChild(div);
    });
}

// 🌤 ICONS
function getIcon(code) {
    if (code === 0) 
        return "https://cdn-icons-png.flaticon.com/512/869/869869.png"; // sun

    if (code >= 1 && code <= 3) 
        return "https://cdn-icons-png.flaticon.com/512/414/414825.png"; // cloud

    if (code >= 45 && code <= 48) 
        return "https://cdn-icons-png.flaticon.com/512/4005/4005901.png"; // fog

    if (code >= 51 && code <= 67) 
        return "https://cdn-icons-png.flaticon.com/512/1163/1163624.png"; // rain

    if (code >= 71 && code <= 77) 
        return "https://cdn-icons-png.flaticon.com/512/642/642102.png"; // snow

    if (code >= 80) 
        return "https://cdn-icons-png.flaticon.com/512/1163/1163624.png"; // rain

    return "https://cdn-icons-png.flaticon.com/512/869/869869.png";
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

function setDynamicBackground(condition) {
    const body = document.body;

    if (condition.includes("clear")) {
        body.style.background = "linear-gradient(to top, #fceabb, #f8b500)";
        body.style.color = "#222";
    } 
    else if (condition.includes("cloud")) {
        body.style.background = "linear-gradient(to top, #d7d2cc, #304352)";
        body.style.color = "white";
    } 
    else if (condition.includes("rain")) {
        body.style.background = "linear-gradient(to top, #4b79a1, #283e51)";
        body.style.color = "white";
    } 
    else {
        body.style.background = "#111";
        body.style.color = "white";
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
