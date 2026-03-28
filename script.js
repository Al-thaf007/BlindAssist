let stream;
let recognition = null;
let isListening = false;
let cameraOn = false;

// 🔊 Speak
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel(); // stop overlapping speech
    speechSynthesis.speak(msg);
}

// 📷 Start Camera
async function startCamera() {
    if (cameraOn) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
            else speak("Command not recognized");
        };

        recognition.onerror = function () {
            stopVoice();
        };

        recognition.start();
        isListening = true;
    } catch {
        speak("Microphone not supported");
    }
}

// 🛑 Stop Voice (Release)
function stopVoice() {
    if (recognition && isListening) {
        recognition.stop();
        recognition = null;
        isListening = false;
    }
}

// 📍 Location
function getLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
        let lat = pos.coords.latitude;
        let lon = pos.coords.longitude;
        speak("Your location is latitude " + lat + " longitude " + lon);
    }, () => {
        speak("Location access denied");
    });
}

// ✋ HOLD → mic ON
document.body.addEventListener("touchstart", function () {
    startVoice();
}, { passive: true });

// 🖐️ RELEASE → mic OFF
document.body.addEventListener("touchend", function () {
    stopVoice();
});

// 🔊 Auto instruction
window.onload = function () {
    speak("Hold anywhere and speak your command");
};