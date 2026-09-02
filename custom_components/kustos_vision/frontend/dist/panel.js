const We = "kustos-vision-reloaded";
if (customElements.get("kustos-vision-panel") !== void 0) {
  let t = 0;
  try {
    t = Number(sessionStorage.getItem(We) ?? 0);
  } catch {
  }
  if (Date.now() - t > 3e4) {
    try {
      sessionStorage.setItem(We, String(Date.now()));
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
const xe = globalThis, Be = xe.ShadowRoot && (xe.ShadyCSS === void 0 || xe.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Le = Symbol(), je = /* @__PURE__ */ new WeakMap();
let xt = class {
  constructor(e, s, i) {
    if (this._$cssResult$ = !0, i !== Le) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = s;
  }
  get styleSheet() {
    let e = this.o;
    const s = this.t;
    if (Be && e === void 0) {
      const i = s !== void 0 && s.length === 1;
      i && (e = je.get(s)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && je.set(s, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const It = (t) => new xt(typeof t == "string" ? t : t + "", void 0, Le), M = (t, ...e) => {
  const s = t.length === 1 ? t[0] : e.reduce((i, n, r) => i + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(n) + t[r + 1], t[0]);
  return new xt(s, t, Le);
}, Nt = (t, e) => {
  if (Be) t.adoptedStyleSheets = e.map((s) => s instanceof CSSStyleSheet ? s : s.styleSheet);
  else for (const s of e) {
    const i = document.createElement("style"), n = xe.litNonce;
    n !== void 0 && i.setAttribute("nonce", n), i.textContent = s.cssText, t.appendChild(i);
  }
}, Ke = Be ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let s = "";
  for (const i of e.cssRules) s += i.cssText;
  return It(s);
})(t) : t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Ut, defineProperty: Ht, getOwnPropertyDescriptor: Vt, getOwnPropertyNames: Ft, getOwnPropertySymbols: Wt, getPrototypeOf: jt } = Object, Ee = globalThis, qe = Ee.trustedTypes, Kt = qe ? qe.emptyScript : "", qt = Ee.reactiveElementPolyfillSupport, me = (t, e) => t, _e = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? Kt : null;
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
} }, Ie = (t, e) => !Ut(t, e), Ge = { attribute: !0, type: String, converter: _e, reflect: !1, useDefault: !1, hasChanged: Ie };
Symbol.metadata ??= Symbol("metadata"), Ee.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let ie = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, s = Ge) {
    if (s.state && (s.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((s = Object.create(s)).wrapped = !0), this.elementProperties.set(e, s), !s.noAccessor) {
      const i = Symbol(), n = this.getPropertyDescriptor(e, i, s);
      n !== void 0 && Ht(this.prototype, e, n);
    }
  }
  static getPropertyDescriptor(e, s, i) {
    const { get: n, set: r } = Vt(this.prototype, e) ?? { get() {
      return this[s];
    }, set(a) {
      this[s] = a;
    } };
    return { get: n, set(a) {
      const l = n?.call(this);
      r?.call(this, a), this.requestUpdate(e, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Ge;
  }
  static _$Ei() {
    if (this.hasOwnProperty(me("elementProperties"))) return;
    const e = jt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(me("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(me("properties"))) {
      const s = this.properties, i = [...Ft(s), ...Wt(s)];
      for (const n of i) this.createProperty(n, s[n]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const s = litPropertyMetadata.get(e);
      if (s !== void 0) for (const [i, n] of s) this.elementProperties.set(i, n);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [s, i] of this.elementProperties) {
      const n = this._$Eu(s, i);
      n !== void 0 && this._$Eh.set(n, s);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const s = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const n of i) s.unshift(Ke(n));
    } else e !== void 0 && s.push(Ke(e));
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
    return Nt(e, this.constructor.elementStyles), e;
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
    const i = this.constructor.elementProperties.get(e), n = this.constructor._$Eu(e, i);
    if (n !== void 0 && i.reflect === !0) {
      const r = (i.converter?.toAttribute !== void 0 ? i.converter : _e).toAttribute(s, i.type);
      this._$Em = e, r == null ? this.removeAttribute(n) : this.setAttribute(n, r), this._$Em = null;
    }
  }
  _$AK(e, s) {
    const i = this.constructor, n = i._$Eh.get(e);
    if (n !== void 0 && this._$Em !== n) {
      const r = i.getPropertyOptions(n), a = typeof r.converter == "function" ? { fromAttribute: r.converter } : r.converter?.fromAttribute !== void 0 ? r.converter : _e;
      this._$Em = n;
      const l = a.fromAttribute(s, r.type);
      this[n] = l ?? this._$Ej?.get(n) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, s, i, n = !1, r) {
    if (e !== void 0) {
      const a = this.constructor;
      if (n === !1 && (r = this[e]), i ??= a.getPropertyOptions(e), !((i.hasChanged ?? Ie)(r, s) || i.useDefault && i.reflect && r === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, i)))) return;
      this.C(e, s, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, s, { useDefault: i, reflect: n, wrapped: r }, a) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? s ?? this[e]), r !== !0 || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (s = void 0), this._$AL.set(e, s)), n === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [n, r] of this._$Ep) this[n] = r;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [n, r] of i) {
        const { wrapped: a } = r, l = this[n];
        a !== !0 || this._$AL.has(n) || l === void 0 || this.C(n, void 0, r, l);
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
ie.elementStyles = [], ie.shadowRootOptions = { mode: "open" }, ie[me("elementProperties")] = /* @__PURE__ */ new Map(), ie[me("finalized")] = /* @__PURE__ */ new Map(), qt?.({ ReactiveElement: ie }), (Ee.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ne = globalThis, Ze = (t) => t, Se = Ne.trustedTypes, Je = Se ? Se.createPolicy("lit-html", { createHTML: (t) => t }) : void 0, _t = "$lit$", K = `lit$${Math.random().toFixed(9).slice(2)}$`, St = "?" + K, Gt = `<${St}>`, te = document, fe = () => te.createComment(""), be = (t) => t === null || typeof t != "object" && typeof t != "function", Ue = Array.isArray, Zt = (t) => Ue(t) || typeof t?.[Symbol.iterator] == "function", Pe = `[ 	
\f\r]`, he = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ye = /-->/g, Xe = />/g, J = RegExp(`>|${Pe}(?:([^\\s"'>=/]+)(${Pe}*=${Pe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Qe = /'/g, et = /"/g, At = /^(?:script|style|textarea|title)$/i, Jt = (t) => (e, ...s) => ({ _$litType$: t, strings: e, values: s }), o = Jt(1), se = Symbol.for("lit-noChange"), c = Symbol.for("lit-nothing"), tt = /* @__PURE__ */ new WeakMap(), ee = te.createTreeWalker(te, 129);
function Et(t, e) {
  if (!Ue(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Je !== void 0 ? Je.createHTML(e) : e;
}
const Yt = (t, e) => {
  const s = t.length - 1, i = [];
  let n, r = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = he;
  for (let l = 0; l < s; l++) {
    const d = t[l];
    let m, f, p = -1, b = 0;
    for (; b < d.length && (a.lastIndex = b, f = a.exec(d), f !== null); ) b = a.lastIndex, a === he ? f[1] === "!--" ? a = Ye : f[1] !== void 0 ? a = Xe : f[2] !== void 0 ? (At.test(f[2]) && (n = RegExp("</" + f[2], "g")), a = J) : f[3] !== void 0 && (a = J) : a === J ? f[0] === ">" ? (a = n ?? he, p = -1) : f[1] === void 0 ? p = -2 : (p = a.lastIndex - f[2].length, m = f[1], a = f[3] === void 0 ? J : f[3] === '"' ? et : Qe) : a === et || a === Qe ? a = J : a === Ye || a === Xe ? a = he : (a = J, n = void 0);
    const g = a === J && t[l + 1].startsWith("/>") ? " " : "";
    r += a === he ? d + Gt : p >= 0 ? (i.push(m), d.slice(0, p) + _t + d.slice(p) + K + g) : d + K + (p === -2 ? l : g);
  }
  return [Et(t, r + (t[s] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class ve {
  constructor({ strings: e, _$litType$: s }, i) {
    let n;
    this.parts = [];
    let r = 0, a = 0;
    const l = e.length - 1, d = this.parts, [m, f] = Yt(e, s);
    if (this.el = ve.createElement(m, i), ee.currentNode = this.el.content, s === 2 || s === 3) {
      const p = this.el.content.firstChild;
      p.replaceWith(...p.childNodes);
    }
    for (; (n = ee.nextNode()) !== null && d.length < l; ) {
      if (n.nodeType === 1) {
        if (n.hasAttributes()) for (const p of n.getAttributeNames()) if (p.endsWith(_t)) {
          const b = f[a++], g = n.getAttribute(p).split(K), y = /([.?@])?(.*)/.exec(b);
          d.push({ type: 1, index: r, name: y[2], strings: g, ctor: y[1] === "." ? Qt : y[1] === "?" ? es : y[1] === "@" ? ts : Te }), n.removeAttribute(p);
        } else p.startsWith(K) && (d.push({ type: 6, index: r }), n.removeAttribute(p));
        if (At.test(n.tagName)) {
          const p = n.textContent.split(K), b = p.length - 1;
          if (b > 0) {
            n.textContent = Se ? Se.emptyScript : "";
            for (let g = 0; g < b; g++) n.append(p[g], fe()), ee.nextNode(), d.push({ type: 2, index: ++r });
            n.append(p[b], fe());
          }
        }
      } else if (n.nodeType === 8) if (n.data === St) d.push({ type: 2, index: r });
      else {
        let p = -1;
        for (; (p = n.data.indexOf(K, p + 1)) !== -1; ) d.push({ type: 7, index: r }), p += K.length - 1;
      }
      r++;
    }
  }
  static createElement(e, s) {
    const i = te.createElement("template");
    return i.innerHTML = e, i;
  }
}
function re(t, e, s = t, i) {
  if (e === se) return e;
  let n = i !== void 0 ? s._$Co?.[i] : s._$Cl;
  const r = be(e) ? void 0 : e._$litDirective$;
  return n?.constructor !== r && (n?._$AO?.(!1), r === void 0 ? n = void 0 : (n = new r(t), n._$AT(t, s, i)), i !== void 0 ? (s._$Co ??= [])[i] = n : s._$Cl = n), n !== void 0 && (e = re(t, n._$AS(t, e.values), n, i)), e;
}
class Xt {
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
    const { el: { content: s }, parts: i } = this._$AD, n = (e?.creationScope ?? te).importNode(s, !0);
    ee.currentNode = n;
    let r = ee.nextNode(), a = 0, l = 0, d = i[0];
    for (; d !== void 0; ) {
      if (a === d.index) {
        let m;
        d.type === 2 ? m = new ae(r, r.nextSibling, this, e) : d.type === 1 ? m = new d.ctor(r, d.name, d.strings, this, e) : d.type === 6 && (m = new ss(r, this, e)), this._$AV.push(m), d = i[++l];
      }
      a !== d?.index && (r = ee.nextNode(), a++);
    }
    return ee.currentNode = te, n;
  }
  p(e) {
    let s = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, s), s += i.strings.length - 2) : i._$AI(e[s])), s++;
  }
}
class ae {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, s, i, n) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = e, this._$AB = s, this._$AM = i, this.options = n, this._$Cv = n?.isConnected ?? !0;
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
    e = re(this, e, s), be(e) ? e === c || e == null || e === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : e !== this._$AH && e !== se && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Zt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== c && be(this._$AH) ? this._$AA.nextSibling.data = e : this.T(te.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: s, _$litType$: i } = e, n = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = ve.createElement(Et(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === n) this._$AH.p(s);
    else {
      const r = new Xt(n, this), a = r.u(this.options);
      r.p(s), this.T(a), this._$AH = r;
    }
  }
  _$AC(e) {
    let s = tt.get(e.strings);
    return s === void 0 && tt.set(e.strings, s = new ve(e)), s;
  }
  k(e) {
    Ue(this._$AH) || (this._$AH = [], this._$AR());
    const s = this._$AH;
    let i, n = 0;
    for (const r of e) n === s.length ? s.push(i = new ae(this.O(fe()), this.O(fe()), this, this.options)) : i = s[n], i._$AI(r), n++;
    n < s.length && (this._$AR(i && i._$AB.nextSibling, n), s.length = n);
  }
  _$AR(e = this._$AA.nextSibling, s) {
    for (this._$AP?.(!1, !0, s); e !== this._$AB; ) {
      const i = Ze(e).nextSibling;
      Ze(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class Te {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, s, i, n, r) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = e, this.name = s, this._$AM = n, this.options = r, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = c;
  }
  _$AI(e, s = this, i, n) {
    const r = this.strings;
    let a = !1;
    if (r === void 0) e = re(this, e, s, 0), a = !be(e) || e !== this._$AH && e !== se, a && (this._$AH = e);
    else {
      const l = e;
      let d, m;
      for (e = r[0], d = 0; d < r.length - 1; d++) m = re(this, l[i + d], s, d), m === se && (m = this._$AH[d]), a ||= !be(m) || m !== this._$AH[d], m === c ? e = c : e !== c && (e += (m ?? "") + r[d + 1]), this._$AH[d] = m;
    }
    a && !n && this.j(e);
  }
  j(e) {
    e === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Qt extends Te {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === c ? void 0 : e;
  }
}
class es extends Te {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== c);
  }
}
class ts extends Te {
  constructor(e, s, i, n, r) {
    super(e, s, i, n, r), this.type = 5;
  }
  _$AI(e, s = this) {
    if ((e = re(this, e, s, 0) ?? c) === se) return;
    const i = this._$AH, n = e === c && i !== c || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, r = e !== c && (i === c || n);
    n && this.element.removeEventListener(this.name, this, i), r && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class ss {
  constructor(e, s, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = s, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    re(this, e);
  }
}
const is = { I: ae }, ns = Ne.litHtmlPolyfillSupport;
ns?.(ve, ae), (Ne.litHtmlVersions ??= []).push("3.3.3");
const rs = (t, e, s) => {
  const i = s?.renderBefore ?? e;
  let n = i._$litPart$;
  if (n === void 0) {
    const r = s?.renderBefore ?? null;
    i._$litPart$ = n = new ae(e.insertBefore(fe(), r), r, void 0, s ?? {});
  }
  return n._$AI(t), n;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const He = globalThis;
let D = class extends ie {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const s = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = rs(s, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return se;
  }
};
D._$litElement$ = !0, D.finalized = !0, He.litElementHydrateSupport?.({ LitElement: D });
const as = He.litElementPolyfillSupport;
as?.({ LitElement: D });
(He.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const z = (t) => (e, s) => {
  s !== void 0 ? s.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const os = { attribute: !0, type: String, converter: _e, reflect: !1, hasChanged: Ie }, ls = (t = os, e, s) => {
  const { kind: i, metadata: n } = s;
  let r = globalThis.litPropertyMetadata.get(n);
  if (r === void 0 && globalThis.litPropertyMetadata.set(n, r = /* @__PURE__ */ new Map()), i === "setter" && ((t = Object.create(t)).wrapped = !0), r.set(s.name, t), i === "accessor") {
    const { name: a } = s;
    return { set(l) {
      const d = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(a, d, t, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(a, void 0, t, l), l;
    } };
  }
  if (i === "setter") {
    const { name: a } = s;
    return function(l) {
      const d = this[a];
      e.call(this, l), this.requestUpdate(a, d, t, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function u(t) {
  return (e, s) => typeof s == "object" ? ls(t, e, s) : ((i, n, r) => {
    const a = n.hasOwnProperty(r);
    return n.constructor.createProperty(r, i), a ? Object.getOwnPropertyDescriptor(n, r) : void 0;
  })(t, e, s);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function h(t) {
  return u({ ...t, state: !0, attribute: !1 });
}
const v = "kustos_vision", st = 3600, ds = 60;
class it {
  constructor(e) {
    this.hass = e, this.signatures = /* @__PURE__ */ new Map(), this.fragmentMaps = /* @__PURE__ */ new Map();
  }
  getConfig() {
    return this.hass.callWS({ type: `${v}/config/get` });
  }
  availableCameras() {
    return this.hass.callWS({ type: `${v}/cameras/available` });
  }
  suggest(e) {
    return this.hass.callWS({
      type: `${v}/camera/suggest`,
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
      type: `${v}/camera/set`,
      replace_existing: s,
      ...e
    });
  }
  deleteCamera(e) {
    return this.hass.callWS({ type: `${v}/camera/delete`, slug: e });
  }
  setViews(e) {
    return this.hass.callWS({ type: `${v}/views/set`, views: e });
  }
  /** Set the order of every camera in one view at once. */
  setViewOrder(e, s) {
    return this.hass.callWS({
      type: `${v}/view/order`,
      view_id: e,
      cameras: s
    });
  }
  setStorage(e) {
    return this.hass.callWS({ type: `${v}/storage/set`, ...e });
  }
  trigger(e, s, i) {
    return this.hass.callWS({
      type: `${v}/camera/trigger`,
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
    const n = await this.tokenFetch(e, s);
    return n.status === 401 && i.refreshAccessToken ? (await this.refreshAccessToken(), this.tokenFetch(e, s)) : n;
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
    const { path: n } = await this.hass.callWS({
      type: "auth/sign_path",
      path: e,
      expires: st
    });
    return this.signatures.set(e, {
      url: n,
      usableUntil: i + (st - ds) * 1e3
    }), n;
  }
  recordingDays(e) {
    return this.hass.callWS({ type: `${v}/recordings/days`, camera: e });
  }
  timeline(e, s, i, n) {
    return this.hass.callWS({
      type: `${v}/recordings/timeline`,
      camera: e,
      from: s,
      to: i,
      ...n ? { stream: n } : {}
    });
  }
  setVision(e) {
    return this.hass.callWS({ type: `${v}/vision/set`, ...e });
  }
  deleteVision(e) {
    return this.hass.callWS({
      type: `${v}/vision/delete`,
      camera_slug: e
    });
  }
  analyseNow(e) {
    return this.hass.callWS({
      type: `${v}/vision/analyse`,
      camera_slug: e
    });
  }
  visionHistory(e) {
    return this.hass.callWS({
      type: `${v}/vision/history`,
      camera_slug: e
    });
  }
  aiTaskEntities() {
    return this.hass.callWS({ type: `${v}/vision/backends` });
  }
  setEndpoint(e) {
    return this.hass.callWS({ type: `${v}/endpoint/set`, ...e });
  }
  deleteEndpoint(e) {
    return this.hass.callWS({
      type: `${v}/endpoint/delete`,
      endpoint_id: e
    });
  }
  /** Ask an endpoint for its models (server-side, past any CORS). */
  endpointModels(e, s) {
    return this.hass.callWS({
      type: `${v}/endpoint/models`,
      url: e,
      api_key: s
    });
  }
  /** One tiny completion against one model, so a typo fails here and not
   *  silently at the next motion event. */
  testEndpoint(e, s, i) {
    return this.hass.callWS({
      type: `${v}/endpoint/test`,
      url: e,
      model: s,
      api_key: i
    });
  }
  setPerson(e) {
    return this.hass.callWS({ type: `${v}/persons/set`, ...e });
  }
  deletePerson(e) {
    return this.hass.callWS({
      type: `${v}/persons/delete`,
      person_id: e
    });
  }
  setPersonsOptions(e) {
    return this.hass.callWS({
      type: `${v}/persons/options`,
      absence_seconds: e
    });
  }
  /** Upload a reference picture. The body is FormData and the Content-Type
   *  is deliberately not set: the browser has to add the multipart boundary,
   *  and a hand-set header would overwrite it with one that has none, which
   *  the server then cannot parse. */
  async uploadReference(e) {
    const s = new FormData();
    s.append("file", e, "referenz");
    const i = await this.authorizedFetch(`/api/${v}/reference`, {
      method: "POST",
      body: s
    });
    if (!i.ok)
      throw new Error(await i.text() || `HTTP ${i.status}`);
    return i.json();
  }
  /** Take a frame from the camera right now and store it as a reference. */
  captureReference(e) {
    return this.hass.callWS({
      type: `${v}/reference/capture`,
      camera_slug: e
    });
  }
  deleteReference(e) {
    return this.hass.callWS({
      type: `${v}/reference/delete`,
      asset_id: e
    });
  }
  /** A displayable URL for a stored reference picture. */
  referenceUrl(e) {
    return this.signedUrl(`/api/${v}/reference/${e}`);
  }
  /** Ask the Supervisor to reconnect the mount behind the recordings. */
  reconnectStorage() {
    return this.hass.callWS({ type: `${v}/storage/reconnect` });
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
    const i = this.hass.callWS({ type: `${v}/recordings/fragments`, path: e }).catch((n) => {
      throw this.fragmentMaps.delete(e), n;
    });
    return this.fragmentMaps.set(e, i), i;
  }
  rebuildIndex() {
    return this.hass.callWS({ type: `${v}/index/rebuild` });
  }
}
function k(t) {
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
function we(t) {
  if (t === null) return "unbekannt";
  const e = ["B", "kB", "MB", "GB", "TB"];
  let s = t, i = 0;
  for (; s >= 1e3 && i < e.length - 1; )
    s /= 1e3, i += 1;
  return `${s.toFixed(s < 10 && i > 0 ? 1 : 0)} ${e[i]}`;
}
const F = M`
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
    overflow-wrap: break-word;
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
  /* The empty half of a row: it pushes, it never claims room of its own.
     .grow used to do this too, and its 160px floor was what sent a delete
     button and a drag grip onto separate lines on a phone. */
  .spacer {
    flex: 1 1 0;
    min-width: 0;
  }
  /* Machine text - entity ids, ffmpeg errors - gives way rather than push:
     "anywhere" also lowers the min-content size, which is what stops one
     unbreakable token forcing the whole page to scroll sideways. */
  .id {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  /* A form row that turns into a column when the room runs out. Bare divs
     are fine as children here: a grid track has a width of its own, while
     a flex child shrinks to whatever its label happens to be. auto-fit
     still splits a wide card in half for two fields, exactly as .row did. */
  .fields {
    display: grid;
    gap: 0 12px;
    grid-template-columns: repeat(
      auto-fit,
      minmax(min(100%, var(--kv-field-min, 220px)), 1fr)
    );
    align-items: start;
  }
  .fields > * {
    min-width: 0;
  }
  /* A table that stops being a table when the room runs out. The wrapper is
     the yardstick, not the window: the panel is only as wide as Home
     Assistant's sidebar leaves it, and the settings cap themselves anyway.

     THE ONLY PLACE container-type MAY APPEAR. Inline-size containment makes
     this element the containing block for fixed descendants and a stacking
     context of its own, which would strand a dropdown popover inside the
     table - tables that carry a dropdown are laid out as .fields instead. */
  .table-stack {
    container-type: inline-size;
    overflow-x: auto;
    overflow-y: hidden;
  }
  @container (max-width: 520px) {
    .table-stack table,
    .table-stack tr,
    .table-stack td {
      display: block;
      width: auto;
    }
    .table-stack tr.head {
      display: none;
    }
    .table-stack tr {
      padding: 10px 0;
      border-bottom: 1px solid var(--divider-color, ButtonBorder);
    }
    .table-stack td {
      border: none;
      padding: 2px 0;
    }
    /* The column heading, carried into the row it belongs to. */
    .table-stack td[data-label]::before {
      content: attr(data-label) ": ";
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
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
  .drag-handle:active {
    cursor: grabbing;
  }
  /* The row in hand while dragging: framed, on its own surface and lifted
     by a shadow, so there is never a doubt which element is moving. The
     outline draws outside the box and shifts no layout. */
  .dragging-lift {
    position: relative;
    z-index: 1;
    background: var(--ha-card-background, var(--card-background-color, Canvas));
    outline: 1px solid var(--primary-color);
    border-radius: var(--kv-radius-field);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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
    /* Two short lines beat one line with three sections hidden behind a
       scrollbar nobody can see. On a wide page they still fit on one. */
    flex-wrap: wrap;
    border-bottom: 1px solid var(--divider-color, ButtonBorder);
    margin-bottom: 16px;
  }
  @media (max-width: 600px) {
    .subtabs button {
      padding: 0 12px;
    }
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
    overflow-wrap: anywhere;
  }
  th {
    color: var(--secondary-text-color);
    font-size: 0.85em;
  }
  .error,
  .muted,
  pre {
    overflow-wrap: anywhere;
  }
  /* A finger is not a mouse pointer. Sized by what is touching the screen,
     not by how wide the window is: a mouse in a narrow window keeps the
     dense layout it has always had, so the desktop stays untouched. */
  @media (pointer: coarse) {
    button {
      min-height: 44px;
    }
    button.compact {
      min-height: 36px;
      padding: 8px 12px;
    }
    .select-field {
      min-height: 44px;
    }
    :host([compact]) .select-field {
      min-height: 36px;
    }
    .drag-handle {
      padding: 10px;
    }
    .subtabs button {
      height: 48px;
    }
  }
`;
var hs = Object.defineProperty, cs = Object.getOwnPropertyDescriptor, W = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? cs(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && hs(e, s, n), n;
};
function ps(t, e) {
  const s = e.trim().toLowerCase();
  return s ? t.filter((i) => i.label.toLowerCase().includes(s)) : t;
}
const Tt = 8, us = 200;
function ge() {
  const t = window.visualViewport;
  return {
    width: t?.width ?? window.innerWidth,
    height: t?.height ?? window.innerHeight
  };
}
function Pt(t, e, s, i = us) {
  const n = e.height - t.bottom - s, r = t.top - s, a = r > n, l = Math.max(e.width - 2 * s, 0), d = Math.min(
    Math.max(t.width, Math.min(i, l)),
    l
  ), m = Math.min(
    Math.max(t.left, s),
    Math.max(e.width - d - s, s)
  );
  return { up: a, maxHeight: Math.max(a ? r : n, 0), left: m, width: d };
}
let L = class extends D {
  constructor() {
    super(...arguments), this.options = [], this.value = "", this.search = !1, this.disabled = !1, this.open = !1, this.query = "", this.highlighted = -1, this.openWidth = 0, this.repositionQueued = !1, this.onOutsidePointer = (t) => {
      t.composedPath().includes(this) || this.close();
    }, this.onAnyScroll = (t) => {
      const e = t.target;
      e instanceof Node && this.renderRoot.contains(e) || this.scheduleReposition();
    }, this.onViewportChange = () => {
      if (ge().width !== this.openWidth) {
        this.close();
        return;
      }
      this.scheduleReposition();
    };
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
  measureDrop() {
    const t = this.renderRoot.querySelector(".select-field");
    if (!(t instanceof HTMLElement)) return;
    const e = t.getBoundingClientRect(), s = ge();
    if (e.bottom < 0 || e.top > s.height) {
      this.close();
      return;
    }
    this.drop = {
      ...Pt(e, s, Tt),
      anchorTop: e.top,
      anchorBottom: e.bottom,
      viewportHeight: s.height
    };
  }
  openDrop() {
    this.openWidth = ge().width, this.measureDrop(), this.drop && (this.query = "", this.highlighted = this.filtered().findIndex((t) => t.value === this.value), this.open = !0, window.addEventListener("pointerdown", this.onOutsidePointer, !0), window.addEventListener("scroll", this.onAnyScroll, !0), window.addEventListener("resize", this.onViewportChange), window.visualViewport?.addEventListener("resize", this.onViewportChange), window.visualViewport?.addEventListener("scroll", this.onViewportChange), this.updateComplete.then(() => {
      const t = this.renderRoot.querySelector(".drop input");
      t instanceof HTMLElement && t.focus(), this.scrollHighlightIntoView();
    }));
  }
  close() {
    this.open = !1, this.drop = void 0, this.unlisten();
  }
  unlisten() {
    window.removeEventListener("pointerdown", this.onOutsidePointer, !0), window.removeEventListener("scroll", this.onAnyScroll, !0), window.removeEventListener("resize", this.onViewportChange), window.visualViewport?.removeEventListener("resize", this.onViewportChange), window.visualViewport?.removeEventListener("scroll", this.onViewportChange);
  }
  scheduleReposition() {
    this.repositionQueued || (this.repositionQueued = !0, requestAnimationFrame(() => {
      this.repositionQueued = !1, this.open && this.measureDrop();
    }));
  }
  filtered() {
    return ps(this.options, this.query);
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
    if (!this.open || !this.drop) return c;
    const t = this.filtered(), e = [
      `left:${this.drop.left}px`,
      `width:${this.drop.width}px`,
      `max-height:${this.drop.maxHeight}px`,
      this.drop.up ? `bottom:${this.drop.viewportHeight - this.drop.anchorTop}px` : `top:${this.drop.anchorBottom}px`
    ].join(";");
    return o`<div class="drop" style=${e} @keydown=${this.onKeydown}>
      ${this.search ? o`<input
            type="text"
            placeholder="Durchsuchen"
            .value=${this.query}
            @input=${(s) => {
      this.query = s.target.value, this.highlighted = 0;
    }}
          />` : c}
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
L.styles = [
  F,
  M`
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
W([
  u({ attribute: !1 })
], L.prototype, "options", 2);
W([
  u()
], L.prototype, "value", 2);
W([
  u({ type: Boolean })
], L.prototype, "search", 2);
W([
  u({ type: Boolean })
], L.prototype, "disabled", 2);
W([
  h()
], L.prototype, "open", 2);
W([
  h()
], L.prototype, "query", 2);
W([
  h()
], L.prototype, "highlighted", 2);
W([
  h()
], L.prototype, "drop", 2);
L = W([
  z("kustos-vision-select")
], L);
var ms = Object.defineProperty, gs = Object.getOwnPropertyDescriptor, Dt = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? gs(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && ms(e, s, n), n;
};
let Ae = class extends D {
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
    </div>` : c;
  }
};
Ae.styles = [
  F,
  M`
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
Dt([
  h()
], Ae.prototype, "open", 2);
Ae = Dt([
  z("kustos-vision-unsaved-dialog")
], Ae);
const ye = [];
function Ve(t) {
  ye.push(t);
}
function Fe(t) {
  const e = ye.indexOf(t);
  e >= 0 && ye.splice(e, 1);
}
function fs() {
  return ye.some((t) => t.isDirty());
}
let Re;
function nt(t) {
  Re = t;
}
async function ne() {
  const t = ye.filter((s) => s.isDirty());
  if (t.length === 0 || !Re) return !0;
  const e = await Re();
  if (e === "cancel") return !1;
  for (const s of t)
    if (e === "save") {
      if (!await s.save()) return !1;
    } else
      s.discard();
  return !0;
}
const De = "0.9.0", bs = "kustos-vision-built:0.9.0", vs = {
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
function Q(t) {
  const e = vs[t];
  if (e) return e;
  const s = t.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const ys = {
  ptz_up: "▲",
  ptz_down: "▼",
  ptz_left: "◀",
  ptz_right: "▶"
};
function rt(t) {
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
const ws = {
  button: "Knopf",
  switch: "An/Aus",
  select: "Auswahl",
  number: "Wert"
};
var $s = Object.defineProperty, ks = Object.getOwnPropertyDescriptor, j = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? ks(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && $s(e, s, n), n;
};
function xs() {
  if (!(typeof window > "u"))
    return window.MediaSource ?? window.ManagedMediaSource;
}
const _s = 2, at = 1024 * 1024, ot = 3, lt = 8, Ss = "mp4a.40.2";
function As(t, e, s) {
  const i = [...t].sort((l, d) => l.start - d.start), n = i.filter(
    (l) => l.start <= e && e < l.start + l.duration
  );
  let r = n.find((l) => l.stream_key === s) ?? n[0];
  if (!r) {
    const l = i.filter((d) => d.start + d.duration > e);
    r = l.find(
      (d) => d.start === l[0]?.start && d.stream_key === s
    ) ?? l[0];
  }
  if (!r) return [];
  let a = 0;
  return i.filter(
    (l) => l.stream_key === r.stream_key && l.start + l.duration > e
  ).map((l) => {
    const d = { segment: l, mediaStart: a };
    return a += l.duration, d;
  });
}
function Es(t, e) {
  for (const i of t) {
    if (e < i.segment.start) return i.mediaStart;
    if (e < i.segment.start + i.segment.duration)
      return i.mediaStart + (e - i.segment.start);
  }
  const s = t[t.length - 1];
  return s ? s.mediaStart + s.segment.duration : 0;
}
function ce(t, e) {
  for (const i of t)
    if (e < i.mediaStart + i.segment.duration)
      return i.segment.start + Math.max(0, e - i.mediaStart);
  const s = t[t.length - 1];
  return s ? s.segment.start + s.segment.duration : 0;
}
function Ct(t, e) {
  const [s, i, n, r] = [0, 1, 2, 3].map((a) => e.charCodeAt(a));
  for (let a = 0; a + 8 < t.length; a += 1)
    if (t[a] === s && t[a + 1] === i && t[a + 2] === n && t[a + 3] === r)
      return a;
  return -1;
}
function Ts(t) {
  return Ct(t, "mp4a") !== -1;
}
function Ps(t) {
  const e = Ct(t, "avcC");
  if (e === -1) return null;
  const s = t[e + 5], i = t[e + 6], n = t[e + 7];
  if (s === void 0 || n === void 0) return null;
  const r = (a) => a.toString(16).padStart(2, "0");
  return `avc1.${r(s)}${r(i)}${r(n)}`;
}
function Mt(t) {
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
const Ds = (t) => t instanceof DOMException && t.name === "QuotaExceededError";
let I = class extends D {
  constructor() {
    super(...arguments), this.segments = [], this.seekTo = 0, this.segmentUrlBase = "/api/kustos_vision/segment", this.message = "", this.loadingRun = !1, this.withAudio = !0, this.placed = [], this.appended = /* @__PURE__ */ new Set(), this.accepted = 0, this.loading = !1, this.generation = 0, this.wired = !1, this.recoveries = 0, this.streamingWanted = !0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.teardown();
  }
  updated(t) {
    t.has("segments") ? (this.recoveries = 0, this.video()?.pause(), this.load()) : t.has("seekTo") && (this.recoveries = 0, this.jump(this.seekTo));
  }
  video() {
    return this.renderRoot.querySelector("video");
  }
  /** Attach the element listeners exactly once; loads come and go. */
  wire(t) {
    this.wired || (this.wired = !0, t.addEventListener("timeupdate", () => {
      if (this.pump(), this.placed.length > 0 && !t.seeking && !t.paused) {
        const e = ce(this.placed, t.currentTime);
        this.clockUtc = e, this.dispatchEvent(
          new CustomEvent("positionchange", {
            detail: { time: e },
            bubbles: !0,
            composed: !0
          })
        );
      }
    }), t.addEventListener("seeked", () => {
      this.placed.length > 0 && (this.clockUtc = ce(this.placed, t.currentTime));
    }), t.addEventListener("seeking", () => this.onSeeking()), t.addEventListener("waiting", () => this.skipHole()), t.addEventListener("error", () => {
      const e = t.error;
      if (e) {
        if (this.recoveries < lt && this.placed.length > 0) {
          this.recoveries += 1;
          const s = ce(this.placed, t.currentTime) + ot * this.recoveries;
          console.warn(
            `kustos_vision: decoder refused playback (${e.message || e.code}), skipping ${ot * this.recoveries}s ahead (${this.recoveries}/${lt})`
          ), this.load(s, this.placed[0]?.segment.stream_key, !0);
          return;
        }
        this.message || (this.message = `Der Browser meldet einen Wiedergabefehler${e.message ? `: ${e.message}` : ` (Code ${e.code})`}.`);
      }
    }));
  }
  jump(t) {
    if (!this.segments.some(
      (a) => t >= a.start && t < a.start + a.duration
    )) {
      this.gapAt = t, this.video()?.pause();
      return;
    }
    this.gapAt = void 0;
    const s = this.placed.find(
      (a) => t >= a.segment.start && t < a.segment.start + a.segment.duration
    );
    if (!s) {
      this.load(t, this.placed[0]?.segment.stream_key);
      return;
    }
    const i = this.video();
    if (!i) return;
    const n = s.mediaStart + (t - s.segment.start);
    if (this.isBuffered(i, n)) {
      i.currentTime = n;
      return;
    }
    const r = this.placed.find(
      (a) => !this.appended.has(a.segment.path)
    );
    if (this.carry?.path === s.segment.path || r?.segment.path === s.segment.path) {
      i.currentTime = n, this.pump();
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
    const s = this.placed.find((r) => e < r.mediaStart + r.segment.duration);
    if (!s) return;
    const i = this.placed.find(
      (r) => !this.appended.has(r.segment.path)
    );
    if (this.carry?.path === s.segment.path || i?.segment.path === s.segment.path) {
      this.pump();
      return;
    }
    if (!this.appended.has(s.segment.path)) {
      this.load(ce(this.placed, e), s.segment.stream_key);
      return;
    }
    const n = t.buffered;
    if (n.length > 0 && e < n.start(0)) {
      this.load(ce(this.placed, e), s.segment.stream_key);
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
    t && (t.pause(), t.removeAttribute("src"), t.load()), this.loadingRun = !1, this.objectUrl && URL.revokeObjectURL(this.objectUrl), this.objectUrl = void 0, this.buffer = void 0, this.media = void 0, this.placed = [], this.appended.clear(), this.accepted = 0, this.carry = void 0, this.startup = void 0, this.loading = !1, this.streamingWanted = !0;
  }
  async load(t, e, s = !1) {
    const i = this.video(), n = i !== null && !i.paused;
    this.teardown();
    const r = this.generation;
    if (this.message = "", this.gapAt = void 0, this.segments.length === 0) {
      this.message = "Für diesen Zeitraum ist nichts aufgezeichnet.";
      return;
    }
    const a = xs();
    if (!a) {
      this.message = "Dieser Browser unterstützt die Wiedergabe nicht.";
      return;
    }
    this.loadingRun = !0;
    const l = t ?? this.seekTo ?? this.segments[0].start;
    if (this.placed = As(this.segments, l, e), this.placed.length === 0) {
      this.message = "Ab diesem Zeitpunkt ist nichts mehr aufgezeichnet.";
      return;
    }
    this.startup = {
      mediaTime: Es(this.placed, l),
      resume: s || n,
      // After a decode refusal the ranged fetch must not start at the
      // refused keyframe again: measured, that costs one futile recovery
      // per skip until the skips outgrow the frame's multi-second span.
      pastRefusal: s
    };
    let d;
    try {
      d = await this.inspect(this.placed[0].segment);
    } catch {
      if (r !== this.generation) return;
      try {
        d = await this.inspect(this.placed[0].segment);
      } catch (x) {
        this.message = k(x);
        return;
      }
    }
    if (r !== this.generation) return;
    if (!d) {
      this.message = "Diese Aufnahme ist nicht H.264. Die Wiedergabe im Panel unterstützt derzeit nur H.264; die Datei selbst ist unbeschädigt und lässt sich herunterladen.";
      return;
    }
    const m = `video/mp4; codecs="${d}"`, f = `video/mp4; codecs="${d}, ${Ss}"`, p = this.withAudio ? f : m, b = a.isTypeSupported(p) ? p : a.isTypeSupported(m) ? m : null;
    if (!b) {
      this.message = `Dieser Browser kann ${d} nicht abspielen.`;
      return;
    }
    const g = new a();
    this.media = g, this.objectUrl = URL.createObjectURL(g), await this.updateComplete;
    const y = this.video();
    y && (this.wire(y), window.MediaSource || (y.disableRemotePlayback = !0, g.addEventListener("startstreaming", () => {
      this.streamingWanted = !0, this.pump();
    }), g.addEventListener("endstreaming", () => {
      this.streamingWanted = !1;
    })), y.src = this.objectUrl, g.addEventListener(
      "sourceopen",
      () => {
        if (r === this.generation)
          try {
            const x = g.addSourceBuffer(b);
            x.mode = "segments", this.buffer = x, x.addEventListener("updateend", () => void this.pump());
            const V = this.placed[this.placed.length - 1];
            V && (g.duration = V.mediaStart + V.segment.duration), this.pump();
          } catch (x) {
            this.message = k(x);
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
    return this.withAudio = Ts(s), Ps(s);
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
    let n = i.fragments[0];
    for (const l of i.fragments)
      if (l.start <= e) n = l;
      else break;
    if (s && e > 0) {
      const l = i.fragments.indexOf(n);
      l >= 0 && l + 1 < i.fragments.length && (n = i.fragments[l + 1]);
    }
    const [r, a] = await Promise.all([
      this.api.authorizedFetch(this.urlFor(t), {
        headers: { Range: `bytes=0-${i.init_end - 1}` }
      }),
      this.api.authorizedFetch(this.urlFor(t), {
        headers: { Range: `bytes=${n.offset}-${i.data_end - 1}` }
      })
    ]);
    return r.status !== 206 || a.status !== 206 ? null : {
      init: new Uint8Array(await r.arrayBuffer()),
      data: a
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
      let n;
      const r = (l) => {
        n = l;
      }, a = () => {
        e.removeEventListener("error", r), e.removeEventListener("updateend", a), n ? i(new Error("Der Puffer hat die Daten abgelehnt.")) : s();
      };
      e.addEventListener("error", r), e.addEventListener("updateend", a);
      try {
        e.appendBuffer(t);
      } catch (l) {
        e.removeEventListener("error", r), e.removeEventListener("updateend", a), i(l);
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
    const s = this.placed[0]?.segment.duration ?? 0, i = t.currentTime - s, n = e.buffered;
    return n.length === 0 || i <= n.start(0) ? !1 : (await new Promise((r) => {
      e.addEventListener("updateend", () => r(), { once: !0 }), e.remove(n.start(0), i);
    }), !0);
  }
  /** Keep a little footage buffered ahead of the playhead. */
  async pump() {
    const t = this.buffer, e = this.media;
    if (!t || !e || t.updating || this.loading || e.readyState !== "open") return;
    const s = this.video();
    if (!this.carry) {
      if (!this.streamingWanted) return;
      const i = this.placed.find((r) => !this.appended.has(r.segment.path));
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
      if (s && this.appended.size > 0 && (s.buffered.length > 0 ? s.buffered.end(s.buffered.length - 1) : 0) - s.currentTime > _s * (this.placed[0]?.segment.duration ?? 0))
        return;
      const n = this.generation;
      this.loading = !0;
      try {
        const r = this.startup !== void 0 ? Math.max(0, this.startup.mediaTime - i.mediaStart) : 0, a = await this.fetchRanged(
          i.segment,
          r,
          this.startup?.pastRefusal ?? !1
        );
        let l, d = null;
        if (a ? (l = a.data, d = a.init) : l = await this.fetchSegment(i.segment), !l.ok) throw new Error(`HTTP ${l.status}`);
        if (n !== this.generation || !this.buffer || e.readyState !== "open")
          return;
        if (this.accepted > 0 && this.buffer.abort(), this.buffer.timestampOffset = i.mediaStart, this.appended.add(i.segment.path), this.carry = {
          path: i.segment.path,
          // Streamed on purpose: waiting for a whole high-resolution segment
          // to download before the first append kept the screen black for
          // the length of a fifty-megabyte transfer after every click.
          reader: l.body ? l.body.getReader() : null,
          // A ranged fetch starts mid-file, so the init segment the parser
          // needs first is prepended here.
          pending: d ?? (l.body ? new Uint8Array(0) : new Uint8Array(await l.arrayBuffer())),
          firstOfSegment: !0
        }, d && !l.body) {
          const m = new Uint8Array(await l.arrayBuffer()), f = new Uint8Array(d.length + m.length);
          f.set(d), f.set(m, d.length), this.carry.pending = f;
        }
        if (n !== this.generation) return;
      } catch (r) {
        this.appended.add(i.segment.path), console.warn(
          "kustos_vision: segment could not be fetched",
          i.segment.path,
          r
        );
      } finally {
        this.loading = !1;
      }
      if (!this.carry) {
        n === this.generation && this.pump();
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
        if (e.pending.length >= at || i) {
          const n = e.pending.subarray(0, at);
          try {
            await this.appendOnce(n);
          } catch (r) {
            if (s !== this.generation) return;
            if (Ds(r)) {
              if (await this.evictBehind(t)) continue;
              return;
            }
            console.warn(
              "kustos_vision: segment could not be appended",
              e.path,
              r
            ), e.reader && e.reader.cancel().catch(() => {
            }), this.carry = void 0;
            return;
          }
          if (s !== this.generation) return;
          e.pending = e.pending.subarray(n.length), e.firstOfSegment && (this.accepted += 1, e.firstOfSegment = !1, this.loadingRun = !1, this.applyStartup()), this.nudgePlayback(t);
          continue;
        }
        if (e.reader) {
          const { value: n, done: r } = await e.reader.read();
          if (s !== this.generation) return;
          if (n && n.length > 0) {
            const a = new Uint8Array(e.pending.length + n.length);
            a.set(e.pending), a.set(n, e.pending.length), e.pending = a;
          }
          r && (e.reader = null);
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
      ${this.clockUtc !== void 0 && !this.message && this.gapAt === void 0 ? o`<div class="clock">${Mt(this.clockUtc)}</div>` : c}
      ${this.gapAt !== void 0 ? o`<div class="gap">
            Um ${new Date(this.gapAt * 1e3).toLocaleTimeString()} liegt keine
            Aufnahme vor.
          </div>` : c}
      ${this.message ? o`<div class="overlay">${this.message}</div>` : c}
      ${this.loadingRun && !this.message && this.gapAt === void 0 ? o`<div class="overlay">Lade Aufnahme …</div>` : c}
    `;
  }
};
I.styles = M`
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
j([
  u({ attribute: !1 })
], I.prototype, "api", 2);
j([
  u({ attribute: !1 })
], I.prototype, "segments", 2);
j([
  u({ type: Number })
], I.prototype, "seekTo", 2);
j([
  u()
], I.prototype, "segmentUrlBase", 2);
j([
  h()
], I.prototype, "message", 2);
j([
  h()
], I.prototype, "gapAt", 2);
j([
  h()
], I.prototype, "clockUtc", 2);
j([
  h()
], I.prototype, "loadingRun", 2);
I = j([
  z("kustos-vision-player")
], I);
var Cs = Object.defineProperty, Ms = Object.getOwnPropertyDescriptor, U = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? Ms(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && Cs(e, s, n), n;
};
const dt = 8, ht = 1.2;
let O = class extends D {
  constructor() {
    super(...arguments), this.entityId = "", this.muted = !0, this.mode = "idle", this.message = "", this.nowSeconds = 0, this.expanded = !1, this.immersive = !1, this.zoom = { scale: 1, x: 0, y: 0 }, this.pointers = /* @__PURE__ */ new Map(), this.visible = !1, this.starting = !1, this.onImmersiveKey = (t) => {
      t.key === "Escape" && (t.preventDefault(), this.leaveImmersive(!0));
    }, this.onImmersivePop = () => this.leaveImmersive(!1), this.onFullscreenChange = () => {
      this.setExpanded(this.isNativeFullscreen() || this.immersive);
    }, this.onWheel = (t) => {
      if (!this.expanded) return;
      t.preventDefault();
      const { scale: e, x: s, y: i } = this.zoom, n = t.deltaY < 0 ? ht : 1 / ht, r = Math.min(dt, Math.max(1, e * n));
      if (r === e) return;
      const a = this.getBoundingClientRect(), l = t.clientX - a.left, d = t.clientY - a.top, m = r / e;
      this.zoom = this.clampedZoom(
        r,
        l - (l - s) * m,
        d - (d - i) * m
      );
    }, this.onDoubleClick = () => {
      this.expanded && (this.zoom = { scale: 1, x: 0, y: 0 });
    }, this.onPointerDown = (t) => {
      if (!this.expanded) return;
      const e = t.composedPath()[0];
      e instanceof HTMLElement && e.closest(".exit") || this.pointers.size === 0 && this.zoom.scale === 1 && t.pointerType === "mouse" || (this.setPointerCapture(t.pointerId), this.pointers.set(t.pointerId, { x: t.clientX, y: t.clientY }), this.rebaseGesture());
    }, this.onPointerMove = (t) => {
      if (!this.pointers.has(t.pointerId)) return;
      this.pointers.set(t.pointerId, { x: t.clientX, y: t.clientY });
      const e = this.gesture;
      if (!e) return;
      const s = this.pointerAnchor();
      let i = e.scale;
      if (e.span !== null && s.span !== null && e.span > 0)
        i = Math.min(dt, Math.max(1, e.scale * (s.span / e.span)));
      else if (e.scale === 1)
        return;
      const n = i / e.scale;
      this.zoom = this.clampedZoom(
        i,
        s.midX - (e.midX - e.x) * n,
        s.midY - (e.midY - e.y) * n
      );
    }, this.onPointerUp = (t) => {
      this.pointers.delete(t.pointerId) && this.rebaseGesture();
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.nowSeconds = Date.now() / 1e3, this.clockTimer = setInterval(() => {
      this.nowSeconds = Date.now() / 1e3;
    }, 1e3), this.observer = new IntersectionObserver((t) => {
      const e = t.some((s) => s.isIntersecting);
      e !== this.visible && (this.visible = e, e ? this.start() : this.stop());
    }), this.observer.observe(this), this.addEventListener("fullscreenchange", this.onFullscreenChange), document.addEventListener("fullscreenchange", this.onFullscreenChange), document.addEventListener("webkitfullscreenchange", this.onFullscreenChange), this.addEventListener("dblclick", this.onDoubleClick), this.addEventListener("pointerdown", this.onPointerDown), this.addEventListener("pointermove", this.onPointerMove), this.addEventListener("pointerup", this.onPointerUp), this.addEventListener("pointercancel", this.onPointerUp);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.clockTimer !== void 0 && clearInterval(this.clockTimer), this.clockTimer = void 0, this.observer?.disconnect(), this.observer = void 0, this.removeEventListener("fullscreenchange", this.onFullscreenChange), document.removeEventListener("fullscreenchange", this.onFullscreenChange), document.removeEventListener(
      "webkitfullscreenchange",
      this.onFullscreenChange
    ), this.leaveImmersive(!1), this.removeEventListener("wheel", this.onWheel), this.removeEventListener("dblclick", this.onDoubleClick), this.removeEventListener("pointerdown", this.onPointerDown), this.removeEventListener("pointermove", this.onPointerMove), this.removeEventListener("pointerup", this.onPointerUp), this.removeEventListener("pointercancel", this.onPointerUp), this.stop();
  }
  // --------------------------------------------------------------------
  // Fullscreen and the loupe
  // --------------------------------------------------------------------
  /**
   * Whether this very element natively fills the screen.
   *
   * document.fullscreenElement is retargeted at shadow boundaries and
   * answers with the outermost host, never with an element nested in
   * shadow roots like this one; the containing root's view is the one
   * that names this element itself. Older WebKit only has the prefixed,
   * unretargeted answer.
   */
  isNativeFullscreen() {
    const t = this.getRootNode();
    return (t instanceof ShadowRoot ? t.fullscreenElement : document.fullscreenElement) === this ? !0 : document.webkitFullscreenElement === this;
  }
  nativeFullscreenAvailable() {
    const t = document, e = this;
    return typeof e.requestFullscreen == "function" && document.fullscreenEnabled ? !0 : typeof e.webkitRequestFullscreen == "function" && t.webkitFullscreenEnabled === !0;
  }
  /** Fill the screen with this picture, or step back out of it. */
  async toggleFullscreen() {
    if (this.expanded) {
      this.collapse();
      return;
    }
    if (this.nativeFullscreenAvailable())
      try {
        const t = this;
        if (await (typeof t.requestFullscreen == "function" ? t.requestFullscreen({ navigationUI: "hide" }) : t.webkitRequestFullscreen?.()), this.isNativeFullscreen()) return;
      } catch {
      }
    this.enterImmersive();
  }
  collapse() {
    if (this.immersive) {
      this.leaveImmersive(!0);
      return;
    }
    const t = document;
    typeof document.exitFullscreen == "function" ? document.exitFullscreen() : t.webkitExitFullscreen?.();
  }
  enterImmersive() {
    this.immersive = !0, this.setExpanded(!0), window.addEventListener("keydown", this.onImmersiveKey, !0), window.addEventListener("popstate", this.onImmersivePop), history.pushState({ ...history.state ?? {}, kvImmersive: !0 }, "");
  }
  leaveImmersive(t) {
    if (!this.immersive) return;
    this.immersive = !1, window.removeEventListener("keydown", this.onImmersiveKey, !0), window.removeEventListener("popstate", this.onImmersivePop), this.setExpanded(!1);
    const e = history.state;
    t && e?.kvImmersive && history.back();
  }
  /** Both routes to the screen meet here; the loupe lives and dies with it. */
  setExpanded(t) {
    this.expanded !== t && (this.expanded = t, t ? this.addEventListener("wheel", this.onWheel, { passive: !1 }) : (this.removeEventListener("wheel", this.onWheel), this.zoom = { scale: 1, x: 0, y: 0 }));
  }
  /** Keep the picture covering the box: no gaps past any edge. */
  clampedZoom(t, e, s) {
    const i = this.getBoundingClientRect();
    return {
      scale: t,
      x: Math.min(0, Math.max(i.width * (1 - t), e)),
      y: Math.min(0, Math.max(i.height * (1 - t), s))
    };
  }
  /** Where the fingers meet and how far apart they are, element-local. */
  pointerAnchor() {
    const t = this.getBoundingClientRect(), e = [...this.pointers.values()], s = e.reduce((r, a) => r + a.x, 0) / e.length - t.left, i = e.reduce((r, a) => r + a.y, 0) / e.length - t.top, n = e.length >= 2 ? Math.hypot(e[0].x - e[1].x, e[0].y - e[1].y) : null;
    return { midX: s, midY: i, span: n };
  }
  /** Every added or lifted finger starts the gesture over from the current
      zoom, which is what lets a pinch hand over to a one-finger pan. */
  rebaseGesture() {
    if (this.pointers.size === 0) {
      this.gesture = void 0;
      return;
    }
    this.gesture = { ...this.zoom, ...this.pointerAnchor() };
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
    this.mode = "error", this.message = k(t);
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
      e.addEventListener("track", (r) => {
        s.addTrack(r.track);
        const a = this.renderRoot.querySelector("video");
        a && (a.srcObject = s);
      });
      const i = await e.createOffer();
      await e.setLocalDescription(i);
      let n;
      return e.addEventListener("icecandidate", (r) => {
        !r.candidate || !n || this.hass.callWS({
          type: "camera/webrtc/candidate",
          entity_id: this.entityId,
          session_id: n,
          candidate: r.candidate.toJSON()
        });
      }), this.mode = "webrtc", this.unsubscribe = await this.subscribe(
        {
          type: "camera/webrtc/offer",
          entity_id: this.entityId,
          offer: i.sdp
        },
        (r) => {
          r.type === "session" ? n = r.session_id : r.type === "answer" ? e.setRemoteDescription({
            type: "answer",
            sdp: r.answer
          }) : r.type === "candidate" ? e.addIceCandidate(
            r.candidate
          ) : r.type === "error" && this.fail(new Error(String(r.message)));
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
    const t = ["webrtc", "hls", "mjpeg"].includes(this.mode), { scale: e, x: s, y: i } = this.zoom;
    return o`<div
      class="stage"
      style="transform: translate(${s}px, ${i}px) scale(${e}); cursor: ${this.expanded && e > 1 ? "grab" : "default"}"
    >
      ${this.renderPicture()}
    </div>
    ${t ? o`<div class="clock">${Mt(this.nowSeconds)}</div>` : c}
    ${this.expanded ? o`<button
          class="exit"
          title="Vollbild verlassen"
          @click=${() => void this.toggleFullscreen()}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M14,14H19V16H16V19H14V14M5,14H10V19H8V16H5V14M8,5H10V10H5V8H8V5M19,8V10H14V5H16V8H19Z"
            />
          </svg>
        </button>` : c}
    ${e > 1 ? o`<div class="zoombadge">${e.toFixed(1)}×</div>` : c}
    ${this.expanded && e === 1 ? o`<div class="zoomhint">
          <span class="fine"
            >Mausrad: Lupe · Ziehen: verschieben · Doppelklick: zurücksetzen ·
            Esc: verlassen</span
          >
          <span class="coarse"
            >Zwei Finger: Lupe · Ziehen: verschieben · Doppeltipp:
            zurücksetzen · Kreuz oben rechts: verlassen</span
          >
        </div>` : c}`;
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
        return o`<div class="overlay">…</div>${c}`;
    }
  }
};
O.styles = M`
    :host {
      display: block;
      position: relative;
      /* The letterbox behind a 16:9 picture, dark in every theme for the
         same reason the player chrome is: it frames video, not text. */
      background: #111;
      aspect-ratio: 16 / 9;
      overflow: hidden;
    }
    /* Three ways to be the whole screen. Each needs its own rule: a
       selector list dies whole in a browser that does not know one of its
       parts, and :-webkit-full-screen is exactly such a part. */
    :host(:fullscreen) {
      /* The screen decides the shape now, not the tile. */
      aspect-ratio: auto;
      width: 100%;
      height: 100%;
      /* The loupe's fingers, not the browser's gestures. */
      touch-action: none;
    }
    :host(:-webkit-full-screen) {
      aspect-ratio: auto;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
    /* The screen, taken without the browser's help - for iPhone Safari and
       the companion app's web view, which have no fullscreen API for an
       element at all. */
    :host([immersive]) {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      /* Follows the address bar as it slides away. */
      height: 100dvh;
      z-index: 120;
      aspect-ratio: auto;
      touch-action: none;
      /* Nothing behind this may scroll while a finger pans the picture. */
      overscroll-behavior: contain;
    }
    .stage {
      position: absolute;
      inset: 0;
      /* The loupe's maths anchor at the top-left corner. */
      transform-origin: 0 0;
    }
    video,
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .zoombadge,
    .zoomhint {
      position: absolute;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 1;
    }
    .zoombadge {
      top: 8px;
      left: 8px;
      font-family: ui-monospace, monospace;
    }
    .zoomhint {
      /* Clear of the home indicator and the rounded corners. */
      bottom: calc(8px + env(safe-area-inset-bottom, 0px));
      left: calc(8px + env(safe-area-inset-left, 0px));
    }
    .zoomhint .coarse {
      display: none;
    }
    @media (pointer: coarse) {
      .zoomhint .fine {
        display: none;
      }
      .zoomhint .coarse {
        display: inline;
      }
    }
    .exit {
      position: absolute;
      /* Out from under the notch and the rounded corner. */
      top: calc(8px + env(safe-area-inset-top, 0px));
      right: calc(8px + env(safe-area-inset-right, 0px));
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      cursor: pointer;
    }
    /* The clock makes room for the exit button while it is on screen -
       one rule per fullscreen flavour, see above. */
    :host(:fullscreen) .clock {
      right: calc(64px + env(safe-area-inset-right, 0px));
    }
    :host(:-webkit-full-screen) .clock {
      right: calc(64px + env(safe-area-inset-right, 0px));
    }
    :host([immersive]) .clock {
      right: calc(64px + env(safe-area-inset-right, 0px));
      top: calc(8px + env(safe-area-inset-top, 0px));
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
U([
  u({ attribute: !1 })
], O.prototype, "hass", 2);
U([
  u()
], O.prototype, "entityId", 2);
U([
  u({ type: Boolean })
], O.prototype, "muted", 2);
U([
  h()
], O.prototype, "mode", 2);
U([
  h()
], O.prototype, "message", 2);
U([
  h()
], O.prototype, "nowSeconds", 2);
U([
  h()
], O.prototype, "expanded", 2);
U([
  u({ type: Boolean, reflect: !0 })
], O.prototype, "immersive", 2);
U([
  h()
], O.prototype, "zoom", 2);
O = U([
  z("kustos-vision-live-stream")
], O);
var zs = Object.defineProperty, Os = Object.getOwnPropertyDescriptor, Z = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? Os(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && zs(e, s, n), n;
};
const Rs = ["ptz_up", "ptz_left", "ptz_right", "ptz_down", "siren_on", "siren_off"], Bs = ["light", "siren", "privacy_mode"];
let N = class extends D {
  constructor() {
    super(...arguments), this.viewId = "", this.narrow = !1, this.busy = "", this.error = "";
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
      this.error = k(s);
    } finally {
      this.busy = "";
    }
  }
  renderButton(t, e, s) {
    return o`<button
      class="secondary compact"
      title=${Q(t)}
      aria-label=${Q(t)}
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
  openFullscreen() {
    this.renderRoot.querySelector("kustos-vision-live-stream")?.toggleFullscreen();
  }
  renderControls() {
    const t = this.shownCapabilities, e = this.shownControls;
    if (!t.length && !e.length) return c;
    const s = [];
    for (const r of Rs)
      t.includes(r) && s.push(this.renderButton(r, ys[r] ?? Q(r)));
    for (const r of Bs)
      t.includes(r) && s.push(
        this.renderButton(r, `${Q(r)} an`, !0),
        this.renderButton(r, `${Q(r)} aus`, !1)
      );
    const i = s.length + e.length, n = o`<div class="controls">
      ${s}${e.map((r) => this.renderCustom(r))}
    </div>`;
    return !this.narrow || i <= 3 ? n : o`<details class="expander">
      <summary>Bedienung (${i})</summary>
      <div class="expander-body">${n}</div>
    </details>`;
  }
  render() {
    const t = this.liveEntity, e = this.camera.state, s = e.streams.filter((n) => n.running).length, i = e.recording ? "zeichnet auf" : e.wants_recording ? e.paused ? "pausiert" : "Aufzeichnung steht" : "keine Aufzeichnung";
    return o`
      <header>
        <span
          class="dot ${e.recording ? "recording" : ""} ${e.wants_recording ? "" : "idle"}"
          aria-hidden="true"
          title=${e.recording ? `${s} Stream(s) werden aufgezeichnet` : i}
        ></span>
        <span>${this.camera.name}</span>
        <span class="spacer"></span>
        ${o`<span class="meta">${i}</span>`}
        ${t ? o`<button
              class="secondary compact"
              title="Vollbild (mit Lupe)"
              aria-label="Vollbild"
              @click=${this.openFullscreen}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z"
                />
              </svg>
            </button>` : c}
      </header>

      ${t ? o`<kustos-vision-live-stream
            .hass=${this.hass}
            .entityId=${t}
          ></kustos-vision-live-stream>` : o`<div class="meta" style="padding:12px">Kein Stream zugeordnet</div>`}

      ${this.renderControls()}
      ${this.error ? o`<div class="error">${this.error}</div>` : c}
    `;
  }
};
N.styles = [
  F,
  M`
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
      /* The shared expander, worn as the tile's own bottom edge. */
      details.expander {
        margin: 0;
        border: none;
        border-top: 1px solid var(--divider-color, ButtonBorder);
        border-radius: 0;
      }
      details.expander > summary {
        padding: 10px 12px;
        font-weight: normal;
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }
      details.expander > .expander-body {
        padding: 0;
      }
    `
];
Z([
  u({ attribute: !1 })
], N.prototype, "hass", 2);
Z([
  u({ attribute: !1 })
], N.prototype, "api", 2);
Z([
  u({ attribute: !1 })
], N.prototype, "camera", 2);
Z([
  u()
], N.prototype, "viewId", 2);
Z([
  u({ type: Boolean })
], N.prototype, "narrow", 2);
Z([
  h()
], N.prototype, "busy", 2);
Z([
  h()
], N.prototype, "error", 2);
N = Z([
  z("kustos-vision-camera-tile")
], N);
var Ls = Object.defineProperty, Is = Object.getOwnPropertyDescriptor, oe = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? Is(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && Ls(e, s, n), n;
};
let q = class extends D {
  constructor() {
    super(...arguments), this.cameras = [], this.narrow = !1;
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
    const e = this.view.columns > 0 ? `--kv-cols-config:${this.view.columns};--kv-tile-floor:240px` : "";
    return o`
      <div class="grid" style=${e}>
        ${t.map(
      (s) => o`
            <kustos-vision-camera-tile
              .hass=${this.hass}
              .api=${this.api}
              .camera=${s}
              .viewId=${this.view.id}
              ?narrow=${this.narrow}
            ></kustos-vision-camera-tile>
          `
    )}
      </div>
    `;
  }
};
q.styles = M`
    :host {
      display: block;
      /* A phone has no 16px to spare on each side; a monitor does. */
      padding: min(16px, 3vw);
    }
    .grid {
      display: grid;
      --kv-gap: min(16px, 3vw);
      /* The count the view asked for, or a number that simply means "as
         many as fit". */
      --kv-cols: var(--kv-cols-config, 24);
      /* Below this a tile is a thumbnail: the controls under the picture
         start clipping and the name no longer fits beside the dot. The
         view-less default keeps the old 320px, so a wall display is laid
         out exactly as before. */
      --kv-tile-floor: 320px;
      gap: var(--kv-gap);
      /* The configured count is a ceiling, not an order: the track floor
         drops a column rather than shrink a picture to 99px. On a monitor
         the two agree and the wall looks exactly as it was configured. */
      grid-template-columns: repeat(
        auto-fill,
        minmax(
          max(
            var(--kv-tile-floor),
            (100% - (var(--kv-cols) - 1) * var(--kv-gap)) / var(--kv-cols)
          ),
          1fr
        )
      );
    }
    .grid > * {
      min-width: 0;
    }
    /* A phone lying on its side: the screen is short, so two pictures side
       by side are the most that still shows anything. */
    @media (orientation: landscape) and (max-height: 500px) {
      .grid {
        --kv-cols: min(2, var(--kv-cols-config, 24));
      }
    }
    .empty {
      color: var(--secondary-text-color);
      padding: 32px 8px;
      text-align: center;
      line-height: 1.5;
    }
  `;
oe([
  u({ attribute: !1 })
], q.prototype, "hass", 2);
oe([
  u({ attribute: !1 })
], q.prototype, "api", 2);
oe([
  u({ attribute: !1 })
], q.prototype, "view", 2);
oe([
  u({ attribute: !1 })
], q.prototype, "cameras", 2);
oe([
  u({ type: Boolean })
], q.prototype, "narrow", 2);
q = oe([
  z("kustos-vision-live-view")
], q);
var Ns = Object.defineProperty, Us = Object.getOwnPropertyDescriptor, B = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? Us(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && Ns(e, s, n), n;
};
const Hs = 120;
function Vs(t, e) {
  const i = Math.max(1, Math.floor(e / 72));
  return Math.max(1, Math.ceil(t / i));
}
function Fs(t, e, s, i = 4) {
  const n = s / 2, r = Math.min(n + i, e / 2), a = Math.max(e - n - i, e / 2);
  return Math.min(Math.max(t, r), a);
}
const Ws = 168;
let C = class extends D {
  constructor() {
    super(...arguments), this.from = 0, this.to = 0, this.blocks = [], this.segments = [], this.position = 0, this.thumbnailUrlBase = "/api/kustos_vision/thumbnail", this.dragging = !1, this.barWidth = 0;
  }
  connectedCallback() {
    super.connectedCallback(), this.resizeObserver = new ResizeObserver((t) => {
      const e = t[0]?.contentRect.width;
      e !== void 0 && (this.barWidth = e);
    }), this.resizeObserver.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.resizeObserver?.disconnect(), this.resizeObserver = void 0, this.clearSettle();
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
    }, Hs);
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
  /**
   * The cursor's place, kept just inside the bar.
   *
   * A run now starts paused at the beginning of the day, which puts the
   * cursor at exactly 0%: there its 2px line disappeared into the bar's
   * rounded corner and the edge, and the tab looked like it had no cursor
   * at all. The inset is the line's own width, enough to keep it whole.
   */
  cursorLeft() {
    const t = this.percent(this.position);
    if (!this.barWidth) return `${t}%`;
    const e = 2, s = t / 100 * this.barWidth;
    return `${Math.min(Math.max(s, e), this.barWidth - e)}px`;
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
    if (t.length < 2) return c;
    const e = Vs(t.length, this.barWidth || 900);
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
              </span>` : c}`
    )}
    </div>`;
  }
  render() {
    return this.to <= this.from ? c : o`
      <div class="wrap">
        ${this.hover ? o`<div
              class="preview"
              style="left:${this.barWidth ? Fs(
      this.hover.x / 100 * this.barWidth,
      this.barWidth,
      Math.min(Ws, this.barWidth)
    ) + "px" : `${this.hover.x}%`}"
            >
              ${this.preview && this.preview.path === this.hover.segment?.path ? o`<img alt="" src=${this.preview.url} />` : c}
              <div class="time">${this.formatTime(this.hover.time)}</div>
            </div>` : c}

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
          ${this.position >= this.from && this.position <= this.to ? o`<div class="playhead" style="left:${this.cursorLeft()}"></div>
                <div class="head" style="left:${this.cursorLeft()}">
                  <div class="flag">${this.formatTime(this.position)}</div>
                  <div class="arrow"></div>
                </div>` : c}
          ${this.renderGrid()}
        </div>
        ${this.renderScale()}
        ${this.blocks.length === 0 ? o`<div class="empty">An diesem Tag wurde nichts aufgezeichnet.</div>` : c}
      </div>
    `;
  }
};
C.styles = M`
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
      /* Not wider than a phone can afford beside its own edges. */
      width: min(160px, 40vw);
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
B([
  u({ type: Number })
], C.prototype, "from", 2);
B([
  u({ type: Number })
], C.prototype, "to", 2);
B([
  u({ attribute: !1 })
], C.prototype, "blocks", 2);
B([
  u({ attribute: !1 })
], C.prototype, "segments", 2);
B([
  u({ type: Number })
], C.prototype, "position", 2);
B([
  u()
], C.prototype, "thumbnailUrlBase", 2);
B([
  u({ attribute: !1 })
], C.prototype, "api", 2);
B([
  h()
], C.prototype, "hover", 2);
B([
  h()
], C.prototype, "dragging", 2);
B([
  h()
], C.prototype, "preview", 2);
B([
  h()
], C.prototype, "barWidth", 2);
C = B([
  z("kustos-vision-timeline")
], C);
var js = Object.defineProperty, Ks = Object.getOwnPropertyDescriptor, _ = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? Ks(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && js(e, s, n), n;
};
const ct = 25, Ce = [
  { value: "high", label: "Beste Qualität", share: "etwa 120 %" },
  { value: "balanced", label: "Ausgewogen", share: "etwa 90 %" },
  { value: "compact", label: "Kompakt", share: "etwa 65 %" },
  { value: "small", label: "Klein", share: "etwa 45 %" }
];
function pt(t) {
  const e = /* @__PURE__ */ new Date(`${t}T00:00:00`);
  e.setDate(e.getDate() + 1);
  const s = (i) => String(i).padStart(2, "0");
  return `${e.getFullYear()}-${s(e.getMonth() + 1)}-${s(e.getDate())}`;
}
let w = class extends D {
  constructor() {
    super(...arguments), this.cameras = [], this.stampAvailable = !1, this.narrow = !1, this.camera = "", this.stream = "", this.day = "", this.days = [], this.blocks = [], this.segments = [], this.position = 0, this.seekTo = 0, this.busy = !1, this.scrubbing = !1, this.downloading = !1, this.stampExport = !1, this.stampQuality = "balanced", this.error = "", this.rangeFromDay = "", this.rangeFromTime = "", this.rangeToDay = "", this.rangeToTime = "", this.rangeDay = "";
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
      this.error = k(e);
    } finally {
      this.busy = !1;
    }
  }
  async loadDay() {
    if (!this.camera || !this.day) {
      this.blocks = [], this.segments = [];
      return;
    }
    this.rangeDay !== this.day && (this.rangeDay = this.day, this.rangeFromDay = this.day, this.rangeFromTime = "00:00", this.rangeToDay = pt(this.day), this.rangeToTime = "00:00");
    const [t, e] = this.bounds;
    this.busy = !0, this.error = "";
    try {
      const s = await this.api.timeline(
        this.camera,
        t,
        e,
        this.stream || void 0
      );
      this.blocks = s.blocks, this.segments = s.segments, this.position = Math.max(s.segments[0]?.start ?? t, t), this.seekTo = this.position;
    } catch (s) {
      this.error = k(s);
    } finally {
      this.busy = !1;
    }
  }
  get streamKeys() {
    const t = this.cameras.find((e) => e.slug === this.camera);
    return t ? t.streams.map((e) => e.key) : [];
  }
  exportUrl() {
    const [t, e] = this.bounds;
    return this.exportUrlFor(t, e);
  }
  exportUrlFor(t, e) {
    const s = new URLSearchParams({
      camera: this.camera,
      from: String(t),
      to: String(e)
    });
    return this.stream && s.set("stream", this.stream), this.stampExport && this.stampAvailable && (s.set("stamp", "1"), s.set("quality", this.stampQuality)), `/api/kustos_vision/export?${s.toString()}`;
  }
  /** The days a range may end on: every recorded day plus the day after
      each, so an end at midnight sharp past the last footage stays
      pickable. Newest first, like the day picker. */
  rangeToDays() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.days)
      t.add(e), t.add(pt(e));
    return [...t].sort().reverse();
  }
  /** The chosen range as epoch seconds, or nothing while a field is empty. */
  rangeBounds() {
    if (!this.rangeFromDay || !this.rangeFromTime || !this.rangeToDay || !this.rangeToTime)
      return;
    const t = (/* @__PURE__ */ new Date(`${this.rangeFromDay}T${this.rangeFromTime}:00`)).getTime() / 1e3, e = (/* @__PURE__ */ new Date(`${this.rangeToDay}T${this.rangeToTime}:00`)).getTime() / 1e3;
    if (!(Number.isNaN(t) || Number.isNaN(e)))
      return [t, e];
  }
  /** Why the range cannot be downloaded, or nothing when it can. */
  rangeProblem() {
    const t = this.rangeBounds();
    if (!t) return "Von und Bis brauchen jeweils Datum und Uhrzeit.";
    const [e, s] = t;
    if (s <= e) return "Bis muss nach Von liegen.";
    if (s - e > ct * 3600)
      return `Ein Export deckt höchstens ${ct} Stunden ab.`;
  }
  async downloadRange() {
    const t = this.rangeBounds();
    if (t) {
      this.downloading = !0, this.error = "";
      try {
        const e = await this.api.signedUrl(this.exportUrlFor(...t)), s = document.createElement("a");
        s.href = e, s.download = "", s.style.display = "none", this.renderRoot.appendChild(s), s.click(), s.remove();
      } catch (e) {
        this.error = k(e);
      } finally {
        this.downloading = !1;
      }
    }
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
      this.error = k(t);
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
        <kustos-vision-player
          .api=${this.api}
          .segments=${this.segments}
          .seekTo=${this.seekTo}
          @positionchange=${(e) => {
      if (this.scrubbing) return;
      const [s, i] = this.bounds;
      e.detail.time < s || e.detail.time > i || (this.position = e.detail.time);
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

        <div class="cards">
          <div class="card">
            <h2>Auswahl</h2>
            <div class="row">
              <div class="picker">
                <label>Kamera</label>
                <kustos-vision-select
                  compact
                  .options=${this.cameras.map((e) => ({
      value: e.slug,
      label: e.name
    }))}
                  .value=${this.camera}
                  @value-changed=${(e) => this.selectCamera(e.detail.value)}
                ></kustos-vision-select>
              </div>
              <div class="picker">
                <label>Tag</label>
                <kustos-vision-select
                  compact
                  .options=${this.days.length === 0 ? [{ value: "", label: "keine Aufnahmen" }] : this.days.map((e) => ({ value: e, label: e }))}
                  .value=${this.days.length === 0 ? "" : this.day}
                  @value-changed=${(e) => {
      e.detail.value && (this.day = e.detail.value, this.loadDay());
    }}
                ></kustos-vision-select>
              </div>
              ${t.length > 1 ? o`<div class="picker">
                    <label>Stream</label>
                    <kustos-vision-select
                      compact
                      .options=${[
      { value: "", label: "alle" },
      ...t.map((e) => ({ value: e, label: e }))
    ]}
                      .value=${this.stream}
                      @value-changed=${(e) => {
      this.stream = e.detail.value, this.loadDay();
    }}
                    ></kustos-vision-select>
                  </div>` : c}
            </div>
            ${this.error ? o`<p class="error">${this.error}</p>` : c}
          </div>

          ${this.narrow ? o`<details class="expander">
                <summary>Download</summary>
                <div class="expander-body">${this.renderDownloadBody()}</div>
              </details>` : o`<div class="card">
                <h2>Download</h2>
                ${this.renderDownloadBody()}
              </div>`}
        </div>
      </div>
    `;
  }
  /** The export controls; on a phone they arrive folded, see render(). */
  renderDownloadBody() {
    return o`
            <div class="row">
              <button
                class="secondary"
                ?disabled=${this.busy || this.downloading || this.segments.length === 0}
                @click=${this.download}
              >
                Diesen Tag herunterladen
              </button>
              <label class="stamp" title=${this.stampAvailable ? "Aufnahmezeit sichtbar ins Bild schreiben" : "Das ffmpeg dieser Installation kann keinen Text zeichnen"}>
                <input
                  type="checkbox"
                  ?disabled=${!this.stampAvailable}
                  .checked=${this.stampExport && this.stampAvailable}
                  @change=${(t) => {
      this.stampExport = t.target.checked;
    }}
                />
                Zeitstempel einbrennen
              </label>
              ${this.stampExport && this.stampAvailable ? o`<div class="picker">
                    <label>Qualität</label>
                    <kustos-vision-select
                      compact
                      .options=${Ce.map(({ value: t, label: e }) => ({
      value: t,
      label: e
    }))}
                      .value=${this.stampQuality}
                      @value-changed=${(t) => this.stampQuality = t.detail.value}
                    ></kustos-vision-select>
                  </div>` : c}
            </div>
            ${this.stampAvailable ? c : o`<p class="hint">
                  Das ffmpeg dieser Installation kann keinen Text zeichnen;
                  nur der Roh-Export ist verfügbar.
                </p>`}
            <p class="hint">
              ${this.segments.length === 0 ? "Für den gewählten Tag ist nichts aufgezeichnet." : this.stampExport && this.stampAvailable ? `Das Video wird neu kodiert und die Aufnahmezeit ins Bild geschrieben; das dauert etwa so lange wie das Material selbst. Erwartete Größe bei „${Ce.find(
      (t) => t.value === this.stampQuality
    )?.label ?? this.stampQuality}": ${Ce.find(
      (t) => t.value === this.stampQuality
    )?.share ?? "?"} des Roh-Downloads (gemessen an HD-Tagmaterial).` + (this.stream === "" && this.streamKeys.length > 1 ? " Eingebrannt wird der Stream mit dem meisten Material; in der Auswahl lässt sich ein bestimmter wählen." : "") : "Die Segmente werden ohne Neukodierung zusammengefügt."}
            </p>

            <div class="row" style="margin-top:12px">
              <div class="rangebound">
                <label>Von</label>
                <div class="rangefields">
                  <kustos-vision-select
                    compact
                    class="rangeday"
                    .options=${this.days.map((t) => ({ value: t, label: t }))}
                    .value=${this.rangeFromDay}
                    @value-changed=${(t) => this.rangeFromDay = t.detail.value}
                  ></kustos-vision-select>
                  <input
                    class="rangetime"
                    type="time"
                    step="60"
                    .value=${this.rangeFromTime}
                    @change=${(t) => this.rangeFromTime = t.target.value}
                  />
                </div>
              </div>
              <div class="rangebound">
                <label>Bis</label>
                <div class="rangefields">
                  <kustos-vision-select
                    compact
                    class="rangeday"
                    .options=${this.rangeToDays().map((t) => ({
      value: t,
      label: t
    }))}
                    .value=${this.rangeToDay}
                    @value-changed=${(t) => this.rangeToDay = t.detail.value}
                  ></kustos-vision-select>
                  <input
                    class="rangetime"
                    type="time"
                    step="60"
                    .value=${this.rangeToTime}
                    @change=${(t) => this.rangeToTime = t.target.value}
                  />
                </div>
              </div>
              <button
                class="secondary"
                ?disabled=${this.busy || this.downloading || this.rangeProblem() !== void 0}
                @click=${this.downloadRange}
              >
                Zeitraum herunterladen
              </button>
            </div>
            ${this.rangeProblem() !== void 0 ? o`<p class="error">${this.rangeProblem()}</p>` : o`<p class="hint">
                  Minutengenau und auch über Mitternacht hinweg; der Schnitt
                  beginnt am Schlüsselbild direkt vor der gewählten Minute,
                  damit nichts fehlt. Der Zeitstempel-Schalter gilt auch hier.
                </p>`}
    `;
  }
};
w.styles = [
  F,
  M`
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
           below this there is no picture left to look at and scrolling is
           the better answer than a strip. On a phone lying on its side the
           screen itself is barely 160px of budget, so the floor gives way
           with the viewport rather than push the timeline off the screen;
           on a monitor the clamp lands on the old 160px unchanged. */
        min-height: clamp(96px, 30svh, 160px);
      }
      /* On a phone the picture keeps its own 16:9 height instead of
         growing into the leftover: fit-on-one-screen is a desktop
         contract, and a stretched black stage read as a far too large
         player. */
      :host([narrow]) kustos-vision-player {
        flex: 0 0 auto;
        min-height: 0;
        aspect-ratio: 16 / 9;
      }
      .page .card {
        margin-bottom: 0;
      }
      /* The two cards under the picture share the width and wrap when it
         runs out - whether they arrive as cards or as folded expanders. */
      .cards {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .cards > * {
        flex: 1 1 320px;
        min-width: 0;
      }
      .cards details.expander {
        margin: 0;
      }
      /* Secondary controls: each picker takes a share of the row and stops
         claiming width it may not have. */
      .picker {
        flex: 1 1 160px;
        min-width: 0;
        max-width: 260px;
      }
      /* One range bound: its date dropdown and its time side by side. */
      .rangebound {
        flex: 1 1 240px;
        min-width: 0;
      }
      .rangefields {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .rangefields .rangeday {
        flex: 1 1 130px;
        min-width: 0;
      }
      .rangefields .rangetime {
        flex: 0 1 110px;
        min-width: 96px;
      }
      label.stamp {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        flex: 1 1 auto;
        min-width: 0;
      }
    `
];
_([
  u({ attribute: !1 })
], w.prototype, "api", 2);
_([
  u({ attribute: !1 })
], w.prototype, "cameras", 2);
_([
  u({ type: Boolean })
], w.prototype, "stampAvailable", 2);
_([
  u({ type: Boolean, reflect: !0 })
], w.prototype, "narrow", 2);
_([
  h()
], w.prototype, "camera", 2);
_([
  h()
], w.prototype, "stream", 2);
_([
  h()
], w.prototype, "day", 2);
_([
  h()
], w.prototype, "days", 2);
_([
  h()
], w.prototype, "blocks", 2);
_([
  h()
], w.prototype, "segments", 2);
_([
  h()
], w.prototype, "position", 2);
_([
  h()
], w.prototype, "seekTo", 2);
_([
  h()
], w.prototype, "busy", 2);
_([
  h()
], w.prototype, "downloading", 2);
_([
  h()
], w.prototype, "stampExport", 2);
_([
  h()
], w.prototype, "stampQuality", 2);
_([
  h()
], w.prototype, "error", 2);
_([
  h()
], w.prototype, "rangeFromDay", 2);
_([
  h()
], w.prototype, "rangeFromTime", 2);
_([
  h()
], w.prototype, "rangeToDay", 2);
_([
  h()
], w.prototype, "rangeToTime", 2);
w = _([
  z("kustos-vision-recordings")
], w);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const qs = { CHILD: 2 }, Gs = (t) => (...e) => ({ _$litDirective$: t, values: e });
let Zs = class {
  constructor(e) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(e, s, i) {
    this._$Ct = e, this._$AM = s, this._$Ci = i;
  }
  _$AS(e, s) {
    return this.update(e, s);
  }
  update(e, s) {
    return this.render(...s);
  }
};
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { I: Js } = is, ut = (t) => t, mt = () => document.createComment(""), pe = (t, e, s) => {
  const i = t._$AA.parentNode, n = e === void 0 ? t._$AB : e._$AA;
  if (s === void 0) {
    const r = i.insertBefore(mt(), n), a = i.insertBefore(mt(), n);
    s = new Js(r, a, t, t.options);
  } else {
    const r = s._$AB.nextSibling, a = s._$AM, l = a !== t;
    if (l) {
      let d;
      s._$AQ?.(t), s._$AM = t, s._$AP !== void 0 && (d = t._$AU) !== a._$AU && s._$AP(d);
    }
    if (r !== n || l) {
      let d = s._$AA;
      for (; d !== r; ) {
        const m = ut(d).nextSibling;
        ut(i).insertBefore(d, n), d = m;
      }
    }
  }
  return s;
}, Y = (t, e, s = t) => (t._$AI(e, s), t), Ys = {}, Xs = (t, e = Ys) => t._$AH = e, Qs = (t) => t._$AH, Me = (t) => {
  t._$AR(), t._$AA.remove();
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const gt = (t, e, s) => {
  const i = /* @__PURE__ */ new Map();
  for (let n = e; n <= s; n++) i.set(t[n], n);
  return i;
}, zt = Gs(class extends Zs {
  constructor(t) {
    if (super(t), t.type !== qs.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(t, e, s) {
    let i;
    s === void 0 ? s = e : e !== void 0 && (i = e);
    const n = [], r = [];
    let a = 0;
    for (const l of t) n[a] = i ? i(l, a) : a, r[a] = s(l, a), a++;
    return { values: r, keys: n };
  }
  render(t, e, s) {
    return this.dt(t, e, s).values;
  }
  update(t, [e, s, i]) {
    const n = Qs(t), { values: r, keys: a } = this.dt(e, s, i);
    if (!Array.isArray(n)) return this.ut = a, r;
    const l = this.ut ??= [], d = [];
    let m, f, p = 0, b = n.length - 1, g = 0, y = r.length - 1;
    for (; p <= b && g <= y; ) if (n[p] === null) p++;
    else if (n[b] === null) b--;
    else if (l[p] === a[g]) d[g] = Y(n[p], r[g]), p++, g++;
    else if (l[b] === a[y]) d[y] = Y(n[b], r[y]), b--, y--;
    else if (l[p] === a[y]) d[y] = Y(n[p], r[y]), pe(t, d[y + 1], n[p]), p++, y--;
    else if (l[b] === a[g]) d[g] = Y(n[b], r[g]), pe(t, n[p], n[b]), b--, g++;
    else if (m === void 0 && (m = gt(a, g, y), f = gt(l, p, b)), m.has(l[p])) if (m.has(l[b])) {
      const x = f.get(a[g]), V = x !== void 0 ? n[x] : null;
      if (V === null) {
        const de = pe(t, n[p]);
        Y(de, r[g]), d[g] = de;
      } else d[g] = Y(V, r[g]), pe(t, n[p], V), n[x] = null;
      g++;
    } else Me(n[b]), b--;
    else Me(n[p]), p++;
    for (; g <= y; ) {
      const x = pe(t, d[y + 1]);
      Y(x, r[g]), d[g++] = x;
    }
    for (; p <= b; ) {
      const x = n[p++];
      x !== null && Me(x);
    }
    return this.ut = a, Xs(t, d), se;
  }
});
function Ot(t, e, s) {
  if (t.length === 0) return s;
  let i = s;
  return t.forEach((n, r) => {
    e >= n.top && e <= n.bottom && (i = r);
  }), e < t[0].top && (i = 0), e > t[t.length - 1].bottom && (i = t.length - 1), i;
}
function Rt(t) {
  let e = t;
  for (; ; ) {
    if (e = e instanceof ShadowRoot ? e.host : e.parentNode, !e) return null;
    if (!(e instanceof Element)) continue;
    const s = getComputedStyle(e);
    if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight)
      return e;
  }
}
const ft = 48, bt = 8;
function Bt(t, e) {
  const s = t.getBoundingClientRect();
  e < s.top + ft ? t.scrollTop -= bt : e > s.bottom - ft && (t.scrollTop += bt);
}
const ei = 150;
class Lt {
  constructor() {
    this.before = /* @__PURE__ */ new Map();
  }
  /** Remember where every row sits, keyed by its data-key attribute. */
  snapshot(e) {
    this.before.clear();
    for (const s of e) {
      const i = s.dataset?.key;
      i !== void 0 && this.before.set(i, s.getBoundingClientRect().top);
    }
  }
  /** Slide every remembered row from its old place to where it is now. */
  play(e) {
    if (this.before.size !== 0) {
      for (const s of e) {
        const i = s.dataset?.key;
        if (i === void 0) continue;
        const n = this.before.get(i);
        if (n === void 0) continue;
        const r = n - s.getBoundingClientRect().top;
        r !== 0 && s.animate(
          [{ transform: `translateY(${r}px)` }, { transform: "none" }],
          { duration: ei, easing: "ease-out" }
        );
      }
      this.before.clear();
    }
  }
}
var ti = Object.defineProperty, si = Object.getOwnPropertyDescriptor, P = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? si(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && ti(e, s, n), n;
};
function ii(t) {
  const e = t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z0-9]/.test(e) ? e : `kamera_${e}`;
}
let E = class extends D {
  constructor() {
    super(...arguments), this.capabilityKeys = [], this.available = [], this.views = [], this.allCameras = [], this.slug = "", this.name = "", this.streams = [], this.capabilities = {}, this.retentionDays = null, this.enabled = !0, this.viewSettings = {}, this.controls = [], this.candidates = [], this.busy = !1, this.error = "", this.memberFlip = new Lt(), this.baseline = "", this.unsaved = {
      isDirty: () => JSON.stringify(this.payload()) !== this.baseline,
      save: () => this.save(),
      // Nothing to restore: leaving unmounts the editor and its drafts.
      discard: () => {
      }
    };
  }
  memberRows() {
    return this.renderRoot.querySelectorAll(".member-row");
  }
  updated() {
    this.memberFlip.play(this.memberRows());
  }
  connectedCallback() {
    super.connectedCallback(), this.camera && (this.slug = this.camera.slug, this.name = this.camera.name, this.streams = this.camera.streams.map((t) => ({ ...t })), this.capabilities = structuredClone(this.camera.capabilities), this.retentionDays = this.camera.retention_days, this.enabled = this.camera.enabled, this.viewSettings = structuredClone(this.camera.view_settings ?? {}), this.controls = structuredClone(this.camera.controls ?? []), this.loadCandidates()), this.baseline = JSON.stringify(this.payload()), Ve(this.unsaved);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), Fe(this.unsaved);
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
        this.camera || (this.name = e.name, this.slug = ii(e.name)), this.streams = e.streams.map((s) => ({
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
        this.error = k(e);
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
      return this.error = k(t), !1;
    } finally {
      this.busy = !1;
    }
  }
  patchView(t, e) {
    const s = this.views.find((n) => n.id === t)?.cameras.filter((n) => n !== this.slug).length ?? 0, i = this.viewSettings[t] ?? {
      visible: !1,
      position: s
    };
    this.viewSettings = { ...this.viewSettings, [t]: { ...i, ...e } };
  }
  /** Cameras currently in a view, in display order, including this one. */
  membersOf(t) {
    const e = t.cameras.filter((i) => i !== this.slug).map((i) => ({
      slug: i,
      name: this.allCameras.find((n) => n.slug === i)?.name ?? i
    }));
    return this.viewSettings[t.id]?.visible ? t.cameras.includes(this.slug) ? t.cameras.map((i) => ({
      slug: i,
      name: i === this.slug ? this.name || this.slug : this.allCameras.find((n) => n.slug === i)?.name ?? i
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
      this.error = k(s);
    } finally {
      this.busy = !1;
    }
  }
  onDragStart(t, e, s) {
    if (this.busy || !this.camera) return;
    const i = s.currentTarget;
    s.preventDefault(), i.setPointerCapture(s.pointerId);
    const n = this.membersOf(t).map((r) => r.slug);
    this.dragging = {
      viewId: t.id,
      slug: n[e],
      startIndex: e,
      currentIndex: e,
      order: n
    }, this.requestUpdate();
  }
  /** This view's rows alone: every view block has a member list of its own. */
  memberRowsOf(t) {
    return [...this.memberRows()].filter(
      (e) => e instanceof HTMLElement && (e.dataset.key ?? "").startsWith(`${t}:`)
    );
  }
  onDragMove(t) {
    const e = this.dragging;
    if (!e) return;
    const s = this.memberRowsOf(e.viewId).map(
      (r) => r.getBoundingClientRect()
    ), i = Ot(s, t.clientY, e.currentIndex), n = Rt(this);
    n && Bt(n, t.clientY), i !== e.currentIndex && (this.memberFlip.snapshot(this.memberRows()), this.dragging = { ...e, currentIndex: i }, this.requestUpdate());
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
    const i = new Map(e.map((n) => [n.slug, n]));
    return this.orderedSlugs(s).map((n) => i.get(n)).filter((n) => n !== void 0);
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
    const s = rt(t.binding.entity_id), i = s.length ? s : ["button", "switch", "select", "number"], n = t.binding.entity_id;
    return o`
      <div class="divided">
        <div class="fields">
          <div>
            <label>Beschriftung</label>
            <input
              placeholder="Zoom rein"
              .value=${t.name}
              @change=${(r) => this.patchControl(e, {
      name: r.target.value
    })}
            />
          </div>
          <div>
            <label>Entity</label>
            <kustos-vision-select
              search
              .options=${[
      { value: "", label: "Bitte wählen …" },
      ...this.candidates.map((r) => ({
        value: r.entity_id,
        label: r.name || r.entity_id
      }))
    ]}
              .value=${n}
              @value-changed=${(r) => {
      const a = r.detail.value, [l] = rt(a);
      this.patchControl(e, {
        binding: { entity_id: a },
        ...l ? { kind: l } : {}
      });
    }}
            ></kustos-vision-select>
          </div>
          <div>
            <label>Bedienart</label>
            <kustos-vision-select
              .options=${i.map((r) => ({
      value: r,
      label: ws[r]
    }))}
              .value=${t.kind}
              @value-changed=${(r) => this.patchControl(e, {
      kind: r.detail.value
    })}
            ></kustos-vision-select>
          </div>
          <div>
            <label>Kennung</label>
            <input
              .value=${t.key}
              @change=${(r) => this.patchControl(e, {
      key: r.target.value
    })}
            />
          </div>
        </div>
        <div class="row" style="margin-top:8px">
          <span class="spacer"></span>
          <button
            class="danger"
            @click=${() => this.controls = this.controls.filter((r, a) => a !== e)}
          >
            Entfernen
          </button>
        </div>
      </div>
    `;
  }
  renderViewBlock(t) {
    const e = this.viewSettings[t.id], s = e?.visible ?? !1, i = this.orderedMembers(t), n = e?.capabilities ?? null, r = [
      ...Object.keys(this.capabilities),
      ...this.controls.map((a) => a.key)
    ];
    return o`
      <div class="divided">
        <label style="margin:0">
          <input
            type="checkbox"
            .checked=${s}
            @change=${(a) => this.patchView(t.id, {
      visible: a.target.checked
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
      ...this.streams.map((a) => ({
        value: a.key,
        label: a.key
      }))
    ]}
                    .value=${e?.stream_key ?? ""}
                    @value-changed=${(a) => this.patchView(t.id, {
      stream_key: a.detail.value || null
    })}
                  ></kustos-vision-select>
                </div>
              </div>

              <label>Bedienelemente in dieser Ansicht</label>
              ${r.length === 0 ? o`<p class="hint">Dieser Kamera ist nichts zugeordnet.</p>` : o`<div class="row">
                      ${r.map(
      (a) => o`<label style="margin:0">
                          <input
                            type="checkbox"
                            .checked=${n === null || n.includes(a)}
                            @change=${(l) => {
        const d = l.target.checked, m = new Set(n ?? r);
        d ? m.add(a) : m.delete(a), this.patchView(t.id, {
          capabilities: r.filter((f) => m.has(f))
        });
      }}
                          />
                          ${this.controls.find((l) => l.key === a)?.name || Q(a)}
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
              <div class="members">
                ${zt(
      i,
      (a) => `${t.id}:${a.slug}`,
      (a, l) => o`
                    <div
                      class="member-row ${this.dragging?.viewId === t.id && this.dragging.slug === a.slug ? "dragging-lift" : ""}"
                      data-key="${t.id}:${a.slug}"
                    >
                      <span class=${a.slug === this.slug ? "" : "muted"}>
                        ${l + 1}. ${a.name}
                      </span>
                      <span class="spacer"></span>
                      ${this.camera ? o`<span
                            class="drag-handle"
                            role="button"
                            aria-label="Ziehen zum Verschieben"
                            title="Ziehen zum Verschieben"
                            @pointerdown=${(d) => this.onDragStart(t, l, d)}
                            @pointermove=${(d) => this.onDragMove(d)}
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
                          </span>` : c}
                    </div>
                  `
    )}
              </div>
              ${this.camera ? c : o`<p class="hint">
                    Die Reihenfolge lässt sich einstellen, sobald die Kamera
                    gespeichert ist.
                  </p>`}
            ` : c}
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

        <div class="fields">
          <div>
            <label>Name</label>
            <input
              .value=${this.name}
              @input=${(e) => this.name = e.target.value}
            />
          </div>
          <div>
            <label>Kennung (wird zum Ordnernamen)</label>
            <input
              .value=${this.slug}
              ?disabled=${this.camera !== void 0}
              @input=${(e) => this.slug = e.target.value}
            />
          </div>
        </div>

        <h3>Streams</h3>
        ${this.streams.length === 0 ? o`<p class="hint">Noch keine Streams.</p>` : o`${this.streams.map(
      (e, s) => o`
                  <div class="divided fields">
                    <div>
                      <label>Kennung</label>
                      <input
                        .value=${e.key}
                        @input=${(i) => this.updateStream(s, {
        key: i.target.value
      })}
                      />
                    </div>
                    <div>
                      <label>Entity</label>
                      <span class="muted id">${e.entity_id}</span>
                    </div>
                    <div>
                      <label>Aufzeichnen</label>
                      <input
                        type="checkbox"
                        .checked=${e.record}
                        @change=${(i) => this.updateStream(s, {
        record: i.target.checked
      })}
                      />
                    </div>
                    <div>
                      <label>Ton</label>
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
                    </div>
                  </div>
                `
    )}
            <p class="hint">
              "Umwandeln" funktioniert mit jeder Kamera. "Kopieren" spart etwas
              Rechenzeit, geht aber nur, wenn die Kamera bereits AAC sendet.
            </p>`}

        <h3>Aufbewahrung</h3>
        <div class="fields">
          <div>
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
        <div class="fields" style="--kv-field-min:260px">
          ${this.capabilityKeys.map(
      (e) => o`
              <div>
                <label>${Q(e)}</label>
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
              </div>
            `
    )}
        </div>
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
              >` : c}
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

        ${this.error ? o`<p class="error">${this.error}</p>` : c}
        ${this.incompleteControl !== void 0 ? o`<p class="hint error">${this.incompleteControl}</p>` : c}

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
      await ne() && this.dispatchEvent(
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
E.styles = [
  F,
  M`
      .member-row {
        display: flex;
        align-items: center;
        gap: 12px;
        /* A long camera name must push the grip onto the next line, not
           the whole page into a sideways scroll. */
        flex-wrap: wrap;
        padding: 6px 12px;
        border-bottom: 1px solid var(--divider-color, ButtonBorder);
      }
      .member-row > span:first-child {
        min-width: 0;
      }
    `
];
P([
  u({ attribute: !1 })
], E.prototype, "api", 2);
P([
  u({ attribute: !1 })
], E.prototype, "camera", 2);
P([
  u({ attribute: !1 })
], E.prototype, "capabilityKeys", 2);
P([
  u({ attribute: !1 })
], E.prototype, "available", 2);
P([
  u({ attribute: !1 })
], E.prototype, "views", 2);
P([
  u({ attribute: !1 })
], E.prototype, "allCameras", 2);
P([
  h()
], E.prototype, "slug", 2);
P([
  h()
], E.prototype, "name", 2);
P([
  h()
], E.prototype, "streams", 2);
P([
  h()
], E.prototype, "capabilities", 2);
P([
  h()
], E.prototype, "retentionDays", 2);
P([
  h()
], E.prototype, "enabled", 2);
P([
  h()
], E.prototype, "viewSettings", 2);
P([
  h()
], E.prototype, "controls", 2);
P([
  h()
], E.prototype, "candidates", 2);
P([
  h()
], E.prototype, "busy", 2);
P([
  h()
], E.prototype, "error", 2);
E = P([
  z("kustos-vision-camera-editor")
], E);
const ni = 1 / 300, ri = 1 / 32, vt = 0.02, yt = "#e53935", ai = 0.9;
function $e(t) {
  return Math.min(1, Math.max(0, t));
}
function oi(t, e, s, i) {
  const n = $e(Math.min(t, s)), r = $e(Math.min(e, i)), a = $e(Math.max(t, s)), l = $e(Math.max(e, i));
  return { x: n, y: r, w: a - n, h: l - r };
}
function wt(t) {
  return t.w >= vt && t.h >= vt;
}
function li(t, e, s) {
  for (let i = t.length - 1; i >= 0; i -= 1) {
    const n = t[i];
    if (e >= n.x && e <= n.x + n.w && s >= n.y && s <= n.y + n.h)
      return i;
  }
  return -1;
}
function di(t, e, s) {
  return {
    ...t,
    x: Math.min(Math.max(t.x + e, 0), 1 - t.w),
    y: Math.min(Math.max(t.y + s, 0), 1 - t.h)
  };
}
function $t(t, e, s, i, n = -1) {
  const r = Math.max(s, i), a = Math.max(2, r * ni), l = Math.max(12, r * ri);
  e.forEach((d, m) => {
    const f = d.x * s, p = d.y * i, b = d.w * s, g = d.h * i;
    if (t.lineWidth = a, t.strokeStyle = yt, t.setLineDash([]), t.strokeRect(f, p, b, g), m === n && (t.lineWidth = Math.max(1, a / 2), t.strokeStyle = "#ffffff", t.setLineDash([a * 2, a * 2]), t.strokeRect(f, p, b, g), t.setLineDash([])), !d.label) return;
    t.font = `bold ${l}px sans-serif`;
    const y = l * 0.35, x = l + 2 * y, V = t.measureText(d.label).width + 2 * y, de = p >= x ? p - x : p;
    t.fillStyle = yt, t.fillRect(f, de, V, x), t.fillStyle = "#ffffff", t.textBaseline = "middle", t.fillText(d.label, f + y, de + x / 2);
  });
}
var hi = Object.defineProperty, ci = Object.getOwnPropertyDescriptor, le = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? ci(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && hi(e, s, n), n;
};
let G = class extends D {
  constructor() {
    super(...arguments), this.open = !1, this.regions = [], this.selected = -1, this.draft = null, this.error = "";
  }
  /** Open the editor for one picture. Resolves with the regions and the
   *  burned copy, or null when the person cancelled. */
  async edit(t, e) {
    return this.resolve?.(null), this.image = await pi(t), this.regions = e.map((s) => ({ ...s })), this.selected = -1, this.draft = null, this.error = "", this.open = !0, new Promise((s) => {
      this.resolve = s;
    });
  }
  close(t) {
    this.open = !1, this.resolve?.(t), this.resolve = void 0;
  }
  async finish() {
    const t = this.regions.filter(wt);
    if (t.length === 0) {
      this.close({ regions: [], burned: null });
      return;
    }
    try {
      this.close({ regions: t, burned: await this.burn(t) });
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }
  }
  /** The full-resolution copy with the labels rendered in. */
  async burn(t) {
    const e = this.image, s = document.createElement("canvas");
    s.width = e.naturalWidth, s.height = e.naturalHeight;
    const i = s.getContext("2d");
    if (!i) throw new Error("Canvas nicht verfügbar");
    return i.drawImage(e, 0, 0), $t(i, t, s.width, s.height), new Promise((n, r) => {
      s.toBlob(
        (a) => a ? n(a) : r(new Error("Das Bild konnte nicht erzeugt werden")),
        "image/jpeg",
        ai
      );
    });
  }
  // ------------------------------------------------------------------
  // Canvas
  // ------------------------------------------------------------------
  canvas() {
    return this.renderRoot.querySelector("canvas");
  }
  updated() {
    this.open && this.paint();
  }
  paint() {
    const t = this.canvas(), e = this.image;
    if (!t || !e) return;
    t.width !== e.naturalWidth && (t.width = e.naturalWidth, t.height = e.naturalHeight);
    const s = t.getContext("2d");
    if (!s) return;
    s.drawImage(e, 0, 0);
    const i = this.draft ? [...this.regions, this.draft] : this.regions;
    $t(s, i, t.width, t.height, this.selected);
  }
  toNormalized(t) {
    const e = this.canvas().getBoundingClientRect();
    return {
      x: (t.clientX - e.left) / e.width,
      y: (t.clientY - e.top) / e.height
    };
  }
  onPointerDown(t) {
    t.preventDefault(), this.canvas()?.setPointerCapture(t.pointerId);
    const { x: e, y: s } = this.toNormalized(t), i = li(this.regions, e, s);
    i >= 0 ? (this.selected = i, this.drag = {
      mode: "move",
      startX: e,
      startY: s,
      index: i,
      origin: this.regions[i]
    }) : (this.selected = -1, this.drag = { mode: "draw", startX: e, startY: s }), this.paint();
  }
  onPointerMove(t) {
    if (!this.drag) return;
    const { x: e, y: s } = this.toNormalized(t);
    if (this.drag.mode === "draw")
      this.draft = {
        ...oi(this.drag.startX, this.drag.startY, e, s),
        label: ""
      };
    else {
      const { index: i, origin: n, startX: r, startY: a } = this.drag, l = di(n, e - r, s - a);
      this.regions = this.regions.map(
        (d, m) => m === i ? l : d
      );
    }
    this.paint();
  }
  async onPointerUp() {
    const t = this.drag;
    if (this.drag = void 0, !!t) {
      if (t.mode === "draw") {
        const e = this.draft;
        if (this.draft = null, e && wt(e)) {
          this.regions = [...this.regions, e], this.selected = this.regions.length - 1, await this.updateComplete;
          const s = this.renderRoot.querySelectorAll(".labels input");
          s[s.length - 1]?.focus();
        }
      }
      this.paint();
    }
  }
  removeRegion(t) {
    this.regions = this.regions.filter((e, s) => s !== t), this.selected = -1;
  }
  onKeydown(t) {
    t.key === "Escape" && (t.preventDefault(), this.close(null));
  }
  render() {
    return this.open ? o`<div class="scrim" @keydown=${this.onKeydown}>
      <div class="box" role="dialog" aria-modal="true">
        <h2>Elemente beschriften</h2>
        <p class="hint">
          Ziehen Sie mit Maus oder Finger einen Rahmen um ein Element und
          benennen Sie es. Die Beschriftung wird in die Kopie eingebrannt, die
          das Modell erhält; das Original bleibt unverändert.
        </p>
        <canvas
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
        ></canvas>
        <div class="labels">
          ${this.regions.map(
      (t, e) => o`
              <div class="row">
                <span class="swatch"></span>
                <div class="grow">
                  <input
                    placeholder="Was ist in diesem Rahmen zu sehen?"
                    .value=${t.label}
                    @focus=${() => {
        this.selected = e, this.paint();
      }}
                    @input=${(s) => {
        this.regions = this.regions.map(
          (i, n) => n === e ? { ...i, label: s.target.value } : i
        ), this.paint();
      }}
                  />
                </div>
                <button
                  class="danger compact"
                  @click=${() => this.removeRegion(e)}
                >
                  Entfernen
                </button>
              </div>
            `
    )}
        </div>
        ${this.error ? o`<p class="error">${this.error}</p>` : c}
        <div class="buttons">
          <button class="secondary" @click=${() => this.close(null)}>
            Abbrechen
          </button>
          <button @click=${() => this.finish()}>Übernehmen</button>
        </div>
      </div>
    </div>` : c;
  }
};
G.styles = [
  F,
  M`
      :host {
        min-height: 0;
        background: none;
      }
      .scrim {
        position: fixed;
        inset: 0;
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
        max-width: min(960px, calc(100vw - 32px));
        max-height: calc(100dvh - 32px);
        overflow: auto;
        padding: 16px 20px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 4px;
        font-size: 20px;
        font-weight: 400;
      }
      canvas {
        display: block;
        max-width: 100%;
        /* Leaves room for the label rows and buttons on a laptop screen. */
        max-height: 60dvh;
        border-radius: 4px;
        touch-action: none;
        cursor: crosshair;
      }
      .labels .row {
        align-items: center;
        margin-top: 8px;
      }
      .swatch {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        background: #e53935;
        flex: none;
      }
      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 16px;
      }
    `
];
le([
  h()
], G.prototype, "open", 2);
le([
  h()
], G.prototype, "regions", 2);
le([
  h()
], G.prototype, "selected", 2);
le([
  h()
], G.prototype, "draft", 2);
le([
  h()
], G.prototype, "error", 2);
G = le([
  z("kustos-vision-annotate-dialog")
], G);
function pi(t) {
  return new Promise((e, s) => {
    const i = new Image();
    i.onload = () => e(i), i.onerror = () => s(new Error("Das Referenzbild konnte nicht geladen werden")), i.src = t;
  });
}
var ui = Object.defineProperty, mi = Object.getOwnPropertyDescriptor, S = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? mi(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && ui(e, s, n), n;
};
const gi = [
  ["boolean", "Ja/Nein"],
  ["text", "Text"],
  ["number", "Anzahl"],
  ["select", "Auswahl"]
], fi = "/api/kustos_vision/vision-frame", ze = 2, Oe = "__direct__";
let $ = class extends D {
  constructor() {
    super(...arguments), this.endpoints = [], this.backend = { kind: "openai" }, this.observations = [], this.triggers = [], this.addingTrigger = !1, this.context = "", this.cooldown = 60, this.budget = 100, this.enabled = !0, this.detectPersons = !1, this.aiTasks = [], this.history = [], this.frameUrls = /* @__PURE__ */ new Map(), this.referenceUrls = /* @__PURE__ */ new Map(), this.busy = !1, this.error = "", this.baseline = "", this.unsaved = {
      isDirty: () => JSON.stringify(this.payload()) !== this.baseline,
      save: () => this.save(),
      // Nothing to restore: leaving unmounts the editor and its drafts.
      discard: () => {
      }
    };
  }
  disconnectedCallback() {
    super.disconnectedCallback(), Fe(this.unsaved);
  }
  async connectedCallback() {
    if (super.connectedCallback(), this.profile)
      this.backend = { ...this.profile.backend }, this.observations = this.profile.observations.map((t) => ({ ...t })), this.triggers = [...this.profile.triggers], this.context = this.profile.context, this.cooldown = this.profile.cooldown_seconds, this.budget = this.profile.daily_budget, this.enabled = this.profile.enabled, this.detectPersons = this.profile.detect_persons ?? !1, this.loadHistory();
    else {
      const t = this.camera.capabilities.motion_trigger?.entity_id;
      t && (this.triggers = [t]);
    }
    this.baseline = JSON.stringify(this.payload()), Ve(this.unsaved);
    try {
      this.aiTasks = (await this.api.aiTaskEntities()).ai_task;
    } catch {
      this.aiTasks = [];
    }
  }
  /** A profile that would have nothing to analyse cannot be saved.
  
        Regression: this used to demand at least one question, which locked
        the Speichern button for a camera that should ONLY recognise persons -
        while the navigation guard's save happily stored exactly that. */
  saveBlocked() {
    return this.observations.length === 0 && !this.detectPersons;
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
      enabled: this.enabled,
      detect_persons: this.detectPersons
    };
  }
  async loadHistory() {
    try {
      const t = (await this.api.visionHistory(this.camera.slug)).history, e = /* @__PURE__ */ new Map();
      for (const s of t)
        if (s.frame)
          try {
            e.set(
              s.at,
              await this.api.signedUrl(
                `${fi}/${this.camera.slug}/${s.frame}`
              )
            );
          } catch {
          }
      this.history = t, this.frameUrls = e;
    } catch {
      this.history = [], this.frameUrls = /* @__PURE__ */ new Map();
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
  // ------------------------------------------------------------------
  // Reference pictures
  // ------------------------------------------------------------------
  /** A displayable URL for a stored picture, signed lazily on first use. */
  referenceUrl(t) {
    const e = this.referenceUrls.get(t);
    if (e !== void 0) return e || void 0;
    this.referenceUrls.set(t, ""), this.api.referenceUrl(t).then((s) => {
      this.referenceUrls = new Map(this.referenceUrls).set(t, s);
    }).catch(() => {
    });
  }
  /** Append an uploaded or captured picture to one question, unsaved. */
  async appendReference(t, e) {
    const s = this.observations[t].references ?? [];
    if (s.length >= ze || (this.patchObservation(t, {
      references: [...s, { asset_id: e, caption: "" }]
    }), !this.isConnected)) return;
    await this.updateComplete;
    const i = this.renderRoot.querySelectorAll(
      `input[data-caption-for="${t}"]`
    );
    i[i.length - 1]?.focus();
  }
  patchReference(t, e, s) {
    const i = (this.observations[t].references ?? []).map(
      (n, r) => r === e ? { ...n, ...s } : n
    );
    this.patchObservation(t, { references: i });
  }
  removeReference(t, e) {
    const s = (this.observations[t].references ?? []).filter(
      (i, n) => n !== e
    );
    this.patchObservation(t, { references: s });
  }
  async uploadReferenceFile(t, e) {
    const s = e.files?.[0];
    if (e.value = "", !!s) {
      this.busy = !0, this.error = "";
      try {
        const { asset_id: i } = await this.api.uploadReference(s);
        await this.appendReference(t, i);
      } catch (i) {
        this.error = k(i);
      } finally {
        this.busy = !1;
      }
    }
  }
  async captureReferenceNow(t) {
    this.busy = !0, this.error = "";
    try {
      const { asset_id: e } = await this.api.captureReference(this.camera.slug);
      await this.appendReference(t, e);
    } catch (e) {
      this.error = k(e);
    } finally {
      this.busy = !1;
    }
  }
  /** Open the drawing tool on the ORIGINAL picture; store the regions and
   *  upload the burned copy the model will actually see. */
  async annotateReference(t, e) {
    const s = this.observations[t].references?.[e], i = this.renderRoot.querySelector(
      "kustos-vision-annotate-dialog"
    );
    if (!(!s || !i)) {
      this.error = "";
      try {
        const n = await this.api.referenceUrl(s.asset_id), r = await i.edit(n, s.regions ?? []);
        if (r === null) return;
        if (r.burned && r.regions.length > 0) {
          const { asset_id: a } = await this.api.uploadReference(r.burned);
          this.patchReference(t, e, {
            regions: r.regions,
            burned_asset_id: a
          });
        } else
          this.patchReference(t, e, {
            regions: [],
            burned_asset_id: ""
          });
      } catch (n) {
        this.error = k(n);
      }
    }
  }
  async save() {
    this.busy = !0, this.error = "";
    try {
      return await this.api.setVision(this.payload()), this.baseline = JSON.stringify(this.payload()), this.dispatchEvent(new CustomEvent("saved", { bubbles: !0, composed: !0 })), !0;
    } catch (t) {
      return this.error = k(t), !1;
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
      this.error = k(t);
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
                </p>` : c}
          ` : this.renderOpenAiBackend()}
    `;
  }
  /** Endpoint and model come from lists; the free-text trio (URL, model,
   *  key) survives only for a profile saved before endpoints existed. */
  renderOpenAiBackend() {
    const t = !this.backend.endpoint_id && !!this.backend.url, e = t || !this.backend.endpoint_id && this.endpoints.length === 0, s = this.endpoints.find(
      (a) => a.id === this.backend.endpoint_id
    );
    if (this.endpoints.length === 0 && !t)
      return o`<p class="hint">
        Noch kein Endpunkt angelegt. Endpunkte verwalten Sie auf der
        Übersichtsseite der Bilderkennung unter „Modell-Endpunkte"; danach
        wählen Sie hier nur noch Endpunkt und Modell aus.
      </p>`;
    const i = s?.models ?? [], n = this.backend.model ?? "", r = [
      // A saved model the endpoint no longer lists stays selectable, so
      // opening the editor never silently rewrites a working profile.
      ...n && !i.includes(n) ? [{ value: n, label: `${n} (nicht in der Modell-Liste)` }] : [],
      ...i.map((a) => ({ value: a, label: a }))
    ];
    return o`
      <div class="fields">
        <div>
          <label>Endpunkt</label>
          <kustos-vision-select
            .options=${[
      ...this.backend.endpoint_id || t ? [] : [{ value: "", label: "Bitte wählen …" }],
      ...t ? [
        {
          value: Oe,
          label: `Direkteingabe: ${this.backend.url}`
        }
      ] : [],
      ...this.endpoints.map((a) => ({
        value: a.id,
        label: `${a.name} (${a.url})`
      }))
    ]}
            .value=${this.backend.endpoint_id || (t ? Oe : "")}
            @value-changed=${(a) => {
      const l = a.detail.value;
      if (l === Oe || l === "") return;
      const d = this.endpoints.find((m) => m.id === l);
      this.backend = {
        ...this.backend,
        endpoint_id: l,
        // The endpoint owns the connection from here on.
        url: void 0,
        api_key: void 0,
        model: this.backend.model && d?.models?.includes(this.backend.model) ? this.backend.model : d?.models?.[0] ?? this.backend.model
      };
    }}
          ></kustos-vision-select>
        </div>
        <div>
          <label>Modell</label>
          ${e ? o`<input
                .value=${n}
                @change=${(a) => this.backend = {
      ...this.backend,
      model: a.target.value
    }}
              />` : o`<kustos-vision-select
                .options=${r.length ? r : [{ value: "", label: "Keine Modelle am Endpunkt hinterlegt" }]}
                .value=${n}
                @value-changed=${(a) => this.backend = { ...this.backend, model: a.detail.value }}
              ></kustos-vision-select>`}
        </div>
      </div>
      ${e && t ? o`<label>Schlüssel (bei lokalen Modellen meist leer)</label>
            <input
              type="password"
              .value=${this.backend.api_key ?? ""}
              @change=${(a) => this.backend = {
      ...this.backend,
      api_key: a.target.value || void 0
    }}
            />` : c}
      ${!e && i.length === 0 ? o`<p class="hint">
            Für diesen Endpunkt sind noch keine Modelle hinterlegt. Auf der
            Übersichtsseite unter „Modell-Endpunkte" lassen sie sich
            automatisch ermitteln oder von Hand eintragen.
          </p>` : c}
      <p class="hint">
        Das Modell muss Bilder verarbeiten können. Bei llama.cpp heißt das:
        mit einer mmproj-Datei geladen.
      </p>
    `;
  }
  renderObservation(t, e) {
    return o`
      <div class="divided">
        <div class="fields">
          <div>
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
              .options=${gi.map(([s, i]) => ({ value: s, label: i }))}
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
              />` : c}
        ${t.type === "number" ? o`<div class="fields">
              <div>
                <label>Kleinster Wert</label>
                <input
                  type="number"
                  .value=${String(t.minimum ?? 0)}
                  @change=${(s) => this.patchObservation(e, {
      minimum: Number(s.target.value)
    })}
                />
              </div>
              <div>
                <label>Größter Wert</label>
                <input
                  type="number"
                  .value=${String(t.maximum ?? 100)}
                  @change=${(s) => this.patchObservation(e, {
      maximum: Number(s.target.value)
    })}
                />
              </div>
            </div>` : c}

        ${this.renderReferences(t, e)}

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
              </span>` : c}
          <span class="spacer"></span>
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
  renderReferences(t, e) {
    const s = t.references ?? [], i = s.length >= ze;
    return o`
      <details class="expander" ?open=${s.length > 0}>
        <summary>Referenzbilder (${s.length})</summary>
        <div class="expander-body">
          <p class="hint">
            Bilder, die dem Modell zeigen, was gemeint ist, zum Beispiel ein
            Foto des Hinterhofs mit allen Mülltonnen. Sie werden bei jeder
            Analyse mitgeschickt, sind aber ausdrücklich kein Beleg dafür,
            dass etwas gerade zu sehen ist.
          </p>
          ${s.map(
      (n, r) => o`
              <div class="row refrow">
                ${this.referenceUrl(n.burned_asset_id || n.asset_id) ? o`<img
                      class="refthumb"
                      src=${this.referenceUrl(
        n.burned_asset_id || n.asset_id
      )}
                      alt="Referenzbild"
                    />` : o`<span class="muted">Bild wird geladen …</span>`}
                <div class="grow">
                  <label>Beschreibung (was ist was?)</label>
                  <input
                    data-caption-for=${e}
                    .value=${n.caption ?? ""}
                    placeholder="Links die gelbe Tonne, rechts die schwarze."
                    @change=${(a) => this.patchReference(e, r, {
        caption: a.target.value
      })}
                  />
                </div>
                <button
                  class="secondary compact"
                  ?disabled=${this.busy}
                  @click=${() => this.annotateReference(e, r)}
                >
                  ${(n.regions?.length ?? 0) > 0 ? `Beschriften (${n.regions.length})` : "Beschriften"}
                </button>
                <button
                  class="danger compact"
                  ?disabled=${this.busy}
                  @click=${() => this.removeReference(e, r)}
                >
                  Entfernen
                </button>
              </div>
            `
    )}
          <div class="row" style="margin-top:8px">
            <button
              class="secondary"
              ?disabled=${this.busy || i}
              @click=${() => this.renderRoot.querySelector(
      `input[data-upload-for="${e}"]`
    )?.click()}
            >
              Bild hochladen
            </button>
            <input
              type="file"
              accept="image/jpeg,image/png"
              hidden
              data-upload-for=${e}
              @change=${(n) => this.uploadReferenceFile(e, n.target)}
            />
            <button
              class="secondary"
              ?disabled=${this.busy || i}
              @click=${() => this.captureReferenceNow(e)}
            >
              Aktuelles Kamerabild übernehmen
            </button>
            ${i ? o`<span class="muted">
                  Höchstens ${ze} Bilder je Frage:
                  jedes weitere Bild verkleinert den Platz, den das Modell für
                  die eigentliche Analyse hat.
                </span>` : c}
          </div>
        </div>
      </details>
    `;
  }
  renderHistory() {
    return this.history.length === 0 ? c : o`
      <h3>Letzte Analysen</h3>
      <p class="hint">
        Was das Modell tatsächlich geantwortet hat. Eine Frage zu verbessern
        gelingt damit, statt am Wortlaut zu raten.
      </p>
      <div class="table-stack">
        <table>
          <tr class="head">
            <th>Bild</th>
            <th>Zeitpunkt</th>
            <th>Auslöser</th>
            <th>Antwort</th>
            <th>Dauer</th>
          </tr>
          ${this.history.slice(0, 8).map(
      (t) => o`
              <tr>
                <td class="framecell" data-label="Bild">
                  ${this.frameUrls.has(t.at) ? o`<img
                          src=${this.frameUrls.get(t.at)}
                          alt="Analysiertes Bild"
                        />${t.frame_source === "still" ? o`<span
                              class="stale"
                              title="Kein aktueller Stream-Frame verfügbar; die Kamera-Integration lieferte ein zwischengespeichertes Standbild, das älter sein kann als der Auslöser."
                              >Standbild</span
                            >` : c}` : o`<span class="muted">-</span>`}
                </td>
                <td class="muted">${new Date(t.at).toLocaleString()}</td>
                <td class="muted" data-label="Auslöser">${t.trigger}</td>
                <td class=${t.error ? "error" : ""} data-label="Antwort">
                  ${t.error ?? Object.entries(t.values).map(([e, s]) => `${e}: ${s}`).join(", ")}
                </td>
                <td class="muted" data-label="Dauer">
                  ${t.duration === null ? "-" : `${t.duration} s`}
                </td>
              </tr>
            `
    )}
        </table>
      </div>
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
                <span class="grow id">${this.entityLabel(e)}</span>
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
        <div class="fields">
          <div>
            <label>Mindestabstand in Sekunden</label>
            <input
              type="number"
              min="0"
              .value=${String(this.cooldown)}
              @change=${(e) => this.cooldown = Number(e.target.value)}
            />
          </div>
          <div>
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
            </p>` : c}

        <div class="row" style="margin-top:8px">
          <label style="margin:0">
            <input
              type="checkbox"
              .checked=${this.detectPersons}
              @change=${(e) => this.detectPersons = e.target.checked}
            />
            Personenerkennung
          </label>
        </div>
        <p class="hint">
          Fragt bei jeder Analyse dieser Kamera zusätzlich, ob eine der
          angelegten Personen zu sehen ist. Die Personen und ihre Fotos
          verwalten Sie auf der Übersichtsseite der Bilderkennung.
        </p>

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

        ${this.error ? o`<p class="error">${this.error}</p>` : c}
        ${this.lastRun?.raw ? o`<h3>Rohantwort</h3>
              <pre class="muted" style="overflow:auto;font-size:0.8em">
${JSON.stringify(this.lastRun.raw, null, 2)}</pre
              >` : c}
        ${this.renderHistory()}

        ${this.saveBlocked() && !this.busy ? o`<p class="hint">
              Ohne Frage und ohne Personenerkennung gäbe es nichts zu
              analysieren. Legen Sie eine Frage an oder schalten Sie die
              Personenerkennung ein.
            </p>` : c}
        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy || this.saveBlocked()} @click=${this.save}>
            Speichern
          </button>
          ${this.profile ? o`<button
                class="secondary"
                ?disabled=${this.busy}
                @click=${this.analyseNow}
              >
                Jetzt analysieren
              </button>` : c}
          <button
            class="secondary"
            @click=${async () => {
      await ne() && this.dispatchEvent(
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
              </button>` : c}
        </div>
      </div>
      <kustos-vision-annotate-dialog></kustos-vision-annotate-dialog>
    `;
  }
};
$.styles = [
  F,
  M`
      /* The analysed frame beside each history row. A fixed height keeps the
         table from jumping while thumbnails load. */
      .framecell img {
        display: block;
        height: 48px;
        border-radius: 4px;
      }
      .framecell .stale {
        display: block;
        font-size: 0.75em;
        color: var(--secondary-text-color);
      }
      .refrow {
        align-items: center;
      }
      .refthumb {
        display: block;
        height: 64px;
        border-radius: 4px;
      }
    `
];
S([
  u({ attribute: !1 })
], $.prototype, "api", 2);
S([
  u({ attribute: !1 })
], $.prototype, "camera", 2);
S([
  u({ attribute: !1 })
], $.prototype, "profile", 2);
S([
  u({ attribute: !1 })
], $.prototype, "hass", 2);
S([
  u({ attribute: !1 })
], $.prototype, "endpoints", 2);
S([
  h()
], $.prototype, "backend", 2);
S([
  h()
], $.prototype, "observations", 2);
S([
  h()
], $.prototype, "triggers", 2);
S([
  h()
], $.prototype, "addingTrigger", 2);
S([
  h()
], $.prototype, "context", 2);
S([
  h()
], $.prototype, "cooldown", 2);
S([
  h()
], $.prototype, "budget", 2);
S([
  h()
], $.prototype, "enabled", 2);
S([
  h()
], $.prototype, "detectPersons", 2);
S([
  h()
], $.prototype, "aiTasks", 2);
S([
  h()
], $.prototype, "history", 2);
S([
  h()
], $.prototype, "frameUrls", 2);
S([
  h()
], $.prototype, "referenceUrls", 2);
S([
  h()
], $.prototype, "lastRun", 2);
S([
  h()
], $.prototype, "busy", 2);
S([
  h()
], $.prototype, "error", 2);
$ = S([
  z("kustos-vision-vision-editor")
], $);
var bi = Object.defineProperty, vi = Object.getOwnPropertyDescriptor, T = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? vi(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && bi(e, s, n), n;
};
const kt = 2, yi = [
  ["cameras", "Kameras"],
  ["vision", "Bilderkennung"],
  ["storage", "Speicher"],
  ["views", "Ansichten"],
  ["system", "System"]
], ke = 1e3 * 1e3 * 1e3;
let A = class extends D {
  constructor() {
    super(...arguments), this.section = "cameras", this.adding = !1, this.available = [], this.busy = !1, this.error = "", this.endpointTestModel = /* @__PURE__ */ new Map(), this.endpointTestResult = /* @__PURE__ */ new Map(), this.personPhotoUrls = /* @__PURE__ */ new Map(), this.viewFlip = new Lt(), this.unsavedSections = {
      isDirty: () => this.viewsDirty() || this.storageDirty() || this.personsDirty() || this.endpointsDirty(),
      save: async () => !(this.viewsDirty() && !await this.commitViews() || this.storageDirty() && !await this.saveStorage() || this.personsDirty() && !await this.commitPersons() || this.endpointsDirty() && !await this.commitEndpoints()),
      discard: () => {
        this.viewsDraft = void 0, this.personsDraft = void 0, this.absenceInput = void 0, this.endpointsDraft = void 0, this.resetStorageInputs();
      }
    };
  }
  viewRows() {
    return this.renderRoot.querySelectorAll(".view-row");
  }
  updated() {
    this.viewFlip.play(this.viewRows());
  }
  connectedCallback() {
    super.connectedCallback(), Ve(this.unsavedSections);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), Fe(this.unsavedSections);
  }
  async refresh() {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: !0, composed: !0 }));
  }
  async run(t) {
    this.busy = !0, this.error = "";
    try {
      return await t(), await this.refresh(), !0;
    } catch (e) {
      return this.error = k(e), !1;
    } finally {
      this.busy = !1;
    }
  }
  async startAdding() {
    this.error = "";
    try {
      this.available = (await this.api.availableCameras()).cameras, this.adding = !0;
    } catch (t) {
      this.error = k(t);
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
        await ne() && (this.adding = !1, this.editing = void 0);
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
            </p>` : o`<div class="table-stack">
              <table>
                <tr class="head">
                  <th>Name</th>
                  <th>Streams</th>
                  <th>Aufbewahrung</th>
                  <th>Belegt</th>
                  <th>Status</th>
                  <th></th>
                </tr>
                ${this.snapshot.cameras.map(
      (t) => this.renderCameraRow(t)
    )}
              </table>
            </div>`}
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
        <td class="muted" data-label="Streams">
          ${e} von ${t.streams.length}
        </td>
        <td class="muted" data-label="Aufbewahrung">
          ${t.retention_days === null ? "unbegrenzt" : `${t.retention_days} Tage`}
        </td>
        <td class="muted" data-label="Belegt">
          ${we(t.state.used_bytes)}
        </td>
        <td data-label="Status">${this.renderRecordingState(t, s)}</td>
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
      >steht${s ? o` (${s})` : c}</span
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
        await ne() && (this.visionFor = void 0);
      }
    )}
      <kustos-vision-vision-editor
        .api=${this.api}
        .hass=${this.hass}
        .endpoints=${this.snapshot.endpoints ?? []}
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
        ${this.snapshot.cameras.length === 0 ? o`<p class="hint">Erst eine Kamera einrichten.</p>` : o`<div class="table-stack">
              <table>
                <tr class="head">
                  <th>Kamera</th>
                  <th>Fragen</th>
                  <th>Heute</th>
                  <th>Zustand</th>
                  <th></th>
                </tr>
                ${this.snapshot.cameras.map(
      (t) => this.renderVisionRow(t)
    )}
              </table>
            </div>`}
      </div>
      ${this.renderEndpoints()} ${this.renderPersons()}
    `;
  }
  // ------------------------------------------------------------------
  // Endpoints
  // ------------------------------------------------------------------
  snapshotEndpoints() {
    return (this.snapshot.endpoints ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      url: t.url,
      api_key: t.api_key ?? "",
      models: t.models ?? []
    }));
  }
  draftEndpoints() {
    return this.endpointsDraft ?? this.snapshotEndpoints();
  }
  endpointsDirty() {
    return this.endpointsDraft ? JSON.stringify(this.endpointsDraft) !== JSON.stringify(this.snapshotEndpoints()) : !1;
  }
  async commitEndpoints() {
    const t = this.draftEndpoints();
    if (t.some((s) => !s.name.trim() || !s.url.trim()))
      return this.error = "Jeder Endpunkt braucht einen Namen und eine Adresse.", !1;
    const e = this.snapshotEndpoints();
    for (const s of e)
      if (!t.some((i) => i.id === s.id) && !await this.run(() => this.api.deleteEndpoint(s.id)))
        return !1;
    for (const s of t) {
      const i = e.find((r) => r.id === s.id);
      if (i && JSON.stringify(i) === JSON.stringify(s))
        continue;
      if (!await this.run(
        () => this.api.setEndpoint({
          ...s.id ? { endpoint_id: s.id } : {},
          name: s.name.trim(),
          url: s.url.trim(),
          api_key: s.api_key,
          models: s.models
        })
      )) return !1;
    }
    return this.endpointsDraft = void 0, !0;
  }
  patchEndpoint(t, e) {
    this.endpointsDraft = this.draftEndpoints().map(
      (s, i) => i === t ? { ...s, ...e } : s
    );
  }
  addEndpoint() {
    this.endpointsDraft = [
      ...this.draftEndpoints(),
      { id: "", name: "", url: "", api_key: "", models: [] }
    ];
  }
  /** Ask the endpoint itself which models it offers and take the answer
   *  into the draft. Runners without a listing keep the manual field. */
  async discoverEndpointModels(t) {
    const e = this.draftEndpoints()[t];
    this.busy = !0, this.error = "";
    try {
      const { models: s } = await this.api.endpointModels(
        e.url.trim(),
        e.api_key
      );
      this.patchEndpoint(t, { models: s }), this.endpointTestResult = new Map(this.endpointTestResult).set(
        t,
        `${s.length} Modelle gefunden.`
      );
    } catch (s) {
      this.endpointTestResult = new Map(this.endpointTestResult).set(
        t,
        `Ermitteln fehlgeschlagen: ${k(s)}`
      );
    } finally {
      this.busy = !1;
    }
  }
  async testEndpointModel(t) {
    const e = this.draftEndpoints()[t], s = this.endpointTestModel.get(t) ?? e.models[0] ?? "";
    if (s) {
      this.busy = !0, this.error = "", this.endpointTestResult = new Map(this.endpointTestResult).set(
        t,
        `Teste ${s} … (lädt der Server das Modell erst, kann das eine Weile dauern)`
      );
      try {
        const { duration: i } = await this.api.testEndpoint(
          e.url.trim(),
          s,
          e.api_key
        );
        this.endpointTestResult = new Map(this.endpointTestResult).set(
          t,
          `${s} hat in ${i} s geantwortet.`
        );
      } catch (i) {
        this.endpointTestResult = new Map(this.endpointTestResult).set(
          t,
          `${s}: ${k(i)}`
        );
      } finally {
        this.busy = !1;
      }
    }
  }
  renderEndpointRow(t, e) {
    const s = this.endpointTestModel.get(e) ?? t.models[0] ?? "";
    return o`
      <div class="divided">
        <div class="fields">
          <div>
            <label>Name</label>
            <input
              placeholder="Mac mini"
              .value=${t.name}
              @change=${(i) => this.patchEndpoint(e, {
      name: i.target.value
    })}
            />
          </div>
          <div>
            <label>Adresse</label>
            <input
              placeholder="http://192.168.1.10:8080/v1"
              .value=${t.url}
              @change=${(i) => this.patchEndpoint(e, {
      url: i.target.value
    })}
            />
          </div>
          <div>
            <label>Schlüssel (bei lokalen Modellen meist leer)</label>
            <input
              type="password"
              .value=${t.api_key}
              @change=${(i) => this.patchEndpoint(e, {
      api_key: i.target.value
    })}
            />
          </div>
        </div>
        <label>Modelle, durch Komma getrennt</label>
        <input
          placeholder="gemma4-vision, qwen-vision"
          .value=${t.models.join(", ")}
          @change=${(i) => this.patchEndpoint(e, {
      models: i.target.value.split(",").map((n) => n.trim()).filter((n) => n)
    })}
        />
        <div class="row" style="align-items:center;margin-top:8px">
          <button
            class="secondary compact"
            ?disabled=${this.busy || !t.url.trim()}
            @click=${() => this.discoverEndpointModels(e)}
          >
            Modelle automatisch ermitteln
          </button>
          ${t.models.length > 0 ? o`
                <kustos-vision-select
                  compact
                  .options=${t.models.map((i) => ({
      value: i,
      label: i
    }))}
                  .value=${s}
                  @value-changed=${(i) => {
      this.endpointTestModel = new Map(
        this.endpointTestModel
      ).set(e, i.detail.value);
    }}
                ></kustos-vision-select>
                <button
                  class="secondary compact"
                  ?disabled=${this.busy || !s}
                  @click=${() => this.testEndpointModel(e)}
                >
                  Testen
                </button>
              ` : c}
          <span class="spacer"></span>
          <button
            class="danger compact"
            ?disabled=${this.busy}
            @click=${() => this.endpointsDraft = this.draftEndpoints().filter(
      (i, n) => n !== e
    )}
          >
            Endpunkt entfernen
          </button>
        </div>
        ${this.endpointTestResult.has(e) ? o`<p class="hint">${this.endpointTestResult.get(e)}</p>` : c}
      </div>
    `;
  }
  renderEndpoints() {
    const t = this.draftEndpoints(), e = this.endpointsDirty();
    return o`
      <div class="card">
        <h2>Modell-Endpunkte</h2>
        <p class="hint">
          OpenAI-kompatible Endpunkte, einmal eingetragen: Die Kameras wählen
          dann nur noch Endpunkt und Modell aus einer Liste. „Modelle
          automatisch ermitteln" fragt den Endpunkt selbst; Server ohne
          Modell-Liste bekommen die Namen hier von Hand.
        </p>
        ${t.map(
      (s, i) => this.renderEndpointRow(s, i)
    )}
        <div class="row" style="margin-top:8px">
          <button
            class="secondary"
            ?disabled=${this.busy}
            @click=${() => this.addEndpoint()}
          >
            Endpunkt hinzufügen
          </button>
          ${e ? o`
                <button ?disabled=${this.busy} @click=${() => this.commitEndpoints()}>
                  Speichern
                </button>
                <button
                  class="secondary"
                  ?disabled=${this.busy}
                  @click=${() => this.endpointsDraft = void 0}
                >
                  Verwerfen
                </button>
              ` : c}
        </div>
      </div>
    `;
  }
  // ------------------------------------------------------------------
  // Persons
  // ------------------------------------------------------------------
  snapshotPersons() {
    return (this.snapshot.persons?.people ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      enabled: t.enabled ?? !0,
      references: t.references ?? []
    }));
  }
  /** The person list as currently edited; the draft until it is stored. */
  draftPersons() {
    return this.personsDraft ?? this.snapshotPersons();
  }
  personsDirty() {
    return this.absenceInput !== void 0 && Number(this.absenceInput) !== (this.snapshot.persons?.absence_seconds ?? 0) ? !0 : this.personsDraft ? JSON.stringify(this.personsDraft) !== JSON.stringify(this.snapshotPersons()) : !1;
  }
  async commitPersons() {
    const t = this.draftPersons();
    if (t.some((s) => !s.name.trim()))
      return this.error = "Jede Person braucht einen Namen.", !1;
    const e = this.snapshotPersons();
    for (const s of e)
      if (!t.some((i) => i.id === s.id) && !await this.run(() => this.api.deletePerson(s.id)))
        return !1;
    for (const s of t) {
      const i = e.find((r) => r.id === s.id);
      if (i && JSON.stringify(i) === JSON.stringify(s))
        continue;
      if (!await this.run(
        () => this.api.setPerson({
          ...s.id ? { person_id: s.id } : {},
          name: s.name.trim(),
          enabled: s.enabled,
          references: s.references
        })
      )) return !1;
    }
    if (this.absenceInput !== void 0) {
      const s = Math.max(0, Math.round(Number(this.absenceInput) || 0));
      if (!await this.run(() => this.api.setPersonsOptions(s)))
        return !1;
      this.absenceInput = void 0;
    }
    return this.personsDraft = void 0, !0;
  }
  patchPerson(t, e) {
    this.personsDraft = this.draftPersons().map(
      (s, i) => i === t ? { ...s, ...e } : s
    );
  }
  addPerson() {
    this.personsDraft = [
      ...this.draftPersons(),
      { id: "", name: "", enabled: !0, references: [] }
    ];
  }
  async uploadPersonPhoto(t, e) {
    const s = e.files?.[0];
    if (e.value = "", !!s) {
      this.busy = !0, this.error = "";
      try {
        const { asset_id: i } = await this.api.uploadReference(s);
        await this.addPersonPhoto(t, i);
      } catch (i) {
        this.error = k(i);
      } finally {
        this.busy = !1;
      }
    }
  }
  /** Attach an uploaded photo. For a person that exists, this persists on
   *  the spot - adding a photo is an explicit action like a drag&drop
   *  reorder, and photos that only lived in the draft were exactly what a
   *  discarded draft silently lost. A person not saved yet keeps the photo
   *  in the draft and it is stored with the creation. */
  async addPersonPhoto(t, e) {
    const s = this.draftPersons()[t];
    if (s.references.length >= kt) return;
    const i = [...s.references, { asset_id: e }];
    s.id && await this.persistPersonPhotos(s.id, i), this.patchPerson(t, { references: i });
  }
  async removePersonPhoto(t, e) {
    const s = this.draftPersons()[t], i = s.references.filter((n, r) => r !== e);
    s.id && await this.persistPersonPhotos(s.id, i), this.patchPerson(t, { references: i });
  }
  /** Store ONLY the photo change: name and switch travel from the saved
   *  state, so a photo must not quietly persist unsaved edits sitting in
   *  the draft beside it. */
  async persistPersonPhotos(t, e) {
    const s = this.snapshot.persons?.people.find((i) => i.id === t);
    return s ? this.run(
      () => this.api.setPerson({
        person_id: t,
        name: s.name,
        enabled: s.enabled ?? !0,
        references: e
      })
    ) : !1;
  }
  /** A displayable URL for a stored photo, signed lazily on first use. */
  personPhotoUrl(t) {
    const e = this.personPhotoUrls.get(t);
    if (e !== void 0) return e || void 0;
    this.personPhotoUrls.set(t, ""), this.api.referenceUrl(t).then((s) => {
      this.personPhotoUrls = new Map(this.personPhotoUrls).set(t, s);
    }).catch(() => {
    });
  }
  personStateText(t) {
    const s = this.snapshot.persons?.people.find(
      (i) => i.id === t
    )?.state;
    return s ? s.present ? s.last_camera ? `anwesend (zuletzt: ${s.last_camera})` : "anwesend" : s.last_seen ? `abwesend, zuletzt ${new Date(s.last_seen).toLocaleString()}` : "noch nie gesehen" : "";
  }
  renderPersonRow(t, e) {
    return o`
      <div class="divided">
        <div class="row" style="align-items:center">
          <div class="grow">
            <label>Name</label>
            <input
              .value=${t.name}
              placeholder="Wer soll erkannt werden?"
              @change=${(s) => this.patchPerson(e, {
      name: s.target.value
    })}
            />
          </div>
          <label style="margin:0">
            <input
              type="checkbox"
              .checked=${t.enabled}
              @change=${(s) => this.patchPerson(e, {
      enabled: s.target.checked
    })}
            />
            Aktiv
          </label>
          <button
            class="danger compact"
            ?disabled=${this.busy}
            @click=${() => this.personsDraft = this.draftPersons().filter(
      (s, i) => i !== e
    )}
          >
            Person entfernen
          </button>
        </div>
        <div class="row" style="align-items:center;margin-top:8px">
          ${t.references.map(
      (s, i) => o`
              ${this.personPhotoUrl(s.asset_id) ? o`<img
                    style="display:block;height:64px;border-radius:4px"
                    src=${this.personPhotoUrl(s.asset_id)}
                    alt="Referenzfoto"
                  />` : o`<span class="muted">Foto wird geladen …</span>`}
              <button
                class="danger compact"
                ?disabled=${this.busy}
                @click=${() => this.removePersonPhoto(e, i)}
              >
                Foto entfernen
              </button>
            `
    )}
          <button
            class="secondary compact"
            ?disabled=${this.busy || t.references.length >= kt}
            @click=${() => this.renderRoot.querySelector(
      `input[data-photo-for="${e}"]`
    )?.click()}
          >
            Foto hinzufügen
          </button>
          <input
            type="file"
            accept="image/jpeg,image/png"
            hidden
            data-photo-for=${e}
            @change=${(s) => this.uploadPersonPhoto(e, s.target)}
          />
          ${t.id ? o`<span class="muted">${this.personStateText(t.id)}</span>` : c}
        </div>
      </div>
    `;
  }
  renderPersons() {
    const t = this.draftPersons(), e = this.personsDirty();
    return o`
      <div class="card">
        <h2>Personen</h2>
        <p class="hint">
          Personen, die das Modell anhand von Referenzfotos wiedererkennen
          soll. Jede Person bekommt einen Anwesenheits-Sensor; gefragt wird
          nur bei Kameras, deren Bilderkennung die Personenerkennung
          eingeschaltet hat.
        </p>
        ${t.map((s, i) => this.renderPersonRow(s, i))}
        <div class="row" style="margin-top:8px">
          <button
            class="secondary"
            ?disabled=${this.busy}
            @click=${() => this.addPerson()}
          >
            Person hinzufügen
          </button>
        </div>
        <div class="fields" style="margin-top:8px">
          <div>
            <label>Abklingzeit in Sekunden</label>
            <input
              type="number"
              min="0"
              .value=${this.absenceInput ?? String(this.snapshot.persons?.absence_seconds ?? 0)}
              @change=${(s) => this.absenceInput = s.target.value}
            />
          </div>
        </div>
        <p class="hint">
          Wie lange eine Person als anwesend gilt, nachdem sie zuletzt erkannt
          wurde. 600 Sekunden entsprechen zehn Minuten; das überbrückt, dass
          sich jemand kurz abwendet oder hinter dem Auto steht. Erst danach
          meldet der Sensor wieder abwesend.
        </p>
        ${e ? o`<div class="row" style="margin-top:8px">
              <button ?disabled=${this.busy} @click=${() => this.commitPersons()}>
                Speichern
              </button>
              <button
                class="secondary"
                ?disabled=${this.busy}
                @click=${() => {
      this.personsDraft = void 0, this.absenceInput = void 0;
    }}
              >
                Verwerfen
              </button>
            </div>` : c}
      </div>
    `;
  }
  renderVisionRow(t) {
    const e = this.snapshot.vision.find((s) => s.camera_slug === t.slug);
    return o`
      <tr>
        <td>${t.name}</td>
        <td class="muted" data-label="Fragen">
          ${e ? e.observations.length : "-"}
        </td>
        <td class="muted" data-label="Heute">
          ${e ? `${e.state.analyses_today} / ${e.daily_budget}` : "-"}
        </td>
        <td data-label="Zustand">
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
    const { storage: t, totals: e } = this.snapshot, s = t.max_total_bytes === null ? "" : String(t.max_total_bytes / ke);
    return o`
      <div class="card">
        <h2>Speicher</h2>
        <table>
          <tr>
            <th>Belegt</th>
            <td>${we(e.used_bytes)}</td>
          </tr>
          <tr>
            <th>Frei am Ort</th>
            <td>${we(e.free_bytes)}</td>
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
              ${we(e.over_budget_bytes)} über dem Budget, und mehr
              lässt sich nicht löschen. Das Budget ist kleiner als das, was die
              Kameras zwischen zwei Aufräumläufen schreiben.
            </p>` : c}

        <h3>Grenzen</h3>
        <div class="fields">
          <div>
            <label>Segmentlänge in Sekunden</label>
            <input
              id="segment"
              type="number"
              min="1"
              .value=${String(t.segment_seconds)}
            />
          </div>
          <div>
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
    const { storage: i } = this.snapshot, n = i.max_total_bytes === null ? null : i.max_total_bytes / ke, r = s.value.trim() === "" ? null : Number(s.value);
    return t.value.trim() !== i.base_path || Number(e.value) !== i.segment_seconds || r !== n;
  }
  resetStorageInputs() {
    const { storage: t } = this.snapshot, e = this.storageInput("base_path");
    e && (e.value = t.base_path);
    const s = this.storageInput("segment");
    s && (s.value = String(t.segment_seconds));
    const i = this.storageInput("budget");
    i && (i.value = t.max_total_bytes === null ? "" : String(t.max_total_bytes / ke));
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
        max_total_bytes: s === "" ? null : Math.round(Number(s) * ke)
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
    const t = this.viewsWithPreview();
    return o`
      <div class="card">
        <h2>Ansichten</h2>
        <p class="hint">
          Jede Ansicht wird zu einem eigenen Reiter. Welche Kameras darin
          erscheinen, legen Sie bei der jeweiligen Kamera fest, zusammen mit
          dem Stream und den Bedienelementen für genau diese Ansicht. Eine neue
          Ansicht startet deshalb leer.
        </p>
        ${t.length === 0 ? o`<p class="hint">Noch keine Ansicht angelegt.</p>` : zt(
      t,
      (e) => e.id,
      (e, s) => this.renderViewRow(e, s)
    )}
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
              </button>` : c}
        </div>
      </div>
    `;
  }
  renderViewRow(t, e) {
    return o`
      <div
        class="divided view-row ${this.viewDrag?.currentIndex === e ? "dragging-lift" : ""}"
        data-key=${t.id}
      >
        <div class="fields">
          <div>
            <label>Name</label>
            <input
              .value=${t.name}
              @change=${(s) => this.patchView(e, { name: s.target.value })}
            />
          </div>
          <div>
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
          <button class="danger" @click=${() => this.removeView(e)}>
            Entfernen
          </button>
          <span class="spacer"></span>
          <span
            class="drag-handle"
            role="button"
            aria-label="Ziehen zum Verschieben"
            title="Ziehen zum Verschieben"
            @pointerdown=${(s) => this.onViewDragStart(e, s)}
            @pointermove=${(s) => this.onViewDragMove(s)}
            @pointerup=${() => this.onViewDragEnd()}
            @pointercancel=${() => this.viewDrag = void 0}
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
          </span>
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
  removeView(t) {
    this.viewsDraft = this.draftViews().filter((e, s) => s !== t);
  }
  /** The list as shown: the draft, rearranged live while a row is dragged. */
  viewsWithPreview() {
    const t = [...this.draftViews()], e = this.viewDrag;
    if (!e) return t;
    const [s] = t.splice(e.fromIndex, 1);
    return t.splice(e.currentIndex, 0, s), t;
  }
  onViewDragStart(t, e) {
    if (this.busy) return;
    const s = e.currentTarget;
    e.preventDefault(), s.setPointerCapture(e.pointerId), this.viewDrag = { fromIndex: t, currentIndex: t };
  }
  onViewDragMove(t) {
    const e = this.viewDrag;
    if (!e) return;
    const s = Array.from(
      this.viewRows(),
      (r) => r.getBoundingClientRect()
    ), i = Ot(s, t.clientY, e.currentIndex), n = Rt(this);
    n && Bt(n, t.clientY), i !== e.currentIndex && (this.viewFlip.snapshot(this.viewRows()), this.viewDrag = { ...e, currentIndex: i });
  }
  onViewDragEnd() {
    const t = this.viewDrag;
    if (this.viewDrag = void 0, !t || t.fromIndex === t.currentIndex) return;
    const e = [...this.draftViews()], [s] = e.splice(t.fromIndex, 1);
    e.splice(t.currentIndex, 0, s), this.viewsDraft = e;
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
              </tr>` : c}
        </table>

        <h3>Streams</h3>
        ${e.length === 0 ? o`<p class="hint">Keine Kameras eingerichtet.</p>` : o`<div class="table-stack">
              <table>
                <tr class="head">
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
                        <td data-label="Läuft">
                          ${i.running ? "ja" : "nein"}
                        </td>
                        <td data-label="Neustarts">${i.restarts}</td>
                        <td class="muted" data-label="Zuletzt gemeldet">
                          ${i.last_error ?? "-"}
                        </td>
                      </tr>
                    `
      )
    )}
              </table>
            </div>`}

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
          ${yi.map(
      ([t, e]) => o`
              <button
                role="tab"
                aria-selected=${this.section === t ? "true" : "false"}
                class=${this.section === t ? "active" : ""}
                @click=${async () => {
        this.section !== t && await ne() && (this.section = t, this.adding = !1, this.editing = void 0, this.visionFor = void 0);
      }}
              >
                ${e}
              </button>
            `
    )}
        </div>
        ${this.error ? o`<p class="error">${this.error}</p>` : c}
        ${this.section === "cameras" ? this.renderCameras() : this.section === "vision" ? this.renderVision() : this.section === "storage" ? this.renderStorage() : this.section === "views" ? this.renderViews() : this.renderSystem()}
      </div>
    `;
  }
};
A.styles = F;
T([
  u({ attribute: !1 })
], A.prototype, "api", 2);
T([
  u({ attribute: !1 })
], A.prototype, "snapshot", 2);
T([
  u({ attribute: !1 })
], A.prototype, "hass", 2);
T([
  h()
], A.prototype, "section", 2);
T([
  h()
], A.prototype, "editing", 2);
T([
  h()
], A.prototype, "adding", 2);
T([
  h()
], A.prototype, "available", 2);
T([
  h()
], A.prototype, "visionFor", 2);
T([
  h()
], A.prototype, "busy", 2);
T([
  h()
], A.prototype, "error", 2);
T([
  h()
], A.prototype, "viewsDraft", 2);
T([
  h()
], A.prototype, "endpointsDraft", 2);
T([
  h()
], A.prototype, "endpointTestModel", 2);
T([
  h()
], A.prototype, "endpointTestResult", 2);
T([
  h()
], A.prototype, "personsDraft", 2);
T([
  h()
], A.prototype, "absenceInput", 2);
T([
  h()
], A.prototype, "personPhotoUrls", 2);
T([
  h()
], A.prototype, "viewDrag", 2);
A = T([
  z("kustos-vision-settings")
], A);
var wi = Object.defineProperty, $i = Object.getOwnPropertyDescriptor, H = (t, e, s, i) => {
  for (var n = i > 1 ? void 0 : i ? $i(e, s) : e, r = t.length - 1, a; r >= 0; r--)
    (a = t[r]) && (n = (i ? a(e, s, n) : a(n)) || n);
  return i && n && wi(e, s, n), n;
};
const ue = "__recordings", X = "__settings";
globalThis.kustosVisionBuild = bs;
let R = class extends D {
  constructor() {
    super(...arguments), this.narrow = !1, this.active = "", this.error = "", this.reconnecting = !1, this.reconnectError = "", this.lastViewId = "", this.onBeforeUnload = (t) => {
      fs() && t.preventDefault();
    }, this.menuOpenWidth = 0, this.onMenuViewportChange = () => {
      ge().width !== this.menuOpenWidth && this.closeViewMenu();
    }, this.closeViewMenu = () => {
      this.viewMenu = void 0, window.removeEventListener("pointerdown", this.onMenuOutsidePointer, !0), window.removeEventListener("keydown", this.onMenuKeydown, !0), window.removeEventListener("resize", this.onMenuViewportChange), window.visualViewport?.removeEventListener(
        "resize",
        this.onMenuViewportChange
      );
    }, this.onMenuOutsidePointer = (t) => {
      t.composedPath().includes(this) || this.closeViewMenu();
    }, this.onMenuKeydown = (t) => {
      t.key === "Escape" && this.closeViewMenu();
    };
  }
  connectedCallback() {
    super.connectedCallback(), nt(() => this.unsavedDialog().ask()), window.addEventListener("beforeunload", this.onBeforeUnload), this.load();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), nt(void 0), window.removeEventListener("beforeunload", this.onBeforeUnload), this.closeViewMenu();
  }
  unsavedDialog() {
    return this.renderRoot.querySelector(
      "kustos-vision-unsaved-dialog"
    );
  }
  /** Change the tab, unless unsaved work says otherwise. */
  async switchTab(t) {
    this.active !== t && await ne() && (this.active = t, t !== ue && t !== X && (this.lastViewId = t));
  }
  /** The views collapse into one tab; clicking it offers the list. */
  onViewsTabClick(t) {
    const e = this.snapshot?.views ?? [];
    if (e.length === 0) return;
    if (e.length === 1) {
      this.switchTab(e[0].id);
      return;
    }
    if (this.viewMenu) {
      this.closeViewMenu();
      return;
    }
    const i = t.currentTarget.getBoundingClientRect(), n = ge();
    this.menuOpenWidth = n.width;
    const r = Pt(i, n, Tt);
    this.viewMenu = {
      left: r.left,
      minWidth: r.width,
      maxHeight: r.maxHeight,
      ...r.up ? { bottom: n.height - i.top } : { top: i.bottom }
    }, window.addEventListener("pointerdown", this.onMenuOutsidePointer, !0), window.addEventListener("keydown", this.onMenuKeydown, !0), window.addEventListener("resize", this.onMenuViewportChange), window.visualViewport?.addEventListener("resize", this.onMenuViewportChange);
  }
  updated(t) {
    t.has("hass") && this.hass && !this.api && (this.api = new it(this.hass), this.load());
  }
  async load() {
    if (this.hass) {
      this.api ??= new it(this.hass);
      try {
        this.snapshot = await this.api.getConfig(), this.error = "", this.active || (this.active = this.snapshot.views[0]?.id ?? X, this.active !== X && (this.lastViewId = this.active));
      } catch (t) {
        const e = k(t);
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
          </button>` : c}
      ${this.reconnectError ? o`<span>${this.reconnectError}</span>` : c}
    </div>` : c;
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
        this.reconnectError = k(t);
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
    return e && De && e !== De ? o`<div class="stale">
        <span>
          Diese Seite zeigt noch die Oberfläche aus Version ${De},
          ausgeliefert wird ${e}. Der Browser hält eine ältere
          Oberfläche fest.
        </span>
        <button class="secondary" @click=${() => location.reload()}>
          Neu laden
        </button>
      </div>` : c;
  }
  /** The identity above everything, shown even while loading or broken. */
  renderHeader() {
    return o`<div class="header">
      <div class="toolbar"><div class="title">Kustos Vision</div></div>
      ${this.snapshot ? this.renderTabs(this.snapshot) : c}
    </div>
    ${this.renderViewMenu()}`;
  }
  renderViewMenu() {
    const t = this.viewMenu, e = this.snapshot?.views ?? [];
    if (!t || e.length === 0) return c;
    const s = [
      `left:${t.left}px`,
      `min-width:${t.minWidth}px`,
      `max-height:${t.maxHeight}px`,
      t.top !== void 0 ? `top:${t.top}px` : `bottom:${t.bottom}px`
    ].join(";");
    return o`<div class="tab-menu" role="listbox" style=${s}>
      ${e.map(
      (i) => o`<div
          class="item ${i.id === this.active ? "selected" : ""}"
          role="option"
          aria-selected=${i.id === this.active ? "true" : "false"}
          @click=${() => {
        this.closeViewMenu(), this.switchTab(i.id);
      }}
        >
          ${i.name}
        </div>`
    )}
    </div>`;
  }
  renderTabs(t) {
    const e = t.views, s = e.find((n) => n.id === this.active), i = s ?? e.find((n) => n.id === this.lastViewId) ?? e[0];
    return o`<div class="tabs" role="tablist">
      ${i ? o`<button
            role="tab"
            aria-selected=${s ? "true" : "false"}
            aria-haspopup=${e.length > 1 ? "listbox" : "false"}
            class=${s ? "active" : ""}
            @click=${(n) => this.onViewsTabClick(n)}
          >
            ${i.name}
            ${e.length > 1 ? o`<svg
                  class="caret"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>` : c}
          </button>` : c}
      <button
        role="tab"
        aria-selected=${this.active === ue ? "true" : "false"}
        class=${this.active === ue ? "active" : ""}
        @click=${() => void this.switchTab(ue)}
      >
        Aufnahmen
      </button>
      <button
        role="tab"
        aria-selected=${this.active === X ? "true" : "false"}
        class=${this.active === X ? "active" : ""}
        @click=${() => void this.switchTab(X)}
      >
        Einstellungen
      </button>
    </div>`;
  }
  render() {
    return o`
      ${this.renderHeader()}
      ${this.snapshot ? this.renderStaleNotice(this.snapshot) : c}
      ${this.snapshot ? this.renderStorageNotice(this.snapshot) : c}
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
        ${this.active === ue ? o`<kustos-vision-recordings
              .api=${this.api}
              .cameras=${t.cameras}
              .stampAvailable=${t.build?.stamp_available ?? !1}
              ?narrow=${this.narrow}
            ></kustos-vision-recordings>` : this.active === X ? o`<kustos-vision-settings
              .api=${this.api}
              .hass=${this.hass}
              .snapshot=${t}
              @changed=${() => this.load()}
            ></kustos-vision-settings>` : e ? o`<kustos-vision-live-view
                .hass=${this.hass}
                .api=${this.api}
                .view=${e}
                .cameras=${t.cameras}
                ?narrow=${this.narrow}
              ></kustos-vision-live-view>` : o`<div class="notice">
                Noch keine Ansicht angelegt.<br />
                Unter Einstellungen, Ansichten lässt sich eine erstellen.
              </div>${c}`}
      </div>
    `;
  }
};
R.styles = [
  F,
  M`
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
      .tabs button .caret {
        margin-left: 4px;
        vertical-align: middle;
      }
      /* The view picker under the collapsed views tab, shaped like the
         dropdown the rest of the panel uses. */
      .tab-menu {
        position: fixed;
        z-index: 100; /* above every layer the panel itself uses */
        background: var(
          --ha-card-background,
          var(--card-background-color, Canvas)
        );
        color: var(--primary-text-color, CanvasText);
        border: 1px solid var(--divider-color, ButtonBorder);
        border-radius: var(--kv-radius-card);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        overflow-y: auto;
        padding: 4px 0;
      }
      .tab-menu .item {
        padding: 10px 16px;
        cursor: pointer;
        white-space: nowrap;
      }
      .tab-menu .item:hover {
        background: color-mix(in srgb, currentColor 10%, transparent);
      }
      .tab-menu .item.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
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
H([
  u({ attribute: !1 })
], R.prototype, "hass", 2);
H([
  u({ type: Boolean, reflect: !0 })
], R.prototype, "narrow", 2);
H([
  h()
], R.prototype, "snapshot", 2);
H([
  h()
], R.prototype, "active", 2);
H([
  h()
], R.prototype, "error", 2);
H([
  h()
], R.prototype, "reconnecting", 2);
H([
  h()
], R.prototype, "reconnectError", 2);
H([
  h()
], R.prototype, "lastViewId", 2);
H([
  h()
], R.prototype, "viewMenu", 2);
R = H([
  z("kustos-vision-panel")
], R);
export {
  R as CamwatchPanel
};
