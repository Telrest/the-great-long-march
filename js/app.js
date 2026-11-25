(() => {
  'use strict';

  const cover = document.querySelector('#title-screen');
  const overview = document.querySelector('#route-overview');
  const overviewMap = document.querySelector('#overview-map');
  const reader = document.querySelector('#scene');
  const frame = document.querySelector('#frame');
  const chapterName = document.querySelector('#chapter-name');
  const progress = document.querySelector('#progress');
  const pageNumber = document.querySelector('#page-number');
  const start = document.querySelector('#start');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const soundButtons = [...document.querySelectorAll('[data-sound]')];
  const narrator = new Audio();
  narrator.preload = 'auto';
  const visited = new Set();

  let sceneIndex = 0;
  let renderVersion = 0;
  let soundEnabled = true;
  let cancelBeat = null;
  let restartBeat = null;
  let replayNarration = null;
  let activeMap = null;
  let activeGallery = null;
  let victoryFilmTimer;

  progress.max = SCENES.length;

  function updateProgressLabel(index) {
    const page = index + 1;
    progress.style.setProperty('--progress-fill', (index / (SCENES.length - 1) * 100) + '%');
    progress.setAttribute('aria-valuetext', '第 ' + page + ' 幕，' + SCENES[index].title);
    pageNumber.textContent = page + ' / ' + SCENES.length;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, action) {
    const node = element('button', 'button ' + className, text);
    node.type = 'button';
    if (action) node.addEventListener('click', action);
    return node;
  }

  function cancelPlayback() {
    renderVersion += 1;
    window.clearTimeout(victoryFilmTimer);
    cancelBeat?.();
    cancelBeat = null;
    restartBeat = null;
    replayNarration = null;
    activeMap?.dispose();
    activeMap = null;
    activeGallery?.dispose();
    activeGallery = null;
  }

  function showSoundSetting() {
    for (const control of soundButtons) {
      control.textContent = soundEnabled ? '旁白：开' : '旁白：关';
      control.setAttribute('aria-pressed', String(soundEnabled));
    }
  }

  function waitForBeat({ voice, cue, delay }, advance, status) {
    const began = performance.now();
    let timer;
    let attempt = 0;

    function stop() {
      attempt += 1;
      window.clearTimeout(timer);
      narrator.onended = null;
      narrator.onerror = null;
      narrator.onplaying = null;
      narrator.pause();
    }

    function end() {
      stop();
      cancelBeat = null;
      restartBeat = null;
      advance();
    }

    function restart() {
      stop();
      const version = attempt;
      const source = cue ? 'choice-failure.wav' : (voice ? voice + '.mp3' : null);

      function timedReading() {
        if (version !== attempt) return;
        stop();
        if (status) status.textContent = '本页播放中';
        timer = window.setTimeout(end, Math.max(0, delay - (performance.now() - began)));
      }

      if (!source || !soundEnabled) {
        timedReading();
        return;
      }

      narrator.src = 'assets/narration/' + source;
      narrator.onended = end;
      narrator.onerror = timedReading;
      narrator.onplaying = () => {
        window.clearTimeout(timer);
        if (status) status.textContent = cue ? '正在播放结果音效' : '正在播放旁白';
      };
      timer = window.setTimeout(timedReading, 4500);
      narrator.play().catch(timedReading);
    }

    cancelBeat = stop;
    restartBeat = restart;
    restart();
  }

  function sourceList(keys, library = SOURCES, label = '史料出处') {
    const details = element('details', 'sources');
    details.append(element('summary', '', label));
    const list = element('ul');
    for (const key of keys) {
      const [title, url] = library[key];
      const link = element('a', '', title);
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const item = element('li');
      item.append(link);
      list.append(item);
    }
    details.append(list);
    return details;
  }

  function poemLines(poem, className) {
    const quote = element('blockquote', className);
    quote.cite = poem.source;
    for (const line of poem.lines) quote.append(element('span', '', line));
    return quote;
  }

  function poemSource(label, url) {
    const link = element('a', '', label);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function makeScenePoem(poem) {
    const figure = element('figure', 'scene-poem');
    const credit = element('figcaption');
    credit.append('毛泽东《' + poem.title + '》节选', poemSource('出处 ↗', poem.source));
    figure.append(poemLines(poem, 'scene-poem-lines'), credit, element('p', 'scene-poem-note', poem.note));
    return figure;
  }

  function photoCaption([title, description, author, license]) {
    const label = element('span', '', '资料照片 · ' + description);
    const attribution = element('span', 'photo-attribution');
    const source = element('a', '', author);
    source.href = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(title.replaceAll(' ', '_'));
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    const publicDomain = license === 'zero/1.0';
    const terms = element('a', '', publicDomain ? 'CC0 1.0' : 'CC ' + license.toUpperCase().replace('/', ' '));
    terms.href = 'https://creativecommons.org/' + (publicDomain ? 'publicdomain/' : 'licenses/') + license + '/';
    terms.target = '_blank';
    terms.rel = 'noopener noreferrer';
    attribution.append(source, ' · ', terms, ' · 缩放裁切');
    return [label, attribution];
  }

  function makeVisual(pictures, isFailure = false) {
    const figure = element('figure', 'visual scene-gallery');
    const backdrop = element('div', 'story-backdrop');
    backdrop.setAttribute('aria-hidden', 'true');
    const caption = element('figcaption', 'gallery-caption');
    const controls = element('div', 'gallery-controls');
    const indicator = element('span', 'gallery-count');
    const images = [];
    const backdropImages = [];
    let current = 0;
    let timer;
    let visible = false;
    let paused = reduceMotion.matches;

    for (const { bg, art, photo, position = 'center', zoom = 1 } of pictures) {
      const picture = element('img', 'scene-art');
      if (photo) {
        picture.src = 'assets/photo/' + photo + '.jpg';
        picture.alt = PHOTO_LIBRARY[photo][1];
        picture.dataset.photo = photo;
      } else {
        picture.src = 'assets/img/' + bg;
        picture.alt = art;
      }
      picture.decoding = 'async';
      picture.style.objectPosition = photo === 'yudu' ? 'left center' : position;
      picture.style.transformOrigin = position;
      picture.style.setProperty('--art-zoom', zoom);
      images.push(picture);
      figure.append(picture);
      const backgroundImage = picture.cloneNode();
      backgroundImage.className = 'story-backdrop-image';
      backgroundImage.alt = '';
      backdropImages.push(backgroundImage);
      backdrop.append(backgroundImage);
    }

    function select(index) {
      current = (index + pictures.length) % pictures.length;
      for (const [position, picture] of images.entries()) {
        const selected = position === current;
        picture.classList.toggle('current-art', selected);
        picture.setAttribute('aria-hidden', String(!selected));
        backdropImages[position].classList.toggle('current-backdrop', selected);
      }
      const { photo, art } = pictures[current];
      if (photo) caption.replaceChildren(...photoCaption(PHOTO_LIBRARY[photo]));
      else caption.textContent = (isFailure ? '情境推演插画 · ' : '历史情境插画 · ') + art;
      indicator.textContent = (current + 1) + ' / ' + pictures.length;
    }

    function schedule() {
      window.clearTimeout(timer);
      if (visible && !paused && pictures.length > 1 && !caption.contains(document.activeElement)) {
        timer = window.setTimeout(() => step(1), 5000);
      }
    }

    function step(delta) {
      select(current + delta);
      schedule();
    }

    if (pictures.length > 1) {
      const prev = button('‹', 'gallery-arrow', () => step(-1));
      const next = button('›', 'gallery-arrow', () => step(1));
      const toggle = button('', 'gallery-toggle', () => {
        paused = !paused;
        updateToggle();
        schedule();
      });
      function updateToggle() {
        toggle.textContent = paused ? '播放' : '暂停';
        toggle.setAttribute('aria-label', paused ? '继续轮播画面' : '暂停轮播画面');
      }
      prev.setAttribute('aria-label', '上一幅画面');
      next.setAttribute('aria-label', '下一幅画面');
      updateToggle();
      controls.append(prev, indicator, next, toggle);
      figure.append(controls);
      caption.addEventListener('focusin', () => window.clearTimeout(timer));
      caption.addEventListener('focusout', event => {
        if (!caption.contains(event.relatedTarget)) queueMicrotask(schedule);
      });
    }
    figure.append(caption);
    select(0);

    return {
      figure,
      backdrop,
      setVisible(value) {
        visible = value;
        schedule();
      },
      dispose() {
        visible = false;
        window.clearTimeout(timer);
      },
    };
  }

  function mountMapControls(container, route) {
    const smaller = button('−', 'map-step', () => route.zoom(1 / 1.25));
    const larger = button('+', 'map-step', () => route.zoom(1.25));
    smaller.setAttribute('aria-label', '缩小地图');
    larger.setAttribute('aria-label', '放大地图');
    const full = button('全程', 'map-fit', () => route.fit());
    full.setAttribute('aria-label', '重置并显示全程路线');
    container.replaceChildren(smaller, larger, full);
  }

  function prepareJourneyVisual(gallery, scene, animated) {
    const { figure } = gallery;
    const map = element('div', 'chapter-map');
    const canvas = element('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', scene.place + ' · 行程示意');
    const caption = element('span', 'chapter-map-caption', '沿途地点 · 路线示意');
    const controls = element('div', 'map-controls');
    const postcard = element('figure', 'map-postcard');
    const thumbnail = element('img');
    thumbnail.src = 'assets/img/' + scene.bg;
    thumbnail.alt = '';
    postcard.append(thumbnail, element('figcaption', '', scene.place));
    postcard.setAttribute('aria-hidden', 'true');
    map.append(canvas, caption, postcard, controls);
    figure.append(map);

    let arrived = !animated;
    let showMap = animated;
    let skipping = false;
    let lifting;
    let lift;
    let photoFade;
    let travel;

    function update() {
      figure.classList.toggle('map-on', showMap);
      map.classList.toggle('map-explorer', arrived);
      control.textContent = !arrived ? '跳过过场' : (showMap ? '进入场景' : '看路线');
      map.setAttribute('aria-hidden', String(!showMap));
      map.inert = !showMap;
      canvas.tabIndex = showMap && arrived ? 0 : -1;
      controls.hidden = !arrived;
      figure.querySelector('.gallery-caption').inert = showMap;
      const galleryControls = figure.querySelector('.gallery-controls');
      if (galleryControls) galleryControls.inert = showMap;
      gallery.setVisible(!showMap);
      caption.textContent = arrived ? '中央红军 · 实线已走，虚线待走' : '沿途地点 · 路线示意';
    }

    const control = button('', 'cut-control', () => {
      if (!arrived) finish();
      else {
        showMap = !showMap;
        if (showMap) travel.fit();
        update();
      }
    });
    figure.append(control);
    update();

    function finish() {
      if (arrived) return;
      skipping = true;
      if (lifting) lifting.finish();
      else travel.finish();
    }

    return {
      mount(onArrive) {
        function showScene() {
          if (arrived) return;
          lift?.remove();
          postcard.classList.remove('map-card-lifting');
          arrived = true;
          showMap = false;
          update();
          onArrive();
        }

        function expandCard() {
          if (skipping || reduceMotion.matches || !postcard.animate) {
            showScene();
            return;
          }
          const rect = thumbnail.getBoundingClientRect();
          const stage = figure.getBoundingClientRect();
          const art = thumbnail.cloneNode();
          const revealed = figure.querySelector('.current-art').cloneNode();
          revealed.className = 'lift-art';
          revealed.alt = '';
          lift = element('div', 'picture-lift');
          lift.setAttribute('aria-hidden', 'true');
          lift.append(art, revealed);
          figure.append(lift);
          postcard.classList.add('map-card-lifting');
          lifting = lift.animate([
            { left: (rect.left - stage.left) + 'px', top: (rect.top - stage.top) + 'px',
              width: rect.width + 'px', height: rect.height + 'px', borderRadius: '3px' },
            { left: '0px', top: '0px', width: stage.width + 'px', height: stage.height + 'px', borderRadius: '0px' },
          ], { duration: 1050, easing: 'cubic-bezier(.19,.72,.22,1)', fill: 'forwards' });
          photoFade = revealed.animate([{ opacity: 0 }, { opacity: 1 }],
            { delay: 390, duration: 660, easing: 'ease-in-out', fill: 'forwards' });
          lifting.onfinish = showScene;
        }

        travel = Journey.mount(canvas, scene.id, {
          animated,
          onCard(visible, x, y, width, height) {
            postcard.classList.toggle('map-postcard-on', visible);
            const cardWidth = postcard.offsetWidth;
            const cardHeight = postcard.offsetHeight;
            if (!cardWidth || !cardHeight) return;
            const right = x + 26;
            const left = Math.max(10, Math.min(width - cardWidth - 10, right));
            const top = Math.max(10, Math.min(height - cardHeight - 38, y + 26));
            postcard.style.left = left + 'px';
            postcard.style.top = top + 'px';
          },
          onArrive: expandCard,
        });
        mountMapControls(controls, travel);
        return {
          finish,
          dispose() {
            lifting?.cancel();
            photoFade?.cancel();
            travel.dispose();
          },
        };
      },
    };
  }

  function buildClues(clues) {
    const list = element('dl', 'clues');
    for (const [label, text] of clues) {
      const card = element('div', 'clue');
      card.append(element('dt', '', label), element('dd', '', text));
      list.append(card);
    }
    return list;
  }

  function buildTimeline(scene, units) {
    const figure = element('figure', 'route-sketch');
    figure.append(element('figcaption', '', '四次渡河的时间与方向'));
    const list = element('ol', 'timeline');
    for (const [index, [date, title, direction]] of scene.timeline.entries()) {
      const stop = element('li', 'timeline-stop');
      const time = element('span', 'timeline-date', date);
      const name = element('strong', '', title);
      stop.append(time, name, element('span', 'timeline-direction', direction));
      list.append(stop);
      units.push({ node: stop, delay: 880, voice: scene.id + '-timeline-' + (index + 1) });
    }
    figure.append(list);
    return figure;
  }

  function buildNumbers(numbers) {
    const list = element('dl', 'numbers');
    list.setAttribute('aria-label', '中央红军在两个时点的人数');
    for (const [label, value] of numbers) {
      const item = element('div');
      item.append(element('dt', '', label), element('dd', '', value));
      list.append(item);
    }
    return list;
  }

  function play(units, finish, instant, status, revealAll, skipMap) {
    cancelBeat?.();
    cancelBeat = null;
    restartBeat = null;
    const version = renderVersion;
    let nextIndex = 0;
    let done = false;

    function show(node) {
      if (!node) return;
      node.hidden = false;
      node.classList.add('shown');
    }

    function complete() {
      if (done || version !== renderVersion) return;
      done = true;
      cancelBeat?.();
      cancelBeat = null;
      restartBeat = null;
      for (const { node } of units) show(node);
      status.textContent = '';
      revealAll.hidden = true;
      revealAll.onclick = null;
      finish();
    }

    function revealNext() {
      if (done || version !== renderVersion) return;
      const unit = units[nextIndex++];
      show(unit.node);
      if (nextIndex === units.length && (!soundEnabled || (!unit.voice && !unit.cue))) {
        complete();
      } else {
        waitForBeat(unit, nextIndex === units.length ? complete : revealNext, status);
      }
    }

    if (instant || !units.length) {
      complete();
      return;
    }

    for (const { node } of units) node?.classList.add('reveal');
    revealAll.onclick = () => {
      skipMap?.();
      complete();
    };
    revealAll.hidden = false;
    status.textContent = '本页播放中';
    revealNext();
  }

  function move(delta) {
    const nextIndex = sceneIndex + delta;
    if (nextIndex < 0 || nextIndex >= SCENES.length) return;
    sceneIndex = nextIndex;
    render();
  }

  function render(mode = 'story', instant = false, autoVictoryFilm = true) {
    cancelPlayback();
    const scene = SCENES[sceneIndex];
    const isStory = mode === 'story';
    const isFailure = mode === 'failure';
    const content = isStory ? scene : scene[mode];
    const question = isStory && scene.choices;
    const narrated = isStory && !question;
    const pictures = [isFailure ? content : scene];
    if (!isFailure) {
      for (const photo of SCENE_PHOTOS[scene.id]) pictures.push({ photo });
    }
    const closeup = SCENE_CLOSEUPS[scene.id];
    if (!isFailure && closeup) pictures.push({ bg: scene.bg, ...closeup });
    const gallery = makeVisual(pictures, isFailure);
    activeGallery = gallery;
    const alreadyRead = isStory && visited.has(scene.id);
    const animatedMap = isStory && !instant && !alreadyRead && !reduceMotion.matches;
    const lastPage = sceneIndex === SCENES.length - 1;

    cover.hidden = true;
    overview.hidden = true;
    reader.hidden = false;
    chapterName.textContent = CHAPTERS[scene.chapter];
    progress.value = sceneIndex + 1;
    updateProgressLabel(sceneIndex);
    frame.dataset.scene = scene.id;
    frame.dataset.mode = mode;
    delete frame.dataset.slide;
    frame.classList.toggle('film', narrated);

    const panel = element('article', 'story-panel');
    const heading = element('header', 'scene-heading');
    const label = isFailure
      ? (content.label || '情境推演')
      : (mode === 'review' ? '历史回看' : (scene.situational ? '情境选择' : ''));
    if (label) heading.append(element('p', 'mode-label', label));

    const title = element('h1', '', content.title);
    title.id = 'scene-title';
    title.tabIndex = -1;
    heading.append(element('p', 'scene-date', scene.date + ' · ' + scene.place), title);
    panel.append(heading);

    const narration = element('div', 'narration');
    const units = isFailure ? [{ cue: true, delay: 0 }] : [];
    const voicePrefix = isStory ? scene.id : scene.id + '-' + mode;
    for (const [index, text] of content.paras.entries()) {
      const paragraph = element('p', '', text);
      narration.append(paragraph);
      units.push({
        node: paragraph,
        delay: Math.min(6900, Math.max(2600, text.length * 62)),
        voice: voicePrefix + '-' + (index + 1),
      });
    }
    panel.append(narration);

    if (isStory && scene.numbers) {
      const numbers = buildNumbers(scene.numbers);
      panel.append(numbers);
      units.push({ node: numbers, delay: 900, voice: 'xiangjiang-numbers' });
    }
    if (question && scene.clues) {
      panel.append(buildClues(scene.clues));
      units.push({ voice: scene.id + '-clues', delay: 0 });
    }
    if (question && scene.timeline) panel.append(buildTimeline(scene, units));

    const decision = element('section', 'decision');
    decision.hidden = true;
    if (question) {
      decision.append(element('h2', 'question', scene.question));
      const options = element('div', 'options');
      for (const [index, choice] of scene.choices.entries()) {
        const option = button('', 'option', () => render(choice.historical ? 'review' : 'failure'));
        option.append(element('span', 'option-key', String.fromCharCode(65 + index)), document.createTextNode(choice.label));
        options.append(option);
      }
      decision.append(options);
      panel.append(decision);
      units.push({ node: scene.timeline ? decision : undefined, voice: scene.id + '-question', delay: 0 });
    }

    const poem = JOURNEY_POEMS[scene.id];
    if (poem && !isFailure) panel.append(makeScenePoem(poem));

    const allowSources = !isFailure && !question;
    const sources = allowSources ? sourceList(scene.sources) : null;
    if (sources) {
      sources.hidden = true;
      panel.append(sources);
    }

    const footer = element('footer', 'scene-controls');
    const status = element('span', 'playback-status');
    status.setAttribute('role', 'status');
    const revealAll = button('立即显示全文', 'text-button');
    revealAll.hidden = true;
    const readAgain = button('重听本页', 'text-button replay-audio', () => {
      soundEnabled = true;
      showSoundSetting();
      startReading(true);
    });
    readAgain.hidden = true;
    const readingTools = element('div', 'reading-tools');
    readingTools.append(status, revealAll, readAgain);
    const navigation = element('div', 'navigation');
    let next;

    if (isFailure) {
      next = button('回到选择', 'primary forward', () => render('story', true));
    } else if (lastPage) {
      next = button('播放纪念短片 →', 'primary forward', showVictoryFilm);
    } else if (!question) {
      next = button('下一页 →', 'primary forward', () => move(1));
    }
    if (sceneIndex > 0 && isStory) {
      navigation.append(button('← 上一页', 'secondary', () => move(-1)));
    }
    if (next) {
      next.hidden = true;
      navigation.append(next);
    }
    footer.append(readingTools, navigation);
    panel.append(footer);

    const surface = element('div', 'scene-layout');
    const visual = gallery.figure;
    const shot = isStory ? prepareJourneyVisual(gallery, scene, animatedMap) : null;
    const storySide = element('div', 'story-side');
    storySide.append(gallery.backdrop, panel);
    surface.append(visual, storySide);
    frame.replaceChildren(surface);
    if (!shot) gallery.setVisible(true);
    document.title = content.title + ' · 长征模拟器';
    window.scrollTo(0, 0);
    if (document.activeElement !== progress) title.focus({ preventScroll: true });

    function startReading(replay = false) {
      window.clearTimeout(victoryFilmTimer);
      readAgain.hidden = true;
      if (question && !scene.timeline) decision.hidden = false;
      replayNarration = () => startReading(true);
      play(replay && isFailure ? units.slice(1) : units, () => {
        if (isStory) visited.add(scene.id);
        if (question) decision.hidden = false;
        if (sources) sources.hidden = false;
        if (next) next.hidden = false;
        readAgain.hidden = false;
        if (isStory && lastPage && autoVictoryFilm) {
          victoryFilmTimer = window.setTimeout(showVictoryFilm, soundEnabled && !instant ? 2000 : 5500);
        }
        if (document.activeElement === revealAll) {
          (question ? decision.querySelector('button') : (next || title)).focus();
        }
      }, !replay && (instant || alreadyRead), status, revealAll, () => activeMap?.finish());
    }
    const waitForArrival = animatedMap && question;
    activeMap = shot?.mount(() => {
      if (waitForArrival) {
        startReading();
      }
    }) || null;
    if (!waitForArrival) startReading();
  }

  function showVictoryFilm() {
    cancelPlayback();
    frame.dataset.mode = 'victory-film';
    frame.classList.remove('film');
    chapterName.textContent = '长征胜利 · 纪念短片';
    pageNumber.textContent = '';

    const panel = element('article', 'victory-film');
    const title = element('h1', '', '万里长风');
    title.id = 'scene-title';
    title.tabIndex = -1;
    panel.append(title, element('p', 'victory-film-credit', '央视新闻 · 纪念红军长征胜利90周年 MV'));

    const playerCard = element('div', 'film-player-card');
    const player = element('iframe', 'film-player');
    player.src = 'https://player.bilibili.com/player.html?bvid=BV1LrJR6aEh6&autoplay=0&poster=1&danmaku=0';
    player.title = '哔哩哔哩播放器 · 万里长风';
    player.allowFullscreen = true;

    const playerActions = element('div', 'film-player-actions');
    const watch = element('a', 'button film-link', '在哔哩哔哩观看 ↗');
    watch.href = 'https://www.bilibili.com/video/BV1LrJR6aEh6/';
    watch.target = '_blank';
    watch.rel = 'noopener noreferrer';
    playerActions.append(element('p', '', '站内无法播放时，可打开原视频。'), watch);
    playerCard.append(player, playerActions);

    const actions = element('div', 'victory-film-actions');
    const back = button('← 回到会师', 'secondary', () => render('story', true, false));
    const continueReading = button('查看长征胜利的意义 →', 'secondary film-continue', () => renderEpilogue(0));
    actions.append(back, continueReading);
    panel.append(playerCard, actions);

    frame.replaceChildren(panel);
    document.title = '万里长风 · 长征模拟器';
    window.scrollTo(0, 0);
    title.focus({ preventScroll: true });
  }

  function renderEpilogue(index) {
    const slide = EPILOGUE[index];
    const last = index === EPILOGUE.length - 1;
    cancelPlayback();
    frame.dataset.mode = 'epilogue';
    frame.dataset.slide = index + 1;
    frame.classList.remove('film');
    chapterName.textContent = '尾声';
    pageNumber.textContent = '';

    const hero = element('header', 'epilogue-hero');
    const heading = element('h1', 'epilogue-hero-title', '长征的伟大意义');
    heading.tabIndex = -1;
    hero.append(heading);

    const poemCredit = element('div', 'epilogue-poem-credit');
    poemCredit.append('毛泽东《' + LONG_MARCH_POEM.title + '》',
      poemSource('查看国家档案局公布的手迹 ↗', LONG_MARCH_POEM.source));

    const card = element('article', 'epilogue-slide');
    const body = element('div', 'epilogue-body');
    const title = element('h2', '', slide.title);
    title.id = 'scene-title';
    title.tabIndex = -1;
    body.append(title, element('p', 'epilogue-trail', slide.trail));
    for (const paragraph of slide.paragraphs) body.append(element('p', 'epilogue-paragraph', paragraph));
    body.append(sourceList(slide.sources, EPILOGUE_SOURCES));
    card.append(body);

    const speech = element('div', 'epilogue-speech');
    const status = element('span', 'playback-status');
    status.setAttribute('role', 'status');
    const stop = button('停止旁白', 'text-button');
    stop.hidden = true;
    const replay = button('重听本页', 'text-button', () => {
      soundEnabled = true;
      showSoundSetting();
      startNarration();
    });
    const units = slide.paragraphs.map((_, paragraph) => ({
      voice: 'epilogue-' + (index + 1) + '-' + (paragraph + 1), delay: 0,
    }));
    function startNarration() {
      if (soundEnabled) play(units, () => {}, false, status, stop);
    }
    replayNarration = startNarration;
    speech.append(replay, stop, status);

    const navigation = element('nav', 'epilogue-navigation');
    navigation.setAttribute('aria-label', '尾声翻页');
    const back = button(index === 0 ? '← 回到会师' : '← 上一页', 'secondary slide-back', () => {
      if (index === 0) render('story', true, false);
      else renderEpilogue(index - 1);
    });
    const forward = button(last ? '再次品味' : '下一页 →', 'primary forward', () => {
      if (last) showCover();
      else renderEpilogue(index + 1);
    });
    const pages = element('span', 'epilogue-page', (index + 1) + ' / ' + EPILOGUE.length);
    pages.setAttribute('aria-label', '第 ' + (index + 1) + ' 页，共 ' + EPILOGUE.length + ' 页');
    navigation.append(back, pages, forward);
    const content = element('div', 'epilogue-content');
    content.append(poemCredit, card, speech, navigation);
    frame.replaceChildren(hero, poemLines(LONG_MARCH_POEM, 'epilogue-poem'), content);
    document.title = slide.title + ' · 长征模拟器';
    window.scrollTo(0, 0);
    (index === 0 ? heading : title).focus({ preventScroll: true });
    startNarration();
  }

  function showCover() {
    cancelPlayback();
    reader.hidden = true;
    overview.hidden = true;
    cover.hidden = false;
    document.title = '长征模拟器 · 1934—1936';
    window.scrollTo(0, 0);
    start.focus();
  }

  function showOverview() {
    cancelPlayback();
    cover.hidden = true;
    reader.hidden = true;
    overview.hidden = false;
    window.scrollTo(0, 0);
    document.querySelector('#overview-title').focus({ preventScroll: true });
    activeMap = Journey.mount(overviewMap);
    mountMapControls(document.querySelector('#overview-map-controls'), activeMap);
    waitForBeat({ voice: 'overview', delay: 0 }, () => {});
  }

  const key = document.querySelector('#map-key');
  for (const { name, color } of [{ name: '中央红军', color: '#ef886d' }, ...JOURNEY_OTHER]) {
    const item = element('li', '', name);
    item.style.setProperty('--route-color', color);
    key.append(item);
  }
  for (const control of soundButtons) {
    control.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      showSoundSetting();
      if (restartBeat) restartBeat();
      else if (soundEnabled && !overview.hidden) waitForBeat({ voice: 'overview', delay: 0 }, () => {});
      else if (soundEnabled) replayNarration?.();
    });
  }
  showSoundSetting();

  start.addEventListener('click', showOverview);
  document.querySelector('#begin-journey').addEventListener('click', () => {
    sceneIndex = 0;
    visited.clear();
    render();
  });
  document.querySelector('#home').addEventListener('click', showCover);

  progress.addEventListener('input', () => updateProgressLabel(progress.valueAsNumber - 1));
  progress.addEventListener('change', () => {
    const targetIndex = progress.valueAsNumber - 1;
    if (targetIndex === sceneIndex && frame.dataset.mode === 'story') return;
    sceneIndex = targetIndex;
    progress.focus({ preventScroll: true });
    render('story', true, false);
  });

  document.addEventListener('keydown', event => {
    if (event.repeat || reader.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('button, a, summary, input')) return;
    if (event.key === 'ArrowLeft' && frame.dataset.mode === 'epilogue') {
      event.preventDefault();
      frame.querySelector('.slide-back').click();
      return;
    }
    if (event.key === 'ArrowLeft' && frame.dataset.mode === 'story' && sceneIndex > 0) {
      event.preventDefault();
      move(-1);
    }
    if (event.key === 'ArrowRight') {
      const next = frame.querySelector('.forward:not([hidden])');
      if (next) {
        event.preventDefault();
        next.click();
      }
    }
  });

  const query = new URLSearchParams(window.location.search);
  const namedScene = SCENES.findIndex(scene => scene.id === query.get('scene'));
  const legacyIndex = Number.parseInt(query.get('s'), 10);
  const previewIndex = namedScene >= 0 ? namedScene : legacyIndex;
  if (Number.isInteger(previewIndex) && previewIndex >= 0 && previewIndex < SCENES.length) {
    soundEnabled = query.get('sound') === '1';
    showSoundSetting();
    sceneIndex = previewIndex;
    render('story', query.get('instant') === '1');
  }
})();
