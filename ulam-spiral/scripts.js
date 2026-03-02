const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const { width, height } = canvas;

const startInput = document.getElementById('start');
const densityOutput = document.getElementById('density');

const centerButton = document.getElementById('center');
const resetButton = document.getElementById('reset');

const offset = { x: width / 2, y: height / 2 };
let scale = 8;
let start = +startInput.value;

const primeCache = new Map();
const maxCacheSize = 8 * 320 ** 2;

function cleanupCache() {
    const keys = primeCache.keys();
    const toDelete = primeCache.size - maxCacheSize / 4;

    while (primeCache.size > toDelete) {
        primeCache.delete(keys.next().value);
    }
}

function isPrime(number) {
    if (number < 4) {
        return number > 1;
    }

    if (number % 2 === 0 || number % 3 === 0) {
        return false;
    }

    if (primeCache.has(number)) {
        return primeCache.get(number);
    }

    let result = true;

    for (let i = 5; i <= Math.sqrt(number); i += 6) {
        if (number % i === 0 || number % (i + 2) === 0) {
            result = false;
            break;
        }
    }

    primeCache.set(number, result);

    if (primeCache.size > maxCacheSize) {
        cleanupCache();
    }

    return result;
}

function getNumberAt(x, y) {
    const layer = Math.max(Math.abs(x), Math.abs(y));
    const layerMax = (2 * layer + 1) ** 2;

    if (y === -layer) return layerMax - layer + x;
    if (x === -layer) return layerMax - 3 * layer - y;
    if (y === layer)  return layerMax - 5 * layer - x;

    return layerMax - 7 * layer + y;
}

function render() {
    ctx.clearRect(0, 0, width, height);

    const minX = Math.floor(-offset.x / scale);
    const maxX = Math.ceil((width - offset.x) / scale);
    const minY = Math.floor(-offset.y / scale);
    const maxY = Math.ceil((height - offset.y) / scale);

    let primes = 0;

    ctx.beginPath();

    for (let y = minY; y <= maxY; y++) {
        let screenX = offset.x + minX * scale;
        const screenY = offset.y + y * scale;

        for (let x = minX; x <= maxX; x++) {
            const number = getNumberAt(x, y) + start - 1;

            if (isPrime(number)) {
                ctx.rect(screenX, screenY, scale, scale);
                primes++;
            }

            screenX += scale;
        }
    }

    ctx.fillStyle = '#f5f5f5';
    ctx.fill();

    const total = (maxX - minX + 1) * (maxY - minY + 1);
    densityOutput.textContent = (primes / total * 100).toFixed(2);
}

startInput.addEventListener('change', (event) => {
    if (event.target.validity.rangeUnderflow) {
        event.target.value = event.target.min;
    }
    else if (event.target.validity.stepMismatch) {
        const { min, value } = event.target;
        const step = +(event.target.step || 1);

        let interval = +value - +min;
        interval = Math.round(interval / step) * step;

        event.target.value = +min + interval;
    }

    start = +event.target.value;

    requestAnimationFrame(render);
});

const zoomFactor = 1.01;

function updateScale(factor, anchorX, anchorY) {
    const newScale = Math.max(2, Math.min(scale * factor, 32));

    if (newScale !== scale) {
        const scaleChange = newScale / scale;

        offset.x += (offset.x - anchorX) * (scaleChange - 1);
        offset.y += (offset.y - anchorY) * (scaleChange - 1);
        scale = newScale;
    }
}

canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoom = event.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    updateScale(zoom, mouseX, mouseY);

    requestAnimationFrame(render);
}, { passive: false });

let isDragging = false;
let lastMousePos = null;

canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
    document.documentElement.classList.add('dragging');
    lastMousePos = { x: event.clientX, y: event.clientY };
});

window.addEventListener('mousemove', (event) => {
    if (isDragging) {
        offset.x += event.clientX - lastMousePos.x;
        offset.y += event.clientY - lastMousePos.y;
        lastMousePos = { x: event.clientX, y: event.clientY };

        requestAnimationFrame(render);
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    document.documentElement.classList.remove('dragging');
});

centerButton.addEventListener('click', () => {
    offset.x = width / 2;
    offset.y = height / 2;

    requestAnimationFrame(render);
});

resetButton.addEventListener('click', () => {
    offset.x = width / 2;
    offset.y = height / 2;
    scale = 8;
    startInput.value = start = 1;

    requestAnimationFrame(render);
});

render();
