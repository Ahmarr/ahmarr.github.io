// The Tape, revision 2.
// One number drives the page: how much blade is out of the case (ext, in px = "mm").
// The hook is fixed to the top of the document; the case rides a reading line in the viewport,
// so scrolling literally pulls the tape out. Chapters sit at measured marks.
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tape = $("#tape"), blade = $("#blade"), nav = $("#marks"), kase = $("#case"), win = $("#win"), tag = $("#tag");
  var cut = $("#cutlist"), total = $("#total");

  var secs = [].slice.call(document.querySelectorAll("[data-mark]"));
  var pulls = [].slice.call(document.querySelectorAll("[data-pull]"));
  var hookY = 0, len = 0, base = 0, marks = [], idx = -1, ext = 0, ticking = false, quietT, lastH = 0, shownMark = "", shownMm = "";
  win.innerHTML = "<span><b></b><small></small></span>";
  var winB = win.querySelector("b"), winS = win.querySelector("small");

  function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function fmt(n) { return Math.round(n).toLocaleString("en-IN"); }
  function statusOf(s) {
    return { zero: "", work: "Completed", building: "In development", workshop: "Tools and method", beyond: "Personal", about: "Background", contact: "Contact" }[s.id];
  }

  // ---------- Measure the document and build the blade ----------
  function measure() {
    kase.style.transform = "";
    base = kase.getBoundingClientRect().top;                  // reading line (case mouth), viewport px
    hookY = docTop($("#zero")) + 56;
    var end = docTop($(".contact")) + 26;                      // tape ends beside the contact buttons
    // the tape must be able to run all the way out at max scroll, so the case can park
    var reach = document.documentElement.scrollHeight - window.innerHeight + base;
    len = Math.max(400, Math.min(end, reach - 2) - hookY);
    tape.style.top = hookY + "px";
    blade.style.height = len + "px";
    nav.style.height = len + "px";

    marks = secs.map(function (s) {
      var p = s.querySelector("[data-pull]");
      var y = p ? docTop(p) + p.offsetHeight / 2 - hookY : 0;
      return { y: Math.round(y), s: s };
    });

    // numbers every 10 cm, red at every metre; "back of the tape" over Beyond the Build
    var h = '<span class="hook"></span>';
    for (var v = 100; v < len; v += 100) h += '<span class="n' + (v % 1000 ? "" : " red") + '" style="top:' + v + 'px">' + (v % 1000 ? v / 10 : v / 1000 + "m") + "</span>";
    secs.forEach(function (s) {
      if (!s.hasAttribute("data-back")) return;
      var t = docTop(s) - hookY;
      h += '<span class="back" style="top:' + t + "px;height:" + s.offsetHeight + 'px"></span>';
    });
    blade.innerHTML = h;

    nav.innerHTML = marks.map(function (m) {
      var s = m.s, n = s.dataset.mark, pencil = s.dataset.kind === "pencil";
      return '<a class="mk' + (pencil ? " pencil" : "") + '" href="#' + s.id + '" style="top:' + m.y + 'px" aria-label="' + n + " " + s.dataset.short + (statusOf(s) ? ", " + statusOf(s) : "") + '"><span>' + n + "</span></a>";
    }).join("");

    // cut list rows are in the HTML (no layout shift); only the distances are filled in
    marks.forEach(function (m) { var td = cut.querySelector('[data-mm="' + m.s.id + '"]'); if (td) td.textContent = fmt(m.y) + " mm"; });
    // the final measurement is the visitor's own screen (CSS px), framed around the last screenful
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    document.documentElement.style.setProperty("--vph", vh + "px");
    [].forEach.call(document.querySelectorAll(".vpw"), function (e) { e.textContent = vw; });
    [].forEach.call(document.querySelectorAll(".vph"), function (e) { e.textContent = vh; });
    lastH = $("#main").offsetHeight;
    total.textContent = "Total length: " + fmt(len) + " mm";
    idx = -2; update();
  }

  // ---------- Per frame ----------
  function update() {
    ticking = false;
    var y = window.scrollY, mouth = y + base, vh = window.innerHeight;
    var tops = reduce ? null : pulls.map(function (p) { return p.getBoundingClientRect().top; });
    ext = Math.min(len, Math.max(0, mouth - hookY));
    // Case parks at the end of the tape once it's fully out
    var shift = 0;
    if (mouth > hookY + len) shift = hookY + len - mouth;
    else if (mouth < hookY) shift = hookY - mouth;
    kase.style.transform = shift ? "translateY(" + shift + "px)" : "";
    kase.classList.toggle("parked", mouth >= hookY + len - 4);
    blade.style.clipPath = "inset(-20px -20px " + (len - ext) + "px -20px)";

    var n = 0;
    for (var i = 0; i < marks.length; i++) if (ext >= marks[i].y - 2) n = i;
    var links = nav.children;
    for (var j = 0; j < links.length; j++) links[j].classList.toggle("in", marks[j].y <= ext + 2);

    var mk = marks[n].s.dataset.mark, mm = fmt(ext) + " mm";
    if (mk !== shownMark) { winB.textContent = shownMark = mk; }
    if (mm !== shownMm) { winS.textContent = shownMm = mm; }
    if (n !== idx) {
      if (idx > -2 && !reduce && kase.animate) kase.animate([{ translate: "0 0" }, { translate: "0 3px" }, { translate: "0 0" }], { duration: 140 });
      idx = n;
      var s = marks[n].s;
      tag.innerHTML = "<em>" + s.dataset.mark + "</em> · " + s.dataset.short;
      for (var k = 0; k < links.length; k++) links[k].setAttribute("aria-current", String(k === n));
    }
    // reading tag shows while moving, rests when still (it would otherwise sit over content)
    tag.classList.remove("quiet"); clearTimeout(quietT); quietT = setTimeout(function () { tag.classList.add("quiet"); }, 1400);

    // chapter strips pull sideways out of the blade as they approach the reading line
    pulls.forEach(function (p, i) {
      var v = reduce ? 1 : Math.min(1, Math.max(0, (vh * .98 - tops[i]) / (vh * .42)));
      var str = v.toFixed(3);
      if (p._p !== str) { p.style.setProperty("--p", str); p._p = str; }
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  window.addEventListener("scroll", onScroll, { passive: true });
  var rt; function remeasure() { clearTimeout(rt); rt = setTimeout(measure, 80); }
  window.addEventListener("resize", remeasure);
  // re-measure only when the content height really changes (fonts, images), not on the initial callback
  if ("ResizeObserver" in window) new ResizeObserver(function () { if ($("#main").offsetHeight !== lastH) remeasure(); }).observe($("#main"));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();

  // ---------- Easter egg: a terminal printed out of the case ----------
  // Information only. It never navigates, so it can't compete with the tape.
  var term = $("#term"), out = $("#termOut"), form = $("#termForm"), input = $("#termIn"), back = null, hist = [], hi = 0;
  function print(t, cls) { var d = document.createElement("div"); if (cls) d.className = cls; d.textContent = t; out.appendChild(d); out.scrollTop = out.scrollHeight; }
  var CMD = {
    help: function () { print("whoami   who made this\nstatus   honest project count\nmeasure  how far you've pulled\nls       marks on the tape\nstack    what the CRM runs on\nmotto    the rule\nclear    wipe the screen\nexit     put it away"); },
    whoami: function () { print("Ahmar Ali Khan: independent developer & digital creator, Mumbai."); },
    status: function () { print("completed       2  ZR Designs, Decor Furnishing\nin development  2  CRM & Sales Management System,\n                   Project Management SaaS\nexperiments     0\nplanned         2  pencilled in, not shown until real"); },
    measure: function () { print("tape out: " + fmt(ext) + " mm of " + fmt(len) + " mm (" + Math.round(ext / len * 100) + "%)\nreading:  " + marks[idx].s.dataset.mark + " " + marks[idx].s.dataset.short); },
    ls: function () { print(marks.map(function (m) { return m.s.dataset.mark + " " + m.s.dataset.short.toLowerCase().replace(/ /g, "-"); }).join("  ") + "\n(scroll to move. this terminal only reads.)"); },
    stack: function () { print("Next.js · TypeScript · PostgreSQL · Prisma"); },
    motto: function () { print("measure twice, build once."); },
    clear: function () { out.innerHTML = ""; },
    exit: function () { close(); }
  };
  function open() {
    if (!term.hidden) return;
    back = document.activeElement; term.hidden = false;
    if (!out.childNodes.length) { print("aak tape firmware · type help", "dimtxt"); }
    input.focus();
  }
  function close() { term.hidden = true; if (back && back.focus) back.focus(); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = input.value.trim(), c = raw.toLowerCase(); input.value = "";
    if (!raw) return;
    hist.push(raw); hi = hist.length;
    print("$ " + raw, "dimtxt");
    if (/^sudo\b/.test(c)) print("nice try. nothing here runs as root.");
    else if (CMD[c]) CMD[c]();
    else print("command not found: " + raw + ". try help");
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowUp" && hi > 0) { e.preventDefault(); input.value = hist[--hi]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ""; }
  });
  $("#termClose").addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if ((e.key === "`" || e.key === "~") && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
  // three quick taps on the case also open it (touch devices have no backtick)
  var taps = 0, tapT;
  kase.addEventListener("click", function () { taps++; clearTimeout(tapT); tapT = setTimeout(function () { taps = 0; }, 600); if (taps >= 3) { taps = 0; open(); } });
})();
