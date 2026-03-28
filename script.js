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
            video: {
                facingMode: "environment"
            }
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
            let command = event.results[event.results.length - 1][0].transcript.toLowerCase();
            console.log("Command:", command);

            if (command.includes("start camera")) startCamera();
            else if (command.includes("stop camera")) stopCamera();
            else if (command.includes("location")) getLocation();
            else if (command.includes("stop voice")) stopVoiceSafe();
            else speak("Command not recognized");
        };

        recognition.onerror = function () {
            stopVoiceSafe();
        };

        recognition.onend = function () {
            // prevent auto restart after release
            if (!isListening) return;
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
            recognition.onend = null;
            recognition.stop();
        } catch (e) { }
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

// MOVE → mic OFF (prevents stuck)
document.body.addEventListener("touchmove", function () {
    stopVoiceSafe();
});

// ==========================
// 🔊 Auto Instruction
// ==========================
window.onload = function () {
    speak("Hold anywhere and speak your command");
};