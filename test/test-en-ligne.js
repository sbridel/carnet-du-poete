const { groupe, test, assertEqual } = require('./framework');

// Cache des recherches en ligne (lot C, 2.30.0) : pas de requête réseau
// répétée quand on refiltre ou qu'on tape une lettre de plus ailleurs.
module.exports = function testsEnLigne(m) {
  groupe('Sources en ligne — cache', () => {
    test('même source et même mot : une seule requête, casse et espaces ignorées', async () => {
      let appels = 0;
      const req = () => { appels++; return Promise.resolve({ mots: ['a'] }); };
      const r1 = await m.avecCacheEnLigne('testA', 'Lune', req);
      const r2 = await m.avecCacheEnLigne('testA', ' lune ', req);
      assertEqual(appels, 1); assertEqual(r1, r2);
      await m.avecCacheEnLigne('testB', 'lune', req);
      assertEqual(appels, 2, 'autre source : nouvelle requête');
    });
    test('un échec n\'est pas gardé : nouvel essai possible', async () => {
      let appels = 0;
      const echoue = () => { appels++; return Promise.reject(new Error('HTTP 429')); };
      await m.avecCacheEnLigne('testC', 'mer', echoue).catch(() => {});
      await new Promise(r => setTimeout(r, 0));
      await m.avecCacheEnLigne('testC', 'mer', echoue).catch(() => {});
      assertEqual(appels, 2);
    });
  });
};
