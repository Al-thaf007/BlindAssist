let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;

let lastState = "";
let lastSpokenTime = 0;
let cameraInitialized = false; // 🔥 important

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
// 🤖 Load Model
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
// 📷 Start Camera (FIXED FOR MOBILE)
// ==========================
async function startCameraDirect() {
    if (cameraInitialized) return;

    try {
        const video = document.getElementById("camera");

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = stream;
        await video.play();

        cameraOn = true;
        cameraInitialized = true;

        updateStatus("Camera ready");
        speak("Camera ready");

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
    cameraInitialized = false;

    updateStatus("Camera stopped");
    speak("Camera stopped");
}

// ==========================
// 🚧 Detection (40cm approx)
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

            // 🎯 center zone
            let inCenter =
                centerX > vw * 0.3 &&
                centerX < vw * 0.7;

            // 🔥 simulate ~40cm (big object = near)
            let isNear = w > vw * 0.4;

            if ((inCenter && p.score > 0.5) || isNear) {
                foundObstacle = true;
            }
        });

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

    }, 1200);
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

            if (
                text.includes("stop camera") ||
                text.includes("camera off")
            ) stopCamera();

            else if (text.includes("location")) getLocation();

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
// 📍 Location
// ==========================
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        speak("Latitude " + pos.coords.latitude);
    });
}

// ==========================
// TOUCH (🔥 CRITICAL FIX)
// ==========================
document.body.addEventListener("touchstart", () => {
    startCameraDirect(); // 🔥 MUST be first
    startVoice();
}, { passive: true });

document.body.addEventListener("touchend", () => stopVoiceSafe());

// ==========================
// MOUSE (Laptop)
// ==========================
document.body.addEventListener("mousedown", () => {
    startCameraDirect();
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