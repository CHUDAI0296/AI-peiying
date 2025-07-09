document.addEventListener('DOMContentLoaded', () => {
    const ttsText = document.getElementById('tts-text');
    const voiceSelect = document.getElementById('voice-select');
    const rateSlider = document.getElementById('rate-slider');
    const rateValue = document.getElementById('rate-value');
    const pitchSlider = document.getElementById('pitch-slider');
    const pitchValue = document.getElementById('pitch-value');
    const speakBtn = document.getElementById('speak-btn');
    
    const synth = window.speechSynthesis;
    let voices = [];

    function populateVoiceList() {
        voices = synth.getVoices();
        voiceSelect.innerHTML = '';
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            voiceSelect.appendChild(option);
        });
    }

    populateVoiceList();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    speakBtn.addEventListener('click', () => {
        if (synth.speaking) {
            console.error('SpeechSynthesis.speaking');
            return;
        }
        if (ttsText.value !== '') {
            const utterThis = new SpeechSynthesisUtterance(ttsText.value);
            const selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
            utterThis.voice = voices.find(voice => voice.name === selectedVoiceName);
            utterThis.pitch = pitchSlider.value;
            utterThis.rate = rateSlider.value;
            
            utterThis.onend = function (event) {
                console.log('SpeechSynthesisUtterance.onend');
            }
            utterThis.onerror = function (event) {
                console.error('SpeechSynthesisUtterance.onerror');
            }
            
            synth.speak(utterThis);
        }
    });

    rateSlider.addEventListener('input', () => rateValue.textContent = rateSlider.value);
    pitchSlider.addEventListener('input', () => pitchValue.textContent = pitchSlider.value);
}); 