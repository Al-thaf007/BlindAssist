let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

let model = null;
let detecting = false;

let isSpeaking = false;
let cameraStartedByTouch = false;

// ==========================
// 🔊 SPEAK (FINAL)
// ==========================
function speak(text, force = false) {
    if (!force && isSpeaking) return;

    const msg = new SpeechSynthesisUtterance(text);

    isSpeaking = true;

    msg.onend = () => {
        isSpeaking = false;
    };

    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}

// ==========================
// 🧠 DEBUG
// ==========================
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
function startCamera() {
    if (cameraOn) return;

    const video = document.getElementById("camera");

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
    }).then(s => {
        stream = s;
        video.srcObject = stream;
        video.play();

        cameraOn = true;
        updateStatus("Camera started");
        speak("Camera started", true);

        if (model) startDetection();

    }).catch(err => {
        console.error(err);
        speak("Camera permission denied", true);
    });
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
    speak("Camera stopped", true);
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

            if (
                (centerX > vw * 0.3 && centerX < vw * 0.7 && p.score > 0.5)
                || sizeRatio > 0.4
            ) {
                foundObstacle = true;
            }
        });

        let detectedState = foundObstacle ? "obstacle" : "clear";

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
// 🎤 VOICE (FINAL FIX)
// ==========================
function startVoice() {
    if (isListening) return;

    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;

        recognition.onresult = function (event) {
            let result = event.results[event.results.length - 1];
            let text = result[0].transcript.toLowerCase().trim();

            document.getElementById("heardText").innerText = "You said: " + text;

            if (!result.isFinal) return;

            console.log("Final:", text);

            text = text.replace(/\s+/g, " ");

            // 🔥 STOP CAMERA
            if (
                (text.includes("stop") && text.includes("camera")) ||
                text.includes("camera off") ||
                text.includes("turn off")
            ) {
                updateStatus("Stopping camera");
                stopCamera();
                return;
            }

            // 🔥 LOCATION
            if (
                text.includes("location") ||
                text.includes("where am i") ||
                text.includes("my location")
            ) {
                updateStatus("Getting location");
                getLocation();
                return;
            }

            // 🔥 START CAMERA
            if (
                (text.includes("start") && text.includes("camera")) ||
                text.includes("open camera")
            ) {
                updateStatus("Starting camera");
                startCamera();
                return;
            }

            updateStatus("Command not clear");
        };

        recognition.start();
        isListening = true;

    } catch {
        speak("Microphone not supported", true);
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
// 📍 LOCATION (FINAL FIX)
// ==========================
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        let lat = pos.coords.latitude;
        let lon = pos.coords.longitude;

        updateStatus("Location fetched");

        setTimeout(() => {
            speak("Your location is latitude " + lat + " and longitude " + lon, true);
        }, 200);

    }, () => {
        speak("Location access denied", true);
    });
}

// ==========================
// 📱 TOUCH (FINAL FIX)
// ==========================
document.body.addEventListener("touchstart", function () {
    if (!cameraStartedByTouch) {
        startCamera();
        cameraStartedByTouch = true;
    }
    startVoice();
}, { passive: true });

document.body.addEventListener("touchend", function () {
    setTimeout(() => {
        stopVoiceSafe();
    }, 700);
});

// ==========================
// 💻 MOUSE
// ==========================
document.body.addEventListener("mousedown", function () {
    if (!cameraOn) startCamera();
    startVoice();
});

document.body.addEventListener("mouseup", function () {
    setTimeout(() => {
        stopVoiceSafe();
    }, 700);
});

// ==========================
// INIT
// ==========================
window.onload = function () {
    speak("Touch and hold to use");
    loadModel();
};