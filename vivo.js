/* Живые данные страницы.
   Hyperliquid отдаёт свой публичный интерфейс браузеру напрямую, поэтому лестница
   ликвидаций на сайте настоящая: реальные позиции реальных кошельков, обновляются
   каждые полминуты. Ни ключей, ни сервера посередине. */

const LIDERES = [
  ["0xea0027b6ea9b6d7d401b5266979cc3b3ca87a918", "El Contrario de hierro"],
  ["0x15b325660a1c4a9582a7d834c31119c0cb9e3a42", "El Minero de las velas rojas"],
  ["0x7ca519838f6d8dbbd8488b63f5f2cc461b89028c", "La Roca de hierro"],
  ["0x152e41f0b83e6cad4b5dc730c1d6279b7d67c9dc", "El Halcón del este"],
  ["0x634fe24f2f7396f5d967ec3936df04f49a3e6951", "El Cirujano de hierro"],
  ["0x396dc3e4d1051837bb559810d2b1ea7977775899", "El Lobo sin miedo"],
  ["0xdd7a372377fc633f74ab6e20963803d52f448830", "El Cirujano del este"],
  ["0x666073af75b8d2e6e9efea414db566494e61aafe", "El Vigilante"],
];
const HL = "https://api.hyperliquid.xyz/info";

const nfmt = (n) => n >= 1000 ? n.toLocaleString("es-ES", {maximumFractionDigits: 0})
                              : n.toLocaleString("es-ES", {maximumFractionDigits: n >= 1 ? 2 : 4});
const dfmt = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(1) + " mil M";
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + " M";
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(0) + " mil";
  return "$" + n.toFixed(0);
};

async function hl(cuerpo) {
  const r = await fetch(HL, {method: "POST", headers: {"Content-Type": "application/json"},
                            body: JSON.stringify(cuerpo)});
  return r.json();
}

/* Собираем позиции всех наших лидеров и строим лестницу по той монете,
   где у них больше всего открытого. Так блок живой при любом рынке. */
async function escalera() {
  let mids;
  try { mids = await hl({type: "allMids"}); } catch (e) { return; }
  const estados = await Promise.all(LIDERES.map(async ([a, apodo]) => {
    try { return [apodo, a, await hl({type: "clearinghouseState", user: a})]; }
    catch (e) { return null; }
  }));

  const porMoneda = {};
  let capital = 0;
  for (const st of estados) {
    if (!st) continue;
    const [apodo, addr, d] = st;
    for (const ap of (d.assetPositions || [])) {
      const p = ap.position;
      const usd = Math.abs(parseFloat(p.positionValue || 0));
      if (!usd) continue;
      capital += usd;
      const liq = parseFloat(p.liquidationPx || 0);
      if (!liq) continue;
      (porMoneda[p.coin] = porMoneda[p.coin] || []).push({
        apodo, addr, coin: p.coin, usd, liq,
        entrada: parseFloat(p.entryPx || 0),
        lado: parseFloat(p.szi) > 0 ? "largo" : "corto",
        pnl: parseFloat(p.unrealizedPnl || 0),
      });
    }
  }
  const capEl = document.getElementById("capital");
  if (capEl && capital) capEl.textContent = dfmt(capital);

  // монета с наибольшим числом позиций, при равенстве — с большей суммой
  let mejor = null;
  for (const [coin, lista] of Object.entries(porMoneda)) {
    const suma = lista.reduce((s, x) => s + x.usd, 0);
    if (!mejor || lista.length > mejor[1].length ||
        (lista.length === mejor[1].length && suma > mejor[2])) mejor = [coin, lista, suma];
  }
  if (!mejor) return;
  const [coin, lista] = mejor;
  const precio = parseFloat(mids[coin] || 0);
  if (!precio) return;

  const et = document.getElementById("monedaEscalera");
  if (et) et.textContent = coin;

  // шкала: от самого дальнего уровня сверху до самого дальнего снизу, цена внутри
  const niveles = lista.slice().sort((a, b) => b.liq - a.liq).slice(0, 6);
  const todos = niveles.map(n => n.liq).concat([precio]);
  const alto = Math.max(...todos) * 1.01, bajo = Math.min(...todos) * 0.99;
  const pos = (v) => Math.min(93, Math.max(4, (alto - v) / (alto - bajo) * 100));

  const grada = document.getElementById("grada");
  const linea = document.getElementById("lineaAhora");
  if (!grada || !linea) return;
  grada.querySelectorAll(".nivel:not(#lineaAhora)").forEach(e => e.remove());

  for (const n of niveles) {
    const cerca = Math.abs(precio / n.liq - 1) < 0.03;
    const div = document.createElement("div");
    div.className = "nivel" + (cerca ? " cerca" : "");
    div.style.top = pos(n.liq).toFixed(1) + "%";
    const color = n.lado === "largo" ? "var(--senal)" : "var(--corto)";
    div.innerHTML = `<span class="et num">${nfmt(n.liq)}</span>` +
      `<span class="q"><i class="pt" style="background:${color};box-shadow:0 0 10px ${color}"></i>` +
      `<a href="https://app.hyperliquid.xyz/explorer/address/${n.addr}" style="color:inherit">${n.apodo}</a>` +
      ` · ${n.lado} ${dfmt(n.usd)}` +
      `<b class="pnl" style="color:${n.pnl >= 0 ? "var(--senal)" : "var(--corto)"}">${n.pnl >= 0 ? "+" : ""}${dfmt(n.pnl)}</b></span>`;
    grada.appendChild(div);
  }
  linea.style.top = pos(precio).toFixed(1) + "%";
  const px = document.getElementById("pxbtc");
  if (px) px.textContent = nfmt(precio);
  dibujaChispa(coin);
}

/* Обратный отсчёт до ближайшего выпуска: 8:00, 14:00 и 20:00 по Лиме */
function cuentaAtras() {
  const el = document.getElementById("cuenta");
  if (!el) return;
  const ahora = new Date();
  const lima = new Date(ahora.toLocaleString("en-US", {timeZone: "America/Lima"}));
  const horas = [8, 14, 20];
  let falta = null;
  for (const h of horas) {
    const t = new Date(lima); t.setHours(h, 0, 0, 0);
    if (t > lima) { falta = t - lima; break; }
  }
  if (falta === null) {
    const t = new Date(lima); t.setDate(t.getDate() + 1); t.setHours(8, 0, 0, 0);
    falta = t - lima;
  }
  const s = Math.floor(falta / 1000);
  el.textContent = `${String(Math.floor(s / 3600)).padStart(2, "0")}:` +
                   `${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}:` +
                   `${String(s % 60).padStart(2, "0")}`;
}

/* Линия цены за двое суток внизу лестницы, по монете лестницы */
async function dibujaChispa(coin) {
  const c = document.getElementById("chispa");
  if (!c) return;
  try {
    const r = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${coin}USDT&interval=60&limit=48`);
    const j = await r.json();
    const ps = j.result.list.map(v => parseFloat(v[4])).reverse();
    if (ps.length < 8) return;
    const x = c.getContext("2d"), lo = Math.min(...ps), hi = Math.max(...ps);
    x.clearRect(0, 0, c.width, c.height);
    const px = i => i * (c.width / (ps.length - 1)), py = v => c.height - 8 - (c.height - 16) * (v - lo) / ((hi - lo) || 1);
    const gr = x.createLinearGradient(0, 0, 0, c.height);
    gr.addColorStop(0, "rgba(93,242,192,.30)"); gr.addColorStop(1, "rgba(93,242,192,0)");
    x.beginPath(); x.moveTo(0, c.height);
    ps.forEach((v, i) => x.lineTo(px(i), py(v)));
    x.lineTo(c.width, c.height); x.closePath(); x.fillStyle = gr; x.fill();
    x.beginPath(); ps.forEach((v, i) => i ? x.lineTo(px(i), py(v)) : x.moveTo(px(i), py(v)));
    x.strokeStyle = "rgba(93,242,192,.8)"; x.lineWidth = 2.5; x.stroke();
  } catch (e) {}
}

/* Лента котировок сверху: цены с биржи, обновляются каждые двадцать секунд */
const PARES = [["BTC","BTCUSDT"],["ETH","ETHUSDT"],["SOL","SOLUSDT"],["XRP","XRPUSDT"],
               ["ZEC","ZECUSDT"],["HYPE","HYPEUSDT"],["NEAR","NEARUSDT"]];
async function cotiza() {
  const el = document.getElementById("cinta");
  if (!el) return;
  try {
    const r = await fetch("https://api.bybit.com/v5/market/tickers?category=spot");
    const j = await r.json();
    const m = {}; j.result.list.forEach(x => m[x.symbol] = x);
    const trozo = '<span class="vivo"><i class="pulso"></i>EN VIVO</span>' + PARES.map(([n, s]) => {
      const t = m[s]; if (!t) return "";
      const p = parseFloat(t.lastPrice), c = (p / parseFloat(t.prevPrice24h) - 1) * 100;
      return `<span>${n} <b class="num">${nfmt(p)}</b> <i class="num ${c >= 0 ? "sube" : "baja"}">${c >= 0 ? "+" : ""}${c.toFixed(1)}%</i></span>`;
    }).join("");
    el.innerHTML = trozo + trozo;
  } catch (e) {}
}

escalera(); setInterval(escalera, 30000);
cuentaAtras(); setInterval(cuentaAtras, 1000);
cotiza(); setInterval(cotiza, 20000);
