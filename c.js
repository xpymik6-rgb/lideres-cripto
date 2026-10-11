// Счётчик посещений liderescripto.com (10.10.2026). Одна строка в журнал на
// нашем сервере: какая страница и откуда пришёл человек. Без куки.
(function () {
  try {
    var u = 'https://m.liderescripto.com/l?p=' +
      encodeURIComponent(location.pathname + location.search) +
      '&r=' + encodeURIComponent(document.referrer || '');
    if (navigator.sendBeacon) { navigator.sendBeacon(u); }
    else { var i = new Image(); i.src = u; }
  } catch (e) {}
})();
