const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const script = fs.readFileSync('content.js', 'utf8');
const blocked = '[data-yt-shorts-blocked]';
async function page(html, path = '/') {
  const dom = new JSDOM(html, { url: `https://www.youtube.com${path}`, runScripts: 'outside-only', pretendToBeVisual: true });
  const observers = [];
  const Observer = dom.window.MutationObserver;
  dom.window.MutationObserver = class extends Observer {
    constructor(callback) { super(callback); observers.push(this); }
  };
  const close = dom.window.close.bind(dom.window);
  dom.window.close = () => { observers.forEach(observer => observer.disconnect()); close(); };
  dom.window.chrome = { storage: { local: { get: async () => ({redirectShorts: true}) }, onChanged: {addListener() {}} } };
  dom.window.eval(script);
  await settle();
  return dom;
}
const settle = () => new Promise(resolve => setTimeout(resolve, 60));
test('mixed shelves retain ordinary cards and ambiguous labels', async () => {
  const dom = await page(`<ytd-shelf-renderer><ytd-video-renderer id="normal"><a id="thumbnail" href="/watch?v=1"></a></ytd-video-renderer><ytd-video-renderer id="short"><a id="thumbnail" href="/shorts/abc"></a></ytd-video-renderer></ytd-shelf-renderer><yt-chip-cloud-chip-renderer>How to sew shorts</yt-chip-cloud-chip-renderer>`);
  try {
    const d = dom.window.document;
    assert.equal(d.querySelector('ytd-shelf-renderer').matches(blocked), false);
    assert.equal(d.querySelector('#normal').matches(blocked), false);
    assert.equal(d.querySelector('#short').matches(blocked), true);
    assert.equal(d.querySelector('yt-chip-cloud-chip-renderer').matches(blocked), false);
  } finally { dom.window.close(); }
});
test('links validate origin and explicit route shapes', async () => {
  const safe = ['/shortstories', '/watch?next=/shorts/a', '/c/shorts/videos', 'https://example.com/shorts/a'];
  const shorts = ['/shorts/a', '/@name/shorts', '/channel/UC123/shorts', '/c/name/shorts', '/user/name/shorts'];
  const dom = await page([...safe, ...shorts].map(href => `<a href="${href}">link</a>`).join(''));
  try { assert.deepEqual(Array.from(dom.window.document.querySelectorAll('a'), a => a.matches(blocked)), [...safe.map(() => false), ...shorts.map(() => true)]); }
  finally { dom.window.close(); }
});
test('recycled cards recover after href-only updates without altering site styles', async () => {
  const dom = await page('<ytd-video-renderer style="color:red"><a id="thumbnail" href="/shorts/a"></a></ytd-video-renderer>');
  try {
    const card = dom.window.document.querySelector('ytd-video-renderer');
    assert.equal(card.matches(blocked), true);
    card.querySelector('a').setAttribute('href', '/watch?v=a');
    await settle();
    assert.equal(card.matches(blocked), false);
    assert.equal(card.querySelector('a').matches(blocked), false);
    assert.equal(card.getAttribute('style'), 'color:red');
    assert.equal(card.hasAttribute('hidden'), false);
  } finally { dom.window.close(); }
});
test('text-node updates reevaluate controls', async () => {
  const dom = await page('<yt-chip-cloud-chip-renderer>Shorts</yt-chip-cloud-chip-renderer>');
  try {
    const chip = dom.window.document.querySelector('yt-chip-cloud-chip-renderer');
    assert.equal(chip.matches(blocked), true);
    chip.firstChild.data = 'Videos';
    await settle();
    assert.equal(chip.matches(blocked), false);
  } finally { dom.window.close(); }
});
test('search recovery selects All only once and never guesses another filter', async () => {
  const dom = await page('<div><yt-chip-cloud-chip-renderer><button>Videos</button></yt-chip-cloud-chip-renderer><yt-chip-cloud-chip-renderer><button aria-selected="false">Shorts</button></yt-chip-cloud-chip-renderer><yt-chip-cloud-chip-renderer><button>All</button></yt-chip-cloud-chip-renderer></div>', '/results?search_query=test');
  try {
    const buttons = dom.window.document.querySelectorAll('button');
    let all = 0, videos = 0;
    buttons[0].onclick = () => videos++;
    buttons[2].onclick = () => all++;
    buttons[1].setAttribute('aria-selected', 'true');
    await settle();
    dom.window.dispatchEvent(new dom.window.Event('yt-page-data-updated'));
    await settle();
    assert.equal(all, 1); assert.equal(videos, 0);
  } finally { dom.window.close(); }
});
test('missing All does not trigger reload or arbitrary clicks', async () => {
  const dom = await page('<div><yt-chip-cloud-chip-renderer><button>Videos</button></yt-chip-cloud-chip-renderer><yt-chip-cloud-chip-renderer><button aria-selected="true">Shorts</button></yt-chip-cloud-chip-renderer></div>', '/results?sp=test');
  try {
    assert.equal(dom.window.location.search, '?sp=test');
    assert.equal(dom.window.document.querySelector('button').matches('[aria-selected=true]'), false);
  } finally { dom.window.close(); }
});
test('direct redirects run after preferences load before DOMContentLoaded, preserving channel parents', async () => {
  const vm = require('node:vm');
  for (const [path, destination] of [['/shorts/abc', '/'], ['/@creator/shorts', '/@creator'], ['/c/shorts/videos', null]]) {
    const calls = [];
    const context = {
      URL,
      chrome: { storage: { local: { get: async () => ({redirectShorts: true}) }, onChanged: {addListener() {}} } },
      location: { href: `https://www.youtube.com${path}`, origin: 'https://www.youtube.com', replace: url => calls.push(url) },
      document: { readyState: 'loading', addEventListener() {} }
    };
    vm.runInNewContext(script, context);
    await settle();
    assert.deepEqual(calls, destination === null ? [] : [`https://www.youtube.com${destination}`]);
  }
});
test('nested recycled renderers are restored and new cards are processed', async () => {
  const dom = await page('<main></main>');
  try {
    dom.window.document.querySelector('main').innerHTML = '<ytd-rich-item-renderer><ytd-rich-grid-media><a id="thumbnail" href="/shorts/a"></a></ytd-rich-grid-media></ytd-rich-item-renderer>';
    await settle();
    assert.equal(dom.window.document.querySelectorAll(blocked).length, 3);
    dom.window.document.querySelector('a').href = '/watch?v=a';
    await settle();
    assert.equal(dom.window.document.querySelectorAll(blocked).length, 0);
  } finally { dom.window.close(); }
});
test('explicit Shorts shelves hide headers and recover when reused as ordinary shelves', async () => {
  const dom = await page('<ytd-rich-section-renderer><div><ytd-rich-shelf-renderer is-shorts><h2>Shorts</h2><ytm-shorts-lockup-view-model></ytm-shorts-lockup-view-model></ytd-rich-shelf-renderer></div></ytd-rich-section-renderer><ytd-rich-shelf-renderer id="mixed"><h2>Recommendations</h2><a href="/shorts/a">Short</a><a href="/watch?v=a">Normal</a></ytd-rich-shelf-renderer>');
  try {
    const shelf = dom.window.document.querySelector('[is-shorts]');
    assert.equal(shelf.matches(blocked), true);
    assert.equal(dom.window.document.querySelector('#mixed').matches(blocked), false);
    shelf.removeAttribute('is-shorts');
    shelf.innerHTML = '<h2>Regular videos</h2>';
    await settle();
    assert.equal(shelf.matches(blocked), false);
    shelf.setAttribute('is-shorts', '');
    await settle();
    assert.equal(shelf.matches(blocked), true);
  } finally { dom.window.close(); }
});
test('saved off preference prevents early redirects; live changes apply without reload', async () => {
  const vm = require('node:vm');
  const calls = [];
  let changed, resolve;
  const context = { URL, location: {href:'https://www.youtube.com/shorts/abc', origin:'https://www.youtube.com', replace:url=>calls.push(url)}, document:{readyState:'loading',addEventListener(){}}, chrome:{storage:{local:{get:()=>new Promise(r=>resolve=r)},onChanged:{addListener:fn=>changed=fn}}}};
  vm.runInNewContext(script,context);
  assert.equal(calls.length,0);
  resolve({redirectShorts:false});
  await settle();
  assert.equal(calls.length,0);
  changed({redirectShorts:{newValue:true}},'local');
  assert.deepEqual(calls,['https://www.youtube.com/']);
});
test('a stale initial storage read cannot override a newer preference', async () => {
  const vm = require('node:vm');
  const calls=[]; let changed, resolve;
  vm.runInNewContext(script,{URL,location:{href:'https://www.youtube.com/shorts/abc',origin:'https://www.youtube.com',replace:url=>calls.push(url)},document:{readyState:'loading',addEventListener(){}},chrome:{storage:{local:{get:()=>new Promise(r=>resolve=r)},onChanged:{addListener:fn=>changed=fn}}}});
  changed({redirectShorts:{newValue:false}},'local');
  resolve({redirectShorts:true});
  await settle();
  assert.equal(calls.length,0);
});
test('popup loads, saves, and restores the toggle after a write failure', async () => {
  const dom = new JSDOM(fs.readFileSync('popup.html','utf8'),{runScripts:'outside-only'});
  try {
    const writes=[]; let fail=false;
    dom.window.chrome={storage:{local:{get:async()=>({redirectShorts:false}),set:async value=>{if(fail)throw Error('test');writes.push(value.redirectShorts);}}}};
    dom.window.eval(fs.readFileSync('popup.js','utf8'));
    await settle();
    const toggle=dom.window.document.querySelector('input');
    assert.equal(toggle.checked,false); assert.equal(toggle.disabled,false);
    toggle.click(); await settle();
    assert.deepEqual(writes,[true]);
    fail=true; toggle.click(); await settle();
    assert.equal(toggle.checked,true);
    assert.match(dom.window.document.querySelector('#status').textContent,/Could not save/);
  } finally {dom.window.close();}
});
