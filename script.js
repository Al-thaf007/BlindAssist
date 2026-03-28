let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;
let lastSpokenTime = 0;

// 🔊 Speak (no overlap)
function speak(text) {
    const now = Date.now();

    // ⏱️ prevent spam (3 sec cooldown)
    if (now - lastSpokenTime < 3000) return;

    lastSpokenTime = now;

    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}

// ==========================
// 🤖 Load AI Model
// ==========================
async function loadModel() {
    model = await cocoSsd.load();
    console.log("AI Model Loaded");
}

// ==========================
// 📷 Start Camera (BACK)
// ==========================
async function startCamera() {
    if (cameraOn) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        const video = document.getElementById("camera");
        video.srcObject = stream;

        cameraOn = true;
        updateStatus("Camera started");
        speak("Camera started");

        startDetection();

    } catch {
        speak("Camera permission denied");
    }
}

// 🛑 Stop Camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraOn = false;
        detecting = false;

        updateStatus("Camera stopped");
        speak("Camera stopped");
    }
}

// ==========================
// 🚧 SMART DETECTION
// ==========================
async function startDetection() {
    if (!model) await loadModel();

    const video = document.getElementById("camera");
    detecting = true;

    setInterval(async () => {
        if (!detecting || !cameraOn) return;

        const predictions = await model.detect(video);

        let foundObstacle = false;

        predictions.forEach(p => {
            const [x, y, width, height] = p.bbox;

            let centerX = x + width / 2;
            let videoWidth = video.videoWidth;

            // 🎯 FRONT ZONE (middle 40%)
            if (
                centerX > videoWidth * 0.3 &&
                centerX < videoWidth * 0.7 &&
                p.score > 0.6 &&
                width > videoWidth * 0.1 // ignore tiny objects
            ) {
                foundObstacle = true;
            }
        });

        if (foundObstacle) {
            updateStatus("Obstacle ahead");
            speak("Obstacle ahead");
        }

    }, 2000); // every 2 sec
}

// ==========================
// 🧠 DEBUG STATUS
// ==========================
function updateStatus(text) {
    const el = document.getElementById("statusText");
    if (el) el.innerText = "Action: " + text;
}

// ==========================
// 🎤 VOICE CONTROL
// ==========================
function startVoice() {
    if (isListening) return;

    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = function (event) {
            let last = event.results[event.results.length - 1];
            let transcript = last[0].transcript.toLowerCase().trim();
            let confidence = last[0].confidence;

            document.getElementById("heardText").innerText = "You said: " + transcript;
            document.getElementById("confidenceText").innerText = "Confidence: " + confidence.toFixed(2);

            if (!last.isFinal) return;
            if (confidence < 0.2) return;

            speak("You said " + transcript);

            // START CAMERA
            if (
                transcript.includes("start camera") ||
                transcript.includes("open camera")
            ) {
                updateStatus("Starting Camera");
                startCamera();
            }

            // STOP CAMERA
            else if (
                transcript.includes("stop camera") ||
                transcript.includes("camera off") ||
                transcript.includes("turn off camera")
            ) {
                updateStatus("Stopping Camera");
                stopCamera();
            }

            // LOCATION
            else if (transcript.includes("location")) {
                updateStatus("Getting Location");
                getLocation();
            }

            else {
                updateStatus("Not recognized");
                speak("Command not recognized");
            }
        };

        recognition.onerror = function () {
            stopVoiceSafe();
        };

        recognition.start();
        isListening = true;

    } catch {
        speak("Microphone not supported");
    }
}

// 🛑 Stop Voice
function stopVoiceSafe() {
    if (recognition) {
        try { recognition.stop(); } catch { }
        recognition = null;
    }
    isListening = false;
}

// 📍 Location
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        speak("Your location is latitude " + pos.coords.latitude);
    });
}

// ==========================
// TOUCH + MOUSE
// ==========================
document.body.addEventListener("touchstart", () => startVoice(), { passive: true });
document.body.addEventListener("touchend", () => stopVoiceSafe());
document.body.addEventListener("touchcancel", () => stopVoiceSafe());
document.body.addEventListener("touchmove", () => stopVoiceSafe());

document.body.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startVoice();
});
document.body.addEventListener("mouseup", () => stopVoiceSafe());
document.body.addEventListener("mouseleave", () => stopVoiceSafe());

// ==========================
// INIT
// ==========================
window.onload = function () {
    speak("Hold and speak your command");
};