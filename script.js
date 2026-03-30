let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;

let lastSpokenTime = 0;

// 🔊 Speak (cooldown)
function speak(text) {
    const now = Date.now();
    if (now - lastSpokenTime < 2000) return;

    lastSpokenTime = now;

    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}

// 🧠 Debug
function updateStatus(text) {
    console.log("STATUS:", text);
    const el = document.getElementById("statusText");
    if (el) el.innerText = "Action: " + text;
}

// ==========================
// 🤖 LOAD MODEL
// ==========================
async function loadModel() {
    try {
        updateStatus("Loading AI...");
        speak("Loading AI");

        model = await cocoSsd.load();

        updateStatus("Detection ready");
        speak("Detection ready");

    } catch {
        updateStatus("Model failed");
        speak("Model failed");
    }
}

// ==========================
// 📷 START CAMERA
// ==========================
async function startCamera() {
    if (cameraOn) return;

    try {
        const video = document.getElementById("camera");

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = stream;
        await video.play();

        cameraOn = true;
        updateStatus("Camera started");
        speak("Camera started");

        if (model) startDetection();

    } catch {
        speak("Camera permission denied");
    }
}

// ==========================
// 🛑 STOP CAMERA
// ==========================
function stopCamera() {
    if (!cameraOn) return;

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    cameraOn = false;
    detecting = false;

    updateStatus("Camera stopped");
    speak("Camera stopped");
}

// ==========================
// 🚧 SMART DETECTION
// ==========================
function startDetection() {
    if (!model) return;

    const video = document.getElementById("camera");
    detecting = true;

    let currentStableState = "";
    let lastDetectedState = "";
    let stableCount = 0;

    updateStatus("Detection running");

    setInterval(async () => {
        if (!detecting || !cameraOn) return;

        const predictions = await model.detect(video);

        let foundObstacle = false;

        predictions.forEach(p => {
            const [x, y, w, h] = p.bbox;

            let vw = video.videoWidth;
            let centerX = x + w / 2;
            let sizeRatio = w / vw;

            // 🎯 center OR near object
            if (
                (centerX > vw * 0.3 && centerX < vw * 0.7 && p.score > 0.5)
                || sizeRatio > 0.4
            ) {
                foundObstacle = true;
            }
        });

        let detectedState = foundObstacle ? "obstacle" : "clear";

        // 🔥 stability check
        if (detectedState === lastDetectedState) {
            stableCount++;
        } else {
            stableCount = 0;
        }

        lastDetectedState = detectedState;

        if (stableCount >= 2 && detectedState !== currentStableState) {
            currentStableState = detectedState;

            if (detectedState === "obstacle") {
                updateStatus("Obstacle ahead");
                speak("Obstacle ahead");
            } else {
                updateStatus("Path clear");
                speak("Path clear");
            }
        }

    }, 1000);
}

// ==========================
// 🎤 VOICE
// ==========================
function startVoice() {
    if (isListening) return;

    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;

        recognition.onresult = function (event) {
            let text = event.results[event.results.length - 1][0].transcript.toLowerCase();

            document.getElementById("heardText").innerText = "You said: " + text;

            speak("You said " + text);

            if (
                text.includes("start camera") ||
                text.includes("open camera")
            ) {
                startCamera();
            }

            else if (
                text.includes("stop camera") ||
                text.includes("camera off")
            ) {
                stopCamera();
            }

            else if (text.includes("location")) {
                getLocation();
            }

            else {
                updateStatus("Listening");
            }
        };

        recognition.start();
        isListening = true;

    } catch {
        speak("Microphone not supported");
    }
}

// ==========================
// STOP VOICE
// ==========================
function stopVoiceSafe() {
    if (recognition) {
        try { recognition.stop(); } catch { }
        recognition = null;
    }
    isListening = false;
}

// ==========================
// 📍 LOCATION (LAT + LON)
// ==========================
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        let lat = pos.coords.latitude;
        let lon = pos.coords.longitude;

        updateStatus("Location fetched");

        speak("Your location is latitude " + lat + " and longitude " + lon);
    }, () => {
        speak("Location access denied");
    });
}

// ==========================
// TOUCH (MOBILE FIX)
// ==========================
document.body.addEventListener("touchstart", async () => {
    if (!cameraOn) {
        await startCamera(); // 🔥 required for mobile
    }
    startVoice();
}, { passive: true });

document.body.addEventListener("touchend", () => stopVoiceSafe());

// ==========================
// MOUSE (LAPTOP)
// ==========================
document.body.addEventListener("mousedown", async () => {
    if (!cameraOn) {
        await startCamera();
    }
    startVoice();
});

document.body.addEventListener("mouseup", () => stopVoiceSafe());

// ==========================
// INIT
// ==========================
window.onload = function () {
    speak("Touch and hold to use");
    loadModel();
};