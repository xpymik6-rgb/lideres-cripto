/* Терминал liderescripto.com (20.10.2026). Данные: m.liderescripto.com/t/terminal.json
   раз в 10 минут, свечи Binance из браузера. Вход: подписка на канал через бота. */
(function () {
  "use strict";
  var API = "https://m.liderescripto.com/t/";
  var BOT = "LideresCriptoBot_bot";
  var LS = "lc_terminal_ok", DIA = 24 * 3600 * 1000;
  var datos = null, grafico = null, velas = null, lineas = [], moneda = "BTC";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function usd(n) {
    if (n == null) return "–";
    var a = Math.abs(n);
    if (a >= 1e12) return "$" + (n / 1e12).toLocaleString("es-ES", {maximumFractionDigits: 2}) + " billones";
    if (a >= 1e9) return "$" + (n / 1e9).toLocaleString("es-ES", {maximumFractionDigits: 1}) + " mil M";
    if (a >= 1e6) return "$" + (n / 1e6).toLocaleString("es-ES", {maximumFractionDigits: 1}) + " M";
    if (a >= 1e3) return "$" + (n / 1e3).toLocaleString("es-ES", {maximumFractionDigits: 0}) + " mil";
    return "$" + n.toLocaleString("es-ES", {maximumFractionDigits: 0});
  }
  function px(n) {
    if (n == null) return "–";
    var d = n >= 1000 ? 0 : n >= 1 ? 2 : 5;
    return n.toLocaleString("es-ES", {minimumFractionDigits: 0, maximumFractionDigits: d});
  }
  function hace(ts) {
    if (!ts) return "";
    var m = Math.round((Date.now() / 1000 - ts) / 60);
    if (m < 60) return "hace " + Math.max(1, m) + " min";
    var h = Math.round(m / 60);
    return h < 24 ? "hace " + h + " h" : "hace " + Math.round(h / 24) + " d";
  }

  /* ---------- вход через бота ---------- */
  function abierto() { try { var t = +localStorage.getItem(LS); return t && Date.now() - t < DIA; } catch (e) { return false; } }
  function abrir() {
    try { localStorage.setItem(LS, String(Date.now())); } catch (e) {}
    document.body.classList.add("term-on");
    var p = $("tm-puerta"); if (p) p.hidden = true;
    if (grafico) grafico.timeScale().fitContent();
  }
  function codigo() {
    var c = null;
    try { c = sessionStorage.getItem("lc_tcod"); } catch (e) {}
    if (!c) {
      var a = new Uint8Array(8); (window.crypto || window.msCrypto).getRandomValues(a);
      c = Array.prototype.map.call(a, function (b) { return (b % 36).toString(36); }).join("");
      try { sessionStorage.setItem("lc_tcod", c); } catch (e) {}
    }
    return c;
  }
  function puerta() {
    if (abierto()) { abrir(); return; }
    var cod = codigo(), boton = $("tm-boton"), espera = $("tm-espera"), vueltas = 0, timer = null;
    boton.href = "https://t.me/" + BOT + "?start=t_" + cod;
    boton.addEventListener("click", function () {
      espera.textContent = "Esperando al bot…";
      if (timer) return;
      timer = setInterval(function () {
        if (++vueltas > 200) { clearInterval(timer); timer = null; espera.textContent = "Toca el botón otra vez cuando estés suscrito."; return; }
        fetch(API + "v/" + cod, {cache: "no-store"}).then(function (r) {
          if (r.ok) { clearInterval(timer); timer = null; espera.textContent = "✅ Listo"; abrir(); }
        }).catch(function () {});
      }, 3000);
    });
  }

  /* ---------- данные ---------- */
  function pintarMercado(m) {
    if (m.miedo) {
      $("tm-miedo").innerHTML = m.miedo.valor + ' <span style="font-size:15px;color:#9fb0cb">' + esc(m.miedo.clase) + "</span>";
      $("tm-miedo-s").textContent = m.miedo.ayer != null ? "ayer " + m.miedo.ayer : "";
    }
    $("tm-vol").textContent = usd(m.volumen_24h);
    $("tm-cap").textContent = usd(m.capitalizacion);
    if (m.cambio_cap_24h != null) {
      var c = m.cambio_cap_24h;
      $("tm-cap-s").innerHTML = '<span class="' + (c >= 0 ? "v" : "r") + '">' + (c >= 0 ? "+" : "") +
        c.toLocaleString("es-ES") + "%</span> en 24 h";
    }
    $("tm-dom").textContent = m.dominancia_btc != null ? m.dominancia_btc.toLocaleString("es-ES") + "%" : "–";
  }
  function pintarBallenas(lista) {
    var f = [];
    lista.forEach(function (b) {
      var L = b.largo || {usd: 0, n: 0}, C = b.corto || {usd: 0, n: 0};
      var tot = (L.usd || 0) + (C.usd || 0), pl = tot ? Math.round(100 * L.usd / tot) : 50;
      f.push("<tr><td><b>" + esc(b.coin) + "</b></td><td>" + px(b.precio) + "</td>" +
        '<td class="v">' + usd(L.usd) + " <span class=tm-cuando>(" + (L.n || 0) + ")</span></td>" +
        '<td><div class="tm-barra" title="' + pl + '% en largos"><i style="width:' + pl + '%"></i></div></td>' +
        '<td class="r">' + usd(C.usd) + " <span class=tm-cuando>(" + (C.n || 0) + ")</span></td>" +
        "<td>" + px(L.entrada) + " / " + px(C.entrada) + "</td>" +
        "<td>" + (L.en_ganancia_pct != null ? L.en_ganancia_pct + "%" : "–") + " / " +
        (C.en_ganancia_pct != null ? C.en_ganancia_pct + "%" : "–") + "</td>" +
        "<td>" + (b.funding_apr != null ? b.funding_apr.toLocaleString("es-ES") + "%" : "–") + "</td></tr>");
    });
    $("tm-ballenas").innerHTML = f.join("");
  }
  function pintarLista(id, items, vacio) {
    var el = $(id);
    if (!items.length) { el.innerHTML = '<li class="tm-cuando">' + esc(vacio) + "</li>"; return; }
    el.innerHTML = items.map(function (n) {
      var tag = n.tema ? '<span class="tm-tag ' + esc(n.tema) + '">' + esc(n.tema) + "</span>" : "";
      var pie = n.fuente ? '<br><span class="tm-cuando">' + esc(n.fuente) + " · " + hace(n.ts) + "</span>" : "";
      return "<li>" + tag + '<a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.titulo) + "</a>" + pie + "</li>";
    }).join("");
  }
  function cargar() {
    fetch(API + "terminal.json", {cache: "no-store"}).then(function (r) { return r.json(); }).then(function (d) {
      datos = d;
      pintarMercado(d.mercado || {});
      pintarBallenas(d.ballenas || []);
      pintarLista("tm-noticias", (d.noticias || []).slice(0, 10), "Sin noticias por ahora.");
      var p = d.peligros || {};
      var pel = (p.noticias || []).concat((p.guias || []).map(function (g) {
        return {titulo: g.titulo, url: g.url, tema: "cómo te roban"}; }));
      pintarLista("tm-peligros", pel.slice(0, 8), "Nada nuevo.");
      $("tm-pie").textContent = (d.cuentas ? d.cuentas + " cuentas grandes" : "Cuentas grandes") +
        " (billeteras de Hyperliquid y rankings públicos de OKX y Binance)" +
        " · actualizado " + esc(d.snapshot || "") + " (hora de Lima) · L = largos, C = cortos, entre paréntesis cuántas posiciones";
      lineasBallenas();
    }).catch(function () { $("tm-pie").textContent = "No pude cargar los datos. Prueba en un minuto."; });
  }

  /* ---------- график ---------- */
  function lineasBallenas() {
    if (!velas || !datos) return;
    lineas.forEach(function (l) { velas.removePriceLine(l); }); lineas = [];
    var b = (datos.ballenas || []).filter(function (x) { return x.coin === moneda; })[0];
    var ley = [];
    if (b) {
      if (b.largo && b.largo.entrada) {
        lineas.push(velas.createPriceLine({price: b.largo.entrada, color: "#5df2c0", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "entrada largos"}));
        ley.push('<b class="v">— entrada media de los largos</b> ' + px(b.largo.entrada));
      }
      if (b.corto && b.corto.entrada) {
        lineas.push(velas.createPriceLine({price: b.corto.entrada, color: "#ff6b6b", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "entrada cortos"}));
        ley.push('<b class="r">— entrada media de los cortos</b> ' + px(b.corto.entrada));
      }
      (b.liquidaciones || []).slice(0, 5).forEach(function (q) {
        var largo = q.lado === "LONG";
        lineas.push(velas.createPriceLine({price: q.precio, color: largo ? "rgba(93,242,192,.55)" : "rgba(255,107,107,.55)",
          lineWidth: 1, lineStyle: 0, axisLabelVisible: false, title: "liq. " + (largo ? "largos " : "cortos ") + usd(q.usd)}));
      });
      if ((b.liquidaciones || []).length) ley.push("líneas finas: donde la bolsa liquidaría a esas ballenas y cuánto dinero hay en cada nivel");
    }
    $("tm-ley").innerHTML = ley.join(" · ");
    // Шкала по свечам обрезала линии китов: вход шортов и уровни ликвидаций
    // оставались за краем графика. Растягиваем шкалу так, чтобы их было видно.
    var niveles = lineas.map(function (l) { return l.options().price; });
    velas.applyOptions({autoscaleInfoProvider: function (orig) {
      var r = orig();
      if (!r || !niveles.length) return r;
      var lo = Math.min.apply(null, niveles.concat([r.priceRange.minValue]));
      var hi = Math.max.apply(null, niveles.concat([r.priceRange.maxValue]));
      return {priceRange: {minValue: lo, maxValue: hi}, margins: r.margins};
    }});
  }
  function cargarVelas() {
    if (!velas) return;
    fetch("https://data-api.binance.vision/api/v3/klines?symbol=" + moneda + "USDT&interval=1h&limit=240")
      .then(function (r) { return r.json(); }).then(function (k) {
        velas.setData(k.map(function (x) { return {time: Math.floor(x[0] / 1000), open: +x[1], high: +x[2], low: +x[3], close: +x[4]}; }));
        grafico.timeScale().fitContent();
        lineasBallenas();
      }).catch(function () { $("tm-ley").textContent = "No pude cargar el gráfico de Binance."; });
  }
  function iniciarGrafico() {
    var el = $("tm-grafico");
    if (!window.LightweightCharts || !el) { setTimeout(iniciarGrafico, 300); return; }
    grafico = LightweightCharts.createChart(el, {
      autoSize: true,
      layout: {background: {color: "#0b1220"}, textColor: "#9fb0cb", fontFamily: "IBM Plex Sans, sans-serif"},
      grid: {vertLines: {color: "#101b2e"}, horzLines: {color: "#101b2e"}},
      rightPriceScale: {borderColor: "#1c2a45"}, timeScale: {borderColor: "#1c2a45", timeVisible: true},
      localization: {locale: "es-ES"}
    });
    velas = grafico.addCandlestickSeries({upColor: "#5df2c0", downColor: "#ff6b6b", borderVisible: false,
      wickUpColor: "#5df2c0", wickDownColor: "#ff6b6b"});
    cargarVelas();
    setInterval(cargarVelas, 60000);
    Array.prototype.forEach.call(document.querySelectorAll("#tm-tabs button"), function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll("#tm-tabs button"), function (x) { x.classList.remove("on"); });
        b.classList.add("on"); moneda = b.getAttribute("data-c"); cargarVelas();
      });
    });
  }

  function go() { puerta(); cargar(); iniciarGrafico(); setInterval(cargar, 5 * 60000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
