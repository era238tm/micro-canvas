import { Pane } from 'https://cdn.jsdelivr.net/npm/tweakpane@4';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let { width, height } = canvas;

const params = {
    start: 1,
    offset: { x: width / 2, y: height / 2 },
    scale: 10,
    density: 0
};

function getNumberAt(x, y) {
    const layer = Math.max(Math.abs(x), Math.abs(y));
    const layerMax = (2 * layer + 1) ** 2;

    if (y === -layer) return layerMax - (layer - x);
    if (x === -layer) return layerMax - (2 * layer) - (layer + y);
    if (y === layer) return layerMax - (4 * layer) - (layer + x);

    return layerMax - (6 * layer) - (layer - y);
}

function isPrime(number) {
    if (number < 4) return number > 1;
    if (number % 2 === 0 || number % 3 === 0) return false;

    for (let i = 5; i * i <= number; i += 6) {
        if (number % i === 0 || number % (i + 2) === 0) {
            return false;
        }
    }

    return true;
}

function render() {
    ctx.clearRect(0, 0, width, height);
    const { offset, scale } = params;

    const minX = Math.floor(-offset.x / scale);
    const maxX = Math.ceil((width - offset.x) / scale);
    const minY = Math.floor(-offset.y / scale);
    const maxY = Math.ceil((height - offset.y) / scale);

    let primes = 0;
    ctx.fillStyle = '#f5f5f5';

    for (let y = minY; y <= maxY; y++) {
        const screenY = offset.y + y * scale;

        for (let x = minX; x <= maxX; x++) {
            const screenX = offset.x + x * scale;
            const number = getNumberAt(x, -y) + params.start - 1;

            if (isPrime(number)) {
                ctx.fillRect(screenX, screenY, scale, scale);
                primes++;
            }
        }
    }

    const total = (maxX - minX + 1) * (maxY - minY + 1);
    params.density = primes / total;
}

const pane = new Pane({
    title: 'Configuration',
    expanded: true
});

const start = pane.addBinding(params, 'start', { min: 0, step: 1 });
start.on('change', () => requestAnimationFrame(render));

const reset = pane.addButton({ title: 'Reset' });
reset.on('click', () => {
    params.start = 1;
    params.offset = { x: width / 2, y: height / 2 };
    params.scale = 10;

    start.refresh();
    requestAnimationFrame(render);
});

pane.addBlade({ view: 'separator' });

pane.addBinding(params, 'density', {
    readonly: true,
    format: (v) => v.toFixed(4)
})

function resize() {
    const dpr = window.devicePixelRatio || 1;

    params.offset.x += (window.innerWidth - width) / 2;
    params.offset.y += (window.innerHeight - height) / 2;

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);

    requestAnimationFrame(render);
}

window.addEventListener('resize', resize);

const zoomFactor = 1.02;

canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    const { offsetX, offsetY, deltaY } = event;

    const zoomStrength = deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    const newScale = Math.max(2, Math.min(params.scale * zoomStrength, 32));
    const scaleChange = newScale / params.scale;

    params.offset.x += (offsetX - params.offset.x) * (1 - scaleChange);
    params.offset.y += (offsetY - params.offset.y) * (1 - scaleChange);
    params.scale = newScale;

    requestAnimationFrame(render);
}, { passive: false });

const activePointers = new Map();
let lastPointers = { center: null, spread: null };

function getPointersMetrics(pointers) {
    if (pointers.size === 0) return { center: null, spread: null };

    const center = { x: 0, y: 0 };
    for (const { x, y } of pointers.values()) {
        center.x += x;
        center.y += y;
    }
    center.x /= pointers.size;
    center.y /= pointers.size;

    let spread = 0;
    for (const { x, y } of pointers.values()) {
        spread += Math.hypot(x - center.x, y - center.y);
    }
    spread /= pointers.size;

    return { center, spread : spread || null };
}

canvas.addEventListener('pointerdown', (event) => {
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastPointers = getPointersMetrics(activePointers);

    if (event.pointerType === 'mouse') {
        document.documentElement.classList.add('dragging');
    }
});

window.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const { center, spread } = getPointersMetrics(activePointers);

    if (center && lastPointers.center) {
        const dx = center.x - lastPointers.center.x;
        const dy = center.y - lastPointers.center.y;

        params.offset.x += dx;
        params.offset.y += dy;
    }

    if (spread && lastPointers.spread) {
        const zoomStrength = spread / lastPointers.spread;
        const newScale = Math.max(2, Math.min(params.scale * zoomStrength, 32));
        const scaleChange = newScale / params.scale;

        params.offset.x += (center.x - params.offset.x) * (1 - scaleChange);
        params.offset.y += (center.y - params.offset.y) * (1 - scaleChange);
        params.scale = newScale;
    }

    lastPointers = { center, spread };

    requestAnimationFrame(render);
});

function handlePointerUp(event) {
    activePointers.delete(event.pointerId);
    lastPointers = getPointersMetrics(activePointers);

    if (event.pointerType === 'mouse') {
        document.documentElement.classList.remove('dragging');
    }
}

window.addEventListener('pointerup', handlePointerUp);
window.addEventListener('pointercancel', handlePointerUp);

resize();
render();
