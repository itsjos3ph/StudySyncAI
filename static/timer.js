document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const customTimeInput = document.getElementById('customTime');
    const studyBalanceDisplay = document.getElementById('study-balance');
    const resetTotalBtn = document.getElementById('reset-total-btn');
    const breakSection = document.querySelector('.break-section');
    const creditsDisplay = document.getElementById('credits');
    const creditsProfileDisplay = document.getElementById('credits-display');
    const playMinesweeperBtn = document.getElementById('play-minesweeper');
    const breakPopout = document.getElementById('break-popout');

    let defaultTime = parseInt(timerDisplay.textContent.split(':')[0]) || 25;
    let timeLeft = defaultTime * 60 * 1000; // In milliseconds
    let startTime = null;
    let timerId = null;
    let sessionStartTimeLeft = null; // Track the starting timeLeft for each session segment

    function updateDisplay() {
        if (!timerId) return;
        const now = performance.now();
        if (!startTime) {
            startTime = now;
            sessionStartTimeLeft = timeLeft; // Set initial timeLeft for this segment
        }
        const elapsed = now - startTime;
        timeLeft = Math.max(0, sessionStartTimeLeft - elapsed); // Calculate based on session start
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        const timeStr = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        timerDisplay.textContent = timeStr;
        document.title = `StudySync AI - ${timeStr}`;
        if (timeLeft <= 0) {
            cancelAnimationFrame(timerId);
            timerId = null;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            clearActive();
            breakPopout.innerHTML = `
                <h3>Time’s Up!</h3>
                <p>Hey, wanna go for a break?</p>
                <button id="break-yes-btn">Yes</button>
                <button id="break-no-btn">No</button>
            `;
            breakPopout.classList.remove('hidden');
            document.getElementById('break-yes-btn').addEventListener('click', () => {
                breakPopout.classList.add('hidden');
                window.location.href = '/break';
            });
            document.getElementById('break-no-btn').addEventListener('click', () => {
                breakPopout.classList.add('hidden');
                resetTimer();
            });
            sendElapsedTime(sessionStartTimeLeft - timeLeft); // Send total elapsed time for this segment
            startTime = null;
            sessionStartTimeLeft = null;
        } else {
            timerId = requestAnimationFrame(updateDisplay);
        }
    }

    function updateStudyBalance(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        studyBalanceDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function clearActive() {
        startBtn.classList.remove('active');
        pauseBtn.classList.remove('active');
        resetBtn.classList.remove('active');
    }

    function startTimer() {
        if (!timerId) {
            if (startTime === null && timeLeft === defaultTime * 60 * 1000) { // Fresh start
                defaultTime = parseInt(customTimeInput.value) || defaultTime;
                timeLeft = defaultTime * 60 * 1000;
            } // Otherwise, resume with existing timeLeft
            startTime = performance.now();
            sessionStartTimeLeft = timeLeft; // Capture timeLeft at start of this segment
            timerId = requestAnimationFrame(updateDisplay);
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            clearActive();
            startBtn.classList.add('active');
            breakSection.style.display = 'none';
        }
    }

    function pauseTimer() {
        if (timerId) {
            cancelAnimationFrame(timerId);
            timerId = null;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            clearActive();
            pauseBtn.classList.add('active');
            const elapsedThisSegment = sessionStartTimeLeft - timeLeft; // Time elapsed since start of this segment
            sendElapsedTime(elapsedThisSegment);
            startTime = null;
            sessionStartTimeLeft = null; // Reset for next segment
        }
    }

    function resetTimer() {
        if (timerId) {
            cancelAnimationFrame(timerId);
            timerId = null;
        }
        defaultTime = parseInt(customTimeInput.value) || defaultTime;
        timeLeft = defaultTime * 60 * 1000; // Explicitly reset timeLeft here
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        document.title = `StudySync AI - ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        clearActive();
        resetBtn.classList.add('active');
        setTimeout(() => resetBtn.classList.remove('active'), 200);
        breakSection.style.display = 'none';
        startTime = null;
        sessionStartTimeLeft = null;
    }

    function sendElapsedTime(increment) {
        fetch('/update_study_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_time: Math.floor(increment / 1000) }) // Convert to seconds
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateStudyBalance(data.study_balance);
                creditsDisplay.textContent = data.credits;
                creditsProfileDisplay.textContent = data.credits;
                sessionStorage.setItem('credits', data.credits); // Sync credits
            }
        })
        .catch(error => console.error('Error updating study time:', error));
    }

    function resetStudyTime() {
        fetch('/reset_study_time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateStudyBalance(0); // Only reset study balance
            }
        })
        .catch(error => console.error('Error resetting study time:', error));
    }

    function spendCredits() {
        fetch('/spend_credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credits: 1 })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                creditsDisplay.textContent = data.credits;
                creditsProfileDisplay.textContent = data.credits;
                sessionStorage.setItem('credits', data.credits); // Sync credits
                window.location.href = '/break';
            } else {
                alert(data.message);
            }
        });
    }

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    resetTotalBtn.addEventListener('click', resetStudyTime);
    playMinesweeperBtn.addEventListener('click', spendCredits);

    const initialMinutes = parseInt(timerDisplay.textContent.split(':')[0]);
    timeLeft = initialMinutes * 60 * 1000;
    updateStudyBalance(parseInt(studyBalanceDisplay.textContent.split(':').reduce((acc, time) => (60 * acc) + parseInt(time))));
});