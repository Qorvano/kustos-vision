/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const at = globalThis, pt = at.ShadowRoot && (at.ShadyCSS === void 0 || at.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, ut = Symbol(), ft = /* @__PURE__ */ new WeakMap();
let Tt = class {
  constructor(t, s, i) {
    if (this._$cssResult$ = !0, i !== ut) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = s;
  }
  get styleSheet() {
    let t = this.o;
    const s = this.t;
    if (pt && t === void 0) {
      const i = s !== void 0 && s.length === 1;
      i && (t = ft.get(s)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), i && ft.set(s, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const Rt = (e) => new Tt(typeof e == "string" ? e : e + "", void 0, ut), H = (e, ...t) => {
  const s = e.length === 1 ? e[0] : t.reduce((i, r, a) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + e[a + 1], e[0]);
  return new Tt(s, e, ut);
}, Ut = (e, t) => {
  if (pt) e.adoptedStyleSheets = t.map((s) => s instanceof CSSStyleSheet ? s : s.styleSheet);
  else for (const s of t) {
    const i = document.createElement("style"), r = at.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = s.cssText, e.appendChild(i);
  }
}, yt = pt ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((t) => {
  let s = "";
  for (const i of t.cssRules) s += i.cssText;
  return Rt(s);
})(e) : e;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Nt, defineProperty: Bt, getOwnPropertyDescriptor: Ht, getOwnPropertyNames: It, getOwnPropertySymbols: Vt, getPrototypeOf: Kt } = Object, lt = globalThis, $t = lt.trustedTypes, Lt = $t ? $t.emptyScript : "", Wt = lt.reactiveElementPolyfillSupport, G = (e, t) => e, nt = { toAttribute(e, t) {
  switch (t) {
    case Boolean:
      e = e ? Lt : null;
      break;
    case Object:
    case Array:
      e = e == null ? e : JSON.stringify(e);
  }
  return e;
}, fromAttribute(e, t) {
  let s = e;
  switch (t) {
    case Boolean:
      s = e !== null;
      break;
    case Number:
      s = e === null ? null : Number(e);
      break;
    case Object:
    case Array:
      try {
        s = JSON.parse(e);
      } catch {
        s = null;
      }
  }
  return s;
} }, mt = (e, t) => !Nt(e, t), wt = { attribute: !0, type: String, converter: nt, reflect: !1, useDefault: !1, hasChanged: mt };
Symbol.metadata ??= Symbol("metadata"), lt.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let I = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ??= []).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, s = wt) {
    if (s.state && (s.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((s = Object.create(s)).wrapped = !0), this.elementProperties.set(t, s), !s.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(t, i, s);
      r !== void 0 && Bt(this.prototype, t, r);
    }
  }
  static getPropertyDescriptor(t, s, i) {
    const { get: r, set: a } = Ht(this.prototype, t) ?? { get() {
      return this[s];
    }, set(n) {
      this[s] = n;
    } };
    return { get: r, set(n) {
      const p = r?.call(this);
      a?.call(this, n), this.requestUpdate(t, p, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? wt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(G("elementProperties"))) return;
    const t = Kt(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(G("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(G("properties"))) {
      const s = this.properties, i = [...It(s), ...Vt(s)];
      for (const r of i) this.createProperty(r, s[r]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const s = litPropertyMetadata.get(t);
      if (s !== void 0) for (const [i, r] of s) this.elementProperties.set(i, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [s, i] of this.elementProperties) {
      const r = this._$Eu(s, i);
      r !== void 0 && this._$Eh.set(r, s);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const s = [];
    if (Array.isArray(t)) {
      const i = new Set(t.flat(1 / 0).reverse());
      for (const r of i) s.unshift(yt(r));
    } else t !== void 0 && s.push(yt(t));
    return s;
  }
  static _$Eu(t, s) {
    const i = s.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t) => t(this));
  }
  addController(t) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t), this.renderRoot !== void 0 && this.isConnected && t.hostConnected?.();
  }
  removeController(t) {
    this._$EO?.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), s = this.constructor.elementProperties;
    for (const i of s.keys()) this.hasOwnProperty(i) && (t.set(i, this[i]), delete this[i]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Ut(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((t) => t.hostConnected?.());
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t) => t.hostDisconnected?.());
  }
  attributeChangedCallback(t, s, i) {
    this._$AK(t, i);
  }
  _$ET(t, s) {
    const i = this.constructor.elementProperties.get(t), r = this.constructor._$Eu(t, i);
    if (r !== void 0 && i.reflect === !0) {
      const a = (i.converter?.toAttribute !== void 0 ? i.converter : nt).toAttribute(s, i.type);
      this._$Em = t, a == null ? this.removeAttribute(r) : this.setAttribute(r, a), this._$Em = null;
    }
  }
  _$AK(t, s) {
    const i = this.constructor, r = i._$Eh.get(t);
    if (r !== void 0 && this._$Em !== r) {
      const a = i.getPropertyOptions(r), n = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : nt;
      this._$Em = r;
      const p = n.fromAttribute(s, a.type);
      this[r] = p ?? this._$Ej?.get(r) ?? p, this._$Em = null;
    }
  }
  requestUpdate(t, s, i, r = !1, a) {
    if (t !== void 0) {
      const n = this.constructor;
      if (r === !1 && (a = this[t]), i ??= n.getPropertyOptions(t), !((i.hasChanged ?? mt)(a, s) || i.useDefault && i.reflect && a === this._$Ej?.get(t) && !this.hasAttribute(n._$Eu(t, i)))) return;
      this.C(t, s, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, s, { useDefault: i, reflect: r, wrapped: a }, n) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t) && (this._$Ej.set(t, n ?? s ?? this[t]), a !== !0 || n !== void 0) || (this._$AL.has(t) || (this.hasUpdated || i || (s = void 0), this._$AL.set(t, s)), r === !0 && this._$Em !== t && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (s) {
      Promise.reject(s);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
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
        const { wrapped: n } = a, p = this[r];
        n !== !0 || this._$AL.has(r) || p === void 0 || this.C(r, void 0, a, p);
      }
    }
    let t = !1;
    const s = this._$AL;
    try {
      t = this.shouldUpdate(s), t ? (this.willUpdate(s), this._$EO?.forEach((i) => i.hostUpdate?.()), this.update(s)) : this._$EM();
    } catch (i) {
      throw t = !1, this._$EM(), i;
    }
    t && this._$AE(s);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    this._$EO?.forEach((s) => s.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
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
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq &&= this._$Eq.forEach((s) => this._$ET(s, this[s])), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
I.elementStyles = [], I.shadowRootOptions = { mode: "open" }, I[G("elementProperties")] = /* @__PURE__ */ new Map(), I[G("finalized")] = /* @__PURE__ */ new Map(), Wt?.({ ReactiveElement: I }), (lt.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const gt = globalThis, _t = (e) => e, ot = gt.trustedTypes, kt = ot ? ot.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, zt = "$lit$", P = `lit$${Math.random().toFixed(9).slice(2)}$`, Dt = "?" + P, qt = `<${Dt}>`, U = document, Z = () => U.createComment(""), J = (e) => e === null || typeof e != "object" && typeof e != "function", vt = Array.isArray, Ft = (e) => vt(e) || typeof e?.[Symbol.iterator] == "function", ct = `[ 	
\f\r]`, F = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, At = /-->/g, xt = />/g, M = RegExp(`>|${ct}(?:([^\\s"'>=/]+)(${ct}*=${ct}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), St = /'/g, Et = /"/g, jt = /^(?:script|style|textarea|title)$/i, Gt = (e) => (t, ...s) => ({ _$litType$: e, strings: t, values: s }), o = Gt(1), V = Symbol.for("lit-noChange"), l = Symbol.for("lit-nothing"), Ct = /* @__PURE__ */ new WeakMap(), R = U.createTreeWalker(U, 129);
function Mt(e, t) {
  if (!vt(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return kt !== void 0 ? kt.createHTML(t) : t;
}
const Zt = (e, t) => {
  const s = e.length - 1, i = [];
  let r, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", n = F;
  for (let p = 0; p < s; p++) {
    const c = e[p];
    let m, g, d = -1, C = 0;
    for (; C < c.length && (n.lastIndex = C, g = n.exec(c), g !== null); ) C = n.lastIndex, n === F ? g[1] === "!--" ? n = At : g[1] !== void 0 ? n = xt : g[2] !== void 0 ? (jt.test(g[2]) && (r = RegExp("</" + g[2], "g")), n = M) : g[3] !== void 0 && (n = M) : n === M ? g[0] === ">" ? (n = r ?? F, d = -1) : g[1] === void 0 ? d = -2 : (d = n.lastIndex - g[2].length, m = g[1], n = g[3] === void 0 ? M : g[3] === '"' ? Et : St) : n === Et || n === St ? n = M : n === At || n === xt ? n = F : (n = M, r = void 0);
    const O = n === M && e[p + 1].startsWith("/>") ? " " : "";
    a += n === F ? c + qt : d >= 0 ? (i.push(m), c.slice(0, d) + zt + c.slice(d) + P + O) : c + P + (d === -2 ? p : O);
  }
  return [Mt(e, a + (e[s] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), i];
};
class X {
  constructor({ strings: t, _$litType$: s }, i) {
    let r;
    this.parts = [];
    let a = 0, n = 0;
    const p = t.length - 1, c = this.parts, [m, g] = Zt(t, s);
    if (this.el = X.createElement(m, i), R.currentNode = this.el.content, s === 2 || s === 3) {
      const d = this.el.content.firstChild;
      d.replaceWith(...d.childNodes);
    }
    for (; (r = R.nextNode()) !== null && c.length < p; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const d of r.getAttributeNames()) if (d.endsWith(zt)) {
          const C = g[n++], O = r.getAttribute(d).split(P), st = /([.?@])?(.*)/.exec(C);
          c.push({ type: 1, index: a, name: st[2], strings: O, ctor: st[1] === "." ? Xt : st[1] === "?" ? Yt : st[1] === "@" ? Qt : ht }), r.removeAttribute(d);
        } else d.startsWith(P) && (c.push({ type: 6, index: a }), r.removeAttribute(d));
        if (jt.test(r.tagName)) {
          const d = r.textContent.split(P), C = d.length - 1;
          if (C > 0) {
            r.textContent = ot ? ot.emptyScript : "";
            for (let O = 0; O < C; O++) r.append(d[O], Z()), R.nextNode(), c.push({ type: 2, index: ++a });
            r.append(d[C], Z());
          }
        }
      } else if (r.nodeType === 8) if (r.data === Dt) c.push({ type: 2, index: a });
      else {
        let d = -1;
        for (; (d = r.data.indexOf(P, d + 1)) !== -1; ) c.push({ type: 7, index: a }), d += P.length - 1;
      }
      a++;
    }
  }
  static createElement(t, s) {
    const i = U.createElement("template");
    return i.innerHTML = t, i;
  }
}
function K(e, t, s = e, i) {
  if (t === V) return t;
  let r = i !== void 0 ? s._$Co?.[i] : s._$Cl;
  const a = J(t) ? void 0 : t._$litDirective$;
  return r?.constructor !== a && (r?._$AO?.(!1), a === void 0 ? r = void 0 : (r = new a(e), r._$AT(e, s, i)), i !== void 0 ? (s._$Co ??= [])[i] = r : s._$Cl = r), r !== void 0 && (t = K(e, r._$AS(e, t.values), r, i)), t;
}
class Jt {
  constructor(t, s) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = s;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: s }, parts: i } = this._$AD, r = (t?.creationScope ?? U).importNode(s, !0);
    R.currentNode = r;
    let a = R.nextNode(), n = 0, p = 0, c = i[0];
    for (; c !== void 0; ) {
      if (n === c.index) {
        let m;
        c.type === 2 ? m = new Y(a, a.nextSibling, this, t) : c.type === 1 ? m = new c.ctor(a, c.name, c.strings, this, t) : c.type === 6 && (m = new te(a, this, t)), this._$AV.push(m), c = i[++p];
      }
      n !== c?.index && (a = R.nextNode(), n++);
    }
    return R.currentNode = U, r;
  }
  p(t) {
    let s = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(t, i, s), s += i.strings.length - 2) : i._$AI(t[s])), s++;
  }
}
class Y {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t, s, i, r) {
    this.type = 2, this._$AH = l, this._$AN = void 0, this._$AA = t, this._$AB = s, this._$AM = i, this.options = r, this._$Cv = r?.isConnected ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const s = this._$AM;
    return s !== void 0 && t?.nodeType === 11 && (t = s.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, s = this) {
    t = K(this, t, s), J(t) ? t === l || t == null || t === "" ? (this._$AH !== l && this._$AR(), this._$AH = l) : t !== this._$AH && t !== V && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Ft(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== l && J(this._$AH) ? this._$AA.nextSibling.data = t : this.T(U.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    const { values: s, _$litType$: i } = t, r = typeof i == "number" ? this._$AC(t) : (i.el === void 0 && (i.el = X.createElement(Mt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === r) this._$AH.p(s);
    else {
      const a = new Jt(r, this), n = a.u(this.options);
      a.p(s), this.T(n), this._$AH = a;
    }
  }
  _$AC(t) {
    let s = Ct.get(t.strings);
    return s === void 0 && Ct.set(t.strings, s = new X(t)), s;
  }
  k(t) {
    vt(this._$AH) || (this._$AH = [], this._$AR());
    const s = this._$AH;
    let i, r = 0;
    for (const a of t) r === s.length ? s.push(i = new Y(this.O(Z()), this.O(Z()), this, this.options)) : i = s[r], i._$AI(a), r++;
    r < s.length && (this._$AR(i && i._$AB.nextSibling, r), s.length = r);
  }
  _$AR(t = this._$AA.nextSibling, s) {
    for (this._$AP?.(!1, !0, s); t !== this._$AB; ) {
      const i = _t(t).nextSibling;
      _t(t).remove(), t = i;
    }
  }
  setConnected(t) {
    this._$AM === void 0 && (this._$Cv = t, this._$AP?.(t));
  }
}
class ht {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, s, i, r, a) {
    this.type = 1, this._$AH = l, this._$AN = void 0, this.element = t, this.name = s, this._$AM = r, this.options = a, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = l;
  }
  _$AI(t, s = this, i, r) {
    const a = this.strings;
    let n = !1;
    if (a === void 0) t = K(this, t, s, 0), n = !J(t) || t !== this._$AH && t !== V, n && (this._$AH = t);
    else {
      const p = t;
      let c, m;
      for (t = a[0], c = 0; c < a.length - 1; c++) m = K(this, p[i + c], s, c), m === V && (m = this._$AH[c]), n ||= !J(m) || m !== this._$AH[c], m === l ? t = l : t !== l && (t += (m ?? "") + a[c + 1]), this._$AH[c] = m;
    }
    n && !r && this.j(t);
  }
  j(t) {
    t === l ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Xt extends ht {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === l ? void 0 : t;
  }
}
class Yt extends ht {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== l);
  }
}
class Qt extends ht {
  constructor(t, s, i, r, a) {
    super(t, s, i, r, a), this.type = 5;
  }
  _$AI(t, s = this) {
    if ((t = K(this, t, s, 0) ?? l) === V) return;
    const i = this._$AH, r = t === l && i !== l || t.capture !== i.capture || t.once !== i.once || t.passive !== i.passive, a = t !== l && (i === l || r);
    r && this.element.removeEventListener(this.name, this, i), a && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class te {
  constructor(t, s, i) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = s, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    K(this, t);
  }
}
const ee = gt.litHtmlPolyfillSupport;
ee?.(X, Y), (gt.litHtmlVersions ??= []).push("3.3.3");
const se = (e, t, s) => {
  const i = s?.renderBefore ?? t;
  let r = i._$litPart$;
  if (r === void 0) {
    const a = s?.renderBefore ?? null;
    i._$litPart$ = r = new Y(t.insertBefore(Z(), a), a, void 0, s ?? {});
  }
  return r._$AI(e), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const bt = globalThis;
class w extends I {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t.firstChild, t;
  }
  update(t) {
    const s = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = se(s, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return V;
  }
}
w._$litElement$ = !0, w.finalized = !0, bt.litElementHydrateSupport?.({ LitElement: w });
const ie = bt.litElementPolyfillSupport;
ie?.({ LitElement: w });
(bt.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const S = (e) => (t, s) => {
  s !== void 0 ? s.addInitializer(() => {
    customElements.define(e, t);
  }) : customElements.define(e, t);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const re = { attribute: !0, type: String, converter: nt, reflect: !1, hasChanged: mt }, ae = (e = re, t, s) => {
  const { kind: i, metadata: r } = s;
  let a = globalThis.litPropertyMetadata.get(r);
  if (a === void 0 && globalThis.litPropertyMetadata.set(r, a = /* @__PURE__ */ new Map()), i === "setter" && ((e = Object.create(e)).wrapped = !0), a.set(s.name, e), i === "accessor") {
    const { name: n } = s;
    return { set(p) {
      const c = t.get.call(this);
      t.set.call(this, p), this.requestUpdate(n, c, e, !0, p);
    }, init(p) {
      return p !== void 0 && this.C(n, void 0, e, p), p;
    } };
  }
  if (i === "setter") {
    const { name: n } = s;
    return function(p) {
      const c = this[n];
      t.call(this, p), this.requestUpdate(n, c, e, !0, p);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function u(e) {
  return (t, s) => typeof s == "object" ? ae(e, t, s) : ((i, r, a) => {
    const n = r.hasOwnProperty(a);
    return r.constructor.createProperty(a, i), n ? Object.getOwnPropertyDescriptor(r, a) : void 0;
  })(e, t, s);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function h(e) {
  return u({ ...e, state: !0, attribute: !1 });
}
const f = "kustos_vision";
class Ot {
  constructor(t) {
    this.hass = t;
  }
  getConfig() {
    return this.hass.callWS({ type: `${f}/config/get` });
  }
  availableCameras() {
    return this.hass.callWS({ type: `${f}/cameras/available` });
  }
  suggest(t) {
    return this.hass.callWS({
      type: `${f}/camera/suggest`,
      entity_id: t
    });
  }
  setCamera(t) {
    return this.hass.callWS({ type: `${f}/camera/set`, ...t });
  }
  deleteCamera(t) {
    return this.hass.callWS({ type: `${f}/camera/delete`, slug: t });
  }
  setViews(t) {
    return this.hass.callWS({ type: `${f}/views/set`, views: t });
  }
  setStorage(t) {
    return this.hass.callWS({ type: `${f}/storage/set`, ...t });
  }
  trigger(t, s, i) {
    return this.hass.callWS({
      type: `${f}/camera/trigger`,
      slug: t,
      capability: s,
      ...i === void 0 ? {} : { value: i }
    });
  }
  recordingDays(t) {
    return this.hass.callWS({ type: `${f}/recordings/days`, camera: t });
  }
  timeline(t, s, i, r) {
    return this.hass.callWS({
      type: `${f}/recordings/timeline`,
      camera: t,
      from: s,
      to: i,
      ...r ? { stream: r } : {}
    });
  }
  setVision(t) {
    return this.hass.callWS({ type: `${f}/vision/set`, ...t });
  }
  deleteVision(t) {
    return this.hass.callWS({
      type: `${f}/vision/delete`,
      camera_slug: t
    });
  }
  analyseNow(t) {
    return this.hass.callWS({
      type: `${f}/vision/analyse`,
      camera_slug: t
    });
  }
  visionHistory(t) {
    return this.hass.callWS({
      type: `${f}/vision/history`,
      camera_slug: t
    });
  }
  aiTaskEntities() {
    return this.hass.callWS({ type: `${f}/vision/backends` });
  }
  rebuildIndex() {
    return this.hass.callWS({ type: `${f}/index/rebuild` });
  }
}
function it(e) {
  if (e === null) return "unbekannt";
  const t = ["B", "kB", "MB", "GB", "TB"];
  let s = e, i = 0;
  for (; s >= 1e3 && i < t.length - 1; )
    s /= 1e3, i += 1;
  return `${s.toFixed(s < 10 && i > 0 ? 1 : 0)} ${t[i]}`;
}
const Q = H`
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
`;
var ne = Object.defineProperty, oe = Object.getOwnPropertyDescriptor, L = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? oe(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && ne(t, s, r), r;
};
let T = class extends w {
  constructor() {
    super(...arguments), this.entityId = "", this.muted = !0, this.mode = "idle", this.message = "", this.visible = !1, this.starting = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this.observer = new IntersectionObserver((e) => {
      const t = e.some((s) => s.isIntersecting);
      t !== this.visible && (this.visible = t, t ? this.start() : this.stop());
    }), this.observer.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.observer?.disconnect(), this.observer = void 0, this.stop();
  }
  updated(e) {
    e.has("entityId") && this.visible && (this.stop(), this.start());
  }
  get accessToken() {
    return this.hass?.states?.[this.entityId]?.attributes?.access_token;
  }
  async start() {
    if (!(this.starting || !this.entityId || !this.hass)) {
      this.starting = !0;
      try {
        const t = (await this.hass.callWS({
          type: "camera/capabilities",
          entity_id: this.entityId
        })).frontend_stream_types ?? [];
        if (t.includes("web_rtc") && await this.startWebRtc() || t.includes("hls") && await this.startHls()) return;
        this.startMjpeg();
      } catch (e) {
        this.fail(e);
      } finally {
        this.starting = !1;
      }
    }
  }
  stop() {
    this.unsubscribe?.(), this.unsubscribe = void 0, this.peer?.close(), this.peer = void 0;
    const e = this.renderRoot.querySelector("video");
    e && (e.srcObject = null, e.removeAttribute("src")), this.mode = "idle";
  }
  fail(e) {
    this.mode = "error", this.message = e instanceof Error ? e.message : String(e);
  }
  // --------------------------------------------------------------------
  // WebRTC
  // --------------------------------------------------------------------
  async startWebRtc() {
    try {
      const e = await this.hass.callWS({
        type: "camera/webrtc/get_client_config",
        entity_id: this.entityId
      }), t = new RTCPeerConnection(e.configuration);
      this.peer = t, t.addTransceiver("video", { direction: "recvonly" }), t.addTransceiver("audio", { direction: "recvonly" });
      const s = new MediaStream();
      t.addEventListener("track", (a) => {
        s.addTrack(a.track);
        const n = this.renderRoot.querySelector("video");
        n && (n.srcObject = s);
      });
      const i = await t.createOffer();
      await t.setLocalDescription(i);
      let r;
      return t.addEventListener("icecandidate", (a) => {
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
          a.type === "session" ? r = a.session_id : a.type === "answer" ? t.setRemoteDescription({
            type: "answer",
            sdp: a.answer
          }) : a.type === "candidate" ? t.addIceCandidate(
            a.candidate
          ) : a.type === "error" && this.fail(new Error(String(a.message)));
        }
      ), !0;
    } catch {
      return this.peer?.close(), this.peer = void 0, !1;
    }
  }
  subscribe(e, t) {
    return this.hass.connection.subscribeMessage(t, e);
  }
  // --------------------------------------------------------------------
  // HLS and MJPEG
  // --------------------------------------------------------------------
  async startHls() {
    if (!document.createElement("video").canPlayType("application/vnd.apple.mpegurl")) return !1;
    try {
      const { url: t } = await this.hass.callWS({
        type: "camera/stream",
        entity_id: this.entityId,
        format: "hls"
      });
      this.mode = "hls", await this.updateComplete;
      const s = this.renderRoot.querySelector("video");
      return s && (s.src = this.hass.hassUrl(t), s.play().catch(() => {
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
    const e = this.accessToken;
    switch (this.mode) {
      case "webrtc":
      case "hls":
        return o`<video autoplay playsinline .muted=${this.muted}></video>`;
      case "mjpeg":
        return o`<img
          alt=""
          src=${this.hass.hassUrl(
          `/api/camera_proxy_stream/${this.entityId}?token=${e}`
        )}
        />`;
      case "still":
        return e ? o`<img
              alt=""
              src=${this.hass.hassUrl(
          `/api/camera_proxy/${this.entityId}?token=${e}`
        )}
            />` : o`<div class="overlay">Kein Vorschaubild verfügbar</div>`;
      case "error":
        return o`<div class="overlay">${this.message}</div>`;
      default:
        return o`<div class="overlay">…</div>${l}`;
    }
  }
};
T.styles = H`
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
L([
  u({ attribute: !1 })
], T.prototype, "hass", 2);
L([
  u()
], T.prototype, "entityId", 2);
L([
  u({ type: Boolean })
], T.prototype, "muted", 2);
L([
  h()
], T.prototype, "mode", 2);
L([
  h()
], T.prototype, "message", 2);
T = L([
  S("kustos-vision-live-stream")
], T);
var le = Object.defineProperty, he = Object.getOwnPropertyDescriptor, W = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? he(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && le(t, s, r), r;
};
const ce = [
  ["ptz_up", "▲"],
  ["ptz_left", "◀"],
  ["ptz_right", "▶"],
  ["ptz_down", "▼"]
];
let z = class extends w {
  constructor() {
    super(...arguments), this.busy = "", this.error = "";
  }
  get liveEntity() {
    const e = this.camera.streams;
    return (e.find((t) => !t.record) ?? e[0])?.entity_id;
  }
  async run(e, t) {
    this.busy = e, this.error = "";
    try {
      await this.api.trigger(this.camera.slug, e, t);
    } catch (s) {
      this.error = s instanceof Error ? s.message : String(s);
    } finally {
      this.busy = "";
    }
  }
  bound(e) {
    return e in this.camera.capabilities;
  }
  renderButton(e, t, s) {
    return this.bound(e) ? o`<button
      title=${e}
      ?disabled=${this.busy !== ""}
      @click=${() => this.run(e, s)}
    >
      ${t}
    </button>` : l;
  }
  render() {
    const e = this.liveEntity, t = this.camera.state, s = t.streams.filter((i) => i.running).length;
    return o`
      <header>
        <span
          class="dot ${t.recording ? "recording" : ""}"
          title=${t.recording ? `${s} Stream(s) werden aufgezeichnet` : t.paused ? "Aufzeichnung pausiert" : "Aufzeichnung laeuft nicht"}
        ></span>
        <span>${this.camera.name}</span>
        <span class="spacer"></span>
        ${t.paused ? o`<span class="meta">pausiert</span>` : l}
      </header>

      ${e ? o`<kustos-vision-live-stream
            .hass=${this.hass}
            .entityId=${e}
          ></kustos-vision-live-stream>` : o`<div class="meta" style="padding:12px">Kein Stream zugeordnet</div>`}

      <div class="controls">
        ${ce.map(([i, r]) => this.renderButton(i, r))}
        ${this.renderButton("light", "Licht an", !0)}
        ${this.renderButton("light", "Licht aus", !1)}
        ${this.renderButton("siren", "Sirene", !0)}
        ${this.renderButton("siren_on", "Sirene an")}
        ${this.renderButton("siren_off", "Sirene aus")}
      </div>
      ${this.error ? o`<div class="error">${this.error}</div>` : l}
    `;
  }
};
z.styles = H`
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
    .error {
      padding: 0 12px 10px;
      color: var(--error-color, #db4437);
      font-size: 0.85em;
    }
  `;
W([
  u({ attribute: !1 })
], z.prototype, "hass", 2);
W([
  u({ attribute: !1 })
], z.prototype, "api", 2);
W([
  u({ attribute: !1 })
], z.prototype, "camera", 2);
W([
  h()
], z.prototype, "busy", 2);
W([
  h()
], z.prototype, "error", 2);
z = W([
  S("kustos-vision-camera-tile")
], z);
var de = Object.defineProperty, pe = Object.getOwnPropertyDescriptor, tt = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? pe(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && de(t, s, r), r;
};
let N = class extends w {
  constructor() {
    super(...arguments), this.cameras = [];
  }
  get shown() {
    const e = new Map(this.cameras.map((t) => [t.slug, t]));
    return this.view.cameras.map((t) => e.get(t)).filter((t) => t !== void 0);
  }
  render() {
    const e = this.shown;
    if (e.length === 0)
      return o`<div class="empty">
        Dieser Ansicht ist noch keine Kamera zugeordnet.<br />
        Unter Einstellungen, Ansichten lässt sich das ändern.
      </div>`;
    const t = this.view.columns > 0 ? `grid-template-columns: repeat(${this.view.columns}, 1fr)` : "";
    return o`
      <div class="grid" style=${t}>
        ${e.map(
      (s) => o`
            <kustos-vision-camera-tile
              .hass=${this.hass}
              .api=${this.api}
              .camera=${s}
            ></kustos-vision-camera-tile>
          `
    )}
      </div>
    `;
  }
};
N.styles = H`
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
tt([
  u({ attribute: !1 })
], N.prototype, "hass", 2);
tt([
  u({ attribute: !1 })
], N.prototype, "api", 2);
tt([
  u({ attribute: !1 })
], N.prototype, "view", 2);
tt([
  u({ attribute: !1 })
], N.prototype, "cameras", 2);
N = tt([
  S("kustos-vision-live-view")
], N);
var ue = Object.defineProperty, me = Object.getOwnPropertyDescriptor, et = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? me(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && ue(t, s, r), r;
};
const ge = 2, ve = "mp4a.40.2";
function be(e, t) {
  const [s, i, r, a] = [0, 1, 2, 3].map((n) => t.charCodeAt(n));
  for (let n = 0; n + 8 < e.length; n += 1)
    if (e[n] === s && e[n + 1] === i && e[n + 2] === r && e[n + 3] === a)
      return n;
  return -1;
}
function fe(e) {
  return be(e, "mp4a") !== -1;
}
function ye(e) {
  for (let t = 0; t + 8 < e.length; t += 1)
    if (e[t] === 97 && // a
    e[t + 1] === 118 && // v
    e[t + 2] === 99 && // c
    e[t + 3] === 67) {
      const s = e[t + 5], i = e[t + 6], r = e[t + 7];
      if (s === void 0 || r === void 0) return null;
      const a = (n) => n.toString(16).padStart(2, "0");
      return `avc1.${a(s)}${a(i)}${a(r)}`;
    }
  return null;
}
let B = class extends w {
  constructor() {
    super(...arguments), this.segments = [], this.seekTo = 0, this.segmentUrlBase = "/api/kustos_vision/segment", this.message = "", this.withAudio = !0, this.queue = [], this.appended = /* @__PURE__ */ new Set(), this.origin = 0, this.loading = !1, this.generation = 0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.teardown();
  }
  updated(e) {
    e.has("segments") ? this.load() : e.has("seekTo") && this.buffer && this.jump(this.seekTo);
  }
  /** The video element's time that corresponds to a moment in real time. */
  toMediaTime(e) {
    return Math.max(0, e - this.origin);
  }
  jump(e) {
    const t = this.renderRoot.querySelector("video");
    if (!t) return;
    const s = this.toMediaTime(e), i = t.buffered;
    let r = !1;
    for (let a = 0; a < i.length; a += 1)
      s >= i.start(a) && s <= i.end(a) && (r = !0);
    if (r) {
      t.currentTime = s;
      return;
    }
    this.load(e);
  }
  teardown() {
    this.generation += 1, this.objectUrl && URL.revokeObjectURL(this.objectUrl), this.objectUrl = void 0, this.buffer = void 0, this.media = void 0, this.queue = [], this.appended.clear(), this.loading = !1;
  }
  async load(e) {
    this.teardown();
    const t = this.generation;
    if (this.message = "", this.segments.length === 0) {
      this.message = "Für diesen Zeitraum ist nichts aufgezeichnet.";
      return;
    }
    if (!("MediaSource" in window)) {
      this.message = "Dieser Browser unterstützt die Wiedergabe nicht.";
      return;
    }
    const s = e ?? this.seekTo ?? this.segments[0].start, i = Math.max(
      0,
      this.segments.findIndex((d) => d.start + d.duration > s)
    );
    this.queue = this.segments.slice(i), this.origin = this.queue[0]?.start ?? s;
    let r;
    try {
      r = await this.inspect(this.queue[0]);
    } catch (d) {
      this.message = d instanceof Error ? d.message : String(d);
      return;
    }
    if (t !== this.generation) return;
    if (!r) {
      this.message = "Diese Aufnahme ist nicht H.264. Die Wiedergabe im Panel unterstützt derzeit nur H.264; die Datei selbst ist unbeschädigt und lässt sich herunterladen.";
      return;
    }
    const a = `video/mp4; codecs="${r}"`, n = `video/mp4; codecs="${r}, ${ve}"`, p = this.withAudio ? n : a, c = MediaSource.isTypeSupported(p) ? p : MediaSource.isTypeSupported(a) ? a : null;
    if (!c) {
      this.message = `Dieser Browser kann ${r} nicht abspielen.`;
      return;
    }
    const m = new MediaSource();
    this.media = m, this.objectUrl = URL.createObjectURL(m), await this.updateComplete;
    const g = this.renderRoot.querySelector("video");
    g && (g.src = this.objectUrl, m.addEventListener(
      "sourceopen",
      () => {
        if (t === this.generation)
          try {
            const d = m.addSourceBuffer(c);
            d.mode = "segments", this.buffer = d, d.addEventListener("updateend", () => void this.pump()), this.pump();
          } catch (d) {
            this.message = d instanceof Error ? d.message : String(d);
          }
      },
      { once: !0 }
    ), g.addEventListener("timeupdate", () => void this.pump()));
  }
  async inspect(e) {
    const t = await fetch(this.urlFor(e), {
      headers: { Range: "bytes=0-8191" }
    });
    if (!t.ok && t.status !== 206)
      throw new Error("Die Aufnahme konnte nicht geladen werden.");
    const s = new Uint8Array(await t.arrayBuffer());
    return this.withAudio = fe(s), ye(s);
  }
  urlFor(e) {
    return `${this.segmentUrlBase}/${e.path}`;
  }
  /** Keep a little footage buffered ahead of the playhead. */
  async pump() {
    const e = this.buffer, t = this.media;
    if (!e || !t || e.updating || this.loading || t.readyState !== "open") return;
    const s = this.renderRoot.querySelector("video"), i = this.queue.filter((n) => !this.appended.has(n.path));
    if (i.length === 0) {
      if (t.readyState === "open")
        try {
          t.endOfStream();
        } catch {
        }
      return;
    }
    if (s && (s.buffered.length > 0 ? s.buffered.end(s.buffered.length - 1) : 0) - s.currentTime > ge * (this.queue[0]?.duration ?? 0) && this.appended.size > 0)
      return;
    const r = i[0], a = this.generation;
    this.loading = !0;
    try {
      const n = await fetch(this.urlFor(r));
      if (!n.ok) throw new Error(`HTTP ${n.status}`);
      const p = await n.arrayBuffer();
      if (a !== this.generation || !this.buffer) return;
      this.buffer.timestampOffset = r.start - this.origin, this.buffer.appendBuffer(p), this.appended.add(r.path);
    } catch (n) {
      this.appended.add(r.path), console.warn("kustos_vision: segment could not be appended", r.path, n);
    } finally {
      this.loading = !1;
    }
  }
  render() {
    return o`
      <video controls playsinline></video>
      ${this.message ? o`<div class="overlay">${this.message}</div>` : l}
    `;
  }
};
B.styles = H`
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
et([
  u({ attribute: !1 })
], B.prototype, "segments", 2);
et([
  u({ type: Number })
], B.prototype, "seekTo", 2);
et([
  u()
], B.prototype, "segmentUrlBase", 2);
et([
  h()
], B.prototype, "message", 2);
B = et([
  S("kustos-vision-player")
], B);
var $e = Object.defineProperty, we = Object.getOwnPropertyDescriptor, j = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? we(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && $e(t, s, r), r;
};
let x = class extends w {
  constructor() {
    super(...arguments), this.from = 0, this.to = 0, this.blocks = [], this.segments = [], this.position = 0, this.thumbnailUrlBase = "/api/kustos_vision/thumbnail";
  }
  get span() {
    return Math.max(1, this.to - this.from);
  }
  percent(e) {
    return (e - this.from) / this.span * 100;
  }
  timeAt(e) {
    const s = e.currentTarget.getBoundingClientRect(), i = Math.min(1, Math.max(0, (e.clientX - s.left) / s.width));
    return this.from + i * this.span;
  }
  onMove(e) {
    const t = this.timeAt(e), s = this.segments.find(
      (i) => t >= i.start && t < i.start + i.duration
    );
    this.hover = { x: this.percent(t), time: t, segment: s };
  }
  onClick(e) {
    const t = this.timeAt(e);
    this.dispatchEvent(
      new CustomEvent("seek", { detail: { time: t }, bubbles: !0, composed: !0 })
    );
  }
  formatTime(e) {
    return new Date(e * 1e3).toLocaleTimeString(void 0, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }
  renderHours() {
    const e = [], s = Math.ceil(this.from / 3600) * 3600;
    for (let i = s; i <= this.to; i += 3600) e.push(i);
    return e.length > 24 ? l : o`
      ${e.map(
      (i) => o`<div class="tick" style="left:${this.percent(i)}%"></div>`
    )}
      <div class="hours">
        ${e.map(
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
    return this.to <= this.from ? l : o`
      <div class="wrap">
        ${this.hover && this.hover.segment?.thumbnail ? o`<div class="preview" style="left:${this.hover.x}%">
              <img
                alt=""
                src="${this.thumbnailUrlBase}/${this.hover.segment.path}"
              />
              <div class="time">${this.formatTime(this.hover.time)}</div>
            </div>` : this.hover ? o`<div class="preview" style="left:${this.hover.x}%">
                <div class="time">${this.formatTime(this.hover.time)}</div>
              </div>` : l}

        <div
          class="bar"
          @mousemove=${this.onMove}
          @mouseleave=${() => this.hover = void 0}
          @click=${this.onClick}
        >
          ${this.blocks.map(
      (e) => o`<div
              class="block"
              title="${this.formatTime(e.start)} bis ${this.formatTime(e.end)}"
              style="left:${this.percent(e.start)}%;width:${this.percent(e.end) - this.percent(e.start)}%"
            ></div>`
    )}
          ${this.position >= this.from && this.position <= this.to ? o`<div class="playhead" style="left:${this.percent(this.position)}%"></div>` : l}
          ${this.renderHours()}
        </div>
        ${this.blocks.length === 0 ? o`<div class="empty">An diesem Tag wurde nichts aufgezeichnet.</div>` : l}
      </div>
    `;
  }
};
x.styles = H`
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
j([
  u({ type: Number })
], x.prototype, "from", 2);
j([
  u({ type: Number })
], x.prototype, "to", 2);
j([
  u({ attribute: !1 })
], x.prototype, "blocks", 2);
j([
  u({ attribute: !1 })
], x.prototype, "segments", 2);
j([
  u({ type: Number })
], x.prototype, "position", 2);
j([
  u()
], x.prototype, "thumbnailUrlBase", 2);
j([
  h()
], x.prototype, "hover", 2);
x = j([
  S("kustos-vision-timeline")
], x);
var _e = Object.defineProperty, ke = Object.getOwnPropertyDescriptor, k = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ke(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && _e(t, s, r), r;
};
let $ = class extends w {
  constructor() {
    super(...arguments), this.cameras = [], this.camera = "", this.stream = "", this.day = "", this.days = [], this.blocks = [], this.segments = [], this.position = 0, this.seekTo = 0, this.busy = !1, this.error = "";
  }
  updated(e) {
    e.has("cameras") && !this.camera && this.cameras.length > 0 && this.selectCamera(this.cameras[0].slug);
  }
  get bounds() {
    if (!this.day) return [0, 0];
    const e = /* @__PURE__ */ new Date(`${this.day}T00:00:00`), t = new Date(e);
    return t.setDate(t.getDate() + 1), [e.getTime() / 1e3, t.getTime() / 1e3];
  }
  async selectCamera(e) {
    this.camera = e, this.stream = "", this.error = "", this.busy = !0;
    try {
      const { days: t } = await this.api.recordingDays(e);
      this.days = t, this.day = t[t.length - 1] ?? "", await this.loadDay();
    } catch (t) {
      this.error = t instanceof Error ? t.message : String(t);
    } finally {
      this.busy = !1;
    }
  }
  async loadDay() {
    if (!this.camera || !this.day) {
      this.blocks = [], this.segments = [];
      return;
    }
    const [e, t] = this.bounds;
    this.busy = !0, this.error = "";
    try {
      const s = await this.api.timeline(
        this.camera,
        e,
        t,
        this.stream || void 0
      );
      this.blocks = s.blocks, this.segments = s.segments, this.position = s.segments[0]?.start ?? e, this.seekTo = this.position;
    } catch (s) {
      this.error = s instanceof Error ? s.message : String(s);
    } finally {
      this.busy = !1;
    }
  }
  get streamKeys() {
    const e = this.cameras.find((t) => t.slug === this.camera);
    return e ? e.streams.map((t) => t.key) : [];
  }
  exportUrl() {
    const [e, t] = this.bounds, s = new URLSearchParams({
      camera: this.camera,
      from: String(e),
      to: String(t)
    });
    return this.stream && s.set("stream", this.stream), `/api/kustos_vision/export?${s.toString()}`;
  }
  render() {
    if (this.cameras.length === 0)
      return o`<div style="padding:32px" class="muted">
        Noch keine Kamera eingerichtet.
      </div>`;
    const e = this.streamKeys;
    return o`
      <div style="padding:16px">
        <div class="card">
          <div class="row">
            <div class="grow">
              <label>Kamera</label>
              <select
                @change=${(t) => this.selectCamera(t.target.value)}
              >
                ${this.cameras.map(
      (t) => o`<option value=${t.slug} ?selected=${t.slug === this.camera}>
                    ${t.name}
                  </option>`
    )}
              </select>
            </div>
            <div class="grow">
              <label>Tag</label>
              <select
                @change=${(t) => {
      this.day = t.target.value, this.loadDay();
    }}
              >
                ${this.days.length === 0 ? o`<option>keine Aufnahmen</option>` : this.days.map(
      (t) => o`<option value=${t} ?selected=${t === this.day}>
                        ${t}
                      </option>`
    )}
              </select>
            </div>
            ${e.length > 1 ? o`<div class="grow">
                  <label>Stream</label>
                  <select
                    @change=${(t) => {
      this.stream = t.target.value, this.loadDay();
    }}
                  >
                    <option value="">alle</option>
                    ${e.map(
      (t) => o`<option value=${t} ?selected=${t === this.stream}>
                        ${t}
                      </option>`
    )}
                  </select>
                </div>` : l}
          </div>
          ${this.error ? o`<p class="error">${this.error}</p>` : l}
        </div>

        <kustos-vision-player
          .segments=${this.segments}
          .seekTo=${this.seekTo}
        ></kustos-vision-player>

        <div style="margin-top:12px">
          <kustos-vision-timeline
            .from=${this.bounds[0]}
            .to=${this.bounds[1]}
            .blocks=${this.blocks}
            .segments=${this.segments}
            .position=${this.position}
            @seek=${(t) => {
      this.position = t.detail.time, this.seekTo = t.detail.time;
    }}
          ></kustos-vision-timeline>
        </div>

        ${this.segments.length > 0 ? o`<div class="row" style="margin-top:16px">
              <a href=${this.exportUrl()} download>
                <button class="secondary" ?disabled=${this.busy}>
                  Diesen Tag herunterladen
                </button>
              </a>
              <span class="muted">
                Die Segmente werden ohne Neukodierung zusammengefügt.
              </span>
            </div>` : l}
      </div>
    `;
  }
};
$.styles = Q;
k([
  u({ attribute: !1 })
], $.prototype, "api", 2);
k([
  u({ attribute: !1 })
], $.prototype, "cameras", 2);
k([
  h()
], $.prototype, "camera", 2);
k([
  h()
], $.prototype, "stream", 2);
k([
  h()
], $.prototype, "day", 2);
k([
  h()
], $.prototype, "days", 2);
k([
  h()
], $.prototype, "blocks", 2);
k([
  h()
], $.prototype, "segments", 2);
k([
  h()
], $.prototype, "position", 2);
k([
  h()
], $.prototype, "seekTo", 2);
k([
  h()
], $.prototype, "busy", 2);
k([
  h()
], $.prototype, "error", 2);
$ = k([
  S("kustos-vision-recordings")
], $);
var Ae = Object.defineProperty, xe = Object.getOwnPropertyDescriptor, _ = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? xe(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && Ae(t, s, r), r;
};
function Se(e) {
  const t = e.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z0-9]/.test(t) ? t : `kamera_${t}`;
}
let y = class extends w {
  constructor() {
    super(...arguments), this.capabilityKeys = [], this.available = [], this.slug = "", this.name = "", this.streams = [], this.capabilities = {}, this.retentionDays = null, this.enabled = !0, this.candidates = [], this.busy = !1, this.error = "";
  }
  connectedCallback() {
    super.connectedCallback(), this.camera && (this.slug = this.camera.slug, this.name = this.camera.name, this.streams = this.camera.streams.map((e) => ({ ...e })), this.capabilities = structuredClone(this.camera.capabilities), this.retentionDays = this.camera.retention_days, this.enabled = this.camera.enabled);
  }
  async pick(e) {
    if (e) {
      this.busy = !0, this.error = "";
      try {
        const t = await this.api.suggest(e);
        this.name = t.name, this.slug = Se(t.name), this.streams = t.streams.map((s) => ({
          key: s.key,
          entity_id: s.entity_id,
          // Only one stream is recorded by default. Recording every stream of
          // every camera on the first save would be a surprising amount of disk.
          record: s.key === "sd" || t.streams.length === 1,
          audio: "transcode"
        })), this.capabilities = Object.fromEntries(
          Object.entries(t.capabilities).map(([s, i]) => [
            s,
            { entity_id: i }
          ])
        ), this.candidates = t.candidates;
      } catch (t) {
        this.error = t instanceof Error ? t.message : String(t);
      } finally {
        this.busy = !1;
      }
    }
  }
  updateStream(e, t) {
    this.streams = this.streams.map(
      (s, i) => i === e ? { ...s, ...t } : s
    );
  }
  setCapability(e, t) {
    const s = { ...this.capabilities };
    t ? s[e] = { entity_id: t } : delete s[e], this.capabilities = s;
  }
  async save() {
    this.busy = !0, this.error = "";
    try {
      await this.api.setCamera({
        slug: this.slug,
        name: this.name,
        streams: this.streams,
        capabilities: this.capabilities,
        retention_days: this.retentionDays,
        enabled: this.enabled,
        area_id: this.camera?.area_id ?? null
      }), this.dispatchEvent(new CustomEvent("saved", { bubbles: !0, composed: !0 }));
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = !1;
    }
  }
  renderPicker() {
    return this.camera ? l : o`
      <label>Kamera in Home Assistant</label>
      <select
        @change=${(e) => this.pick(e.target.value)}
      >
        <option value="">Bitte wählen …</option>
        ${this.available.map(
      (e) => o`<option value=${e.entity_id}>
            ${e.name ?? e.entity_id}${e.available ? "" : " (nicht verfügbar)"}
          </option>`
    )}
      </select>
      <p class="hint">
        kustos_vision schlägt danach Streams und Bedienelemente vor, die zum selben
        Gerät gehören. Alles davon lässt sich ändern.
      </p>
    `;
  }
  render() {
    const e = this.candidates.length ? this.candidates : Object.values(this.capabilities).filter((t) => t.entity_id).map((t) => ({ entity_id: t.entity_id, name: t.entity_id }));
    return o`
      <div class="card">
        <h2>${this.camera ? `${this.camera.name} bearbeiten` : "Kamera hinzufügen"}</h2>
        ${this.renderPicker()}

        <div class="row">
          <div class="grow">
            <label>Name</label>
            <input
              .value=${this.name}
              @input=${(t) => this.name = t.target.value}
            />
          </div>
          <div class="grow">
            <label>Kennung (wird zum Ordnernamen)</label>
            <input
              .value=${this.slug}
              ?disabled=${this.camera !== void 0}
              @input=${(t) => this.slug = t.target.value}
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
      (t, s) => o`
                  <tr>
                    <td>
                      <input
                        .value=${t.key}
                        @input=${(i) => this.updateStream(s, {
        key: i.target.value
      })}
                      />
                    </td>
                    <td class="muted">${t.entity_id}</td>
                    <td>
                      <input
                        type="checkbox"
                        .checked=${t.record}
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
                        <option value="transcode" ?selected=${t.audio === "transcode"}>
                          umwandeln
                        </option>
                        <option value="copy" ?selected=${t.audio === "copy"}>
                          kopieren
                        </option>
                        <option value="none" ?selected=${t.audio === "none"}>
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
              @input=${(t) => {
      const s = t.target.value;
      this.retentionDays = s === "" ? null : Number(s);
    }}
            />
          </div>
          <div>
            <label>Aktiv</label>
            <input
              type="checkbox"
              .checked=${this.enabled}
              @change=${(t) => this.enabled = t.target.checked}
            />
          </div>
        </div>

        <h3>Bedienelemente</h3>
        <p class="hint">
          Was hier zugeordnet ist, erscheint als Schaltfläche auf der Kachel.
          Leer lassen heißt: keine Schaltfläche.
        </p>
        <table>
          ${this.capabilityKeys.map(
      (t) => o`
              <tr>
                <th>${t}</th>
                <td>
                  <select @change=${(s) => this.setCapability(t, s.target.value)}>
                    <option value="">nicht zugeordnet</option>
                    ${e.map(
        (s) => o`<option
                        value=${s.entity_id}
                        ?selected=${this.capabilities[t]?.entity_id === s.entity_id}
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

        ${this.error ? o`<p class="error">${this.error}</p>` : l}

        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy || !this.slug || !this.name} @click=${this.save}>
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
y.styles = Q;
_([
  u({ attribute: !1 })
], y.prototype, "api", 2);
_([
  u({ attribute: !1 })
], y.prototype, "camera", 2);
_([
  u({ attribute: !1 })
], y.prototype, "capabilityKeys", 2);
_([
  u({ attribute: !1 })
], y.prototype, "available", 2);
_([
  h()
], y.prototype, "slug", 2);
_([
  h()
], y.prototype, "name", 2);
_([
  h()
], y.prototype, "streams", 2);
_([
  h()
], y.prototype, "capabilities", 2);
_([
  h()
], y.prototype, "retentionDays", 2);
_([
  h()
], y.prototype, "enabled", 2);
_([
  h()
], y.prototype, "candidates", 2);
_([
  h()
], y.prototype, "busy", 2);
_([
  h()
], y.prototype, "error", 2);
y = _([
  S("kustos-vision-camera-editor")
], y);
var Ee = Object.defineProperty, Ce = Object.getOwnPropertyDescriptor, b = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Ce(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && Ee(t, s, r), r;
};
const Oe = [
  ["boolean", "Ja/Nein"],
  ["text", "Text"],
  ["number", "Anzahl"],
  ["select", "Auswahl"]
];
let v = class extends w {
  constructor() {
    super(...arguments), this.backend = { kind: "openai" }, this.observations = [], this.triggers = [], this.context = "", this.cooldown = 60, this.budget = 100, this.condition = "", this.enabled = !0, this.aiTasks = [], this.history = [], this.busy = !1, this.error = "";
  }
  async connectedCallback() {
    if (super.connectedCallback(), this.profile)
      this.backend = { ...this.profile.backend }, this.observations = this.profile.observations.map((e) => ({ ...e })), this.triggers = [...this.profile.triggers], this.context = this.profile.context, this.cooldown = this.profile.cooldown_seconds, this.budget = this.profile.daily_budget, this.condition = this.profile.condition_entity ?? "", this.enabled = this.profile.enabled, this.loadHistory();
    else {
      const e = this.camera.capabilities.motion_trigger?.entity_id;
      e && (this.triggers = [e]);
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
  patchObservation(e, t) {
    this.observations = this.observations.map(
      (s, i) => i === e ? { ...s, ...t } : s
    );
  }
  addObservation() {
    let e = this.observations.length + 1;
    const t = new Set(this.observations.map((s) => s.key));
    for (; t.has(`frage_${e}`); ) e += 1;
    this.observations = [
      ...this.observations,
      { key: `frage_${e}`, type: "boolean", question: "" }
    ];
  }
  async save() {
    this.busy = !0, this.error = "";
    try {
      await this.api.setVision({
        camera_slug: this.camera.slug,
        backend: this.backend,
        observations: this.observations,
        triggers: this.triggers.filter((e) => e),
        context: this.context,
        cooldown_seconds: this.cooldown,
        daily_budget: this.budget,
        condition_entity: this.condition || null,
        enabled: this.enabled
      }), this.dispatchEvent(new CustomEvent("saved", { bubbles: !0, composed: !0 }));
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = !1;
    }
  }
  async analyseNow() {
    this.busy = !0, this.error = "", this.lastRun = void 0;
    try {
      const e = await this.api.analyseNow(this.camera.slug);
      e.ran ? (this.lastRun = { values: e.values, raw: e.raw }, Object.keys(e.problems).length > 0 && (this.error = `Nicht verwertbar: ${Object.entries(e.problems).map(([t, s]) => `${t} (${s})`).join(", ")}`)) : this.error = "Das Tagesbudget ist aufgebraucht oder es läuft bereits eine Analyse.", await this.loadHistory();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = !1;
    }
  }
  renderBackend() {
    const e = this.backend.kind === "ai_task";
    return o`
      <h3>Modell</h3>
      <label>Anbindung</label>
      <select
        @change=${(t) => {
      const s = t.target.value;
      this.backend = { ...this.backend, kind: s };
    }}
      >
        <option value="openai" ?selected=${!e}>
          OpenAI-kompatibler Endpunkt
        </option>
        <option value="ai_task" ?selected=${e}>Home Assistant AI Task</option>
      </select>

      ${e ? o`
            <label>AI-Task-Entity</label>
            <select
              @change=${(t) => this.backend = {
      ...this.backend,
      entity_id: t.target.value
    }}
            >
              <option value="">Bitte wählen …</option>
              ${this.aiTasks.map(
      (t) => o`<option
                  value=${t.entity_id}
                  ?selected=${this.backend.entity_id === t.entity_id}
                >
                  ${t.name}${t.available ? "" : " (nicht verfügbar)"}
                </option>`
    )}
            </select>
            ${this.aiTasks.length === 0 ? o`<p class="hint">
                  Keine AI-Task-Entity gefunden, die Bilder annimmt. Dafür muss ein
                  passender Anbieter in Home Assistant eingerichtet sein.
                </p>` : l}
          ` : o`
            <div class="row">
              <div class="grow">
                <label>Adresse</label>
                <input
                  placeholder="http://192.168.1.10:8080/v1"
                  .value=${this.backend.url ?? ""}
                  @change=${(t) => this.backend = {
      ...this.backend,
      url: t.target.value
    }}
                />
              </div>
              <div class="grow">
                <label>Modell</label>
                <input
                  .value=${this.backend.model ?? ""}
                  @change=${(t) => this.backend = {
      ...this.backend,
      model: t.target.value
    }}
                />
              </div>
            </div>
            <label>Schlüssel (bei lokalen Modellen meist leer)</label>
            <input
              type="password"
              .value=${this.backend.api_key ?? ""}
              @change=${(t) => this.backend = {
      ...this.backend,
      api_key: t.target.value || void 0
    }}
            />
            <p class="hint">
              Das Modell muss Bilder verarbeiten können. Bei llama.cpp heißt das:
              mit einer mmproj-Datei geladen.
            </p>
          `}
    `;
  }
  renderObservation(e, t) {
    return o`
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
        <div class="row">
          <div class="grow">
            <label>Frage an das Modell</label>
            <input
              placeholder="Liegt ein Paket vor der Haustür?"
              .value=${e.question}
              @change=${(s) => this.patchObservation(t, {
      question: s.target.value
    })}
            />
          </div>
          <div>
            <label>Antworttyp</label>
            <select
              @change=${(s) => this.patchObservation(t, {
      type: s.target.value
    })}
            >
              ${Oe.map(
      ([s, i]) => o`<option
                  value=${s}
                  ?selected=${e.type === s}
                >
                  ${i}
                </option>`
    )}
            </select>
          </div>
          <div>
            <label>Kennung</label>
            <input
              .value=${e.key}
              @change=${(s) => this.patchObservation(t, {
      key: s.target.value
    })}
            />
          </div>
        </div>

        ${e.type === "select" ? o`<label>Mögliche Antworten, durch Komma getrennt</label>
              <input
                .value=${(e.options ?? []).join(", ")}
                @change=${(s) => this.patchObservation(t, {
      options: s.target.value.split(",").map((i) => i.trim()).filter((i) => i)
    })}
              />` : l}
        ${e.type === "number" ? o`<div class="row">
              <div class="grow">
                <label>Kleinster Wert</label>
                <input
                  type="number"
                  .value=${String(e.minimum ?? 0)}
                  @change=${(s) => this.patchObservation(t, {
      minimum: Number(s.target.value)
    })}
                />
              </div>
              <div class="grow">
                <label>Größter Wert</label>
                <input
                  type="number"
                  .value=${String(e.maximum ?? 100)}
                  @change=${(s) => this.patchObservation(t, {
      maximum: Number(s.target.value)
    })}
                />
              </div>
            </div>` : l}

        <div class="row" style="margin-top:8px">
          ${this.lastRun && e.key in this.lastRun.values ? o`<span class="muted">
                Letzte Antwort: <strong>${String(this.lastRun.values[e.key])}</strong>
              </span>` : l}
          <span class="grow"></span>
          <button
            class="danger"
            @click=${() => this.observations = this.observations.filter((s, i) => i !== t)}
          >
            Frage entfernen
          </button>
        </div>
      </div>
    `;
  }
  renderHistory() {
    return this.history.length === 0 ? l : o`
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
      (e) => o`
            <tr>
              <td class="muted">${new Date(e.at).toLocaleString()}</td>
              <td class="muted">${e.trigger}</td>
              <td class=${e.error ? "error" : ""}>
                ${e.error ?? Object.entries(e.values).map(([t, s]) => `${t}: ${s}`).join(", ")}
              </td>
              <td class="muted">${e.duration === null ? "-" : `${e.duration} s`}</td>
            </tr>
          `
    )}
      </table>
    `;
  }
  render() {
    const e = this.profile?.state;
    return o`
      <div class="card">
        <h2>Bilderkennung für ${this.camera.name}</h2>
        <p class="hint">
          Ein Standbild wird an das gewählte Modell geschickt, sobald ein
          Auslöser meldet. Aus jeder Frage wird ein Sensor.
        </p>

        ${this.renderBackend()}

        <h3>Fragen</h3>
        ${this.observations.length === 0 ? o`<p class="hint">Noch keine Frage angelegt.</p>` : this.observations.map((t, s) => this.renderObservation(t, s))}
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
          @change=${(t) => this.triggers = t.target.value.split(",").map((s) => s.trim()).filter((s) => s)}
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
          @change=${(t) => this.context = t.target.value}
        />

        <h3>Grenzen</h3>
        <div class="row">
          <div class="grow">
            <label>Mindestabstand in Sekunden</label>
            <input
              type="number"
              min="0"
              .value=${String(this.cooldown)}
              @change=${(t) => this.cooldown = Number(t.target.value)}
            />
          </div>
          <div class="grow">
            <label>Höchstens Analysen pro Tag</label>
            <input
              type="number"
              min="1"
              .value=${String(this.budget)}
              @change=${(t) => this.budget = Number(t.target.value)}
            />
          </div>
          <div class="grow">
            <label>Nur wenn diese Entity an ist (optional)</label>
            <input
              placeholder="alarm_control_panel.zuhause"
              .value=${this.condition}
              @change=${(t) => this.condition = t.target.value}
            />
          </div>
        </div>
        ${e ? o`<p class="hint">
              Heute ${e.analyses_today} von ${this.budget} Analysen genutzt.
            </p>` : l}

        <div class="row" style="margin-top:8px">
          <label style="margin:0">
            <input
              type="checkbox"
              .checked=${this.enabled}
              @change=${(t) => this.enabled = t.target.checked}
            />
            Aktiv
          </label>
        </div>

        ${this.error ? o`<p class="error">${this.error}</p>` : l}
        ${this.lastRun?.raw ? o`<h3>Rohantwort</h3>
              <pre class="muted" style="overflow:auto;font-size:0.8em">
${JSON.stringify(this.lastRun.raw, null, 2)}</pre
              >` : l}
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
              </button>` : l}
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
              </button>` : l}
        </div>
      </div>
    `;
  }
};
v.styles = Q;
b([
  u({ attribute: !1 })
], v.prototype, "api", 2);
b([
  u({ attribute: !1 })
], v.prototype, "camera", 2);
b([
  u({ attribute: !1 })
], v.prototype, "profile", 2);
b([
  h()
], v.prototype, "backend", 2);
b([
  h()
], v.prototype, "observations", 2);
b([
  h()
], v.prototype, "triggers", 2);
b([
  h()
], v.prototype, "context", 2);
b([
  h()
], v.prototype, "cooldown", 2);
b([
  h()
], v.prototype, "budget", 2);
b([
  h()
], v.prototype, "condition", 2);
b([
  h()
], v.prototype, "enabled", 2);
b([
  h()
], v.prototype, "aiTasks", 2);
b([
  h()
], v.prototype, "history", 2);
b([
  h()
], v.prototype, "lastRun", 2);
b([
  h()
], v.prototype, "busy", 2);
b([
  h()
], v.prototype, "error", 2);
v = b([
  S("kustos-vision-vision-editor")
], v);
var Pe = Object.defineProperty, Te = Object.getOwnPropertyDescriptor, E = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Te(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && Pe(t, s, r), r;
};
const ze = [
  ["cameras", "Kameras"],
  ["vision", "Bilderkennung"],
  ["storage", "Speicher"],
  ["views", "Ansichten"],
  ["system", "System"]
], Pt = 1e3 * 1e3 * 1e3;
let A = class extends w {
  constructor() {
    super(...arguments), this.section = "cameras", this.adding = !1, this.available = [], this.busy = !1, this.error = "";
  }
  async refresh() {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: !0, composed: !0 }));
  }
  async run(e) {
    this.busy = !0, this.error = "";
    try {
      await e(), await this.refresh();
    } catch (t) {
      this.error = t instanceof Error ? t.message : String(t);
    } finally {
      this.busy = !1;
    }
  }
  async startAdding() {
    this.error = "";
    try {
      this.available = (await this.api.availableCameras()).cameras, this.adding = !0;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
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
              ${this.snapshot.cameras.map((e) => this.renderCameraRow(e))}
            </table>`}
        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy} @click=${this.startAdding}>
            Kamera hinzufügen
          </button>
        </div>
      </div>
    `;
  }
  renderCameraRow(e) {
    const t = e.streams.filter((i) => i.record).length, s = e.state.streams.filter((i) => !i.running);
    return o`
      <tr>
        <td>${e.name}</td>
        <td class="muted">${t} von ${e.streams.length}</td>
        <td class="muted">
          ${e.retention_days === null ? "unbegrenzt" : `${e.retention_days} Tage`}
        </td>
        <td class="muted">${it(e.state.used_bytes)}</td>
        <td>
          ${e.enabled ? e.state.recording ? o`<span>zeichnet auf</span>` : o`<span class="error"
                  >steht${s[0]?.last_error ? o` (${s[0].last_error})` : l}</span
                >` : o`<span class="muted">deaktiviert</span>`}
        </td>
        <td>
          <div class="row">
            <button
              class="secondary"
              @click=${async () => {
      this.available = (await this.api.availableCameras()).cameras, this.editing = e;
    }}
            >
              Bearbeiten
            </button>
            <button
              class="danger"
              ?disabled=${this.busy}
              @click=${() => this.confirmDelete(e)}
            >
              Entfernen
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  confirmDelete(e) {
    confirm(
      `${e.name} entfernen? Die bereits vorhandenen Aufnahmen bleiben erhalten.`
    ) && this.run(() => this.api.deleteCamera(e.slug));
  }
  // ------------------------------------------------------------------
  // Vision
  // ------------------------------------------------------------------
  renderVision() {
    return this.visionFor ? o`<kustos-vision-vision-editor
        .api=${this.api}
        .camera=${this.visionFor}
        .profile=${this.snapshot.vision.find(
      (e) => e.camera_slug === this.visionFor.slug
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
              ${this.snapshot.cameras.map((e) => this.renderVisionRow(e))}
            </table>`}
      </div>
    `;
  }
  renderVisionRow(e) {
    const t = this.snapshot.vision.find((s) => s.camera_slug === e.slug);
    return o`
      <tr>
        <td>${e.name}</td>
        <td class="muted">${t ? t.observations.length : "-"}</td>
        <td class="muted">
          ${t ? `${t.state.analyses_today} / ${t.daily_budget}` : "-"}
        </td>
        <td>
          ${t ? t.state.last_error ? o`<span class="error">${t.state.last_error}</span>` : t.enabled ? t.state.last_run ? o`<span class="muted"
                      >zuletzt ${new Date(t.state.last_run).toLocaleString()}</span
                    >` : o`<span class="muted">noch keine Analyse</span>` : o`<span class="muted">aus</span>` : o`<span class="muted">nicht eingerichtet</span>`}
        </td>
        <td>
          <button class="secondary" @click=${() => this.visionFor = e}>
            ${t ? "Bearbeiten" : "Einrichten"}
          </button>
        </td>
      </tr>
    `;
  }
  // ------------------------------------------------------------------
  // Storage
  // ------------------------------------------------------------------
  renderStorage() {
    const { storage: e, totals: t } = this.snapshot, s = e.max_total_bytes === null ? "" : String(e.max_total_bytes / Pt);
    return o`
      <div class="card">
        <h2>Speicher</h2>
        <table>
          <tr>
            <th>Ort</th>
            <td class="muted">${e.base_path}</td>
          </tr>
          <tr>
            <th>Belegt</th>
            <td>${it(t.used_bytes)}</td>
          </tr>
          <tr>
            <th>Frei am Ort</th>
            <td>${it(t.free_bytes)}</td>
          </tr>
        </table>
        <p class="hint">
          Der Ort wird beim Einrichten festgelegt und lässt sich hier nicht
          ändern: ein Wechsel würde die vorhandenen Aufnahmen zurücklassen.
        </p>

        ${t.over_budget_bytes > 0 ? o`<p class="error">
              ${it(t.over_budget_bytes)} über dem Budget, und mehr
              lässt sich nicht löschen. Das Budget ist kleiner als das, was die
              Kameras zwischen zwei Aufräumläufen schreiben.
            </p>` : l}

        <h3>Grenzen</h3>
        <div class="row">
          <div class="grow">
            <label>Segmentlänge in Sekunden</label>
            <input
              id="segment"
              type="number"
              min="1"
              .value=${String(e.segment_seconds)}
            />
          </div>
          <div class="grow">
            <label>Gesamtbudget in GB (leer = unbegrenzt)</label>
            <input id="budget" type="number" min="0" step="0.1" .value=${s} />
          </div>
        </div>
        <p class="hint">
          Kürzere Segmente lassen die Aufbewahrung feiner arbeiten, erzeugen aber
          mehr Dateien. Das Budget gilt über alle Kameras zusammen; ist es
          überschritten, fällt jeweils die global älteste Aufnahme.
        </p>
        <button ?disabled=${this.busy} @click=${this.saveStorage}>Speichern</button>
      </div>
    `;
  }
  saveStorage() {
    const e = this.renderRoot, t = Number(
      e.querySelector("#segment").value
    ), s = e.querySelector("#budget").value;
    this.run(
      () => this.api.setStorage({
        segment_seconds: t,
        max_total_bytes: s === "" ? null : Math.round(Number(s) * Pt)
      })
    );
  }
  // ------------------------------------------------------------------
  // Views
  // ------------------------------------------------------------------
  renderViews() {
    const e = this.snapshot.views;
    return o`
      <div class="card">
        <h2>Ansichten</h2>
        <p class="hint">
          Jede Ansicht wird zu einem eigenen Reiter mit den Kameras, die ihr
          zugeordnet sind.
        </p>
        ${e.length === 0 ? o`<p class="hint">Noch keine Ansicht angelegt.</p>` : e.map((t, s) => this.renderViewRow(t, s))}
        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy} @click=${this.addView}>
            Ansicht hinzufügen
          </button>
        </div>
      </div>
    `;
  }
  renderViewRow(e, t) {
    return o`
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
        <div class="row">
          <div class="grow">
            <label>Name</label>
            <input
              .value=${e.name}
              @change=${(s) => this.patchView(t, { name: s.target.value })}
            />
          </div>
          <div class="grow">
            <label>Spalten (0 = automatisch)</label>
            <input
              type="number"
              min="0"
              .value=${String(e.columns)}
              @change=${(s) => this.patchView(t, {
      columns: Number(s.target.value)
    })}
            />
          </div>
        </div>
        <label>Kameras</label>
        <div class="row">
          ${this.snapshot.cameras.map(
      (s) => o`
              <label style="margin:0">
                <input
                  type="checkbox"
                  .checked=${e.cameras.includes(s.slug)}
                  @change=${(i) => this.toggleCamera(
        t,
        s.slug,
        i.target.checked
      )}
                />
                ${s.name}
              </label>
            `
    )}
        </div>
        <div class="row" style="margin-top:8px">
          <button
            class="secondary"
            ?disabled=${t === 0}
            @click=${() => this.moveView(t, -1)}
          >
            nach oben
          </button>
          <button
            class="secondary"
            ?disabled=${t === this.snapshot.views.length - 1}
            @click=${() => this.moveView(t, 1)}
          >
            nach unten
          </button>
          <button class="danger" @click=${() => this.removeView(t)}>
            Entfernen
          </button>
        </div>
      </div>
    `;
  }
  saveViews(e) {
    this.run(() => this.api.setViews(e));
  }
  patchView(e, t) {
    this.saveViews(
      this.snapshot.views.map((s, i) => i === e ? { ...s, ...t } : s)
    );
  }
  toggleCamera(e, t, s) {
    const i = this.snapshot.views[e], r = s ? [...i.cameras, t] : i.cameras.filter((a) => a !== t);
    this.patchView(e, { cameras: r });
  }
  moveView(e, t) {
    const s = [...this.snapshot.views], [i] = s.splice(e, 1);
    s.splice(e + t, 0, i), this.saveViews(s);
  }
  removeView(e) {
    this.saveViews(this.snapshot.views.filter((t, s) => s !== e));
  }
  addView() {
    const e = new Set(this.snapshot.views.map((s) => s.id));
    let t = this.snapshot.views.length + 1;
    for (; e.has(`ansicht_${t}`); ) t += 1;
    this.saveViews([
      ...this.snapshot.views,
      {
        id: `ansicht_${t}`,
        name: `Ansicht ${t}`,
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
    const { maintenance: e, cameras: t } = this.snapshot;
    return o`
      <div class="card">
        <h2>System</h2>
        <table>
          <tr>
            <th>Letzter Aufräumlauf</th>
            <td class="muted">
              ${e.indexed} indiziert, ${e.thumbnails} Vorschaubilder,
              ${e.deleted} gelöscht
            </td>
          </tr>
          ${e.error ? o`<tr>
                <th>Fehler</th>
                <td class="error">${e.error}</td>
              </tr>` : l}
        </table>

        <h3>Streams</h3>
        ${t.length === 0 ? o`<p class="hint">Keine Kameras eingerichtet.</p>` : o`<table>
              <tr>
                <th>Stream</th>
                <th>Läuft</th>
                <th>Neustarts</th>
                <th>Zuletzt gemeldet</th>
              </tr>
              ${t.flatMap(
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
          ${ze.map(
      ([e, t]) => o`
              <button
                class=${this.section === e ? "" : "secondary"}
                @click=${() => {
        this.section = e, this.adding = !1, this.editing = void 0, this.visionFor = void 0;
      }}
              >
                ${t}
              </button>
            `
    )}
        </div>
        ${this.error ? o`<p class="error">${this.error}</p>` : l}
        ${this.section === "cameras" ? this.renderCameras() : this.section === "vision" ? this.renderVision() : this.section === "storage" ? this.renderStorage() : this.section === "views" ? this.renderViews() : this.renderSystem()}
      </div>
    `;
  }
};
A.styles = Q;
E([
  u({ attribute: !1 })
], A.prototype, "api", 2);
E([
  u({ attribute: !1 })
], A.prototype, "snapshot", 2);
E([
  h()
], A.prototype, "section", 2);
E([
  h()
], A.prototype, "editing", 2);
E([
  h()
], A.prototype, "adding", 2);
E([
  h()
], A.prototype, "available", 2);
E([
  h()
], A.prototype, "visionFor", 2);
E([
  h()
], A.prototype, "busy", 2);
E([
  h()
], A.prototype, "error", 2);
A = E([
  S("kustos-vision-settings")
], A);
var De = Object.defineProperty, je = Object.getOwnPropertyDescriptor, q = (e, t, s, i) => {
  for (var r = i > 1 ? void 0 : i ? je(t, s) : t, a = e.length - 1, n; a >= 0; a--)
    (n = e[a]) && (r = (i ? n(t, s, r) : n(r)) || r);
  return i && r && De(t, s, r), r;
};
const dt = "__recordings", rt = "__settings";
let D = class extends w {
  constructor() {
    super(...arguments), this.narrow = !1, this.active = "", this.error = "";
  }
  connectedCallback() {
    super.connectedCallback(), this.load();
  }
  updated(e) {
    e.has("hass") && this.hass && !this.api && (this.api = new Ot(this.hass), this.load());
  }
  async load() {
    if (this.hass) {
      this.api ??= new Ot(this.hass);
      try {
        this.snapshot = await this.api.getConfig(), this.error = "", this.active || (this.active = this.snapshot.views[0]?.id ?? rt);
      } catch (e) {
        const t = e instanceof Error ? e.message : String(e);
        this.error = t;
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
    const e = this.snapshot, t = e.views.find((s) => s.id === this.active);
    return o`
      <div class="tabs">
        ${e.views.map(
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
          class=${this.active === dt ? "active" : ""}
          @click=${() => this.active = dt}
        >
          Aufnahmen
        </button>
        <button
          class=${this.active === rt ? "active" : ""}
          @click=${() => this.active = rt}
        >
          Einstellungen
        </button>
      </div>

      <div class="body">
        ${this.active === dt ? o`<kustos-vision-recordings
              .api=${this.api}
              .cameras=${e.cameras}
            ></kustos-vision-recordings>` : this.active === rt ? o`<kustos-vision-settings
              .api=${this.api}
              .snapshot=${e}
              @changed=${() => this.load()}
            ></kustos-vision-settings>` : t ? o`<kustos-vision-live-view
                .hass=${this.hass}
                .api=${this.api}
                .view=${t}
                .cameras=${e.cameras}
              ></kustos-vision-live-view>` : o`<div class="notice">
                Noch keine Ansicht angelegt.<br />
                Unter Einstellungen, Ansichten lässt sich eine erstellen.
              </div>${l}`}
      </div>
    `;
  }
};
D.styles = [
  Q,
  H`
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
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
        overflow: auto;
      }
      .notice {
        padding: 32px 16px;
        text-align: center;
        line-height: 1.6;
        color: var(--secondary-text-color);
      }
    `
];
q([
  u({ attribute: !1 })
], D.prototype, "hass", 2);
q([
  u({ type: Boolean, reflect: !0 })
], D.prototype, "narrow", 2);
q([
  h()
], D.prototype, "snapshot", 2);
q([
  h()
], D.prototype, "active", 2);
q([
  h()
], D.prototype, "error", 2);
D = q([
  S("kustos-vision-panel")
], D);
export {
  D as CamwatchPanel
};
