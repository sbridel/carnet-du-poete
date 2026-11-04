const { groupe, test, assertEqual } = require('./framework');

// Bouton « Note active » (2.31.0) : extraction du poème d'une note.
module.exports = function testsNote(m) {
  const note = [
    '---', 'forme: sonnet', 'tags: [poeme]', '---',
    '# Brouillon du matin', '',
    'Quelques notes **avant** le poème, avec un [[lien|renvoi]].', '',
    '```poeme', 'Demain, dès l\'aube, à l\'heure', 'où blanchit la campagne', '```', '',
    '- idée : changer la fin', '> citation de travail'
  ].join('\n');

  groupe('Note active — extraction du poème', () => {
    test('la sélection a la priorité', () => {
      const r = m.extraitPoemeDeNote(note, '**Je partirai.** Vois-tu');
      assertEqual(r.source, 'sélection'); assertEqual(r.texte, 'Je partirai. Vois-tu');
    });
    test('sinon le premier bloc ```poeme, seul', () => {
      const r = m.extraitPoemeDeNote(note, '');
      assertEqual(r.source, 'bloc poeme');
      assertEqual(r.texte, 'Demain, dès l\'aube, à l\'heure\noù blanchit la campagne');
    });
    test('sinon toute la note, frontmatter et syntaxe Markdown retirés', () => {
      const r = m.extraitPoemeDeNote(note.replace('```poeme', '```text'), '');
      assertEqual(r.source, 'note entière');
      const l = r.texte.split('\n');
      assertEqual(l[0], 'Brouillon du matin');
      assertEqual(l[2], 'Quelques notes avant le poème, avec un renvoi.');
      assertEqual(r.texte.includes('forme: sonnet'), false, 'frontmatter retiré');
      assertEqual(l[l.length - 2], 'idée : changer la fin'); assertEqual(l[l.length - 1], 'citation de travail');
    });
    test('bloc ~~~poème (tildes, accent) reconnu aussi', () => {
      assertEqual(m.extraitPoemeDeNote('avant\n~~~poème\nun vers\n~~~\naprès', '').texte, 'un vers');
    });
  });
};
