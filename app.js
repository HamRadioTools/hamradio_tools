(function () {
  // ---------- config via query params ----------
  const qp = new URLSearchParams(location.search);
  const MODE = (qp.get("mode") || "mock").toLowerCase(); // mock | bff | ws
  const BFF_BASE = qp.get("bff") || "";                  // e.g. https://api.hamradio.tools
  const BFF_PATH = qp.get("path") || "/api/spots";       // GET returns array like your example
  const WS_URL = qp.get("ws") || "";                     // e.g. wss://api.hamradio.tools/ws

  // Optional: let BFF return: { items: [...], server_time: "...", next_cursor: "..." }
  // But we support plain array too.
  const SUPPORTS_WRAPPED = true;

  // ---------- state ----------
  let raw = [];
  let sortKey = "spot_datetime";
  let sortDir = "desc"; // asc | desc
  let pageSize = 25;
  let currentPage = 1;
  let lastBffTopKey = "";
  let bffConnected = MODE !== "bff";
  let manualConnected = MODE !== "bff";
  let timer = null;
  let ws = null;

  // ---------- dom ----------
  const el = (id) => document.getElementById(id);

  const connPill = el("connPill");
  const refreshBtn = el("refreshBtn");
  const filtersMenuBtn = el("filtersMenuBtn");

  const q = el("q");
  const band = el("band");
  const modeFilter = el("modeFilter");
  const spottedCont = el("spottedCont");
  const spotterCont = el("spotterCont");
  const auto = el("auto");
  const interval = el("interval");

  const lastUpdate = el("lastUpdate");
  const endpointLabel = el("endpointLabel");

  const tbody = el("tbody");
  const emptyState = el("emptyState");
  const prevPageBtn = el("prevPageBtn");
  const nextPageBtn = el("nextPageBtn");
  const rowsPerPage = el("rowsPerPage");
  const pageNumberList = el("pageNumberList");

  const clearBtn = el("clearBtn");
  const exportBtn = el("exportBtn");
  const DXCC_FLAG_MAP = (typeof window !== "undefined" && window.DXCC_FLAG_MAP) ? window.DXCC_FLAG_MAP : {};

  function updateFiltersMenuButton() {
    if (!filtersMenuBtn) return;
    const open = document.body.classList.contains("filters-open");
    filtersMenuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    filtersMenuBtn.textContent = open ? "✕ Filters" : "☰ Filters";
  }

  function syncFiltersMenuForViewport() {
    if (window.matchMedia("(max-width: 900px)").matches) {
      document.body.classList.remove("filters-open");
    } else {
      document.body.classList.add("filters-open");
    }
    updateFiltersMenuButton();
  }

  // ---------- helpers ----------
  const nowIso = () => new Date().toISOString().replace("T", " ").slice(0, 19);
  const utcLabel = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return "—";
    return /\bUTC\b$/i.test(s) ? s : `${s} UTC`;
  };

  function spotKey(s) {
    return [
      s.spot_datetime ?? "",
      s.spotted ?? "",
      s.spotter ?? "",
      s.frequency ?? "",
      s.band ?? ""
    ].join("|");
  }

  function getTopSpotKey(items) {
    if (!Array.isArray(items) || items.length === 0) return "";
    const top = [...items].sort((a, b) => compare(a, b, "spot_datetime")).reverse()[0];
    return spotKey(top);
  }

  function setLastUpdateSoft(text, soft = false) {
    lastUpdate.textContent = utcLabel(text);
    if (!soft) return;
    lastUpdate.classList.remove("soft-update");
    void lastUpdate.offsetWidth;
    lastUpdate.classList.add("soft-update");
  }

  function setConn(status, level = "muted") {
    const isGood = level === "good";
    const label = isGood ? "CONNECTED" : "DISCONNECTED";

    connPill.textContent = label;
    connPill.title = String(status || "");
    connPill.style.borderColor = isGood ? "#93d6b1" : "#e0a8b2";
    connPill.style.background = isGood ? "#dff3e8" : "#f8e1e6";
    connPill.style.color = isGood ? "#1f6541" : "#7a2f3a";
    connPill.style.cursor = "pointer";
  }

  function clearViewData() {
    raw = [];
    lastBffTopKey = "";
    setLastUpdateSoft("—", false);
    fillBandSelect(raw);
    fillModeSelect(raw);
    updateView();
  }

  function setBffDisconnected(reason = "Disconnected") {
    bffConnected = false;
    stopAuto();
    setConn(reason, "bad");
    clearViewData();
  }

  async function connectBffFromPill() {
    bffConnected = true;
    try {
      await loadFromBff();
      if (auto.checked) startAuto();
    } catch (e) {
      setBffDisconnected(e.message || "BFF connection failed");
    }
  }

  function sanitizeFlagCode(code) {
    return String(code ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  }

  function resolveFlagCode(s, stationKey) {
    const direct = String(s?.[`${stationKey}_flag`] ?? "").trim();
    if (direct) return direct;
    const dxcc = String(s?.[`${stationKey}_dxcc`] ?? "").trim();
    return dxcc && DXCC_FLAG_MAP[dxcc] ? String(DXCC_FLAG_MAP[dxcc]) : "";
  }

  function renderFlagBubble(flagCode, countryHint) {
    const normalized = sanitizeFlagCode(flagCode);
    if (!normalized) return "";
    const url = `./assets/flags/${normalized}.svg`;
    return `<span class="flag flagIcon" title="${escapeHtml(countryHint)}" style="--flag-url: url('${url}')"></span>`;
  }

  function normalizeSpot(s) {
    // keep string fields trimmed
    const trim = (v) => (typeof v === "string" ? v.trim() : v);
    return {
      ...s,
      band: String(s.band ?? ""),
      mode: trim(s.mode ?? ""),
      frequency: String(s.frequency ?? ""),
      spot_datetime: String(s.spot_datetime ?? ""),
      spot_time: String(s.spot_time ?? ""),
      spotted: trim(s.spotted ?? ""),
      spotter: trim(s.spotter ?? ""),
      spotted_country: trim(s.spotted_country ?? ""),
      spotter_country: trim(s.spotter_country ?? ""),
      spotter_comment: trim(s.spotter_comment ?? ""),
      spotted_continent: trim(s.spotted_continent ?? ""),
      spotter_continent: trim(s.spotter_continent ?? ""),
      spotted_flag: trim(s.spotted_flag ?? ""),
      spotter_flag: trim(s.spotter_flag ?? ""),
      spotted_dxcc: String(s.spotted_dxcc ?? ""),
      spotter_dxcc: String(s.spotter_dxcc ?? ""),
    };
  }

  function parseMaybeNumber(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function compare(a, b, key) {
    const av = a[key];
    const bv = b[key];

    // numeric compare for frequency/band if possible
    if (key === "frequency" || key === "band") {
      const an = parseMaybeNumber(av);
      const bn = parseMaybeNumber(bv);
      if (an != null && bn != null) return an - bn;
    }

    // datetime string compare works lexicographically if "YYYY-MM-DD HH:mm:ss"
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv);
    }
    return String(av ?? "").localeCompare(String(bv ?? ""));
  }

  function computeBands(items) {
    const set = new Set(items.map(x => x.band).filter(Boolean));
    const bands = Array.from(set);
    bands.sort((a, b) => (parseMaybeNumber(a) ?? 9999) - (parseMaybeNumber(b) ?? 9999));
    return bands;
  }

  function fillBandSelect(items) {
    const bands = computeBands(items);
    const current = band.value;
    band.innerHTML = `<option value="">All</option>` + bands.map(b => `<option value="${b}">${b}m</option>`).join("");
    if (bands.includes(current)) band.value = current;
  }

  function fillModeSelect(items) {
    const set = new Set(items.map(x => String(x.mode || "").toLowerCase()).filter(Boolean));
    const modes = Array.from(set).sort((a, b) => a.localeCompare(b));
    const current = String(modeFilter.value || "").toLowerCase();
    modeFilter.innerHTML = `<option value="">All</option>` + modes.map(m => `<option value="${m}">${m.toUpperCase()}</option>`).join("");
    if (modes.includes(current)) modeFilter.value = current;
  }

  function applyFilters(items) {
    const qq = q.value.trim().toUpperCase();
    const bb = band.value;
    const mm = String(modeFilter.value || "").toLowerCase();
    const sc = spottedCont.value;
    const tc = spotterCont.value;

    return items.filter(s => {
      if (bb && s.band !== bb) return false;
      if (mm && String(s.mode || "").toLowerCase() !== mm) return false;
      if (sc && s.spotted_continent !== sc) return false;
      if (tc && s.spotter_continent !== tc) return false;

      if (qq) {
        const hay = [
          s.spotted, s.spotter, s.spotted_country, s.spotter_country, s.spotter_comment
        ].join(" ").toUpperCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }

  function applySort(items) {
    // Always keep most-recent spots at the top.
    return [...items].sort((a, b) => compare(a, b, "spot_datetime")).reverse();
  }

  function bandTagClass(b) {
    const n = parseMaybeNumber(b);
    if (n == null) return "tag";
    if (n <= 10) return "tag bad";
    if (n <= 20) return "tag warn";
    return "tag good";
  }

  function formatFreqHtml(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return `<span class="muted">—</span>`;

    const n = Number(raw);
    if (!Number.isFinite(n)) return `${escapeHtml(raw)} <span class="freqUnit">MHz</span>`;

    const fixed = n.toFixed(3);
    const [intPart, decPart] = fixed.split(".");
    const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `
      <span class="freqValue">${escapeHtml(groupedInt)}.<span class="freqDecimal">${escapeHtml(decPart)}</span></span>
      <span class="freqUnit">MHz</span>
    `;
  }

  function renderStationCard(s, stationKey) {
    const isSpotted = stationKey === "spotted";
    const callsign = s[stationKey] || "—";
    const country = s[`${stationKey}_country`] || "—";
    const continent = s[`${stationKey}_continent`] || "—";
    const dxcc = s[`${stationKey}_dxcc`] || "—";
    const countryHint = country || "Unknown country";
    const resolvedFlag = resolveFlagCode(s, stationKey);
    const flagHtml = renderFlagBubble(resolvedFlag, countryHint);

    const continentClass = (() => {
      const c = String(continent || "").toUpperCase();
      const known = new Set(["AF", "AS", "EU", "NA", "OC", "SA"]);
      return known.has(c) ? ` cont-${c.toLowerCase()}` : "";
    })();

    return `
      <div class="stationCard ${isSpotted ? "stationCardDx" : "stationCardDe"}">
        <div class="stationHead">
          <div class="stationMeta">
            <span class="continentDot${continentClass}" title="${escapeHtml(continent)}">${escapeHtml(continent)}</span>
            <span class="dxccBadge" title="${escapeHtml(country)}">${escapeHtml(dxcc)}</span>
            ${flagHtml}
          </div>
          <div class="callsignVal"><strong>${escapeHtml(callsign)}</strong></div>
        </div>
      </div>
    `;
  }

  function render(items, totalCount) {
    const streamActive = (MODE === "bff") ? bffConnected : manualConnected;
    emptyState.textContent = streamActive
      ? "No spots match the current filters."
      : "No spot stream is active.";
    emptyState.hidden = totalCount !== 0;

    const rowsHtml = items.map(s => {
      const bandLabel = s.band ? `${s.band}m` : "—";
      const modeRaw = String(s.mode || "").toLowerCase();
      const modeLabel = modeRaw ? modeRaw.toUpperCase() : "—";
      const knownModes = new Set(["cw", "lsb", "usb", "ft8", "rtty"]);
      const modeClass = knownModes.has(modeRaw) ? ` mode-${modeRaw}` : " mode-other";
      const freqHtml = formatFreqHtml(s.frequency);
      const time = s.spot_time || (s.spot_datetime ? s.spot_datetime.slice(11, 19) : "—");

      return `
        <tr>
          <td class="timeCell" data-label="Time"><span class="muted">${escapeHtml(utcLabel(s.spot_datetime))}</span></td>
          <td data-label="Band"><span class="${bandTagClass(s.band)}">${escapeHtml(bandLabel)}</span></td>
          <td data-label="Mode"><span class="tag modeTag${modeClass}">${escapeHtml(modeLabel)}</span></td>
          <td data-label="Frequency">${freqHtml}</td>
          <td data-label="Spotted">${renderStationCard(s, "spotted")}</td>
          <td data-label="Spotter">${renderStationCard(s, "spotter")}</td>
          <td data-label="Comment">${escapeHtml(s.spotter_comment || "")}</td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = rowsHtml;
  }

  function renderPagination(totalCount) {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    renderPageNumbers(totalPages);
  }

  function renderPageNumbers(totalPages) {
    const pages = [];
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    for (let p = start; p <= end; p += 1) pages.push(p);

    // Ensure we keep up to 3 visible pages when possible.
    while (pages.length < 3 && pages[0] > 1) pages.unshift(pages[0] - 1);
    while (pages.length < 3 && pages[pages.length - 1] < totalPages) pages.push(pages[pages.length - 1] + 1);

    pageNumberList.innerHTML = pages.map((p) => {
      const active = p === currentPage ? " isActive" : "";
      return `<button class="pageNum${active}" data-page="${p}" type="button">${p}</button>`;
    }).join("");

    pageNumberList.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentPage = Number(btn.getAttribute("data-page"));
        updateView();
      });
    });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function updateView() {
    const filtered = applyFilters(raw);
    const sorted = applySort(filtered);
    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * pageSize;
    const pageItems = sorted.slice(startIdx, startIdx + pageSize);

    render(pageItems, totalCount);
    renderPagination(totalCount);
  }

  function setSort(key) {
    if (sortKey === key) {
      sortDir = (sortDir === "asc") ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "desc";
    }
    updateView();
  }

  // ---------- data sources ----------
  async function loadMock() {
    const arr = Array.isArray(window.MOCK_SPOTS) ? window.MOCK_SPOTS : [];
    raw = arr.map(normalizeSpot);
    fillBandSelect(raw);
    fillModeSelect(raw);
    setLastUpdateSoft(nowIso(), false);
    setConn("mock", "good");
    updateView();
  }

  async function loadFromBff() {
    if (!BFF_BASE) throw new Error("Missing ?bff=https://... in URL");
    const url = new URL(BFF_PATH, BFF_BASE).toString();
    endpointLabel.textContent = url;

    setConn("loading…", "muted");
    const res = await fetch(url, { method: "GET", headers: { "accept": "application/json" } });
    if (!res.ok) throw new Error(`BFF ${res.status} ${res.statusText}`);

    const data = await res.json();
    const items = (SUPPORTS_WRAPPED && data && Array.isArray(data.items)) ? data.items : data;

    if (!Array.isArray(items)) throw new Error("BFF response is not an array (or {items:[]})");

    const normalized = items.map(normalizeSpot);
    const nextTopKey = getTopSpotKey(normalized);
    const hasNewTopItem = nextTopKey && nextTopKey !== lastBffTopKey;

    raw = normalized;
    lastBffTopKey = nextTopKey;
    fillBandSelect(raw);
    fillModeSelect(raw);
    setLastUpdateSoft(nowIso(), hasNewTopItem);
    setConn("ok", "good");
    updateView();
  }

  function connectWs() {
    if (!WS_URL) throw new Error("Missing ?ws=wss://.../ws in URL");
    endpointLabel.textContent = WS_URL;

    if (ws) try { ws.close(); } catch {}

    setConn("connecting…", "muted");
    ws = new WebSocket(WS_URL);

    ws.onopen = () => setConn("ws open", "good");
    ws.onerror = () => setConn("ws error", "bad");
    ws.onclose = () => setConn("ws closed", "bad");

    // Expected message shapes:
    // 1) { type:"snapshot", items:[...] }
    // 2) { type:"spot", item:{...} }  (append)
    // 3) plain array snapshot
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);

        if (Array.isArray(msg)) {
          raw = msg.map(normalizeSpot);
          fillBandSelect(raw);
          fillModeSelect(raw);
          setLastUpdateSoft(nowIso(), true);
          updateView();
          return;
        }

        if (msg && Array.isArray(msg.items)) {
          raw = msg.items.map(normalizeSpot);
          fillBandSelect(raw);
          fillModeSelect(raw);
          setLastUpdateSoft(nowIso(), true);
          updateView();
          return;
        }

        if (msg && msg.item) {
          // append newest on top
          raw.unshift(normalizeSpot(msg.item));
          // keep reasonable size client-side
          if (raw.length > 2000) raw.length = 2000;
          fillBandSelect(raw);
          fillModeSelect(raw);
          setLastUpdateSoft(nowIso(), true);
          updateView();
          return;
        }
      } catch (e) {
        // ignore
      }
    };
  }

  // ---------- auto refresh ----------
  function stopAuto() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function startAuto() {
    stopAuto();
    if (MODE === "bff" && !bffConnected) return;
    if (MODE === "mock" && !manualConnected) return;
    const val = String(interval.value || "auto").toLowerCase();
    if (val === "auto" && MODE === "ws") return;
    const ms = (val === "auto") ? 5000 : Number(val);
    if (!Number.isFinite(ms) || ms <= 0) return;
    timer = setInterval(async () => {
      try {
        if (MODE === "bff") await loadFromBff();
        if (MODE === "mock" && manualConnected) await loadMock();
        // ws mode doesn't poll
      } catch (e) {
        if (MODE === "bff") {
          setBffDisconnected(e.message || "refresh error");
          return;
        }
        setConn(e.message || "refresh error", "bad");
      }
    }, ms);
  }

  // ---------- export ----------
  function toCsv(items) {
    const cols = [
      "spot_datetime","spot_time","band","mode","frequency",
      "spotted","spotted_dxcc","spotted_flag","spotted_country","spotted_continent",
      "spotter","spotter_dxcc","spotter_flag","spotter_country","spotter_continent",
      "spotter_comment"
    ];
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const header = cols.join(",");
    const body = items.map(s => cols.map(c => esc(s[c])).join(",")).join("\n");
    return header + "\n" + body;
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- wire events ----------
  function bindUi() {
    function syncAutoControls() {
      const enabled = auto.checked;
      refreshBtn.hidden = enabled;
      interval.hidden = !enabled;
    }

    [q, band, modeFilter, spottedCont, spotterCont].forEach(x => x.addEventListener("input", () => {
      currentPage = 1;
      updateView();
    }));

    connPill.addEventListener("click", async () => {
      if (MODE === "bff") {
        if (bffConnected) {
          setBffDisconnected("Manually disconnected");
        } else {
          await connectBffFromPill();
        }
        return;
      }

      manualConnected = !manualConnected;
      setConn(manualConnected ? "Manually connected" : "Manually disconnected", manualConnected ? "good" : "bad");
      if (!manualConnected) clearViewData();
      else if (MODE === "mock") await loadMock();
    });

    refreshBtn.addEventListener("click", async () => {
      try {
        if (MODE === "bff" && !bffConnected) return;
        if (MODE === "mock" && !manualConnected) return;
        if (MODE === "mock") await loadMock();
        else if (MODE === "bff") await loadFromBff();
        else if (MODE === "ws") { /* noop */ }
      } catch (e) {
        if (MODE === "bff") {
          setBffDisconnected(e.message || "refresh error");
          return;
        }
        setConn(e.message || "refresh error", "bad");
      }
    });

    if (filtersMenuBtn) {
      filtersMenuBtn.addEventListener("click", () => {
        document.body.classList.toggle("filters-open");
        updateFiltersMenuButton();
      });
      window.addEventListener("resize", syncFiltersMenuForViewport);
    }

    clearBtn.addEventListener("click", () => {
      q.value = "";
      band.value = "";
      modeFilter.value = "";
      spottedCont.value = "";
      spotterCont.value = "";
      currentPage = 1;
      updateView();
    });

    prevPageBtn.addEventListener("click", () => {
      if (currentPage <= 1) return;
      currentPage -= 1;
      updateView();
    });

    nextPageBtn.addEventListener("click", () => {
      currentPage += 1;
      updateView();
    });

    rowsPerPage.addEventListener("change", () => {
      const val = Number(rowsPerPage.value);
      pageSize = Number.isFinite(val) && val > 0 ? val : 25;
      currentPage = 1;
      updateView();
    });

    exportBtn.addEventListener("click", () => {
      const filtered = applySort(applyFilters(raw));
      const csv = toCsv(filtered);
      download(`spots_${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
    });

    auto.addEventListener("change", () => {
      syncAutoControls();
      if (auto.checked) startAuto();
      else stopAuto();
    });

    interval.addEventListener("change", () => {
      if (auto.checked) startAuto();
    });

    syncAutoControls();

    // sortable headers
    document.querySelectorAll("th[data-sort]").forEach(th => {
      th.addEventListener("click", () => setSort(th.getAttribute("data-sort")));
    });
  }

  // ---------- boot ----------
  async function boot() {
    // show endpoint
    if (MODE === "mock") endpointLabel.textContent = "window.MOCK_SPOTS";
    if (MODE === "bff") endpointLabel.textContent = BFF_BASE ? new URL(BFF_PATH, BFF_BASE).toString() : "(missing ?bff=...)";
    if (MODE === "ws") endpointLabel.textContent = WS_URL || "(missing ?ws=...)";

    bindUi();
    syncFiltersMenuForViewport();

    try {
      if (MODE === "mock") {
        await loadMock();
      } else if (MODE === "bff") {
        bffConnected = true;
        setConn("Trying BFF connection", "good");
        await loadFromBff();
      } else if (MODE === "ws") {
        // optional: load an initial snapshot by http too if you want
        connectWs();
      } else {
        throw new Error("Unknown mode. Use ?mode=mock|bff|ws");
      }
    } catch (e) {
      if (MODE === "bff") {
        setBffDisconnected(e.message || "boot error");
        return;
      }
      setConn(e.message || "boot error", "bad");
      await loadMock();
    }
  }

  boot();
})();
