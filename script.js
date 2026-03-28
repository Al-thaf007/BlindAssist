let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;
let userInteracted = false;

// 🔊 Speak
function speak(text) {
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

    } catch (e) {
        console.error(e);
        updateStatus("Model failed");
        speak("Model failed");
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
        await video.play();

        cameraOn = true;
        updateStatus("Camera started");
        speak("Camera started");

        if (model) startDetection();

    } catch (err) {
        console.error(err);
        speak("Camera blocked. Tap screen first");
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

        updateStatus("Camera stopped");
        speak("Camera stopped");
    }
}

// ==========================
// 🚧 Detection
// ==========================
function startDetection() {
    if (!model) return;

    const video = document.getElementById("camera");
    detecting = true;

    updateStatus("Detection running");

    setInterval(async () => {
        if (!detecting || !cameraOn) return;

        const predictions = await model.detect(video);

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

            if (text.includes("start camera")) {
                if (!cameraOn) startCamera();
            }

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
document.body.addEventListener("touchstart", () => {
    userInteracted = true;

    // 🔥 FIRST TOUCH → FORCE CAMERA PERMISSION
    if (!cameraOn) {
        startCamera();
    }

    startVoice();
}, { passive: true });

document.body.addEventListener("touchend", () => stopVoiceSafe());

document.body.addEventListener("mousedown", () => {
    userInteracted = true;

    if (!cameraOn) {
        startCamera();
    }

    startVoice();
});

document.body.addEventListener("mouseup", () => stopVoiceSafe());

// ==========================
// INIT
// ==========================
window.onload = function () {
    speak("Hold screen and speak");
    loadModel();
};