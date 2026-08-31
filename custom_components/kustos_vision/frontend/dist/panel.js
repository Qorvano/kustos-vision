const ze = "kustos-vision-reloaded";
if (customElements.get("kustos-vision-panel") !== void 0) {
  let t = 0;
  try {
    t = Number(sessionStorage.getItem(ze) ?? 0);
  } catch {
  }
  if (Date.now() - t > 3e4) {
    try {
      sessionStorage.setItem(ze, String(Date.now()));
    } catch {
    }
    location.reload();
  }
}
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ge = globalThis, _e = ge.ShadowRoot && (ge.ShadyCSS === void 0 || ge.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Se = Symbol(), Pe = /* @__PURE__ */ new WeakMap();
let Ye = class {
  constructor(e, s, i) {
    if (this._$cssResult$ = !0, i !== Se) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = s;
  }
  get styleSheet() {
    let e = this.o;
    const s = this.t;
    if (_e && e === void 0) {
      const i = s !== void 0 && s.length === 1;
      i && (e = Pe.get(s)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && Pe.set(s, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const at = (t) => new Ye(typeof t == "string" ? t : t + "", void 0, Se), B = (t, ...e) => {
  const s = t.length === 1 ? t[0] : e.reduce((i, r, a) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + t[a + 1], t[0]);
  return new Ye(s, t, Se);
}, nt = (t, e) => {
  if (_e) t.adoptedStyleSheets = e.map((s) => s instanceof CSSStyleSheet ? s : s.styleSheet);
  else for (const s of e) {
    const i = document.createElement("style"), r = ge.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = s.cssText, t.appendChild(i);
  }
}, Be = _e ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let s = "";
  for (const i of e.cssRules) s += i.cssText;
  return at(s);
})(t) : t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: ot, defineProperty: lt, getOwnPropertyDescriptor: ht, getOwnPropertyNames: dt, getOwnPropertySymbols: ct, getPrototypeOf: ut } = Object, fe = globalThis, Re = fe.trustedTypes, pt = Re ? Re.emptyScript : "", gt = fe.reactiveElementPolyfillSupport, re = (t, e) => t, be = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? pt : null;
      break;
    case Object:
    case Array:
      t = t == null ? t : JSON.stringify(t);
  }
  return t;
}, fromAttribute(t, e) {
  let s = t;
  switch (e) {
    case Boolean:
      s = t !== null;
      break;
    case Number:
      s = t === null ? null : Number(t);
      break;
    case Object:
    case Array:
      try {
        s = JSON.parse(t);
      } catch {
        s = null;
      }
  }
  return s;
} }, Ae = (t, e) => !ot(t, e), Ne = { attribute: !0, type: String, converter: be, reflect: !1, useDefault: !1, hasChanged: Ae };
Symbol.metadata ??= Symbol("metadata"), fe.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let J = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, s = Ne) {
    if (s.state && (s.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((s = Object.create(s)).wrapped = !0), this.elementProperties.set(e, s), !s.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(e, i, s);
      r !== void 0 && lt(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, s, i) {
    const { get: r, set: a } = ht(this.prototype, e) ?? { get() {
      return this[s];
    }, set(n) {
      this[s] = n;
    } };
    return { get: r, set(n) {
      const l = r?.call(this);
      a?.call(this, n), this.requestUpdate(e, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Ne;
  }
  static _$Ei() {
    if (this.hasOwnProperty(re("elementProperties"))) return;
    const e = ut(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(re("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(re("properties"))) {
      const s = this.properties, i = [...dt(s), ...ct(s)];
      for (const r of i) this.createProperty(r, s[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const s = litPropertyMetadata.get(e);
      if (s !== void 0) for (const [i, r] of s) this.elementProperties.set(i, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [s, i] of this.elementProperties) {
      const r = this._$Eu(s, i);
      r !== void 0 && this._$Eh.set(r, s);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const s = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const r of i) s.unshift(Be(r));
    } else e !== void 0 && s.push(Be(e));
    return s;
  }
  static _$Eu(e, s) {
    const i = s.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
  }
  addController(e) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
  }
  removeController(e) {
    this._$EO?.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), s = this.constructor.elementProperties;
    for (const i of s.keys()) this.hasOwnProperty(i) && (e.set(i, this[i]), delete this[i]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return nt(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, s, i) {
    this._$AK(e, i);
  }
  _$ET(e, s) {
    const i = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, i);
    if (r !== void 0 && i.reflect === !0) {
      const a = (i.converter?.toAttribute !== void 0 ? i.converter : be).toAttribute(s, i.type);
      this._$Em = e, a == null ? this.removeAttribute(r) : this.setAttribute(r, a), this._$Em = null;
    }
  }
  _$AK(e, s) {
    const i = this.constructor, r = i._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const a = i.getPropertyOptions(r), n = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : be;
      this._$Em = r;
      const l = n.fromAttribute(s, a.type);
      this[r] = l ?? this._$Ej?.get(r) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, s, i, r = !1, a) {
    if (e !== void 0) {
      const n = this.constructor;
      if (r === !1 && (a = this[e]), i ??= n.getPropertyOptions(e), !((i.hasChanged ?? Ae)(a, s) || i.useDefault && i.reflect && a === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, i)))) return;
      this.C(e, s, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, s, { useDefault: i, reflect: r, wrapped: a }, n) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? s ?? this[e]), a !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (s = void 0), this._$AL.set(e, s)), r === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (s) {
      Promise.reject(s);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [r, a] of this._$Ep) this[r] = a;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [r, a] of i) {
        const { wrapped: n } = a, l = this[r];
        n !== !0 || this._$AL.has(r) || l === void 0 || this.C(r, void 0, a, l);
      }
    }
    let e = !1;
    const s = this._$AL;
    try {
      e = this.shouldUpdate(s), e ? (this.willUpdate(s), this._$EO?.forEach((i) => i.hostUpdate?.()), this.update(s)) : this._$EM();
    } catch (i) {
      throw e = !1, this._$EM(), i;
    }
    e && this._$AE(s);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    this._$EO?.forEach((s) => s.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq &&= this._$Eq.forEach((s) => this._$ET(s, this[s])), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
J.elementStyles = [], J.shadowRootOptions = { mode: "open" }, J[re("elementProperties")] = /* @__PURE__ */ new Map(), J[re("finalized")] = /* @__PURE__ */ new Map(), gt?.({ ReactiveElement: J }), (fe.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ee = globalThis, He = (t) => t, me = Ee.trustedTypes, Ue = me ? me.createPolicy("lit-html", { createHTML: (t) => t }) : void 0, Xe = "$lit$", L = `lit$${Math.random().toFixed(9).slice(2)}$`, Qe = "?" + L, bt = `<${Qe}>`, F = document, ae = () => F.createComment(""), ne = (t) => t === null || typeof t != "object" && typeof t != "function", Ce = Array.isArray, mt = (t) => Ce(t) || typeof t?.[Symbol.iterator] == "function", $e = `[ 	
\f\r]`, te = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Me = /-->/g, Ie = />/g, K = RegExp(`>|${$e}(?:([^\\s"'>=/]+)(${$e}*=${$e}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Le = /'/g, je = /"/g, et = /^(?:script|style|textarea|title)$/i, vt = (t) => (e, ...s) => ({ _$litType$: t, strings: e, values: s }), o = vt(1), Q = Symbol.for("lit-noChange"), h = Symbol.for("lit-nothing"), Ve = /* @__PURE__ */ new WeakMap(), W = F.createTreeWalker(F, 129);
function tt(t, e) {
  if (!Ce(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ue !== void 0 ? Ue.createHTML(e) : e;
}
const ft = (t, e) => {
  const s = t.length - 1, i = [];
  let r, a = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = te;
  for (let l = 0; l < s; l++) {
    const c = t[l];
    let p, b, g = -1, S = 0;
    for (; S < c.length && (n.lastIndex = S, b = n.exec(c), b !== null); ) S = n.lastIndex, n === te ? b[1] === "!--" ? n = Me : b[1] !== void 0 ? n = Ie : b[2] !== void 0 ? (et.test(b[2]) && (r = RegExp("</" + b[2], "g")), n = K) : b[3] !== void 0 && (n = K) : n === K ? b[0] === ">" ? (n = r ?? te, g = -1) : b[1] === void 0 ? g = -2 : (g = n.lastIndex - b[2].length, p = b[1], n = b[3] === void 0 ? K : b[3] === '"' ? je : Le) : n === je || n === Le ? n = K : n === Me || n === Ie ? n = te : (n = K, r = void 0);
    const C = n === K && t[l + 1].startsWith("/>") ? " " : "";
    a += n === te ? c + bt : g >= 0 ? (i.push(p), c.slice(0, g) + Xe + c.slice(g) + L + C) : c + L + (g === -2 ? l : C);
  }
  return [tt(t, a + (t[s] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class oe {
  constructor({ strings: e, _$litType$: s }, i) {
    let r;
    this.parts = [];
    let a = 0, n = 0;
    const l = e.length - 1, c = this.parts, [p, b] = ft(e, s);
    if (this.el = oe.createElement(p, i), W.currentNode = this.el.content, s === 2 || s === 3) {
      const g = this.el.content.firstChild;
      g.replaceWith(...g.childNodes);
    }
    for (; (r = W.nextNode()) !== null && c.length < l; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const g of r.getAttributeNames()) if (g.endsWith(Xe)) {
          const S = b[n++], C = r.getAttribute(g).split(L), T = /([.?@])?(.*)/.exec(S);
          c.push({ type: 1, index: a, name: T[2], strings: C, ctor: T[1] === "." ? wt : T[1] === "?" ? $t : T[1] === "@" ? kt : ye }), r.removeAttribute(g);
        } else g.startsWith(L) && (c.push({ type: 6, index: a }), r.removeAttribute(g));
        if (et.test(r.tagName)) {
          const g = r.textContent.split(L), S = g.length - 1;
          if (S > 0) {
            r.textContent = me ? me.emptyScript : "";
            for (let C = 0; C < S; C++) r.append(g[C], ae()), W.nextNode(), c.push({ type: 2, index: ++a });
            r.append(g[S], ae());
          }
        }
      } else if (r.nodeType === 8) if (r.data === Qe) c.push({ type: 2, index: a });
      else {
        let g = -1;
        for (; (g = r.data.indexOf(L, g + 1)) !== -1; ) c.push({ type: 7, index: a }), g += L.length - 1;
      }
      a++;
    }
  }
  static createElement(e, s) {
    const i = F.createElement("template");
    return i.innerHTML = e, i;
  }
}
function ee(t, e, s = t, i) {
  if (e === Q) return e;
  let r = i !== void 0 ? s._$Co?.[i] : s._$Cl;
  const a = ne(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== a && (r?._$AO?.(!1), a === void 0 ? r = void 0 : (r = new a(t), r._$AT(t, s, i)), i !== void 0 ? (s._$Co ??= [])[i] = r : s._$Cl = r), r !== void 0 && (e = ee(t, r._$AS(t, e.values), r, i)), e;
}
class yt {
  constructor(e, s) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = s;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: s }, parts: i } = this._$AD, r = (e?.creationScope ?? F).importNode(s, !0);
    W.currentNode = r;
    let a = W.nextNode(), n = 0, l = 0, c = i[0];
    for (; c !== void 0; ) {
      if (n === c.index) {
        let p;
        c.type === 2 ? p = new he(a, a.nextSibling, this, e) : c.type === 1 ? p = new c.ctor(a, c.name, c.strings, this, e) : c.type === 6 && (p = new xt(a, this, e)), this._$AV.push(p), c = i[++l];
      }
      n !== c?.index && (a = W.nextNode(), n++);
    }
    return W.currentNode = F, r;
  }
  p(e) {
    let s = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, s), s += i.strings.length - 2) : i._$AI(e[s])), s++;
  }
}
class he {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, s, i, r) {
    this.type = 2, this._$AH = h, this._$AN = void 0, this._$AA = e, this._$AB = s, this._$AM = i, this.options = r, this._$Cv = r?.isConnected ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const s = this._$AM;
    return s !== void 0 && e?.nodeType === 11 && (e = s.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, s = this) {
    e = ee(this, e, s), ne(e) ? e === h || e == null || e === "" ? (this._$AH !== h && this._$AR(), this._$AH = h) : e !== this._$AH && e !== Q && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : mt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== h && ne(this._$AH) ? this._$AA.nextSibling.data = e : this.T(F.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: s, _$litType$: i } = e, r = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = oe.createElement(tt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === r) this._$AH.p(s);
    else {
      const a = new yt(r, this), n = a.u(this.options);
      a.p(s), this.T(n), this._$AH = a;
    }
  }
  _$AC(e) {
    let s = Ve.get(e.strings);
    return s === void 0 && Ve.set(e.strings, s = new oe(e)), s;
  }
  k(e) {
    Ce(this._$AH) || (this._$AH = [], this._$AR());
    const s = this._$AH;
    let i, r = 0;
    for (const a of e) r === s.length ? s.push(i = new he(this.O(ae()), this.O(ae()), this, this.options)) : i = s[r], i._$AI(a), r++;
    r < s.length && (this._$AR(i && i._$AB.nextSibling, r), s.length = r);
  }
  _$AR(e = this._$AA.nextSibling, s) {
    for (this._$AP?.(!1, !0, s); e !== this._$AB; ) {
      const i = He(e).nextSibling;
      He(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class ye {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, s, i, r, a) {
    this.type = 1, this._$AH = h, this._$AN = void 0, this.element = e, this.name = s, this._$AM = r, this.options = a, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = h;
  }
  _$AI(e, s = this, i, r) {
    const a = this.strings;
    let n = !1;
    if (a === void 0) e = ee(this, e, s, 0), n = !ne(e) || e !== this._$AH && e !== Q, n && (this._$AH = e);
    else {
      const l = e;
      let c, p;
      for (e = a[0], c = 0; c < a.length - 1; c++) p = ee(this, l[i + c], s, c), p === Q && (p = this._$AH[c]), n ||= !ne(p) || p !== this._$AH[c], p === h ? e = h : e !== h && (e += (p ?? "") + a[c + 1]), this._$AH[c] = p;
    }
    n && !r && this.j(e);
  }
  j(e) {
    e === h ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class wt extends ye {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === h ? void 0 : e;
  }
}
class $t extends ye {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== h);
  }
}
class kt extends ye {
  constructor(e, s, i, r, a) {
    super(e, s, i, r, a), this.type = 5;
  }
  _$AI(e, s = this) {
    if ((e = ee(this, e, s, 0) ?? h) === Q) return;
    const i = this._$AH, r = e === h && i !== h || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, a = e !== h && (i === h || r);
    r && this.element.removeEventListener(this.name, this, i), a && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class xt {
  constructor(e, s, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = s, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    ee(this, e);
  }
}
const _t = Ee.litHtmlPolyfillSupport;
_t?.(oe, he), (Ee.litHtmlVersions ??= []).push("3.3.3");
const St = (t, e, s) => {
  const i = s?.renderBefore ?? e;
  let r = i._$litPart$;
  if (r === void 0) {
    const a = s?.renderBefore ?? null;
    i._$litPart$ = r = new he(e.insertBefore(ae(), a), a, void 0, s ?? {});
  }
  return r._$AI(t), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Te = globalThis;
class k extends J {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const s = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = St(s, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return Q;
  }
}
k._$litElement$ = !0, k.finalized = !0, Te.litElementHydrateSupport?.({ LitElement: k });
const At = Te.litElementPolyfillSupport;
At?.({ LitElement: k });
(Te.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const O = (t) => (e, s) => {
  s !== void 0 ? s.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Et = { attribute: !0, type: String, converter: be, reflect: !1, hasChanged: Ae }, Ct = (t = Et, e, s) => {
  const { kind: i, metadata: r } = s;
  let a = globalThis.litPropertyMetadata.get(r);
  if (a === void 0 && globalThis.litPropertyMetadata.set(r, a = /* @__PURE__ */ new Map()), i === "setter" && ((t = Object.create(t)).wrapped = !0), a.set(s.name, t), i === "accessor") {
    const { name: n } = s;
    return { set(l) {
      const c = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(n, c, t, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(n, void 0, t, l), l;
    } };
  }
  if (i === "setter") {
    const { name: n } = s;
    return function(l) {
      const c = this[n];
      e.call(this, l), this.requestUpdate(n, c, t, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function u(t) {
  return (e, s) => typeof s == "object" ? Ct(t, e, s) : ((i, r, a) => {
    const n = r.hasOwnProperty(a);
    return r.constructor.createProperty(a, i), n ? Object.getOwnPropertyDescriptor(r, a) : void 0;
  })(t, e, s);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function d(t) {
  return u({ ...t, state: !0, attribute: !1 });
}
const f = "kustos_vision", Ke = 3600, Tt = 60;
class We {
  constructor(e) {
    this.hass = e, this.signatures = /* @__PURE__ */ new Map(), this.fragmentMaps = /* @__PURE__ */ new Map();
  }
  getConfig() {
    return this.hass.callWS({ type: `${f}/config/get` });
  }
  availableCameras() {
    return this.hass.callWS({ type: `${f}/cameras/available` });
  }
  suggest(e) {
    return this.hass.callWS({
      type: `${f}/camera/suggest`,
      entity_id: e
    });
  }
  /**
   * Save a camera. `replaceExisting` distinguishes editing from adding: without
   * it the command refuses to overwrite a camera that is already there, which
   * is what stops a new camera from silently taking over an existing one's
   * identifier and recording folder.
   */
  setCamera(e, s = !1) {
    return this.hass.callWS({
      type: `${f}/camera/set`,
      replace_existing: s,
      ...e
    });
  }
  deleteCamera(e) {
    return this.hass.callWS({ type: `${f}/camera/delete`, slug: e });
  }
  setViews(e) {
    return this.hass.callWS({ type: `${f}/views/set`, views: e });
  }
  /** Set the order of every camera in one view at once. */
  setViewOrder(e, s) {
    return this.hass.callWS({
      type: `${f}/view/order`,
      view_id: e,
      cameras: s
    });
  }
  setStorage(e) {
    return this.hass.callWS({ type: `${f}/storage/set`, ...e });
  }
  trigger(e, s, i) {
    return this.hass.callWS({
      type: `${f}/camera/trigger`,
      slug: e,
      capability: s,
      ...i === void 0 ? {} : { value: i }
    });
  }
  /**
   * Fetch a file endpoint with the credentials the panel already has.
   *
   * Used where the code does the fetching itself and can therefore set a
   * header. That is better than a signed URL in two ways: the address stays
   * the same between calls, so the browser cache can do its job when the
   * viewer seeks back over footage it already has, and nothing can expire
   * halfway through a long playback.
   */
  async authorizedFetch(e, s) {
    const i = this.hass.auth;
    if (!i?.data?.access_token)
      return fetch(await this.signedUrl(e), s);
    i.expired && await this.refreshAccessToken();
    const r = await this.tokenFetch(e, s);
    return r.status === 401 && i.refreshAccessToken ? (await this.refreshAccessToken(), this.tokenFetch(e, s)) : r;
  }
  /** The fetch itself, with whatever token the auth object holds right now. */
  tokenFetch(e, s) {
    const i = new Headers(s?.headers);
    return i.set(
      "Authorization",
      `Bearer ${this.hass.auth?.data?.access_token ?? ""}`
    ), fetch(e, { ...s, headers: i });
  }
  /**
   * Renew the access token, once, no matter how many requests need it.
   *
   * A seek fires the init and data fetches together; without the shared
   * promise each of them would trade the refresh token in separately.
   */
  refreshAccessToken() {
    return this.refreshing ??= Promise.resolve(this.hass.auth?.refreshAccessToken?.()).catch(() => {
    }).finally(() => {
      this.refreshing = void 0;
    }), this.refreshing;
  }
  /**
   * Sign a path so the browser can load it without a header.
   *
   * Signatures are kept until they are close to expiring. Handing out the same
   * address for the same file lets the browser cache it, which matters for
   * preview images: sweeping along the timeline would otherwise refetch a
   * picture the browser is already holding.
   */
  async signedUrl(e) {
    const s = this.signatures.get(e), i = Date.now();
    if (s && s.usableUntil > i) return s.url;
    const { path: r } = await this.hass.callWS({
      type: "auth/sign_path",
      path: e,
      expires: Ke
    });
    return this.signatures.set(e, {
      url: r,
      usableUntil: i + (Ke - Tt) * 1e3
    }), r;
  }
  recordingDays(e) {
    return this.hass.callWS({ type: `${f}/recordings/days`, camera: e });
  }
  timeline(e, s, i, r) {
    return this.hass.callWS({
      type: `${f}/recordings/timeline`,
      camera: e,
      from: s,
      to: i,
      ...r ? { stream: r } : {}
    });
  }
  setVision(e) {
    return this.hass.callWS({ type: `${f}/vision/set`, ...e });
  }
  deleteVision(e) {
    return this.hass.callWS({
      type: `${f}/vision/delete`,
      camera_slug: e
    });
  }
  analyseNow(e) {
    return this.hass.callWS({
      type: `${f}/vision/analyse`,
      camera_slug: e
    });
  }
  visionHistory(e) {
    return this.hass.callWS({
      type: `${f}/vision/history`,
      camera_slug: e
    });
  }
  aiTaskEntities() {
    return this.hass.callWS({ type: `${f}/vision/backends` });
  }
  /** Ask the Supervisor to reconnect the mount behind the recordings. */
  reconnectStorage() {
    return this.hass.callWS({ type: `${f}/storage/reconnect` });
  }
  /**
   * The byte map of one segment, so playback can start mid-file.
   *
   * Cached per path: finished segments never change, and a seek that hops
   * around one file must not walk its boxes on the server every time.
   */
  fragments(e) {
    const s = this.fragmentMaps.get(e);
    if (s) return s;
    const i = this.hass.callWS({ type: `${f}/recordings/fragments`, path: e }).catch((r) => {
      throw this.fragmentMaps.delete(e), r;
    });
    return this.fragmentMaps.set(e, i), i;
  }
  rebuildIndex() {
    return this.hass.callWS({ type: `${f}/index/rebuild` });
  }
}
function x(t) {
  if (t instanceof Error) return t.message;
  if (typeof t == "string") return t;
  if (t && typeof t == "object") {
    const e = t;
    if (typeof e.message == "string") return e.message;
    if (typeof e.error == "string") return e.error;
    if (typeof e.code == "string") return e.code;
    try {
      return JSON.stringify(t);
    } catch {
      return "Unbekannter Fehler";
    }
  }
  return t == null ? "Unbekannter Fehler" : String(t);
}
function ce(t) {
  if (t === null) return "unbekannt";
  const e = ["B", "kB", "MB", "GB", "TB"];
  let s = t, i = 0;
  for (; s >= 1e3 && i < e.length - 1; )
    s /= 1e3, i += 1;
  return `${s.toFixed(s < 10 && i > 0 ? 1 : 0)} ${e[i]}`;
}
const j = B`
  :host {
    /* The geometry the panel repeats, named once. Each maps onto Home
       Assistant's own variable where the theme system has one, so a theme
       that customises it moves the panel with it. */
    --kv-radius-card: var(--ha-card-border-radius, 12px);
    /* Pill-shaped, like Home Assistant's own buttons. */
    --kv-radius-button: 9999px;
    --kv-radius-field: 4px;
    /* Home Assistant's own content cap: ha-config-section centres its
       content at this width, so settings pages here do the same. */
    --kv-content-max-width: 1040px;
    display: block;
    color: var(--primary-text-color);
    background: var(--primary-background-color);
    min-height: 100%;
  }
  .card {
    background: var(--ha-card-background, var(--card-background-color, Canvas));
    border-radius: var(--kv-radius-card);
    /* Home Assistant's cards carry a border and no shadow; the permanent
       drop shadow was what made these read as foreign at first glance. */
    border: var(--ha-card-border-width, 1px) solid
      var(--ha-card-border-color, var(--divider-color, ButtonBorder));
    box-shadow: var(--ha-card-box-shadow, none);
    padding: 16px;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 1.15em;
    font-weight: 500;
  }
  h3 {
    margin: 20px 0 8px;
    font-size: 1em;
    font-weight: 500;
    color: var(--secondary-text-color);
  }
  p.hint {
    margin: 4px 0 12px;
    color: var(--secondary-text-color);
    font-size: 0.9em;
    line-height: 1.4;
  }
  button {
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: var(--kv-radius-button);
    padding: 8px 16px;
    min-height: 36px;
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  /* The hover state layer Home Assistant's buttons draw, as a neutral tint
     that works on filled and outlined variants in either theme. */
  button:hover:not(:disabled) {
    box-shadow: inset 0 0 0 999px rgba(127, 127, 127, 0.14);
  }
  button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  button.secondary {
    /* A text button, the way Home Assistant renders secondary actions. */
    background: transparent;
    color: var(--primary-color);
  }
  button.danger {
    /* Plain red text is how Home Assistant renders destructive actions;
       it also keeps rows of delete buttons from becoming a wall of red. */
    background: transparent;
    color: var(--error-color, #db4437);
  }
  button:disabled {
    cursor: default;
    box-shadow: none;
    /* Grey fill, like Home Assistant's disabled filled buttons. */
    background: var(--disabled-color, rgba(127, 127, 127, 0.3));
    color: var(--disabled-text-color, GrayText);
  }
  button.secondary:disabled,
  button.danger:disabled {
    background: transparent;
    color: var(--disabled-text-color, GrayText);
  }
  /* Controls that sit under a camera picture and must not push it around.
     They read as chips, which Home Assistant outlines. */
  button.compact {
    min-height: 0;
    min-width: 36px;
    padding: 6px 10px;
    font-size: 0.9em;
    border-color: var(--divider-color, ButtonBorder);
    color: var(--primary-text-color);
  }
  label {
    display: block;
    margin: 10px 0 4px;
    font-size: 0.85em;
    color: var(--secondary-text-color);
  }
  input:not([type="checkbox"]),
  select,
  .select-field {
    font: inherit;
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border: none;
    /* Longhands on purpose: as a shorthand, an unset --divider-color would
       reset border-style along with it and leave no line at all. */
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: var(
      --mdc-text-field-idle-line-color,
      var(--divider-color, ButtonBorder)
    );
    border-radius: var(--kv-radius-field) var(--kv-radius-field) 0 0;
    /* Filled with an underline, like Home Assistant's text fields. The old
       card-coloured outlined box disappeared into the card it sat on. */
    background: var(
      --mdc-text-field-fill-color,
      var(--secondary-background-color, Field)
    );
    color: var(--primary-text-color, FieldText);
  }
  select,
  .select-field {
    /* Without this the browser draws its own menulist chrome and ignores
       the field styling above, which stood out as a different box right
       next to identically styled inputs. */
    appearance: none;
    -webkit-appearance: none;
    padding-right: 32px;
    /* The dropdown chevron, drawn from two gradients so it follows the
       theme's text colour, which an image URL could not. */
    background-image:
      linear-gradient(45deg, transparent 50%, var(--secondary-text-color) 50%),
      linear-gradient(135deg, var(--secondary-text-color) 50%, transparent 50%);
    background-position:
      calc(100% - 18px) 50%,
      calc(100% - 13px) 50%;
    background-size: 5px 5px;
    background-repeat: no-repeat;
  }
  /* Number fields without the browser's stepper, like ha-textfield. */
  input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input:not([type="checkbox"]):focus,
  select:focus,
  .select-field:focus {
    outline: none;
    /* The second pixel of the focused underline, drawn without changing the
       box so nothing shifts when a field takes focus. */
    border-bottom-color: var(--primary-color);
    box-shadow: inset 0 -1px 0 0 var(--primary-color);
  }
  /* The closed face of the panel's own dropdown is a button, so the button
     rules above have to be walked back where they differ from a field. */
  .select-field {
    text-align: left;
    font-weight: normal;
    min-height: 36px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }
  .select-field:hover:not(:disabled) {
    box-shadow: none;
  }
  .select-field:disabled {
    background: var(
      --mdc-text-field-fill-color,
      var(--secondary-background-color, Field)
    );
    color: var(--disabled-text-color, GrayText);
  }
  /* The label worn inside the field, like ha-textfield: a label sitting
     directly on a field fuses with it into one filled block, the small text
     inside its top edge. Labels captioning anything else keep their place. */
  label:has(+ input:not([type="checkbox"])),
  label:has(+ select),
  label:has(+ kustos-vision-select) {
    background: var(
      --mdc-text-field-fill-color,
      var(--secondary-background-color, Field)
    );
    margin: 10px 0 0;
    padding: 6px 12px 0;
    border-radius: var(--kv-radius-field) var(--kv-radius-field) 0 0;
    font-size: 0.75em;
  }
  label:has(+ input:focus),
  label:has(+ select:focus),
  label:has(+ kustos-vision-select:focus-within) {
    color: var(--primary-color);
  }
  label:has(+ input:not([type="checkbox"])) + input,
  label:has(+ select) + select {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    padding-top: 4px;
  }
  /* Custom properties cross the shadow boundary, which lets the fused label
     reach the dropdown's inner field the same way. */
  label:has(+ kustos-vision-select) + kustos-vision-select {
    --kv-field-top-radius: 0;
    --kv-field-top-pad: 4px;
  }
  .select-field {
    border-top-left-radius: var(--kv-field-top-radius, var(--kv-radius-field));
    border-top-right-radius: var(--kv-field-top-radius, var(--kv-radius-field));
    padding-top: var(--kv-field-top-pad, 8px);
  }
  /* A checkbox wearing Home Assistant's switch: same element, same events,
     native look. Shaped like the current HA switch, a bordered pill track
     with the thumb riding inside it; the variables are the ones themes set
     for ha-switch. */
  input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    box-sizing: border-box;
    width: 44px;
    height: 24px;
    margin: 2px 0;
    flex: none;
    vertical-align: middle;
    border-radius: 12px;
    border: 1px solid
      var(--switch-unchecked-track-color, var(--divider-color, ButtonBorder));
    background: transparent;
    position: relative;
    cursor: pointer;
  }
  input[type="checkbox"]::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(
      --switch-unchecked-button-color,
      var(--secondary-text-color, ButtonText)
    );
    transition:
      left 90ms ease,
      background-color 90ms ease;
  }
  input[type="checkbox"]:checked {
    border-color: var(--switch-checked-color, var(--primary-color));
    background: var(
      --switch-checked-track-color,
      color-mix(in srgb, var(--primary-color) 25%, transparent)
    );
  }
  input[type="checkbox"]:checked::after {
    /* 100% is the track's inner width; thumb width plus the 2px inset. */
    left: calc(100% - 20px);
    background: var(--switch-checked-button-color, var(--primary-color));
  }
  input[type="checkbox"]:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 4px;
  }
  input[type="checkbox"]:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  .grow {
    flex: 1;
    min-width: 160px;
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .error {
    color: var(--error-color, #db4437);
  }
  /* The subpage title row, a back arrow in front of the name the way
     hass-subpage draws it. */
  .subpage-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 0 12px;
  }
  .subpage-header .back {
    background: none;
    border: none;
    border-radius: 50%;
    min-height: 0;
    width: 40px;
    height: 40px;
    padding: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-text-color);
    flex: none;
  }
  .subpage-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* The grip Home Assistant puts on sortable rows. */
  .drag-handle {
    display: inline-flex;
    align-items: center;
    padding: 4px;
    color: var(--secondary-text-color);
    cursor: grab;
    /* The browser must not scroll while a finger drags a row. */
    touch-action: none;
  }
  /* A list row with the divider the settings lists repeat. */
  .divided {
    padding: 12px 0;
    border-bottom: 1px solid var(--divider-color, ButtonBorder);
  }
  /* A collapsible section, like ha-expansion-panel: an outlined row with a
     chevron, native details/summary underneath so it costs no script and
     keeps its keyboard behaviour. */
  details.expander {
    border: 1px solid var(--divider-color, ButtonBorder);
    border-radius: var(--kv-radius-card);
    margin: 12px 0;
  }
  details.expander > summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    font-weight: 500;
    cursor: pointer;
    list-style: none;
  }
  details.expander > summary::-webkit-details-marker {
    display: none;
  }
  details.expander > summary::after {
    /* The chevron, drawn from two borders so it follows the text colour. */
    content: "";
    margin-left: auto;
    width: 7px;
    height: 7px;
    border-style: solid;
    border-width: 0 2px 2px 0;
    color: var(--secondary-text-color);
    transform: rotate(45deg);
    transition: transform 120ms ease;
  }
  details.expander[open] > summary::after {
    transform: rotate(-135deg);
  }
  details.expander > .expander-body {
    padding: 0 16px 16px;
  }
  details.expander > .expander-body > h3:first-child {
    margin-top: 0;
  }
  /* Section switcher, the way Home Assistant marks a selection: a bar on a
     shared baseline, never a filled pill. This is the page-background
     variant; the panel's header tabs are the coloured one. */
  .subtabs {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--divider-color, ButtonBorder);
    margin-bottom: 16px;
  }
  .subtabs::-webkit-scrollbar {
    display: none;
  }
  .subtabs button {
    background: none;
    border: none;
    border-radius: 0;
    color: var(--secondary-text-color);
    height: 44px;
    min-height: 0;
    padding: 0 16px;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    /* Sits on the container's own baseline instead of 1px above it. */
    margin-bottom: -1px;
  }
  .subtabs button:hover:not(:disabled) {
    color: var(--primary-text-color);
    box-shadow: none;
  }
  .subtabs button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td,
  th {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid var(--divider-color, ButtonBorder);
    font-weight: normal;
  }
  th {
    color: var(--secondary-text-color);
    font-size: 0.85em;
  }
`;
var Ot = Object.defineProperty, Dt = Object.getOwnPropertyDescriptor, st = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Dt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && Ot(e, s, r), r;
};
let ve = class extends k {
  constructor() {
    super(...arguments), this.open = !1;
  }
  /** Show the dialog; resolves with what the person decided. */
  ask() {
    return this.resolve?.("cancel"), this.open = !0, new Promise((t) => {
      this.resolve = t, this.updateComplete.then(() => {
        const e = this.renderRoot.querySelector("button");
        e instanceof HTMLElement && e.focus();
      });
    });
  }
  answer(t) {
    this.open = !1, this.resolve?.(t), this.resolve = void 0;
  }
  onKeydown(t) {
    t.key === "Escape" && (t.preventDefault(), this.answer("cancel"));
  }
  render() {
    return this.open ? o`<div
      class="scrim"
      @keydown=${this.onKeydown}
      @click=${(t) => {
      t.target === t.currentTarget && this.answer("cancel");
    }}
    >
      <div class="box" role="alertdialog" aria-modal="true">
        <h2>Ungespeicherte Änderungen</h2>
        <p>
          Hier gibt es Änderungen, die noch nicht gespeichert sind. Sollen sie
          gespeichert werden?
        </p>
        <div class="buttons">
          <button @click=${() => this.answer("save")}>Speichern</button>
          <button class="danger" @click=${() => this.answer("discard")}>
            Nicht speichern
          </button>
          <button class="secondary" @click=${() => this.answer("cancel")}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>` : h;
  }
};
ve.styles = [
  j,
  B`
      :host {
        min-height: 0;
        background: none;
      }
      .scrim {
        position: fixed;
        inset: 0;
        /* Above every layer the panel uses, the dropdown popover included. */
        z-index: 110;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
      }
      .box {
        background: var(
          --ha-card-background,
          var(--card-background-color, Canvas)
        );
        color: var(--primary-text-color, CanvasText);
        border-radius: var(--kv-radius-card);
        border: 1px solid var(--divider-color, ButtonBorder);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        max-width: 420px;
        width: calc(100% - 32px);
        padding: 20px 24px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 8px;
        font-size: 20px;
        font-weight: 400;
      }
      p {
        margin: 0 0 20px;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }
      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
    `
];
st([
  d()
], ve.prototype, "open", 2);
ve = st([
  O("kustos-vision-unsaved-dialog")
], ve);
const le = [];
function Oe(t) {
  le.push(t);
}
function De(t) {
  const e = le.indexOf(t);
  e >= 0 && le.splice(e, 1);
}
function zt() {
  return le.some((t) => t.isDirty());
}
let xe;
function Fe(t) {
  xe = t;
}
async function X() {
  const t = le.filter((s) => s.isDirty());
  if (t.length === 0 || !xe) return !0;
  const e = await xe();
  if (e === "cancel") return !1;
  for (const s of t)
    if (e === "save") {
      if (!await s.save()) return !1;
    } else
      s.discard();
  return !0;
}
const ke = "0.6.10", Pt = "kustos-vision-built:0.6.10", Bt = {
  ptz_up: "Schwenken hoch",
  ptz_down: "Schwenken runter",
  ptz_left: "Schwenken links",
  ptz_right: "Schwenken rechts",
  ptz_preset: "Position anfahren",
  ptz_patrol: "Patrouille",
  light: "Licht",
  light_brightness: "Helligkeit",
  siren: "Sirene",
  siren_on: "Sirene ein",
  siren_off: "Sirene aus",
  night_vision: "Nachtsicht",
  privacy_mode: "Privatsphäre",
  motion_trigger: "Bewegungsmelder"
};
function Y(t) {
  const e = Bt[t];
  if (e) return e;
  const s = t.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const Rt = {
  ptz_up: "▲",
  ptz_down: "▼",
  ptz_left: "◀",
  ptz_right: "▶"
};
function Ge(t) {
  return !t || !t.includes(".") ? [] : {
    button: ["button"],
    scene: ["button"],
    script: ["button"],
    switch: ["switch", "button"],
    light: ["switch", "button"],
    siren: ["switch", "button"],
    fan: ["switch", "button"],
    input_boolean: ["switch", "button"],
    select: ["select"],
    input_select: ["select"],
    number: ["number"],
    input_number: ["number"]
  }[t.split(".", 1)[0]] ?? [];
}
const Nt = {
  button: "Knopf",
  switch: "An/Aus",
  select: "Auswahl",
  number: "Wert"
};
var Ht = Object.defineProperty, Ut = Object.getOwnPropertyDescriptor, M = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Ut(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && Ht(e, s, r), r;
};
const Mt = 2, qe = 1024 * 1024, Ze = 3, Je = 8, It = "mp4a.40.2";
function Lt(t, e, s) {
  const i = [...t].sort((l, c) => l.start - c.start), r = i.filter(
    (l) => l.start <= e && e < l.start + l.duration
  );
  let a = r.find((l) => l.stream_key === s) ?? r[0];
  if (!a) {
    const l = i.filter((c) => c.start + c.duration > e);
    a = l.find(
      (c) => c.start === l[0]?.start && c.stream_key === s
    ) ?? l[0];
  }
  if (!a) return [];
  let n = 0;
  return i.filter(
    (l) => l.stream_key === a.stream_key && l.start + l.duration > e
  ).map((l) => {
    const c = { segment: l, mediaStart: n };
    return n += l.duration, c;
  });
}
function jt(t, e) {
  for (const i of t) {
    if (e < i.segment.start) return i.mediaStart;
    if (e < i.segment.start + i.segment.duration)
      return i.mediaStart + (e - i.segment.start);
  }
  const s = t[t.length - 1];
  return s ? s.mediaStart + s.segment.duration : 0;
}
function se(t, e) {
  for (const i of t)
    if (e < i.mediaStart + i.segment.duration)
      return i.segment.start + Math.max(0, e - i.mediaStart);
  const s = t[t.length - 1];
  return s ? s.segment.start + s.segment.duration : 0;
}
function it(t, e) {
  const [s, i, r, a] = [0, 1, 2, 3].map((n) => e.charCodeAt(n));
  for (let n = 0; n + 8 < t.length; n += 1)
    if (t[n] === s && t[n + 1] === i && t[n + 2] === r && t[n + 3] === a)
      return n;
  return -1;
}
function Vt(t) {
  return it(t, "mp4a") !== -1;
}
function Kt(t) {
  const e = it(t, "avcC");
  if (e === -1) return null;
  const s = t[e + 5], i = t[e + 6], r = t[e + 7];
  if (s === void 0 || r === void 0) return null;
  const a = (n) => n.toString(16).padStart(2, "0");
  return `avc1.${a(s)}${a(i)}${a(r)}`;
}
function rt(t) {
  const e = new Date(t * 1e3);
  return `${e.toLocaleDateString(void 0, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })} ${e.toLocaleTimeString(void 0, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })}`;
}
const Wt = (t) => t instanceof DOMException && t.name === "QuotaExceededError";
let z = class extends k {
  constructor() {
    super(...arguments), this.segments = [], this.seekTo = 0, this.segmentUrlBase = "/api/kustos_vision/segment", this.message = "", this.loadingRun = !1, this.withAudio = !0, this.placed = [], this.appended = /* @__PURE__ */ new Set(), this.accepted = 0, this.loading = !1, this.generation = 0, this.wired = !1, this.recoveries = 0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.teardown();
  }
  updated(t) {
    t.has("segments") ? (this.recoveries = 0, this.load()) : t.has("seekTo") && (this.recoveries = 0, this.jump(this.seekTo));
  }
  video() {
    return this.renderRoot.querySelector("video");
  }
  /** Attach the element listeners exactly once; loads come and go. */
  wire(t) {
    this.wired || (this.wired = !0, t.addEventListener("timeupdate", () => {
      if (this.pump(), this.placed.length > 0 && !t.seeking) {
        const e = se(this.placed, t.currentTime);
        this.clockUtc = e, this.dispatchEvent(
          new CustomEvent("positionchange", {
            detail: { time: e },
            bubbles: !0,
            composed: !0
          })
        );
      }
    }), t.addEventListener("seeked", () => {
      this.placed.length > 0 && (this.clockUtc = se(this.placed, t.currentTime));
    }), t.addEventListener("seeking", () => this.onSeeking()), t.addEventListener("waiting", () => this.skipHole()), t.addEventListener("error", () => {
      const e = t.error;
      if (e) {
        if (this.recoveries < Je && this.placed.length > 0) {
          this.recoveries += 1;
          const s = se(this.placed, t.currentTime) + Ze * this.recoveries;
          console.warn(
            `kustos_vision: decoder refused playback (${e.message || e.code}), skipping ${Ze * this.recoveries}s ahead (${this.recoveries}/${Je})`
          ), this.load(s, this.placed[0]?.segment.stream_key, !0);
          return;
        }
        this.message || (this.message = `Der Browser meldet einen Wiedergabefehler${e.message ? `: ${e.message}` : ` (Code ${e.code})`}.`);
      }
    }));
  }
  jump(t) {
    if (!this.segments.some(
      (n) => t >= n.start && t < n.start + n.duration
    )) {
      this.gapAt = t, this.video()?.pause();
      return;
    }
    this.gapAt = void 0;
    const s = this.placed.find(
      (n) => t >= n.segment.start && t < n.segment.start + n.segment.duration
    );
    if (!s) {
      this.load(t, this.placed[0]?.segment.stream_key);
      return;
    }
    const i = this.video();
    if (!i) return;
    const r = s.mediaStart + (t - s.segment.start);
    if (this.isBuffered(i, r)) {
      i.currentTime = r;
      return;
    }
    const a = this.placed.find(
      (n) => !this.appended.has(n.segment.path)
    );
    if (this.carry?.path === s.segment.path || a?.segment.path === s.segment.path) {
      i.currentTime = r, this.pump();
      return;
    }
    this.load(t, s.segment.stream_key);
  }
  isBuffered(t, e) {
    const s = t.buffered;
    for (let i = 0; i < s.length; i += 1)
      if (e >= s.start(i) && e <= s.end(i)) return !0;
    return !1;
  }
  /**
   * React to the element seeking somewhere the buffer does not cover.
   *
   * The scrubber can reach every media-timeline position, including footage
   * that was evicted behind the playhead or not fetched yet. Both are
   * recoverable; sitting silently on a spinner is not.
   */
  onSeeking() {
    const t = this.video();
    if (!t || this.placed.length === 0 || this.appended.size === 0) return;
    const e = t.currentTime;
    if (this.isBuffered(t, e)) return;
    const s = this.placed.find((a) => e < a.mediaStart + a.segment.duration);
    if (!s) return;
    const i = this.placed.find(
      (a) => !this.appended.has(a.segment.path)
    );
    if (this.carry?.path === s.segment.path || i?.segment.path === s.segment.path) {
      this.pump();
      return;
    }
    if (!this.appended.has(s.segment.path)) {
      this.load(se(this.placed, e), s.segment.stream_key);
      return;
    }
    const r = t.buffered;
    if (r.length > 0 && e < r.start(0)) {
      this.load(se(this.placed, e), s.segment.stream_key);
      return;
    }
    this.skipHole();
  }
  /** Move past a spot whose data will never arrive. */
  skipHole() {
    const t = this.video();
    if (!t) return;
    const e = t.buffered;
    for (let s = 0; s < e.length; s += 1)
      if (e.start(s) > t.currentTime) {
        t.currentTime = e.start(s);
        return;
      }
  }
  teardown() {
    this.generation += 1, this.carry?.reader && this.carry.reader.cancel().catch(() => {
    });
    const t = this.video();
    t && (t.pause(), t.removeAttribute("src"), t.load()), this.loadingRun = !1, this.objectUrl && URL.revokeObjectURL(this.objectUrl), this.objectUrl = void 0, this.buffer = void 0, this.media = void 0, this.placed = [], this.appended.clear(), this.accepted = 0, this.carry = void 0, this.startup = void 0, this.loading = !1;
  }
  async load(t, e, s = !1) {
    const i = this.video(), r = i !== null && !i.paused;
    this.teardown();
    const a = this.generation;
    if (this.message = "", this.gapAt = void 0, this.segments.length === 0) {
      this.message = "Für diesen Zeitraum ist nichts aufgezeichnet.";
      return;
    }
    if (!("MediaSource" in window)) {
      this.message = "Dieser Browser unterstützt die Wiedergabe nicht.";
      return;
    }
    this.loadingRun = !0;
    const n = t ?? this.seekTo ?? this.segments[0].start;
    if (this.placed = Lt(this.segments, n, e), this.placed.length === 0) {
      this.message = "Ab diesem Zeitpunkt ist nichts mehr aufgezeichnet.";
      return;
    }
    this.startup = {
      mediaTime: jt(this.placed, n),
      resume: s || r,
      // After a decode refusal the ranged fetch must not start at the
      // refused keyframe again: measured, that costs one futile recovery
      // per skip until the skips outgrow the frame's multi-second span.
      pastRefusal: s
    };
    let l;
    try {
      l = await this.inspect(this.placed[0].segment);
    } catch {
      if (a !== this.generation) return;
      try {
        l = await this.inspect(this.placed[0].segment);
      } catch (T) {
        this.message = x(T);
        return;
      }
    }
    if (a !== this.generation) return;
    if (!l) {
      this.message = "Diese Aufnahme ist nicht H.264. Die Wiedergabe im Panel unterstützt derzeit nur H.264; die Datei selbst ist unbeschädigt und lässt sich herunterladen.";
      return;
    }
    const c = `video/mp4; codecs="${l}"`, p = `video/mp4; codecs="${l}, ${It}"`, b = this.withAudio ? p : c, g = MediaSource.isTypeSupported(b) ? b : MediaSource.isTypeSupported(c) ? c : null;
    if (!g) {
      this.message = `Dieser Browser kann ${l} nicht abspielen.`;
      return;
    }
    const S = new MediaSource();
    this.media = S, this.objectUrl = URL.createObjectURL(S), await this.updateComplete;
    const C = this.video();
    C && (this.wire(C), C.src = this.objectUrl, S.addEventListener(
      "sourceopen",
      () => {
        if (a === this.generation)
          try {
            const T = S.addSourceBuffer(g);
            T.mode = "segments", this.buffer = T, T.addEventListener("updateend", () => void this.pump());
            const we = this.placed[this.placed.length - 1];
            we && (S.duration = we.mediaStart + we.segment.duration), this.pump();
          } catch (T) {
            this.message = x(T);
          }
      },
      { once: !0 }
    ));
  }
  async inspect(t) {
    const e = await this.fetchSegment(t, {
      headers: { Range: "bytes=0-8191" }
    });
    if (!e.ok && e.status !== 206)
      throw new Error(
        `Die Aufnahme konnte nicht geladen werden (HTTP ${e.status}).`
      );
    const s = new Uint8Array(await e.arrayBuffer());
    return this.withAudio = Vt(s), Kt(s);
  }
  urlFor(t) {
    return `${this.segmentUrlBase}/${t.path}`;
  }
  /**
   * Fetch init plus the fragments from the wanted second onward.
   *
   * Falls back to null when the server cannot map the file, in which case
   * the caller downloads it whole as before. The returned range also ends at
   * the last complete fragment, so a tail torn off mid-write, the thing a
   * crashed recorder leaves behind, never reaches the parser at all.
   */
  async fetchRanged(t, e, s = !1) {
    if (!this.api) return null;
    let i;
    try {
      i = await this.api.fragments(t.path);
    } catch {
      return null;
    }
    if (!i || i.fragments.length === 0) return null;
    let r = i.fragments[0];
    for (const l of i.fragments)
      if (l.start <= e) r = l;
      else break;
    if (s && e > 0) {
      const l = i.fragments.indexOf(r);
      l >= 0 && l + 1 < i.fragments.length && (r = i.fragments[l + 1]);
    }
    const [a, n] = await Promise.all([
      this.api.authorizedFetch(this.urlFor(t), {
        headers: { Range: `bytes=0-${i.init_end - 1}` }
      }),
      this.api.authorizedFetch(this.urlFor(t), {
        headers: { Range: `bytes=${r.offset}-${i.data_end - 1}` }
      })
    ]);
    return a.status !== 206 || n.status !== 206 ? null : {
      init: new Uint8Array(await a.arrayBuffer()),
      data: n
    };
  }
  /** Fetch a segment with credentials, which the endpoint insists on. */
  fetchSegment(t, e) {
    const s = this.urlFor(t);
    return this.api ? this.api.authorizedFetch(s, e) : Promise.reject(
      new Error("Die Wiedergabe ist nicht mit Home Assistant verbunden.")
    );
  }
  /** One appendBuffer call, settled on its updateend. */
  appendOnce(t) {
    const e = this.buffer;
    return e ? new Promise((s, i) => {
      let r;
      const a = (l) => {
        r = l;
      }, n = () => {
        e.removeEventListener("error", a), e.removeEventListener("updateend", n), r ? i(new Error("Der Puffer hat die Daten abgelehnt.")) : s();
      };
      e.addEventListener("error", a), e.addEventListener("updateend", n);
      try {
        e.appendBuffer(t);
      } catch (l) {
        e.removeEventListener("error", a), e.removeEventListener("updateend", n), i(l);
      }
    }) : Promise.reject(new Error("kein Puffer"));
  }
  /**
   * Free the footage the playhead has left behind.
   *
   * The browser caps how much a SourceBuffer may hold, and it does not evict
   * on its own what was never played. One segment length stays: a short seek
   * back is instant, anything further goes through a reload anyway.
   */
  async evictBehind(t) {
    const e = this.buffer;
    if (!e || !t || e.updating) return !1;
    const s = this.placed[0]?.segment.duration ?? 0, i = t.currentTime - s, r = e.buffered;
    return r.length === 0 || i <= r.start(0) ? !1 : (await new Promise((a) => {
      e.addEventListener("updateend", () => a(), { once: !0 }), e.remove(r.start(0), i);
    }), !0);
  }
  /** Keep a little footage buffered ahead of the playhead. */
  async pump() {
    const t = this.buffer, e = this.media;
    if (!t || !e || t.updating || this.loading || e.readyState !== "open") return;
    const s = this.video();
    if (!this.carry) {
      const i = this.placed.find((a) => !this.appended.has(a.segment.path));
      if (!i) {
        if (this.accepted === 0) {
          this.loadingRun = !1, this.message = "Keines der Segmente dieses Zeitraums ließ sich laden.";
          return;
        }
        try {
          e.endOfStream();
        } catch {
        }
        return;
      }
      if (s && this.appended.size > 0 && (s.buffered.length > 0 ? s.buffered.end(s.buffered.length - 1) : 0) - s.currentTime > Mt * (this.placed[0]?.segment.duration ?? 0))
        return;
      const r = this.generation;
      this.loading = !0;
      try {
        const a = this.startup !== void 0 ? Math.max(0, this.startup.mediaTime - i.mediaStart) : 0, n = await this.fetchRanged(
          i.segment,
          a,
          this.startup?.pastRefusal ?? !1
        );
        let l, c = null;
        if (n ? (l = n.data, c = n.init) : l = await this.fetchSegment(i.segment), !l.ok) throw new Error(`HTTP ${l.status}`);
        if (r !== this.generation || !this.buffer || e.readyState !== "open")
          return;
        if (this.accepted > 0 && this.buffer.abort(), this.buffer.timestampOffset = i.mediaStart, this.appended.add(i.segment.path), this.carry = {
          path: i.segment.path,
          // Streamed on purpose: waiting for a whole high-resolution segment
          // to download before the first append kept the screen black for
          // the length of a fifty-megabyte transfer after every click.
          reader: l.body ? l.body.getReader() : null,
          // A ranged fetch starts mid-file, so the init segment the parser
          // needs first is prepended here.
          pending: c ?? (l.body ? new Uint8Array(0) : new Uint8Array(await l.arrayBuffer())),
          firstOfSegment: !0
        }, c && !l.body) {
          const p = new Uint8Array(await l.arrayBuffer()), b = new Uint8Array(c.length + p.length);
          b.set(c), b.set(p, c.length), this.carry.pending = b;
        }
        if (r !== this.generation) return;
      } catch (a) {
        this.appended.add(i.segment.path), console.warn(
          "kustos_vision: segment could not be fetched",
          i.segment.path,
          a
        );
      } finally {
        this.loading = !1;
      }
      if (!this.carry) {
        r === this.generation && this.pump();
        return;
      }
    }
    await this.drainCarry(s);
  }
  /** Append the carried segment as its bytes arrive, until done or full. */
  async drainCarry(t) {
    const e = this.carry;
    if (!e || !this.buffer) return;
    const s = this.generation;
    this.loading = !0;
    try {
      for (; ; ) {
        const i = e.reader === null && e.pending.length > 0;
        if (e.pending.length >= qe || i) {
          const r = e.pending.subarray(0, qe);
          try {
            await this.appendOnce(r);
          } catch (a) {
            if (s !== this.generation) return;
            if (Wt(a)) {
              if (await this.evictBehind(t)) continue;
              return;
            }
            console.warn(
              "kustos_vision: segment could not be appended",
              e.path,
              a
            ), e.reader && e.reader.cancel().catch(() => {
            }), this.carry = void 0;
            return;
          }
          if (s !== this.generation) return;
          e.pending = e.pending.subarray(r.length), e.firstOfSegment && (this.accepted += 1, e.firstOfSegment = !1, this.loadingRun = !1, this.applyStartup()), this.nudgePlayback(t);
          continue;
        }
        if (e.reader) {
          const { value: r, done: a } = await e.reader.read();
          if (s !== this.generation) return;
          if (r && r.length > 0) {
            const n = new Uint8Array(e.pending.length + r.length);
            n.set(e.pending), n.set(r, e.pending.length), e.pending = n;
          }
          a && (e.reader = null);
          continue;
        }
        this.carry = void 0;
        break;
      }
    } finally {
      this.loading = !1;
    }
    s === this.generation && (this.nudgeStalledSeek(), this.pump());
  }
  /**
   * Ask a stalled element to move again.
   *
   * Safari in particular stays frozen after running out of data even once
   * more has been appended; the person then pressed pause and play by hand.
   * play() on something already playing is a no-op, so asking every time
   * costs nothing.
   */
  nudgePlayback(t) {
    t && !t.paused && t.play().catch(() => {
    });
  }
  /** Put the element where the run was asked to start, once data exists. */
  applyStartup() {
    const t = this.startup;
    if (!t) return;
    this.startup = void 0;
    const e = this.video();
    e && (t.mediaTime > 0 && (e.currentTime = t.mediaTime), t.resume && e.play().catch(() => {
    }));
  }
  /**
     * Unstick a seek whose data turned out not to exist.
  
     * A seek into the not-yet-fetched part waits for the pump; when the append
     * lands and the spot is still dry (a recording shorter than the index
     * believes), the element would wait forever, so it moves to the next
     * footage instead.
     */
  nudgeStalledSeek() {
    const t = this.video();
    !t || !t.seeking || this.isBuffered(t, t.currentTime) || this.skipHole();
  }
  render() {
    return o`
      <video controls playsinline></video>
      ${this.clockUtc !== void 0 && !this.message && this.gapAt === void 0 ? o`<div class="clock">${rt(this.clockUtc)}</div>` : h}
      ${this.gapAt !== void 0 ? o`<div class="gap">
            Um ${new Date(this.gapAt * 1e3).toLocaleTimeString()} liegt keine
            Aufnahme vor.
          </div>` : h}
      ${this.message ? o`<div class="overlay">${this.message}</div>` : h}
      ${this.loadingRun && !this.message && this.gapAt === void 0 ? o`<div class="overlay">Lade Aufnahme …</div>` : h}
    `;
  }
};
z.styles = B`
    :host {
      display: block;
      background: #000;
      position: relative;
      aspect-ratio: 16 / 9;
    }
    video {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ccc;
      font-size: 0.9em;
      text-align: center;
      padding: 12px;
      pointer-events: none;
    }
    .clock {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-family: ui-monospace, monospace;
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 1;
    }
    .gap {
      position: absolute;
      inset: 0;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
      font-size: 0.9em;
      text-align: center;
      padding: 12px;
    }
  `;
M([
  u({ attribute: !1 })
], z.prototype, "api", 2);
M([
  u({ attribute: !1 })
], z.prototype, "segments", 2);
M([
  u({ type: Number })
], z.prototype, "seekTo", 2);
M([
  u()
], z.prototype, "segmentUrlBase", 2);
M([
  d()
], z.prototype, "message", 2);
M([
  d()
], z.prototype, "gapAt", 2);
M([
  d()
], z.prototype, "clockUtc", 2);
M([
  d()
], z.prototype, "loadingRun", 2);
z = M([
  O("kustos-vision-player")
], z);
var Ft = Object.defineProperty, Gt = Object.getOwnPropertyDescriptor, q = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Gt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && Ft(e, s, r), r;
};
let H = class extends k {
  constructor() {
    super(...arguments), this.entityId = "", this.muted = !0, this.mode = "idle", this.message = "", this.nowSeconds = 0, this.visible = !1, this.starting = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this.nowSeconds = Date.now() / 1e3, this.clockTimer = setInterval(() => {
      this.nowSeconds = Date.now() / 1e3;
    }, 1e3), this.observer = new IntersectionObserver((t) => {
      const e = t.some((s) => s.isIntersecting);
      e !== this.visible && (this.visible = e, e ? this.start() : this.stop());
    }), this.observer.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.clockTimer !== void 0 && clearInterval(this.clockTimer), this.clockTimer = void 0, this.observer?.disconnect(), this.observer = void 0, this.stop();
  }
  updated(t) {
    t.has("entityId") && this.visible && (this.stop(), this.start());
  }
  get accessToken() {
    return this.hass?.states?.[this.entityId]?.attributes?.access_token;
  }
  async start() {
    if (!(this.starting || !this.entityId || !this.hass)) {
      this.starting = !0;
      try {
        const e = (await this.hass.callWS({
          type: "camera/capabilities",
          entity_id: this.entityId
        })).frontend_stream_types ?? [];
        if (e.includes("web_rtc") && await this.startWebRtc() || e.includes("hls") && await this.startHls()) return;
        this.startMjpeg();
      } catch (t) {
        this.fail(t);
      } finally {
        this.starting = !1;
      }
    }
  }
  stop() {
    this.unsubscribe?.(), this.unsubscribe = void 0, this.peer?.close(), this.peer = void 0;
    const t = this.renderRoot.querySelector("video");
    t && (t.srcObject = null, t.removeAttribute("src")), this.mode = "idle";
  }
  fail(t) {
    this.mode = "error", this.message = x(t);
  }
  // --------------------------------------------------------------------
  // WebRTC
  // --------------------------------------------------------------------
  async startWebRtc() {
    try {
      const t = await this.hass.callWS({
        type: "camera/webrtc/get_client_config",
        entity_id: this.entityId
      }), e = new RTCPeerConnection(t.configuration);
      this.peer = e, e.addTransceiver("video", { direction: "recvonly" }), e.addTransceiver("audio", { direction: "recvonly" });
      const s = new MediaStream();
      e.addEventListener("track", (a) => {
        s.addTrack(a.track);
        const n = this.renderRoot.querySelector("video");
        n && (n.srcObject = s);
      });
      const i = await e.createOffer();
      await e.setLocalDescription(i);
      let r;
      return e.addEventListener("icecandidate", (a) => {
        !a.candidate || !r || this.hass.callWS({
          type: "camera/webrtc/candidate",
          entity_id: this.entityId,
          session_id: r,
          candidate: a.candidate.toJSON()
        });
      }), this.mode = "webrtc", this.unsubscribe = await this.subscribe(
        {
          type: "camera/webrtc/offer",
          entity_id: this.entityId,
          offer: i.sdp
        },
        (a) => {
          a.type === "session" ? r = a.session_id : a.type === "answer" ? e.setRemoteDescription({
            type: "answer",
            sdp: a.answer
          }) : a.type === "candidate" ? e.addIceCandidate(
            a.candidate
          ) : a.type === "error" && this.fail(new Error(String(a.message)));
        }
      ), !0;
    } catch {
      return this.peer?.close(), this.peer = void 0, !1;
    }
  }
  subscribe(t, e) {
    return this.hass.connection.subscribeMessage(e, t);
  }
  // --------------------------------------------------------------------
  // HLS and MJPEG
  // --------------------------------------------------------------------
  async startHls() {
    if (!document.createElement("video").canPlayType("application/vnd.apple.mpegurl")) return !1;
    try {
      const { url: e } = await this.hass.callWS({
        type: "camera/stream",
        entity_id: this.entityId,
        format: "hls"
      });
      this.mode = "hls", await this.updateComplete;
      const s = this.renderRoot.querySelector("video");
      return s && (s.src = this.hass.hassUrl(e), s.play().catch(() => {
      })), !0;
    } catch {
      return !1;
    }
  }
  startMjpeg() {
    this.mode = this.accessToken ? "mjpeg" : "still";
  }
  // --------------------------------------------------------------------
  render() {
    const t = ["webrtc", "hls", "mjpeg"].includes(this.mode);
    return o`${this.renderPicture()}
    ${t ? o`<div class="clock">${rt(this.nowSeconds)}</div>` : h}`;
  }
  renderPicture() {
    const t = this.accessToken;
    switch (this.mode) {
      case "webrtc":
      case "hls":
        return o`<video autoplay playsinline .muted=${this.muted}></video>`;
      case "mjpeg":
        return o`<img
          alt=""
          src=${this.hass.hassUrl(
          `/api/camera_proxy_stream/${this.entityId}?token=${t}`
        )}
        />`;
      case "still":
        return t ? o`<img
              alt=""
              src=${this.hass.hassUrl(
          `/api/camera_proxy/${this.entityId}?token=${t}`
        )}
            />` : o`<div class="overlay">Kein Vorschaubild verfügbar</div>`;
      case "error":
        return o`<div class="overlay">${this.message}</div>`;
      default:
        return o`<div class="overlay">…</div>${h}`;
    }
  }
};
H.styles = B`
    :host {
      display: block;
      position: relative;
      /* The letterbox behind a 16:9 picture, dark in every theme for the
         same reason the player chrome is: it frames video, not text. */
      background: #111;
      aspect-ratio: 16 / 9;
      overflow: hidden;
    }
    video,
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 8px;
      /* On the always-dark backdrop above, not on the theme's surface. */
      color: #ddd;
      font-size: 0.9em;
    }
    .clock {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-family: ui-monospace, monospace;
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 1;
    }
  `;
q([
  u({ attribute: !1 })
], H.prototype, "hass", 2);
q([
  u()
], H.prototype, "entityId", 2);
q([
  u({ type: Boolean })
], H.prototype, "muted", 2);
q([
  d()
], H.prototype, "mode", 2);
q([
  d()
], H.prototype, "message", 2);
q([
  d()
], H.prototype, "nowSeconds", 2);
H = q([
  O("kustos-vision-live-stream")
], H);
var qt = Object.defineProperty, Zt = Object.getOwnPropertyDescriptor, I = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Zt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && qt(e, s, r), r;
};
function Jt(t, e) {
  const s = e.trim().toLowerCase();
  return s ? t.filter((i) => i.label.toLowerCase().includes(s)) : t;
}
function Yt(t, e, s) {
  const i = e - t.bottom - s, r = t.top - s, a = r > i;
  return { up: a, maxHeight: Math.max(a ? r : i, 0), left: t.left, width: t.width };
}
let P = class extends k {
  constructor() {
    super(...arguments), this.options = [], this.value = "", this.search = !1, this.disabled = !1, this.open = !1, this.query = "", this.highlighted = -1, this.onOutsidePointer = (t) => {
      t.composedPath().includes(this) || this.close();
    }, this.onAnyScroll = (t) => {
      const e = t.target;
      e instanceof Node && this.renderRoot.contains(e) || this.close();
    }, this.onViewportChange = () => this.close();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.unlisten();
  }
  /** The label of the current value, for the closed field. */
  currentLabel() {
    return this.options.find((t) => t.value === this.value)?.label ?? "";
  }
  toggle() {
    this.disabled || (this.open ? this.close() : this.openDrop());
  }
  openDrop() {
    const t = this.renderRoot.querySelector(".select-field");
    if (!(t instanceof HTMLElement)) return;
    const e = t.getBoundingClientRect(), i = Yt(e, window.innerHeight, 8);
    this.drop = {
      ...i,
      anchorTop: e.top,
      anchorBottom: e.bottom
    }, this.query = "", this.highlighted = this.filtered().findIndex((r) => r.value === this.value), this.open = !0, window.addEventListener("pointerdown", this.onOutsidePointer, !0), window.addEventListener("scroll", this.onAnyScroll, !0), window.addEventListener("resize", this.onViewportChange), this.updateComplete.then(() => {
      const r = this.renderRoot.querySelector(".drop input");
      r instanceof HTMLElement && r.focus(), this.scrollHighlightIntoView();
    });
  }
  close() {
    this.open = !1, this.drop = void 0, this.unlisten();
  }
  unlisten() {
    window.removeEventListener("pointerdown", this.onOutsidePointer, !0), window.removeEventListener("scroll", this.onAnyScroll, !0), window.removeEventListener("resize", this.onViewportChange);
  }
  filtered() {
    return Jt(this.options, this.query);
  }
  pick(t) {
    t.disabled || (this.value = t.value, this.close(), this.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: t.value },
        bubbles: !0,
        composed: !0
      })
    ));
  }
  move(t) {
    const e = this.filtered();
    if (e.length === 0) return;
    const s = Math.min(
      Math.max(this.highlighted + t, 0),
      e.length - 1
    );
    this.highlighted = s, this.scrollHighlightIntoView();
  }
  scrollHighlightIntoView() {
    this.updateComplete.then(() => {
      this.renderRoot.querySelector(".item.highlighted")?.scrollIntoView({ block: "nearest" });
    });
  }
  onKeydown(t) {
    if (!this.open) {
      (t.key === "ArrowDown" || t.key === "ArrowUp") && (t.preventDefault(), this.openDrop());
      return;
    }
    switch (t.key) {
      case "Escape":
        t.preventDefault(), this.close();
        break;
      case "ArrowDown":
        t.preventDefault(), this.move(1);
        break;
      case "ArrowUp":
        t.preventDefault(), this.move(-1);
        break;
      case "Enter": {
        t.preventDefault();
        const e = this.filtered(), s = e[this.highlighted] ?? (e.length === 1 ? e[0] : void 0);
        s && this.pick(s);
        break;
      }
    }
  }
  renderDrop() {
    if (!this.open || !this.drop) return h;
    const t = this.filtered(), e = [
      `left:${this.drop.left}px`,
      `width:${this.drop.width}px`,
      `max-height:${this.drop.maxHeight}px`,
      this.drop.up ? `bottom:${window.innerHeight - this.drop.anchorTop}px` : `top:${this.drop.anchorBottom}px`
    ].join(";");
    return o`<div class="drop" style=${e} @keydown=${this.onKeydown}>
      ${this.search ? o`<input
            type="text"
            placeholder="Durchsuchen"
            .value=${this.query}
            @input=${(s) => {
      this.query = s.target.value, this.highlighted = 0;
    }}
          />` : h}
      <div class="list" role="listbox">
        ${t.length === 0 ? o`<div class="empty">Nichts gefunden.</div>` : t.map(
      (s, i) => o`<div
                class="item ${i === this.highlighted ? "highlighted" : ""} ${s.value === this.value ? "selected" : ""} ${s.disabled ? "disabled" : ""}"
                role="option"
                aria-selected=${s.value === this.value ? "true" : "false"}
                aria-disabled=${s.disabled ? "true" : "false"}
                @pointerenter=${() => this.highlighted = i}
                @click=${() => this.pick(s)}
              >
                ${s.label}
              </div>`
    )}
      </div>
    </div>`;
  }
  render() {
    return o`
      <button
        type="button"
        class="select-field"
        ?disabled=${this.disabled}
        aria-haspopup="listbox"
        aria-expanded=${this.open ? "true" : "false"}
        @click=${this.toggle}
        @keydown=${this.onKeydown}
      >
        ${this.currentLabel() || o`&nbsp;`}
      </button>
      ${this.renderDrop()}
    `;
  }
};
P.styles = [
  j,
  B`
      :host {
        display: block;
        width: 100%;
        position: relative;
        /* shared's :host rules serve full-page views. */
        min-height: 0;
        background: none;
      }
      :host([compact]) .select-field {
        min-height: 0;
        padding: 4px 28px 4px 8px;
        font-size: 0.9em;
      }
      .drop {
        position: fixed;
        z-index: 100; /* above every layer the panel itself uses */
        display: flex;
        flex-direction: column;
        background: var(--ha-card-background, var(--card-background-color, Canvas));
        border: 1px solid var(--divider-color, ButtonBorder);
        border-radius: var(--kv-radius-card);
        /* A floating panel casts a dark shadow in both themes. */
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }
      .drop input {
        width: auto;
        margin: 8px;
        /* The search box is a rounded outline, the way Home Assistant draws
           it inside its own pickers. */
        border: 1px solid var(--divider-color, ButtonBorder);
        border-radius: var(--kv-radius-card);
        background: none;
      }
      .drop input:focus {
        border-color: var(--primary-color);
        box-shadow: none;
      }
      .list {
        overflow-y: auto;
        padding: 4px 0;
      }
      .item {
        padding: 10px 16px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item.highlighted {
        background: color-mix(in srgb, currentColor 10%, transparent);
      }
      .item.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
      }
      .item.disabled {
        color: var(--disabled-text-color, GrayText);
        cursor: default;
      }
      .empty {
        padding: 10px 16px;
        color: var(--secondary-text-color);
      }
    `
];
I([
  u({ attribute: !1 })
], P.prototype, "options", 2);
I([
  u()
], P.prototype, "value", 2);
I([
  u({ type: Boolean })
], P.prototype, "search", 2);
I([
  u({ type: Boolean })
], P.prototype, "disabled", 2);
I([
  d()
], P.prototype, "open", 2);
I([
  d()
], P.prototype, "query", 2);
I([
  d()
], P.prototype, "highlighted", 2);
I([
  d()
], P.prototype, "drop", 2);
P = I([
  O("kustos-vision-select")
], P);
var Xt = Object.defineProperty, Qt = Object.getOwnPropertyDescriptor, Z = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Qt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && Xt(e, s, r), r;
};
const es = ["ptz_up", "ptz_left", "ptz_right", "ptz_down", "siren_on", "siren_off"], ts = ["light", "siren", "privacy_mode"];
let U = class extends k {
  constructor() {
    super(...arguments), this.viewId = "", this.busy = "", this.error = "";
  }
  get liveEntity() {
    const t = this.camera.streams;
    if (!t.length) return;
    const e = this.camera.view_settings?.[this.viewId]?.stream_key;
    if (e) {
      const s = t.find((i) => i.key === e);
      if (s) return s.entity_id;
    }
    return (t.find((s) => !s.record) ?? t[0]).entity_id;
  }
  /** The controls this view wants, limited to those actually bound. */
  get shownCapabilities() {
    return (this.camera.view_settings?.[this.viewId]?.capabilities ?? Object.keys(this.camera.capabilities)).filter((s) => s in this.camera.capabilities);
  }
  async run(t, e) {
    this.busy = t, this.error = "";
    try {
      await this.api.trigger(this.camera.slug, t, e);
    } catch (s) {
      this.error = x(s);
    } finally {
      this.busy = "";
    }
  }
  renderButton(t, e, s) {
    return o`<button
      class="secondary compact"
      title=${Y(t)}
      ?disabled=${this.busy !== ""}
      @click=${() => this.run(t, s)}
    >
      ${e}
    </button>`;
  }
  /** Custom controls this view shows, in the order they were defined. */
  get shownControls() {
    const t = this.camera.view_settings?.[this.viewId]?.capabilities, e = this.camera.controls ?? [];
    if (!t) return e;
    const s = new Set(t);
    return e.filter((i) => s.has(i.key));
  }
  /** The live state of the entity behind a control, for its options and range. */
  entityState(t) {
    const e = t.binding.entity_id;
    return e ? this.hass?.states?.[e] : void 0;
  }
  renderCustom(t) {
    const e = this.entityState(t);
    switch (t.kind) {
      case "switch":
        return o`
          ${this.renderButton(t.key, `${t.name} an`, !0)}
          ${this.renderButton(t.key, `${t.name} aus`, !1)}
        `;
      case "select": {
        const s = e?.attributes?.options ?? [];
        return s.length ? o`<label class="inline">
          ${t.name}
          <kustos-vision-select
            compact
            .options=${s.map((i) => ({
          value: i,
          label: i
        }))}
            .value=${e?.state ?? ""}
            ?disabled=${this.busy !== ""}
            @value-changed=${(i) => this.run(t.key, i.detail.value)}
          ></kustos-vision-select>
        </label>` : o`<span class="meta">${t.name}: keine Optionen</span>`;
      }
      case "number":
        return o`<label class="inline">
          ${t.name}
          <input
            type="number"
            min=${String(e?.attributes?.min ?? "")}
            max=${String(e?.attributes?.max ?? "")}
            .value=${e?.state ?? ""}
            ?disabled=${this.busy !== ""}
            @change=${(s) => this.run(t.key, Number(s.target.value))}
          />
        </label>`;
      default:
        return this.renderButton(t.key, t.name);
    }
  }
  renderControls() {
    const t = this.shownCapabilities, e = this.shownControls;
    if (!t.length && !e.length) return h;
    const s = [];
    for (const i of es)
      t.includes(i) && s.push(this.renderButton(i, Rt[i] ?? Y(i)));
    for (const i of ts)
      t.includes(i) && s.push(
        this.renderButton(i, `${Y(i)} an`, !0),
        this.renderButton(i, `${Y(i)} aus`, !1)
      );
    return o`<div class="controls">
      ${s}${e.map((i) => this.renderCustom(i))}
    </div>`;
  }
  render() {
    const t = this.liveEntity, e = this.camera.state, s = e.streams.filter((i) => i.running).length;
    return o`
      <header>
        <span
          class="dot ${e.recording ? "recording" : ""} ${e.wants_recording ? "" : "idle"}"
          title=${e.recording ? `${s} Stream(s) werden aufgezeichnet` : e.wants_recording ? e.paused ? "Aufzeichnung pausiert" : "Aufzeichnung läuft nicht" : "Für diese Kamera ist keine Aufzeichnung eingerichtet"}
        ></span>
        <span>${this.camera.name}</span>
        <span class="spacer"></span>
        ${e.paused ? o`<span class="meta">pausiert</span>` : h}
      </header>

      ${t ? o`<kustos-vision-live-stream
            .hass=${this.hass}
            .entityId=${t}
          ></kustos-vision-live-stream>` : o`<div class="meta" style="padding:12px">Kein Stream zugeordnet</div>`}

      ${this.renderControls()}
      ${this.error ? o`<div class="error">${this.error}</div>` : h}
    `;
  }
};
U.styles = [
  j,
  B`
      :host {
        display: block;
        /* shared's :host serves full-page views and sets min-height: 100%;
           a tile is a grid item and must size to its content. */
        min-height: 0;
        background: var(
          --ha-card-background,
          var(--card-background-color, Canvas)
        );
        border-radius: var(--kv-radius-card);
        border: var(--ha-card-border-width, 1px) solid
          var(--ha-card-border-color, var(--divider-color, ButtonBorder));
        box-shadow: var(--ha-card-box-shadow, none);
        overflow: hidden;
      }
      header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        font-weight: 500;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--error-color, #db4437);
        flex: none;
      }
      .dot.recording {
        background: var(--success-color, #43a047);
      }
      /* Grey, not red: nothing is wrong, nothing is meant to be recorded. */
      .dot.idle {
        background: var(--disabled-text-color, #888);
      }
      .spacer {
        flex: 1;
      }
      .meta {
        font-size: 0.8em;
        color: var(--secondary-text-color);
        font-weight: normal;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 12px 12px;
      }
      label.inline {
        /* shared's label is block with a top margin, which would break the
           control row apart. */
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        font-size: 0.85em;
        color: var(--secondary-text-color);
      }
      label.inline select,
      label.inline input {
        /* shared makes fields fill their row; tile controls stay compact. */
        width: auto;
        max-width: 130px;
        padding: 4px 8px;
      }
      label.inline select {
        /* Room for the shared chevron on the compact size. */
        padding-right: 28px;
      }
      label.inline kustos-vision-select {
        width: auto;
        min-width: 90px;
        max-width: 130px;
      }
      .error {
        /* shared only supplies the colour. */
        padding: 0 12px 10px;
        font-size: 0.85em;
      }
    `
];
Z([
  u({ attribute: !1 })
], U.prototype, "hass", 2);
Z([
  u({ attribute: !1 })
], U.prototype, "api", 2);
Z([
  u({ attribute: !1 })
], U.prototype, "camera", 2);
Z([
  u()
], U.prototype, "viewId", 2);
Z([
  d()
], U.prototype, "busy", 2);
Z([
  d()
], U.prototype, "error", 2);
U = Z([
  O("kustos-vision-camera-tile")
], U);
var ss = Object.defineProperty, is = Object.getOwnPropertyDescriptor, de = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? is(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && ss(e, s, r), r;
};
let G = class extends k {
  constructor() {
    super(...arguments), this.cameras = [];
  }
  get shown() {
    const t = new Map(this.cameras.map((e) => [e.slug, e]));
    return this.view.cameras.map((e) => t.get(e)).filter((e) => e !== void 0);
  }
  render() {
    const t = this.shown;
    if (t.length === 0)
      return o`<div class="empty">
        Dieser Ansicht ist noch keine Kamera zugeordnet.<br />
        Unter Einstellungen, Ansichten lässt sich das ändern.
      </div>`;
    const e = this.view.columns > 0 ? `grid-template-columns: repeat(${this.view.columns}, 1fr)` : "";
    return o`
      <div class="grid" style=${e}>
        ${t.map(
      (s) => o`
            <kustos-vision-camera-tile
              .hass=${this.hass}
              .api=${this.api}
              .camera=${s}
              .viewId=${this.view.id}
            ></kustos-vision-camera-tile>
          `
    )}
      </div>
    `;
  }
};
G.styles = B`
    :host {
      display: block;
      padding: 16px;
    }
    .grid {
      display: grid;
      gap: 16px;
      /* Zero columns means "fit as many as the width allows", which is what a
         wall display and a phone both want. */
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }
    .empty {
      color: var(--secondary-text-color);
      padding: 32px 8px;
      text-align: center;
      line-height: 1.5;
    }
  `;
de([
  u({ attribute: !1 })
], G.prototype, "hass", 2);
de([
  u({ attribute: !1 })
], G.prototype, "api", 2);
de([
  u({ attribute: !1 })
], G.prototype, "view", 2);
de([
  u({ attribute: !1 })
], G.prototype, "cameras", 2);
G = de([
  O("kustos-vision-live-view")
], G);
var rs = Object.defineProperty, as = Object.getOwnPropertyDescriptor, R = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? as(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && rs(e, s, r), r;
};
const ns = 120;
let E = class extends k {
  constructor() {
    super(...arguments), this.from = 0, this.to = 0, this.blocks = [], this.segments = [], this.position = 0, this.thumbnailUrlBase = "/api/kustos_vision/thumbnail", this.dragging = !1;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.clearSettle();
  }
  clearSettle() {
    this.settleTimer !== void 0 && clearTimeout(this.settleTimer), this.settleTimer = void 0;
  }
  /**
   * Fetch the preview address once the pointer has come to rest.
   *
   * Signing is cached per address by the api client, so coming back to a
   * segment costs nothing and the browser can reuse the picture it already
   * holds.
   */
  schedulePreview(t) {
    if (!t?.thumbnail || !this.api) {
      this.clearSettle(), this.preview = void 0;
      return;
    }
    if (this.preview?.path === t.path) {
      this.clearSettle();
      return;
    }
    this.clearSettle();
    const e = t.path;
    this.settleTimer = setTimeout(() => {
      this.api?.signedUrl(`${this.thumbnailUrlBase}/${e}`).then((s) => {
        this.hover?.segment?.path === e && (this.preview = { path: e, url: s });
      }).catch(() => {
        this.preview = void 0;
      });
    }, ns);
  }
  updated(t) {
    t.has("segments") && (this.clearSettle(), this.hover = void 0, this.preview = void 0);
  }
  get span() {
    return Math.max(1, this.to - this.from);
  }
  percent(t) {
    return (t - this.from) / this.span * 100;
  }
  timeAt(t) {
    const s = t.currentTarget.getBoundingClientRect(), i = Math.min(1, Math.max(0, (t.clientX - s.left) / s.width));
    return this.from + i * this.span;
  }
  emit(t, e) {
    this.dispatchEvent(
      new CustomEvent(t, { detail: { time: e }, bubbles: !0, composed: !0 })
    );
  }
  onPointerDown(t) {
    t.currentTarget.setPointerCapture(t.pointerId), this.dragging = !0, this.onPointerMove(t);
  }
  onPointerMove(t) {
    const e = this.timeAt(t), s = this.segments.find(
      (i) => e >= i.start && e < i.start + i.duration
    );
    this.hover = { x: this.percent(e), time: e, segment: s }, this.schedulePreview(s), this.dragging && this.emit("scrub", e);
  }
  onPointerUp(t) {
    this.dragging && (this.dragging = !1, this.emit("seek", this.timeAt(t)));
  }
  formatTime(t) {
    return new Date(t * 1e3).toLocaleTimeString(void 0, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }
  hourMarks() {
    const e = Math.ceil(this.from / 3600) * 3600, s = [];
    for (let i = e; i <= this.to; i += 3600) s.push(i);
    return s.length > 26 ? [] : s;
  }
  renderGrid() {
    return this.hourMarks().map(
      (t) => o`<div class="tick" style="left:${this.percent(t)}%"></div>`
    );
  }
  renderScale() {
    const t = this.hourMarks();
    if (t.length < 2) return h;
    const e = Math.ceil(t.length / 12);
    return o`<div class="scale">
      ${t.map(
      (s, i) => o`<div
            class="mark ${i % e === 0 ? "major" : ""}"
            style="left:${this.percent(s)}%"
          ></div>
          ${i % e === 0 ? o`<span class="lbl" style="left:${this.percent(s)}%">
                ${new Date(s * 1e3).toLocaleTimeString(void 0, {
        hour: "2-digit",
        minute: "2-digit"
      })}
              </span>` : h}`
    )}
    </div>`;
  }
  render() {
    return this.to <= this.from ? h : o`
      <div class="wrap">
        ${this.hover ? o`<div class="preview" style="left:${this.hover.x}%">
              ${this.preview && this.preview.path === this.hover.segment?.path ? o`<img alt="" src=${this.preview.url} />` : h}
              <div class="time">${this.formatTime(this.hover.time)}</div>
            </div>` : h}

        <div
          class="bar"
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${() => {
      this.dragging = !1, this.dispatchEvent(
        new CustomEvent("scrubend", { bubbles: !0, composed: !0 })
      );
    }}
          @pointerleave=${() => {
      this.dragging || (this.hover = void 0, this.clearSettle(), this.preview = void 0);
    }}
        >
          ${this.blocks.map(
      (t) => o`<div
              class="block"
              title="${this.formatTime(t.start)} bis ${this.formatTime(t.end)}"
              style="left:${this.percent(t.start)}%;width:${this.percent(t.end) - this.percent(t.start)}%"
            ></div>`
    )}
          ${this.position >= this.from && this.position <= this.to ? o`<div class="playhead" style="left:${this.percent(this.position)}%"></div>
                <div class="head" style="left:${this.percent(this.position)}%">
                  <div class="flag">${this.formatTime(this.position)}</div>
                  <div class="arrow"></div>
                </div>` : h}
          ${this.renderGrid()}
        </div>
        ${this.renderScale()}
        ${this.blocks.length === 0 ? o`<div class="empty">An diesem Tag wurde nichts aufgezeichnet.</div>` : h}
      </div>
    `;
  }
};
E.styles = B`
    :host {
      display: block;
      user-select: none;
    }
    .bar {
      position: relative;
      height: 44px;
      touch-action: none;
      background: var(--secondary-background-color, ButtonFace);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
    }
    .block {
      position: absolute;
      top: 0;
      bottom: 0;
      background: var(--primary-color);
      opacity: 0.75;
    }
    .playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--error-color, #db4437);
      pointer-events: none;
    }
    .head {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      z-index: 1;
    }
    .head .flag {
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
      font-size: 0.7em;
      padding: 1px 5px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .head .arrow {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid var(--error-color, #db4437);
    }
    .scale {
      position: relative;
      height: 20px;
      margin-top: 4px;
      font-size: 0.7em;
      color: var(--secondary-text-color);
    }
    .scale .mark {
      position: absolute;
      top: 0;
      width: 1px;
      height: 5px;
      background: currentColor;
      opacity: 0.5;
    }
    .scale .mark.major {
      height: 8px;
      opacity: 1;
    }
    .scale .lbl {
      position: absolute;
      top: 9px;
      transform: translateX(-50%);
      white-space: nowrap;
    }
    .tick {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(128, 128, 128, 0.35);
      pointer-events: none;
    }
    .preview {
      position: absolute;
      bottom: 52px;
      transform: translateX(-50%);
      background: var(--ha-card-background, var(--card-background-color, Canvas));
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      z-index: 2;
    }
    .preview img {
      display: block;
      width: 160px;
      border-radius: 4px;
    }
    .preview .time {
      text-align: center;
      font-size: 0.75em;
      padding: 2px 0 0;
      color: var(--primary-text-color);
    }
    .wrap {
      position: relative;
    }
    .empty {
      padding: 12px;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
  `;
R([
  u({ type: Number })
], E.prototype, "from", 2);
R([
  u({ type: Number })
], E.prototype, "to", 2);
R([
  u({ attribute: !1 })
], E.prototype, "blocks", 2);
R([
  u({ attribute: !1 })
], E.prototype, "segments", 2);
R([
  u({ type: Number })
], E.prototype, "position", 2);
R([
  u()
], E.prototype, "thumbnailUrlBase", 2);
R([
  u({ attribute: !1 })
], E.prototype, "api", 2);
R([
  d()
], E.prototype, "hover", 2);
R([
  d()
], E.prototype, "dragging", 2);
R([
  d()
], E.prototype, "preview", 2);
E = R([
  O("kustos-vision-timeline")
], E);
var os = Object.defineProperty, ls = Object.getOwnPropertyDescriptor, _ = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ls(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && os(e, s, r), r;
};
let y = class extends k {
  constructor() {
    super(...arguments), this.cameras = [], this.stampAvailable = !1, this.camera = "", this.stream = "", this.day = "", this.days = [], this.blocks = [], this.segments = [], this.position = 0, this.seekTo = 0, this.busy = !1, this.scrubbing = !1, this.downloading = !1, this.stampExport = !1, this.error = "";
  }
  updated(t) {
    t.has("cameras") && !this.camera && this.cameras.length > 0 && this.selectCamera(this.cameras[0].slug);
  }
  get bounds() {
    if (!this.day) return [0, 0];
    const t = /* @__PURE__ */ new Date(`${this.day}T00:00:00`), e = new Date(t);
    return e.setDate(e.getDate() + 1), [t.getTime() / 1e3, e.getTime() / 1e3];
  }
  async selectCamera(t) {
    this.camera = t, this.stream = "", this.error = "", this.busy = !0;
    try {
      const { days: e } = await this.api.recordingDays(t);
      this.days = e, this.day = e[e.length - 1] ?? "", await this.loadDay();
    } catch (e) {
      this.error = x(e);
    } finally {
      this.busy = !1;
    }
  }
  async loadDay() {
    if (!this.camera || !this.day) {
      this.blocks = [], this.segments = [];
      return;
    }
    const [t, e] = this.bounds;
    this.busy = !0, this.error = "";
    try {
      const s = await this.api.timeline(
        this.camera,
        t,
        e,
        this.stream || void 0
      );
      this.blocks = s.blocks, this.segments = s.segments, this.position = s.segments[0]?.start ?? t, this.seekTo = this.position;
    } catch (s) {
      this.error = x(s);
    } finally {
      this.busy = !1;
    }
  }
  get streamKeys() {
    const t = this.cameras.find((e) => e.slug === this.camera);
    return t ? t.streams.map((e) => e.key) : [];
  }
  exportUrl() {
    const [t, e] = this.bounds, s = new URLSearchParams({
      camera: this.camera,
      from: String(t),
      to: String(e)
    });
    return this.stream && s.set("stream", this.stream), this.stampExport && this.stampAvailable && s.set("stamp", "1"), `/api/kustos_vision/export?${s.toString()}`;
  }
  /**
   * Hand the browser a download it can actually fetch.
   *
   * A plain link would go out without credentials and be refused, because the
   * export endpoint requires authentication and an anchor cannot send a
   * header. Signing the address first is Home Assistant's own answer to this,
   * and letting the browser do the transfer keeps a recording of several
   * gigabytes out of the page's memory.
   */
  async download() {
    this.downloading = !0, this.error = "";
    try {
      const t = await this.api.signedUrl(this.exportUrl()), e = document.createElement("a");
      e.href = t, e.download = "", e.style.display = "none", this.renderRoot.appendChild(e), e.click(), e.remove();
    } catch (t) {
      this.error = x(t);
    } finally {
      this.downloading = !1;
    }
  }
  render() {
    if (this.cameras.length === 0)
      return o`<div style="padding:32px" class="muted">
        Noch keine Kamera eingerichtet.
      </div>`;
    const t = this.streamKeys;
    return o`
      <div class="page">
        <div class="card">
          <div class="row">
            <div class="grow">
              <label>Kamera</label>
              <kustos-vision-select
                .options=${this.cameras.map((e) => ({
      value: e.slug,
      label: e.name
    }))}
                .value=${this.camera}
                @value-changed=${(e) => this.selectCamera(e.detail.value)}
              ></kustos-vision-select>
            </div>
            <div class="grow">
              <label>Tag</label>
              <kustos-vision-select
                .options=${this.days.length === 0 ? [{ value: "", label: "keine Aufnahmen" }] : this.days.map((e) => ({ value: e, label: e }))}
                .value=${this.days.length === 0 ? "" : this.day}
                @value-changed=${(e) => {
      e.detail.value && (this.day = e.detail.value, this.loadDay());
    }}
              ></kustos-vision-select>
            </div>
            ${t.length > 1 ? o`<div class="grow">
                  <label>Stream</label>
                  <kustos-vision-select
                    .options=${[
      { value: "", label: "alle" },
      ...t.map((e) => ({ value: e, label: e }))
    ]}
                    .value=${this.stream}
                    @value-changed=${(e) => {
      this.stream = e.detail.value, this.loadDay();
    }}
                  ></kustos-vision-select>
                </div>` : h}
          </div>
          ${this.error ? o`<p class="error">${this.error}</p>` : h}
        </div>

        <kustos-vision-player
          .api=${this.api}
          .segments=${this.segments}
          .seekTo=${this.seekTo}
          @positionchange=${(e) => {
      this.scrubbing || (this.position = e.detail.time);
    }}
        ></kustos-vision-player>

        <div>
          <kustos-vision-timeline
            .api=${this.api}
            .from=${this.bounds[0]}
            .to=${this.bounds[1]}
            .blocks=${this.blocks}
            .segments=${this.segments}
            .position=${this.position}
            @scrub=${(e) => {
      this.scrubbing = !0, this.position = e.detail.time;
    }}
            @scrubend=${() => {
      this.scrubbing = !1;
    }}
            @seek=${(e) => {
      this.scrubbing = !1, this.position = e.detail.time, this.seekTo = e.detail.time;
    }}
          ></kustos-vision-timeline>
        </div>

        ${this.segments.length > 0 ? o`<div class="row">
              <button
                class="secondary"
                ?disabled=${this.busy || this.downloading}
                @click=${this.download}
              >
                Diesen Tag herunterladen
              </button>
              <label class="stamp" title=${this.stampAvailable ? "Aufnahmezeit sichtbar ins Bild schreiben" : "Das ffmpeg dieser Installation kann keinen Text zeichnen"}>
                <input
                  type="checkbox"
                  ?disabled=${!this.stampAvailable}
                  .checked=${this.stampExport && this.stampAvailable}
                  @change=${(e) => {
      this.stampExport = e.target.checked;
    }}
                />
                Zeitstempel einbrennen
              </label>
              <span class="muted">
                ${this.stampExport && this.stampAvailable ? "Das Video wird neu kodiert und die Aufnahmezeit ins Bild geschrieben; das dauert etwa so lange wie das Material selbst." + (this.stream === "" && this.streamKeys.length > 1 ? " Eingebrannt wird der Stream mit dem meisten Material; oben lässt sich ein bestimmter wählen." : "") : "Die Segmente werden ohne Neukodierung zusammengefügt."}
              </span>
            </div>` : h}
      </div>
    `;
  }
};
y.styles = [
  j,
  B`
      /* The tab has to fit on one screen: picker, picture and timeline all
         visible at once, because scrolling to reach the timeline while
         watching the picture defeats the point of having both. So the view
         takes exactly the height it is given and hands what is left over to
         the player, rather than letting the player's aspect ratio decide how
         tall the page is. On a wide window 16:9 came out taller than the
         window itself. */
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        /* Without this a flex child never shrinks below its content, and the
           player's own height would win again. */
        min-height: 0;
      }
      .page {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        padding: 16px;
        box-sizing: border-box;
        gap: 12px;
        /* Not hidden. On a window too short for even the smallest useful
           picture the leftover has to stay reachable; clipping it would hide
           the camera picker or a error message with no way to get at them. */
        overflow: auto;
      }
      /* The picker, the timeline and the download row keep their natural
         height; only the picture grows into what is left. */
      kustos-vision-player {
        flex: 1;
        /* Lets the picture shrink past its own 16:9 shape, which is the whole
           point: the window decides how tall it is, not the aspect ratio. */
        min-height: 0;
        /* But not to nothing. flex-basis 0 plus min-height 0 leaves a flex
           item with no floor at all, so on a short window the picture
           collapsed to zero pixels and even the error overlay inside it went
           with it, leaving no sign that a player was there. A video element
           spends roughly the first forty pixels on its own control bar, so
           below this there is no picture left to look at and scrolling is the
           better answer than a strip. */
        min-height: 160px;
      }
      .page .card {
        margin-bottom: 0;
      }
      label.stamp {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        white-space: nowrap;
      }
    `
];
_([
  u({ attribute: !1 })
], y.prototype, "api", 2);
_([
  u({ attribute: !1 })
], y.prototype, "cameras", 2);
_([
  u({ type: Boolean })
], y.prototype, "stampAvailable", 2);
_([
  d()
], y.prototype, "camera", 2);
_([
  d()
], y.prototype, "stream", 2);
_([
  d()
], y.prototype, "day", 2);
_([
  d()
], y.prototype, "days", 2);
_([
  d()
], y.prototype, "blocks", 2);
_([
  d()
], y.prototype, "segments", 2);
_([
  d()
], y.prototype, "position", 2);
_([
  d()
], y.prototype, "seekTo", 2);
_([
  d()
], y.prototype, "busy", 2);
_([
  d()
], y.prototype, "downloading", 2);
_([
  d()
], y.prototype, "stampExport", 2);
_([
  d()
], y.prototype, "error", 2);
y = _([
  O("kustos-vision-recordings")
], y);
var hs = Object.defineProperty, ds = Object.getOwnPropertyDescriptor, w = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ds(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && hs(e, s, r), r;
};
function cs(t) {
  const e = t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z0-9]/.test(e) ? e : `kamera_${e}`;
}
let m = class extends k {
  constructor() {
    super(...arguments), this.capabilityKeys = [], this.available = [], this.views = [], this.allCameras = [], this.slug = "", this.name = "", this.streams = [], this.capabilities = {}, this.retentionDays = null, this.enabled = !0, this.viewSettings = {}, this.controls = [], this.candidates = [], this.busy = !1, this.error = "", this.baseline = "", this.unsaved = {
      isDirty: () => JSON.stringify(this.payload()) !== this.baseline,
      save: () => this.save(),
      // Nothing to restore: leaving unmounts the editor and its drafts.
      discard: () => {
      }
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.camera && (this.slug = this.camera.slug, this.name = this.camera.name, this.streams = this.camera.streams.map((t) => ({ ...t })), this.capabilities = structuredClone(this.camera.capabilities), this.retentionDays = this.camera.retention_days, this.enabled = this.camera.enabled, this.viewSettings = structuredClone(this.camera.view_settings ?? {}), this.controls = structuredClone(this.camera.controls ?? []), this.loadCandidates()), this.baseline = JSON.stringify(this.payload()), Oe(this.unsaved);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), De(this.unsaved);
  }
  /** Fetch the sibling entities of this camera's device, without changing
   *  anything about the camera itself. */
  async loadCandidates() {
    const t = this.streams[0]?.entity_id;
    if (t)
      try {
        this.candidates = (await this.api.suggest(t)).candidates;
      } catch {
        this.candidates = [];
      }
  }
  async pick(t) {
    if (t) {
      this.busy = !0, this.error = "";
      try {
        const e = await this.api.suggest(t);
        this.camera || (this.name = e.name, this.slug = cs(e.name)), this.streams = e.streams.map((s) => ({
          key: s.key,
          entity_id: s.entity_id,
          // Only one stream is recorded by default. Recording every stream of
          // every camera on the first save would be a surprising amount of disk.
          record: s.key === "sd" || e.streams.length === 1,
          audio: "transcode"
        })), this.capabilities = Object.fromEntries(
          Object.entries(e.capabilities).map(([s, i]) => [
            s,
            { entity_id: i }
          ])
        ), this.candidates = e.candidates;
      } catch (e) {
        this.error = x(e);
      } finally {
        this.busy = !1;
      }
    }
  }
  updateStream(t, e) {
    this.streams = this.streams.map(
      (s, i) => i === t ? { ...s, ...e } : s
    );
  }
  setCapability(t, e) {
    const s = { ...this.capabilities };
    e ? s[t] = { entity_id: e } : delete s[t], this.capabilities = s;
  }
  /** What save() sends, and the yardstick unsaved work is measured by. */
  payload() {
    return {
      slug: this.slug,
      name: this.name,
      streams: this.streams,
      capabilities: this.capabilities,
      retention_days: this.retentionDays,
      enabled: this.enabled,
      area_id: this.camera?.area_id ?? null,
      view_settings: this.viewSettings,
      controls: this.controls
    };
  }
  async save() {
    this.busy = !0, this.error = "";
    try {
      return await this.api.setCamera(
        this.payload(),
        // Editing an existing camera is the only case allowed to replace one.
        this.camera !== void 0
      ), this.baseline = JSON.stringify(this.payload()), this.dispatchEvent(new CustomEvent("saved", { bubbles: !0, composed: !0 })), !0;
    } catch (t) {
      return this.error = x(t), !1;
    } finally {
      this.busy = !1;
    }
  }
  patchView(t, e) {
    const s = this.views.find((r) => r.id === t)?.cameras.filter((r) => r !== this.slug).length ?? 0, i = this.viewSettings[t] ?? {
      visible: !1,
      position: s
    };
    this.viewSettings = { ...this.viewSettings, [t]: { ...i, ...e } };
  }
  /** Cameras currently in a view, in display order, including this one. */
  membersOf(t) {
    const e = t.cameras.filter((i) => i !== this.slug).map((i) => ({
      slug: i,
      name: this.allCameras.find((r) => r.slug === i)?.name ?? i
    }));
    return this.viewSettings[t.id]?.visible ? t.cameras.includes(this.slug) ? t.cameras.map((i) => ({
      slug: i,
      name: i === this.slug ? this.name || this.slug : this.allCameras.find((r) => r.slug === i)?.name ?? i
    })) : [...e, { slug: this.slug, name: this.name || this.slug }] : e;
  }
  async applyOrder(t, e) {
    this.busy = !0, this.error = "";
    try {
      await this.api.setViewOrder(t.id, e);
      const s = e.indexOf(this.slug);
      if (s >= 0 && this.viewSettings[t.id]) {
        this.patchView(t.id, { position: s });
        const i = JSON.parse(this.baseline);
        i.view_settings?.[t.id] && (i.view_settings[t.id].position = s, this.baseline = JSON.stringify(i));
      }
      this.dispatchEvent(
        new CustomEvent("reordered", { bubbles: !0, composed: !0 })
      );
    } catch (s) {
      this.error = x(s);
    } finally {
      this.busy = !1;
    }
  }
  onDragStart(t, e, s) {
    if (this.busy || !this.camera) return;
    const i = s.currentTarget, r = i.closest("tr");
    if (!r) return;
    s.preventDefault(), i.setPointerCapture(s.pointerId);
    const a = this.membersOf(t).map((n) => n.slug);
    this.dragging = {
      viewId: t.id,
      slug: a[e],
      startIndex: e,
      currentIndex: e,
      startY: s.clientY,
      rowHeight: r.getBoundingClientRect().height,
      order: a
    }, this.requestUpdate();
  }
  onDragMove(t) {
    const e = this.dragging;
    if (!e || e.rowHeight <= 0) return;
    const s = Math.round((t.clientY - e.startY) / e.rowHeight), i = Math.min(
      Math.max(e.startIndex + s, 0),
      e.order.length - 1
    );
    i !== e.currentIndex && (this.dragging = { ...e, currentIndex: i }, this.requestUpdate());
  }
  async onDragEnd(t) {
    const e = this.dragging;
    this.dragging = void 0, this.requestUpdate(), !(!e || e.currentIndex === e.startIndex) && await this.applyOrder(t, this.orderedSlugs(e));
  }
  orderedSlugs(t) {
    const e = [...t.order], [s] = e.splice(t.startIndex, 1);
    return e.splice(t.currentIndex, 0, s), e;
  }
  /** The member list, rearranged live while a row is being dragged. */
  orderedMembers(t) {
    const e = this.membersOf(t), s = this.dragging;
    if (!s || s.viewId !== t.id) return e;
    const i = new Map(e.map((r) => [r.slug, r]));
    return this.orderedSlugs(s).map((r) => i.get(r)).filter((r) => r !== void 0);
  }
  patchControl(t, e) {
    this.controls = this.controls.map(
      (s, i) => i === t ? { ...s, ...e } : s
    );
  }
  addControl() {
    let t = this.controls.length + 1;
    const e = /* @__PURE__ */ new Set([
      ...this.controls.map((s) => s.key),
      ...Object.keys(this.capabilities)
    ]);
    for (; e.has(`bedienelement_${t}`); ) t += 1;
    this.controls = [
      ...this.controls,
      {
        key: `bedienelement_${t}`,
        name: "",
        kind: "button",
        binding: { entity_id: "" }
      }
    ];
  }
  /** Why saving is blocked, or undefined when it is not. */
  get incompleteControl() {
    for (const t of this.controls) {
      if (!t.binding.entity_id && !t.binding.action)
        return `Bedienelement "${t.name || t.key}" hat keine Entity`;
      if (!t.name.trim())
        return "Ein Bedienelement hat keine Beschriftung";
    }
  }
  renderControlRow(t, e) {
    const s = Ge(t.binding.entity_id), i = s.length ? s : ["button", "switch", "select", "number"], r = t.binding.entity_id;
    return o`
      <div class="divided">
        <div class="row">
          <div class="grow">
            <label>Beschriftung</label>
            <input
              placeholder="Zoom rein"
              .value=${t.name}
              @change=${(a) => this.patchControl(e, {
      name: a.target.value
    })}
            />
          </div>
          <div class="grow">
            <label>Entity</label>
            <kustos-vision-select
              search
              .options=${[
      { value: "", label: "Bitte wählen …" },
      ...this.candidates.map((a) => ({
        value: a.entity_id,
        label: a.name || a.entity_id
      }))
    ]}
              .value=${r}
              @value-changed=${(a) => {
      const n = a.detail.value, [l] = Ge(n);
      this.patchControl(e, {
        binding: { entity_id: n },
        ...l ? { kind: l } : {}
      });
    }}
            ></kustos-vision-select>
          </div>
          <div>
            <label>Bedienart</label>
            <kustos-vision-select
              .options=${i.map((a) => ({
      value: a,
      label: Nt[a]
    }))}
              .value=${t.kind}
              @value-changed=${(a) => this.patchControl(e, {
      kind: a.detail.value
    })}
            ></kustos-vision-select>
          </div>
          <div>
            <label>Kennung</label>
            <input
              .value=${t.key}
              @change=${(a) => this.patchControl(e, {
      key: a.target.value
    })}
            />
          </div>
        </div>
        <div class="row" style="margin-top:8px">
          <span class="grow"></span>
          <button
            class="danger"
            @click=${() => this.controls = this.controls.filter((a, n) => n !== e)}
          >
            Entfernen
          </button>
        </div>
      </div>
    `;
  }
  renderViewBlock(t) {
    const e = this.viewSettings[t.id], s = e?.visible ?? !1, i = this.orderedMembers(t), r = e?.capabilities ?? null, a = [
      ...Object.keys(this.capabilities),
      ...this.controls.map((n) => n.key)
    ];
    return o`
      <div class="divided">
        <label style="margin:0">
          <input
            type="checkbox"
            .checked=${s}
            @change=${(n) => this.patchView(t.id, {
      visible: n.target.checked
    })}
          />
          <strong>${t.name}</strong>
        </label>

        ${s ? o`
              <div class="row">
                <div class="grow">
                  <label>Angezeigter Stream</label>
                  <kustos-vision-select
                    .options=${[
      {
        value: "",
        label: "automatisch (der nicht aufgezeichnete)"
      },
      ...this.streams.map((n) => ({
        value: n.key,
        label: n.key
      }))
    ]}
                    .value=${e?.stream_key ?? ""}
                    @value-changed=${(n) => this.patchView(t.id, {
      stream_key: n.detail.value || null
    })}
                  ></kustos-vision-select>
                </div>
              </div>

              <label>Bedienelemente in dieser Ansicht</label>
              ${a.length === 0 ? o`<p class="hint">Dieser Kamera ist nichts zugeordnet.</p>` : o`<div class="row">
                      ${a.map(
      (n) => o`<label style="margin:0">
                          <input
                            type="checkbox"
                            .checked=${r === null || r.includes(n)}
                            @change=${(l) => {
        const c = l.target.checked, p = new Set(r ?? a);
        c ? p.add(n) : p.delete(n), this.patchView(t.id, {
          capabilities: a.filter((b) => p.has(b))
        });
      }}
                          />
                          ${this.controls.find((l) => l.key === n)?.name || Y(n)}
                        </label>`
    )}
                    </div>
                    <div class="row" style="margin-top:6px">
                      <button
                        class="secondary"
                        @click=${() => this.patchView(t.id, { capabilities: null })}
                      >
                        alle
                      </button>
                      <button
                        class="secondary"
                        @click=${() => this.patchView(t.id, { capabilities: [] })}
                      >
                        keines
                      </button>
                    </div>`}

              <label>Reihenfolge in dieser Ansicht</label>
              <p class="hint">
                Gilt für alle Kameras der Ansicht und wird sofort gespeichert,
                weil sie die anderen Kameras mit betrifft.
              </p>
              <table>
                ${i.map(
      (n, l) => o`
                    <tr
                      class=${this.dragging?.viewId === t.id && this.dragging.slug === n.slug ? "dragging" : ""}
                    >
                      <td class=${n.slug === this.slug ? "" : "muted"}>
                        ${l + 1}. ${n.name}
                      </td>
                      <td style="width:1%;white-space:nowrap">
                        ${this.camera ? o`<span
                              class="drag-handle"
                              title="Ziehen zum Verschieben"
                              @pointerdown=${(c) => this.onDragStart(t, l, c)}
                              @pointermove=${(c) => this.onDragMove(c)}
                              @pointerup=${() => this.onDragEnd(t)}
                              @pointercancel=${() => {
        this.dragging = void 0, this.requestUpdate();
      }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M4 9h16v2H4zM4 13h16v2H4z" />
                              </svg>
                            </span>` : h}
                      </td>
                    </tr>
                  `
    )}
              </table>
              ${this.camera ? h : o`<p class="hint">
                    Die Reihenfolge lässt sich einstellen, sobald die Kamera
                    gespeichert ist.
                  </p>`}
            ` : h}
      </div>
    `;
  }
  /** What to append to a picker entry: stream count, reachability, and
   *  whether it is already taken. */
  pickerSuffix(t) {
    const e = [];
    return t.streams.length > 1 && e.push(`${t.streams.length} Streams`), t.available || e.push("nicht erreichbar"), t.in_use && e.push("bereits eingerichtet"), e.length ? ` (${e.join(", ")})` : "";
  }
  renderPicker() {
    const t = this.camera !== void 0;
    return o`
      <label>
        ${t ? "Andere Kamera zuordnen" : "Kamera in Home Assistant"}
      </label>
      <kustos-vision-select
        search
        .options=${[
      { value: "", label: t ? "unverändert lassen" : "Bitte wählen …" },
      ...this.available.map((e) => ({
        value: e.entity_id,
        label: `${e.name ?? e.entity_id}${this.pickerSuffix(e)}`,
        disabled: e.in_use && !t
      }))
    ]}
        .value=${""}
        @value-changed=${(e) => {
      e.detail.value && this.pick(e.detail.value);
    }}
      ></kustos-vision-select>
      <p class="hint">
        ${t ? o`Ersetzt Streams und Bedienelemente durch die des gewählten
              Geräts, damit sich ein Vertippen beim Anlegen korrigieren lässt,
              ohne die Kamera zu löschen. Kennung und Name bleiben, denn die
              Kennung ist der Ordner der bisherigen Aufnahmen.` : o`Jede Kamera erscheint einmal, mit allen ihren Streams.
              Welche davon aufgezeichnet werden, wählen Sie gleich darunter.`}
      </p>
    `;
  }
  render() {
    const t = this.candidates.length ? this.candidates : Object.values(this.capabilities).filter((e) => e.entity_id).map((e) => ({ entity_id: e.entity_id, name: e.entity_id }));
    return o`
      <div class="card">
        ${this.renderPicker()}

        <div class="row">
          <div class="grow">
            <label>Name</label>
            <input
              .value=${this.name}
              @input=${(e) => this.name = e.target.value}
            />
          </div>
          <div class="grow">
            <label>Kennung (wird zum Ordnernamen)</label>
            <input
              .value=${this.slug}
              ?disabled=${this.camera !== void 0}
              @input=${(e) => this.slug = e.target.value}
            />
          </div>
        </div>

        <h3>Streams</h3>
        ${this.streams.length === 0 ? o`<p class="hint">Noch keine Streams.</p>` : o`<table>
              <tr>
                <th>Kennung</th>
                <th>Entity</th>
                <th>Aufzeichnen</th>
                <th>Ton</th>
              </tr>
              ${this.streams.map(
      (e, s) => o`
                  <tr>
                    <td>
                      <input
                        .value=${e.key}
                        @input=${(i) => this.updateStream(s, {
        key: i.target.value
      })}
                      />
                    </td>
                    <td class="muted">${e.entity_id}</td>
                    <td>
                      <input
                        type="checkbox"
                        .checked=${e.record}
                        @change=${(i) => this.updateStream(s, {
        record: i.target.checked
      })}
                      />
                    </td>
                    <td>
                      <kustos-vision-select
                        .options=${[
        { value: "transcode", label: "umwandeln" },
        { value: "copy", label: "kopieren" },
        { value: "none", label: "ohne" }
      ]}
                        .value=${e.audio}
                        @value-changed=${(i) => this.updateStream(s, {
        audio: i.detail.value
      })}
                      ></kustos-vision-select>
                    </td>
                  </tr>
                `
    )}
            </table>
            <p class="hint">
              "Umwandeln" funktioniert mit jeder Kamera. "Kopieren" spart etwas
              Rechenzeit, geht aber nur, wenn die Kamera bereits AAC sendet.
            </p>`}

        <h3>Aufbewahrung</h3>
        <div class="row">
          <div class="grow">
            <label>Tage (leer = nur das Gesamtbudget begrenzt)</label>
            <input
              type="number"
              min="1"
              .value=${this.retentionDays === null ? "" : String(this.retentionDays)}
              @input=${(e) => {
      const s = e.target.value;
      this.retentionDays = s === "" ? null : Number(s);
    }}
            />
          </div>
          <div>
            <label>Aktiv</label>
            <input
              type="checkbox"
              .checked=${this.enabled}
              @change=${(e) => this.enabled = e.target.checked}
            />
          </div>
        </div>

        <details class="expander">
          <summary>Bedienelemente</summary>
          <div class="expander-body">
        <p class="hint">
          Was hier zugeordnet ist, kann auf der Kachel erscheinen. Pro Ansicht
          lässt sich unten auswählen, welche davon dort gezeigt werden.
        </p>
        <table>
          ${this.capabilityKeys.map(
      (e) => o`
              <tr>
                <th>${Y(e)}</th>
                <td>
                  <kustos-vision-select
                    search
                    .options=${[
        { value: "", label: "nicht zugeordnet" },
        ...t.map((s) => ({
          value: s.entity_id,
          label: s.name
        }))
      ]}
                    .value=${this.capabilities[e]?.entity_id ?? ""}
                    @value-changed=${(s) => this.setCapability(e, s.detail.value)}
                  ></kustos-vision-select>
                </td>
              </tr>
            `
    )}
        </table>
          </div>
        </details>

        <details class="expander">
          <summary>Eigene Bedienelemente</summary>
          <div class="expander-body">
        <p class="hint">
          Für alles, was die vierzehn vorgegebenen Plätze nicht abdecken: Zoom,
          Wischer, Empfindlichkeit, Sirenenlautstärke und was Ihre Kamera sonst
          noch anbietet. Jedes davon erscheint danach genauso in den Ansichten
          wie die vorgegebenen.
        </p>
        ${this.controls.map(
      (e, s) => this.renderControlRow(e, s)
    )}
        <div class="row" style="margin-top:12px">
          <button
            class="secondary"
            ?disabled=${this.candidates.length === 0}
            @click=${this.addControl}
          >
            Bedienelement hinzufügen
          </button>
          ${this.candidates.length === 0 ? o`<span class="muted"
                >Erst eine Kamera auswählen, dann stehen ihre Entities zur
                Wahl.</span
              >` : h}
        </div>
          </div>
        </details>

        <details class="expander">
          <summary>Ansichten</summary>
          <div class="expander-body">
        ${this.views.length === 0 ? o`<p class="hint">
              Noch keine Ansicht angelegt. Unter Einstellungen, Ansichten lässt
              sich eine erstellen.
            </p>` : o`<p class="hint">
                Pro Ansicht lässt sich getrennt festlegen, ob und wie diese
                Kamera dort erscheint. So kann dieselbe Kamera in einer
                Bedienansicht mit allen Schaltflächen stehen und in einer
                Wandansicht nur als Bild.
              </p>
              ${this.views.map((e) => this.renderViewBlock(e))}`}
          </div>
        </details>

        ${this.error ? o`<p class="error">${this.error}</p>` : h}

        <div class="row" style="margin-top:16px">
          <button
            ?disabled=${this.busy || !this.slug || !this.name || this.incompleteControl !== void 0}
            title=${this.incompleteControl ?? ""}
            @click=${this.save}
          >
            Speichern
          </button>
          <button
            class="secondary"
            @click=${async () => {
      await X() && this.dispatchEvent(
        new CustomEvent("cancelled", { bubbles: !0, composed: !0 })
      );
    }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    `;
  }
};
m.styles = [
  j,
  B`
      /* The row travelling with the pointer, dimmed like HA's sortables. */
      tr.dragging td {
        opacity: 0.6;
      }
    `
];
w([
  u({ attribute: !1 })
], m.prototype, "api", 2);
w([
  u({ attribute: !1 })
], m.prototype, "camera", 2);
w([
  u({ attribute: !1 })
], m.prototype, "capabilityKeys", 2);
w([
  u({ attribute: !1 })
], m.prototype, "available", 2);
w([
  u({ attribute: !1 })
], m.prototype, "views", 2);
w([
  u({ attribute: !1 })
], m.prototype, "allCameras", 2);
w([
  d()
], m.prototype, "slug", 2);
w([
  d()
], m.prototype, "name", 2);
w([
  d()
], m.prototype, "streams", 2);
w([
  d()
], m.prototype, "capabilities", 2);
w([
  d()
], m.prototype, "retentionDays", 2);
w([
  d()
], m.prototype, "enabled", 2);
w([
  d()
], m.prototype, "viewSettings", 2);
w([
  d()
], m.prototype, "controls", 2);
w([
  d()
], m.prototype, "candidates", 2);
w([
  d()
], m.prototype, "busy", 2);
w([
  d()
], m.prototype, "error", 2);
m = w([
  O("kustos-vision-camera-editor")
], m);
var us = Object.defineProperty, ps = Object.getOwnPropertyDescriptor, $ = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ps(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && us(e, s, r), r;
};
const gs = [
  ["boolean", "Ja/Nein"],
  ["text", "Text"],
  ["number", "Anzahl"],
  ["select", "Auswahl"]
];
let v = class extends k {
  constructor() {
    super(...arguments), this.backend = { kind: "openai" }, this.observations = [], this.triggers = [], this.addingTrigger = !1, this.context = "", this.cooldown = 60, this.budget = 100, this.enabled = !0, this.aiTasks = [], this.history = [], this.busy = !1, this.error = "", this.baseline = "", this.unsaved = {
      isDirty: () => JSON.stringify(this.payload()) !== this.baseline,
      save: () => this.save(),
      // Nothing to restore: leaving unmounts the editor and its drafts.
      discard: () => {
      }
    };
  }
  disconnectedCallback() {
    super.disconnectedCallback(), De(this.unsaved);
  }
  async connectedCallback() {
    if (super.connectedCallback(), this.profile)
      this.backend = { ...this.profile.backend }, this.observations = this.profile.observations.map((t) => ({ ...t })), this.triggers = [...this.profile.triggers], this.context = this.profile.context, this.cooldown = this.profile.cooldown_seconds, this.budget = this.profile.daily_budget, this.enabled = this.profile.enabled, this.loadHistory();
    else {
      const t = this.camera.capabilities.motion_trigger?.entity_id;
      t && (this.triggers = [t]);
    }
    this.baseline = JSON.stringify(this.payload()), Oe(this.unsaved);
    try {
      this.aiTasks = (await this.api.aiTaskEntities()).ai_task;
    } catch {
      this.aiTasks = [];
    }
  }
  /** What save() sends, and the yardstick unsaved work is measured by. */
  payload() {
    return {
      camera_slug: this.camera.slug,
      backend: this.backend,
      observations: this.observations,
      triggers: this.triggers.filter((t) => t),
      context: this.context,
      cooldown_seconds: this.cooldown,
      daily_budget: this.budget,
      enabled: this.enabled
    };
  }
  async loadHistory() {
    try {
      this.history = (await this.api.visionHistory(this.camera.slug)).history;
    } catch {
      this.history = [];
    }
  }
  /** Every entity the instance has, worded for people, searchable by id. */
  triggerCandidates() {
    const t = new Set(this.triggers);
    return Object.keys(this.hass?.states ?? {}).filter((e) => !t.has(e)).map((e) => ({ value: e, label: this.entityLabel(e) })).sort((e, s) => e.label.localeCompare(s.label));
  }
  entityLabel(t) {
    const e = this.hass?.states?.[t]?.attributes?.friendly_name;
    return typeof e == "string" && e ? `${e} (${t})` : t;
  }
  patchObservation(t, e) {
    this.observations = this.observations.map(
      (s, i) => i === t ? { ...s, ...e } : s
    );
  }
  addObservation() {
    let t = this.observations.length + 1;
    const e = new Set(this.observations.map((s) => s.key));
    for (; e.has(`frage_${t}`); ) t += 1;
    this.observations = [
      ...this.observations,
      { key: `frage_${t}`, type: "boolean", question: "" }
    ];
  }
  async save() {
    this.busy = !0, this.error = "";
    try {
      return await this.api.setVision(this.payload()), this.baseline = JSON.stringify(this.payload()), this.dispatchEvent(new CustomEvent("saved", { bubbles: !0, composed: !0 })), !0;
    } catch (t) {
      return this.error = x(t), !1;
    } finally {
      this.busy = !1;
    }
  }
  async analyseNow() {
    this.busy = !0, this.error = "", this.lastRun = void 0;
    try {
      const t = await this.api.analyseNow(this.camera.slug);
      t.ran ? (this.lastRun = { values: t.values, raw: t.raw }, Object.keys(t.problems).length > 0 && (this.error = `Nicht verwertbar: ${Object.entries(t.problems).map(([e, s]) => `${e} (${s})`).join(", ")}`)) : this.error = "Das Tagesbudget ist aufgebraucht oder es läuft bereits eine Analyse.", await this.loadHistory();
    } catch (t) {
      this.error = x(t);
    } finally {
      this.busy = !1;
    }
  }
  renderBackend() {
    const t = this.backend.kind === "ai_task";
    return o`
      <h3>Modell</h3>
      <label>Anbindung</label>
      <kustos-vision-select
        .options=${[
      { value: "openai", label: "OpenAI-kompatibler Endpunkt" },
      { value: "ai_task", label: "Home Assistant AI Task" }
    ]}
        .value=${t ? "ai_task" : "openai"}
        @value-changed=${(e) => {
      this.backend = {
        ...this.backend,
        kind: e.detail.value
      };
    }}
      ></kustos-vision-select>

      ${t ? o`
            <label>AI-Task-Entity</label>
            <kustos-vision-select
              .options=${[
      { value: "", label: "Bitte wählen …" },
      ...this.aiTasks.map((e) => ({
        value: e.entity_id,
        label: `${e.name}${e.available ? "" : " (nicht verfügbar)"}`
      }))
    ]}
              .value=${this.backend.entity_id ?? ""}
              @value-changed=${(e) => this.backend = {
      ...this.backend,
      entity_id: e.detail.value
    }}
            ></kustos-vision-select>
            ${this.aiTasks.length === 0 ? o`<p class="hint">
                  Keine AI-Task-Entity gefunden, die Bilder annimmt. Dafür muss ein
                  passender Anbieter in Home Assistant eingerichtet sein.
                </p>` : h}
          ` : o`
            <div class="row">
              <div class="grow">
                <label>Adresse</label>
                <input
                  placeholder="http://192.168.1.10:8080/v1"
                  .value=${this.backend.url ?? ""}
                  @change=${(e) => this.backend = {
      ...this.backend,
      url: e.target.value
    }}
                />
              </div>
              <div class="grow">
                <label>Modell</label>
                <input
                  .value=${this.backend.model ?? ""}
                  @change=${(e) => this.backend = {
      ...this.backend,
      model: e.target.value
    }}
                />
              </div>
            </div>
            <label>Schlüssel (bei lokalen Modellen meist leer)</label>
            <input
              type="password"
              .value=${this.backend.api_key ?? ""}
              @change=${(e) => this.backend = {
      ...this.backend,
      api_key: e.target.value || void 0
    }}
            />
            <p class="hint">
              Das Modell muss Bilder verarbeiten können. Bei llama.cpp heißt das:
              mit einer mmproj-Datei geladen.
            </p>
          `}
    `;
  }
  renderObservation(t, e) {
    return o`
      <div class="divided">
        <div class="row">
          <div class="grow">
            <label>Frage an das Modell</label>
            <input
              placeholder="Liegt ein Paket vor der Haustür?"
              .value=${t.question}
              @change=${(s) => this.patchObservation(e, {
      question: s.target.value
    })}
            />
          </div>
          <div>
            <label>Antworttyp</label>
            <kustos-vision-select
              .options=${gs.map(([s, i]) => ({ value: s, label: i }))}
              .value=${t.type}
              @value-changed=${(s) => this.patchObservation(e, {
      type: s.detail.value
    })}
            ></kustos-vision-select>
          </div>
          <div>
            <label>Kennung</label>
            <input
              .value=${t.key}
              @change=${(s) => this.patchObservation(e, {
      key: s.target.value
    })}
            />
          </div>
          <div>
            <label>Angezeigter Name (leer = aus der Kennung)</label>
            <input
              .value=${t.name ?? ""}
              @change=${(s) => this.patchObservation(e, {
      name: s.target.value || void 0
    })}
            />
          </div>
        </div>

        ${t.type === "select" ? o`<label>Mögliche Antworten, durch Komma getrennt</label>
              <input
                .value=${(t.options ?? []).join(", ")}
                @change=${(s) => this.patchObservation(e, {
      options: s.target.value.split(",").map((i) => i.trim()).filter((i) => i)
    })}
              />` : h}
        ${t.type === "number" ? o`<div class="row">
              <div class="grow">
                <label>Kleinster Wert</label>
                <input
                  type="number"
                  .value=${String(t.minimum ?? 0)}
                  @change=${(s) => this.patchObservation(e, {
      minimum: Number(s.target.value)
    })}
                />
              </div>
              <div class="grow">
                <label>Größter Wert</label>
                <input
                  type="number"
                  .value=${String(t.maximum ?? 100)}
                  @change=${(s) => this.patchObservation(e, {
      maximum: Number(s.target.value)
    })}
                />
              </div>
            </div>` : h}

        <div class="row" style="margin-top:8px">
          <label style="margin:0">
            <input
              type="checkbox"
              .checked=${t.enabled ?? !0}
              @change=${(s) => this.patchObservation(e, {
      enabled: s.target.checked
    })}
            />
            Aktiv
          </label>
          ${this.lastRun && t.key in this.lastRun.values ? o`<span class="muted">
                Letzte Antwort: <strong>${String(this.lastRun.values[t.key])}</strong>
              </span>` : h}
          <span class="grow"></span>
          <button
            class="danger"
            @click=${() => this.observations = this.observations.filter((s, i) => i !== e)}
          >
            Frage entfernen
          </button>
        </div>
      </div>
    `;
  }
  renderHistory() {
    return this.history.length === 0 ? h : o`
      <h3>Letzte Analysen</h3>
      <p class="hint">
        Was das Modell tatsächlich geantwortet hat. Eine Frage zu verbessern
        gelingt damit, statt am Wortlaut zu raten.
      </p>
      <table>
        <tr>
          <th>Zeitpunkt</th>
          <th>Auslöser</th>
          <th>Antwort</th>
          <th>Dauer</th>
        </tr>
        ${this.history.slice(0, 8).map(
      (t) => o`
            <tr>
              <td class="muted">${new Date(t.at).toLocaleString()}</td>
              <td class="muted">${t.trigger}</td>
              <td class=${t.error ? "error" : ""}>
                ${t.error ?? Object.entries(t.values).map(([e, s]) => `${e}: ${s}`).join(", ")}
              </td>
              <td class="muted">${t.duration === null ? "-" : `${t.duration} s`}</td>
            </tr>
          `
    )}
      </table>
    `;
  }
  render() {
    const t = this.profile?.state;
    return o`
      <div class="card">
        <p class="hint">
          Ein Standbild wird an das gewählte Modell geschickt, sobald ein
          Auslöser meldet. Aus jeder Frage wird ein Sensor.
        </p>

        ${this.renderBackend()}

        <h3>Fragen</h3>
        ${this.observations.length === 0 ? o`<p class="hint">Noch keine Frage angelegt.</p>` : this.observations.map((e, s) => this.renderObservation(e, s))}
        <div class="row" style="margin-top:12px">
          <button class="secondary" @click=${this.addObservation}>
            Frage hinzufügen
          </button>
        </div>

        <h3>Auslöser</h3>
        <p class="hint">
          Entities, deren Einschalten eine Analyse startet. Am besten die
          Personenerkennung der Kamera; reine Bewegungsmelder lösen bei Wind
          und Regen dauernd aus.
        </p>
        ${this.triggers.length === 0 ? o`<p class="hint">
              Ohne Auslöser läuft die Analyse nur von Hand.
            </p>` : this.triggers.map(
      (e) => o`<div class="row divided">
                <span class="grow">${this.entityLabel(e)}</span>
                <button
                  class="danger"
                  @click=${() => this.triggers = this.triggers.filter(
        (s) => s !== e
      )}
                >
                  Entfernen
                </button>
              </div>`
    )}
        ${this.addingTrigger ? o`<div class="row" style="margin-top:8px">
              <div class="grow">
                <kustos-vision-select
                  search
                  .options=${this.triggerCandidates()}
                  .value=${""}
                  @value-changed=${(e) => {
      e.detail.value && (this.triggers = [...this.triggers, e.detail.value]), this.addingTrigger = !1;
    }}
                ></kustos-vision-select>
              </div>
              <button
                class="secondary"
                @click=${() => this.addingTrigger = !1}
              >
                Abbrechen
              </button>
            </div>` : o`<div class="row" style="margin-top:8px">
              <button
                class="secondary"
                @click=${() => this.addingTrigger = !0}
              >
                Auslöser hinzufügen
              </button>
            </div>`}

        <h3>Zusätzlicher Zusammenhang</h3>
        <label>Was das Modell nicht sehen kann</label>
        <input
          placeholder="Die Kamera zeigt den Gehweg vor dem Haus."
          .value=${this.context}
          @change=${(e) => this.context = e.target.value}
        />

        <h3>Grenzen</h3>
        <div class="row">
          <div class="grow">
            <label>Mindestabstand in Sekunden</label>
            <input
              type="number"
              min="0"
              .value=${String(this.cooldown)}
              @change=${(e) => this.cooldown = Number(e.target.value)}
            />
          </div>
          <div class="grow">
            <label>Höchstens Analysen pro Tag</label>
            <input
              type="number"
              min="1"
              .value=${String(this.budget)}
              @change=${(e) => this.budget = Number(e.target.value)}
            />
          </div>
        </div>
        ${t ? o`<p class="hint">
              Heute ${t.analyses_today} von ${this.budget} Analysen genutzt.
            </p>` : h}

        <div class="row" style="margin-top:8px">
          <label style="margin:0">
            <input
              type="checkbox"
              .checked=${this.enabled}
              @change=${(e) => this.enabled = e.target.checked}
            />
            Aktiv
          </label>
        </div>

        ${this.error ? o`<p class="error">${this.error}</p>` : h}
        ${this.lastRun?.raw ? o`<h3>Rohantwort</h3>
              <pre class="muted" style="overflow:auto;font-size:0.8em">
${JSON.stringify(this.lastRun.raw, null, 2)}</pre
              >` : h}
        ${this.renderHistory()}

        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy || this.observations.length === 0} @click=${this.save}>
            Speichern
          </button>
          ${this.profile ? o`<button
                class="secondary"
                ?disabled=${this.busy}
                @click=${this.analyseNow}
              >
                Jetzt analysieren
              </button>` : h}
          <button
            class="secondary"
            @click=${async () => {
      await X() && this.dispatchEvent(
        new CustomEvent("cancelled", { bubbles: !0, composed: !0 })
      );
    }}
          >
            Zurück
          </button>
          ${this.profile ? o`<button
                class="danger"
                ?disabled=${this.busy}
                @click=${async () => {
      confirm("Bilderkennung für diese Kamera entfernen?") && (await this.api.deleteVision(this.camera.slug), this.dispatchEvent(
        new CustomEvent("saved", { bubbles: !0, composed: !0 })
      ));
    }}
              >
                Entfernen
              </button>` : h}
        </div>
      </div>
    `;
  }
};
v.styles = j;
$([
  u({ attribute: !1 })
], v.prototype, "api", 2);
$([
  u({ attribute: !1 })
], v.prototype, "camera", 2);
$([
  u({ attribute: !1 })
], v.prototype, "profile", 2);
$([
  u({ attribute: !1 })
], v.prototype, "hass", 2);
$([
  d()
], v.prototype, "backend", 2);
$([
  d()
], v.prototype, "observations", 2);
$([
  d()
], v.prototype, "triggers", 2);
$([
  d()
], v.prototype, "addingTrigger", 2);
$([
  d()
], v.prototype, "context", 2);
$([
  d()
], v.prototype, "cooldown", 2);
$([
  d()
], v.prototype, "budget", 2);
$([
  d()
], v.prototype, "enabled", 2);
$([
  d()
], v.prototype, "aiTasks", 2);
$([
  d()
], v.prototype, "history", 2);
$([
  d()
], v.prototype, "lastRun", 2);
$([
  d()
], v.prototype, "busy", 2);
$([
  d()
], v.prototype, "error", 2);
v = $([
  O("kustos-vision-vision-editor")
], v);
var bs = Object.defineProperty, ms = Object.getOwnPropertyDescriptor, D = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ms(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && bs(e, s, r), r;
};
const vs = [
  ["cameras", "Kameras"],
  ["vision", "Bilderkennung"],
  ["storage", "Speicher"],
  ["views", "Ansichten"],
  ["system", "System"]
], ue = 1e3 * 1e3 * 1e3;
let A = class extends k {
  constructor() {
    super(...arguments), this.section = "cameras", this.adding = !1, this.available = [], this.busy = !1, this.error = "", this.unsavedSections = {
      isDirty: () => this.viewsDirty() || this.storageDirty(),
      save: async () => !(this.viewsDirty() && !await this.commitViews() || this.storageDirty() && !await this.saveStorage()),
      discard: () => {
        this.viewsDraft = void 0, this.resetStorageInputs();
      }
    };
  }
  connectedCallback() {
    super.connectedCallback(), Oe(this.unsavedSections);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), De(this.unsavedSections);
  }
  async refresh() {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: !0, composed: !0 }));
  }
  async run(t) {
    this.busy = !0, this.error = "";
    try {
      return await t(), await this.refresh(), !0;
    } catch (e) {
      return this.error = x(e), !1;
    } finally {
      this.busy = !1;
    }
  }
  async startAdding() {
    this.error = "";
    try {
      this.available = (await this.api.availableCameras()).cameras, this.adding = !0;
    } catch (t) {
      this.error = x(t);
    }
  }
  // ------------------------------------------------------------------
  // Cameras
  // ------------------------------------------------------------------
  /** The subpage title row: back arrow plus the name, like hass-subpage. */
  renderSubpageHeader(t, e) {
    return o`<div class="subpage-header">
      <button class="back" title="Zurück" @click=${e}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path
            d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"
          />
        </svg>
      </button>
      <h2>${t}</h2>
    </div>`;
  }
  renderCameras() {
    return this.adding || this.editing ? o`${this.renderSubpageHeader(
      this.editing ? `${this.editing.name} bearbeiten` : "Kamera hinzufügen",
      async () => {
        await X() && (this.adding = !1, this.editing = void 0);
      }
    )}
      <kustos-vision-camera-editor
        .api=${this.api}
        .camera=${this.editing}
        .capabilityKeys=${this.snapshot.capability_keys}
        .available=${this.available}
        .views=${this.snapshot.views}
        .allCameras=${this.snapshot.cameras}
        @reordered=${() => this.refresh()}
        @saved=${() => {
      this.adding = !1, this.editing = void 0, this.refresh();
    }}
        @cancelled=${() => {
      this.adding = !1, this.editing = void 0;
    }}
      ></kustos-vision-camera-editor>` : o`
      <div class="card">
        <h2>Kameras</h2>
        ${this.snapshot.cameras.length === 0 ? o`<p class="hint">
              Noch keine Kamera eingerichtet. kustos_vision schlägt beim Hinzufügen
              vor, welche Streams und Bedienelemente zum Gerät gehören.
            </p>` : o`<table>
              <tr>
                <th>Name</th>
                <th>Streams</th>
                <th>Aufbewahrung</th>
                <th>Belegt</th>
                <th>Status</th>
                <th></th>
              </tr>
              ${this.snapshot.cameras.map((t) => this.renderCameraRow(t))}
            </table>`}
        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy} @click=${this.startAdding}>
            Kamera hinzufügen
          </button>
        </div>
      </div>
    `;
  }
  renderCameraRow(t) {
    const e = t.streams.filter((i) => i.record).length, s = t.state.streams.filter((i) => !i.running);
    return o`
      <tr>
        <td>${t.name}</td>
        <td class="muted">${e} von ${t.streams.length}</td>
        <td class="muted">
          ${t.retention_days === null ? "unbegrenzt" : `${t.retention_days} Tage`}
        </td>
        <td class="muted">${ce(t.state.used_bytes)}</td>
        <td>${this.renderRecordingState(t, s)}</td>
        <td>
          <div class="row">
            <button
              class="secondary"
              @click=${async () => {
      this.available = (await this.api.availableCameras()).cameras, this.editing = t;
    }}
            >
              Bearbeiten
            </button>
            <button
              class="danger"
              ?disabled=${this.busy}
              @click=${() => this.confirmDelete(t)}
            >
              Entfernen
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  /** Three states, not two: a camera that is not meant to record is not the
   *  same as one that is meant to and cannot. */
  renderRecordingState(t, e) {
    if (!t.enabled)
      return o`<span class="muted">deaktiviert</span>`;
    if (!t.state.wants_recording)
      return o`<span class="muted">keine Aufzeichnung</span>`;
    if (t.state.paused)
      return o`<span class="muted">pausiert</span>`;
    if (t.state.recording)
      return o`<span>zeichnet auf</span>`;
    const s = e[0]?.last_error;
    return o`<span class="error"
      >steht${s ? o` (${s})` : h}</span
    >`;
  }
  confirmDelete(t) {
    confirm(
      `${t.name} entfernen? Die bereits vorhandenen Aufnahmen bleiben erhalten.`
    ) && this.run(() => this.api.deleteCamera(t.slug));
  }
  // ------------------------------------------------------------------
  // Vision
  // ------------------------------------------------------------------
  renderVision() {
    return this.visionFor ? o`${this.renderSubpageHeader(
      `Bilderkennung für ${this.visionFor.name}`,
      async () => {
        await X() && (this.visionFor = void 0);
      }
    )}
      <kustos-vision-vision-editor
        .api=${this.api}
        .hass=${this.hass}
        .camera=${this.visionFor}
        .profile=${this.snapshot.vision.find(
      (t) => t.camera_slug === this.visionFor.slug
    )}
        @saved=${() => {
      this.visionFor = void 0, this.refresh();
    }}
        @cancelled=${() => this.visionFor = void 0}
      ></kustos-vision-vision-editor>` : o`
      <div class="card">
        <h2>Bilderkennung</h2>
        <p class="hint">
          Ein Standbild wird an ein Modell Ihrer Wahl geschickt, sobald ein
          Auslöser meldet. Aus jeder Frage wird ein Sensor, den Automationen
          und Dashboards wie jeden anderen nutzen können. kustos_vision selbst
          erkennt nichts; die Arbeit macht das Modell.
        </p>
        ${this.snapshot.cameras.length === 0 ? o`<p class="hint">Erst eine Kamera einrichten.</p>` : o`<table>
              <tr>
                <th>Kamera</th>
                <th>Fragen</th>
                <th>Heute</th>
                <th>Zustand</th>
                <th></th>
              </tr>
              ${this.snapshot.cameras.map((t) => this.renderVisionRow(t))}
            </table>`}
      </div>
    `;
  }
  renderVisionRow(t) {
    const e = this.snapshot.vision.find((s) => s.camera_slug === t.slug);
    return o`
      <tr>
        <td>${t.name}</td>
        <td class="muted">${e ? e.observations.length : "-"}</td>
        <td class="muted">
          ${e ? `${e.state.analyses_today} / ${e.daily_budget}` : "-"}
        </td>
        <td>
          ${e ? e.state.last_error ? o`<span class="error">${e.state.last_error}</span>` : e.enabled ? e.state.last_run ? o`<span class="muted"
                      >zuletzt ${new Date(e.state.last_run).toLocaleString()}</span
                    >` : o`<span class="muted">noch keine Analyse</span>` : o`<span class="muted">aus</span>` : o`<span class="muted">nicht eingerichtet</span>`}
        </td>
        <td>
          <button class="secondary" @click=${() => this.visionFor = t}>
            ${e ? "Bearbeiten" : "Einrichten"}
          </button>
        </td>
      </tr>
    `;
  }
  // ------------------------------------------------------------------
  // Storage
  // ------------------------------------------------------------------
  renderStorage() {
    const { storage: t, totals: e } = this.snapshot, s = t.max_total_bytes === null ? "" : String(t.max_total_bytes / ue);
    return o`
      <div class="card">
        <h2>Speicher</h2>
        <table>
          <tr>
            <th>Belegt</th>
            <td>${ce(e.used_bytes)}</td>
          </tr>
          <tr>
            <th>Frei am Ort</th>
            <td>${ce(e.free_bytes)}</td>
          </tr>
        </table>

        <label>Ort</label>
        <input id="base_path" .value=${t.base_path} />
        <p class="hint">
          Ein Wechsel verschiebt und löscht nichts: die bereits vorhandenen
          Aufnahmen bleiben unangetastet liegen, nur neue landen am neuen Ort.
          Wenn Sie die alten Aufnahmen behalten möchten, kopieren Sie den
          bisherigen Ordner vorher an die neue Stelle; sie werden dort wieder
          erkannt. Der Ordner muss beschreibbar sein, bei einem Netzlaufwerk
          also eingebunden.
        </p>

        ${e.over_budget_bytes > 0 ? o`<p class="error">
              ${ce(e.over_budget_bytes)} über dem Budget, und mehr
              lässt sich nicht löschen. Das Budget ist kleiner als das, was die
              Kameras zwischen zwei Aufräumläufen schreiben.
            </p>` : h}

        <h3>Grenzen</h3>
        <div class="row">
          <div class="grow">
            <label>Segmentlänge in Sekunden</label>
            <input
              id="segment"
              type="number"
              min="1"
              .value=${String(t.segment_seconds)}
            />
          </div>
          <div class="grow">
            <label>Gesamtbudget in GB (leer = automatisch)</label>
            <input id="budget" type="number" min="0" step="0.1" .value=${s} />
          </div>
        </div>
        <p class="hint">
          Kürzere Segmente lassen die Aufbewahrung feiner arbeiten, erzeugen aber
          mehr Dateien. Das Budget gilt über alle Kameras zusammen; ist es
          überschritten, fällt jeweils die global älteste Aufnahme.
        </p>
        <p class="hint">
          Bleibt das Budget leer, heißt das nicht „unbegrenzt": es gilt dann
          automatisch der Platz, der am Speicherort tatsächlich vorhanden ist,
          abzüglich einer Reserve. Die Aufzeichnung läuft also weiter und
          überschreibt die ältesten Aufnahmen, statt irgendwann an einer vollen
          Platte stehenzubleiben. Ein selbst gesetztes Budget kann diesen Platz
          nicht überschreiten.
        </p>
        <button ?disabled=${this.busy} @click=${this.saveStorage}>Speichern</button>
      </div>
    `;
  }
  storageInput(t) {
    return this.renderRoot.querySelector(`#${t}`);
  }
  /** Whether the storage fields differ from what is stored. False whenever
      the section is not on screen, because then nothing can have changed. */
  storageDirty() {
    const t = this.storageInput("base_path"), e = this.storageInput("segment"), s = this.storageInput("budget");
    if (!t || !e || !s) return !1;
    const { storage: i } = this.snapshot, r = i.max_total_bytes === null ? null : i.max_total_bytes / ue, a = s.value.trim() === "" ? null : Number(s.value);
    return t.value.trim() !== i.base_path || Number(e.value) !== i.segment_seconds || a !== r;
  }
  resetStorageInputs() {
    const { storage: t } = this.snapshot, e = this.storageInput("base_path");
    e && (e.value = t.base_path);
    const s = this.storageInput("segment");
    s && (s.value = String(t.segment_seconds));
    const i = this.storageInput("budget");
    i && (i.value = t.max_total_bytes === null ? "" : String(t.max_total_bytes / ue));
  }
  async saveStorage() {
    const t = this.renderRoot, e = Number(
      t.querySelector("#segment").value
    ), s = t.querySelector("#budget").value, i = t.querySelector("#base_path").value.trim();
    return i !== this.snapshot.storage.base_path && !confirm(
      `Aufnahmen künftig unter ${i} ablegen?

Was bereits unter ${this.snapshot.storage.base_path} liegt, bleibt unverändert dort und verschwindet aus der Übersicht, bis Sie es an den neuen Ort kopieren.`
    ) ? !1 : this.run(
      () => this.api.setStorage({
        base_path: i,
        segment_seconds: e,
        max_total_bytes: s === "" ? null : Math.round(Number(s) * ue)
      })
    );
  }
  // ------------------------------------------------------------------
  // Views
  // ------------------------------------------------------------------
  /** The view list as currently edited; the draft until it is stored. */
  draftViews() {
    return this.viewsDraft ?? this.snapshot.views;
  }
  viewsDirty() {
    if (!this.viewsDraft) return !1;
    const t = (e) => e.map(({ cameras: s, ...i }) => i);
    return JSON.stringify(t(this.viewsDraft)) !== JSON.stringify(t(this.snapshot.views));
  }
  async commitViews() {
    const t = this.viewsDraft;
    if (!t) return !0;
    const e = await this.run(
      () => this.api.setViews(t.map(({ cameras: s, ...i }) => i))
    );
    return e && (this.viewsDraft = void 0), e;
  }
  renderViews() {
    const t = this.draftViews();
    return o`
      <div class="card">
        <h2>Ansichten</h2>
        <p class="hint">
          Jede Ansicht wird zu einem eigenen Reiter. Welche Kameras darin
          erscheinen, legen Sie bei der jeweiligen Kamera fest, zusammen mit
          dem Stream und den Bedienelementen für genau diese Ansicht. Eine neue
          Ansicht startet deshalb leer.
        </p>
        ${t.length === 0 ? o`<p class="hint">Noch keine Ansicht angelegt.</p>` : t.map((e, s) => this.renderViewRow(e, s))}
        <div class="row" style="margin-top:16px">
          <button
            ?disabled=${this.busy || !this.viewsDirty()}
            @click=${() => void this.commitViews()}
          >
            Speichern
          </button>
          <button class="secondary" ?disabled=${this.busy} @click=${this.addView}>
            Ansicht hinzufügen
          </button>
          ${this.viewsDirty() ? o`<button
                class="secondary"
                @click=${() => this.viewsDraft = void 0}
              >
                Verwerfen
              </button>` : h}
        </div>
      </div>
    `;
  }
  renderViewRow(t, e) {
    return o`
      <div class="divided">
        <div class="row">
          <div class="grow">
            <label>Name</label>
            <input
              .value=${t.name}
              @change=${(s) => this.patchView(e, { name: s.target.value })}
            />
          </div>
          <div class="grow">
            <label>Spalten (0 = automatisch)</label>
            <input
              type="number"
              min="0"
              .value=${String(t.columns)}
              @change=${(s) => this.patchView(e, {
      columns: Number(s.target.value)
    })}
            />
          </div>
        </div>
        <p class="hint">
          ${t.cameras.length === 0 ? o`Dieser Ansicht ist noch keine Kamera zugeordnet.` : o`Zeigt:
                ${t.cameras.map(
      (s) => this.snapshot.cameras.find((i) => i.slug === s)?.name ?? s
    ).join(", ")}`}
          Welche Kamera hier erscheint, und mit welchem Stream und welchen
          Bedienelementen, wird bei der jeweiligen Kamera festgelegt.
        </p>
        <div class="row" style="margin-top:8px">
          <button
            class="secondary"
            ?disabled=${e === 0}
            @click=${() => this.moveView(e, -1)}
          >
            nach oben
          </button>
          <button
            class="secondary"
            ?disabled=${e === this.draftViews().length - 1}
            @click=${() => this.moveView(e, 1)}
          >
            nach unten
          </button>
          <button class="danger" @click=${() => this.removeView(e)}>
            Entfernen
          </button>
        </div>
      </div>
    `;
  }
  // Every edit lands in the draft; only the Speichern button stores it.
  // Storing on every change meant a click on another tab quietly saved,
  // because leaving the field fires its change event first.
  patchView(t, e) {
    this.viewsDraft = this.draftViews().map(
      (s, i) => i === t ? { ...s, ...e } : s
    );
  }
  moveView(t, e) {
    const s = [...this.draftViews()], [i] = s.splice(t, 1);
    s.splice(t + e, 0, i), this.viewsDraft = s;
  }
  removeView(t) {
    this.viewsDraft = this.draftViews().filter((e, s) => s !== t);
  }
  addView() {
    const t = this.draftViews(), e = new Set(t.map((i) => i.id));
    let s = t.length + 1;
    for (; e.has(`ansicht_${s}`); ) s += 1;
    this.viewsDraft = [
      ...t,
      {
        id: `ansicht_${s}`,
        name: `Ansicht ${s}`,
        cameras: [],
        icon: "mdi:cctv",
        columns: 0
      }
    ];
  }
  // ------------------------------------------------------------------
  // System
  // ------------------------------------------------------------------
  renderSystem() {
    const { maintenance: t, cameras: e } = this.snapshot;
    return o`
      <div class="card">
        <h2>System</h2>
        <table>
          <tr>
            <th>Letzter Aufräumlauf</th>
            <td class="muted">
              ${t.indexed} indiziert, ${t.thumbnails} Vorschaubilder,
              ${t.deleted} gelöscht
            </td>
          </tr>
          ${t.error ? o`<tr>
                <th>Fehler</th>
                <td class="error">${t.error}</td>
              </tr>` : h}
        </table>

        <h3>Streams</h3>
        ${e.length === 0 ? o`<p class="hint">Keine Kameras eingerichtet.</p>` : o`<table>
              <tr>
                <th>Stream</th>
                <th>Läuft</th>
                <th>Neustarts</th>
                <th>Zuletzt gemeldet</th>
              </tr>
              ${e.flatMap(
      (s) => s.state.streams.map(
        (i) => o`
                    <tr>
                      <td>${s.name} / ${i.stream_key}</td>
                      <td>${i.running ? "ja" : "nein"}</td>
                      <td>${i.restarts}</td>
                      <td class="muted">${i.last_error ?? "-"}</td>
                    </tr>
                  `
      )
    )}
            </table>`}

        <h3>Index</h3>
        <p class="hint">
          Der Index ist ein Verzeichnis über die vorhandenen Aufnahmen. Ihn neu
          aufzubauen ist immer gefahrlos: er kann dabei nur wieder mit den
          Dateien in Übereinstimmung gebracht werden.
        </p>
        <button
          class="secondary"
          ?disabled=${this.busy}
          @click=${() => this.run(() => this.api.rebuildIndex())}
        >
          Index neu aufbauen
        </button>
      </div>
    `;
  }
  // ------------------------------------------------------------------
  render() {
    return o`
      <div style="padding:16px">
        <div class="subtabs" role="tablist">
          ${vs.map(
      ([t, e]) => o`
              <button
                role="tab"
                aria-selected=${this.section === t ? "true" : "false"}
                class=${this.section === t ? "active" : ""}
                @click=${async () => {
        this.section !== t && await X() && (this.section = t, this.adding = !1, this.editing = void 0, this.visionFor = void 0);
      }}
              >
                ${e}
              </button>
            `
    )}
        </div>
        ${this.error ? o`<p class="error">${this.error}</p>` : h}
        ${this.section === "cameras" ? this.renderCameras() : this.section === "vision" ? this.renderVision() : this.section === "storage" ? this.renderStorage() : this.section === "views" ? this.renderViews() : this.renderSystem()}
      </div>
    `;
  }
};
A.styles = j;
D([
  u({ attribute: !1 })
], A.prototype, "api", 2);
D([
  u({ attribute: !1 })
], A.prototype, "snapshot", 2);
D([
  u({ attribute: !1 })
], A.prototype, "hass", 2);
D([
  d()
], A.prototype, "section", 2);
D([
  d()
], A.prototype, "editing", 2);
D([
  d()
], A.prototype, "adding", 2);
D([
  d()
], A.prototype, "available", 2);
D([
  d()
], A.prototype, "visionFor", 2);
D([
  d()
], A.prototype, "busy", 2);
D([
  d()
], A.prototype, "error", 2);
D([
  d()
], A.prototype, "viewsDraft", 2);
A = D([
  O("kustos-vision-settings")
], A);
var fs = Object.defineProperty, ys = Object.getOwnPropertyDescriptor, V = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ys(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && fs(e, s, r), r;
};
const pe = "__recordings", ie = "__settings";
globalThis.kustosVisionBuild = Pt;
let N = class extends k {
  constructor() {
    super(...arguments), this.narrow = !1, this.active = "", this.error = "", this.reconnecting = !1, this.reconnectError = "", this.onBeforeUnload = (t) => {
      zt() && t.preventDefault();
    };
  }
  connectedCallback() {
    super.connectedCallback(), Fe(() => this.unsavedDialog().ask()), window.addEventListener("beforeunload", this.onBeforeUnload), this.load();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), Fe(void 0), window.removeEventListener("beforeunload", this.onBeforeUnload);
  }
  unsavedDialog() {
    return this.renderRoot.querySelector(
      "kustos-vision-unsaved-dialog"
    );
  }
  /** Change the tab, unless unsaved work says otherwise. */
  async switchTab(t) {
    this.active !== t && await X() && (this.active = t);
  }
  updated(t) {
    t.has("hass") && this.hass && !this.api && (this.api = new We(this.hass), this.load());
  }
  async load() {
    if (this.hass) {
      this.api ??= new We(this.hass);
      try {
        this.snapshot = await this.api.getConfig(), this.error = "", this.active || (this.active = this.snapshot.views[0]?.id ?? ie);
      } catch (t) {
        const e = x(t);
        this.error = e;
      }
    }
  }
  /**
   * Say so when what is on screen is not what is installed.
   *
   * Both cases below are invisible without this. Everything looks like the
   * update worked, the change is simply not there, and the only way to find
   * out is to know how browser caches and panel registration behave. Neither
   * is something anybody should have to know to see their own settings.
   */
  /**
   * Say so when nothing is being recorded because the location is gone.
   *
   * The integration loads anyway in that state, precisely so this banner and
   * the settings behind it exist: the location can only be changed here.
   */
  renderStorageNotice(t) {
    return t.storage_error ? o`<div class="stale">
      <span>
        Der Aufnahmeort ist nicht beschreibbar, die Aufzeichnung ist pausiert:
        ${t.storage_error}. Sie startet von selbst, sobald der Ort
        wieder verfügbar ist; ändern lässt er sich unter Einstellungen,
        Speicher.
      </span>
      ${t.storage_reconnect_available ? o`<button
            class="secondary"
            ?disabled=${this.reconnecting}
            @click=${this.reconnectStorage}
          >
            ${this.reconnecting ? "Verbinde neu …" : "Speicher neu verbinden"}
          </button>` : h}
      ${this.reconnectError ? o`<span>${this.reconnectError}</span>` : h}
    </div>` : h;
  }
  /**
   * The retry HAOS itself never makes.
   *
   * Network mounts are attempted exactly once at boot; when that race is
   * lost, the Supervisor covers the mount point with a read-only placeholder
   * and waits for a manual reload. This button is that reload, placed where
   * the person is already looking at the consequence.
   */
  async reconnectStorage() {
    if (this.api) {
      this.reconnecting = !0, this.reconnectError = "";
      try {
        this.snapshot = await this.api.reconnectStorage();
      } catch (t) {
        this.reconnectError = x(t);
      } finally {
        this.reconnecting = !1;
      }
    }
  }
  renderStaleNotice(t) {
    if (t.build?.restart_pending)
      return o`<div class="stale">
        <span>
          Kustos Vision wurde aktualisiert. Bis Home Assistant neu gestartet
          wird, liefert es weiterhin die vorherige Oberfläche aus.
        </span>
      </div>`;
    const e = t.build?.bundle_version;
    return e && ke && e !== ke ? o`<div class="stale">
        <span>
          Diese Seite zeigt noch die Oberfläche aus Version ${ke},
          ausgeliefert wird ${e}. Der Browser hält eine ältere
          Oberfläche fest.
        </span>
        <button class="secondary" @click=${() => location.reload()}>
          Neu laden
        </button>
      </div>` : h;
  }
  /** The identity above everything, shown even while loading or broken. */
  renderHeader() {
    return o`<div class="header">
      <div class="toolbar"><div class="title">Kustos Vision</div></div>
      ${this.snapshot ? this.renderTabs(this.snapshot) : h}
    </div>`;
  }
  renderTabs(t) {
    return o`<div class="tabs" role="tablist">
      ${t.views.map(
      (e) => o`
          <button
            role="tab"
            aria-selected=${e.id === this.active ? "true" : "false"}
            class=${e.id === this.active ? "active" : ""}
            @click=${() => void this.switchTab(e.id)}
          >
            ${e.name}
          </button>
        `
    )}
      <button
        role="tab"
        aria-selected=${this.active === pe ? "true" : "false"}
        class=${this.active === pe ? "active" : ""}
        @click=${() => void this.switchTab(pe)}
      >
        Aufnahmen
      </button>
      <button
        role="tab"
        aria-selected=${this.active === ie ? "true" : "false"}
        class=${this.active === ie ? "active" : ""}
        @click=${() => void this.switchTab(ie)}
      >
        Einstellungen
      </button>
    </div>`;
  }
  render() {
    return o`
      ${this.renderHeader()}
      ${this.snapshot ? this.renderStaleNotice(this.snapshot) : h}
      ${this.snapshot ? this.renderStorageNotice(this.snapshot) : h}
      ${this.renderBody()}
      <kustos-vision-unsaved-dialog></kustos-vision-unsaved-dialog>
    `;
  }
  renderBody() {
    if (this.error)
      return o`<div class="notice">
        kustos_vision ist nicht eingerichtet oder nicht erreichbar.<br />
        <span class="muted">${this.error}</span>
      </div>`;
    if (!this.snapshot || !this.api)
      return o`<div class="notice">Wird geladen …</div>`;
    const t = this.snapshot, e = t.views.find((s) => s.id === this.active);
    return o`
      <div class="body">
        ${this.active === pe ? o`<kustos-vision-recordings
              .api=${this.api}
              .cameras=${t.cameras}
              .stampAvailable=${t.build?.stamp_available ?? !1}
            ></kustos-vision-recordings>` : this.active === ie ? o`<kustos-vision-settings
              .api=${this.api}
              .hass=${this.hass}
              .snapshot=${t}
              @changed=${() => this.load()}
            ></kustos-vision-settings>` : e ? o`<kustos-vision-live-view
                .hass=${this.hass}
                .api=${this.api}
                .view=${e}
                .cameras=${t.cameras}
              ></kustos-vision-live-view>` : o`<div class="notice">
                Noch keine Ansicht angelegt.<br />
                Unter Einstellungen, Ansichten lässt sich eine erstellen.
              </div>${h}`}
      </div>
    `;
  }
};
N.styles = [
  j,
  B`
      :host {
        display: flex;
        flex-direction: column;
        /* Home Assistant hangs a custom panel straight into ha-panel-custom
           and puts no toolbar of its own above it, so the panel owns the full
           height beside the sidebar. It does pad that element by the device's
           safe-area insets, which come off the top here: without that the
           panel is exactly the inset too tall and the whole page scrolls by
           that much. The plain vh line is the fallback for browsers without
           dvh, which follows the address bar on a phone. */
        height: 100vh;
        height: calc(
          100dvh - var(--safe-area-inset-top, 0px) -
            var(--safe-area-inset-bottom, 0px)
        );
      }
      .header {
        flex: none;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, var(--text-primary-color, #fff));
      }
      .toolbar {
        height: var(--header-height, 56px);
        display: flex;
        align-items: center;
        /* Flush with the first tab's text below (16px strip padding plus
           16px tab padding), the way Alarmo and HA's own subpages line the
           title up over the tab labels. */
        padding: 0 32px;
        box-sizing: border-box;
      }
      .toolbar .title {
        font-size: 20px;
        font-weight: 400;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tabs {
        display: flex;
        overflow-x: auto;
        padding: 0 16px;
        /* Home Assistant's tab strips scroll without showing a bar; one
           right under the tabs would compete with the selection underline. */
        scrollbar-width: none;
      }
      .tabs::-webkit-scrollbar {
        display: none;
      }
      .tabs button {
        height: 48px;
        min-height: 0;
        min-width: 90px;
        padding: 0 16px;
        background: none;
        border: none;
        border-radius: 0;
        color: inherit;
        font-size: 14px;
        white-space: nowrap;
        opacity: 0.7;
        /* The selection mark Home Assistant uses: a bar, never a fill. */
        border-bottom: 2px solid transparent;
        transition: opacity 120ms ease-in-out;
      }
      .tabs button:hover:not(:disabled) {
        opacity: 1;
        box-shadow: none;
      }
      .tabs button.active {
        opacity: 1;
        /* The chain hass-tabs-subpage itself resolves for its selection
           bar, with one more link so a header without any text colour set
           still shows a bar. */
        border-bottom-color: var(
          --app-header-selection-bar-color,
          var(--app-header-text-color, var(--text-primary-color, #fff))
        );
      }
      .tabs button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: -4px;
      }
      :host([narrow]) .toolbar {
        padding: 0 24px;
      }
      :host([narrow]) .tabs {
        padding: 0 12px;
      }
      :host([narrow]) .tabs button {
        min-width: 0;
        padding: 0 12px;
      }
      .body {
        flex: 1;
        /* A flex child does not shrink below its content without this, so a
           long tab would push the panel past the window instead of scrolling
           inside it. */
        min-height: 0;
        display: flex;
        flex-direction: column;
        /* Kept for the tabs that are meant to scroll: the live view shows as
           many cameras as there are, and the settings are a long form. Only
           the recordings tab opts out by filling the height exactly. */
        overflow: auto;
      }
      /* These two keep their natural height and let .body scroll, which is
         what they did before .body became a flex container. Only the
         recordings view asks to be stretched. */
      .body > kustos-vision-live-view,
      .body > kustos-vision-settings {
        flex: 0 0 auto;
      }
      .body > kustos-vision-settings {
        /* Home Assistant caps and centres its settings content; a
           full-width form on a wide monitor is a line length nobody reads.
           The live views deliberately stay full width, a camera wall wants
           every pixel. width:100% matters: with only the auto margins, a
           column flex child shrinks to fit-content instead of stretching. */
        width: 100%;
        max-width: var(--kv-content-max-width, 1040px);
        margin: 0 auto;
      }
      .stale {
        position: relative;
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 12px 16px;
        /* How ha-alert colours a warning: the accent laid over the surface
           at low opacity instead of used as the background, so the text
           keeps the theme's own colour and stays readable on light and
           dark alike. */
        background: var(
          --ha-card-background,
          var(--card-background-color, Canvas)
        );
        color: var(--primary-text-color, CanvasText);
        border-left: 4px solid var(--warning-color, #ffa600);
        font-size: 0.9em;
      }
      .stale::before {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--warning-color, #ffa600);
        opacity: 0.12;
        pointer-events: none;
      }
      .stale > * {
        position: relative;
      }
      .notice {
        padding: 32px 16px;
        text-align: center;
        line-height: 1.6;
        color: var(--secondary-text-color);
      }
    `
];
V([
  u({ attribute: !1 })
], N.prototype, "hass", 2);
V([
  u({ type: Boolean, reflect: !0 })
], N.prototype, "narrow", 2);
V([
  d()
], N.prototype, "snapshot", 2);
V([
  d()
], N.prototype, "active", 2);
V([
  d()
], N.prototype, "error", 2);
V([
  d()
], N.prototype, "reconnecting", 2);
V([
  d()
], N.prototype, "reconnectError", 2);
N = V([
  O("kustos-vision-panel")
], N);
export {
  N as CamwatchPanel
};
