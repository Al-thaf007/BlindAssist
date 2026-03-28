let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;

// 🔊 Speak (always speak, no blocking)
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}

// 🧠 Debug update
function updateStatus(text) {
    console.log("STATUS:", text);
    const el = document.getElementById("statusText");
    if (el) el.innerText = "Action: " + text;
}

// ==========================
// 🤖 LOAD MODEL (DEBUG HEAVY)
// ==========================
async function loadModel() {
    try {
        updateStatus("Loading AI...");
        speak("Loading AI model");

        // 🔍 CHECK IF LIB LOADED
        if (typeof cocoSsd === "undefined") {
            updateStatus("cocoSSD not loaded");
            speak("AI library not loaded");
            return;
        }

        model = await cocoSsd.load();

        updateStatus("Detection ready");
        speak("Detection ready");

        console.log("✅ MODEL SUCCESS");

    } catch (e) {
        console.error("MODEL ERROR:", e);
        updateStatus("Model failed");
        speak("Model failed to load");
    }
}

// ==========================
// 📷 Start Camera
// ==========================
async function startCamera() {
    if (cameraOn) return;

    try {
        const video = document.getElementById("camera");

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();

            cameraOn = true;
            speak("Camera started");
            updateStatus("Camera started");

            if (model) {
                startDetection();
            } else {
                speak("Model not ready");
            }
        };

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
        cameraOn = false;
        detecting = false;

        speak("Camera stopped");
        updateStatus("Camera stopped");
    }
}

// ==========================
// 🚧 DETECTION
// ==========================
function startDetection() {
    if (!model) {
        updateStatus("Model missing");
        speak("Model missing");
        return;
    }

    const video = document.getElementById("camera");
    detecting = true;

    updateStatus("Detection running");
    console.log("🚀 Detection started");

    setInterval(async () => {
        if (!detecting || !cameraOn) return;

        try {
            const predictions = await model.detect(video);

            console.log("Objects:", predictions);

            let found = false;

            predictions.forEach(p => {
                const [x, y, w, h] = p.bbox;

                let centerX = x + w / 2;
                let vw = video.videoWidth;

                if (
                    centerX > vw * 0.3 &&
                    centerX < vw * 0.7 &&
                    p.score > 0.5
                ) {
                    found = true;
                }
            });

            if (found) {
                updateStatus("Obstacle ahead");
                speak("Obstacle ahead");
            }

        } catch (err) {
            console.error("Detection error:", err);
            speak("Detection error");
        }

    }, 2000);
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
            else if (text.includes("stop camera")) stopCamera();
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
    speak("System starting");
    loadModel();
};