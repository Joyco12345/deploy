const poleVvodaSlova = document.getElementById('poleVvodaSlova');
const knopkaPoisk = document.getElementById('knopkaPoisk');
const blokSpiskaUrl = document.getElementById('blokSpiskaUrl');
const vyborUrl = document.getElementById('vyborUrl');
const knopkaZagruzit = document.getElementById('knopkaZagruzit');
const oshibkaPoiska = document.getElementById('oshibkaPoiska');

const informatsiyaProgres = document.getElementById('informatsiyaProgres');
const polosaProgressa = document.getElementById('polosaProgressa');

const vyborSohranennogo = document.getElementById('vyborSohranennogo');
const knopkaProsmotr = document.getElementById('knopkaProsmotr');
const knopkaUdalit = document.getElementById('knopkaUdalit');
const panelProsmotra = document.getElementById('panelProsmotra');
const freymKontenta = document.getElementById('freymKontenta');
const knopkaZakrytProsmotr = document.getElementById('knopkaZakrytProsmotr');
const oshibkaSohranennogo = document.getElementById('oshibkaSohranennogo');

function formatBaitov(baiti, desyatichnyeZnaki = 2) {
  if (baiti === 0) return '0 байт';
  const k = 1024;
  const dm = desyatichnyeZnaki < 0 ? 0 : desyatichnyeZnaki;
  const edinitsy = ['байт', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(baiti) / Math.log(k));
  return parseFloat((baiti / Math.pow(k, i)).toFixed(dm)) + ' ' + edinitsy[i];
}

const klyuchHranilisha = 'zagruzhennye_stranitsy';

function poluchitSohranennyeStranitsy() {
  const dannye = localStorage.getItem(klyuchHranilisha);
  return dannye ? JSON.parse(dannye) : [];
}

function sohranitStranitsu(url, soderzhimoe) {
  const vseStranitsy = poluchitSohranennyeStranitsy();
  const indeks = vseStranitsy.findIndex(s => s.url === url);
  const dannyeStranitsy = {
    url,
    soderzhimoe,
    vremya: Date.now(),
    razmer: new Blob([soderzhimoe]).size
  };
  if (indeks >= 0) {
    vseStranitsy[indeks] = dannyeStranitsy;
  } else {
    vseStranitsy.push(dannyeStranitsy);
  }
  localStorage.setItem(klyuchHranilisha, JSON.stringify(vseStranitsy));
  otrisovatSpisokSohranennyh();
}

function udalitStranitsu(url) {
  let vseStranitsy = poluchitSohranennyeStranitsy();
  vseStranitsy = vseStranitsy.filter(s => s.url !== url);
  localStorage.setItem(klyuchHranilisha, JSON.stringify(vseStranitsy));
  otrisovatSpisokSohranennyh();
}

function otrisovatSpisokSohranennyh() {
  const vseStranitsy = poluchitSohranennyeStranitsy();
  vyborSohranennogo.innerHTML = '';
  vseStranitsy.forEach(stranitsa => {
    const variant = document.createElement('option');
    variant.value = stranitsa.url;
    variant.textContent = `${stranitsa.url} (${formatBaitov(stranitsa.razmer)})`;
    vyborSohranennogo.appendChild(variant);
  });
}

knopkaPoisk.addEventListener('click', async () => {
  const slovo = poleVvodaSlova.value.trim();
  if (!slovo) {
    oshibkaPoiska.textContent = 'Введите ключевое слово';
    return;
  }
  oshibkaPoiska.textContent = '';
  blokSpiskaUrl.style.display = 'none';

  try {
    const otvet = await fetch('/api/spisokUrl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klyuchevoeSlovo: slovo })
    });
    if (!otvet.ok) {
      const err = await otvet.json();
      throw new Error(err.oshibka || 'Ошибка сервера');
    }
    const dannye = await otvet.json();
    const spisok = dannye.spisokUrl;
    if (spisok.length === 0) {
      oshibkaPoiska.textContent = 'По этому слову ничего не найдено';
      return;
    }
    vyborUrl.innerHTML = '';
    spisok.forEach(urlAdres => {
      const variant = document.createElement('option');
      variant.value = urlAdres;
      variant.textContent = urlAdres;
      vyborUrl.appendChild(variant);
    });
    blokSpiskaUrl.style.display = 'block';
  } catch (oshibka) {
    oshibkaPoiska.textContent = `Ошибка: ${oshibka.message}`;
  }
});

knopkaZagruzit.addEventListener('click', async () => {
  const vybrannyyUrl = vyborUrl.value;
  if (!vybrannyyUrl) {
    alert('Выберите URL из списка');
    return;
  }

  informatsiyaProgres.textContent = 'Начинаем загрузку...';
  polosaProgressa.value = 0;
  oshibkaPoiska.textContent = '';

  try {
    const otvet = await fetch(`/api/zagruzit?url=${encodeURIComponent(vybrannyyUrl)}`);
    if (!otvet.ok) {
      const err = await otvet.json();
      throw new Error(err.oshibka || 'Ошибка загрузки');
    }

    const zagolovokRazmera = otvet.headers.get('X-Content-Length');
    const obshiyRazmer = zagolovokRazmera ? parseInt(zagolovokRazmera, 10) : 0;

    const chitatel = otvet.body.getReader();
    const kuski = [];
    let polucheno = 0;

    while (true) {
      const { done, value } = await chitatel.read();
      if (done) break;

      kuski.push(value);
      polucheno += value.length;

      if (obshiyRazmer) {
        const protsent = Math.round((polucheno / obshiyRazmer) * 100);
        polosaProgressa.value = protsent;
        informatsiyaProgres.textContent = `Загружено: ${formatBaitov(polucheno)} из ${formatBaitov(obshiyRazmer)} (${protsent}%)`;
      } else {
        informatsiyaProgres.textContent = `Загружено: ${formatBaitov(polucheno)} (размер неизвестен)`;
      }
    }

    const dvoichnyyObekt = new Blob(kuski);
    const tekst = await dvoichnyyObekt.text();

    informatsiyaProgres.textContent = `Загрузка завершена. Размер: ${formatBaitov(dvoichnyyObekt.size)}`;
    polosaProgressa.value = 100;

    sohranitStranitsu(vybrannyyUrl, tekst);
    alert('Страница сохранена для офлайн-просмотра');

  } catch (oshibka) {
    informatsiyaProgres.textContent = 'Ошибка загрузки';
    oshibkaPoiska.textContent = `Ошибка: ${oshibka.message}`;
  }
});

knopkaProsmotr.addEventListener('click', () => {
  const vybrannyyUrl = vyborSohranennogo.value;
  if (!vybrannyyUrl) {
    oshibkaSohranennogo.textContent = 'Выберите сохранённую страницу';
    return;
  }
  oshibkaSohranennogo.textContent = '';

  const vseStranitsy = poluchitSohranennyeStranitsy();
  const stranitsa = vseStranitsy.find(s => s.url === vybrannyyUrl);
  if (stranitsa) {
    freymKontenta.srcdoc = stranitsa.soderzhimoe;
    panelProsmotra.style.display = 'block';
  } else {
    oshibkaSohranennogo.textContent = 'Страница не найдена в хранилище';
  }
});

knopkaZakrytProsmotr.addEventListener('click', () => {
  panelProsmotra.style.display = 'none';
  freymKontenta.srcdoc = '';
});

knopkaUdalit.addEventListener('click', () => {
  const vybrannyyUrl = vyborSohranennogo.value;
  if (!vybrannyyUrl) {
    oshibkaSohranennogo.textContent = 'Выберите страницу для удаления';
    return;
  }
  udalitStranitsu(vybrannyyUrl);
  oshibkaSohranennogo.textContent = '';
});

otrisovatSpisokSohranennyh();