let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;
let lastSpokenTime = 0;

// 🔊 Speak (no overlap + cooldown)
function speak(text) {
    const now = Date.now();
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
    try {
        model = await cocoSsd.load();
        console.log("✅ Model Loaded");
        speak("Detection ready");
    } catch (e) {
        console.error("Model load failed", e);
    }
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

        // 🔥 WAIT until video is ready
        video.onloadeddata = async () => {
            cameraOn = true;
            speak("Camera started");

            await loadModel();   // ensure model loads
            startDetection();    // start detection AFTER ready
        };

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
// 🚧 DETECTION LOOP
// ==========================
async function startDetection() {
    if (!model) {
        console.log("❌ Model not ready");
        return;
    }

    const video = document.getElementById("camera");
    detecting = true;

    console.log("🚀 Detection started");

    setInterval(async () => {
        if (!detecting || !cameraOn) return;

        try {
            const predictions = await model.detect(video);

            console.log("Objects:", predictions);

            let foundObstacle = false;

            predictions.forEach(p => {
                const [x, y, width, height] = p.bbox;

                let centerX = x + width / 2;
                let videoWidth = video.videoWidth;

                // 🎯 FRONT AREA
                if (
                    centerX > videoWidth * 0.3 &&
                    centerX < videoWidth * 0.7 &&
                    p.score > 0.6 &&
                    width > videoWidth * 0.1
                ) {
                    foundObstacle = true;
                }
            });

            if (foundObstacle) {
                console.log("🚧 Obstacle detected");
                speak("Obstacle ahead");
            }

        } catch (err) {
            console.error("Detection error:", err);
        }

    }, 2000);
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

            document.getElementById("heardText").innerText = "You said: " + transcript;

            if (!last.isFinal) return;

            speak("You said " + transcript);

            if (transcript.includes("start camera")) startCamera();
            else if (transcript.includes("stop camera")) stopCamera();
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
    speak("Hold and say start camera");
};