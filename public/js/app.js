let video = document.getElementById('video');
let canvas = document.getElementById('overlay');
let ctx = canvas.getContext('2d');
let snapshotCanvas = document.getElementById('snapshotCanvas');
let snapshotCtx = snapshotCanvas.getContext('2d');
let currentHairstyle = null;
let isVideoReady = false;
let stream = null;

const maleHairstyles = [
    { id: 'short', name: 'Curto Clássico', file: 'short.svg' },
    { id: 'long', name: 'Longo', file: 'long.svg' },
    { id: 'modern', name: 'Moderno', file: 'modern.svg' },
    { id: 'fade', name: 'Fade', file: 'fade.svg' },
    { id: 'afro', name: 'Afro', file: 'afro.svg' },
    { id: 'curly', name: 'Encaracolado', file: 'curly.svg' }
];

const femaleHairstyles = [
    { id: 'bob', name: 'Bob', file: 'bob.svg' },
    { id: 'long-waves', name: 'Ondas Longas', file: 'long-waves.svg' },
    { id: 'ponytail', name: 'Rabo de Cavalo', file: 'ponytail.svg' },
    { id: 'bun', name: 'Coque', file: 'bun.svg' },
    { id: 'pixie-feminino', name: 'Pixie', file: 'pixie-feminino.svg' },
    { id: 'layers', name: 'Em Camadas', file: 'layers.svg' },
    { id: 'braid', name: 'Trança', file: 'braid.svg' },
    { id: 'bangs', name: 'Franja', file: 'bangs.svg' }
];

async function init() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
        });
        video.srcObject = stream;

        video.addEventListener('loadedmetadata', () => {
            isVideoReady = true;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            snapshotCanvas.width = video.videoWidth;
            snapshotCanvas.height = video.videoHeight;
        });

        await loadFaceApiModels();
        renderHairstyleGrids();
        startFaceDetection();
    } catch (err) {
        console.error('Erro ao aceder à webcam:', err);
        alert('Não foi possível aceder à webcam. Por favor, permita o acesso à câmara.');
    }
}

async function loadFaceApiModels() {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
}

function renderHairstyleGrids() {
    const maleGrid = document.getElementById('maleGrid');
    const femaleGrid = document.getElementById('femaleGrid');

    maleHairstyles.forEach(style => {
        const item = createHairstyleItem(style, 'male');
        maleGrid.appendChild(item);
    });

    femaleHairstyles.forEach(style => {
        const item = createHairstyleItem(style, 'female');
        femaleGrid.appendChild(item);
    });
}

function createHairstyleItem(style, category) {
    const div = document.createElement('div');
    div.className = 'hairstyle-item';
    div.dataset.id = style.id;
    div.dataset.category = category;
    div.innerHTML = `
        <img src="hairstyles/${style.file}" alt="${style.name}">
        <p>${style.name}</p>
    `;
    div.addEventListener('click', () => selectHairstyle(style, div));
    return div;
}

function selectHairstyle(style, element) {
    document.querySelectorAll('.hairstyle-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    currentHairstyle = style;
}

async function startFaceDetection() {
    while (true) {
        if (isVideoReady && video.readyState === 4) {
            const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detections && currentHairstyle) {
                drawHair(detections.landmarks);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

function drawHair(landmarks) {
    const jawOutline = landmarks.getJawOutline();
    const topOfHead = landmarks.getTopHead();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const faceWidth = Math.abs(jawOutline[0].x - jawOutline[jawOutline.length - 1].x);
    const faceHeight = Math.abs(topOfHead.y - jawOutline[8].y);
    const centerX = (jawOutline[0].x + jawOutline[jawOutline.length - 1].x) / 2;
    const centerY = topOfHead.y;

    const img = new Image();
    img.onload = () => {
        const scale = (faceWidth / 100) * 1.8;
        const angle = Math.atan2(rightEye[0].y - leftEye[0].y, rightEye[0].x - leftEye[0].x);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.translate(-centerX, -centerY);

        const drawWidth = faceWidth * scale;
        const drawHeight = drawWidth * (img.height / img.width);

        ctx.drawImage(
            img,
            centerX - drawWidth / 2,
            centerY - drawHeight * 0.3,
            drawWidth,
            drawHeight
        );

        ctx.restore();
    };
    img.src = `hairstyles/${currentHairstyle.file}`;
}

// Tirar foto
const snapBtn = document.getElementById('snapBtn');
const modal = document.getElementById('snapshotModal');
const closeModal = document.querySelector('.close');
const downloadSnapshot = document.getElementById('downloadSnapshot');

snapBtn.addEventListener('click', () => {
    if (!isVideoReady) return;

    snapshotCtx.drawImage(video, 0, 0);

    // Desenha o penteado atual sobre a foto
    if (currentHairstyle) {
        const img = new Image();
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(video, 0, 0);
            tempCtx.drawImage(canvas, 0, 0);
            snapshotCtx.clearRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
            snapshotCtx.drawImage(tempCanvas, 0, 0);
        };
        img.src = `hairstyles/${currentHairstyle.file}`;
    }

    modal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

downloadSnapshot.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'hair-try-on.png';
    link.href = snapshotCanvas.toDataURL();
    link.click();
});

// Botão de limpar
const resetBtn = document.getElementById('resetBtn');
resetBtn.addEventListener('click', () => {
    currentHairstyle = null;
    document.querySelectorAll('.hairstyle-item').forEach(item => item.classList.remove('active'));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Botão de descarregar
const downloadBtn = document.getElementById('downloadBtn');
downloadBtn.addEventListener('click', () => {
    if (!isVideoReady) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(video, 0, 0);
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'hair-try-on.png';
    link.href = tempCanvas.toDataURL();
    link.click();
});

// Inicializar
init();
