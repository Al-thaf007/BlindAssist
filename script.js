let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

// 🔊 Speak (no overlap)
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}

// 📷 Start Camera (BACK CAMERA)
async function startCamera() {
    if (cameraOn) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        document.getElementById("camera").srcObject = stream;
        cameraOn = true;
        speak("Camera started");
    } catch {
        speak("Camera permission denied");
    }
}

// 🛑 Stop Camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraOn = false;
        speak("Camera stopped");
    }
}

// 🎤 Start Voice (Hold)
function startVoice() {
    if (isListening) return;

    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = function (event) {
            let result = event.results[event.results.length - 1][0];
            let command = result.transcript.toLowerCase().trim();
            let confidence = result.confidence;

            console.log("Heard:", command, "Confidence:", confidence);

            // ❗ Ignore weak/noisy input
            if (confidence < 0.5 || command.length < 3) return;

            // 🔥 Flexible matching
            if (command.includes("camera") && command.includes("start")) {
                startCamera();
            }
            else if (command.includes("camera") && command.includes("stop")) {
                stopCamera();
            }
            else if (command.includes("location")) {
                getLocation();
            }
            else if (command.includes("stop")) {
                stopVoiceSafe();
            }
            // ❌ removed annoying "not recognized"
        };

        recognition.onerror = function () {
            stopVoiceSafe();
        };

        recognition.start();
        isListening = true;
        console.log("Mic ON");

    } catch {
        speak("Microphone not supported");
    }
}

// 🛑 Safe Stop Voice
function stopVoiceSafe() {
    if (recognition) {
        try {
            recognition.stop();
        } catch { }
        recognition = null;
    }

    isListening = false;
    console.log("Mic OFF");
}

// 📍 Get Location
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        let lat = pos.coords.latitude;
        let lon = pos.coords.longitude;
        speak("Your location is latitude " + lat + " longitude " + lon);
    }, () => {
        speak("Location access denied");
    });
}

// ==========================
// ✋ TOUCH CONTROLS
// ==========================

// HOLD → mic ON
document.body.addEventListener("touchstart", function () {
    startVoice();
}, { passive: true });

// RELEASE → mic OFF
document.body.addEventListener("touchend", function () {
    stopVoiceSafe();
});

// INTERRUPT → mic OFF
document.body.addEventListener("touchcancel", function () {
    stopVoiceSafe();
});

// MOVE → mic OFF
document.body.addEventListener("touchmove", function () {
    stopVoiceSafe();
});

// ==========================
// 🔊 Auto Instruction
// ==========================
window.onload = function () {
    speak("Hold and speak. Say start camera or location");
};