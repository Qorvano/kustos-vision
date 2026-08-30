/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ae = globalThis, pe = ae.ShadowRoot && (ae.ShadyCSS === void 0 || ae.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, ue = Symbol(), ye = /* @__PURE__ */ new WeakMap();
let Te = class {
  constructor(e, s, i) {
    if (this._$cssResult$ = !0, i !== ue) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = s;
  }
  get styleSheet() {
    let e = this.o;
    const s = this.t;
    if (pe && e === void 0) {
      const i = s !== void 0 && s.length === 1;
      i && (e = ye.get(s)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && ye.set(s, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Re = (t) => new Te(typeof t == "string" ? t : t + "", void 0, ue), H = (t, ...e) => {
  const s = t.length === 1 ? t[0] : e.reduce((i, r, a) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + t[a + 1], t[0]);
  return new Te(s, t, ue);
}, Ue = (t, e) => {
  if (pe) t.adoptedStyleSheets = e.map((s) => s instanceof CSSStyleSheet ? s : s.styleSheet);
  else for (const s of e) {
    const i = document.createElement("style"), r = ae.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = s.cssText, t.appendChild(i);
  }
}, fe = pe ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let s = "";
  for (const i of e.cssRules) s += i.cssText;
  return Re(s);
})(t) : t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Ne, defineProperty: Be, getOwnPropertyDescriptor: He, getOwnPropertyNames: Ie, getOwnPropertySymbols: Ve, getPrototypeOf: Ke } = Object, le = globalThis, $e = le.trustedTypes, Le = $e ? $e.emptyScript : "", We = le.reactiveElementPolyfillSupport, G = (t, e) => t, ne = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? Le : null;
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
} }, me = (t, e) => !Ne(t, e), we = { attribute: !0, type: String, converter: ne, reflect: !1, useDefault: !1, hasChanged: me };
Symbol.metadata ??= Symbol("metadata"), le.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let I = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, s = we) {
    if (s.state && (s.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((s = Object.create(s)).wrapped = !0), this.elementProperties.set(e, s), !s.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(e, i, s);
      r !== void 0 && Be(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, s, i) {
    const { get: r, set: a } = He(this.prototype, e) ?? { get() {
      return this[s];
    }, set(n) {
      this[s] = n;
    } };
    return { get: r, set(n) {
      const d = r?.call(this);
      a?.call(this, n), this.requestUpdate(e, d, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? we;
  }
  static _$Ei() {
    if (this.hasOwnProperty(G("elementProperties"))) return;
    const e = Ke(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(G("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(G("properties"))) {
      const s = this.properties, i = [...Ie(s), ...Ve(s)];
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
      for (const r of i) s.unshift(fe(r));
    } else e !== void 0 && s.push(fe(e));
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
    return Ue(e, this.constructor.elementStyles), e;
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
      const a = (i.converter?.toAttribute !== void 0 ? i.converter : ne).toAttribute(s, i.type);
      this._$Em = e, a == null ? this.removeAttribute(r) : this.setAttribute(r, a), this._$Em = null;
    }
  }
  _$AK(e, s) {
    const i = this.constructor, r = i._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const a = i.getPropertyOptions(r), n = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : ne;
      this._$Em = r;
      const d = n.fromAttribute(s, a.type);
      this[r] = d ?? this._$Ej?.get(r) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, s, i, r = !1, a) {
    if (e !== void 0) {
      const n = this.constructor;
      if (r === !1 && (a = this[e]), i ??= n.getPropertyOptions(e), !((i.hasChanged ?? me)(a, s) || i.useDefault && i.reflect && a === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, i)))) return;
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
        const { wrapped: n } = a, d = this[r];
        n !== !0 || this._$AL.has(r) || d === void 0 || this.C(r, void 0, a, d);
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
I.elementStyles = [], I.shadowRootOptions = { mode: "open" }, I[G("elementProperties")] = /* @__PURE__ */ new Map(), I[G("finalized")] = /* @__PURE__ */ new Map(), We?.({ ReactiveElement: I }), (le.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ge = globalThis, _e = (t) => t, oe = ge.trustedTypes, xe = oe ? oe.createPolicy("lit-html", { createHTML: (t) => t }) : void 0, ze = "$lit$", P = `lit$${Math.random().toFixed(9).slice(2)}$`, De = "?" + P, qe = `<${De}>`, U = document, Z = () => U.createComment(""), J = (t) => t === null || typeof t != "object" && typeof t != "function", be = Array.isArray, Fe = (t) => be(t) || typeof t?.[Symbol.iterator] == "function", ce = `[ 	
\f\r]`, F = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ae = /-->/g, Se = />/g, M = RegExp(`>|${ce}(?:([^\\s"'>=/]+)(${ce}*=${ce}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), ke = /'/g, Ee = /"/g, je = /^(?:script|style|textarea|title)$/i, Ge = (t) => (e, ...s) => ({ _$litType$: t, strings: e, values: s }), o = Ge(1), V = Symbol.for("lit-noChange"), l = Symbol.for("lit-nothing"), Ce = /* @__PURE__ */ new WeakMap(), R = U.createTreeWalker(U, 129);
function Me(t, e) {
  if (!be(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return xe !== void 0 ? xe.createHTML(e) : e;
}
const Ze = (t, e) => {
  const s = t.length - 1, i = [];
  let r, a = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = F;
  for (let d = 0; d < s; d++) {
    const c = t[d];
    let g, u, m = -1, C = 0;
    for (; C < c.length && (n.lastIndex = C, u = n.exec(c), u !== null); ) C = n.lastIndex, n === F ? u[1] === "!--" ? n = Ae : u[1] !== void 0 ? n = Se : u[2] !== void 0 ? (je.test(u[2]) && (r = RegExp("</" + u[2], "g")), n = M) : u[3] !== void 0 && (n = M) : n === M ? u[0] === ">" ? (n = r ?? F, m = -1) : u[1] === void 0 ? m = -2 : (m = n.lastIndex - u[2].length, g = u[1], n = u[3] === void 0 ? M : u[3] === '"' ? Ee : ke) : n === Ee || n === ke ? n = M : n === Ae || n === Se ? n = F : (n = M, r = void 0);
    const O = n === M && t[d + 1].startsWith("/>") ? " " : "";
    a += n === F ? c + qe : m >= 0 ? (i.push(g), c.slice(0, m) + ze + c.slice(m) + P + O) : c + P + (m === -2 ? d : O);
  }
  return [Me(t, a + (t[s] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class X {
  constructor({ strings: e, _$litType$: s }, i) {
    let r;
    this.parts = [];
    let a = 0, n = 0;
    const d = e.length - 1, c = this.parts, [g, u] = Ze(e, s);
    if (this.el = X.createElement(g, i), R.currentNode = this.el.content, s === 2 || s === 3) {
      const m = this.el.content.firstChild;
      m.replaceWith(...m.childNodes);
    }
    for (; (r = R.nextNode()) !== null && c.length < d; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const m of r.getAttributeNames()) if (m.endsWith(ze)) {
          const C = u[n++], O = r.getAttribute(m).split(P), se = /([.?@])?(.*)/.exec(C);
          c.push({ type: 1, index: a, name: se[2], strings: O, ctor: se[1] === "." ? Xe : se[1] === "?" ? Ye : se[1] === "@" ? Qe : he }), r.removeAttribute(m);
        } else m.startsWith(P) && (c.push({ type: 6, index: a }), r.removeAttribute(m));
        if (je.test(r.tagName)) {
          const m = r.textContent.split(P), C = m.length - 1;
          if (C > 0) {
            r.textContent = oe ? oe.emptyScript : "";
            for (let O = 0; O < C; O++) r.append(m[O], Z()), R.nextNode(), c.push({ type: 2, index: ++a });
            r.append(m[C], Z());
          }
        }
      } else if (r.nodeType === 8) if (r.data === De) c.push({ type: 2, index: a });
      else {
        let m = -1;
        for (; (m = r.data.indexOf(P, m + 1)) !== -1; ) c.push({ type: 7, index: a }), m += P.length - 1;
      }
      a++;
    }
  }
  static createElement(e, s) {
    const i = U.createElement("template");
    return i.innerHTML = e, i;
  }
}
function K(t, e, s = t, i) {
  if (e === V) return e;
  let r = i !== void 0 ? s._$Co?.[i] : s._$Cl;
  const a = J(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== a && (r?._$AO?.(!1), a === void 0 ? r = void 0 : (r = new a(t), r._$AT(t, s, i)), i !== void 0 ? (s._$Co ??= [])[i] = r : s._$Cl = r), r !== void 0 && (e = K(t, r._$AS(t, e.values), r, i)), e;
}
class Je {
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
    const { el: { content: s }, parts: i } = this._$AD, r = (e?.creationScope ?? U).importNode(s, !0);
    R.currentNode = r;
    let a = R.nextNode(), n = 0, d = 0, c = i[0];
    for (; c !== void 0; ) {
      if (n === c.index) {
        let g;
        c.type === 2 ? g = new Y(a, a.nextSibling, this, e) : c.type === 1 ? g = new c.ctor(a, c.name, c.strings, this, e) : c.type === 6 && (g = new et(a, this, e)), this._$AV.push(g), c = i[++d];
      }
      n !== c?.index && (a = R.nextNode(), n++);
    }
    return R.currentNode = U, r;
  }
  p(e) {
    let s = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, s), s += i.strings.length - 2) : i._$AI(e[s])), s++;
  }
}
class Y {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, s, i, r) {
    this.type = 2, this._$AH = l, this._$AN = void 0, this._$AA = e, this._$AB = s, this._$AM = i, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
    e = K(this, e, s), J(e) ? e === l || e == null || e === "" ? (this._$AH !== l && this._$AR(), this._$AH = l) : e !== this._$AH && e !== V && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Fe(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== l && J(this._$AH) ? this._$AA.nextSibling.data = e : this.T(U.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: s, _$litType$: i } = e, r = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = X.createElement(Me(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === r) this._$AH.p(s);
    else {
      const a = new Je(r, this), n = a.u(this.options);
      a.p(s), this.T(n), this._$AH = a;
    }
  }
  _$AC(e) {
    let s = Ce.get(e.strings);
    return s === void 0 && Ce.set(e.strings, s = new X(e)), s;
  }
  k(e) {
    be(this._$AH) || (this._$AH = [], this._$AR());
    const s = this._$AH;
    let i, r = 0;
    for (const a of e) r === s.length ? s.push(i = new Y(this.O(Z()), this.O(Z()), this, this.options)) : i = s[r], i._$AI(a), r++;
    r < s.length && (this._$AR(i && i._$AB.nextSibling, r), s.length = r);
  }
  _$AR(e = this._$AA.nextSibling, s) {
    for (this._$AP?.(!1, !0, s); e !== this._$AB; ) {
      const i = _e(e).nextSibling;
      _e(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class he {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, s, i, r, a) {
    this.type = 1, this._$AH = l, this._$AN = void 0, this.element = e, this.name = s, this._$AM = r, this.options = a, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = l;
  }
  _$AI(e, s = this, i, r) {
    const a = this.strings;
    let n = !1;
    if (a === void 0) e = K(this, e, s, 0), n = !J(e) || e !== this._$AH && e !== V, n && (this._$AH = e);
    else {
      const d = e;
      let c, g;
      for (e = a[0], c = 0; c < a.length - 1; c++) g = K(this, d[i + c], s, c), g === V && (g = this._$AH[c]), n ||= !J(g) || g !== this._$AH[c], g === l ? e = l : e !== l && (e += (g ?? "") + a[c + 1]), this._$AH[c] = g;
    }
    n && !r && this.j(e);
  }
  j(e) {
    e === l ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Xe extends he {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === l ? void 0 : e;
  }
}
class Ye extends he {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== l);
  }
}
class Qe extends he {
  constructor(e, s, i, r, a) {
    super(e, s, i, r, a), this.type = 5;
  }
  _$AI(e, s = this) {
    if ((e = K(this, e, s, 0) ?? l) === V) return;
    const i = this._$AH, r = e === l && i !== l || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, a = e !== l && (i === l || r);
    r && this.element.removeEventListener(this.name, this, i), a && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class et {
  constructor(e, s, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = s, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    K(this, e);
  }
}
const tt = ge.litHtmlPolyfillSupport;
tt?.(X, Y), (ge.litHtmlVersions ??= []).push("3.3.3");
const st = (t, e, s) => {
  const i = s?.renderBefore ?? e;
  let r = i._$litPart$;
  if (r === void 0) {
    const a = s?.renderBefore ?? null;
    i._$litPart$ = r = new Y(e.insertBefore(Z(), a), a, void 0, s ?? {});
  }
  return r._$AI(t), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ve = globalThis;
class w extends I {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const s = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = st(s, this.renderRoot, this.renderOptions);
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
w._$litElement$ = !0, w.finalized = !0, ve.litElementHydrateSupport?.({ LitElement: w });
const it = ve.litElementPolyfillSupport;
it?.({ LitElement: w });
(ve.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const k = (t) => (e, s) => {
  s !== void 0 ? s.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const rt = { attribute: !0, type: String, converter: ne, reflect: !1, hasChanged: me }, at = (t = rt, e, s) => {
  const { kind: i, metadata: r } = s;
  let a = globalThis.litPropertyMetadata.get(r);
  if (a === void 0 && globalThis.litPropertyMetadata.set(r, a = /* @__PURE__ */ new Map()), i === "setter" && ((t = Object.create(t)).wrapped = !0), a.set(s.name, t), i === "accessor") {
    const { name: n } = s;
    return { set(d) {
      const c = e.get.call(this);
      e.set.call(this, d), this.requestUpdate(n, c, t, !0, d);
    }, init(d) {
      return d !== void 0 && this.C(n, void 0, t, d), d;
    } };
  }
  if (i === "setter") {
    const { name: n } = s;
    return function(d) {
      const c = this[n];
      e.call(this, d), this.requestUpdate(n, c, t, !0, d);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function p(t) {
  return (e, s) => typeof s == "object" ? at(t, e, s) : ((i, r, a) => {
    const n = r.hasOwnProperty(a);
    return r.constructor.createProperty(a, i), n ? Object.getOwnPropertyDescriptor(r, a) : void 0;
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
const y = "camwatch";
class Oe {
  constructor(e) {
    this.hass = e;
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
  setCamera(e) {
    return this.hass.callWS({ type: `${y}/camera/set`, ...e });
  }
  deleteCamera(e) {
    return this.hass.callWS({ type: `${y}/camera/delete`, slug: e });
  }
  setViews(e) {
    return this.hass.callWS({ type: `${y}/views/set`, views: e });
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
function ie(t) {
  if (t === null) return "unbekannt";
  const e = ["B", "kB", "MB", "GB", "TB"];
  let s = t, i = 0;
  for (; s >= 1e3 && i < e.length - 1; )
    s /= 1e3, i += 1;
  return `${s.toFixed(s < 10 && i > 0 ? 1 : 0)} ${e[i]}`;
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
var nt = Object.defineProperty, ot = Object.getOwnPropertyDescriptor, L = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ot(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && nt(e, s, r), r;
};
let T = class extends w {
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
    this.mode = "error", this.message = t instanceof Error ? t.message : String(t);
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
  p({ attribute: !1 })
], T.prototype, "hass", 2);
L([
  p()
], T.prototype, "entityId", 2);
L([
  p({ type: Boolean })
], T.prototype, "muted", 2);
L([
  h()
], T.prototype, "mode", 2);
L([
  h()
], T.prototype, "message", 2);
T = L([
  k("camwatch-live-stream")
], T);
var lt = Object.defineProperty, ht = Object.getOwnPropertyDescriptor, W = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ht(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && lt(e, s, r), r;
};
const ct = [
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
    const t = this.camera.streams;
    return (t.find((e) => !e.record) ?? t[0])?.entity_id;
  }
  async run(t, e) {
    this.busy = t, this.error = "";
    try {
      await this.api.trigger(this.camera.slug, t, e);
    } catch (s) {
      this.error = s instanceof Error ? s.message : String(s);
    } finally {
      this.busy = "";
    }
  }
  bound(t) {
    return t in this.camera.capabilities;
  }
  renderButton(t, e, s) {
    return this.bound(t) ? o`<button
      title=${t}
      ?disabled=${this.busy !== ""}
      @click=${() => this.run(t, s)}
    >
      ${e}
    </button>` : l;
  }
  render() {
    const t = this.liveEntity, e = this.camera.state, s = e.streams.filter((i) => i.running).length;
    return o`
      <header>
        <span
          class="dot ${e.recording ? "recording" : ""}"
          title=${e.recording ? `${s} Stream(s) werden aufgezeichnet` : e.paused ? "Aufzeichnung pausiert" : "Aufzeichnung laeuft nicht"}
        ></span>
        <span>${this.camera.name}</span>
        <span class="spacer"></span>
        ${e.paused ? o`<span class="meta">pausiert</span>` : l}
      </header>

      ${t ? o`<camwatch-live-stream
            .hass=${this.hass}
            .entityId=${t}
          ></camwatch-live-stream>` : o`<div class="meta" style="padding:12px">Kein Stream zugeordnet</div>`}

      <div class="controls">
        ${ct.map(([i, r]) => this.renderButton(i, r))}
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
  p({ attribute: !1 })
], z.prototype, "hass", 2);
W([
  p({ attribute: !1 })
], z.prototype, "api", 2);
W([
  p({ attribute: !1 })
], z.prototype, "camera", 2);
W([
  h()
], z.prototype, "busy", 2);
W([
  h()
], z.prototype, "error", 2);
z = W([
  k("camwatch-camera-tile")
], z);
var dt = Object.defineProperty, pt = Object.getOwnPropertyDescriptor, ee = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? pt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && dt(e, s, r), r;
};
let N = class extends w {
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
            <camwatch-camera-tile
              .hass=${this.hass}
              .api=${this.api}
              .camera=${s}
            ></camwatch-camera-tile>
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
ee([
  p({ attribute: !1 })
], N.prototype, "hass", 2);
ee([
  p({ attribute: !1 })
], N.prototype, "api", 2);
ee([
  p({ attribute: !1 })
], N.prototype, "view", 2);
ee([
  p({ attribute: !1 })
], N.prototype, "cameras", 2);
N = ee([
  k("camwatch-live-view")
], N);
var ut = Object.defineProperty, mt = Object.getOwnPropertyDescriptor, te = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? mt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && ut(e, s, r), r;
};
const gt = 2, bt = "mp4a.40.2";
function vt(t) {
  for (let e = 0; e + 8 < t.length; e += 1)
    if (t[e] === 97 && // a
    t[e + 1] === 118 && // v
    t[e + 2] === 99 && // c
    t[e + 3] === 67) {
      const s = t[e + 5], i = t[e + 6], r = t[e + 7];
      if (s === void 0 || r === void 0) return null;
      const a = (n) => n.toString(16).padStart(2, "0");
      return `avc1.${a(s)}${a(i)}${a(r)}`;
    }
  return null;
}
let B = class extends w {
  constructor() {
    super(...arguments), this.segments = [], this.seekTo = 0, this.segmentUrlBase = "/api/camwatch/segment", this.message = "", this.queue = [], this.appended = /* @__PURE__ */ new Set(), this.origin = 0, this.loading = !1, this.generation = 0;
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
    for (let a = 0; a < i.length; a += 1)
      s >= i.start(a) && s <= i.end(a) && (r = !0);
    if (r) {
      e.currentTime = s;
      return;
    }
    this.load(t);
  }
  teardown() {
    this.generation += 1, this.objectUrl && URL.revokeObjectURL(this.objectUrl), this.objectUrl = void 0, this.buffer = void 0, this.media = void 0, this.queue = [], this.appended.clear(), this.loading = !1;
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
      r = await this.detectCodec(this.queue[0]);
    } catch (u) {
      this.message = u instanceof Error ? u.message : String(u);
      return;
    }
    if (e !== this.generation) return;
    if (!r) {
      this.message = "Das Format der Aufnahme konnte nicht bestimmt werden.";
      return;
    }
    const a = `video/mp4; codecs="${r}, ${bt}"`, n = `video/mp4; codecs="${r}"`, d = MediaSource.isTypeSupported(a) ? a : MediaSource.isTypeSupported(n) ? n : null;
    if (!d) {
      this.message = `Dieser Browser kann ${r} nicht abspielen.`;
      return;
    }
    const c = new MediaSource();
    this.media = c, this.objectUrl = URL.createObjectURL(c), await this.updateComplete;
    const g = this.renderRoot.querySelector("video");
    g && (g.src = this.objectUrl, c.addEventListener(
      "sourceopen",
      () => {
        if (e === this.generation)
          try {
            const u = c.addSourceBuffer(d);
            u.mode = "segments", this.buffer = u, u.addEventListener("updateend", () => void this.pump()), this.pump();
          } catch (u) {
            this.message = u instanceof Error ? u.message : String(u);
          }
      },
      { once: !0 }
    ), g.addEventListener("timeupdate", () => void this.pump()));
  }
  async detectCodec(t) {
    const e = await fetch(this.urlFor(t), {
      headers: { Range: "bytes=0-8191" }
    });
    if (!e.ok && e.status !== 206)
      throw new Error("Die Aufnahme konnte nicht geladen werden.");
    return vt(new Uint8Array(await e.arrayBuffer()));
  }
  urlFor(t) {
    return `${this.segmentUrlBase}/${t.path}`;
  }
  /** Keep a little footage buffered ahead of the playhead. */
  async pump() {
    const t = this.buffer, e = this.media;
    if (!t || !e || t.updating || this.loading || e.readyState !== "open") return;
    const s = this.renderRoot.querySelector("video"), i = this.queue.filter((n) => !this.appended.has(n.path));
    if (i.length === 0) {
      if (e.readyState === "open")
        try {
          e.endOfStream();
        } catch {
        }
      return;
    }
    if (s && (s.buffered.length > 0 ? s.buffered.end(s.buffered.length - 1) : 0) - s.currentTime > gt * (this.queue[0]?.duration ?? 0) && this.appended.size > 0)
      return;
    const r = i[0], a = this.generation;
    this.loading = !0;
    try {
      const n = await fetch(this.urlFor(r));
      if (!n.ok) throw new Error(`HTTP ${n.status}`);
      const d = await n.arrayBuffer();
      if (a !== this.generation || !this.buffer) return;
      this.buffer.timestampOffset = r.start - this.origin, this.buffer.appendBuffer(d), this.appended.add(r.path);
    } catch (n) {
      this.appended.add(r.path), console.warn("camwatch: segment could not be appended", r.path, n);
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
te([
  p({ attribute: !1 })
], B.prototype, "segments", 2);
te([
  p({ type: Number })
], B.prototype, "seekTo", 2);
te([
  p()
], B.prototype, "segmentUrlBase", 2);
te([
  h()
], B.prototype, "message", 2);
B = te([
  k("camwatch-player")
], B);
var yt = Object.defineProperty, ft = Object.getOwnPropertyDescriptor, j = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ft(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && yt(e, s, r), r;
};
let S = class extends w {
  constructor() {
    super(...arguments), this.from = 0, this.to = 0, this.blocks = [], this.segments = [], this.position = 0, this.thumbnailUrlBase = "/api/camwatch/thumbnail";
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
    this.hover = { x: this.percent(e), time: e, segment: s };
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
    return t.length > 24 ? l : o`
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
      (t) => o`<div
              class="block"
              title="${this.formatTime(t.start)} bis ${this.formatTime(t.end)}"
              style="left:${this.percent(t.start)}%;width:${this.percent(t.end) - this.percent(t.start)}%"
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
S.styles = H`
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
  p({ type: Number })
], S.prototype, "from", 2);
j([
  p({ type: Number })
], S.prototype, "to", 2);
j([
  p({ attribute: !1 })
], S.prototype, "blocks", 2);
j([
  p({ attribute: !1 })
], S.prototype, "segments", 2);
j([
  p({ type: Number })
], S.prototype, "position", 2);
j([
  p()
], S.prototype, "thumbnailUrlBase", 2);
j([
  h()
], S.prototype, "hover", 2);
S = j([
  k("camwatch-timeline")
], S);
var $t = Object.defineProperty, wt = Object.getOwnPropertyDescriptor, x = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? wt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && $t(e, s, r), r;
};
let $ = class extends w {
  constructor() {
    super(...arguments), this.cameras = [], this.camera = "", this.stream = "", this.day = "", this.days = [], this.blocks = [], this.segments = [], this.position = 0, this.seekTo = 0, this.busy = !1, this.error = "";
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
      this.error = e instanceof Error ? e.message : String(e);
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
      this.error = s instanceof Error ? s.message : String(s);
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
    return this.stream && s.set("stream", this.stream), `/api/camwatch/export?${s.toString()}`;
  }
  render() {
    if (this.cameras.length === 0)
      return o`<div style="padding:32px" class="muted">
        Noch keine Kamera eingerichtet.
      </div>`;
    const t = this.streamKeys;
    return o`
      <div style="padding:16px">
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
                </div>` : l}
          </div>
          ${this.error ? o`<p class="error">${this.error}</p>` : l}
        </div>

        <camwatch-player
          .segments=${this.segments}
          .seekTo=${this.seekTo}
        ></camwatch-player>

        <div style="margin-top:12px">
          <camwatch-timeline
            .from=${this.bounds[0]}
            .to=${this.bounds[1]}
            .blocks=${this.blocks}
            .segments=${this.segments}
            .position=${this.position}
            @seek=${(e) => {
      this.position = e.detail.time, this.seekTo = e.detail.time;
    }}
          ></camwatch-timeline>
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
x([
  p({ attribute: !1 })
], $.prototype, "api", 2);
x([
  p({ attribute: !1 })
], $.prototype, "cameras", 2);
x([
  h()
], $.prototype, "camera", 2);
x([
  h()
], $.prototype, "stream", 2);
x([
  h()
], $.prototype, "day", 2);
x([
  h()
], $.prototype, "days", 2);
x([
  h()
], $.prototype, "blocks", 2);
x([
  h()
], $.prototype, "segments", 2);
x([
  h()
], $.prototype, "position", 2);
x([
  h()
], $.prototype, "seekTo", 2);
x([
  h()
], $.prototype, "busy", 2);
x([
  h()
], $.prototype, "error", 2);
$ = x([
  k("camwatch-recordings")
], $);
var _t = Object.defineProperty, xt = Object.getOwnPropertyDescriptor, _ = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? xt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && _t(e, s, r), r;
};
function At(t) {
  const e = t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z0-9]/.test(e) ? e : `kamera_${e}`;
}
let f = class extends w {
  constructor() {
    super(...arguments), this.capabilityKeys = [], this.available = [], this.slug = "", this.name = "", this.streams = [], this.capabilities = {}, this.retentionDays = null, this.enabled = !0, this.candidates = [], this.busy = !1, this.error = "";
  }
  connectedCallback() {
    super.connectedCallback(), this.camera && (this.slug = this.camera.slug, this.name = this.camera.name, this.streams = this.camera.streams.map((t) => ({ ...t })), this.capabilities = structuredClone(this.camera.capabilities), this.retentionDays = this.camera.retention_days, this.enabled = this.camera.enabled);
  }
  async pick(t) {
    if (t) {
      this.busy = !0, this.error = "";
      try {
        const e = await this.api.suggest(t);
        this.name = e.name, this.slug = At(e.name), this.streams = e.streams.map((s) => ({
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
        this.error = e instanceof Error ? e.message : String(e);
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
      await this.api.setCamera({
        slug: this.slug,
        name: this.name,
        streams: this.streams,
        capabilities: this.capabilities,
        retention_days: this.retentionDays,
        enabled: this.enabled,
        area_id: this.camera?.area_id ?? null
      }), this.dispatchEvent(new CustomEvent("saved", { bubbles: !0, composed: !0 }));
    } catch (t) {
      this.error = t instanceof Error ? t.message : String(t);
    } finally {
      this.busy = !1;
    }
  }
  renderPicker() {
    return this.camera ? l : o`
      <label>Kamera in Home Assistant</label>
      <select
        @change=${(t) => this.pick(t.target.value)}
      >
        <option value="">Bitte wählen …</option>
        ${this.available.map(
      (t) => o`<option value=${t.entity_id}>
            ${t.name ?? t.entity_id}${t.available ? "" : " (nicht verfügbar)"}
          </option>`
    )}
      </select>
      <p class="hint">
        camwatch schlägt danach Streams und Bedienelemente vor, die zum selben
        Gerät gehören. Alles davon lässt sich ändern.
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
          Was hier zugeordnet ist, erscheint als Schaltfläche auf der Kachel.
          Leer lassen heißt: keine Schaltfläche.
        </p>
        <table>
          ${this.capabilityKeys.map(
      (e) => o`
              <tr>
                <th>${e}</th>
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
f.styles = Q;
_([
  p({ attribute: !1 })
], f.prototype, "api", 2);
_([
  p({ attribute: !1 })
], f.prototype, "camera", 2);
_([
  p({ attribute: !1 })
], f.prototype, "capabilityKeys", 2);
_([
  p({ attribute: !1 })
], f.prototype, "available", 2);
_([
  h()
], f.prototype, "slug", 2);
_([
  h()
], f.prototype, "name", 2);
_([
  h()
], f.prototype, "streams", 2);
_([
  h()
], f.prototype, "capabilities", 2);
_([
  h()
], f.prototype, "retentionDays", 2);
_([
  h()
], f.prototype, "enabled", 2);
_([
  h()
], f.prototype, "candidates", 2);
_([
  h()
], f.prototype, "busy", 2);
_([
  h()
], f.prototype, "error", 2);
f = _([
  k("camwatch-camera-editor")
], f);
var St = Object.defineProperty, kt = Object.getOwnPropertyDescriptor, v = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? kt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && St(e, s, r), r;
};
const Et = [
  ["boolean", "Ja/Nein"],
  ["text", "Text"],
  ["number", "Anzahl"],
  ["select", "Auswahl"]
];
let b = class extends w {
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
      this.error = t instanceof Error ? t.message : String(t);
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
      this.error = t instanceof Error ? t.message : String(t);
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
                </p>` : l}
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
              ${Et.map(
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
        </div>

        ${t.type === "select" ? o`<label>Mögliche Antworten, durch Komma getrennt</label>
              <input
                .value=${(t.options ?? []).join(", ")}
                @change=${(s) => this.patchObservation(e, {
      options: s.target.value.split(",").map((i) => i.trim()).filter((i) => i)
    })}
              />` : l}
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
            </div>` : l}

        <div class="row" style="margin-top:8px">
          ${this.lastRun && t.key in this.lastRun.values ? o`<span class="muted">
                Letzte Antwort: <strong>${String(this.lastRun.values[t.key])}</strong>
              </span>` : l}
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
            </p>` : l}

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
b.styles = Q;
v([
  p({ attribute: !1 })
], b.prototype, "api", 2);
v([
  p({ attribute: !1 })
], b.prototype, "camera", 2);
v([
  p({ attribute: !1 })
], b.prototype, "profile", 2);
v([
  h()
], b.prototype, "backend", 2);
v([
  h()
], b.prototype, "observations", 2);
v([
  h()
], b.prototype, "triggers", 2);
v([
  h()
], b.prototype, "context", 2);
v([
  h()
], b.prototype, "cooldown", 2);
v([
  h()
], b.prototype, "budget", 2);
v([
  h()
], b.prototype, "condition", 2);
v([
  h()
], b.prototype, "enabled", 2);
v([
  h()
], b.prototype, "aiTasks", 2);
v([
  h()
], b.prototype, "history", 2);
v([
  h()
], b.prototype, "lastRun", 2);
v([
  h()
], b.prototype, "busy", 2);
v([
  h()
], b.prototype, "error", 2);
b = v([
  k("camwatch-vision-editor")
], b);
var Ct = Object.defineProperty, Ot = Object.getOwnPropertyDescriptor, E = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Ot(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && Ct(e, s, r), r;
};
const Pt = [
  ["cameras", "Kameras"],
  ["vision", "Bilderkennung"],
  ["storage", "Speicher"],
  ["views", "Ansichten"],
  ["system", "System"]
], Pe = 1e3 * 1e3 * 1e3;
let A = class extends w {
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
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = !1;
    }
  }
  async startAdding() {
    this.error = "";
    try {
      this.available = (await this.api.availableCameras()).cameras, this.adding = !0;
    } catch (t) {
      this.error = t instanceof Error ? t.message : String(t);
    }
  }
  // ------------------------------------------------------------------
  // Cameras
  // ------------------------------------------------------------------
  renderCameras() {
    return this.adding || this.editing ? o`<camwatch-camera-editor
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
      ></camwatch-camera-editor>` : o`
      <div class="card">
        <h2>Kameras</h2>
        ${this.snapshot.cameras.length === 0 ? o`<p class="hint">
              Noch keine Kamera eingerichtet. camwatch schlägt beim Hinzufügen
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
        <td class="muted">${ie(t.state.used_bytes)}</td>
        <td>
          ${t.enabled ? t.state.recording ? o`<span>zeichnet auf</span>` : o`<span class="error"
                  >steht${s[0]?.last_error ? o` (${s[0].last_error})` : l}</span
                >` : o`<span class="muted">deaktiviert</span>`}
        </td>
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
  confirmDelete(t) {
    confirm(
      `${t.name} entfernen? Die bereits vorhandenen Aufnahmen bleiben erhalten.`
    ) && this.run(() => this.api.deleteCamera(t.slug));
  }
  // ------------------------------------------------------------------
  // Vision
  // ------------------------------------------------------------------
  renderVision() {
    return this.visionFor ? o`<camwatch-vision-editor
        .api=${this.api}
        .camera=${this.visionFor}
        .profile=${this.snapshot.vision.find(
      (t) => t.camera_slug === this.visionFor.slug
    )}
        @saved=${() => {
      this.visionFor = void 0, this.refresh();
    }}
        @cancelled=${() => this.visionFor = void 0}
      ></camwatch-vision-editor>` : o`
      <div class="card">
        <h2>Bilderkennung</h2>
        <p class="hint">
          Ein Standbild wird an ein Modell Ihrer Wahl geschickt, sobald ein
          Auslöser meldet. Aus jeder Frage wird ein Sensor, den Automationen
          und Dashboards wie jeden anderen nutzen können. camwatch selbst
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
    const { storage: t, totals: e } = this.snapshot, s = t.max_total_bytes === null ? "" : String(t.max_total_bytes / Pe);
    return o`
      <div class="card">
        <h2>Speicher</h2>
        <table>
          <tr>
            <th>Ort</th>
            <td class="muted">${t.base_path}</td>
          </tr>
          <tr>
            <th>Belegt</th>
            <td>${ie(e.used_bytes)}</td>
          </tr>
          <tr>
            <th>Frei am Ort</th>
            <td>${ie(e.free_bytes)}</td>
          </tr>
        </table>
        <p class="hint">
          Der Ort wird beim Einrichten festgelegt und lässt sich hier nicht
          ändern: ein Wechsel würde die vorhandenen Aufnahmen zurücklassen.
        </p>

        ${e.over_budget_bytes > 0 ? o`<p class="error">
              ${ie(e.over_budget_bytes)} über dem Budget, und mehr
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
              .value=${String(t.segment_seconds)}
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
    const t = this.renderRoot, e = Number(
      t.querySelector("#segment").value
    ), s = t.querySelector("#budget").value;
    this.run(
      () => this.api.setStorage({
        segment_seconds: e,
        max_total_bytes: s === "" ? null : Math.round(Number(s) * Pe)
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
          Jede Ansicht wird zu einem eigenen Reiter mit den Kameras, die ihr
          zugeordnet sind.
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
        <label>Kameras</label>
        <div class="row">
          ${this.snapshot.cameras.map(
      (s) => o`
              <label style="margin:0">
                <input
                  type="checkbox"
                  .checked=${t.cameras.includes(s.slug)}
                  @change=${(i) => this.toggleCamera(
        e,
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
    this.run(() => this.api.setViews(t));
  }
  patchView(t, e) {
    this.saveViews(
      this.snapshot.views.map((s, i) => i === t ? { ...s, ...e } : s)
    );
  }
  toggleCamera(t, e, s) {
    const i = this.snapshot.views[t], r = s ? [...i.cameras, e] : i.cameras.filter((a) => a !== e);
    this.patchView(t, { cameras: r });
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
              </tr>` : l}
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
          ${Pt.map(
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
        ${this.error ? o`<p class="error">${this.error}</p>` : l}
        ${this.section === "cameras" ? this.renderCameras() : this.section === "vision" ? this.renderVision() : this.section === "storage" ? this.renderStorage() : this.section === "views" ? this.renderViews() : this.renderSystem()}
      </div>
    `;
  }
};
A.styles = Q;
E([
  p({ attribute: !1 })
], A.prototype, "api", 2);
E([
  p({ attribute: !1 })
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
  k("camwatch-settings")
], A);
var Tt = Object.defineProperty, zt = Object.getOwnPropertyDescriptor, q = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? zt(e, s) : e, a = t.length - 1, n; a >= 0; a--)
    (n = t[a]) && (r = (i ? n(e, s, r) : n(r)) || r);
  return i && r && Tt(e, s, r), r;
};
const de = "__recordings", re = "__settings";
let D = class extends w {
  constructor() {
    super(...arguments), this.narrow = !1, this.active = "", this.error = "";
  }
  connectedCallback() {
    super.connectedCallback(), this.load();
  }
  updated(t) {
    t.has("hass") && this.hass && !this.api && (this.api = new Oe(this.hass), this.load());
  }
  async load() {
    if (this.hass) {
      this.api ??= new Oe(this.hass);
      try {
        this.snapshot = await this.api.getConfig(), this.error = "", this.active || (this.active = this.snapshot.views[0]?.id ?? re);
      } catch (t) {
        const e = t instanceof Error ? t.message : String(t);
        this.error = e;
      }
    }
  }
  render() {
    if (this.error)
      return o`<div class="notice">
        camwatch ist nicht eingerichtet oder nicht erreichbar.<br />
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
          class=${this.active === de ? "active" : ""}
          @click=${() => this.active = de}
        >
          Aufnahmen
        </button>
        <button
          class=${this.active === re ? "active" : ""}
          @click=${() => this.active = re}
        >
          Einstellungen
        </button>
      </div>

      <div class="body">
        ${this.active === de ? o`<camwatch-recordings
              .api=${this.api}
              .cameras=${t.cameras}
            ></camwatch-recordings>` : this.active === re ? o`<camwatch-settings
              .api=${this.api}
              .snapshot=${t}
              @changed=${() => this.load()}
            ></camwatch-settings>` : e ? o`<camwatch-live-view
                .hass=${this.hass}
                .api=${this.api}
                .view=${e}
                .cameras=${t.cameras}
              ></camwatch-live-view>` : o`<div class="notice">
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
  p({ attribute: !1 })
], D.prototype, "hass", 2);
q([
  p({ type: Boolean, reflect: !0 })
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
  k("camwatch-panel")
], D);
export {
  D as CamwatchPanel
};
