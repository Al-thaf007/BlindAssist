let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;

let lastState = "";
let lastSpokenTime = 0;

// 🔊 Speak
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
    document.getElementById("statusText").innerText = "Action: " + text;
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
        speak("Model failed");
    }
}

// ==========================
// 📷 Start Camera (FIXED)
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

    } catch (err) {
        console.error(err);
        speak("Camera permission denied");
    }
}

// ==========================
// 🛑 Stop Camera
// ==========================
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    cameraOn = false;
    detecting = false;

    updateStatus("Camera stopped");
    speak("Camera stopped");
}

// ==========================
// 🚧 DETECTION (IMPROVED)
// ==========================
function startDetection() {
    if (!model) return;

    const video = document.getElementById("camera");
    detecting = true;

    updateStatus("Detection running");

    setInterval(async () => {
        if (!detecting || !cameraOn) return;

        const predictions = await model.detect(video);

        let foundObstacle = false;

        predictions.forEach(p => {
            const [x, y, w, h] = p.bbox;

            let centerX = x + w / 2;
            let vw = video.videoWidth;

            // 🎯 Center detection
            if (
                centerX > vw * 0.25 &&
                centerX < vw * 0.75 &&
                p.score > 0.4
            ) {
                foundObstacle = true;
            }

            // 🔥 CLOSE OBJECT (big bounding box)
            if (w > vw * 0.5) {
                foundObstacle = true;
            }
        });

        // 🔄 State change
        if (foundObstacle && lastState !== "obstacle") {
            lastState = "obstacle";
            updateStatus("Obstacle ahead");
            speak("Obstacle ahead");
        }
        else if (!foundObstacle && lastState !== "clear") {
            lastState = "clear";
            updateStatus("Path clear");
            speak("Path clear");
        }

    }, 1500);
}

// ==========================
// 🎤 Voice
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

            if (text.includes("start camera")) startCamera();

            else if (
                text.includes("stop camera") ||
                text.includes("camera off")
            ) stopCamera();

            else if (text.includes("location")) getLocation();

            else {
                updateStatus("Not recognized");
                speak("Command not recognized");
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
// 📍 Location
// ==========================
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        speak("Latitude " + pos.coords.latitude);
    });
}

// ==========================
// TOUCH + MOUSE (FIXED)
// ==========================
document.body.addEventListener("touchstart", () => {
    if (!cameraOn) startCamera(); // 🔥 FIX
    startVoice();
}, { passive: true });

document.body.addEventListener("touchend", () => stopVoiceSafe());

document.body.addEventListener("mousedown", () => {
    if (!cameraOn) startCamera();
    startVoice();
});

document.body.addEventListener("mouseup", () => stopVoiceSafe());

// ==========================
// INIT
// ==========================
window.onload = function () {
    speak("Hold and speak");
    loadModel();
};