// Code evaluated inside the browser page. Kept as plain JS strings so the
// server bundler can't inject helpers that don't exist in the page context.

function call(fn: string, ...args: unknown[]): string {
  return `(${fn})(${args.map(arg => JSON.stringify(arg)).join(',')})`
}

const SLIM_HTML = `function (maxText, maxChars) {
  var DROP = ['script','style','noscript','svg','img','iframe','link','meta','picture','video','template'];
  var KEEP = ['id','class','name','type','placeholder','aria-label','role','itemprop','data-testid','data-test'];
  var KEEP_REPEATED = 2;
  var root = document.body.cloneNode(true);
  root.querySelectorAll(DROP.join(',')).forEach(function (el) { el.remove(); });
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  var comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach(function (c) { c.remove(); });
  var all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
  all.forEach(function (el) {
    Array.prototype.slice.call(el.attributes).forEach(function (attr) {
      if (KEEP.indexOf(attr.name) === -1) el.removeAttribute(attr.name);
    });
  });
  all.forEach(function (parent) {
    if (parent !== root && !root.contains(parent)) return;
    var seen = {}, omitted = {};
    Array.prototype.slice.call(parent.children).forEach(function (child) {
      var sig = child.tagName.toLowerCase() + '|' + (child.getAttribute('class') || '');
      seen[sig] = (seen[sig] || 0) + 1;
      if (seen[sig] > KEEP_REPEATED) { omitted[sig] = (omitted[sig] || 0) + 1; child.remove(); }
    });
    Object.keys(omitted).forEach(function (sig) {
      parent.appendChild(document.createComment(' ' + omitted[sig] + ' more <' + sig.split('|')[0] + '> siblings omitted '));
    });
  });
  var textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  var texts = [];
  while (textWalker.nextNode()) texts.push(textWalker.currentNode);
  texts.forEach(function (t) { t.nodeValue = t.nodeValue.replace(/\\s+/g, ' ').trim().slice(0, maxText); });
  return root.innerHTML.replace(/>\\s+</g, '><').trim().slice(0, maxChars);
}`

const INSPECT_INPUT = `function (selector) {
  var el;
  try { el = document.querySelector(selector); } catch (e) { return { error: 'invalid selector' }; }
  if (!el) return { error: 'not found' };
  var rect = el.getBoundingClientRect();
  var style = getComputedStyle(el);
  var visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  var isText = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  return { visible: visible, enabled: !el.disabled && !el.readOnly, isText: isText };
}`

const READ_CARDS = `function (spec, limit) {
  var cards;
  try { cards = document.querySelectorAll(spec.card); } catch (e) { return { error: 'invalid card selector' }; }
  var rows = [];
  for (var i = 0; i < cards.length && (limit === 0 || i < limit); i++) {
    var name = null, price = null;
    try {
      var n = cards[i].querySelector(spec.name);
      var p = cards[i].querySelector(spec.price);
      name = n ? (n.innerText || n.textContent || '').trim() : null;
      price = p ? (p.innerText || p.textContent || '').trim() : null;
    } catch (e) { return { error: 'invalid name/price selector' }; }
    rows.push({ name: name, priceText: price });
  }
  return { count: cards.length, rows: rows };
}`

const DISMISS_OVERLAYS = `function () {
  var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
  var match = buttons.find(function (b) {
    var text = (b.innerText || '').toLowerCase();
    return (text.indexOf('aceptar') !== -1 || text.indexOf('accept') !== -1) && b.offsetParent !== null;
  });
  if (match) { match.click(); return true; }
  return false;
}`

export const pageScripts = {
  slimHtml: (maxText: number, maxChars: number) => call(SLIM_HTML, maxText, maxChars),
  inspectInput: (selector: string) => call(INSPECT_INPUT, selector),
  readCards: (spec: ProductSpec, limit: number) => call(READ_CARDS, spec, limit),
  dismissOverlays: () => call(DISMISS_OVERLAYS),
  domSize: () => 'document.body ? document.body.innerHTML.length : 0',
  scrollToBottom: () => 'window.scrollBy(0, document.body.scrollHeight)',
  scrollToTop: () => 'window.scrollTo(0, 0)',
}

export interface SearchSpec {
  selector: string
}

export interface ProductSpec {
  card: string
  name: string
  price: string
}

export interface InputInspection {
  error?: string
  visible?: boolean
  enabled?: boolean
  isText?: boolean
}

export interface CardsReading {
  error?: string
  count?: number
  rows?: { name: string | null; priceText: string | null }[]
}
