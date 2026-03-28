let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;

// 🔊 Speak (no overlap)
function speak(text) {
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
// 📷 Start Camera
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
        speak("Camera stopped");
    }
}

// ==========================
// 🚧 Object Detection
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

            // 🎯 Check if object is in center area
            let centerX = x + width / 2;

            let videoWidth = video.videoWidth;

            if (
                centerX > videoWidth * 0.3 &&
                centerX < videoWidth * 0.7 &&
                p.score > 0.6
            ) {
                foundObstacle = true;
            }
        });

        if (foundObstacle) {
            speak("Obstacle ahead");
        }

    }, 2000); // check every 2 seconds
}

// ==========================
// 🎤 Voice Control
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

            if (!last.isFinal) return;
            if (confidence < 0.2) return;

            speak("You said " + transcript);

            if (transcript.includes("start camera")) startCamera();
            else if (transcript.includes("stop camera")) stopCamera();
            else if (transcript.includes("location")) getLocation();
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
document.body.addEventListener("mousedown", () => startVoice());
document.body.addEventListener("mouseup", () => stopVoiceSafe());

// ==========================
// INIT
// ==========================
window.onload = function () {
    speak("Hold and speak your command");
};