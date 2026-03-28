let stream;
let recognition;
let isListening = false;
let cameraOn = false;

// 🔊 Speak
function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(msg);
}

// 📷 Camera
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

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraOn = false;
        speak("Camera stopped");
    }
}

// 🎤 Voice
function startVoice() {
    if (isListening) return;

    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;

        recognition.onresult = function (event) {
            let command = event.results[event.results.length - 1][0].transcript.toLowerCase();
            console.log(command);

            if (command.includes("start camera")) startCamera();
            else if (command.includes("stop camera")) stopCamera();
            else if (command.includes("location")) getLocation();
            else if (command.includes("stop voice")) stopVoice();
            else speak("Command not recognized");
        };

        recognition.start();
        isListening = true;
        speak("Voice control started");
    } catch {
        speak("Microphone not supported");
    }
}

function stopVoice() {
    if (recognition) {
        recognition.stop();
        isListening = false;
        speak("Voice stopped");
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

// 👆 TAP ANYWHERE → START MIC
document.body.addEventListener("click", function () {
    startVoice();
});