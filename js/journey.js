/* Draw the editorial schematic independently of the story and its audio. */
const Journey = (() => {
  const width = 1080;
  const height = 730;
  const ink = '#f5e3c6';
  const red = '#ef886d';
  const ease = value => value * value * (3 - 2 * value);
  const mix = (from, to, amount) => from + (to - from) * amount;
  const clamp = number => Math.max(0, Math.min(1, number));
  let terrain;

  function randomTexture() {
    let seed = 78119;
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function backdrop() {
    if (terrain) return terrain;
    terrain = document.createElement('canvas');
    terrain.width = width;
    terrain.height = height;
    const ctx = terrain.getContext('2d');
    const random = randomTexture();
    ctx.fillStyle = '#20332f';
    ctx.fillRect(0, 0, width, height);

    const regions = [
      [175, 303, 240, 176], [320, 287, 191, 142], [340, 505, 174, 124],
      [426, 123, 194, 90], [618, 345, 218, 118], [820, 559, 213, 123],
    ];
    for (const [x, y, rx, ry] of regions) {
      const tint = ctx.createRadialGradient(x, y, 1, x, y, Math.max(rx, ry));
      tint.addColorStop(0, '#a0926b36');
      tint.addColorStop(1, '#a0926b00');
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, width, height);
      for (let ring = 1; ring <= 18; ring++) {
        const proportion = ring / 18;
        ctx.beginPath();
        for (let index = 0; index <= 120; index++) {
          const angle = index * Math.PI / 60;
          const wave = 1 + .13 * Math.sin(angle * 3 + 1) + .075 * Math.sin(angle * 9);
          const px = x + Math.cos(angle) * rx * wave * proportion;
          const py = y + Math.sin(angle) * ry * wave * proportion;
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = ring % 5 === 0 ? '#c2b28c31' : '#d8c8a219';
        ctx.lineWidth = ring % 5 === 0 ? 1.2 : .65;
        ctx.stroke();
      }
    }

    for (let index = 0; index < 24000; index++) {
      ctx.fillStyle = index % 2 ? '#f8ddb514' : '#0b111421';
      ctx.fillRect(random() * width, random() * height, .6 + random(), .6 + random());
    }
    ctx.strokeStyle = '#f4e6c51a';
    ctx.lineWidth = .7;
    for (let x = 40; x < width; x += 44) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 30; y < height; y += 44) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    return terrain;
  }

  function prefix(trace, index) {
    const reached = Math.min(trace.length - 1, Math.floor(index));
    const points = trace.slice(0, reached + 1).map(id => JOURNEY_POINTS[id]);
    if (reached < trace.length - 1 && index > reached) {
      const [x, y] = JOURNEY_POINTS[trace[reached]];
      const [nextX, nextY] = JOURNEY_POINTS[trace[reached + 1]];
      points.push([mix(x, nextX, index - reached), mix(y, nextY, index - reached)]);
    }
    return points;
  }

  function arrow(ctx, x, y, angle, color, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, size * .62);
    ctx.lineTo(-size * .48, 0);
    ctx.lineTo(-size, -size * .62);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function line(ctx, points, projection, color, weight, dashed, arrows) {
    if (points.length < 2) return;
    const positions = points.map(projection);
    ctx.beginPath();
    positions.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(dashed ? [4, 6] : []);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!arrows) return;
    let since = 0;
    for (let index = 1; index < positions.length; index++) {
      const [x, y] = positions[index];
      const [previousX, previousY] = positions[index - 1];
      const span = Math.hypot(x - previousX, y - previousY);
      since += span;
      if (since < 70 && index !== positions.length - 1) continue;
      const fraction = index === positions.length - 1 ? .86 : .64;
      if (span > 8) {
        arrow(ctx, mix(previousX, x, fraction), mix(previousY, y, fraction),
          Math.atan2(y - previousY, x - previousX), color, weight * 2.15);
      }
      since = 0;
    }
  }

  function mark(ctx, id, projection, active, abbreviated) {
    const [x, y] = projection(JOURNEY_POINTS[id]);
    const [, , name, side = 'top'] = JOURNEY_POINTS[id];
    const radius = active ? 6.2 : 3;
    if (active) {
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#f6a18239';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#fba585' : ink;
    ctx.fill();
    ctx.strokeStyle = active ? '#fae0b8' : '#253630';
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();
    const offset = active ? 18 : 9;
    const textX = x + (side === 'right' ? offset : side === 'left' ? -offset : 0);
    const textY = y + (side === 'top' ? -offset : side === 'bottom' ? offset + 3 : 0);
    ctx.textAlign = side === 'right' ? 'left' : side === 'left' ? 'right' : 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${active ? '700' : '500'} ${active ? 17 : (abbreviated ? 10 : 12)}px "Microsoft YaHei", sans-serif`;
    ctx.strokeStyle = '#1e312d';
    ctx.lineWidth = 3.6;
    ctx.strokeText(name, textX, textY);
    ctx.fillStyle = ink;
    ctx.fillText(name, textX, textY);
    return [x, y];
  }

  function mount(canvas, sceneId, { animated = false, onCard, onArrive } = {}) {
    const ctx = canvas.getContext('2d');
    const overview = !sceneId;
    const [destination, start, end, extra] = JOURNEY_CUES[sceneId] || ['yudu', 0, 28, 'overview'];
    const [targetX, targetY] = JOURNEY_POINTS[destination];
    const [startX, startY] = JOURNEY_POINTS[JOURNEY_MAIN[start]];
    const short = Boolean(SCENES.find(scene => scene.id === sceneId)?.choices);
    const duration = short ? 1950 : 3350;
    let raf;
    let startTime;
    let progress = animated ? 0 : 1;
    let finished = !animated;
    let sizeX = 0;
    let sizeY = 0;
    let density = 1;
    let fullRoute = false;
    let scaleFactor = 1;
    let offsetX = 0;
    let offsetY = 0;
    const pointers = new Map();
    canvas.tabIndex = overview ? 0 : -1;

    function draw() {
      if (!sizeX || !sizeY) return;
      const narrow = sizeX < 540;
      const approach = ease(clamp(progress / .77));
      const settle = ease(clamp(progress / .83));
      const wide = overview || fullRoute || extra === 'other' || extra === 'meetings';
      const meetings = extra === 'meetings' && !fullRoute;
      const zoomFactor = wide ? mix(1, meetings ? 1.38 : 1, settle) : mix(1.42, 1.62, settle);
      const scale = Math.min(sizeX / 1155, sizeY / 790) * zoomFactor * scaleFactor;
      const centerX = wide ? mix(width / 2, targetX + 20, meetings ? settle : 0) : mix(startX, targetX, approach);
      const centerY = wide ? mix(height / 2, targetY, meetings ? settle : 0) : mix(startY, targetY, approach);
      const originX = (wide ? sizeX * .50 : sizeX * mix(.54, .45, settle)) + offsetX;
      const originY = (wide ? sizeY * .50 : sizeY * .46) + offsetY;
      const projection = ([x, y]) => [(x - centerX) * scale + originX, (y - centerY) * scale + originY];

      ctx.setTransform(density, 0, 0, density, 0, 0);
      ctx.fillStyle = '#20332f';
      ctx.fillRect(0, 0, sizeX, sizeY);
      const [terrainX, terrainY] = projection([0, 0]);
      ctx.drawImage(backdrop(), terrainX, terrainY, width * scale, height * scale);

      ctx.fillStyle = '#dfd1aa67';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `500 ${narrow ? 10 : 15}px "Microsoft YaHei", sans-serif`;
      for (const region of [[950, 520, '赣南'], [734, 685, '湘桂边'], [490, 370, '黔北'], [224, 578, '滇北'],
        [169, 199, '川西'], [436, 176, '甘南'], [731, 50, '陕北']]) {
        ctx.fillText(region[2], ...projection(region));
      }

      line(ctx, JOURNEY_MAIN.map(id => JOURNEY_POINTS[id]), projection, '#eaa38562', 1.8, true, false);
      const travelled = overview ? end : mix(start, end, approach);
      line(ctx, prefix(JOURNEY_MAIN, travelled), projection, red, narrow ? 2.6 : 3.7, false, true);
      if (overview || extra === 'other' || extra === 'meetings') {
        const secondaryProgress = overview || extra === 'meetings' ? 1 : approach;
        for (const { path, color } of JOURNEY_OTHER) {
          line(ctx, prefix(path, secondaryProgress * (path.length - 1)), projection, color, narrow ? 1.2 : 2, true, true);
        }
        if (overview || extra === 'meetings') {
          for (const { path, color } of JOURNEY_MEETINGS) {
            line(ctx, prefix(path, approach * (path.length - 1)), projection, color, 2, true, true);
          }
        }
      }

      const marks = narrow && wide
        ? ['yudu', 'xiangjiang', 'zunyi', 'jinsha', 'jiajin', 'wuqi', 'huining', 'ganzi']
        : JOURNEY_LANDMARKS;
      for (const id of marks) {
        if (!overview && id === destination) continue;
        if (!overview && extra !== 'other' && extra !== 'meetings' && !JOURNEY_MAIN.includes(id)) continue;
        const [px, py] = projection(JOURNEY_POINTS[id]);
        if (px < 16 || py < 12 || px > sizeX - 16 || py > sizeY - 12) continue;
        if (!wide && Math.hypot(px - originX, py - originY) < 54 && settle > .75) continue;
        mark(ctx, id, projection, false, narrow);
      }
      if (!overview) {
        const [x, y] = mark(ctx, destination, projection, true, narrow);
        onCard?.(progress >= .56, x, y, sizeX, sizeY);
      }

      const vignette = ctx.createRadialGradient(sizeX * .5, sizeY * .49, sizeY * .16, sizeX * .5, sizeY * .49, Math.max(sizeX, sizeY) * .68);
      vignette.addColorStop(0, '#10171100');
      vignette.addColorStop(1, '#10171183');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, sizeX, sizeY);
    }

    function size() {
      sizeX = Math.round(canvas.clientWidth);
      sizeY = Math.round(canvas.clientHeight);
      density = Math.min(window.devicePixelRatio || 1, 2);
      if (!sizeX || !sizeY) return;
      canvas.width = sizeX * density;
      canvas.height = sizeY * density;
      draw();
    }

    function pan(dx, dy, render = true) {
      offsetX = Math.max(-sizeX * scaleFactor, Math.min(sizeX * scaleFactor, offsetX + dx));
      offsetY = Math.max(-sizeY * scaleFactor, Math.min(sizeY * scaleFactor, offsetY + dy));
      if (render) draw();
    }

    function zoom(multiplier, x = sizeX / 2, y = sizeY / 2) {
      const before = scaleFactor;
      scaleFactor = Math.max(.7, Math.min(4.5, scaleFactor * multiplier));
      const ratio = scaleFactor / before;
      const isWide = overview || fullRoute || extra === 'other' || extra === 'meetings';
      pan((offsetX + sizeX * (isWide ? .5 : .45) - x) * (ratio - 1),
        (offsetY + sizeY * (isWide ? .5 : .46) - y) * (ratio - 1));
    }

    function fit() {
      fullRoute = true;
      scaleFactor = 1;
      offsetX = 0;
      offsetY = 0;
      draw();
    }

    const gestures = new AbortController();
    const signal = gestures.signal;
    canvas.addEventListener('pointerdown', event => {
      if (!finished || (event.pointerType === 'mouse' && event.button !== 0)) return;
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('map-dragging');
    }, { signal });
    canvas.addEventListener('pointermove', event => {
      const before = pointers.get(event.pointerId);
      if (!before) return;
      const after = [event.clientX, event.clientY];
      pointers.set(event.pointerId, after);
      const other = [...pointers].find(([key]) => key !== event.pointerId)?.[1];
      if (!other) {
        pan(after[0] - before[0], after[1] - before[1]);
        return;
      }
      const startDistance = Math.hypot(other[0] - before[0], other[1] - before[1]);
      const endDistance = Math.hypot(other[0] - after[0], other[1] - after[1]);
      const bounds = canvas.getBoundingClientRect();
      pan((after[0] - before[0]) / 2, (after[1] - before[1]) / 2, false);
      zoom(startDistance < 5 ? 1 : endDistance / startDistance,
        (after[0] + other[0]) / 2 - bounds.left, (after[1] + other[1]) / 2 - bounds.top);
    }, { signal });
    function releasePointer(event) {
      pointers.delete(event.pointerId);
      if (!pointers.size) canvas.classList.remove('map-dragging');
    }
    canvas.addEventListener('pointerup', releasePointer, { signal });
    canvas.addEventListener('pointercancel', releasePointer, { signal });
    canvas.addEventListener('lostpointercapture', releasePointer, { signal });
    canvas.addEventListener('wheel', event => {
      if (!finished) return;
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - bounds.left, event.clientY - bounds.top);
    }, { signal, passive: false });
    canvas.addEventListener('keydown', event => {
      if (!finished) return;
      const bindings = {
        ArrowLeft: () => pan(38, 0), ArrowRight: () => pan(-38, 0),
        ArrowUp: () => pan(0, 38), ArrowDown: () => pan(0, -38),
        '+': () => zoom(1.25), '=': () => zoom(1.25), '-': () => zoom(1 / 1.25), Home: fit,
      };
      if (!Object.hasOwn(bindings, event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      bindings[event.key]();
    }, { signal });

    function finish() {
      if (finished) return;
      window.cancelAnimationFrame(raf);
      finished = true;
      progress = 1;
      draw();
      onArrive?.();
    }

    function tick(now) {
      if (startTime === undefined) startTime = now;
      progress = clamp((now - startTime) / duration);
      if (progress === 1) finish();
      else {
        draw();
        raf = window.requestAnimationFrame(tick);
      }
    }

    const observer = new ResizeObserver(size);
    observer.observe(canvas);
    size();
    if (animated) raf = window.requestAnimationFrame(tick);

    return {
      finish,
      fit,
      zoom,
      dispose() {
        window.cancelAnimationFrame(raf);
        observer.disconnect();
        gestures.abort();
      },
    };
  }

  return { mount };
})();
