const Ve = "kustos-vision-reloaded";
if (customElements.get("kustos-vision-panel") !== void 0) {
  let t = 0;
  try {
    t = Number(sessionStorage.getItem(Ve) ?? 0);
  } catch {
  }
  if (Date.now() - t > 3e4) {
    try {
      sessionStorage.setItem(Ve, String(Date.now()));
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
const ve = globalThis, Ce = ve.ShadowRoot && (ve.ShadyCSS === void 0 || ve.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, De = Symbol(), Ie = /* @__PURE__ */ new WeakMap();
let dt = class {
  constructor(e, s, i) {
    if (this._$cssResult$ = !0, i !== De) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = s;
  }
  get styleSheet() {
    let e = this.o;
    const s = this.t;
    if (Ce && e === void 0) {
      const i = s !== void 0 && s.length === 1;
      i && (e = Ie.get(s)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && Ie.set(s, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const $t = (t) => new dt(typeof t == "string" ? t : t + "", void 0, De), R = (t, ...e) => {
  const s = t.length === 1 ? t[0] : e.reduce((i, r, n) => i + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + t[n + 1], t[0]);
  return new dt(s, t, De);
}, xt = (t, e) => {
  if (Ce) t.adoptedStyleSheets = e.map((s) => s instanceof CSSStyleSheet ? s : s.styleSheet);
  else for (const s of e) {
    const i = document.createElement("style"), r = ve.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = s.cssText, t.appendChild(i);
  }
}, Le = Ce ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let s = "";
  for (const i of e.cssRules) s += i.cssText;
  return $t(s);
})(t) : t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: kt, defineProperty: _t, getOwnPropertyDescriptor: At, getOwnPropertyNames: St, getOwnPropertySymbols: Et, getPrototypeOf: Tt } = Object, $e = globalThis, Ue = $e.trustedTypes, Ct = Ue ? Ue.emptyScript : "", Dt = $e.reactiveElementPolyfillSupport, he = (t, e) => t, fe = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? Ct : null;
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
} }, Oe = (t, e) => !kt(t, e), Ne = { attribute: !0, type: String, converter: fe, reflect: !1, useDefault: !1, hasChanged: Oe };
Symbol.metadata ??= Symbol("metadata"), $e.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let ee = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, s = Ne) {
    if (s.state && (s.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((s = Object.create(s)).wrapped = !0), this.elementProperties.set(e, s), !s.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(e, i, s);
      r !== void 0 && _t(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, s, i) {
    const { get: r, set: n } = At(this.prototype, e) ?? { get() {
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
    return this.elementProperties.get(e) ?? Ne;
  }
  static _$Ei() {
    if (this.hasOwnProperty(he("elementProperties"))) return;
    const e = Tt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(he("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(he("properties"))) {
      const s = this.properties, i = [...St(s), ...Et(s)];
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
      for (const r of i) s.unshift(Le(r));
    } else e !== void 0 && s.push(Le(e));
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
    return xt(e, this.constructor.elementStyles), e;
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
      const n = (i.converter?.toAttribute !== void 0 ? i.converter : fe).toAttribute(s, i.type);
      this._$Em = e, n == null ? this.removeAttribute(r) : this.setAttribute(r, n), this._$Em = null;
    }
  }
  _$AK(e, s) {
    const i = this.constructor, r = i._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const n = i.getPropertyOptions(r), a = typeof n.converter == "function" ? { fromAttribute: n.converter } : n.converter?.fromAttribute !== void 0 ? n.converter : fe;
      this._$Em = r;
      const l = a.fromAttribute(s, n.type);
      this[r] = l ?? this._$Ej?.get(r) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, s, i, r = !1, n) {
    if (e !== void 0) {
      const a = this.constructor;
      if (r === !1 && (n = this[e]), i ??= a.getPropertyOptions(e), !((i.hasChanged ?? Oe)(n, s) || i.useDefault && i.reflect && n === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, i)))) return;
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
ee.elementStyles = [], ee.shadowRootOptions = { mode: "open" }, ee[he("elementProperties")] = /* @__PURE__ */ new Map(), ee[he("finalized")] = /* @__PURE__ */ new Map(), Dt?.({ ReactiveElement: ee }), ($e.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ze = globalThis, je = (t) => t, ye = ze.trustedTypes, Fe = ye ? ye.createPolicy("lit-html", { createHTML: (t) => t }) : void 0, ct = "$lit$", F = `lit$${Math.random().toFixed(9).slice(2)}$`, ut = "?" + F, Ot = `<${ut}>`, Y = document, de = () => Y.createComment(""), ce = (t) => t === null || typeof t != "object" && typeof t != "function", Pe = Array.isArray, zt = (t) => Pe(t) || typeof t?.[Symbol.iterator] == "function", _e = `[ 	
\f\r]`, ne = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ke = /-->/g, We = />/g, W = RegExp(`>|${_e}(?:([^\\s"'>=/]+)(${_e}*=${_e}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Ge = /'/g, qe = /"/g, pt = /^(?:script|style|textarea|title)$/i, Pt = (t) => (e, ...s) => ({ _$litType$: t, strings: e, values: s }), o = Pt(1), J = Symbol.for("lit-noChange"), c = Symbol.for("lit-nothing"), Ze = /* @__PURE__ */ new WeakMap(), Z = Y.createTreeWalker(Y, 129);
function gt(t, e) {
  if (!Pe(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Fe !== void 0 ? Fe.createHTML(e) : e;
}
const Mt = (t, e) => {
  const s = t.length - 1, i = [];
  let r, n = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = ne;
  for (let l = 0; l < s; l++) {
    const h = t[l];
    let g, v, u = -1, b = 0;
    for (; b < h.length && (a.lastIndex = b, v = a.exec(h), v !== null); ) b = a.lastIndex, a === ne ? v[1] === "!--" ? a = Ke : v[1] !== void 0 ? a = We : v[2] !== void 0 ? (pt.test(v[2]) && (r = RegExp("</" + v[2], "g")), a = W) : v[3] !== void 0 && (a = W) : a === W ? v[0] === ">" ? (a = r ?? ne, u = -1) : v[1] === void 0 ? u = -2 : (u = a.lastIndex - v[2].length, g = v[1], a = v[3] === void 0 ? W : v[3] === '"' ? qe : Ge) : a === qe || a === Ge ? a = W : a === Ke || a === We ? a = ne : (a = W, r = void 0);
    const m = a === W && t[l + 1].startsWith("/>") ? " " : "";
    n += a === ne ? h + Ot : u >= 0 ? (i.push(g), h.slice(0, u) + ct + h.slice(u) + F + m) : h + F + (u === -2 ? l : m);
  }
  return [gt(t, n + (t[s] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class ue {
  constructor({ strings: e, _$litType$: s }, i) {
    let r;
    this.parts = [];
    let n = 0, a = 0;
    const l = e.length - 1, h = this.parts, [g, v] = Mt(e, s);
    if (this.el = ue.createElement(g, i), Z.currentNode = this.el.content, s === 2 || s === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (r = Z.nextNode()) !== null && h.length < l; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const u of r.getAttributeNames()) if (u.endsWith(ct)) {
          const b = v[a++], m = r.getAttribute(u).split(F), f = /([.?@])?(.*)/.exec(b);
          h.push({ type: 1, index: n, name: f[2], strings: m, ctor: f[1] === "." ? Ht : f[1] === "?" ? Rt : f[1] === "@" ? Vt : xe }), r.removeAttribute(u);
        } else u.startsWith(F) && (h.push({ type: 6, index: n }), r.removeAttribute(u));
        if (pt.test(r.tagName)) {
          const u = r.textContent.split(F), b = u.length - 1;
          if (b > 0) {
            r.textContent = ye ? ye.emptyScript : "";
            for (let m = 0; m < b; m++) r.append(u[m], de()), Z.nextNode(), h.push({ type: 2, index: ++n });
            r.append(u[b], de());
          }
        }
      } else if (r.nodeType === 8) if (r.data === ut) h.push({ type: 2, index: n });
      else {
        let u = -1;
        for (; (u = r.data.indexOf(F, u + 1)) !== -1; ) h.push({ type: 7, index: n }), u += F.length - 1;
      }
      n++;
    }
  }
  static createElement(e, s) {
    const i = Y.createElement("template");
    return i.innerHTML = e, i;
  }
}
function ie(t, e, s = t, i) {
  if (e === J) return e;
  let r = i !== void 0 ? s._$Co?.[i] : s._$Cl;
  const n = ce(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== n && (r?._$AO?.(!1), n === void 0 ? r = void 0 : (r = new n(t), r._$AT(t, s, i)), i !== void 0 ? (s._$Co ??= [])[i] = r : s._$Cl = r), r !== void 0 && (e = ie(t, r._$AS(t, e.values), r, i)), e;
}
class Bt {
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
    const { el: { content: s }, parts: i } = this._$AD, r = (e?.creationScope ?? Y).importNode(s, !0);
    Z.currentNode = r;
    let n = Z.nextNode(), a = 0, l = 0, h = i[0];
    for (; h !== void 0; ) {
      if (a === h.index) {
        let g;
        h.type === 2 ? g = new re(n, n.nextSibling, this, e) : h.type === 1 ? g = new h.ctor(n, h.name, h.strings, this, e) : h.type === 6 && (g = new It(n, this, e)), this._$AV.push(g), h = i[++l];
      }
      a !== h?.index && (n = Z.nextNode(), a++);
    }
    return Z.currentNode = Y, r;
  }
  p(e) {
    let s = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, s), s += i.strings.length - 2) : i._$AI(e[s])), s++;
  }
}
class re {
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
    e = ie(this, e, s), ce(e) ? e === c || e == null || e === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : e !== this._$AH && e !== J && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : zt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== c && ce(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Y.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: s, _$litType$: i } = e, r = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = ue.createElement(gt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === r) this._$AH.p(s);
    else {
      const n = new Bt(r, this), a = n.u(this.options);
      n.p(s), this.T(a), this._$AH = n;
    }
  }
  _$AC(e) {
    let s = Ze.get(e.strings);
    return s === void 0 && Ze.set(e.strings, s = new ue(e)), s;
  }
  k(e) {
    Pe(this._$AH) || (this._$AH = [], this._$AR());
    const s = this._$AH;
    let i, r = 0;
    for (const n of e) r === s.length ? s.push(i = new re(this.O(de()), this.O(de()), this, this.options)) : i = s[r], i._$AI(n), r++;
    r < s.length && (this._$AR(i && i._$AB.nextSibling, r), s.length = r);
  }
  _$AR(e = this._$AA.nextSibling, s) {
    for (this._$AP?.(!1, !0, s); e !== this._$AB; ) {
      const i = je(e).nextSibling;
      je(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class xe {
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
    if (n === void 0) e = ie(this, e, s, 0), a = !ce(e) || e !== this._$AH && e !== J, a && (this._$AH = e);
    else {
      const l = e;
      let h, g;
      for (e = n[0], h = 0; h < n.length - 1; h++) g = ie(this, l[i + h], s, h), g === J && (g = this._$AH[h]), a ||= !ce(g) || g !== this._$AH[h], g === c ? e = c : e !== c && (e += (g ?? "") + n[h + 1]), this._$AH[h] = g;
    }
    a && !r && this.j(e);
  }
  j(e) {
    e === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Ht extends xe {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === c ? void 0 : e;
  }
}
class Rt extends xe {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== c);
  }
}
class Vt extends xe {
  constructor(e, s, i, r, n) {
    super(e, s, i, r, n), this.type = 5;
  }
  _$AI(e, s = this) {
    if ((e = ie(this, e, s, 0) ?? c) === J) return;
    const i = this._$AH, r = e === c && i !== c || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, n = e !== c && (i === c || r);
    r && this.element.removeEventListener(this.name, this, i), n && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class It {
  constructor(e, s, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = s, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    ie(this, e);
  }
}
const Lt = { I: re }, Ut = ze.litHtmlPolyfillSupport;
Ut?.(ue, re), (ze.litHtmlVersions ??= []).push("3.3.3");
const Nt = (t, e, s) => {
  const i = s?.renderBefore ?? e;
  let r = i._$litPart$;
  if (r === void 0) {
    const n = s?.renderBefore ?? null;
    i._$litPart$ = r = new re(e.insertBefore(de(), n), n, void 0, s ?? {});
  }
  return r._$AI(t), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Me = globalThis;
let E = class extends ee {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const s = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Nt(s, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return J;
  }
};
E._$litElement$ = !0, E.finalized = !0, Me.litElementHydrateSupport?.({ LitElement: E });
const jt = Me.litElementPolyfillSupport;
jt?.({ LitElement: E });
(Me.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const P = (t) => (e, s) => {
  s !== void 0 ? s.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ft = { attribute: !0, type: String, converter: fe, reflect: !1, hasChanged: Oe }, Kt = (t = Ft, e, s) => {
  const { kind: i, metadata: r } = s;
  let n = globalThis.litPropertyMetadata.get(r);
  if (n === void 0 && globalThis.litPropertyMetadata.set(r, n = /* @__PURE__ */ new Map()), i === "setter" && ((t = Object.create(t)).wrapped = !0), n.set(s.name, t), i === "accessor") {
    const { name: a } = s;
    return { set(l) {
      const h = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(a, h, t, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(a, void 0, t, l), l;
    } };
  }
  if (i === "setter") {
    const { name: a } = s;
    return function(l) {
      const h = this[a];
      e.call(this, l), this.requestUpdate(a, h, t, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function p(t) {
  return (e, s) => typeof s == "object" ? Kt(t, e, s) : ((i, r, n) => {
    const a = r.hasOwnProperty(n);
    return r.constructor.createProperty(n, i), a ? Object.getOwnPropertyDescriptor(r, n) : void 0;
  })(t, e, s);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function d(t) {
  return p({ ...t, state: !0, attribute: !1 });
}
const k = "kustos_vision", Ye = 3600, Wt = 60;
class Je {
  constructor(e) {
    this.hass = e, this.signatures = /* @__PURE__ */ new Map(), this.fragmentMaps = /* @__PURE__ */ new Map();
  }
  getConfig() {
    return this.hass.callWS({ type: `${k}/config/get` });
  }
  availableCameras() {
    return this.hass.callWS({ type: `${k}/cameras/available` });
  }
  suggest(e) {
    return this.hass.callWS({
      type: `${k}/camera/suggest`,
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
      type: `${k}/camera/set`,
      replace_existing: s,
      ...e
    });
  }
  deleteCamera(e) {
    return this.hass.callWS({ type: `${k}/camera/delete`, slug: e });
  }
  setViews(e) {
    return this.hass.callWS({ type: `${k}/views/set`, views: e });
  }
  /** Set the order of every camera in one view at once. */
  setViewOrder(e, s) {
    return this.hass.callWS({
      type: `${k}/view/order`,
      view_id: e,
      cameras: s
    });
  }
  setStorage(e) {
    return this.hass.callWS({ type: `${k}/storage/set`, ...e });
  }
  trigger(e, s, i) {
    return this.hass.callWS({
      type: `${k}/camera/trigger`,
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
      expires: Ye
    });
    return this.signatures.set(e, {
      url: r,
      usableUntil: i + (Ye - Wt) * 1e3
    }), r;
  }
  recordingDays(e) {
    return this.hass.callWS({ type: `${k}/recordings/days`, camera: e });
  }
  timeline(e, s, i, r) {
    return this.hass.callWS({
      type: `${k}/recordings/timeline`,
      camera: e,
      from: s,
      to: i,
      ...r ? { stream: r } : {}
    });
  }
  setVision(e) {
    return this.hass.callWS({ type: `${k}/vision/set`, ...e });
  }
  deleteVision(e) {
    return this.hass.callWS({
      type: `${k}/vision/delete`,
      camera_slug: e
    });
  }
  analyseNow(e) {
    return this.hass.callWS({
      type: `${k}/vision/analyse`,
      camera_slug: e
    });
  }
  visionHistory(e) {
    return this.hass.callWS({
      type: `${k}/vision/history`,
      camera_slug: e
    });
  }
  aiTaskEntities() {
    return this.hass.callWS({ type: `${k}/vision/backends` });
  }
  /** Ask the Supervisor to reconnect the mount behind the recordings. */
  reconnectStorage() {
    return this.hass.callWS({ type: `${k}/storage/reconnect` });
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
    const i = this.hass.callWS({ type: `${k}/recordings/fragments`, path: e }).catch((r) => {
      throw this.fragmentMaps.delete(e), r;
    });
    return this.fragmentMaps.set(e, i), i;
  }
  rebuildIndex() {
    return this.hass.callWS({ type: `${k}/index/rebuild` });
  }
}
function S(t) {
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
function me(t) {
  if (t === null) return "unbekannt";
  const e = ["B", "kB", "MB", "GB", "TB"];
  let s = t, i = 0;
  for (; s >= 1e3 && i < e.length - 1; )
    s /= 1e3, i += 1;
  return `${s.toFixed(s < 10 && i > 0 ? 1 : 0)} ${e[i]}`;
}
const K = R`
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
var Gt = Object.defineProperty, qt = Object.getOwnPropertyDescriptor, U = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? qt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Gt(e, s, r), r;
};
function Zt(t, e) {
  const s = e.trim().toLowerCase();
  return s ? t.filter((i) => i.label.toLowerCase().includes(s)) : t;
}
function mt(t, e, s) {
  const i = e - t.bottom - s, r = t.top - s, n = r > i;
  return { up: n, maxHeight: Math.max(n ? r : i, 0), left: t.left, width: t.width };
}
let M = class extends E {
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
    const e = t.getBoundingClientRect(), i = mt(e, window.innerHeight, 8);
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
    return Zt(this.options, this.query);
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
M.styles = [
  K,
  R`
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
U([
  p({ attribute: !1 })
], M.prototype, "options", 2);
U([
  p()
], M.prototype, "value", 2);
U([
  p({ type: Boolean })
], M.prototype, "search", 2);
U([
  p({ type: Boolean })
], M.prototype, "disabled", 2);
U([
  d()
], M.prototype, "open", 2);
U([
  d()
], M.prototype, "query", 2);
U([
  d()
], M.prototype, "highlighted", 2);
U([
  d()
], M.prototype, "drop", 2);
M = U([
  P("kustos-vision-select")
], M);
var Yt = Object.defineProperty, Jt = Object.getOwnPropertyDescriptor, bt = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Jt(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Yt(e, s, r), r;
};
let we = class extends E {
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
we.styles = [
  K,
  R`
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
bt([
  d()
], we.prototype, "open", 2);
we = bt([
  P("kustos-vision-unsaved-dialog")
], we);
const pe = [];
function Be(t) {
  pe.push(t);
}
function He(t) {
  const e = pe.indexOf(t);
  e >= 0 && pe.splice(e, 1);
}
function Qt() {
  return pe.some((t) => t.isDirty());
}
let Te;
function Qe(t) {
  Te = t;
}
async function se() {
  const t = pe.filter((s) => s.isDirty());
  if (t.length === 0 || !Te) return !0;
  const e = await Te();
  if (e === "cancel") return !1;
  for (const s of t)
    if (e === "save") {
      if (!await s.save()) return !1;
    } else
      s.discard();
  return !0;
}
const Ae = "0.6.15", Xt = "kustos-vision-built:0.6.15", es = {
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
function te(t) {
  const e = es[t];
  if (e) return e;
  const s = t.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const ts = {
  ptz_up: "▲",
  ptz_down: "▼",
  ptz_left: "◀",
  ptz_right: "▶"
};
function Xe(t) {
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
const ss = {
  button: "Knopf",
  switch: "An/Aus",
  select: "Auswahl",
  number: "Wert"
};
var is = Object.defineProperty, rs = Object.getOwnPropertyDescriptor, N = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? rs(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && is(e, s, r), r;
};
const ns = 2, et = 1024 * 1024, tt = 3, st = 8, as = "mp4a.40.2";
function os(t, e, s) {
  const i = [...t].sort((l, h) => l.start - h.start), r = i.filter(
    (l) => l.start <= e && e < l.start + l.duration
  );
  let n = r.find((l) => l.stream_key === s) ?? r[0];
  if (!n) {
    const l = i.filter((h) => h.start + h.duration > e);
    n = l.find(
      (h) => h.start === l[0]?.start && h.stream_key === s
    ) ?? l[0];
  }
  if (!n) return [];
  let a = 0;
  return i.filter(
    (l) => l.stream_key === n.stream_key && l.start + l.duration > e
  ).map((l) => {
    const h = { segment: l, mediaStart: a };
    return a += l.duration, h;
  });
}
function ls(t, e) {
  for (const i of t) {
    if (e < i.segment.start) return i.mediaStart;
    if (e < i.segment.start + i.segment.duration)
      return i.mediaStart + (e - i.segment.start);
  }
  const s = t[t.length - 1];
  return s ? s.mediaStart + s.segment.duration : 0;
}
function ae(t, e) {
  for (const i of t)
    if (e < i.mediaStart + i.segment.duration)
      return i.segment.start + Math.max(0, e - i.mediaStart);
  const s = t[t.length - 1];
  return s ? s.segment.start + s.segment.duration : 0;
}
function vt(t, e) {
  const [s, i, r, n] = [0, 1, 2, 3].map((a) => e.charCodeAt(a));
  for (let a = 0; a + 8 < t.length; a += 1)
    if (t[a] === s && t[a + 1] === i && t[a + 2] === r && t[a + 3] === n)
      return a;
  return -1;
}
function hs(t) {
  return vt(t, "mp4a") !== -1;
}
function ds(t) {
  const e = vt(t, "avcC");
  if (e === -1) return null;
  const s = t[e + 5], i = t[e + 6], r = t[e + 7];
  if (s === void 0 || r === void 0) return null;
  const n = (a) => a.toString(16).padStart(2, "0");
  return `avc1.${n(s)}${n(i)}${n(r)}`;
}
function ft(t) {
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
const cs = (t) => t instanceof DOMException && t.name === "QuotaExceededError";
let B = class extends E {
  constructor() {
    super(...arguments), this.segments = [], this.seekTo = 0, this.segmentUrlBase = "/api/kustos_vision/segment", this.message = "", this.loadingRun = !1, this.withAudio = !0, this.placed = [], this.appended = /* @__PURE__ */ new Set(), this.accepted = 0, this.loading = !1, this.generation = 0, this.wired = !1, this.recoveries = 0;
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
        const e = ae(this.placed, t.currentTime);
        this.clockUtc = e, this.dispatchEvent(
          new CustomEvent("positionchange", {
            detail: { time: e },
            bubbles: !0,
            composed: !0
          })
        );
      }
    }), t.addEventListener("seeked", () => {
      this.placed.length > 0 && (this.clockUtc = ae(this.placed, t.currentTime));
    }), t.addEventListener("seeking", () => this.onSeeking()), t.addEventListener("waiting", () => this.skipHole()), t.addEventListener("error", () => {
      const e = t.error;
      if (e) {
        if (this.recoveries < st && this.placed.length > 0) {
          this.recoveries += 1;
          const s = ae(this.placed, t.currentTime) + tt * this.recoveries;
          console.warn(
            `kustos_vision: decoder refused playback (${e.message || e.code}), skipping ${tt * this.recoveries}s ahead (${this.recoveries}/${st})`
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
    const r = s.mediaStart + (t - s.segment.start);
    if (this.isBuffered(i, r)) {
      i.currentTime = r;
      return;
    }
    const n = this.placed.find(
      (a) => !this.appended.has(a.segment.path)
    );
    if (this.carry?.path === s.segment.path || n?.segment.path === s.segment.path) {
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
    const s = this.placed.find((n) => e < n.mediaStart + n.segment.duration);
    if (!s) return;
    const i = this.placed.find(
      (n) => !this.appended.has(n.segment.path)
    );
    if (this.carry?.path === s.segment.path || i?.segment.path === s.segment.path) {
      this.pump();
      return;
    }
    if (!this.appended.has(s.segment.path)) {
      this.load(ae(this.placed, e), s.segment.stream_key);
      return;
    }
    const r = t.buffered;
    if (r.length > 0 && e < r.start(0)) {
      this.load(ae(this.placed, e), s.segment.stream_key);
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
    const n = this.generation;
    if (this.message = "", this.gapAt = void 0, this.segments.length === 0) {
      this.message = "Für diesen Zeitraum ist nichts aufgezeichnet.";
      return;
    }
    if (!("MediaSource" in window)) {
      this.message = "Dieser Browser unterstützt die Wiedergabe nicht.";
      return;
    }
    this.loadingRun = !0;
    const a = t ?? this.seekTo ?? this.segments[0].start;
    if (this.placed = os(this.segments, a, e), this.placed.length === 0) {
      this.message = "Ab diesem Zeitpunkt ist nichts mehr aufgezeichnet.";
      return;
    }
    this.startup = {
      mediaTime: ls(this.placed, a),
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
      if (n !== this.generation) return;
      try {
        l = await this.inspect(this.placed[0].segment);
      } catch (f) {
        this.message = S(f);
        return;
      }
    }
    if (n !== this.generation) return;
    if (!l) {
      this.message = "Diese Aufnahme ist nicht H.264. Die Wiedergabe im Panel unterstützt derzeit nur H.264; die Datei selbst ist unbeschädigt und lässt sich herunterladen.";
      return;
    }
    const h = `video/mp4; codecs="${l}"`, g = `video/mp4; codecs="${l}, ${as}"`, v = this.withAudio ? g : h, u = MediaSource.isTypeSupported(v) ? v : MediaSource.isTypeSupported(h) ? h : null;
    if (!u) {
      this.message = `Dieser Browser kann ${l} nicht abspielen.`;
      return;
    }
    const b = new MediaSource();
    this.media = b, this.objectUrl = URL.createObjectURL(b), await this.updateComplete;
    const m = this.video();
    m && (this.wire(m), m.src = this.objectUrl, b.addEventListener(
      "sourceopen",
      () => {
        if (n === this.generation)
          try {
            const f = b.addSourceBuffer(u);
            f.mode = "segments", this.buffer = f, f.addEventListener("updateend", () => void this.pump());
            const C = this.placed[this.placed.length - 1];
            C && (b.duration = C.mediaStart + C.segment.duration), this.pump();
          } catch (f) {
            this.message = S(f);
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
    return this.withAudio = hs(s), ds(s);
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
    const [n, a] = await Promise.all([
      this.api.authorizedFetch(this.urlFor(t), {
        headers: { Range: `bytes=0-${i.init_end - 1}` }
      }),
      this.api.authorizedFetch(this.urlFor(t), {
        headers: { Range: `bytes=${r.offset}-${i.data_end - 1}` }
      })
    ]);
    return n.status !== 206 || a.status !== 206 ? null : {
      init: new Uint8Array(await n.arrayBuffer()),
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
      let r;
      const n = (l) => {
        r = l;
      }, a = () => {
        e.removeEventListener("error", n), e.removeEventListener("updateend", a), r ? i(new Error("Der Puffer hat die Daten abgelehnt.")) : s();
      };
      e.addEventListener("error", n), e.addEventListener("updateend", a);
      try {
        e.appendBuffer(t);
      } catch (l) {
        e.removeEventListener("error", n), e.removeEventListener("updateend", a), i(l);
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
    return r.length === 0 || i <= r.start(0) ? !1 : (await new Promise((n) => {
      e.addEventListener("updateend", () => n(), { once: !0 }), e.remove(r.start(0), i);
    }), !0);
  }
  /** Keep a little footage buffered ahead of the playhead. */
  async pump() {
    const t = this.buffer, e = this.media;
    if (!t || !e || t.updating || this.loading || e.readyState !== "open") return;
    const s = this.video();
    if (!this.carry) {
      const i = this.placed.find((n) => !this.appended.has(n.segment.path));
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
      if (s && this.appended.size > 0 && (s.buffered.length > 0 ? s.buffered.end(s.buffered.length - 1) : 0) - s.currentTime > ns * (this.placed[0]?.segment.duration ?? 0))
        return;
      const r = this.generation;
      this.loading = !0;
      try {
        const n = this.startup !== void 0 ? Math.max(0, this.startup.mediaTime - i.mediaStart) : 0, a = await this.fetchRanged(
          i.segment,
          n,
          this.startup?.pastRefusal ?? !1
        );
        let l, h = null;
        if (a ? (l = a.data, h = a.init) : l = await this.fetchSegment(i.segment), !l.ok) throw new Error(`HTTP ${l.status}`);
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
          pending: h ?? (l.body ? new Uint8Array(0) : new Uint8Array(await l.arrayBuffer())),
          firstOfSegment: !0
        }, h && !l.body) {
          const g = new Uint8Array(await l.arrayBuffer()), v = new Uint8Array(h.length + g.length);
          v.set(h), v.set(g, h.length), this.carry.pending = v;
        }
        if (r !== this.generation) return;
      } catch (n) {
        this.appended.add(i.segment.path), console.warn(
          "kustos_vision: segment could not be fetched",
          i.segment.path,
          n
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
        if (e.pending.length >= et || i) {
          const r = e.pending.subarray(0, et);
          try {
            await this.appendOnce(r);
          } catch (n) {
            if (s !== this.generation) return;
            if (cs(n)) {
              if (await this.evictBehind(t)) continue;
              return;
            }
            console.warn(
              "kustos_vision: segment could not be appended",
              e.path,
              n
            ), e.reader && e.reader.cancel().catch(() => {
            }), this.carry = void 0;
            return;
          }
          if (s !== this.generation) return;
          e.pending = e.pending.subarray(r.length), e.firstOfSegment && (this.accepted += 1, e.firstOfSegment = !1, this.loadingRun = !1, this.applyStartup()), this.nudgePlayback(t);
          continue;
        }
        if (e.reader) {
          const { value: r, done: n } = await e.reader.read();
          if (s !== this.generation) return;
          if (r && r.length > 0) {
            const a = new Uint8Array(e.pending.length + r.length);
            a.set(e.pending), a.set(r, e.pending.length), e.pending = a;
          }
          n && (e.reader = null);
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
      ${this.clockUtc !== void 0 && !this.message && this.gapAt === void 0 ? o`<div class="clock">${ft(this.clockUtc)}</div>` : c}
      ${this.gapAt !== void 0 ? o`<div class="gap">
            Um ${new Date(this.gapAt * 1e3).toLocaleTimeString()} liegt keine
            Aufnahme vor.
          </div>` : c}
      ${this.message ? o`<div class="overlay">${this.message}</div>` : c}
      ${this.loadingRun && !this.message && this.gapAt === void 0 ? o`<div class="overlay">Lade Aufnahme …</div>` : c}
    `;
  }
};
B.styles = R`
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
N([
  p({ attribute: !1 })
], B.prototype, "api", 2);
N([
  p({ attribute: !1 })
], B.prototype, "segments", 2);
N([
  p({ type: Number })
], B.prototype, "seekTo", 2);
N([
  p()
], B.prototype, "segmentUrlBase", 2);
N([
  d()
], B.prototype, "message", 2);
N([
  d()
], B.prototype, "gapAt", 2);
N([
  d()
], B.prototype, "clockUtc", 2);
N([
  d()
], B.prototype, "loadingRun", 2);
B = N([
  P("kustos-vision-player")
], B);
var us = Object.defineProperty, ps = Object.getOwnPropertyDescriptor, j = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ps(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && us(e, s, r), r;
};
const it = 8, rt = 1.2;
let H = class extends E {
  constructor() {
    super(...arguments), this.entityId = "", this.muted = !0, this.mode = "idle", this.message = "", this.nowSeconds = 0, this.fullscreen = !1, this.zoom = { scale: 1, x: 0, y: 0 }, this.pointers = /* @__PURE__ */ new Map(), this.visible = !1, this.starting = !1, this.onFullscreenChange = () => {
      this.fullscreen = this.isFullscreen(), this.fullscreen || (this.zoom = { scale: 1, x: 0, y: 0 });
    }, this.onWheel = (t) => {
      if (!this.fullscreen) return;
      t.preventDefault();
      const { scale: e, x: s, y: i } = this.zoom, r = t.deltaY < 0 ? rt : 1 / rt, n = Math.min(it, Math.max(1, e * r));
      if (n === e) return;
      const a = this.getBoundingClientRect(), l = t.clientX - a.left, h = t.clientY - a.top, g = n / e;
      this.zoom = this.clampedZoom(
        n,
        l - (l - s) * g,
        h - (h - i) * g
      );
    }, this.onDoubleClick = () => {
      this.fullscreen && (this.zoom = { scale: 1, x: 0, y: 0 });
    }, this.onPointerDown = (t) => {
      if (!this.fullscreen) return;
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
        i = Math.min(it, Math.max(1, e.scale * (s.span / e.span)));
      else if (e.scale === 1)
        return;
      const r = i / e.scale;
      this.zoom = this.clampedZoom(
        i,
        s.midX - (e.midX - e.x) * r,
        s.midY - (e.midY - e.y) * r
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
    }), this.observer.observe(this), this.addEventListener("fullscreenchange", this.onFullscreenChange), document.addEventListener("fullscreenchange", this.onFullscreenChange), this.addEventListener("wheel", this.onWheel, { passive: !1 }), this.addEventListener("dblclick", this.onDoubleClick), this.addEventListener("pointerdown", this.onPointerDown), this.addEventListener("pointermove", this.onPointerMove), this.addEventListener("pointerup", this.onPointerUp), this.addEventListener("pointercancel", this.onPointerUp);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.clockTimer !== void 0 && clearInterval(this.clockTimer), this.clockTimer = void 0, this.observer?.disconnect(), this.observer = void 0, this.removeEventListener("fullscreenchange", this.onFullscreenChange), document.removeEventListener("fullscreenchange", this.onFullscreenChange), this.removeEventListener("wheel", this.onWheel), this.removeEventListener("dblclick", this.onDoubleClick), this.removeEventListener("pointerdown", this.onPointerDown), this.removeEventListener("pointermove", this.onPointerMove), this.removeEventListener("pointerup", this.onPointerUp), this.removeEventListener("pointercancel", this.onPointerUp), this.stop();
  }
  // --------------------------------------------------------------------
  // Fullscreen and the loupe
  // --------------------------------------------------------------------
  /**
   * Whether this very element fills the screen.
   *
   * document.fullscreenElement is retargeted at shadow boundaries and
   * answers with the outermost host, never with an element nested in
   * shadow roots like this one; the containing root's view is the one
   * that names this element itself.
   */
  isFullscreen() {
    const t = this.getRootNode();
    return (t instanceof ShadowRoot ? t.fullscreenElement : document.fullscreenElement) === this;
  }
  /** Fill the screen with this picture, or step back out of it. */
  async toggleFullscreen() {
    this.isFullscreen() ? await document.exitFullscreen() : await this.requestFullscreen();
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
    const t = this.getBoundingClientRect(), e = [...this.pointers.values()], s = e.reduce((n, a) => n + a.x, 0) / e.length - t.left, i = e.reduce((n, a) => n + a.y, 0) / e.length - t.top, r = e.length >= 2 ? Math.hypot(e[0].x - e[1].x, e[0].y - e[1].y) : null;
    return { midX: s, midY: i, span: r };
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
    this.mode = "error", this.message = S(t);
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
    const t = ["webrtc", "hls", "mjpeg"].includes(this.mode), { scale: e, x: s, y: i } = this.zoom;
    return o`<div
      class="stage"
      style="transform: translate(${s}px, ${i}px) scale(${e}); cursor: ${this.fullscreen && e > 1 ? "grab" : "default"}"
    >
      ${this.renderPicture()}
    </div>
    ${t ? o`<div class="clock">${ft(this.nowSeconds)}</div>` : c}
    ${this.fullscreen ? o`<button
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
    ${this.fullscreen && e === 1 ? o`<div class="zoomhint">
          Mausrad oder zwei Finger: Lupe · Ziehen: verschieben ·
          Doppeltipp: zurücksetzen · Esc: verlassen
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
H.styles = R`
    :host {
      display: block;
      position: relative;
      /* The letterbox behind a 16:9 picture, dark in every theme for the
         same reason the player chrome is: it frames video, not text. */
      background: #111;
      aspect-ratio: 16 / 9;
      overflow: hidden;
    }
    :host(:fullscreen) {
      /* The screen decides the shape now, not the tile. */
      aspect-ratio: auto;
      width: 100%;
      height: 100%;
      /* The loupe's fingers, not the browser's gestures. */
      touch-action: none;
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
      bottom: 8px;
      left: 8px;
    }
    .exit {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      cursor: pointer;
    }
    /* The clock makes room for the exit button while it is on screen. */
    :host(:fullscreen) .clock {
      right: 56px;
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
j([
  p({ attribute: !1 })
], H.prototype, "hass", 2);
j([
  p()
], H.prototype, "entityId", 2);
j([
  p({ type: Boolean })
], H.prototype, "muted", 2);
j([
  d()
], H.prototype, "mode", 2);
j([
  d()
], H.prototype, "message", 2);
j([
  d()
], H.prototype, "nowSeconds", 2);
j([
  d()
], H.prototype, "fullscreen", 2);
j([
  d()
], H.prototype, "zoom", 2);
H = j([
  P("kustos-vision-live-stream")
], H);
var gs = Object.defineProperty, ms = Object.getOwnPropertyDescriptor, X = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ms(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && gs(e, s, r), r;
};
const bs = ["ptz_up", "ptz_left", "ptz_right", "ptz_down", "siren_on", "siren_off"], vs = ["light", "siren", "privacy_mode"];
let L = class extends E {
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
      this.error = S(s);
    } finally {
      this.busy = "";
    }
  }
  renderButton(t, e, s) {
    return o`<button
      class="secondary compact"
      title=${te(t)}
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
    for (const i of bs)
      t.includes(i) && s.push(this.renderButton(i, ts[i] ?? te(i)));
    for (const i of vs)
      t.includes(i) && s.push(
        this.renderButton(i, `${te(i)} an`, !0),
        this.renderButton(i, `${te(i)} aus`, !1)
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
        ${t ? o`<button
              class="secondary compact"
              title="Vollbild (mit Lupe per Mausrad)"
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
L.styles = [
  K,
  R`
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
X([
  p({ attribute: !1 })
], L.prototype, "hass", 2);
X([
  p({ attribute: !1 })
], L.prototype, "api", 2);
X([
  p({ attribute: !1 })
], L.prototype, "camera", 2);
X([
  p()
], L.prototype, "viewId", 2);
X([
  d()
], L.prototype, "busy", 2);
X([
  d()
], L.prototype, "error", 2);
L = X([
  P("kustos-vision-camera-tile")
], L);
var fs = Object.defineProperty, ys = Object.getOwnPropertyDescriptor, ge = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? ys(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && fs(e, s, r), r;
};
let Q = class extends E {
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
Q.styles = R`
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
ge([
  p({ attribute: !1 })
], Q.prototype, "hass", 2);
ge([
  p({ attribute: !1 })
], Q.prototype, "api", 2);
ge([
  p({ attribute: !1 })
], Q.prototype, "view", 2);
ge([
  p({ attribute: !1 })
], Q.prototype, "cameras", 2);
Q = ge([
  P("kustos-vision-live-view")
], Q);
var ws = Object.defineProperty, $s = Object.getOwnPropertyDescriptor, V = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? $s(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && ws(e, s, r), r;
};
const xs = 120;
let D = class extends E {
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
    }, xs);
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
    if (t.length < 2) return c;
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
              </span>` : c}`
    )}
    </div>`;
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
                </div>` : c}
          ${this.renderGrid()}
        </div>
        ${this.renderScale()}
        ${this.blocks.length === 0 ? o`<div class="empty">An diesem Tag wurde nichts aufgezeichnet.</div>` : c}
      </div>
    `;
  }
};
D.styles = R`
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
V([
  p({ type: Number })
], D.prototype, "from", 2);
V([
  p({ type: Number })
], D.prototype, "to", 2);
V([
  p({ attribute: !1 })
], D.prototype, "blocks", 2);
V([
  p({ attribute: !1 })
], D.prototype, "segments", 2);
V([
  p({ type: Number })
], D.prototype, "position", 2);
V([
  p()
], D.prototype, "thumbnailUrlBase", 2);
V([
  p({ attribute: !1 })
], D.prototype, "api", 2);
V([
  d()
], D.prototype, "hover", 2);
V([
  d()
], D.prototype, "dragging", 2);
V([
  d()
], D.prototype, "preview", 2);
D = V([
  P("kustos-vision-timeline")
], D);
var ks = Object.defineProperty, _s = Object.getOwnPropertyDescriptor, w = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? _s(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && ks(e, s, r), r;
};
const nt = 25, Se = [
  { value: "high", label: "Beste Qualität", share: "etwa 120 %" },
  { value: "balanced", label: "Ausgewogen", share: "etwa 90 %" },
  { value: "compact", label: "Kompakt", share: "etwa 65 %" },
  { value: "small", label: "Klein", share: "etwa 45 %" }
];
function at(t) {
  const e = /* @__PURE__ */ new Date(`${t}T00:00:00`);
  e.setDate(e.getDate() + 1);
  const s = (i) => String(i).padStart(2, "0");
  return `${e.getFullYear()}-${s(e.getMonth() + 1)}-${s(e.getDate())}`;
}
let y = class extends E {
  constructor() {
    super(...arguments), this.cameras = [], this.stampAvailable = !1, this.camera = "", this.stream = "", this.day = "", this.days = [], this.blocks = [], this.segments = [], this.position = 0, this.seekTo = 0, this.busy = !1, this.scrubbing = !1, this.downloading = !1, this.stampExport = !1, this.stampQuality = "balanced", this.error = "", this.rangeFromDay = "", this.rangeFromTime = "", this.rangeToDay = "", this.rangeToTime = "", this.rangeDay = "";
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
      this.error = S(e);
    } finally {
      this.busy = !1;
    }
  }
  async loadDay() {
    if (!this.camera || !this.day) {
      this.blocks = [], this.segments = [];
      return;
    }
    this.rangeDay !== this.day && (this.rangeDay = this.day, this.rangeFromDay = this.day, this.rangeFromTime = "00:00", this.rangeToDay = at(this.day), this.rangeToTime = "00:00");
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
      this.error = S(s);
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
      t.add(e), t.add(at(e));
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
    if (s - e > nt * 3600)
      return `Ein Export deckt höchstens ${nt} Stunden ab.`;
  }
  async downloadRange() {
    const t = this.rangeBounds();
    if (t) {
      this.downloading = !0, this.error = "";
      try {
        const e = await this.api.signedUrl(this.exportUrlFor(...t)), s = document.createElement("a");
        s.href = e, s.download = "", s.style.display = "none", this.renderRoot.appendChild(s), s.click(), s.remove();
      } catch (e) {
        this.error = S(e);
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
      this.error = S(t);
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

          <div class="card">
            <h2>Download</h2>
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
                  @change=${(e) => {
      this.stampExport = e.target.checked;
    }}
                />
                Zeitstempel einbrennen
              </label>
              ${this.stampExport && this.stampAvailable ? o`<div class="picker">
                    <label>Qualität</label>
                    <kustos-vision-select
                      compact
                      .options=${Se.map(({ value: e, label: s }) => ({
      value: e,
      label: s
    }))}
                      .value=${this.stampQuality}
                      @value-changed=${(e) => this.stampQuality = e.detail.value}
                    ></kustos-vision-select>
                  </div>` : c}
            </div>
            <p class="hint">
              ${this.segments.length === 0 ? "Für den gewählten Tag ist nichts aufgezeichnet." : this.stampExport && this.stampAvailable ? `Das Video wird neu kodiert und die Aufnahmezeit ins Bild geschrieben; das dauert etwa so lange wie das Material selbst. Erwartete Größe bei „${Se.find(
      (e) => e.value === this.stampQuality
    )?.label ?? this.stampQuality}": ${Se.find(
      (e) => e.value === this.stampQuality
    )?.share ?? "?"} des Roh-Downloads (gemessen an HD-Tagmaterial).` + (this.stream === "" && this.streamKeys.length > 1 ? " Eingebrannt wird der Stream mit dem meisten Material; in der Auswahl lässt sich ein bestimmter wählen." : "") : "Die Segmente werden ohne Neukodierung zusammengefügt."}
            </p>

            <div class="row" style="margin-top:12px">
              <div>
                <label>Von</label>
                <div class="rangefields">
                  <kustos-vision-select
                    compact
                    class="rangeday"
                    .options=${this.days.map((e) => ({ value: e, label: e }))}
                    .value=${this.rangeFromDay}
                    @value-changed=${(e) => this.rangeFromDay = e.detail.value}
                  ></kustos-vision-select>
                  <input
                    class="rangetime"
                    type="time"
                    step="60"
                    .value=${this.rangeFromTime}
                    @change=${(e) => this.rangeFromTime = e.target.value}
                  />
                </div>
              </div>
              <div>
                <label>Bis</label>
                <div class="rangefields">
                  <kustos-vision-select
                    compact
                    class="rangeday"
                    .options=${this.rangeToDays().map((e) => ({
      value: e,
      label: e
    }))}
                    .value=${this.rangeToDay}
                    @value-changed=${(e) => this.rangeToDay = e.detail.value}
                  ></kustos-vision-select>
                  <input
                    class="rangetime"
                    type="time"
                    step="60"
                    .value=${this.rangeToTime}
                    @change=${(e) => this.rangeToTime = e.target.value}
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
          </div>
        </div>
      </div>
    `;
  }
};
y.styles = [
  K,
  R`
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
      /* The two cards under the picture share the width and wrap when it
         runs out. */
      .cards {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .cards .card {
        flex: 1 1 320px;
      }
      /* Secondary controls now: each picker keeps a modest width instead
         of stretching across the card. */
      .picker {
        width: 200px;
      }
      /* One range bound: its date dropdown and its time side by side. */
      .rangefields {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .rangefields .rangeday {
        width: 140px;
      }
      .rangefields .rangetime {
        width: 110px;
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
w([
  p({ attribute: !1 })
], y.prototype, "api", 2);
w([
  p({ attribute: !1 })
], y.prototype, "cameras", 2);
w([
  p({ type: Boolean })
], y.prototype, "stampAvailable", 2);
w([
  d()
], y.prototype, "camera", 2);
w([
  d()
], y.prototype, "stream", 2);
w([
  d()
], y.prototype, "day", 2);
w([
  d()
], y.prototype, "days", 2);
w([
  d()
], y.prototype, "blocks", 2);
w([
  d()
], y.prototype, "segments", 2);
w([
  d()
], y.prototype, "position", 2);
w([
  d()
], y.prototype, "seekTo", 2);
w([
  d()
], y.prototype, "busy", 2);
w([
  d()
], y.prototype, "downloading", 2);
w([
  d()
], y.prototype, "stampExport", 2);
w([
  d()
], y.prototype, "stampQuality", 2);
w([
  d()
], y.prototype, "error", 2);
w([
  d()
], y.prototype, "rangeFromDay", 2);
w([
  d()
], y.prototype, "rangeFromTime", 2);
w([
  d()
], y.prototype, "rangeToDay", 2);
w([
  d()
], y.prototype, "rangeToTime", 2);
y = w([
  P("kustos-vision-recordings")
], y);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const As = { CHILD: 2 }, Ss = (t) => (...e) => ({ _$litDirective$: t, values: e });
let Es = class {
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
const { I: Ts } = Lt, ot = (t) => t, lt = () => document.createComment(""), oe = (t, e, s) => {
  const i = t._$AA.parentNode, r = e === void 0 ? t._$AB : e._$AA;
  if (s === void 0) {
    const n = i.insertBefore(lt(), r), a = i.insertBefore(lt(), r);
    s = new Ts(n, a, t, t.options);
  } else {
    const n = s._$AB.nextSibling, a = s._$AM, l = a !== t;
    if (l) {
      let h;
      s._$AQ?.(t), s._$AM = t, s._$AP !== void 0 && (h = t._$AU) !== a._$AU && s._$AP(h);
    }
    if (n !== r || l) {
      let h = s._$AA;
      for (; h !== n; ) {
        const g = ot(h).nextSibling;
        ot(i).insertBefore(h, r), h = g;
      }
    }
  }
  return s;
}, G = (t, e, s = t) => (t._$AI(e, s), t), Cs = {}, Ds = (t, e = Cs) => t._$AH = e, Os = (t) => t._$AH, Ee = (t) => {
  t._$AR(), t._$AA.remove();
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ht = (t, e, s) => {
  const i = /* @__PURE__ */ new Map();
  for (let r = e; r <= s; r++) i.set(t[r], r);
  return i;
}, yt = Ss(class extends Es {
  constructor(t) {
    if (super(t), t.type !== As.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(t, e, s) {
    let i;
    s === void 0 ? s = e : e !== void 0 && (i = e);
    const r = [], n = [];
    let a = 0;
    for (const l of t) r[a] = i ? i(l, a) : a, n[a] = s(l, a), a++;
    return { values: n, keys: r };
  }
  render(t, e, s) {
    return this.dt(t, e, s).values;
  }
  update(t, [e, s, i]) {
    const r = Os(t), { values: n, keys: a } = this.dt(e, s, i);
    if (!Array.isArray(r)) return this.ut = a, n;
    const l = this.ut ??= [], h = [];
    let g, v, u = 0, b = r.length - 1, m = 0, f = n.length - 1;
    for (; u <= b && m <= f; ) if (r[u] === null) u++;
    else if (r[b] === null) b--;
    else if (l[u] === a[m]) h[m] = G(r[u], n[m]), u++, m++;
    else if (l[b] === a[f]) h[f] = G(r[b], n[f]), b--, f--;
    else if (l[u] === a[f]) h[f] = G(r[u], n[f]), oe(t, h[f + 1], r[u]), u++, f--;
    else if (l[b] === a[m]) h[m] = G(r[b], n[m]), oe(t, r[u], r[b]), b--, m++;
    else if (g === void 0 && (g = ht(a, m, f), v = ht(l, u, b)), g.has(l[u])) if (g.has(l[b])) {
      const C = v.get(a[m]), ke = C !== void 0 ? r[C] : null;
      if (ke === null) {
        const Re = oe(t, r[u]);
        G(Re, n[m]), h[m] = Re;
      } else h[m] = G(ke, n[m]), oe(t, r[u], ke), r[C] = null;
      m++;
    } else Ee(r[b]), b--;
    else Ee(r[u]), u++;
    for (; m <= f; ) {
      const C = oe(t, h[f + 1]);
      G(C, n[m]), h[m++] = C;
    }
    for (; u <= b; ) {
      const C = r[u++];
      C !== null && Ee(C);
    }
    return this.ut = a, Ds(t, h), J;
  }
}), zs = 150;
class wt {
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
        const r = this.before.get(i);
        if (r === void 0) continue;
        const n = r - s.getBoundingClientRect().top;
        n !== 0 && s.animate(
          [{ transform: `translateY(${n}px)` }, { transform: "none" }],
          { duration: zs, easing: "ease-out" }
        );
      }
      this.before.clear();
    }
  }
}
var Ps = Object.defineProperty, Ms = Object.getOwnPropertyDescriptor, _ = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Ms(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Ps(e, s, r), r;
};
function Bs(t) {
  const e = t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z0-9]/.test(e) ? e : `kamera_${e}`;
}
let $ = class extends E {
  constructor() {
    super(...arguments), this.capabilityKeys = [], this.available = [], this.views = [], this.allCameras = [], this.slug = "", this.name = "", this.streams = [], this.capabilities = {}, this.retentionDays = null, this.enabled = !0, this.viewSettings = {}, this.controls = [], this.candidates = [], this.busy = !1, this.error = "", this.memberFlip = new wt(), this.baseline = "", this.unsaved = {
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
    super.connectedCallback(), this.camera && (this.slug = this.camera.slug, this.name = this.camera.name, this.streams = this.camera.streams.map((t) => ({ ...t })), this.capabilities = structuredClone(this.camera.capabilities), this.retentionDays = this.camera.retention_days, this.enabled = this.camera.enabled, this.viewSettings = structuredClone(this.camera.view_settings ?? {}), this.controls = structuredClone(this.camera.controls ?? []), this.loadCandidates()), this.baseline = JSON.stringify(this.payload()), Be(this.unsaved);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), He(this.unsaved);
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
        this.camera || (this.name = e.name, this.slug = Bs(e.name)), this.streams = e.streams.map((s) => ({
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
        this.error = S(e);
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
      return this.error = S(t), !1;
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
      this.error = S(s);
    } finally {
      this.busy = !1;
    }
  }
  onDragStart(t, e, s) {
    if (this.busy || !this.camera) return;
    const i = s.currentTarget, r = i.closest(".member-row");
    if (!r) return;
    s.preventDefault(), i.setPointerCapture(s.pointerId);
    const n = this.membersOf(t).map((a) => a.slug);
    this.dragging = {
      viewId: t.id,
      slug: n[e],
      startIndex: e,
      currentIndex: e,
      startY: s.clientY,
      rowHeight: r.getBoundingClientRect().height,
      order: n
    }, this.requestUpdate();
  }
  onDragMove(t) {
    const e = this.dragging;
    if (!e || e.rowHeight <= 0) return;
    const s = Math.round((t.clientY - e.startY) / e.rowHeight), i = Math.min(
      Math.max(e.startIndex + s, 0),
      e.order.length - 1
    );
    i !== e.currentIndex && (this.memberFlip.snapshot(this.memberRows()), this.dragging = { ...e, currentIndex: i }, this.requestUpdate());
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
    const s = Xe(t.binding.entity_id), i = s.length ? s : ["button", "switch", "select", "number"], r = t.binding.entity_id;
    return o`
      <div class="divided">
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
            <kustos-vision-select
              search
              .options=${[
      { value: "", label: "Bitte wählen …" },
      ...this.candidates.map((n) => ({
        value: n.entity_id,
        label: n.name || n.entity_id
      }))
    ]}
              .value=${r}
              @value-changed=${(n) => {
      const a = n.detail.value, [l] = Xe(a);
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
              .options=${i.map((n) => ({
      value: n,
      label: ss[n]
    }))}
              .value=${t.kind}
              @value-changed=${(n) => this.patchControl(e, {
      kind: n.detail.value
    })}
            ></kustos-vision-select>
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
          <span class="spacer"></span>
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
    const e = this.viewSettings[t.id], s = e?.visible ?? !1, i = this.orderedMembers(t), r = e?.capabilities ?? null, n = [
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
              ${n.length === 0 ? o`<p class="hint">Dieser Kamera ist nichts zugeordnet.</p>` : o`<div class="row">
                      ${n.map(
      (a) => o`<label style="margin:0">
                          <input
                            type="checkbox"
                            .checked=${r === null || r.includes(a)}
                            @change=${(l) => {
        const h = l.target.checked, g = new Set(r ?? n);
        h ? g.add(a) : g.delete(a), this.patchView(t.id, {
          capabilities: n.filter((v) => g.has(v))
        });
      }}
                          />
                          ${this.controls.find((l) => l.key === a)?.name || te(a)}
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
                ${yt(
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
                            title="Ziehen zum Verschieben"
                            @pointerdown=${(h) => this.onDragStart(t, l, h)}
                            @pointermove=${(h) => this.onDragMove(h)}
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
                <th>${te(e)}</th>
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
      await se() && this.dispatchEvent(
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
$.styles = [
  K,
  R`
      .member-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 12px;
        border-bottom: 1px solid var(--divider-color, ButtonBorder);
      }
    `
];
_([
  p({ attribute: !1 })
], $.prototype, "api", 2);
_([
  p({ attribute: !1 })
], $.prototype, "camera", 2);
_([
  p({ attribute: !1 })
], $.prototype, "capabilityKeys", 2);
_([
  p({ attribute: !1 })
], $.prototype, "available", 2);
_([
  p({ attribute: !1 })
], $.prototype, "views", 2);
_([
  p({ attribute: !1 })
], $.prototype, "allCameras", 2);
_([
  d()
], $.prototype, "slug", 2);
_([
  d()
], $.prototype, "name", 2);
_([
  d()
], $.prototype, "streams", 2);
_([
  d()
], $.prototype, "capabilities", 2);
_([
  d()
], $.prototype, "retentionDays", 2);
_([
  d()
], $.prototype, "enabled", 2);
_([
  d()
], $.prototype, "viewSettings", 2);
_([
  d()
], $.prototype, "controls", 2);
_([
  d()
], $.prototype, "candidates", 2);
_([
  d()
], $.prototype, "busy", 2);
_([
  d()
], $.prototype, "error", 2);
$ = _([
  P("kustos-vision-camera-editor")
], $);
var Hs = Object.defineProperty, Rs = Object.getOwnPropertyDescriptor, A = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Rs(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Hs(e, s, r), r;
};
const Vs = [
  ["boolean", "Ja/Nein"],
  ["text", "Text"],
  ["number", "Anzahl"],
  ["select", "Auswahl"]
];
let x = class extends E {
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
    super.disconnectedCallback(), He(this.unsaved);
  }
  async connectedCallback() {
    if (super.connectedCallback(), this.profile)
      this.backend = { ...this.profile.backend }, this.observations = this.profile.observations.map((t) => ({ ...t })), this.triggers = [...this.profile.triggers], this.context = this.profile.context, this.cooldown = this.profile.cooldown_seconds, this.budget = this.profile.daily_budget, this.enabled = this.profile.enabled, this.loadHistory();
    else {
      const t = this.camera.capabilities.motion_trigger?.entity_id;
      t && (this.triggers = [t]);
    }
    this.baseline = JSON.stringify(this.payload()), Be(this.unsaved);
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
      return this.error = S(t), !1;
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
      this.error = S(t);
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
              .options=${Vs.map(([s, i]) => ({ value: s, label: i }))}
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
            @click=${async () => {
      await se() && this.dispatchEvent(
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
    `;
  }
};
x.styles = K;
A([
  p({ attribute: !1 })
], x.prototype, "api", 2);
A([
  p({ attribute: !1 })
], x.prototype, "camera", 2);
A([
  p({ attribute: !1 })
], x.prototype, "profile", 2);
A([
  p({ attribute: !1 })
], x.prototype, "hass", 2);
A([
  d()
], x.prototype, "backend", 2);
A([
  d()
], x.prototype, "observations", 2);
A([
  d()
], x.prototype, "triggers", 2);
A([
  d()
], x.prototype, "addingTrigger", 2);
A([
  d()
], x.prototype, "context", 2);
A([
  d()
], x.prototype, "cooldown", 2);
A([
  d()
], x.prototype, "budget", 2);
A([
  d()
], x.prototype, "enabled", 2);
A([
  d()
], x.prototype, "aiTasks", 2);
A([
  d()
], x.prototype, "history", 2);
A([
  d()
], x.prototype, "lastRun", 2);
A([
  d()
], x.prototype, "busy", 2);
A([
  d()
], x.prototype, "error", 2);
x = A([
  P("kustos-vision-vision-editor")
], x);
var Is = Object.defineProperty, Ls = Object.getOwnPropertyDescriptor, O = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? Ls(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Is(e, s, r), r;
};
const Us = [
  ["cameras", "Kameras"],
  ["vision", "Bilderkennung"],
  ["storage", "Speicher"],
  ["views", "Ansichten"],
  ["system", "System"]
], be = 1e3 * 1e3 * 1e3;
let T = class extends E {
  constructor() {
    super(...arguments), this.section = "cameras", this.adding = !1, this.available = [], this.busy = !1, this.error = "", this.viewFlip = new wt(), this.unsavedSections = {
      isDirty: () => this.viewsDirty() || this.storageDirty(),
      save: async () => !(this.viewsDirty() && !await this.commitViews() || this.storageDirty() && !await this.saveStorage()),
      discard: () => {
        this.viewsDraft = void 0, this.resetStorageInputs();
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
    super.connectedCallback(), Be(this.unsavedSections);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), He(this.unsavedSections);
  }
  async refresh() {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: !0, composed: !0 }));
  }
  async run(t) {
    this.busy = !0, this.error = "";
    try {
      return await t(), await this.refresh(), !0;
    } catch (e) {
      return this.error = S(e), !1;
    } finally {
      this.busy = !1;
    }
  }
  async startAdding() {
    this.error = "";
    try {
      this.available = (await this.api.availableCameras()).cameras, this.adding = !0;
    } catch (t) {
      this.error = S(t);
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
        await se() && (this.adding = !1, this.editing = void 0);
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
        <td class="muted">${me(t.state.used_bytes)}</td>
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
    return this.visionFor ? o`${this.renderSubpageHeader(
      `Bilderkennung für ${this.visionFor.name}`,
      async () => {
        await se() && (this.visionFor = void 0);
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
    const { storage: t, totals: e } = this.snapshot, s = t.max_total_bytes === null ? "" : String(t.max_total_bytes / be);
    return o`
      <div class="card">
        <h2>Speicher</h2>
        <table>
          <tr>
            <th>Belegt</th>
            <td>${me(e.used_bytes)}</td>
          </tr>
          <tr>
            <th>Frei am Ort</th>
            <td>${me(e.free_bytes)}</td>
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
              ${me(e.over_budget_bytes)} über dem Budget, und mehr
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
  storageInput(t) {
    return this.renderRoot.querySelector(`#${t}`);
  }
  /** Whether the storage fields differ from what is stored. False whenever
      the section is not on screen, because then nothing can have changed. */
  storageDirty() {
    const t = this.storageInput("base_path"), e = this.storageInput("segment"), s = this.storageInput("budget");
    if (!t || !e || !s) return !1;
    const { storage: i } = this.snapshot, r = i.max_total_bytes === null ? null : i.max_total_bytes / be, n = s.value.trim() === "" ? null : Number(s.value);
    return t.value.trim() !== i.base_path || Number(e.value) !== i.segment_seconds || n !== r;
  }
  resetStorageInputs() {
    const { storage: t } = this.snapshot, e = this.storageInput("base_path");
    e && (e.value = t.base_path);
    const s = this.storageInput("segment");
    s && (s.value = String(t.segment_seconds));
    const i = this.storageInput("budget");
    i && (i.value = t.max_total_bytes === null ? "" : String(t.max_total_bytes / be));
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
        max_total_bytes: s === "" ? null : Math.round(Number(s) * be)
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
        ${t.length === 0 ? o`<p class="hint">Noch keine Ansicht angelegt.</p>` : yt(
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
          <button class="danger" @click=${() => this.removeView(e)}>
            Entfernen
          </button>
          <span class="spacer"></span>
          <span
            class="drag-handle"
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
    const s = Array.from(this.renderRoot.querySelectorAll(".view-row"));
    let i = e.currentIndex;
    s.forEach((a, l) => {
      const h = a.getBoundingClientRect();
      t.clientY >= h.top && t.clientY <= h.bottom && (i = l);
    });
    const r = s[0]?.getBoundingClientRect();
    r && t.clientY < r.top && (i = 0);
    const n = s[s.length - 1]?.getBoundingClientRect();
    n && t.clientY > n.bottom && (i = s.length - 1), i !== e.currentIndex && (this.viewFlip.snapshot(this.viewRows()), this.viewDrag = { ...e, currentIndex: i });
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
          ${Us.map(
      ([t, e]) => o`
              <button
                role="tab"
                aria-selected=${this.section === t ? "true" : "false"}
                class=${this.section === t ? "active" : ""}
                @click=${async () => {
        this.section !== t && await se() && (this.section = t, this.adding = !1, this.editing = void 0, this.visionFor = void 0);
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
T.styles = K;
O([
  p({ attribute: !1 })
], T.prototype, "api", 2);
O([
  p({ attribute: !1 })
], T.prototype, "snapshot", 2);
O([
  p({ attribute: !1 })
], T.prototype, "hass", 2);
O([
  d()
], T.prototype, "section", 2);
O([
  d()
], T.prototype, "editing", 2);
O([
  d()
], T.prototype, "adding", 2);
O([
  d()
], T.prototype, "available", 2);
O([
  d()
], T.prototype, "visionFor", 2);
O([
  d()
], T.prototype, "busy", 2);
O([
  d()
], T.prototype, "error", 2);
O([
  d()
], T.prototype, "viewsDraft", 2);
O([
  d()
], T.prototype, "viewDrag", 2);
T = O([
  P("kustos-vision-settings")
], T);
var Ns = Object.defineProperty, js = Object.getOwnPropertyDescriptor, I = (t, e, s, i) => {
  for (var r = i > 1 ? void 0 : i ? js(e, s) : e, n = t.length - 1, a; n >= 0; n--)
    (a = t[n]) && (r = (i ? a(e, s, r) : a(r)) || r);
  return i && r && Ns(e, s, r), r;
};
const le = "__recordings", q = "__settings";
globalThis.kustosVisionBuild = Xt;
let z = class extends E {
  constructor() {
    super(...arguments), this.narrow = !1, this.active = "", this.error = "", this.reconnecting = !1, this.reconnectError = "", this.lastViewId = "", this.onBeforeUnload = (t) => {
      Qt() && t.preventDefault();
    }, this.closeViewMenu = () => {
      this.viewMenu = void 0, window.removeEventListener("pointerdown", this.onMenuOutsidePointer, !0), window.removeEventListener("keydown", this.onMenuKeydown, !0), window.removeEventListener("resize", this.closeViewMenu), window.removeEventListener("scroll", this.closeViewMenu, !0);
    }, this.onMenuOutsidePointer = (t) => {
      t.composedPath().includes(this) || this.closeViewMenu();
    }, this.onMenuKeydown = (t) => {
      t.key === "Escape" && this.closeViewMenu();
    };
  }
  connectedCallback() {
    super.connectedCallback(), Qe(() => this.unsavedDialog().ask()), window.addEventListener("beforeunload", this.onBeforeUnload), this.load();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), Qe(void 0), window.removeEventListener("beforeunload", this.onBeforeUnload), this.closeViewMenu();
  }
  unsavedDialog() {
    return this.renderRoot.querySelector(
      "kustos-vision-unsaved-dialog"
    );
  }
  /** Change the tab, unless unsaved work says otherwise. */
  async switchTab(t) {
    this.active !== t && await se() && (this.active = t, t !== le && t !== q && (this.lastViewId = t));
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
    const i = t.currentTarget.getBoundingClientRect(), n = mt(i, window.innerHeight, 8);
    this.viewMenu = {
      left: n.left,
      minWidth: n.width,
      maxHeight: n.maxHeight,
      ...n.up ? { bottom: window.innerHeight - i.top } : { top: i.bottom }
    }, window.addEventListener("pointerdown", this.onMenuOutsidePointer, !0), window.addEventListener("keydown", this.onMenuKeydown, !0), window.addEventListener("resize", this.closeViewMenu), window.addEventListener("scroll", this.closeViewMenu, !0);
  }
  updated(t) {
    t.has("hass") && this.hass && !this.api && (this.api = new Je(this.hass), this.load());
  }
  async load() {
    if (this.hass) {
      this.api ??= new Je(this.hass);
      try {
        this.snapshot = await this.api.getConfig(), this.error = "", this.active || (this.active = this.snapshot.views[0]?.id ?? q, this.active !== q && (this.lastViewId = this.active));
      } catch (t) {
        const e = S(t);
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
        this.reconnectError = S(t);
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
    return e && Ae && e !== Ae ? o`<div class="stale">
        <span>
          Diese Seite zeigt noch die Oberfläche aus Version ${Ae},
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
    const e = t.views, s = e.find((r) => r.id === this.active), i = s ?? e.find((r) => r.id === this.lastViewId) ?? e[0];
    return o`<div class="tabs" role="tablist">
      ${i ? o`<button
            role="tab"
            aria-selected=${s ? "true" : "false"}
            aria-haspopup=${e.length > 1 ? "listbox" : "false"}
            class=${s ? "active" : ""}
            @click=${(r) => this.onViewsTabClick(r)}
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
        aria-selected=${this.active === le ? "true" : "false"}
        class=${this.active === le ? "active" : ""}
        @click=${() => void this.switchTab(le)}
      >
        Aufnahmen
      </button>
      <button
        role="tab"
        aria-selected=${this.active === q ? "true" : "false"}
        class=${this.active === q ? "active" : ""}
        @click=${() => void this.switchTab(q)}
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
        ${this.active === le ? o`<kustos-vision-recordings
              .api=${this.api}
              .cameras=${t.cameras}
              .stampAvailable=${t.build?.stamp_available ?? !1}
            ></kustos-vision-recordings>` : this.active === q ? o`<kustos-vision-settings
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
              </div>${c}`}
      </div>
    `;
  }
};
z.styles = [
  K,
  R`
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
I([
  p({ attribute: !1 })
], z.prototype, "hass", 2);
I([
  p({ type: Boolean, reflect: !0 })
], z.prototype, "narrow", 2);
I([
  d()
], z.prototype, "snapshot", 2);
I([
  d()
], z.prototype, "active", 2);
I([
  d()
], z.prototype, "error", 2);
I([
  d()
], z.prototype, "reconnecting", 2);
I([
  d()
], z.prototype, "reconnectError", 2);
I([
  d()
], z.prototype, "lastViewId", 2);
I([
  d()
], z.prototype, "viewMenu", 2);
z = I([
  P("kustos-vision-panel")
], z);
export {
  z as CamwatchPanel
};
