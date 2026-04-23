const vyrazhenie = require('express');
const krossDomen = require('cors');
const poluchitDannye = require('node-fetch');

const prilozhenie = vyrazhenie();
const port = process.env.PORT || 3000;

prilozhenie.use(krossDomen());
prilozhenie.use(vyrazhenie.json());
prilozhenie.use(vyrazhenie.static('public'));

const slovarKlyucheyIUrl = new Map([
  ['javascript', [
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    'https://javascript.info/',
    'https://nodejs.org/api/documentation.html'
  ]],
  ['python', [
    'https://www.python.org/doc/',
    'https://docs.python.org/3/',
    'https://realpython.com/'
  ]],
  ['html', [
    'https://developer.mozilla.org/en-US/docs/Web/HTML',
    'https://html.spec.whatwg.org/',
    'https://www.w3schools.com/html/'
  ]]
]);

prilozhenie.post('/api/spisokUrl', (zapros, otvet) => {
  const { klyuchevoeSlovo } = zapros.body;
  if (!klyuchevoeSlovo) {
    return otvet.status(400).json({ oshibka: 'Не указано ключевое слово' });
  }
  const spisokUrl = slovarKlyucheyIUrl.get(klyuchevoeSlovo.toLowerCase()) || [];
  otvet.json({ spisokUrl });
});

prilozhenie.get('/api/zagruzit', async (zapros, otvet) => {
  const { url } = zapros.query;
  if (!url) {
    return otvet.status(400).json({ oshibka: 'Не указан URL' });
  }

  try {
    const otvetOtSayta = await poluchitDannye(url);
    if (!otvetOtSayta.ok) {
      return otvet.status(otvetOtSayta.status).json({ oshibka: `Ошибка загрузки: ${otvetOtSayta.statusText}` });
    }

    const zagolovokRazmera = otvetOtSayta.headers.get('content-length');
    const obshiyRazmer = zagolovokRazmera ? parseInt(zagolovokRazmera, 10) : 0;

    otvet.setHeader('Content-Type', otvetOtSayta.headers.get('content-type') || 'text/plain');
    otvet.setHeader('X-Content-Length', obshiyRazmer);

    if (otvetOtSayta.body) {
      otvetOtSayta.body.pipe(otvet);
    } else {
      const tekst = await otvetOtSayta.text();
      otvet.send(tekst);
    }
  } catch (oshibkaServera) {
    console.error('Proxy oshibka:', oshibkaServera);
    otvet.status(500).json({ oshibka: 'Внутренняя ошибка сервера' });
  }
});

prilozhenie.listen(port, () => {
  console.log(`Server zapushchen na portu ${port}`);
});
