/* Éditeur des artefacts : bouton « Modifier » + enregistrement direct dans le dépôt GitHub.
   Les blocs de texte modifiables portent data-e="N" (ajouté à la construction du site).
   L'enregistrement relit la page depuis GitHub, y remplace les blocs modifiés et crée un commit. */
(function () {
  "use strict";
  if (window.__maeLoaded) return;
  window.__maeLoaded = true;

  var REPO = { owner: "14ilian", repo: "Alls-ilian-s-artifacts", branch: "main" };
  var API = "https://api.github.com/repos/" + REPO.owner + "/" + REPO.repo;
  var TOKEN_KEY = "mae-github-token";

  // Chemin du fichier dans le dépôt, ex. "a/thermo/index.html"
  var p = location.pathname;
  var i = p.indexOf("/a/");
  if (i < 0) return;
  var FILE = p.slice(i + 1);
  if (FILE.endsWith("/")) FILE += "index.html";
  FILE = decodeURIComponent(FILE);

  var editing = false;
  var originals = new Map(); // élément -> innerHTML de départ
  var dirty = new Set();

  /* ---------- Styles ---------- */
  var css = "" +
    ".mae,.mae *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;letter-spacing:normal;text-transform:none}" +
    ".mae-dock{position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;gap:6px}" +
    ".mae-btn{appearance:none;display:inline-flex;align-items:center;gap:7px;font:600 13px/1 inherit;color:#fff;background:rgba(22,24,30,.88);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:10px 14px;cursor:pointer;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.2);white-space:nowrap}" +
    ".mae-btn:hover{background:rgba(22,24,30,.98)}" +
    ".mae-btn:focus-visible,.mae-x:focus-visible{outline:2px solid #7aa2ff;outline-offset:2px}" +
    ".mae-btn.pri{background:#3d6bff;border-color:#3d6bff}.mae-btn.pri:hover{background:#2f59e8}" +
    ".mae-btn[disabled]{opacity:.5;cursor:default}" +
    ".mae-btn svg{width:14px;height:14px}" +
    ".mae[hidden]{display:none!important}" +
    ".mae-bar{position:fixed;left:0;right:0;margin:0 auto;width:fit-content;top:max(10px,env(safe-area-inset-top,0px));z-index:2147483001;display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center;" +
    "max-width:calc(100vw - 20px);padding:8px;border-radius:16px;background:rgba(22,24,30,.94);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.28);color:#fff}" +
    ".mae-bar .mae-lbl{font:600 13px/1.2 inherit;padding:0 8px 0 6px;display:flex;align-items:center;gap:8px}" +
    ".mae-bar .mae-lbl i{width:8px;height:8px;border-radius:50%;background:#ffb547;box-shadow:0 0 0 3px rgba(255,181,71,.25)}" +
    ".mae-x{appearance:none;font:700 14px/1 inherit;color:#fff;background:rgba(255,255,255,.1);border:0;border-radius:10px;min-width:36px;height:36px;padding:0 10px;cursor:pointer}" +
    ".mae-x:hover{background:rgba(255,255,255,.2)}" +
    ".mae-bar .mae-btn{box-shadow:none;padding:10px 13px;border-radius:10px}" +
    ".mae-sep{width:1px;height:22px;background:rgba(255,255,255,.18);margin:0 2px}" +
    "html.mae-on [data-e]{cursor:text;outline:1.5px dashed transparent;outline-offset:3px;border-radius:3px;transition:outline-color .15s,background-color .15s}" +
    "html.mae-on [data-e]:hover{outline-color:rgba(61,107,255,.55)}" +
    "html.mae-on [data-e]:focus{outline:2px solid #3d6bff;background-color:rgba(61,107,255,.06)}" +
    "html.mae-on [data-e].mae-dirty{outline:1.5px solid #ffb547;background-color:rgba(255,181,71,.12)}" +
    "html.mae-on [data-e].mae-dirty:focus{outline:2px solid #3d6bff}" +
    "html.mae-on{scroll-padding-top:80px}" +
    ".mae-toast{position:fixed;left:50%;bottom:max(16px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483002;max-width:min(520px,calc(100vw - 24px));" +
    "padding:12px 16px;border-radius:12px;background:#16181e;color:#fff;font:500 14px/1.45 inherit;box-shadow:0 10px 30px rgba(0,0,0,.3)}" +
    ".mae-toast.ok{background:#14532d}.mae-toast.err{background:#7f1d1d}" +
    ".mae-ov{position:fixed;inset:0;z-index:2147483003;background:rgba(8,10,14,.55);display:grid;place-items:center;padding:16px}" +
    ".mae-modal{width:min(480px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#16181e;border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.35)}" +
    ".mae-modal h2{font:700 20px/1.25 inherit;margin:0 0 8px}" +
    ".mae-modal p,.mae-modal li{font:400 14.5px/1.55 inherit;color:#3b4049;margin:0}" +
    ".mae-modal ol{margin:12px 0 14px;padding-left:20px;display:grid;gap:6px}" +
    ".mae-modal a{color:#2f59e8;font-weight:600}" +
    ".mae-modal b{color:#16181e}" +
    ".mae-modal input{width:100%;font:500 14px/1 ui-monospace,Menlo,monospace;padding:12px;border:1px solid #cfd3da;border-radius:10px;margin-top:4px;color:#16181e;background:#fff}" +
    ".mae-modal .mae-row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}" +
    ".mae-modal .mae-btn{box-shadow:none}" +
    ".mae-modal .mae-btn.ghost{background:#eef0f3;color:#16181e;border-color:#eef0f3}" +
    ".mae-modal .mae-note{font-size:12.5px;color:#6b717c;margin-top:8px}" +
    ".mae-code{position:fixed;inset:0;z-index:2147483002;display:flex;flex-direction:column;background:#0f1115;color:#e6e8ec}" +
    ".mae-code-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px max(14px,env(safe-area-inset-left,0px));border-bottom:1px solid #262a31}" +
    ".mae-code-head b{display:block;font:700 15px/1.3 inherit;color:#fff}.mae-code-head span{font:400 13px/1.45 inherit;color:#a3a8b1}" +
    ".mae-code-act{display:flex;gap:8px}.mae-code .mae-btn{box-shadow:none;border-radius:10px}" +
    ".mae-code textarea{flex:1;width:100%;border:0;outline:0;resize:none;padding:14px;background:#0f1115;color:#e6e8ec;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;overflow:auto;tab-size:2}" +
    "@media print{.mae{display:none!important}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var PEN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z"/></svg>';

  /* ---------- Barre du bas ---------- */
  var dock = el("div", "mae mae-dock");
  dock.innerHTML = '<a class="mae-btn" href="../../">← Mes artefacts</a>';
  var editBtn = el("button", "mae-btn");
  editBtn.type = "button";
  editBtn.innerHTML = PEN + "Modifier";
  var FEW = document.querySelectorAll("[data-e]").length < 5;
  editBtn.addEventListener("click", function () { FEW ? openCode() : enter(); });
  dock.appendChild(editBtn);
  document.body.appendChild(dock);

  /* ---------- Barre d'édition ---------- */
  var bar = el("div", "mae mae-bar");
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Mode édition");
  bar.hidden = true;
  bar.innerHTML =
    '<span class="mae-lbl"><i></i><span id="mae-count">Clique sur un texte pour le modifier</span></span>' +
    '<button type="button" class="mae-x" data-cmd="bold" title="Gras" aria-label="Gras"><b>G</b></button>' +
    '<button type="button" class="mae-x" data-cmd="italic" title="Italique" aria-label="Italique"><i style="font-family:Georgia,serif">I</i></button>' +
    '<span class="mae-sep"></span>' +
    '<button type="button" class="mae-btn" id="mae-code" title="Pour les textes qui ne s\'entourent pas (cartes, quiz, listes interactives)">Code de la page</button>' +
    '<button type="button" class="mae-btn" id="mae-undo" disabled>Annuler</button>' +
    '<button type="button" class="mae-btn" id="mae-quit">Quitter</button>' +
    '<button type="button" class="mae-btn pri" id="mae-save" disabled>Enregistrer</button>';
  document.body.appendChild(bar);
  bar.addEventListener("mousedown", function (e) { if (e.target.closest(".mae-x")) e.preventDefault(); });
  bar.querySelectorAll(".mae-x").forEach(function (b) {
    b.addEventListener("click", function () {
      document.execCommand(b.dataset.cmd, false, null);
      var a = document.activeElement;
      if (a && a.hasAttribute && a.hasAttribute("data-e")) check(a);
    });
  });
  q("#mae-undo").addEventListener("click", function () {
    if (!confirm("Annuler toutes les modifications non enregistrées ?")) return;
    dirty.forEach(function (n) { n.innerHTML = originals.get(n); n.classList.remove("mae-dirty"); });
    dirty.clear();
    update();
  });
  q("#mae-quit").addEventListener("click", function () {
    if (dirty.size && !confirm("Tu as " + dirty.size + " modification(s) non enregistrée(s). Quitter quand même ?")) return;
    dirty.forEach(function (n) { n.innerHTML = originals.get(n); n.classList.remove("mae-dirty"); });
    dirty.clear();
    leave();
  });
  q("#mae-save").addEventListener("click", save);
  q("#mae-code").addEventListener("click", function () {
    if (dirty.size && !confirm("Enregistre ou annule d'abord tes " + dirty.size + " modification(s) en cours. Ouvrir le code quand même (elles seront perdues) ?")) return;
    dirty.forEach(function (n) { n.innerHTML = originals.get(n); n.classList.remove("mae-dirty"); });
    dirty.clear(); update(); openCode();
  });

  function enter() {
    editing = true;
    document.documentElement.classList.add("mae-on");
    document.querySelectorAll("[data-e]").forEach(function (n) {
      if (!originals.has(n)) originals.set(n, n.innerHTML);
      n.setAttribute("contenteditable", "true");
      n.setAttribute("spellcheck", "true");
    });
    dock.hidden = true;
    bar.hidden = false;
    update();
    toast("Mode édition : clique sur n'importe quel texte entouré pour le changer.", "", 3500);
  }
  function leave() {
    editing = false;
    document.documentElement.classList.remove("mae-on");
    document.querySelectorAll("[data-e]").forEach(function (n) {
      n.removeAttribute("contenteditable");
      n.removeAttribute("spellcheck");
    });
    bar.hidden = true;
    dock.hidden = false;
  }
  function check(n) {
    if (!originals.has(n)) return;
    if (n.innerHTML !== originals.get(n)) { dirty.add(n); n.classList.add("mae-dirty"); }
    else { dirty.delete(n); n.classList.remove("mae-dirty"); }
    update();
  }
  function update() {
    var c = dirty.size;
    q("#mae-count").textContent = c ? c + " bloc" + (c > 1 ? "s" : "") + " modifié" + (c > 1 ? "s" : "") : "Clique sur un texte pour le modifier";
    q("#mae-save").disabled = !c;
    q("#mae-undo").disabled = !c;
  }
  document.addEventListener("input", function (e) {
    var n = e.target.closest && e.target.closest("[data-e]");
    if (editing && n) check(n);
  }, true);
  // Coller en texte brut, pour ne pas importer la mise en forme d'ailleurs
  document.addEventListener("paste", function (e) {
    if (!editing || !(e.target.closest && e.target.closest("[data-e]"))) return;
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, t);
  }, true);
  // Les liens et boutons à l'intérieur d'un texte ne doivent pas s'activer pendant l'édition
  document.addEventListener("click", function (e) {
    if (!editing) return;
    var n = e.target.closest && e.target.closest("[data-e]");
    if (n && e.target.closest("a")) e.preventDefault();
  }, true);
  window.addEventListener("beforeunload", function (e) {
    if (dirty.size) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Enregistrement sur GitHub ---------- */
  function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  function askToken(msg) {
    return new Promise(function (resolve) {
      var ov = el("div", "mae mae-ov");
      ov.innerHTML =
        '<div class="mae-modal" role="dialog" aria-modal="true" aria-labelledby="mae-h">' +
        '<h2 id="mae-h">Relier le site à ton GitHub</h2>' +
        (msg ? '<p style="color:#b42318;margin-bottom:8px">' + msg + "</p>" : "") +
        "<p>Pour enregistrer, le site a besoin d'une clé GitHub. À faire une seule fois sur cet appareil :</p>" +
        "<ol>" +
        '<li>Ouvre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">cette page GitHub</a>.</li>' +
        "<li>Donne-lui un nom (ex. « Site artefacts ») et une date d'expiration.</li>" +
        "<li>Dans <b>Repository access</b>, choisis <b>Only select repositories</b> puis <b>" + REPO.repo + "</b>.</li>" +
        "<li>Dans <b>Permissions</b> › <b>Repository permissions</b> › <b>Contents</b>, choisis <b>Read and write</b>.</li>" +
        "<li>Clique <b>Generate token</b>, copie la clé et colle-la ici.</li>" +
        "</ol>" +
        '<label for="mae-tok" style="font:600 13px/1 inherit">Clé GitHub</label>' +
        '<input id="mae-tok" type="password" autocomplete="off" placeholder="github_pat_…" spellcheck="false">' +
        '<p class="mae-note">La clé reste dans ce navigateur. Elle ne donne accès qu\'à ce dépôt.</p>' +
        '<div class="mae-row"><button type="button" class="mae-btn ghost" id="mae-cancel">Annuler</button>' +
        '<button type="button" class="mae-btn pri" id="mae-ok">Enregistrer la clé</button></div></div>';
      document.body.appendChild(ov);
      var inp = ov.querySelector("#mae-tok");
      setTimeout(function () { inp.focus(); }, 30);
      function done(v) { ov.remove(); resolve(v); }
      ov.querySelector("#mae-cancel").onclick = function () { done(null); };
      ov.querySelector("#mae-ok").onclick = function () { var v = inp.value.trim(); if (v) { setToken(v); done(v); } else inp.focus(); };
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ov.querySelector("#mae-ok").click(); if (e.key === "Escape") done(null); });
      ov.addEventListener("click", function (e) { if (e.target === ov) done(null); });
    });
  }

  function gh(token, path, opts) {
    opts = opts || {};
    var h = { Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28", Accept: opts.accept || "application/vnd.github+json" };
    if (opts.body) h["Content-Type"] = "application/json";
    return fetch(API + path, { method: opts.method || "GET", headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: "no-store" })
      .then(function (r) {
        if (!r.ok) { var err = new Error("GitHub " + r.status); err.status = r.status; throw err; }
        return opts.raw ? r.text() : r.json();
      });
  }

  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = "", CH = 0x8000;
    for (var k = 0; k < bytes.length; k += CH) bin += String.fromCharCode.apply(null, bytes.subarray(k, k + CH));
    return btoa(bin);
  }

  function apply(src) {
    var doc = new DOMParser().parseFromString(src, "text/html");
    var missing = 0;
    dirty.forEach(function (n) {
      var t = doc.querySelector('[data-e="' + n.getAttribute("data-e") + '"]');
      if (!t) { missing++; return; }
      var c = n.cloneNode(true);
      c.querySelectorAll("[contenteditable],[spellcheck]").forEach(function (x) { x.removeAttribute("contenteditable"); x.removeAttribute("spellcheck"); });
      t.innerHTML = c.innerHTML;
    });
    if (missing) throw new Error("missing");
    var m = src.match(/^\s*<!doctype[^>]*>/i);
    return (m ? m[0] : "<!doctype html>") + "\n" + doc.documentElement.outerHTML + "\n";
  }

  var saving = false;
  function save() {
    if (saving || !dirty.size) return;
    var token = getToken();
    (token ? Promise.resolve(token) : askToken()).then(function (tk) {
      if (!tk) return;
      saving = true;
      var sb = q("#mae-save");
      sb.disabled = true;
      sb.textContent = "Enregistrement…";
      gh(tk, rawPath(), { accept: "application/vnd.github.raw", raw: true })
        .then(function (src) { return commitFile(tk, apply(src)); })
        .then(function () {
          var n = dirty.size;
          dirty.forEach(function (x) { originals.set(x, x.innerHTML); x.classList.remove("mae-dirty"); });
          dirty.clear();
          update();
          toast("Enregistré ✓ " + n + " bloc" + (n > 1 ? "s" : "") + " mis à jour. Le site en ligne affiche la nouvelle version d'ici 1 à 2 minutes.", "ok", 6000);
        })
        .catch(function (e) {
          if (e.status === 401 || e.status === 403 || e.status === 404) {
            setToken(null);
            var why = e.status === 401 ? "La clé n'est plus valable (expirée ou supprimée)." :
              "La clé n'a pas le droit d'écrire dans ce dépôt : vérifie « Only select repositories » et « Contents : Read and write ».";
            askToken(why).then(function (t2) { saving = false; resetBtn(); if (t2) save(); });
            return;
          }
          if (e.status === 409 || e.status === 422) {
            toast("Quelqu'un a modifié le site en même temps. Réessaie « Enregistrer » : tes modifications sont toujours là.", "err", 7000);
          } else if (e.message === "missing") {
            toast("Cette page a changé sur GitHub depuis que tu l'as ouverte. Recharge-la dans une minute, puis refais la modification.", "err", 8000);
          } else {
            toast("L'enregistrement a échoué (" + (e.status ? "erreur " + e.status : "pas de connexion") + "). Tes modifications sont toujours là, réessaie.", "err", 7000);
          }
        })
        .then(function () { saving = false; resetBtn(); }, function () { saving = false; resetBtn(); });
    });
  }
  function rawPath() { return "/contents/" + FILE.split("/").map(encodeURIComponent).join("/") + "?ref=" + REPO.branch; }
  function commitFile(tk, content) {
    var title = (document.title || FILE).trim(), head;
    return gh(tk, "/git/ref/heads/" + REPO.branch)
      .then(function (ref) { head = ref.object.sha; return gh(tk, "/git/commits/" + head); })
      .then(function (cm) {
        return gh(tk, "/git/blobs", { method: "POST", body: { content: b64(content), encoding: "base64" } })
          .then(function (blob) { return gh(tk, "/git/trees", { method: "POST", body: { base_tree: cm.tree.sha, tree: [{ path: FILE, mode: "100644", type: "blob", sha: blob.sha }] } }); });
      })
      .then(function (tree) { return gh(tk, "/git/commits", { method: "POST", body: { message: "Modification de « " + title + " » depuis le site", tree: tree.sha, parents: [head] } }); })
      .then(function (c) { return gh(tk, "/git/refs/heads/" + REPO.branch, { method: "PATCH", body: { sha: c.sha } }); });
  }

  /* ---------- Mode code : pour les pages dont le texte est dans leur script ---------- */
  function openCode() {
    var token = getToken();
    (token ? Promise.resolve(token) : askToken()).then(function (tk) {
      if (!tk) return;
      var ov = el("div", "mae mae-code");
      ov.innerHTML =
        '<div class="mae-code-head"><div><b>Code de la page</b><span>Cherche ton texte avec Ctrl+F (⌘F sur Mac) et change seulement les mots. Évite de toucher aux guillemets, virgules et balises autour.</span></div>' +
        '<div class="mae-code-act"><button type="button" class="mae-btn" id="mae-c-cancel">Fermer</button><button type="button" class="mae-btn pri" id="mae-c-save" disabled>Enregistrer</button></div></div>' +
        '<textarea id="mae-c-txt" spellcheck="false" aria-label="Code de la page">Chargement depuis GitHub…</textarea>';
      document.body.appendChild(ov);
      document.documentElement.style.overflow = "hidden";
      var ta = ov.querySelector("#mae-c-txt"), sv = ov.querySelector("#mae-c-save"), orig = null;
      ta.readOnly = true;
      function close() {
        if (orig !== null && ta.value !== orig && !confirm("Fermer sans enregistrer tes changements ?")) return;
        ov.remove(); document.documentElement.style.overflow = "";
      }
      ov.querySelector("#mae-c-cancel").onclick = close;
      ta.addEventListener("input", function () { sv.disabled = ta.value === orig; });
      gh(tk, rawPath(), { accept: "application/vnd.github.raw", raw: true })
        .then(function (src) { orig = src; ta.value = src; ta.readOnly = false; ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0; })
        .catch(function (e) {
          ov.remove(); document.documentElement.style.overflow = "";
          if (e.status === 401 || e.status === 403 || e.status === 404) { setToken(null); askToken("La clé ne marche pas pour ce dépôt.").then(function (t) { if (t) openCode(); }); }
          else toast("Impossible de charger le code (" + (e.status || "pas de connexion") + ").", "err", 6000);
        });
      sv.onclick = function () {
        if (sv.disabled) return;
        sv.disabled = true; sv.textContent = "Enregistrement…";
        commitFile(tk, ta.value).then(function () {
          orig = ta.value;
          toast("Enregistré ✓ Recharge la page dans 1 à 2 minutes pour voir le résultat.", "ok", 7000);
          sv.textContent = "Enregistrer";
        }).catch(function (e) {
          sv.textContent = "Enregistrer"; sv.disabled = false;
          toast("L'enregistrement a échoué (" + (e.status ? "erreur " + e.status : "pas de connexion") + "). Ton texte est toujours là, réessaie.", "err", 7000);
        });
      };
    });
  }

  function resetBtn() { var sb = q("#mae-save"); sb.textContent = "Enregistrer"; sb.disabled = !dirty.size; }

  /* ---------- Utilitaires ---------- */
  var toastEl = null, toastT = null;
  function toast(msg, kind, ms) {
    if (toastEl) toastEl.remove();
    clearTimeout(toastT);
    toastEl = el("div", "mae mae-toast " + (kind || ""));
    toastEl.setAttribute("role", "status");
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    toastT = setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, ms || 4000);
  }
  function el(tag, cls) { var n = document.createElement(tag); n.className = cls; return n; }
  function q(s) { return document.querySelector(s); }
})();
