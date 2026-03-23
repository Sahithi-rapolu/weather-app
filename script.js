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
    setDynamicBackground(condition.toLowerCase());
}

// 📊 CHART (FINAL PREMIUM)
function drawChart(data) {
    const now = new Date();

    const labels = [];
    const values = [];

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
        }
    }

    if (labels.length === 0) {
        labels.push("Now");
        values.push(Math.round(data.current_weather.temperature));
    }

    const ctx = document.getElementById("chart").getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, "rgba(251,188,4,0.5)");
    gradient.addColorStop(1, "rgba(251,188,4,0)");

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
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: "#fbbc04"
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
                        label: ctx => ctx.raw + "°C"
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "#666" }
                },
                y: { display: false }
            },
            responsive: true,
            maintainAspectRatio: false
        }
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

        const icon = getIcon(data.daily.weathercode[i]) ||
        "https://cdn-icons-png.flaticon.com/512/869/869869.png";

        div.innerHTML = `
            <p>${date}</p>
            <img src="${icon}" />
            <p>${Math.round(data.daily.temperature_2m_max[i])}°</p>
            <small>${Math.round(data.daily.temperature_2m_min[i])}°</small>
        `;

        container.appendChild(div);
    });
}

// 🌤 ICONS (FIXED)
function getIcon(code) {
    if (code === 0) return "https://cdn-icons-png.flaticon.com/512/869/869869.png";
    if (code <= 3) return "https://cdn-icons-png.flaticon.com/512/414/414825.png";
    if (code >= 45 && code <= 48) return "https://cdn-icons-png.flaticon.com/512/4005/4005901.png";
    if (code >= 51 && code <= 67) return "https://cdn-icons-png.flaticon.com/512/1163/1163624.png";
    if (code >= 71 && code <= 77) return "https://cdn-icons-png.flaticon.com/512/642/642102.png";
    if (code >= 80) return "https://cdn-icons-png.flaticon.com/512/1163/1163624.png";
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

// ⌨ ENTER
function handleKey(e){
    if(e.key==="Enter") getWeather();
}

// 🌈 BACKGROUND
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
