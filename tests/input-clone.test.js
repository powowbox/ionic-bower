'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// Exercise the shipped methods without booting Angular or requiring a browser.
function fixture(file) {
  const source = fs.readFileSync(file, 'utf8');
  const frames = [];
  const animations = [];
  const elements = [];
  const container = {
    querySelector: () => input,
    querySelectorAll: selector => elements.filter(e => e.classList.contains(selector.slice(1))),
    insertBefore: e => { elements.unshift(e); e.parentElement = container; },
    removeChild: e => elements.splice(elements.indexOf(e), 1)
  };
  function element() {
    const classes = new Set();
    return {
      value: 'invalid', style: {}, scrollTop: 0, parentElement: container,
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
      cloneNode: element, focus() { this.focused = true; }
    };
  }
  const input = element();
  elements.push(input);
  const ionic = {
    requestAnimationFrame: callback => frames.push(callback),
    keyboard: { isOpen: true, isClosing: false },
    tap: { isTextInput: e => !!e, isDateInput: () => false }
  };
  const context = vm.createContext({
    ionic, easeInOutCubic() {}, easeOutCubic() {},
    zyngaCore: { effect: { Animate: {
      start(step, verify, completed) { animations.push({ step, completed }); return animations.length; },
      stop() {}
    } } }
  });
  function method(name) {
    const marker = '\n  ' + name + ': ';
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, name);
    const end = source.indexOf('\n  },', start);
    return vm.runInContext('(' + source.slice(start + marker.length, end + 4) + ')', context);
  }
  ionic.tap.cloneFocusedInput = method('cloneFocusedInput');
  ionic.tap.removeClonedInputs = method('removeClonedInputs');
  const scroll = {
    __container: container, __scrollLeft: 0, __scrollTop: 1, __zoomLevel: 1,
    __maxScrollLeft: 0, __maxScrollTop: 1,
    options: { scrollingY: true, scrollingX: false, animating: true, scrollingComplete() {} },
    __fadeScrollbars() {},
    scrollTo: method('scrollTo'), __publish: method('__publish'),
    __scrollingComplete: method('__scrollingComplete')
  };
  return {
    input, scroll, ionic, container, elements,
    clone: () => ionic.tap.cloneFocusedInput(container),
    flush() {
      for (let count = 0; frames.length; count++) {
        assert.ok(count < 20, 'animation-frame queue must settle');
        frames.splice(0).forEach(callback => callback());
      }
    },
    finishAnimation() {
      const id = animations.length;
      animations[id - 1].step(1, 0, true);
      animations[id - 1].completed(60, id, true);
    },
    assertRestored() {
      assert.equal(elements.length, 1, 'read-only clone removed');
      assert.equal(input.classList.contains('previous-input-focus'), false, 'real input visible');
      assert.equal(input.focused, true, 'real input focused again');
      assert.equal(ionic.tap.hasCheckedClone, false, 'future keyboard openings can clone again');
    }
  };
}

for (const artifact of ['ionic.js', 'ionic.bundle.js']) {
  const file = path.join(process.env.IONIC_TEST_ROOT || path.join(__dirname, '..'), 'js', artifact);
  for (const target of [1, 1000]) {
    test(`${artifact}: restore a pending clone when target ${target} is already at the scroll limit`, () => {
      const f = fixture(file);
      for (let opening = 0; opening < 3; opening++) {
        f.clone();
        f.scroll.scrollTo(0, target, true);
        f.flush();
        f.assertRestored();
      }
    });
  }
  test(`${artifact}: restore inputs after an explicit non-animated scroll`, () => {
    const f = fixture(file);
    f.clone();
    f.scroll.scrollTo(0, 0, false);
    f.flush();
    assert.equal(f.scroll.__scrollTop, 0);
    f.assertRestored();
  });
  test(`${artifact}: leave clones in place until a real animation finishes`, () => {
    const f = fixture(file);
    f.clone();
    f.scroll.scrollTo(0, 0, true);
    f.flush();
    assert.equal(f.elements.length, 2);
    f.finishAnimation();
    f.flush();
    f.assertRestored();
  });
  for (const flag of ['__isAnimating', '__isDragging', '__isDecelerating']) {
    test(`${artifact}: skip deferred cleanup when ${flag} starts before the next frame`, () => {
      const f = fixture(file);
      f.clone();
      f.scroll.scrollTo(0, 1, true);
      f.scroll[flag] = true;
      f.flush();
      assert.equal(f.elements.length, 2);
      f.scroll[flag] = false;
      f.scroll.__scrollingComplete();
      f.flush();
      f.assertRestored();
    });
  }
  test(`${artifact}: ignore a destroyed scroll view before deferred cleanup`, () => {
    const f = fixture(file);
    f.scroll.scrollTo(0, 1, true);
    delete f.scroll.__container;
    assert.doesNotThrow(() => f.flush());
  });
}
