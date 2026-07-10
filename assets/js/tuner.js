/* ==========================================================================
   MsD ULTIMATE INSTRUMENT TUNER — page-specific script (tuner.html only)
   Extracted out of the inline <script> tag so every page can share the
   same folder-structure convention: shared code in main.js, page-specific
   code in its own file.
   ========================================================================== */

        // ✨ STAR PARTICLES BACKGROUND ANIMATION ENGINE ✨
        const canvas = document.getElementById('starCanvas');
        const ctx = canvas.getContext('2d');
        let stars = [];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class Star {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 1.8 + 0.2;
                this.speedX = (Math.random() - 0.5) * 0.3; // හෙමින් ගමන් කරන තරු
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random();
                this.fadeSpeed = Math.random() * 0.01 + 0.005;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                // Canvas එකෙන් පිටට ගියොත් නැවත ඇතුලට ගැනීම
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

                // Twinkle (නිවෙමින් පෙනෙන) Effect එක
                this.opacity += this.fadeSpeed;
                if (this.opacity <= 0 || this.opacity >= 1) {
                    this.fadeSpeed *= -1;
                }
            }
            draw() {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                const starColor = isLight ? '10, 10, 25' : '255, 255, 255';
                ctx.fillStyle = `rgba(${starColor}, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // තරු 120 ක් සාදමු
        for (let i = 0; i < 120; i++) {
            stars.push(new Star());
        }

        function animateStars() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(star => {
                star.update();
                star.draw();
            });
            requestAnimationFrame(animateStars);
        }
        animateStars();


        // 🧠 TUNER LOGIC SYSTEM 🧠
        const noteDisplay = document.getElementById('note');
        const subDetails = document.getElementById('subDetails');
        const distanceText = document.getElementById('distanceText');
        const pointer = document.getElementById('pointer');
        const statusText = document.getElementById('status');
        const displayModeTitle = document.getElementById('displayModeTitle');
        const startBtn = document.getElementById('startBtn');

        const instSelect = document.getElementById('instSelect');
        const styleSelect = document.getElementById('styleSelect');
        const pitchSelect = document.getElementById('pitchSelect');
        const stringSelector = document.getElementById('stringSelector');

        let audioCtx, analyser, bufferLength, dataArray;
        let isTuning = false;
        let currentMode = "auto"; 

        let selectedNote = "C", selectedAccidental = "", selectedOctave = 4;
        let targetFrequency = 261.63;

        const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

        const instrumentPresets = {
            violin: {
                styles: {
                    hindustani: { name: "Hindustani (Pa-Sa-Pa-Sa)", type: "oriental", pattern: ["P", "S", "P", "S"], octaves: [-1, 0, 0, 1] }, 
                    carnatic: { name: "Carnatic (Sa-Pa-Sa-Pa)", type: "oriental", pattern: ["S", "P", "S", "P"], octaves: [0, 0, 1, 1] },
                    western: { name: "Western (G-D-A-E)", type: "fixed", strings: [{n:"G",o:3}, {n:"D",o:4}, {n:"A",o:4}, {n:"E",o:5}] }
                }
            },
            guitar: {
                styles: {
                    western: { name: "Western (Standard)", type: "fixed", strings: [{n:"E",o:2}, {n:"A",o:2}, {n:"D",o:3}, {n:"G",o:3}, {n:"B",o:3}, {n:"E",o:4}] },
                    hindustani: { name: "Hindustani Style", type: "oriental", pattern: ["S", "P", "S", "M", "P", "S"], octaves: [-1, -1, 0, 0, 0, 1] },
                    carnatic: { name: "Carnatic Style", type: "oriental", pattern: ["S", "P", "S", "P", "S"], octaves: [-1, -1, 0, 0, 1] }
                }
            }
        };

        // --- MODE TOGGLE ---
        document.querySelectorAll('.mode-container .mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-container .mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                currentMode = e.target.dataset.mode;
                document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                document.getElementById(`${currentMode}Panel`).classList.add('active');

                if (currentMode === "auto") {
                    displayModeTitle.innerText = "Auto Detecting";
                    resetDisplay();
                } else if (currentMode === "manual") {
                    displayModeTitle.innerText = "Manual Target Note";
                    updateManualTarget();
                } else if (currentMode === "instrument") {
                    displayModeTitle.innerText = "Instrument Tuning Mode";
                    loadStyles();
                }
            });
        });

        function resetDisplay() {
            noteDisplay.innerText = "-";
            noteDisplay.style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#fff';
            subDetails.innerText = "Current: - | 0.00 Hz";
            distanceText.innerText = "";
            pointer.style.left = "50%";
        }

        function getRelativeNote(baseSa, intervals, targetType) {
            let baseIdx = noteStrings.indexOf(baseSa);
            let offset = 0;
            if (targetType === "P") offset = 7;
            if (targetType === "M") offset = 5;
            if (targetType === "S") offset = 0;

            let targetIdx = (baseIdx + offset) % 12;
            let octaveOverflow = Math.floor((baseIdx + offset) / 12);
            return { note: noteStrings[targetIdx], overflow: octaveOverflow };
        }

        instSelect.addEventListener('change', loadStyles);
        styleSelect.addEventListener('change', handleStyleChange);
        pitchSelect.addEventListener('change', loadStrings);

        function loadStyles() {
            const inst = instSelect.value;
            styleSelect.innerHTML = "";
            for (let key in instrumentPresets[inst].styles) {
                let opt = document.createElement('option');
                opt.value = key;
                opt.innerText = instrumentPresets[inst].styles[key].name;
                styleSelect.appendChild(opt);
            }
            handleStyleChange();
        }

        function handleStyleChange() {
            const inst = instSelect.value;
            const style = styleSelect.value;
            const preset = instrumentPresets[inst].styles[style];
            pitchSelect.disabled = preset.type === "fixed";
            loadStrings();
        }

        function loadStrings() {
            const inst = instSelect.value;
            const style = styleSelect.value;
            const preset = instrumentPresets[inst].styles[style];
            const baseSa = pitchSelect.value;

            stringSelector.innerHTML = "";
            let generatedStrings = [];

            if (preset.type === "fixed") {
                generatedStrings = preset.strings;
            } else {
                let standardSaOctave = (inst === "violin") ? 4 : 3;
                preset.pattern.forEach((type, idx) => {
                    let rel = getRelativeNote(baseSa, type, type);
                    let finalOctave = standardSaOctave + preset.octaves[idx] + rel.overflow;
                    generatedStrings.push({
                        n: rel.note,
                        o: finalOctave,
                        label: `${type} (${rel.note}${finalOctave})`
                    });
                });
            }

            stringSelector.style.gridTemplateColumns = `repeat(${generatedStrings.length}, 1fr)`;

            generatedStrings.forEach((str, index) => {
                let btn = document.createElement('button');
                btn.className = "select-btn" + (index === 0 ? " active" : "");
                btn.innerText = str.label ? str.label : `Str ${index+1} (${str.n}${str.o})`;
                btn.dataset.note = str.n;
                btn.dataset.octave = str.o;
                
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('#stringSelector .select-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    setInstrumentTarget(str.n, str.o);
                });
                stringSelector.appendChild(btn);
            });

            setInstrumentTarget(generatedStrings[0].n, generatedStrings[0].o);
        }

        function setInstrumentTarget(note, octave) {
            let midi = getMidiNoteNumber(note, "", parseInt(octave));
            targetFrequency = 440 * Math.pow(2, (midi - 69) / 12);
            noteDisplay.innerText = note + octave;
            noteDisplay.style.color = "#ffaa00";
        }

        function getMidiNoteNumber(note, accidental, octave) {
            let noteName = note + accidental;
            if (noteName === "Db") noteName = "C#"; if (noteName === "Eb") noteName = "D#";
            if (noteName === "Gb") noteName = "F#"; if (noteName === "Ab") noteName = "G#";
            if (noteName === "Bb") noteName = "A#";
            return (octave + 1) * 12 + noteStrings.indexOf(noteName);
        }

        function updateManualTarget() {
            let midi = getMidiNoteNumber(selectedNote, selectedAccidental, selectedOctave);
            targetFrequency = 440 * Math.pow(2, (midi - 69) / 12);
            let displayAcc = selectedAccidental === "b" ? "♭" : selectedAccidental;
            noteDisplay.innerText = selectedNote + displayAcc + selectedOctave;
            noteDisplay.style.color = "#ff4a57";
        }

        // Click listeners manual mode
        document.getElementById('noteSelector').addEventListener('click', (e) => {
            if (e.target.classList.contains('select-btn')) {
                document.querySelectorAll('#noteSelector .select-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedNote = e.target.dataset.note;
                updateManualTarget();
            }
        });
        document.getElementById('accidentalSelector').addEventListener('click', (e) => {
            if (e.target.classList.contains('select-btn')) {
                document.querySelectorAll('#accidentalSelector .select-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedAccidental = e.target.dataset.acc;
                updateManualTarget();
            }
        });
        document.getElementById('octaveSelector').addEventListener('click', (e) => {
            if (e.target.classList.contains('select-btn')) {
                document.querySelectorAll('#octaveSelector .select-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedOctave = parseInt(e.target.dataset.octave);
                updateManualTarget();
            }
        });

        // --- AUDIO CONTROLS ---
        startBtn.addEventListener('click', async () => {
            if (isTuning) {
                isTuning = false;
                startBtn.innerText = "Start Tuner";
                statusText.innerText = "Tuner Stopped";
                statusText.style.color = "#a0a0a8";
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048;
                const source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);
                bufferLength = analyser.frequencyBinCount;
                dataArray = new Float32Array(bufferLength);
                isTuning = true;
                startBtn.innerText = "Stop Tuner";
                statusText.innerText = "Listening...";
                statusText.style.color = "#00ff66";
                updateTuner();
            } catch (err) { alert("Microphone Access Required!"); }
        });

        function autoCorrelate(buffer, sampleRate) {
            let SIZE = buffer.length, rms = 0;
            for (let i=0; i<SIZE; i++) { rms += buffer[i]*buffer[i]; }
            rms = Math.sqrt(rms/SIZE); if (rms<0.012) return -1; 
            let r1=0, r2=SIZE-1, thres=0.2;
            for (let i=0; i<SIZE/2; i++) { if (Math.abs(buffer[i]) < thres) { r1=i; break; } }
            for (let i=SIZE-1; i>=SIZE/2; i--) { if (Math.abs(buffer[i]) < thres) { r2=i; break; } }
            buffer = buffer.slice(r1,r2); SIZE = buffer.length;
            let c = new Float32Array(SIZE);
            for (let i=0; i<SIZE; i++) {
                for (let j=0; j<SIZE-i; j++) { c[i] = c[i] + buffer[j]*buffer[j+i]; }
            }
            let d=0; while (c[d]>c[d+1]) d++;
            let maxval=-1, maxpos=-1;
            for (let i=d; i<SIZE; i++) { if (c[i] > maxval) { maxval = c[i]; maxpos = i; } }
            return sampleRate/maxpos;
        }

        function updateTuner() {
            if (!isTuning) return;

            analyser.getFloatTimeDomainData(dataArray);
            let pitch = autoCorrelate(dataArray, audioCtx.sampleRate);

            if (pitch !== -1 && pitch > 15 && pitch < 8000) { 
                const noteNum = Math.round(12 * (Math.log(pitch / 440) / Math.log(2))) + 69;
                let currentNote = noteStrings[noteNum % 12];
                let octave = Math.floor(noteNum / 12) - 1;
                let detectedNoteString = currentNote + octave;

                if (currentMode === "auto") {
                    noteDisplay.innerText = detectedNoteString;
                    subDetails.innerText = `Frequency: ${pitch.toFixed(2)} Hz`;
                    distanceText.innerText = "";
                    let standardFreq = 440 * Math.pow(2, (noteNum - 69) / 12);
                    updatePointerAndStatus(1200 * Math.log2(pitch / standardFreq));
                } else {
                    subDetails.innerText = `Current Swaraya: ${detectedNoteString} | ${pitch.toFixed(2)} Hz`;
                    let cents = 1200 * Math.log2(pitch / targetFrequency);
                    updatePointerAndStatus(cents);

                    if (Math.abs(cents) < 4) {
                        distanceText.innerText = "🎯 Perfect! Instrument is Tuned.";
                        distanceText.style.color = "#00ff66";
                    } else if (cents < 0) {
                        let closeness = cents > -15 ? "ළඟයි (Close)" : "හුඟක් බුරුලයි (Too Flat)";
                        distanceText.innerText = `${closeness} 🔺 තන්තුව තද කරන්න (Tighten Up / Increase)`;
                        distanceText.style.color = "#ff4a57";
                    } else {
                        let closeness = cents < 15 ? "ළඟයි (Close)" : "හුඟක් තදයි (Too Sharp)";
                        distanceText.innerText = `${closeness} 🔻 තන්තුව බුරුල් කරන්න (Loosen / Tune Down)`;
                        distanceText.style.color = "#ffaa00";
                    }
                }
            }
            requestAnimationFrame(updateTuner);
        }

        function updatePointerAndStatus(cents) {
            let pointerPos = 50 + (cents * 1); 
            if(pointerPos < 5) pointerPos = 5; if(pointerPos > 95) pointerPos = 95;
            pointer.style.left = pointerPos + "%";

            if (Math.abs(cents) < 4) {
                statusText.innerText = "In Tune! ✔"; statusText.style.color = "#00ff66";
                if(currentMode === "auto") noteDisplay.style.color = "#00ff66";
            } else if (cents < 0) {
                statusText.innerText = "Too Low (Flat)"; statusText.style.color = "#ff4a57";
                if(currentMode === "auto") noteDisplay.style.color = "#ff4a57";
            } else {
                statusText.innerText = "Too High (Sharp)"; statusText.style.color = "#ffaa00";
                if(currentMode === "auto") noteDisplay.style.color = "#ffaa00";
            }
        }
    