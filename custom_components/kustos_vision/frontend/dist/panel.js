/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const oe = globalThis, me = oe.ShadowRoot && (oe.ShadyCSS === void 0 || oe.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, ge = Symbol(), $e = /* @__PURE__ */ new WeakMap();
let Ne = class {
  constructor(e, s, i) {
    if (this._$cssResult$ = !0, i !== ge) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = s;
  }
  get styleSheet() {
    let e = this.o;
    const s = this.t;
    if (me && e === void 0) {
      const i = s !== void 0 && s.length === 1;
      i && (e = $e.get(s)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && $e.set(s, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Ie = (t) => new Ne(typeof t == "string" ? t : t + "", void 0, ge), U = (t, ...e) => {
  const s = t.length === 1 ? t[0] : e.reduce((i, r, n) => i + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + t[n + 1], t[0]);
  return new Ne(s, t, ge);
}, He = (t, e) => {
  if (me) t.adoptedStyleSheets = e.map((s) => s instanceof CSSStyleSheet ? s : s.styleSheet);
  else for (const s of e) {
    const i = document.createElement("style"), r = oe.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = s.cssText, t.appendChild(i);
  }
}, we = me ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let s = "";
  for (const i of e.cssRules) s += i.cssText;
  return Ie(s);
})(t) : t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Ke, defineProperty: Ve, getOwnPropertyDescriptor: We, getOwnPropertyNames: Le, getOwnPropertySymbols: Fe, getPrototypeOf: qe } = Object, ce = globalThis, _e = ce.trustedTypes, Ge = _e ? _e.emptyScript : "", Ze = ce.reactiveElementPolyfillSupport, Y = (t, e) => t, le = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? Ge : null;
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
} }, be = (t, e) => !Ke(t, e), ke = { attribute: !0, type: String, converter: le, reflect: !1, useDefault: !1, hasChanged: be };
Symbol.metadata ??= Symbol("metadata"), ce.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let V = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, s = ke) {
    if (s.state && (s.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((s = Object.create(s)).wrapped = !0), this.elementProperties.set(e, s), !s.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(e, i, s);
      r !== void 0 && Ve(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, s, i) {
    const { get: r, set: n } = We(this.prototype, e) ?? { get() {
      return this[s];
    }, set(a) {
      this[s] = a;
    } };
    return { get: r, set(a) {
      const l = r?.call(this);
      n?.call(this, a), this.requestUpdate(e, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? ke;
  }
  static _$Ei() {
    if (this.hasOwnProperty(Y("elementProperties"))) return;
    const e = qe(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(Y("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(Y("properties"))) {
      const s = this.properties, i = [...Le(s), ...Fe(s)];
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
      for (const r of i) s.unshift(we(r));
    } else e !== void 0 && s.push(we(e));
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
    return He(e, this.constructor.elementStyles), e;
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
      const n = (i.converter?.toAttribute !== void 0 ? i.converter : le).toAttribute(s, i.type);
      this._$Em = e, n == null ? this.removeAttribute(r) : this.setAttribute(r, n), this._$Em = null;
    }
  }
  _$AK(e, s) {
    const i = this.constructor, r = i._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const n = i.getPropertyOptions(r), a = typeof n.converter == "function" ? { fromAttribute: n.converter } : n.converter?.fromAttribute !== void 0 ? n.converter : le;
      this._$Em = r;
      const l = a.fromAttribute(s, n.type);
      this[r] = l ?? this._$Ej?.get(r) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, s, i, r = !1, n) {
    if (e !== void 0) {
      const a = this.constructor;
      if (r === !1 && (n = this[e]), i ??= a.getPropertyOptions(e), !((i.hasChanged ?? be)(n, s) || i.useDefault && i.reflect && n === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, i)))) return;
      this.C(e, s, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, s, { useDefault: i, reflect: r, wrapped: n }, a) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? s ?? this[e]), n !== !0 || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (s = void 0), this._$AL.set(e, s)), r === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [r, n] of this._$Ep) this[r] = n;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [r, n] of i) {
        const { wrapped: a } = n, l = this[r];
        a !== !0 || this._$AL.has(r) || l === void 0 || this.C(r, void 0, n, l);
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
V.elementStyles = [], V.shadowRootOptions = { mode: "open" }, V[Y("elementProperties")] = /* @__PURE__ */ new Map(), V[Y("finalized")] = /* @__PURE__ */ new Map(), Ze?.({ ReactiveElement: V }), (ce.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ve = globalThis, Se = (t) => t, he = ve.trustedTypes, xe = he ? he.createPolicy("lit-html", { createHTML: (t) => t }) : void 0, Re = "$lit$", D = `lit$${Math.random().toFixed(9).slice(2)}$`, Ue = "?" + D, Je = `<${Ue}>`, I = document, X = () => I.createComment(""), Q = (t) => t === null || typeof t != "object" && typeof t != "function", fe = Array.isArray, Ye = (t) => fe(t) || typeof t?.[Symbol.iterator] == "function", pe = `[ 	
\f\r]`, J = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ae = /-->/g, Ee = />/g, j = RegExp(`>|${pe}(?:([^\\s"'>=/]+)(${pe}*=${pe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Ce = /'/g, Oe = /"/g, je = /^(?:script|style|textarea|title)$/i, Xe = (t) => (e, ...s) => ({ _$litType$: t, strings: e, values: s }), o = Xe(1), L = Symbol.for("lit-noChange"), c = Symbol.for("lit-nothing"), ze = /* @__PURE__ */ new WeakMap(), M = I.createTreeWalker(I, 129);
function Me(t, e) {
  if (!fe(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return xe !== void 0 ? xe.createHTML(e) : e;
}
const Qe = (t, e) => {
  const s = t.length - 1, i = [];
  let r, n = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = J;
  for (let l = 0; l < s; l++) {
    const d = t[l];
    let m, g, u = -1, z = 0;
    for (; z < d.length && (a.lastIndex = z, g = a.exec(d), g !== null); ) z = a.lastIndex, a === J ? g[1] === "!--" ? a = Ae : g[1] !== void 0 ? a = Ee : g[2] !== void 0 ? (je.test(g[2]) && (r = RegExp("</" + g[2], "g")), a = j) : g[3] !== void 0 && (a = j) : a === j ? g[0] === ">" ? (a = r ?? J, u = -1) : g[1] === void 0 ? u = -2 : (u = a.lastIndex - g[2].length, m = g[1], a = g[3] === void 0 ? j : g[3] === '"' ? Oe : Ce) : a === Oe || a === Ce ? a = j : a === Ae || a === Ee ? a = J : (a = j, r = void 0);
    const P = a === j && t[l + 1].startsWith("/>") ? " " : "";
    n += a === J ? d + Je : u >= 0 ? (i.push(m), d.slice(0, u) + Re + d.slice(u) + D + P) : d + D + (u === -2 ? l : P);
  }
  return [Me(t, n + (t[s] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class ee {
  constructor({ strings: e, _$litType$: s }, i) {
    let r;
    this.parts = [];
    let n = 0, a = 0;
    const l = e.length - 1, d = this.parts, [m, g] = Qe(e, s);
    if (this.el = ee.createElement(m, i), M.currentNode = this.el.content, s === 2 || s === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (r = M.nextNode()) !== null && d.length < l; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const u of r.getAttributeNames()) if (u.endsWith(Re)) {
          const z = g[a++], P = r.getAttribute(u).split(D), re = /([.?@])?(.*)/.exec(z);
          d.push({ type: 1, index: n, name: re[2], strings: P, ctor: re[1] === "." ? tt : re[1] === "?" ? st : re[1] === "@" ? it : de }), r.removeAttribute(u);
        } else u.startsWith(D) && (d.push({ type: 6, index: n }), r.removeAttribute(u));
        if (je.test(r.tagName)) {
          const u = r.textContent.split(D), z = u.length - 1;
          if (z > 0) {
            r.textContent = he ? he.emptyScript : "";
            for (let P = 0; P < z; P++) r.append(u[P], X()), M.nextNode(), d.push({ type: 2, index: ++n });
            r.append(u[z], X());
          }
        }
      } else if (r.nodeType === 8) if (r.data === Ue) d.push({ type: 2, index: n });
      else {
        let u = -1;
        for (; (u = r.data.indexOf(D, u + 1)) !== -1; ) d.push({ type: 7, index: n }), u += D.length - 1;
      }
      n++;
    }
  }
  static createElement(e, s) {
    const i = I.createElement("template");
    return i.innerHTML = e, i;
  }
}
function F(t, e, s = t, i) {
  if (e === L) return e;
  let r = i !== void 0 ? s._$Co?.[i] : s._$Cl;
  const n = Q(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== n && (r?._$AO?.(!1), n === void 0 ? r = void 0 : (r = new n(t), r._$AT(t, s, i)), i !== void 0 ? (s._$Co ??= [])[i] = r : s._$Cl = r), r !== void 0 && (e = F(t, r._$AS(t, e.values), r, i)), e;
}
class et {
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
    const { el: { content: s }, parts: i } = this._$AD, r = (e?.creationScope ?? I).importNode(s, !0);
    M.currentNode = r;
    let n = M.nextNode(), a = 0, l = 0, d = i[0];
    for (; d !== void 0; ) {
      if (a === d.index) {
        let m;
        d.type === 2 ? m = new te(n, n.nextSibling, this, e) : d.type === 1 ? m = new d.ctor(n, d.name, d.strings, this, e) : d.type === 6 && (m = new rt(n, this, e)), this._$AV.push(m), d = i[++l];
      }
      a !== d?.index && (n = M.nextNode(), a++);
    }
    return M.currentNode = I, r;
  }
  p(e) {
    let s = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, s), s += i.strings.length - 2) : i._$AI(e[s])), s++;
  }
}
class te {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, s, i, r) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = e, this._$AB = s, this._$AM = i, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
    e = F(this, e, s), Q(e) ? e === c || e == null || e === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : e !== this._$AH && e !== L && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Ye(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== c && Q(this._$AH) ? this._$AA.nextSibling.data = e : this.T(I.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: s, _$litType$: i } = e, r = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = ee.createElement(Me(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === r) this._$AH.p(s);
    else {
      const n = new et(r, this), a = n.u(this.options);
      n.p(s), this.T(a), this._$AH = n;
    }
  }
  _$AC(e) {
    let s = ze.get(e.strings);
    return s === void 0 && ze.set(e.strings, s = new ee(e)), s;
  }
  k(e) {
    fe(this._$AH) || (this._$AH = [], this._$AR());
    const s = this._$AH;
    let i, r = 0;
    for (const n of e) r === s.length ? s.push(i = new te(this.O(X()), this.O(X()), this, this.options)) : i = s[r], i._$AI(n), r++;
    r < s.length && (this._$AR(i && i._$AB.nextSibling, r), s.length = r);
  }
  _$AR(e = this._$AA.nextSibling, s) {
    for (this._$AP?.(!1, !0, s); e !== this._$AB; ) {
      const i = Se(e).nextSibling;
      Se(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class de {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, s, i, r, n) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = e, this.name = s, this._$AM = r, this.options = n, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = c;
  }
  _$AI(e, s = this, i, r) {
    const n = this.strings;
    let a = !1;
    if (n === void 0) e = F(this, e, s, 0), a = !Q(e) || e !== this._$AH && e !== L, a && (this._$AH = e);
    else {
      const l = e;
      let d, m;
      for (e = n[0], d = 0; d < n.length - 1; d++) m = F(this, l[i + d], s, d), m === L && (m = this._$AH[d]), a ||= !Q(m) || m !== this._$AH[d], m === c ? e = c : e !== c && (e += (m ?? "") + n[d + 1]), this._$AH[d] = m;
    }
    a && !r && this.j(e);
  }
  j(e) {
    e === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class tt extends de {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === c ? void 0 : e;
  }
}
class st extends de {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== c);
  }
}
class it extends de {
  constructor(e, s, i, r, n) {
    super(e, s, i, r, n), this.type = 5;
  }
  _$AI(e, s = this) {
    if ((e = F(this, e, s, 0) ?? c) === L) return;
    const i = this._$AH, r = e === c && i !== c || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, n = e !== c && (i === c || r);
    r && this.element.removeEventListener(this.name, this, i), n && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class rt {
  constructor(e, s, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = s, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    F(this, e);
  }
}
const nt = ve.litHtmlPolyfillSupport;
nt?.(ee, te), (ve.litHtmlVersions ??= []).push("3.3.3");
const at = (t, e, s) => {
  const i = s?.renderBefore ?? e;
  let r = i._$litPart$;
  if (r === void 0) {
    const n = s?.renderBefore ?? null;
    i._$litPart$ = r = new te(e.insertBefore(X(), n), n, void 0, s ?? {});
  }
  return r._$AI(t), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ye = globalThis;
class k extends V {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const s = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = at(s, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return L;
  }
}
k._$litElement$ = !0, k.finalized = !0, ye.litElementHydrateSupport?.({ LitElement: k });
const ot = ye.litElementPolyfillSupport;
ot?.({ LitElement: k });
(ye.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const E = (t) => (e, s) => {
  s !== void 0 ? s.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const lt = { attribute: !0, type: String, converter: le, reflect: !1, hasChanged: be }, ht = (t = lt, e, s) => {
  const { kind: i, metadata: r } = s;
  let n = globalThis.litPropertyMetadata.get(r);
  if (n === void 0 && globalThis.litPropertyMetadata.set(r, n = /* @__PURE__ */ new Map()), i === "setter" && ((t = Object.create(t)).wrapped = !0), n.set(s.name, t), i === "accessor") {
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
function p(t) {
  return (e, s) => typeof s == "object" ? ht(t, e, s) : ((i, r, n) => {
    const a = r.hasOwnProperty(n);
    return r.constructor.createProperty(n, i), a ? Object.getOwnPropertyDescriptor(r, n) : void 0;
  })(t, e, s);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function h(t) {
  return p({ ...t, state: !0, attribute: !1 });
}
const y = "kustos_vision", Te = 3600, ct = 60;
class Pe {
  constructor(e) {
    this.hass = e, this.signatures = /* @__PURE__ */ new Map();
  }
  getConfig() {
    return this.hass.callWS({ type: `${y}/config/get` });
  }
  availableCameras() {
    return this.hass.callWS({ type: `${y}/cameras/available` });
  }
  suggest(e) {
    return this.hass.callWS({
      type: `${y}/camera/suggest`,
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
      type: `${y}/camera/set`,
      replace_existing: s,
      ...e
    });
  }
  deleteCamera(e) {
    return this.hass.callWS({ type: `${y}/camera/delete`, slug: e });
  }
  setViews(e) {
    return this.hass.callWS({ type: `${y}/views/set`, views: e });
  }
  /** Set the order of every camera in one view at once. */
  setViewOrder(e, s) {
    return this.hass.callWS({
      type: `${y}/view/order`,
      view_id: e,
      cameras: s
    });
  }
  setStorage(e) {
    return this.hass.callWS({ type: `${y}/storage/set`, ...e });
  }
  trigger(e, s, i) {
    return this.hass.callWS({
      type: `${y}/camera/trigger`,
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
    const i = this.hass.auth?.data?.access_token;
    if (!i)
      return fetch(await this.signedUrl(e), s);
    const r = new Headers(s?.headers);
    return r.set("Authorization", `Bearer ${i}`), fetch(e, { ...s, headers: r });
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
      expires: Te
    });
    return this.signatures.set(e, {
      url: r,
      usableUntil: i + (Te - ct) * 1e3
    }), r;
  }
  recordingDays(e) {
    return this.hass.callWS({ type: `${y}/recordings/days`, camera: e });
  }
  timeline(e, s, i, r) {
    return this.hass.callWS({
      type: `${y}/recordings/timeline`,
      camera: e,
      from: s,
      to: i,
      ...r ? { stream: r } : {}
    });
  }
  setVision(e) {
    return this.hass.callWS({ type: `${y}/vision/set`, ...e });
  }
  deleteVision(e) {
    return this.hass.callWS({
      type: `${y}/vision/delete`,
      camera_slug: e
    });
  }
  analyseNow(e) {
    return this.hass.callWS({
      type: `${y}/vision/analyse`,
      camera_slug: e
    });
  }
  visionHistory(e) {
    return this.hass.callWS({
      type: `${y}/vision/history`,
      camera_slug: e
    });
  }
  aiTaskEntities() {
    return this.hass.callWS({ type: `${y}/vision/backends` });
  }
  rebuildIndex() {
    return this.hass.callWS({ type: `${y}/index/rebuild` });
  }
}
function _(t) {
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
function ne(t) {
  if (t === null) return "unbekannt";
  const e = ["B", "kB", "MB", "GB", "TB"];
  let s = t, i = 0;
  for (; s >= 1e3 && i < e.length - 1; )
    s /= 1e3, i += 1;
  return `${s.toFixed(s < 10 && i > 0 ? 1 : 0)} ${e[i]}`;
}
const se = U`
  :host {
    display: block;
    color: var(--primary-text-color);
    background: var(--primary-background-color);
    min-height: 100%;
  }
  .card {
    background: var(--card-background-color, #fff);
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0, 0, 0, 0.15));
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
    cursor: pointer;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  button.secondary {
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
  }
  button.danger {
    background: var(--error-color, #db4437);
    color: #fff;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  label {
    display: block;
    margin: 10px 0 4px;
    font-size: 0.85em;
    color: var(--secondary-text-color);
  }
  input,
  select {
    font: inherit;
    width: 100%;
    box-sizing: border-box;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--divider-color, #ccc);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color);
  }
  input[type="checkbox"] {
    width: auto;
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
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td,
  th {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid var(--divider-color, #eee);
    font-weight: normal;
  }
  th {
    color: var(--secondary-text-color);
    font-size: 0.85em;
  }
`, dt = {
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
function W(t) {
  const e = dt[t];
  if (e) return e;
  const s = t.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const pt = {
  ptz_up: "▲",
  ptz_down: "▼",
  ptz_left: "◀",
  ptz_right: "▶"
};
function De(t) {
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
const ut = {
  button: "Knopf",
  switch: "An/Aus",
  select: "Auswahl",
  number: "Wert"
};
var mt = Object.defineProperty, gt = Object.getOwnPropertyDescriptor, q = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? gt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && mt(e, s, r), r;
};
let B = class extends k {
  constructor() {
    super(...arguments), this.entityId = "", this.muted = !0, this.mode = "idle", this.message = "", this.visible = !1, this.starting = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this.observer = new IntersectionObserver((t) => {
      const e = t.some((s) => s.isIntersecting);
      e !== this.visible && (this.visible = e, e ? this.start() : this.stop());
    }), this.observer.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.observer?.disconnect(), this.observer = void 0, this.stop();
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
    this.mode = "error", this.message = _(t);
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
      e.addEventListener("track", (n) => {
        s.addTrack(n.track);
        const a = this.renderRoot.querySelector("video");
        a && (a.srcObject = s);
      });
      const i = await e.createOffer();
      await e.setLocalDescription(i);
      let r;
      return e.addEventListener("icecandidate", (n) => {
        !n.candidate || !r || this.hass.callWS({
          type: "camera/webrtc/candidate",
          entity_id: this.entityId,
          session_id: r,
          candidate: n.candidate.toJSON()
        });
      }), this.mode = "webrtc", this.unsubscribe = await this.subscribe(
        {
          type: "camera/webrtc/offer",
          entity_id: this.entityId,
          offer: i.sdp
        },
        (n) => {
          n.type === "session" ? r = n.session_id : n.type === "answer" ? e.setRemoteDescription({
            type: "answer",
            sdp: n.answer
          }) : n.type === "candidate" ? e.addIceCandidate(
            n.candidate
          ) : n.type === "error" && this.fail(new Error(String(n.message)));
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
B.styles = U`
    :host {
      display: block;
      position: relative;
      background: var(--secondary-background-color, #222);
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
      color: var(--secondary-text-color, #bbb);
      font-size: 0.9em;
    }
  `;
q([
  p({ attribute: !1 })
], B.prototype, "hass", 2);
q([
  p()
], B.prototype, "entityId", 2);
q([
  p({ type: Boolean })
], B.prototype, "muted", 2);
q([
  h()
], B.prototype, "mode", 2);
q([
  h()
], B.prototype, "message", 2);
B = q([
  E("kustos-vision-live-stream")
], B);
var bt = Object.defineProperty, vt = Object.getOwnPropertyDescriptor, K = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? vt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && bt(e, s, r), r;
};
const ft = ["ptz_up", "ptz_left", "ptz_right", "ptz_down", "siren_on", "siren_off"], yt = ["light", "siren", "privacy_mode"];
let T = class extends k {
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
      this.error = _(s);
    } finally {
      this.busy = "";
    }
  }
  renderButton(t, e, s) {
    return o`<button
      title=${W(t)}
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
          <select
            ?disabled=${this.busy !== ""}
            @change=${(i) => this.run(t.key, i.target.value)}
          >
            ${s.map(
          (i) => o`<option
                value=${i}
                ?selected=${e?.state === i}
              >
                ${i}
              </option>`
        )}
          </select>
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
    if (!t.length && !e.length) return c;
    const s = [];
    for (const i of ft)
      t.includes(i) && s.push(this.renderButton(i, pt[i] ?? W(i)));
    for (const i of yt)
      t.includes(i) && s.push(
        this.renderButton(i, `${W(i)} an`, !0),
        this.renderButton(i, `${W(i)} aus`, !1)
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
        ${e.paused ? o`<span class="meta">pausiert</span>` : c}
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
T.styles = U`
    :host {
      display: block;
      background: var(--card-background-color, #fff);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0, 0, 0, 0.15));
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
    button {
      font: inherit;
      cursor: pointer;
      border: none;
      border-radius: 8px;
      padding: 6px 10px;
      min-width: 36px;
      background: var(--secondary-background-color);
      color: var(--primary-text-color);
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    label.inline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    label.inline select,
    label.inline input {
      font: inherit;
      padding: 4px 6px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #ccc);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      max-width: 130px;
    }
    .error {
      padding: 0 12px 10px;
      color: var(--error-color, #db4437);
      font-size: 0.85em;
    }
  `;
K([
  p({ attribute: !1 })
], T.prototype, "hass", 2);
K([
  p({ attribute: !1 })
], T.prototype, "api", 2);
K([
  p({ attribute: !1 })
], T.prototype, "camera", 2);
K([
  p()
], T.prototype, "viewId", 2);
K([
  h()
], T.prototype, "busy", 2);
K([
  h()
], T.prototype, "error", 2);
T = K([
  E("kustos-vision-camera-tile")
], T);
var $t = Object.defineProperty, wt = Object.getOwnPropertyDescriptor, ie = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? wt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && $t(e, s, r), r;
};
let H = class extends k {
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
H.styles = U`
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
ie([
  p({ attribute: !1 })
], H.prototype, "hass", 2);
ie([
  p({ attribute: !1 })
], H.prototype, "api", 2);
ie([
  p({ attribute: !1 })
], H.prototype, "view", 2);
ie([
  p({ attribute: !1 })
], H.prototype, "cameras", 2);
H = ie([
  E("kustos-vision-live-view")
], H);
var _t = Object.defineProperty, kt = Object.getOwnPropertyDescriptor, G = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? kt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && _t(e, s, r), r;
};
const St = 2, xt = "mp4a.40.2";
function At(t, e) {
  const [s, i, r, n] = [0, 1, 2, 3].map((a) => e.charCodeAt(a));
  for (let a = 0; a + 8 < t.length; a += 1)
    if (t[a] === s && t[a + 1] === i && t[a + 2] === r && t[a + 3] === n)
      return a;
  return -1;
}
function Et(t) {
  return At(t, "mp4a") !== -1;
}
function Ct(t) {
  for (let e = 0; e + 8 < t.length; e += 1)
    if (t[e] === 97 && // a
    t[e + 1] === 118 && // v
    t[e + 2] === 99 && // c
    t[e + 3] === 67) {
      const s = t[e + 5], i = t[e + 6], r = t[e + 7];
      if (s === void 0 || r === void 0) return null;
      const n = (a) => a.toString(16).padStart(2, "0");
      return `avc1.${n(s)}${n(i)}${n(r)}`;
    }
  return null;
}
let N = class extends k {
  constructor() {
    super(...arguments), this.segments = [], this.seekTo = 0, this.segmentUrlBase = "/api/kustos_vision/segment", this.message = "", this.withAudio = !0, this.queue = [], this.appended = /* @__PURE__ */ new Set(), this.accepted = 0, this.origin = 0, this.loading = !1, this.generation = 0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.teardown();
  }
  updated(t) {
    t.has("segments") ? this.load() : t.has("seekTo") && this.buffer && this.jump(this.seekTo);
  }
  /** The video element's time that corresponds to a moment in real time. */
  toMediaTime(t) {
    return Math.max(0, t - this.origin);
  }
  jump(t) {
    const e = this.renderRoot.querySelector("video");
    if (!e) return;
    const s = this.toMediaTime(t), i = e.buffered;
    let r = !1;
    for (let n = 0; n < i.length; n += 1)
      s >= i.start(n) && s <= i.end(n) && (r = !0);
    if (r) {
      e.currentTime = s;
      return;
    }
    this.load(t);
  }
  teardown() {
    this.generation += 1, this.objectUrl && URL.revokeObjectURL(this.objectUrl), this.objectUrl = void 0, this.buffer = void 0, this.media = void 0, this.queue = [], this.appended.clear(), this.accepted = 0, this.loading = !1;
  }
  async load(t) {
    this.teardown();
    const e = this.generation;
    if (this.message = "", this.segments.length === 0) {
      this.message = "Für diesen Zeitraum ist nichts aufgezeichnet.";
      return;
    }
    if (!("MediaSource" in window)) {
      this.message = "Dieser Browser unterstützt die Wiedergabe nicht.";
      return;
    }
    const s = t ?? this.seekTo ?? this.segments[0].start, i = Math.max(
      0,
      this.segments.findIndex((u) => u.start + u.duration > s)
    );
    this.queue = this.segments.slice(i), this.origin = this.queue[0]?.start ?? s;
    let r;
    try {
      r = await this.inspect(this.queue[0]);
    } catch (u) {
      this.message = _(u);
      return;
    }
    if (e !== this.generation) return;
    if (!r) {
      this.message = "Diese Aufnahme ist nicht H.264. Die Wiedergabe im Panel unterstützt derzeit nur H.264; die Datei selbst ist unbeschädigt und lässt sich herunterladen.";
      return;
    }
    const n = `video/mp4; codecs="${r}"`, a = `video/mp4; codecs="${r}, ${xt}"`, l = this.withAudio ? a : n, d = MediaSource.isTypeSupported(l) ? l : MediaSource.isTypeSupported(n) ? n : null;
    if (!d) {
      this.message = `Dieser Browser kann ${r} nicht abspielen.`;
      return;
    }
    const m = new MediaSource();
    this.media = m, this.objectUrl = URL.createObjectURL(m), await this.updateComplete;
    const g = this.renderRoot.querySelector("video");
    g && (g.src = this.objectUrl, m.addEventListener(
      "sourceopen",
      () => {
        if (e === this.generation)
          try {
            const u = m.addSourceBuffer(d);
            u.mode = "segments", this.buffer = u, u.addEventListener("updateend", () => void this.pump()), this.pump();
          } catch (u) {
            this.message = _(u);
          }
      },
      { once: !0 }
    ), g.addEventListener("timeupdate", () => void this.pump()));
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
    return this.withAudio = Et(s), Ct(s);
  }
  urlFor(t) {
    return `${this.segmentUrlBase}/${t.path}`;
  }
  /** Fetch a segment with credentials, which the endpoint insists on. */
  fetchSegment(t, e) {
    const s = this.urlFor(t);
    return this.api ? this.api.authorizedFetch(s, e) : Promise.reject(
      new Error("Die Wiedergabe ist nicht mit Home Assistant verbunden.")
    );
  }
  /** Keep a little footage buffered ahead of the playhead. */
  async pump() {
    const t = this.buffer, e = this.media;
    if (!t || !e || t.updating || this.loading || e.readyState !== "open") return;
    const s = this.renderRoot.querySelector("video"), i = this.queue.filter((l) => !this.appended.has(l.path));
    if (i.length === 0) {
      if (this.accepted === 0) {
        this.message = "Keines der Segmente dieses Zeitraums ließ sich laden.";
        return;
      }
      if (e.readyState === "open")
        try {
          e.endOfStream();
        } catch {
        }
      return;
    }
    if (s && (s.buffered.length > 0 ? s.buffered.end(s.buffered.length - 1) : 0) - s.currentTime > St * (this.queue[0]?.duration ?? 0) && this.appended.size > 0)
      return;
    const r = i[0], n = this.generation;
    this.loading = !0;
    let a = !1;
    try {
      const l = await this.fetchSegment(r);
      if (!l.ok) throw new Error(`HTTP ${l.status}`);
      const d = await l.arrayBuffer();
      if (n !== this.generation || !this.buffer) return;
      this.buffer.timestampOffset = r.start - this.origin, this.buffer.appendBuffer(d), this.appended.add(r.path), this.accepted += 1;
    } catch (l) {
      this.appended.add(r.path), a = !0, console.warn("kustos_vision: segment could not be appended", r.path, l);
    } finally {
      this.loading = !1;
    }
    a && n === this.generation && this.pump();
  }
  render() {
    return o`
      <video controls playsinline></video>
      ${this.message ? o`<div class="overlay">${this.message}</div>` : c}
    `;
  }
};
N.styles = U`
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
  `;
G([
  p({ attribute: !1 })
], N.prototype, "api", 2);
G([
  p({ attribute: !1 })
], N.prototype, "segments", 2);
G([
  p({ type: Number })
], N.prototype, "seekTo", 2);
G([
  p()
], N.prototype, "segmentUrlBase", 2);
G([
  h()
], N.prototype, "message", 2);
N = G([
  E("kustos-vision-player")
], N);
var Ot = Object.defineProperty, zt = Object.getOwnPropertyDescriptor, C = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? zt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Ot(e, s, r), r;
};
const Tt = 120;
let x = class extends k {
  constructor() {
    super(...arguments), this.from = 0, this.to = 0, this.blocks = [], this.segments = [], this.position = 0, this.thumbnailUrlBase = "/api/kustos_vision/thumbnail";
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
    }, Tt);
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
  onMove(t) {
    const e = this.timeAt(t), s = this.segments.find(
      (i) => e >= i.start && e < i.start + i.duration
    );
    this.hover = { x: this.percent(e), time: e, segment: s }, this.schedulePreview(s);
  }
  onClick(t) {
    const e = this.timeAt(t);
    this.dispatchEvent(
      new CustomEvent("seek", { detail: { time: e }, bubbles: !0, composed: !0 })
    );
  }
  formatTime(t) {
    return new Date(t * 1e3).toLocaleTimeString(void 0, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }
  renderHours() {
    const t = [], s = Math.ceil(this.from / 3600) * 3600;
    for (let i = s; i <= this.to; i += 3600) t.push(i);
    return t.length > 24 ? c : o`
      ${t.map(
      (i) => o`<div class="tick" style="left:${this.percent(i)}%"></div>`
    )}
      <div class="hours">
        ${t.map(
      (i) => o`<span class="hour" style="left:${this.percent(i)}%">
            ${new Date(i * 1e3).toLocaleTimeString(void 0, {
        hour: "2-digit",
        minute: "2-digit"
      })}
          </span>`
    )}
      </div>
    `;
  }
  render() {
    return this.to <= this.from ? c : o`
      <div class="wrap">
        ${this.hover ? o`<div class="preview" style="left:${this.hover.x}%">
              ${this.preview && this.preview.path === this.hover.segment?.path ? o`<img alt="" src=${this.preview.url} />` : c}
              <div class="time">${this.formatTime(this.hover.time)}</div>
            </div>` : c}

        <div
          class="bar"
          @mousemove=${this.onMove}
          @mouseleave=${() => {
      this.hover = void 0, this.clearSettle(), this.preview = void 0;
    }}
          @click=${this.onClick}
        >
          ${this.blocks.map(
      (t) => o`<div
              class="block"
              title="${this.formatTime(t.start)} bis ${this.formatTime(t.end)}"
              style="left:${this.percent(t.start)}%;width:${this.percent(t.end) - this.percent(t.start)}%"
            ></div>`
    )}
          ${this.position >= this.from && this.position <= this.to ? o`<div class="playhead" style="left:${this.percent(this.position)}%"></div>` : c}
          ${this.renderHours()}
        </div>
        ${this.blocks.length === 0 ? o`<div class="empty">An diesem Tag wurde nichts aufgezeichnet.</div>` : c}
      </div>
    `;
  }
};
x.styles = U`
    :host {
      display: block;
      user-select: none;
    }
    .bar {
      position: relative;
      height: 44px;
      background: var(--secondary-background-color, #2a2a2a);
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
    .hours {
      position: relative;
      height: 16px;
      margin-top: 2px;
      font-size: 0.7em;
      color: var(--secondary-text-color);
    }
    .hour {
      position: absolute;
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
      background: var(--card-background-color, #fff);
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
C([
  p({ type: Number })
], x.prototype, "from", 2);
C([
  p({ type: Number })
], x.prototype, "to", 2);
C([
  p({ attribute: !1 })
], x.prototype, "blocks", 2);
C([
  p({ attribute: !1 })
], x.prototype, "segments", 2);
C([
  p({ type: Number })
], x.prototype, "position", 2);
C([
  p()
], x.prototype, "thumbnailUrlBase", 2);
C([
  p({ attribute: !1 })
], x.prototype, "api", 2);
C([
  h()
], x.prototype, "hover", 2);
C([
  h()
], x.prototype, "preview", 2);
x = C([
  E("kustos-vision-timeline")
], x);
var Pt = Object.defineProperty, Dt = Object.getOwnPropertyDescriptor, S = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Dt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Pt(e, s, r), r;
};
let w = class extends k {
  constructor() {
    super(...arguments), this.cameras = [], this.camera = "", this.stream = "", this.day = "", this.days = [], this.blocks = [], this.segments = [], this.position = 0, this.seekTo = 0, this.busy = !1, this.downloading = !1, this.error = "";
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
      this.error = _(e);
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
      this.error = _(s);
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
    return this.stream && s.set("stream", this.stream), `/api/kustos_vision/export?${s.toString()}`;
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
      this.error = _(t);
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
              <select
                @change=${(e) => this.selectCamera(e.target.value)}
              >
                ${this.cameras.map(
      (e) => o`<option value=${e.slug} ?selected=${e.slug === this.camera}>
                    ${e.name}
                  </option>`
    )}
              </select>
            </div>
            <div class="grow">
              <label>Tag</label>
              <select
                @change=${(e) => {
      this.day = e.target.value, this.loadDay();
    }}
              >
                ${this.days.length === 0 ? o`<option>keine Aufnahmen</option>` : this.days.map(
      (e) => o`<option value=${e} ?selected=${e === this.day}>
                        ${e}
                      </option>`
    )}
              </select>
            </div>
            ${t.length > 1 ? o`<div class="grow">
                  <label>Stream</label>
                  <select
                    @change=${(e) => {
      this.stream = e.target.value, this.loadDay();
    }}
                  >
                    <option value="">alle</option>
                    ${t.map(
      (e) => o`<option value=${e} ?selected=${e === this.stream}>
                        ${e}
                      </option>`
    )}
                  </select>
                </div>` : c}
          </div>
          ${this.error ? o`<p class="error">${this.error}</p>` : c}
        </div>

        <kustos-vision-player
          .api=${this.api}
          .segments=${this.segments}
          .seekTo=${this.seekTo}
        ></kustos-vision-player>

        <div>
          <kustos-vision-timeline
            .api=${this.api}
            .from=${this.bounds[0]}
            .to=${this.bounds[1]}
            .blocks=${this.blocks}
            .segments=${this.segments}
            .position=${this.position}
            @seek=${(e) => {
      this.position = e.detail.time, this.seekTo = e.detail.time;
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
              <span class="muted">
                Die Segmente werden ohne Neukodierung zusammengefügt.
              </span>
            </div>` : c}
      </div>
    `;
  }
};
w.styles = [
  se,
  U`
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
    `
];
S([
  p({ attribute: !1 })
], w.prototype, "api", 2);
S([
  p({ attribute: !1 })
], w.prototype, "cameras", 2);
S([
  h()
], w.prototype, "camera", 2);
S([
  h()
], w.prototype, "stream", 2);
S([
  h()
], w.prototype, "day", 2);
S([
  h()
], w.prototype, "days", 2);
S([
  h()
], w.prototype, "blocks", 2);
S([
  h()
], w.prototype, "segments", 2);
S([
  h()
], w.prototype, "position", 2);
S([
  h()
], w.prototype, "seekTo", 2);
S([
  h()
], w.prototype, "busy", 2);
S([
  h()
], w.prototype, "downloading", 2);
S([
  h()
], w.prototype, "error", 2);
w = S([
  E("kustos-vision-recordings")
], w);
var Bt = Object.defineProperty, Nt = Object.getOwnPropertyDescriptor, f = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Nt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Bt(e, s, r), r;
};
function Rt(t) {
  const e = t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z0-9]/.test(e) ? e : `kamera_${e}`;
}
let b = class extends k {
  constructor() {
    super(...arguments), this.capabilityKeys = [], this.available = [], this.views = [], this.allCameras = [], this.slug = "", this.name = "", this.streams = [], this.capabilities = {}, this.retentionDays = null, this.enabled = !0, this.viewSettings = {}, this.controls = [], this.candidates = [], this.busy = !1, this.error = "";
  }
  connectedCallback() {
    super.connectedCallback(), this.camera && (this.slug = this.camera.slug, this.name = this.camera.name, this.streams = this.camera.streams.map((t) => ({ ...t })), this.capabilities = structuredClone(this.camera.capabilities), this.retentionDays = this.camera.retention_days, this.enabled = this.camera.enabled, this.viewSettings = structuredClone(this.camera.view_settings ?? {}), this.controls = structuredClone(this.camera.controls ?? []), this.loadCandidates());
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
        this.camera || (this.name = e.name, this.slug = Rt(e.name)), this.streams = e.streams.map((s) => ({
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
        this.error = _(e);
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
  async save() {
    this.busy = !0, this.error = "";
    try {
      await this.api.setCamera(
        {
          slug: this.slug,
          name: this.name,
          streams: this.streams,
          capabilities: this.capabilities,
          retention_days: this.retentionDays,
          enabled: this.enabled,
          area_id: this.camera?.area_id ?? null,
          view_settings: this.viewSettings,
          controls: this.controls
        },
        // Editing an existing camera is the only case allowed to replace one.
        this.camera !== void 0
      ), this.dispatchEvent(new CustomEvent("saved", { bubbles: !0, composed: !0 }));
    } catch (t) {
      this.error = _(t);
    } finally {
      this.busy = !1;
    }
  }
  patchView(t, e) {
    const s = this.viewSettings[t] ?? { visible: !1, position: 0 };
    this.viewSettings = { ...this.viewSettings, [t]: { ...s, ...e } };
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
  async moveInView(t, e, s) {
    const i = this.membersOf(t).map((n) => n.slug), [r] = i.splice(e, 1);
    i.splice(e + s, 0, r), this.busy = !0, this.error = "";
    try {
      await this.api.setViewOrder(t.id, i), this.dispatchEvent(
        new CustomEvent("reordered", { bubbles: !0, composed: !0 })
      );
    } catch (n) {
      this.error = _(n);
    } finally {
      this.busy = !1;
    }
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
    const s = De(t.binding.entity_id), i = s.length ? s : ["button", "switch", "select", "number"], r = t.binding.entity_id;
    return o`
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
        <div class="row">
          <div class="grow">
            <label>Beschriftung</label>
            <input
              placeholder="Zoom rein"
              .value=${t.name}
              @change=${(n) => this.patchControl(e, {
      name: n.target.value
    })}
            />
          </div>
          <div class="grow">
            <label>Entity</label>
            <select
              @change=${(n) => {
      const a = n.target.value, [l] = De(a);
      this.patchControl(e, {
        binding: { entity_id: a },
        ...l ? { kind: l } : {}
      });
    }}
            >
              <option value="" ?selected=${!r}>Bitte wählen …</option>
              ${this.candidates.map(
      (n) => o`<option
                  value=${n.entity_id}
                  ?selected=${t.binding.entity_id === n.entity_id}
                >
                  ${n.name || n.entity_id}
                </option>`
    )}
            </select>
          </div>
          <div>
            <label>Bedienart</label>
            <select
              @change=${(n) => this.patchControl(e, {
      kind: n.target.value
    })}
            >
              ${i.map(
      (n) => o`<option
                  value=${n}
                  ?selected=${t.kind === n}
                >
                  ${ut[n]}
                </option>`
    )}
            </select>
          </div>
          <div>
            <label>Kennung</label>
            <input
              .value=${t.key}
              @change=${(n) => this.patchControl(e, {
      key: n.target.value
    })}
            />
          </div>
        </div>
        <div class="row" style="margin-top:8px">
          <span class="grow"></span>
          <button
            class="danger"
            @click=${() => this.controls = this.controls.filter((n, a) => a !== e)}
          >
            Entfernen
          </button>
        </div>
      </div>
    `;
  }
  renderViewBlock(t) {
    const e = this.viewSettings[t.id], s = e?.visible ?? !1, i = this.membersOf(t), r = e?.capabilities ?? null, n = [
      ...Object.keys(this.capabilities),
      ...this.controls.map((a) => a.key)
    ];
    return o`
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
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
                  <select
                    @change=${(a) => this.patchView(t.id, {
      stream_key: a.target.value || null
    })}
                  >
                    <option value="" ?selected=${!e?.stream_key}>
                      automatisch (der nicht aufgezeichnete)
                    </option>
                    ${this.streams.map(
      (a) => o`<option
                        value=${a.key}
                        ?selected=${e?.stream_key === a.key}
                      >
                        ${a.key}
                      </option>`
    )}
                  </select>
                </div>
              </div>

              <label>Bedienelemente in dieser Ansicht</label>
              ${n.length === 0 ? o`<p class="hint">Dieser Kamera ist nichts zugeordnet.</p>` : o`<div class="row">
                      ${n.map(
      (a) => o`<label style="margin:0">
                          <input
                            type="checkbox"
                            .checked=${r === null || r.includes(a)}
                            @change=${(l) => {
        const d = l.target.checked, m = new Set(r ?? n);
        d ? m.add(a) : m.delete(a), this.patchView(t.id, {
          capabilities: n.filter((g) => m.has(g))
        });
      }}
                          />
                          ${this.controls.find((l) => l.key === a)?.name || W(a)}
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
      (a, l) => o`
                    <tr>
                      <td class=${a.slug === this.slug ? "" : "muted"}>
                        ${l + 1}. ${a.name}
                      </td>
                      <td style="width:1%;white-space:nowrap">
                        <button
                          class="secondary"
                          ?disabled=${l === 0 || this.busy || !this.camera}
                          @click=${() => this.moveInView(t, l, -1)}
                        >
                          ↑
                        </button>
                        <button
                          class="secondary"
                          ?disabled=${l === i.length - 1 || this.busy || !this.camera}
                          @click=${() => this.moveInView(t, l, 1)}
                        >
                          ↓
                        </button>
                      </td>
                    </tr>
                  `
    )}
              </table>
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
      <select
        @change=${(e) => {
      const s = e.target;
      this.pick(s.value), s.value = "";
    }}
      >
        <option value="">
          ${t ? "unverändert lassen" : "Bitte wählen …"}
        </option>
        ${this.available.map(
      (e) => o`<option
            value=${e.entity_id}
            ?disabled=${e.in_use && !t}
          >
            ${e.name ?? e.entity_id}${this.pickerSuffix(e)}
          </option>`
    )}
      </select>
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
        <h2>${this.camera ? `${this.camera.name} bearbeiten` : "Kamera hinzufügen"}</h2>
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
                      <select
                        @change=${(i) => this.updateStream(s, {
        audio: i.target.value
      })}
                      >
                        <option value="transcode" ?selected=${e.audio === "transcode"}>
                          umwandeln
                        </option>
                        <option value="copy" ?selected=${e.audio === "copy"}>
                          kopieren
                        </option>
                        <option value="none" ?selected=${e.audio === "none"}>
                          ohne
                        </option>
                      </select>
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

        <h3>Bedienelemente</h3>
        <p class="hint">
          Was hier zugeordnet ist, kann auf der Kachel erscheinen. Pro Ansicht
          lässt sich unten auswählen, welche davon dort gezeigt werden.
        </p>
        <table>
          ${this.capabilityKeys.map(
      (e) => o`
              <tr>
                <th>${W(e)}</th>
                <td>
                  <select @change=${(s) => this.setCapability(e, s.target.value)}>
                    <option value="">nicht zugeordnet</option>
                    ${t.map(
        (s) => o`<option
                        value=${s.entity_id}
                        ?selected=${this.capabilities[e]?.entity_id === s.entity_id}
                      >
                        ${s.name}
                      </option>`
      )}
                  </select>
                </td>
              </tr>
            `
    )}
        </table>

        <h3>Eigene Bedienelemente</h3>
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

        <h3>Ansichten</h3>
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

        ${this.error ? o`<p class="error">${this.error}</p>` : c}

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
            @click=${() => this.dispatchEvent(
      new CustomEvent("cancelled", { bubbles: !0, composed: !0 })
    )}
          >
            Abbrechen
          </button>
        </div>
      </div>
    `;
  }
};
b.styles = se;
f([
  p({ attribute: !1 })
], b.prototype, "api", 2);
f([
  p({ attribute: !1 })
], b.prototype, "camera", 2);
f([
  p({ attribute: !1 })
], b.prototype, "capabilityKeys", 2);
f([
  p({ attribute: !1 })
], b.prototype, "available", 2);
f([
  p({ attribute: !1 })
], b.prototype, "views", 2);
f([
  p({ attribute: !1 })
], b.prototype, "allCameras", 2);
f([
  h()
], b.prototype, "slug", 2);
f([
  h()
], b.prototype, "name", 2);
f([
  h()
], b.prototype, "streams", 2);
f([
  h()
], b.prototype, "capabilities", 2);
f([
  h()
], b.prototype, "retentionDays", 2);
f([
  h()
], b.prototype, "enabled", 2);
f([
  h()
], b.prototype, "viewSettings", 2);
f([
  h()
], b.prototype, "controls", 2);
f([
  h()
], b.prototype, "candidates", 2);
f([
  h()
], b.prototype, "busy", 2);
f([
  h()
], b.prototype, "error", 2);
b = f([
  E("kustos-vision-camera-editor")
], b);
var Ut = Object.defineProperty, jt = Object.getOwnPropertyDescriptor, $ = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? jt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Ut(e, s, r), r;
};
const Mt = [
  ["boolean", "Ja/Nein"],
  ["text", "Text"],
  ["number", "Anzahl"],
  ["select", "Auswahl"]
];
let v = class extends k {
  constructor() {
    super(...arguments), this.backend = { kind: "openai" }, this.observations = [], this.triggers = [], this.context = "", this.cooldown = 60, this.budget = 100, this.condition = "", this.enabled = !0, this.aiTasks = [], this.history = [], this.busy = !1, this.error = "";
  }
  async connectedCallback() {
    if (super.connectedCallback(), this.profile)
      this.backend = { ...this.profile.backend }, this.observations = this.profile.observations.map((t) => ({ ...t })), this.triggers = [...this.profile.triggers], this.context = this.profile.context, this.cooldown = this.profile.cooldown_seconds, this.budget = this.profile.daily_budget, this.condition = this.profile.condition_entity ?? "", this.enabled = this.profile.enabled, this.loadHistory();
    else {
      const t = this.camera.capabilities.motion_trigger?.entity_id;
      t && (this.triggers = [t]);
    }
    try {
      this.aiTasks = (await this.api.aiTaskEntities()).ai_task;
    } catch {
      this.aiTasks = [];
    }
  }
  async loadHistory() {
    try {
      this.history = (await this.api.visionHistory(this.camera.slug)).history;
    } catch {
      this.history = [];
    }
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
      await this.api.setVision({
        camera_slug: this.camera.slug,
        backend: this.backend,
        observations: this.observations,
        triggers: this.triggers.filter((t) => t),
        context: this.context,
        cooldown_seconds: this.cooldown,
        daily_budget: this.budget,
        condition_entity: this.condition || null,
        enabled: this.enabled
      }), this.dispatchEvent(new CustomEvent("saved", { bubbles: !0, composed: !0 }));
    } catch (t) {
      this.error = _(t);
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
      this.error = _(t);
    } finally {
      this.busy = !1;
    }
  }
  renderBackend() {
    const t = this.backend.kind === "ai_task";
    return o`
      <h3>Modell</h3>
      <label>Anbindung</label>
      <select
        @change=${(e) => {
      const s = e.target.value;
      this.backend = { ...this.backend, kind: s };
    }}
      >
        <option value="openai" ?selected=${!t}>
          OpenAI-kompatibler Endpunkt
        </option>
        <option value="ai_task" ?selected=${t}>Home Assistant AI Task</option>
      </select>

      ${t ? o`
            <label>AI-Task-Entity</label>
            <select
              @change=${(e) => this.backend = {
      ...this.backend,
      entity_id: e.target.value
    }}
            >
              <option value="">Bitte wählen …</option>
              ${this.aiTasks.map(
      (e) => o`<option
                  value=${e.entity_id}
                  ?selected=${this.backend.entity_id === e.entity_id}
                >
                  ${e.name}${e.available ? "" : " (nicht verfügbar)"}
                </option>`
    )}
            </select>
            ${this.aiTasks.length === 0 ? o`<p class="hint">
                  Keine AI-Task-Entity gefunden, die Bilder annimmt. Dafür muss ein
                  passender Anbieter in Home Assistant eingerichtet sein.
                </p>` : c}
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
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
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
            <select
              @change=${(s) => this.patchObservation(e, {
      type: s.target.value
    })}
            >
              ${Mt.map(
      ([s, i]) => o`<option
                  value=${s}
                  ?selected=${t.type === s}
                >
                  ${i}
                </option>`
    )}
            </select>
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
            </div>` : c}

        <div class="row" style="margin-top:8px">
          ${this.lastRun && t.key in this.lastRun.values ? o`<span class="muted">
                Letzte Antwort: <strong>${String(this.lastRun.values[t.key])}</strong>
              </span>` : c}
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
    return this.history.length === 0 ? c : o`
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
        <h2>Bilderkennung für ${this.camera.name}</h2>
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
        <label>Entities, die eine Analyse starten (durch Komma getrennt)</label>
        <input
          placeholder="binary_sensor.kamera_person_detection"
          .value=${this.triggers.join(", ")}
          @change=${(e) => this.triggers = e.target.value.split(",").map((s) => s.trim()).filter((s) => s)}
        />
        <p class="hint">
          Am besten die Personenerkennung der Kamera. Reine Bewegungsmelder
          lösen bei Wind und Regen dauernd aus.
        </p>

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
          <div class="grow">
            <label>Nur wenn diese Entity an ist (optional)</label>
            <input
              placeholder="alarm_control_panel.zuhause"
              .value=${this.condition}
              @change=${(e) => this.condition = e.target.value}
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
              </button>` : c}
          <button
            class="secondary"
            @click=${() => this.dispatchEvent(
      new CustomEvent("cancelled", { bubbles: !0, composed: !0 })
    )}
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
    `;
  }
};
v.styles = se;
$([
  p({ attribute: !1 })
], v.prototype, "api", 2);
$([
  p({ attribute: !1 })
], v.prototype, "camera", 2);
$([
  p({ attribute: !1 })
], v.prototype, "profile", 2);
$([
  h()
], v.prototype, "backend", 2);
$([
  h()
], v.prototype, "observations", 2);
$([
  h()
], v.prototype, "triggers", 2);
$([
  h()
], v.prototype, "context", 2);
$([
  h()
], v.prototype, "cooldown", 2);
$([
  h()
], v.prototype, "budget", 2);
$([
  h()
], v.prototype, "condition", 2);
$([
  h()
], v.prototype, "enabled", 2);
$([
  h()
], v.prototype, "aiTasks", 2);
$([
  h()
], v.prototype, "history", 2);
$([
  h()
], v.prototype, "lastRun", 2);
$([
  h()
], v.prototype, "busy", 2);
$([
  h()
], v.prototype, "error", 2);
v = $([
  E("kustos-vision-vision-editor")
], v);
var It = Object.defineProperty, Ht = Object.getOwnPropertyDescriptor, O = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Ht(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && It(e, s, r), r;
};
const Kt = [
  ["cameras", "Kameras"],
  ["vision", "Bilderkennung"],
  ["storage", "Speicher"],
  ["views", "Ansichten"],
  ["system", "System"]
], Be = 1e3 * 1e3 * 1e3;
let A = class extends k {
  constructor() {
    super(...arguments), this.section = "cameras", this.adding = !1, this.available = [], this.busy = !1, this.error = "";
  }
  async refresh() {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: !0, composed: !0 }));
  }
  async run(t) {
    this.busy = !0, this.error = "";
    try {
      await t(), await this.refresh();
    } catch (e) {
      this.error = _(e);
    } finally {
      this.busy = !1;
    }
  }
  async startAdding() {
    this.error = "";
    try {
      this.available = (await this.api.availableCameras()).cameras, this.adding = !0;
    } catch (t) {
      this.error = _(t);
    }
  }
  // ------------------------------------------------------------------
  // Cameras
  // ------------------------------------------------------------------
  renderCameras() {
    return this.adding || this.editing ? o`<kustos-vision-camera-editor
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
        <td class="muted">${ne(t.state.used_bytes)}</td>
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
    return this.visionFor ? o`<kustos-vision-vision-editor
        .api=${this.api}
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
    const { storage: t, totals: e } = this.snapshot, s = t.max_total_bytes === null ? "" : String(t.max_total_bytes / Be);
    return o`
      <div class="card">
        <h2>Speicher</h2>
        <table>
          <tr>
            <th>Belegt</th>
            <td>${ne(e.used_bytes)}</td>
          </tr>
          <tr>
            <th>Frei am Ort</th>
            <td>${ne(e.free_bytes)}</td>
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
              ${ne(e.over_budget_bytes)} über dem Budget, und mehr
              lässt sich nicht löschen. Das Budget ist kleiner als das, was die
              Kameras zwischen zwei Aufräumläufen schreiben.
            </p>` : c}

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
  saveStorage() {
    const t = this.renderRoot, e = Number(
      t.querySelector("#segment").value
    ), s = t.querySelector("#budget").value, i = t.querySelector("#base_path").value.trim();
    i !== this.snapshot.storage.base_path && !confirm(
      `Aufnahmen künftig unter ${i} ablegen?

Was bereits unter ${this.snapshot.storage.base_path} liegt, bleibt unverändert dort und verschwindet aus der Übersicht, bis Sie es an den neuen Ort kopieren.`
    ) || this.run(
      () => this.api.setStorage({
        base_path: i,
        segment_seconds: e,
        max_total_bytes: s === "" ? null : Math.round(Number(s) * Be)
      })
    );
  }
  // ------------------------------------------------------------------
  // Views
  // ------------------------------------------------------------------
  renderViews() {
    const t = this.snapshot.views;
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
          <button ?disabled=${this.busy} @click=${this.addView}>
            Ansicht hinzufügen
          </button>
        </div>
      </div>
    `;
  }
  renderViewRow(t, e) {
    return o`
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
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
            ?disabled=${e === this.snapshot.views.length - 1}
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
  saveViews(t) {
    this.run(
      () => this.api.setViews(
        t.map(({ cameras: e, ...s }) => s)
      )
    );
  }
  patchView(t, e) {
    this.saveViews(
      this.snapshot.views.map((s, i) => i === t ? { ...s, ...e } : s)
    );
  }
  moveView(t, e) {
    const s = [...this.snapshot.views], [i] = s.splice(t, 1);
    s.splice(t + e, 0, i), this.saveViews(s);
  }
  removeView(t) {
    this.saveViews(this.snapshot.views.filter((e, s) => s !== t));
  }
  addView() {
    const t = new Set(this.snapshot.views.map((s) => s.id));
    let e = this.snapshot.views.length + 1;
    for (; t.has(`ansicht_${e}`); ) e += 1;
    this.saveViews([
      ...this.snapshot.views,
      {
        id: `ansicht_${e}`,
        name: `Ansicht ${e}`,
        cameras: [],
        icon: "mdi:cctv",
        columns: 0
      }
    ]);
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
        <div class="row" style="margin-bottom:16px">
          ${Kt.map(
      ([t, e]) => o`
              <button
                class=${this.section === t ? "" : "secondary"}
                @click=${() => {
        this.section = t, this.adding = !1, this.editing = void 0, this.visionFor = void 0;
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
A.styles = se;
O([
  p({ attribute: !1 })
], A.prototype, "api", 2);
O([
  p({ attribute: !1 })
], A.prototype, "snapshot", 2);
O([
  h()
], A.prototype, "section", 2);
O([
  h()
], A.prototype, "editing", 2);
O([
  h()
], A.prototype, "adding", 2);
O([
  h()
], A.prototype, "available", 2);
O([
  h()
], A.prototype, "visionFor", 2);
O([
  h()
], A.prototype, "busy", 2);
O([
  h()
], A.prototype, "error", 2);
A = O([
  E("kustos-vision-settings")
], A);
var Vt = Object.defineProperty, Wt = Object.getOwnPropertyDescriptor, Z = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Wt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Vt(e, s, r), r;
};
const ue = "__recordings", ae = "__settings";
let R = class extends k {
  constructor() {
    super(...arguments), this.narrow = !1, this.active = "", this.error = "";
  }
  connectedCallback() {
    super.connectedCallback(), this.load();
  }
  updated(t) {
    t.has("hass") && this.hass && !this.api && (this.api = new Pe(this.hass), this.load());
  }
  async load() {
    if (this.hass) {
      this.api ??= new Pe(this.hass);
      try {
        this.snapshot = await this.api.getConfig(), this.error = "", this.active || (this.active = this.snapshot.views[0]?.id ?? ae);
      } catch (t) {
        const e = _(t);
        this.error = e;
      }
    }
  }
  render() {
    if (this.error)
      return o`<div class="notice">
        kustos_vision ist nicht eingerichtet oder nicht erreichbar.<br />
        <span class="muted">${this.error}</span>
      </div>`;
    if (!this.snapshot || !this.api)
      return o`<div class="notice">Wird geladen …</div>`;
    const t = this.snapshot, e = t.views.find((s) => s.id === this.active);
    return o`
      <div class="tabs">
        ${t.views.map(
      (s) => o`
            <button
              class=${s.id === this.active ? "active" : ""}
              @click=${() => this.active = s.id}
            >
              ${s.name}
            </button>
          `
    )}
        <button
          class=${this.active === ue ? "active" : ""}
          @click=${() => this.active = ue}
        >
          Aufnahmen
        </button>
        <button
          class=${this.active === ae ? "active" : ""}
          @click=${() => this.active = ae}
        >
          Einstellungen
        </button>
      </div>

      <div class="body">
        ${this.active === ue ? o`<kustos-vision-recordings
              .api=${this.api}
              .cameras=${t.cameras}
            ></kustos-vision-recordings>` : this.active === ae ? o`<kustos-vision-settings
              .api=${this.api}
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
              </div>${c}`}
      </div>
    `;
  }
};
R.styles = [
  se,
  U`
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
      .tabs {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        overflow-x: auto;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, #fff);
      }
      .tabs button {
        background: transparent;
        color: inherit;
        border-radius: 8px;
        white-space: nowrap;
        opacity: 0.75;
      }
      .tabs button.active {
        background: rgba(255, 255, 255, 0.18);
        opacity: 1;
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
      .notice {
        padding: 32px 16px;
        text-align: center;
        line-height: 1.6;
        color: var(--secondary-text-color);
      }
    `
];
Z([
  p({ attribute: !1 })
], R.prototype, "hass", 2);
Z([
  p({ type: Boolean, reflect: !0 })
], R.prototype, "narrow", 2);
Z([
  h()
], R.prototype, "snapshot", 2);
Z([
  h()
], R.prototype, "active", 2);
Z([
  h()
], R.prototype, "error", 2);
R = Z([
  E("kustos-vision-panel")
], R);
export {
  R as CamwatchPanel
};
