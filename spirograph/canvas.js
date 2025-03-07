const canvases = document.querySelectorAll('canvas');
const { width, height } = canvases[0];

/** @type {CanvasRenderingContext2D[]} */
const contexts = [];

for (const canvas of canvases) {
    contexts.push(canvas.getContext('2d'));
}

const inputs = document.querySelectorAll('input');
const [innerRadius, penDistance, speed, startStop, clear] = inputs;

const params = {
    innerRadius: +innerRadius.value,
    penDistance: +penDistance.value,
    speed: +speed.value,
}

innerRadius.max = width / 2;
penDistance.max = params.innerRadius;
penDistance.min = -params.innerRadius;

const gear = {
    angle: 0,

    get radius() {
        return params.innerRadius;
    },

    get x() {
        return (width / 2 - this.radius) * Math.cos(this.angle);
    },

    get y() {
        return (height / 2 - this.radius) * Math.sin(this.angle);
    }
}

const pen = {
    get distance() {
        return params.penDistance;
    },

    get angle() {
        return -gear.angle * (width / 2 - gear.radius) / gear.radius;
    },

    get x() {
        return gear.x + this.distance * Math.cos(this.angle);
    },

    get y() {
        return gear.y + this.distance * Math.sin(this.angle);
    }
}

const prev = {
    x: pen.x,
    y: pen.y
}

const angleStep = 0.1 * Math.PI / 180;

let requestId;

function animate() {
    for (let i = 0; i < params.speed * Math.PI / 180; i += angleStep) {
        drawGear();

        contexts[1].beginPath();
        contexts[1].moveTo(width / 2 + prev.x, height / 2 + prev.y);
        contexts[1].lineTo(width / 2 + pen.x, height / 2 + pen.y);
        contexts[1].stroke();

        prev.x = pen.x;
        prev.y = pen.y;
        gear.angle += angleStep;
    }

    requestId = requestAnimationFrame(animate);
}

function drawGear() {
    contexts[0].clearRect(0, 0, width, height);

    const outerRadius = width / 2;

    contexts[0].save();
    contexts[0].translate(width / 2, height / 2);

    contexts[0].beginPath();
    contexts[0].arc(0, 0, outerRadius, 0, 2 * Math.PI);
    contexts[0].stroke();

    contexts[0].beginPath();
    contexts[0].arc(gear.x, gear.y, gear.radius, 0, 2 * Math.PI);
    contexts[0].stroke();

    contexts[0].beginPath();
    contexts[0].arc(pen.x, pen.y, 4, 0, 2 * Math.PI);
    contexts[0].fill();

    contexts[0].restore();
}

drawGear();

/**
 * @param {Event} ev 
 */
function handleInput(ev) {
    if (!(ev.target instanceof HTMLInputElement)) {
        return;
    }

    if (ev.target.validity.rangeOverflow) {
        ev.target.value = ev.target.max;
    }

    if (ev.target.validity.rangeUnderflow) {
        ev.target.value = ev.target.min;
    }

    if (ev.target.validity.stepMismatch) {
        const { value, min } = ev.target;
        const step = ev.target.step || '1';

        let interval = +value - +min;
        interval = Math.floor(interval / +step) * +step;

        ev.target.value = `${+min + interval}`;
    }
}

innerRadius.addEventListener('change', (ev) => {
    handleInput(ev);
    params.innerRadius = +innerRadius.value;

    penDistance.max = params.innerRadius;
    penDistance.min = -params.innerRadius;

    if (Math.abs(params.penDistance) > params.innerRadius) {
        const sign = Math.sign(params.penDistance);

        params.penDistance = sign * params.innerRadius;
        penDistance.value = params.penDistance;
    }

    prev.x = pen.x;
    prev.y = pen.y;

    drawGear();
});

penDistance.addEventListener('change', (ev) => {
    handleInput(ev);
    params.penDistance = +penDistance.value;

    prev.x = pen.x;
    prev.y = pen.y;

    drawGear();
});

speed.addEventListener('change', (ev) => {
    handleInput(ev);
    params.speed = +speed.value;
});

startStop.addEventListener('click', () => {
    if (!requestId) {
        animate();
        startStop.value = 'Stop';
    }
    else {
        cancelAnimationFrame(requestId);
        requestId = undefined;
        startStop.value = 'Start';
    }
});

clear.addEventListener('click', () => {
    cancelAnimationFrame(requestId);
    requestId = undefined;
    startStop.value = 'Start';

    gear.angle = 0;
    prev.x = pen.x;
    prev.y = pen.y;

    contexts[1].clearRect(0, 0, width, height);
    drawGear();
});
