
function buildPanelRimes(vue, panelRimes){
  const rimeForm = panelRimes.createDiv({ cls: 'cp-rime-form' });
  const motInput = rimeForm.createEl('input', { attr: { type: 'text', placeholder: 'Un mot… (ex. lumière, chapeau, courage)' } });
  const btnChercher = rimeForm.createEl('button', { text: 'Chercher' });

  // Bloc filtres : 3 lignes étiquetées (Lettre/syllabe, Qualité de rime,
  // Nature), séparées par un fin trait, dans une boîte à part du bloc
  // recherche et du bloc sources en ligne (voir plus bas).
  const filtresBox = panelRimes.createDiv({ cls: 'cp-boite cp-filtres' });

  const ligneLettreSyllabe = filtresBox.createDiv({ cls: 'cp-filtres-ligne' });
  ligneLettreSyllabe.createSpan({ cls: 'cp-filtres-ligne-label', text: 'Lettre / syllabe : ' });
  const lettreInput = ligneLettreSyllabe.createEl('input', { cls: 'cp-filtre-lettre', attr: { type: 'text', maxlength: '1', placeholder: 'Lettre' } });
  const syllabesWrap = ligneLettreSyllabe.createDiv({ cls: 'cp-select-wrap' });
  const syllabesSelect = syllabesWrap.createEl('select', { cls: 'cp-filtre-syllabes' });
  syllabesWrap.createSpan({ cls: 'cp-select-arrow', text: '▾' });
  [['', 'Toutes syllabes'], ['1','1 syll.'], ['2','2 syll.'], ['3','3 syll.'], ['4','4 syll.'], ['5+','5+ syll.']]
    .forEach(([val, label]) => syllabesSelect.createEl('option', { attr: { value: val }, text: label }));

  filtresBox.createDiv({ cls: 'cp-filtres-separateur' });

  const ligneQualite = filtresBox.createDiv({ cls: 'cp-filtres-ligne' });
  ligneQualite.createSpan({ cls: 'cp-filtres-ligne-label', text: 'Qualité de rime : ' });
  const qualiteDiv = ligneQualite.createDiv({ cls: 'cp-qualite-filtres' });
  const casesQualite = {};
  // 5 cases indépendantes, toutes de vraies checkbox du DOM — seule
  // source de vérité, jamais dupliquée ni resynchronisée à la main.
  [['pauvre','Pauvre'],['suffisante','Suffisante'],['riche','Riche'],['tresriche','Très riche'],['leonine','Léonine']].forEach(([id, label]) => {
    const lbl = qualiteDiv.createEl('label', { cls: 'cp-hasard-toggle-pool cp-qualite-pill' });
    lbl.style.setProperty('--qcolor', COULEURS_QUALITE[id]);
    const c = lbl.createEl('input', { attr: { type: 'checkbox' } });
    c.checked = (id !== 'pauvre'); // pauvre décochée par défaut
    lbl.createSpan({ text: ' ' + label });
    casesQualite[id] = c;
  });

  // "Riche+" n'est qu'un raccourci d'action (pas une case, pas un état
  // à maintenir) : au clic, il lit l'état actuel de riche/tresriche/
  // leonine et les coche/décoche tous les 3 ensemble. Aucune duplication
  // d'état possible puisqu'il ne fait que lire/écrire les 3 vraies cases.
  const btnRichePlus = ligneQualite.createEl('button', { cls: 'cp-link-btn', text: 'Riche+ (tout / rien)' });
  btnRichePlus.setAttr('title', 'Coche ou décoche riche + très riche + léonine en une fois.');
  btnRichePlus.addEventListener('click', () => {
    const cible = !(casesQualite.riche.checked && casesQualite.tresriche.checked && casesQualite.leonine.checked);
    casesQualite.riche.checked = cible;
    casesQualite.tresriche.checked = cible;
    casesQualite.leonine.checked = cible;
    chercher();
  });

  filtresBox.createDiv({ cls: 'cp-filtres-separateur' });

  // Filtre grammatical (base 2.29+). Un mot peut porter plusieurs catégories
  // (ex. « abaissé » verbe et adjectif) : le filtre est un OU logique, comme
  // pour les cases de qualité. Un mot sans catégorie connue (mot rare de
  // Méral, résultat en ligne RimesSolides/Wiktionnaire) n'est jamais caché :
  // le filtre ne porte que sur ce qu'on sait (voir categoriesDuMot).
  // Style volontairement plus discret que la qualité (contour seul, jamais
  // de fond plein) : ces catégories ne sont reprises nulle part ailleurs
  // dans l'affichage, contrairement aux couleurs de qualité.
  const ligneCgram = filtresBox.createDiv({ cls: 'cp-filtres-ligne' });
  ligneCgram.createSpan({ cls: 'cp-filtres-ligne-label', text: 'Nature : ' });
  const cgramDiv = ligneCgram.createDiv({ cls: 'cp-cgram-filtres' });
  const casesCgram = {};
  [['NOM','Nom'],['VER','Verbe'],['ADJ','Adjectif'],['ADV','Adverbe'],['AUTRE','Autres']].forEach(([id, label]) => {
    const lbl = cgramDiv.createEl('label', { cls: 'cp-cgram-pill' });
    lbl.style.setProperty('--ccolor', COULEURS_CGRAM[id]);
    const c = lbl.createEl('input', { attr: { type: 'checkbox' } });
    c.checked = true; // tout coché par défaut : le filtre ne restreint rien tant qu'on ne décoche pas
    lbl.createSpan({ text: ' ' + label });
    casesCgram[id] = c;
  });

  // Bloc sources en ligne, dans sa propre boîte.
  const sourcesDiv = panelRimes.createDiv({ cls: 'cp-boite cp-sources' });
  sourcesDiv.createSpan({ cls: 'cp-sources-label', text: 'Compléter en ligne : ' });
  const caseRimesSolides = sourcesDiv.createEl('label', { cls: 'cp-hasard-toggle-pool' });
  const inputRimesSolides = caseRimesSolides.createEl('input', { attr: { type: 'checkbox' } });
  caseRimesSolides.createSpan({ text: ' RimesSolides' });
  const caseWiktionnaire = sourcesDiv.createEl('label', { cls: 'cp-hasard-toggle-pool' });
  const inputWiktionnaire = caseWiktionnaire.createEl('input', { attr: { type: 'checkbox' } });
  caseWiktionnaire.createSpan({ text: ' Wiktionnaire' });
  caseWiktionnaire.setAttr('title', 'Rimes classées par le Wiktionnaire (catégories « Rimes en français »). Couverture partielle, mais utile en secours et pour les mots rares ou les locutions.');

  const modeDiv = sourcesDiv.createDiv({ cls: 'cp-qualite-sousfiltres' });
  const modeLabel = modeDiv.createEl('label', { cls: 'cp-hasard-toggle-pool' });
  const inputModeAssonance = modeLabel.createEl('input', { attr: { type: 'checkbox' } });
  modeLabel.createSpan({ text: ' Mode assonance (accepte les rimes approchées)' });
  inputModeAssonance.setAttr('title', 'Rime stricte par défaut : les résultats doivent réellement rimer. Coche pour aussi accepter les assonances (même voyelle, terminaison différente — ex. « ombre »/« montre »), affichées à part.');


  const resultatsDiv = panelRimes.createDiv({ cls: 'cp-resultats' });

  (async () => {
    const data = await vue.plugin.loadData();
    inputModeAssonance.checked = !!(data && data.modeAssonance);
    MODE_ASSONANCE = inputModeAssonance.checked;
  })();
  inputModeAssonance.addEventListener('change', async () => {
    MODE_ASSONANCE = inputModeAssonance.checked;
    const data = (await vue.plugin.loadData()) || {};
    data.modeAssonance = inputModeAssonance.checked;
    await vue.plugin.saveData(data);
    chercher();
  });
  // Le réglage global (Settings → Carnet du Poète) peut changer
  // MODE_ASSONANCE pendant qu'on est sur un autre onglet ; on resynchronise
  // la case visuellement à chaque retour sur l'onglet Rimes plutôt que de
  // la figer à l'ouverture initiale du panneau.
  vue._rafraichitAssonanceRimes = () => { inputModeAssonance.checked = MODE_ASSONANCE; };

  const lireFiltres = () => ({
    lettre: lettreInput.value.trim(),
    syllabes: syllabesSelect.value,
    qualites: new Set(Object.keys(casesQualite).filter(id => casesQualite[id].checked)),
    cgram: new Set(Object.keys(casesCgram).filter(id => casesCgram[id].checked))
  });
  const sourcesActives = () => [
    ...(inputRimesSolides.checked ? ['rimessolides'] : []),
    ...(inputWiktionnaire.checked ? ['wiktionnaire'] : [])
  ];
  // Sources cochées mémorisées d'une session à l'autre, comme dans
  // Synonymes et Inspiration (décochées par défaut).
  const sauvePreferenceSources = async () => {
    const data = (await vue.plugin.loadData()) || {};
    data.sourcesEnLigneRimes = sourcesActives();
    await vue.plugin.saveData(data);
  };
  (async () => {
    const data = await vue.plugin.loadData();
    const prefs = (data && Array.isArray(data.sourcesEnLigneRimes)) ? data.sourcesEnLigneRimes : [];
    inputRimesSolides.checked = prefs.includes('rimessolides');
    inputWiktionnaire.checked = prefs.includes('wiktionnaire');
  })();

  const chercher = () => renderResultatsRimes(resultatsDiv, motInput.value, lireFiltres(), vue.plugin, sourcesActives());
  // Même raison que _renderAnalyseSyllabes : permettre un recalcul externe
  // (toggle debug dico perso) sans avoir à retaper la recherche.
  vue._rechercherRimes = chercher;

  btnChercher.addEventListener('click', chercher);
  motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });
  lettreInput.addEventListener('input', chercher);
  syllabesSelect.addEventListener('change', chercher);
  Object.values(casesQualite).forEach(c => c.addEventListener('change', chercher));
  Object.values(casesCgram).forEach(c => c.addEventListener('change', chercher));
  inputRimesSolides.addEventListener('change', chercher);
  inputWiktionnaire.addEventListener('change', chercher);
  inputRimesSolides.addEventListener('change', sauvePreferenceSources);
  inputWiktionnaire.addEventListener('change', sauvePreferenceSources);

  vue._prefillRimeInput = (mot) => {
    motInput.value = mot;
    chercher();
  };
}

