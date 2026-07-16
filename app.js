/* ============================================================
   Mutmach-Insel — mit Pelo
   Kindgerechte Lern-App zu Gefühlen, Kommunikation & Stress.
   Inhalte werden nach Altersstufe gefiltert und bei jedem
   Durchgang neu gemischt — kein starrer Ablauf.
   Alle Daten bleiben ausschließlich lokal (localStorage).
   ============================================================ */

const STORAGE_KEY = "mutmach-insel-profile-v1";

/* ---------- Altersstufen ---------- */
const AGE_ORDER = ["2-3","3-4","5-6","7-8","9-10"];
function ageLevel(age){
  const i = AGE_ORDER.indexOf(age);
  return i<0 ? 1 : i+1; // 1..5
}
function currentLevel(){ return ageLevel(profile ? profile.age : "2-3"); }
function shuffle(arr){ return [...arr].sort(()=>Math.random()-0.5); }
function byLevel(list){ return list.filter(x => x.level <= currentLevel()); }

/* ---------- Gefühle (Basis für alle, erweitert ab 7-8 / 9-10) ---------- */
const EMOTIONS = [
  { id:"freude",       label:"Freude",        emoji:"😊", level:1 },
  { id:"traurig",      label:"Traurigkeit",   emoji:"😢", level:1 },
  { id:"wut",          label:"Wut",           emoji:"😠", level:1 },
  { id:"angst",        label:"Angst",         emoji:"😟", level:1 },
  { id:"ueberr",       label:"Überraschung",  emoji:"😮", level:1 },
  { id:"ruhe",         label:"Ruhe",          emoji:"😌", level:1 },
  { id:"stolz",        label:"Stolz",         emoji:"😌", level:3 },
  { id:"nervoes",      label:"Nervosität",    emoji:"😬", level:3 },
  { id:"enttaeuscht",  label:"Enttäuschung",  emoji:"😞", level:3 },
  { id:"eifersucht",   label:"Eifersucht",    emoji:"😒", level:4 },
  { id:"scham",        label:"Verlegenheit",  emoji:"😳", level:4 },
  { id:"dankbar",      label:"Dankbarkeit",   emoji:"🥰", level:4 },
];
// eindeutige Emoji-Icons statt Doppelbelegung
EMOTIONS.find(e=>e.id==="stolz").emoji = "🙂‍↕️";
function emotionById(id){ return EMOTIONS.find(e=>e.id===id); }

/* ---------- Modul 1: Gefühle entdecken (großer, gemischter Szenen-Pool) ---------- */
const FEELING_SCENES = [
  { level:1, text:"Papa gibt Lea ein Eis.", correct:"freude" },
  { level:1, text:"Toms Turm fällt um.", correct:"traurig" },
  { level:1, text:"Ein lauter Hund bellt.", correct:"angst" },
  { level:1, text:"Mama versteckt sich und ruft „Kuckuck!“.", correct:"ueberr" },
  { level:1, text:"Nele kuschelt sich in die warme Decke.", correct:"ruhe" },
  { level:1, text:"Ben darf nicht mehr schaukeln.", correct:"wut" },
  { level:1, text:"Oma nimmt Mia ganz fest in den Arm.", correct:"freude" },
  { level:1, text:"Das Lieblingskuscheltier ist weg.", correct:"traurig" },
  { level:2, text:"Mia bekommt zum Geburtstag genau das Fahrrad, das sie sich gewünscht hat.", correct:"freude" },
  { level:2, text:"Toms Turm aus Bauklötzen fällt um, kurz bevor er fertig ist.", correct:"wut" },
  { level:2, text:"Lina findet ihr Kuscheltier nicht mehr und sucht überall danach.", correct:"traurig" },
  { level:2, text:"Ben hört plötzlich ein lautes Knallen und zuckt zusammen.", correct:"angst" },
  { level:2, text:"Als Sara die Tür öffnet, rufen alle Freunde 'Überraschung!'.", correct:"ueberr" },
  { level:2, text:"Nach dem Vorlesen kuschelt sich Emma in ihre Decke und wird ganz still.", correct:"ruhe" },
  { level:2, text:"Jonas darf heute länger auf dem Spielplatz bleiben als sonst.", correct:"freude" },
  { level:2, text:"Die Freundin von Nora will heute nicht mit ihr spielen.", correct:"traurig" },
  { level:2, text:"Paul soll sein Eis abgeben, weil es herunterfällt.", correct:"traurig" },
  { level:2, text:"Ein großer Hund bellt plötzlich ganz laut neben Mila.", correct:"angst" },
  { level:3, text:"Finn muss sein Spielzeugauto mit seiner Schwester teilen, obwohl er gerade damit spielt.", correct:"wut" },
  { level:3, text:"Am ersten Kita-Tag kennt Ida noch niemanden im Raum.", correct:"angst" },
  { level:3, text:"Nach dem Streit vertragen sich Leo und Max wieder und lachen zusammen.", correct:"freude" },
  { level:3, text:"Beim Puzzeln findet Tim ein Teil, das gar nicht ins Bild passt.", correct:"ueberr" },
  { level:3, text:"Am Strand hört Ana nur das Rauschen der Wellen und wird ganz ruhig.", correct:"ruhe" },
  { level:3, text:"Kim wollte die Schaukel nehmen, aber sie ist schon besetzt.", correct:"traurig" },
  { level:3, text:"Am Ende des Kindergartentages darf Mia als Erste die neue Rutsche ausprobieren.", correct:"freude" },
  { level:3, text:"Opa bringt Ben unerwartet seinen Lieblingskuchen mit.", correct:"freude" },
  { level:3, text:"Nach dem Umzug vermisst Lina ihre alten Freunde aus dem Kindergarten.", correct:"traurig" },
  { level:3, text:"Toms Papierboot sinkt beim Spielen im Teich unter.", correct:"traurig" },
  { level:3, text:"Emma darf noch nicht mit auf den großen Spielplatz, weil es schon dunkel wird.", correct:"wut" },
  { level:3, text:"Finn muss sein Eis mit seinem Bruder teilen, obwohl er es ganz für sich wollte.", correct:"wut" },
  { level:3, text:"Vor dem ersten Zahnarztbesuch hat Paul ein mulmiges Gefühl im Bauch.", correct:"angst" },
  { level:3, text:"Beim Gewitter blitzt und donnert es laut vor Julias Fenster.", correct:"angst" },
  { level:3, text:"Als Nele ihre Kindergartentasche öffnet, findet sie einen kleinen Brief von Mama darin.", correct:"ueberr" },
  { level:3, text:"Beim Ostereiersuchen findet Ben ein Ei an einem Ort, den er nie erwartet hätte.", correct:"ueberr" },
  { level:3, text:"Nach dem Toben im Garten setzt sich Mia in die Hängematte und schaukelt sanft.", correct:"ruhe" },
  { level:3, text:"Beim Kuscheln mit dem Kater wird Toms Atem ganz langsam und ruhig.", correct:"ruhe" },
  { level:4, text:"Nach dem Fußballspiel merkt Luis, dass sein Team verloren hat, obwohl er sich sehr angestrengt hat.", correct:"enttaeuscht" },
  { level:4, text:"Vor dem Vorlesen der eigenen Geschichte vor der Klasse zittern Emilys Hände.", correct:"nervoes" },
  { level:4, text:"Nils hat es geschafft, ganz allein schwimmen zu lernen, und zeigt es stolz seinen Eltern.", correct:"stolz" },
  { level:4, text:"Auf dem Weg zur neuen Schule weiß Aylin nicht, was sie erwartet.", correct:"nervoes" },
  { level:4, text:"Obwohl Jana sich riesig auf den Ausflug gefreut hat, wird er wegen Regen abgesagt.", correct:"enttaeuscht" },
  { level:4, text:"David hat sein Zimmer ganz allein aufgeräumt und freut sich über das Ergebnis.", correct:"stolz" },
  { level:5, text:"Als der kleine Bruder mehr Aufmerksamkeit von Mama bekommt, wird Mila ganz still und mault.", correct:"eifersucht" },
  { level:5, text:"Vor der ganzen Klasse rutscht Elias aus und alle schauen zu ihm.", correct:"scham" },
  { level:5, text:"Opa hat extra für Selma ihr Lieblingsessen gekocht, und sie bedankt sich mit einer Umarmung.", correct:"dankbar" },
  { level:5, text:"Als die beste Freundin mit jemand anderem spielt, spürt Leni ein komisches Ziehen im Bauch.", correct:"eifersucht" },
  { level:5, text:"Als Milo im Diktat einen Fehler entdeckt, den alle sehen können, wird ihm ganz heiß im Gesicht.", correct:"scham" },
];

/* ---------- Modul 2: Ich sag's mit Worten ---------- */
const WORD_SCENES = [
  { level:2, text:"Dein Bruder nimmt dein Spielzeug, ohne zu fragen. Was sagst du?",
    options:[
      { text:"„Ich möchte das Spielzeug bitte zurück, ich spiele noch damit.“", good:true },
      { text:"„Das ist gemein, ich hasse dich!“", good:false },
      { text:"Gar nichts sagen und traurig weggehen.", good:false } ] },
  { level:2, text:"Du bist in der Kita ganz allein und würdest gern mitspielen. Was sagst du?",
    options:[
      { text:"„Darf ich mitspielen? Das sieht lustig aus!“", good:true },
      { text:"Einfach mitten ins Spiel laufen, ohne zu fragen.", good:false },
      { text:"Traurig in der Ecke sitzen bleiben.", good:false } ] },
  { level:2, text:"Du bist wütend, weil du noch nicht fernsehen darfst. Was sagst du?",
    options:[
      { text:"„Ich bin gerade wütend, weil ich noch nicht fernsehen darf.“", good:true },
      { text:"Laut schreien und mit den Füßen stampfen.", good:false },
      { text:"Die Fernbedienung wegwerfen.", good:false } ] },
  { level:2, text:"Ein Freund hat dir wehgetan, ohne es zu wollen. Was sagst du?",
    options:[
      { text:"„Autsch, das tat weh. Bitte pass auf!“", good:true },
      { text:"Zurückschubsen.", good:false },
      { text:"Gar nichts sagen, aber sauer sein.", good:false } ] },
  { level:2, text:"Du hast Angst vor dem dunklen Flur. Was sagst du zu Mama oder Papa?",
    options:[
      { text:"„Ich habe Angst im dunklen Flur, kannst du mitkommen?“", good:true },
      { text:"Einfach nicht mehr durch den Flur gehen und niemandem etwas sagen.", good:false },
      { text:"So tun, als wäre nichts.", good:false } ] },
  { level:2, text:"Du freust dich riesig über dein Bild, das du gemalt hast. Was sagst du?",
    options:[
      { text:"„Schau mal, ich bin richtig stolz auf mein Bild!“", good:true },
      { text:"Das Bild einfach wegräumen.", good:false },
      { text:"Nichts sagen, obwohl man sich freut.", good:false } ] },
  { level:3, text:"Ein Kind lacht über deinen Turm, der umgefallen ist. Was sagst du?",
    options:[
      { text:"„Das fand ich nicht lustig. Hilfst du mir, ihn neu zu bauen?“", good:true },
      { text:"Den Turm des anderen Kindes auch umwerfen.", good:false },
      { text:"Weinend weglaufen, ohne etwas zu sagen.", good:false } ] },
  { level:3, text:"Du möchtest, dass dein Freund dir seine Buntstifte leiht. Was sagst du?",
    options:[
      { text:"„Kann ich mir kurz einen Stift ausleihen? Ich gebe ihn gleich zurück.“", good:true },
      { text:"Den Stift einfach nehmen.", good:false },
      { text:"Warten und hoffen, dass er es merkt.", good:false } ] },
  { level:3, text:"Du bist müde und die anderen wollen noch weiterspielen. Was sagst du?",
    options:[
      { text:"„Ich bin müde und brauche eine kleine Pause.“", good:true },
      { text:"Einfach weitermachen, obwohl es dir zu viel wird.", good:false },
      { text:"Anfangen zu weinen, ohne zu sagen warum.", good:false } ] },
  { level:3, text:"Du hast aus Versehen den Turm deines Freundes kaputt gemacht. Was sagst du?",
    options:[
      { text:"„Entschuldigung, das wollte ich nicht. Ich helfe dir, ihn wieder aufzubauen.“", good:true },
      { text:"So tun, als wäre nichts gewesen.", good:false },
      { text:"Die Schuld einem anderen Kind geben.", good:false } ] },
  { level:3, text:"Du möchtest bei der Schaukel drankommen, aber ein anderes Kind schaukelt schon lange. Was sagst du?",
    options:[
      { text:"„Wann bin ich dran? Ich warte schon eine Weile.“", good:true },
      { text:"„Sofort runter, ich will jetzt!“", good:false },
      { text:"Schweigend wegrennen und traurig sein.", good:false } ] },
  { level:3, text:"Du hast aus Versehen das Bild eines anderen Kindes bekleckert. Was sagst du?",
    options:[
      { text:"„Entschuldigung, das wollte ich nicht. Kann ich dir helfen, es sauber zu machen?“", good:true },
      { text:"Einfach weggehen, ohne etwas zu sagen.", good:false },
      { text:"Behaupten, ein anderes Kind war's.", good:false } ] },
  { level:3, text:"Beim Mittagessen möchtest du noch etwas Gemüse, aber die Schüssel ist leer. Was sagst du?",
    options:[
      { text:"„Könnte ich bitte noch etwas Gemüse haben?“", good:true },
      { text:"Laut rufen: „Ich will mehr!“", good:false },
      { text:"Nichts sagen und hungrig bleiben.", good:false } ] },
  { level:3, text:"Ein Kind nimmt sich den letzten Platz auf der Bank, den du wolltest. Was sagst du?",
    options:[
      { text:"„Schade, ist noch woanders Platz für mich?“", good:true },
      { text:"Das Kind wegschubsen.", good:false },
      { text:"Weinen, ohne etwas zu sagen.", good:false } ] },
  { level:3, text:"Du möchtest mit deinem Freund draußen spielen, aber er will drinnen bleiben. Was sagst du?",
    options:[
      { text:"„Ich würde gern draußen spielen — hast du Lust, später reinzukommen?“", good:true },
      { text:"Ihn einfach allein lassen und wütend werden.", good:false },
      { text:"Ihn zwingen mitzukommen.", good:false } ] },
  { level:3, text:"Du hast ein bisschen Angst, allein auf die Toilette zu gehen. Was sagst du der Erzieherin?",
    options:[
      { text:"„Ich habe ein bisschen Angst allein — kommst du kurz mit?“", good:true },
      { text:"Es einfach hinauszögern, ohne etwas zu sagen.", good:false },
      { text:"Weinen, ohne zu erklären warum.", good:false } ] },
  { level:3, text:"Ein Freund hat dir sein Lieblingsspielzeug geliehen, du bist ihm dankbar. Was sagst du?",
    options:[
      { text:"„Danke, dass ich das ausleihen darf, ich pass gut darauf auf!“", good:true },
      { text:"Einfach nichts sagen und weiterspielen.", good:false },
      { text:"Es behalten, ohne Danke zu sagen.", good:false } ] },
  { level:3, text:"Du bist stolz, weil du ganz allein deine Schuhe zubinden konntest. Was sagst du?",
    options:[
      { text:"„Schau mal, ich hab's ganz allein geschafft!“", good:true },
      { text:"Nichts sagen, obwohl du stolz bist.", good:false },
      { text:"Behaupten, jemand anderes hätte geholfen, obwohl das nicht stimmt.", good:false } ] },
  { level:4, text:"Deine Freundin hat ohne dich mit jemand anderem gespielt und du bist traurig. Was sagst du ihr?",
    options:[
      { text:"„Ich war traurig, weil ich dachte, wir spielen heute zusammen. Können wir morgen was machen?“", good:true },
      { text:"Sie einfach ignorieren, ohne einen Grund zu nennen.", good:false },
      { text:"Zu anderen Kindern schlecht über sie reden.", good:false } ] },
  { level:4, text:"In der Gruppenarbeit hat jemand deine Idee als seine eigene vorgestellt. Was sagst du?",
    options:[
      { text:"„Das war eigentlich meine Idee — lass uns das gemeinsam sagen.“", good:true },
      { text:"Laut vor allen schimpfen.", good:false },
      { text:"Gar nichts sagen, obwohl es dich stört.", good:false } ] },
  { level:4, text:"Du merkst, dass ein Kind in der Pause immer allein ist. Was sagst du?",
    options:[
      { text:"„Möchtest du mit uns spielen?“", good:true },
      { text:"Nichts sagen, es geht dich ja nichts an.", good:false },
      { text:"Mit anderen über das Kind tuscheln.", good:false } ] },
  { level:4, text:"Du hast dich für einen Test angestrengt, aber trotzdem eine schlechte Note bekommen. Was sagst du deinen Eltern?",
    options:[
      { text:"„Ich bin enttäuscht, ich hatte mir mehr Mühe erhofft. Kannst du mir beim Üben helfen?“", good:true },
      { text:"Den Test verstecken und nichts sagen.", good:false },
      { text:"Behaupten, der Test sei unfair gewesen, obwohl das nicht stimmt.", good:false } ] },
  { level:5, text:"Dein bester Freund verbringt in letzter Zeit viel Zeit mit einem neuen Kind, und du bist eifersüchtig. Was sagst du?",
    options:[
      { text:"„Mir fehlt unsere Zeit zusammen. Können wir mal wieder was zu zweit machen?“", good:true },
      { text:"Schlecht über das neue Kind reden.", good:false },
      { text:"So tun, als wäre dir alles egal, obwohl es dich traurig macht.", good:false } ] },
  { level:5, text:"Du hast vor der Klasse einen Fehler gemacht und schämst dich. Ein Freund fragt, ob alles okay ist. Was sagst du?",
    options:[
      { text:"„Mir war das gerade peinlich, aber es geht schon wieder.“", good:true },
      { text:"So tun, als wäre gar nichts passiert.", good:false },
      { text:"Ihn anschnauzen, obwohl er nur nett sein wollte.", good:false } ] },
  { level:5, text:"Deine Gruppe hat einen Wettbewerb verloren, obwohl alle sich angestrengt haben. Was sagst du zum Team?",
    options:[
      { text:"„Schade, aber wir haben gut zusammengearbeitet. Beim nächsten Mal schaffen wir das!“", good:true },
      { text:"Einem Teammitglied die Schuld geben.", good:false },
      { text:"Beleidigt sein und nicht mehr mit dem Team reden.", good:false } ] },
  { level:5, text:"Jemand in deiner Klasse wird von anderen ausgelacht. Was sagst du?",
    options:[
      { text:"„Hört auf damit, das ist nicht nett.“ und dem Kind Gesellschaft leisten.", good:true },
      { text:"Mitlachen, damit man selbst dazugehört.", good:false },
      { text:"Wegschauen, weil es einen nichts angeht.", good:false } ] },
];

/* ---------- Modul: Stress-Helfer (gesunder Umgang mit Stress) ---------- */
const STRESS_SCENES = [
  { level:2, text:"Es ist im Kindergarten gerade sehr laut und du fühlst dich unwohl.",
    options:[
      { text:"Ich gehe zur Erzieherin und sage: „Mir ist das zu laut.“", good:true },
      { text:"Ich schreie noch lauter mit.", good:false },
      { text:"Ich halte alles in mir fest und sage nichts.", good:false } ] },
  { level:2, text:"Du bist hungrig und müde und wirst schnell quengelig.",
    options:[
      { text:"Ich sage: „Ich brauche etwas zu essen und eine Pause.“", good:true },
      { text:"Ich fange an zu meckern, ohne zu sagen warum.", good:false },
      { text:"Ich renne wild durch den Raum.", good:false } ] },
  { level:2, text:"Beim Warten in der Schlange wird dir die Zeit lang und du wirst unruhig.",
    options:[
      { text:"Ich atme ruhig und denke an etwas Schönes.", good:true },
      { text:"Ich dränge mich vor.", good:false },
      { text:"Ich fange an zu schubsen.", good:false } ] },
  { level:3, text:"Du und dein Geschwisterkind streitet euch, wer zuerst schaukeln darf.",
    options:[
      { text:"Ich schlage vor: „Lass uns abwechseln, ich zähle bis 20.“", good:true },
      { text:"Ich schubse mein Geschwisterkind von der Schaukel.", good:false },
      { text:"Ich renne weinend weg, ohne etwas zu sagen.", good:false } ] },
  { level:3, text:"Du sollst dein Zimmer aufräumen, aber es sieht nach ganz viel Arbeit aus.",
    options:[
      { text:"Ich fange mit einer kleinen Ecke an, Schritt für Schritt.", good:true },
      { text:"Ich werfe alles unters Bett.", good:false },
      { text:"Ich setze mich hin und mache gar nichts.", good:false } ] },
  { level:3, text:"Im Bus ist es voll und laut, und dir wird es zu viel.",
    options:[
      { text:"Ich schließe kurz die Augen und atme ruhig.", good:true },
      { text:"Ich halte mir die Ohren zu und schreie.", good:false },
      { text:"Ich werde zappelig und störe andere.", good:false } ] },
  { level:3, text:"Du bist aufgeregt, weil du zum ersten Mal bei einem Freund übernachten sollst.",
    options:[
      { text:"Ich packe mit Mama zusammen meinen Lieblingsteddy ein, das gibt mir Sicherheit.", good:true },
      { text:"Ich sage gar nichts und bin die ganze Zeit ängstlich.", good:false },
      { text:"Ich sage kurzfristig ab, ohne einen Grund zu nennen.", good:false } ] },
  { level:3, text:"Beim Anziehen für den Kindergarten geht heute alles schief, und du wirst hektisch.",
    options:[
      { text:"Ich atme kurz durch und mache es Schritt für Schritt.", good:true },
      { text:"Ich werfe die Kleidung wütend durchs Zimmer.", good:false },
      { text:"Ich fange an zu weinen, ohne es jemandem zu sagen.", good:false } ] },
  { level:3, text:"Du hast Angst vor dem großen Hund des Nachbarn.",
    options:[
      { text:"Ich halte Abstand und sage Mama, dass ich Angst habe.", good:true },
      { text:"Ich renne schreiend weg.", good:false },
      { text:"Ich tue so, als hätte ich keine Angst, obwohl ich sehr unsicher bin.", good:false } ] },
  { level:3, text:"In der Kita ist heute eine Vertretung da, das ist ungewohnt für dich.",
    options:[
      { text:"Ich bleibe erstmal in der Nähe von einem Freund, den ich kenne.", good:true },
      { text:"Ich verstecke mich den ganzen Tag.", good:false },
      { text:"Ich werde zu allen unfreundlich.", good:false } ] },
  { level:3, text:"Du musst auf dem Spielplatz warten, bis du an der Reihe bist, und wirst ungeduldig.",
    options:[
      { text:"Ich zähle in Gedanken oder singe leise ein Lied, während ich warte.", good:true },
      { text:"Ich dränge mich vor.", good:false },
      { text:"Ich werde laut und schimpfe.", good:false } ] },
  { level:3, text:"Ein lautes Feuerwerk erschreckt dich draußen.",
    options:[
      { text:"Ich halte mir kurz die Ohren zu und suche die Nähe eines Erwachsenen.", good:true },
      { text:"Ich renne allein weg, ohne Bescheid zu sagen.", good:false },
      { text:"Ich werde die ganze Zeit zittrig, ohne es jemandem zu sagen.", good:false } ] },
  { level:4, text:"Morgen schreibst du einen Vokabeltest und bist ganz nervös.",
    options:[
      { text:"Ich übe kurz in Ruhe und mache dann etwas Entspannendes.", good:true },
      { text:"Ich lerne bis spät in die Nacht und schlafe kaum.", good:false },
      { text:"Ich denke gar nicht mehr daran und lerne gar nicht.", good:false } ] },
  { level:4, text:"Du hast bei einem Spiel verloren und bist richtig frustriert.",
    options:[
      { text:"Ich sage: „Das ärgert mich“, und atme ein paar Mal tief durch.", good:true },
      { text:"Ich werfe das Spiel vom Tisch.", good:false },
      { text:"Ich beschuldige die anderen, geschummelt zu haben.", good:false } ] },
  { level:4, text:"Du hast an einem Tag Hausaufgaben, Training und einen Geburtstag — dir wird alles zu viel.",
    options:[
      { text:"Ich erzähle einem Erwachsenen, dass mir alles zu viel wird.", good:true },
      { text:"Ich mache heimlich gar nichts mehr fertig.", good:false },
      { text:"Ich werde bei allen um mich herum gereizt.", good:false } ] },
  { level:4, text:"Du hast Streit mit einer Freundin und denkst den ganzen Tag daran.",
    options:[
      { text:"Ich rede in Ruhe mit ihr, sobald ich mich beruhigt habe.", good:true },
      { text:"Ich schreibe ihr viele wütende Nachrichten.", good:false },
      { text:"Ich rede tagelang nicht mehr mit ihr, ohne einen Grund zu nennen.", good:false } ] },
  { level:5, text:"Vor einem Wettbewerb hast du solches Lampenfieber, dass dein Bauch kribbelt.",
    options:[
      { text:"Ich mache eine kurze Atemübung und erinnere mich, dass ich geübt habe.", good:true },
      { text:"Ich sage kurzfristig ab, ohne es zu versuchen.", good:false },
      { text:"Ich rede mir ein, dass sowieso alles schiefgehen wird.", good:false } ] },
  { level:5, text:"Du fühlst dich überfordert, weil in der Klasse gerade sehr viel gleichzeitig passiert.",
    options:[
      { text:"Ich bitte kurz um eine ruhige Minute, bevor ich weitermache.", good:true },
      { text:"Ich verstecke mich, ohne jemandem Bescheid zu geben.", good:false },
      { text:"Ich werde laut, um mir Luft zu machen.", good:false } ] },
  { level:5, text:"Du hast einen Fehler gemacht, der andere in deiner Gruppe geärgert hat.",
    options:[
      { text:"Ich entschuldige mich und frage, wie ich es wiedergutmachen kann.", good:true },
      { text:"Ich behaupte, es war nicht meine Schuld.", good:false },
      { text:"Ich ziehe mich beleidigt zurück.", good:false } ] },
  { level:5, text:"Zu Hause ist gerade viel Stress, und du merkst, dass du davon gereizt bist.",
    options:[
      { text:"Ich sage einem Erwachsenen ruhig, wie ich mich fühle.", good:true },
      { text:"Ich lasse meine Wut an einem Haustier oder Geschwisterkind aus.", good:false },
      { text:"Ich rede mit niemandem darüber und ziehe mich völlig zurück.", good:false } ] },
];

/* ---------- Ruhe-Übungen (mehrere Varianten für Abwechslung) ---------- */
const CALM_EXERCISES = [
  { id:"seifenblasen", level:1, icon:"🫧", title:"Seifenblasen-Pusten", desc:"Ganz sanft pusten wie eine Seifenblase", type:"breath", inLabel:"Luft holen …", outLabel:"Puuust …", inMs:3000, outMs:3000, rounds:3 },
  { id:"wellen", level:2, icon:"🌊", title:"Wellen-Atmung", desc:"Ruhig ein- und ausatmen wie sanfte Wellen", type:"breath", inLabel:"Einatmen …", outLabel:"Ausatmen …", inMs:4000, outMs:4000, rounds:4 },
  { id:"biene", level:2, icon:"🐝", title:"Bienen-Atmung", desc:"Leise summen beim Ausatmen", type:"breath", inLabel:"Einatmen …", outLabel:"Summmm …", inMs:3000, outMs:4000, rounds:4 },
  { id:"ballon", level:3, icon:"🎈", title:"Ballon-Bauch", desc:"Den Bauch wie einen Ballon füllen und leeren", type:"breath", inLabel:"Bauch füllt sich …", outLabel:"Bauch wird leicht …", inMs:4000, outMs:5000, rounds:4 },
  { id:"kuscheltier", level:3, icon:"🧸", title:"Kuscheltier-Atmung", desc:"Ein Kuscheltier auf dem Bauch beim Wippen beobachten", type:"breath", inLabel:"Kuscheltier steigt …", outLabel:"Kuscheltier sinkt …", inMs:4000, outMs:4000, rounds:4 },
  { id:"sinne", level:4, icon:"🔎", title:"5-Sinne-Pause", desc:"Die Welt um dich herum entdecken", type:"grounding" },
  { id:"wackeln", level:4, icon:"🍃", title:"Anspannen & Loslassen", desc:"Muskeln kurz anspannen, dann locker lassen", type:"muscle" },
];

const GROUNDING_STEPS = [
  "Schau dich um: Nenne 3 Dinge, die du gerade siehst.",
  "Lausche kurz: Welche 2 Geräusche hörst du gerade?",
  "Spüre deinen Körper: Wie fühlt sich der Boden unter deinen Füßen an?",
  "Atme einmal tief ein und aus. Du bist gerade hier und das ist gut so.",
];
const MUSCLE_STEPS = [
  { label:"Balle beide Hände fest zu Fäusten … und lass sie locker.", ms:4000 },
  { label:"Zieh die Schultern hoch zu den Ohren … und lass sie sinken.", ms:4000 },
  { label:"Drück die Fußsohlen fest auf den Boden … und entspanne sie.", ms:4000 },
  { label:"Runzle kurz die Stirn … und lass das Gesicht ganz weich werden.", ms:4000 },
];

/* ---------- Geschichten ---------- */
const STORIES = [
  { id:"ballon", level:1, title:"Der Luftballon", cover:"🎈",
    pages:[
      { scene:"🎈", text:"Lea hat einen bunten Luftballon." },
      { scene:"💥", text:"Peng! Der Luftballon platzt." },
      { scene:"🤗", text:"Mama nimmt Lea ganz fest in den Arm." } ],
    question:"Wie fühlt sich Lea, als der Ballon platzt?", options:["traurig","freude","ueberr"], correct:"traurig",
    tip:"Auch kleine Dinge können große Gefühle auslösen. Trösten hilft ganz doll." },
  { id:"schaukel", level:1, title:"Die Schaukel", cover:"🛝",
    pages:[
      { scene:"🛝", text:"Ben möchte schaukeln." },
      { scene:"⏳", text:"Er muss warten, bis er dran ist." },
      { scene:"😊", text:"Endlich schaukelt Ben ganz hoch." } ],
    question:"Wie fühlt sich Ben beim Warten?", options:["wut","freude","ruhe"], correct:"wut",
    tip:"Warten ist für kleine Kinder oft schwer. Ein Lied singen kann dabei helfen." },
  { id:"erster-tag", level:2, title:"Pelos erster Tag", cover:"🌤️",
    pages:[
      { scene:"🌱", text:"Pelo geht zum ersten Mal in die neue Gruppe. Im Bauch kribbelt es ganz komisch." },
      { scene:"🚪", text:"An der Tür bleibt Pelo kurz stehen. So viele neue Gesichter!" },
      { scene:"🤝", text:"Ein Kind lächelt Pelo an und fragt: „Möchtest du mitspielen?“" },
      { scene:"😊", text:"Pelo atmet einmal tief durch und sagt: „Ja, gerne!“" } ],
    question:"Wie hat sich Pelo an der Tür wohl gefühlt?", options:["angst","freude","wut"], correct:"angst",
    tip:"Aufgeregt sein vor etwas Neuem ist ganz normal. Ein tiefer Atemzug hilft, mutig zu bleiben." },
  { id:"turm", level:2, title:"Der umgefallene Turm", cover:"🧱",
    pages:[
      { scene:"🏗️", text:"Pelo baut einen riesigen Turm aus Bauklötzen. Ganz vorsichtig, Stein für Stein." },
      { scene:"💥", text:"Plötzlich stößt jemand dagegen — der ganze Turm fällt um!" },
      { scene:"😤", text:"Pelo spürt, wie es im Bauch heiß wird und die Fäuste sich ballen." },
      { scene:"🌬️", text:"Pelo macht drei ruhige Atemzüge und sagt dann: „Das hat mich richtig geärgert. Können wir zusammen neu bauen?“" } ],
    question:"Was hat Pelo gespürt, als der Turm umfiel?", options:["wut","ueberr","ruhe"], correct:"wut",
    tip:"Wut darf sein! Wichtig ist, sie mit Worten statt mit Schubsen zu zeigen." },
  { id:"dunkler-flur", level:2, title:"Der dunkle Flur", cover:"🌙",
    pages:[
      { scene:"🏠", text:"Es ist Abend. Pelo muss noch einmal durch den dunklen Flur zur Küche." },
      { scene:"😨", text:"Das Herz klopft schneller. Was, wenn dort etwas Gruseliges ist?" },
      { scene:"💬", text:"Pelo geht zu Mama und sagt: „Ich habe Angst im dunklen Flur.“" },
      { scene:"🕯️", text:"Gemeinsam machen sie ein kleines Licht an und gehen zusammen los." } ],
    question:"Was hat Pelo im dunklen Flur gefühlt?", options:["angst","freude","ruhe"], correct:"angst",
    tip:"Über Angst zu sprechen macht sie kleiner. Hilfe holen ist immer eine gute Idee." },
  { id:"teilen", level:3, title:"Ein Eis für zwei", cover:"🍦",
    pages:[
      { scene:"🍦", text:"Pelo bekommt ein großes Eis, aber die Freundin hat gar keins mehr." },
      { scene:"🤔", text:"Erst denkt Pelo: „Das ist doch mein Eis!“" },
      { scene:"💡", text:"Dann fällt Pelo ein, wie schön geteilte Freude ist." },
      { scene:"😊", text:"„Willst du auch probieren?“, fragt Pelo und beide lachen." } ],
    question:"Wie hat sich Pelo zuerst gefühlt, als die Freundin kein Eis hatte?", options:["freude","enttaeuscht","ruhe"], correct:"freude",
    tip:"Es ist völlig okay, sich über etwas Eigenes zu freuen. Teilen macht die Freude oft noch größer." },
  { id:"wackelzahn", level:3, title:"Der Wackelzahn", cover:"🦷",
    pages:[
      { scene:"🦷", text:"Toms Zahn wackelt schon seit Tagen ganz doll." },
      { scene:"😟", text:"Er hat ein komisches Gefühl, wenn er daran denkt, dass der Zahn bald rausfällt." },
      { scene:"🪞", text:"Vorsichtig probiert er vor dem Spiegel, ein bisschen daran zu wackeln." },
      { scene:"😁", text:"Als der Zahn herausfällt, strahlt Tom stolz und zeigt allen die Lücke." } ],
    question:"Wie hat sich Tom gefühlt, bevor der Zahn herausfiel?", options:["angst","freude","wut"], correct:"angst",
    tip:"Vor neuen Erfahrungen ein mulmiges Gefühl zu haben ist ganz normal — meistens ist es am Ende halb so wild." },
  { id:"vertretung", level:3, title:"Die neue Erzieherin", cover:"🙋",
    pages:[
      { scene:"🚪", text:"Heute steht eine Erzieherin in der Tür, die Pelo noch nicht kennt." },
      { scene:"😯", text:"Pelo bleibt erst mal ganz still am Rand stehen." },
      { scene:"🙋", text:"Die neue Erzieherin lächelt und fragt: „Magst du mir zeigen, wo die Bauklötze sind?“" },
      { scene:"😊", text:"Am Ende des Tages hat Pelo eine neue Freundin gefunden." } ],
    question:"Wie hat sich Pelo gefühlt, als die neue Erzieherin kam?", options:["angst","freude","ueberr"], correct:"angst",
    tip:"Neue Gesichter können am Anfang ungewohnt sein. Ein kleiner Schritt aufeinander zu hilft oft schon." },
  { id:"uebernachtung", level:3, title:"Die erste Übernachtung", cover:"🧸",
    pages:[
      { scene:"🎒", text:"Pelo darf zum ersten Mal bei der Oma übernachten." },
      { scene:"😟", text:"Abends im fremden Bett fühlt sich alles anders an als zu Hause." },
      { scene:"🧸", text:"Pelo umarmt sein mitgebrachtes Kuscheltier ganz fest." },
      { scene:"😌", text:"Oma liest noch eine Geschichte vor, und Pelo schläft ganz ruhig ein." } ],
    question:"Wie hat sich Pelo im fremden Bett zuerst gefühlt?", options:["angst","ruhe","freude"], correct:"angst",
    tip:"Ein vertrautes Kuscheltier oder Ritual kann an neuen Orten Sicherheit geben." },
  { id:"geschwister", level:4, title:"Der kleine Bruder", cover:"👶",
    pages:[
      { scene:"👨‍👩‍👧", text:"Seit der kleine Bruder da ist, dreht sich zu Hause vieles um ihn." },
      { scene:"😒", text:"Pelo sitzt oft still in der Ecke und fühlt ein komisches Ziehen im Bauch." },
      { scene:"💬", text:"Eines Abends sagt Pelo zu Mama: „Ich vermisse unsere Zeit zu zweit.“" },
      { scene:"🤗", text:"Am nächsten Tag gibt es eine extra Pelo-und-Mama-Zeit, nur für die beiden." } ],
    question:"Was hat Pelo gefühlt, als sich alles um den kleinen Bruder drehte?", options:["eifersucht","ueberr","stolz"], correct:"eifersucht",
    tip:"Eifersucht ist ein ganz normales Gefühl. Darüber zu sprechen hilft, wieder gesehen zu werden." },
  { id:"verlorenes-spiel", level:3, title:"Verloren, aber nicht traurig", cover:"⚽",
    pages:[
      { scene:"⚽", text:"Pelos Mannschaft verliert das Spiel, obwohl alle ihr Bestes gegeben haben." },
      { scene:"😞", text:"Pelo hätte so gern gewonnen und ist richtig enttäuscht." },
      { scene:"🫂", text:"Der Trainer sagt: „Ihr habt heute super zusammengespielt.“" },
      { scene:"🙂", text:"Pelo lächelt wieder und freut sich schon aufs nächste Spiel." } ],
    question:"Was hat Pelo nach dem verlorenen Spiel gefühlt?", options:["enttaeuscht","dankbar","ueberr"], correct:"enttaeuscht",
    tip:"Enttäuschung nach einer Niederlage ist normal. Sie wird kleiner, wenn man sieht, was gut gelaufen ist." },
  { id:"neue-schule", level:4, title:"Der erste Schultag", cover:"🎒",
    pages:[
      { scene:"🎒", text:"Heute ist Pelos erster Tag in der neuen Schule. Der Ranzen fühlt sich schwer an." },
      { scene:"😬", text:"Im Bauch kribbelt es, und die Hände sind ganz zittrig." },
      { scene:"🧘", text:"Pelo erinnert sich an die Ballon-Atmung und atmet dreimal ruhig." },
      { scene:"👋", text:"In der Klasse winkt ein Kind und zeigt Pelo den freien Platz neben sich." } ],
    question:"Wie hat sich Pelo vor der neuen Schule gefühlt?", options:["nervoes","stolz","dankbar"], correct:"nervoes",
    tip:"Nervosität vor Neuem verschwindet oft nach den ersten Minuten. Atmen hilft, ruhiger zu werden." },
  { id:"fehler", level:5, title:"Der Fehler an der Tafel", cover:"📝",
    pages:[
      { scene:"📝", text:"Pelo soll eine Aufgabe an der Tafel lösen — und macht dabei einen Fehler." },
      { scene:"😳", text:"Ein paar Kinder kichern, und Pelo wird ganz heiß im Gesicht." },
      { scene:"🧑‍🏫", text:"Die Lehrerin sagt: „Fehler gehören zum Lernen dazu, das passiert uns allen.“" },
      { scene:"🙂", text:"Pelo atmet durch und setzt sich wieder — es ist schon halb so schlimm." } ],
    question:"Was hat Pelo an der Tafel gespürt?", options:["scham","freude","ruhe"], correct:"scham",
    tip:"Sich zu schämen ist unangenehm, geht aber vorbei. Fehler machen gehört zum Lernen dazu." },
];

const STICKER_DEFS = [
  { id:"first_feeling", emoji:"🌟", label:"Gefühle-Entdecker" },
  { id:"first_words",   emoji:"💬", label:"Klar gesagt" },
  { id:"calm5",         emoji:"🌊", label:"Ruhe-Profi" },
  { id:"first_story",   emoji:"📖", label:"Geschichten-Fan" },
  { id:"all_feelings",  emoji:"🏆", label:"Gefühle-Meister" },
  { id:"all_stories",   emoji:"🗺️", label:"Insel-Entdecker" },
  { id:"streak3",       emoji:"🔥", label:"Drei Tage dabei" },
  { id:"words_master",  emoji:"👑", label:"Wörter-Meister" },
  { id:"first_stress",  emoji:"💪", label:"Stress-Helfer" },
  { id:"explorer",      emoji:"🎲", label:"Überraschungs-Fan" },
];

const AVATARS = ["🦊","🐻","🐰","🐨","🐸","🦉","🐢","🐼"];
const THEME_COLORS = [
  { id:"peach", hex:"#FFC79A" }, { id:"sky", hex:"#8FCBE0" },
  { id:"mint", hex:"#A6DCBB" }, { id:"sun", hex:"#FFE178" },
  { id:"berry", hex:"#FF9C86" },
];

/* ---------- State ---------- */
function loadProfile(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
  catch(e){ return null; }
}
function saveProfile(p){ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
function freshProfile(){
  return {
    name:"", age:"", avatar:"🦊", color:"peach",
    stars:0, stickers:[], lastVisit:null, streak:0,
    progress:{ feelingsDone:0, wordsGood:0, wordsTotal:0, calmSessions:0, storiesDone:[], stressGood:0, stressTotal:0 },
  };
}
let profile = loadProfile();
function persist(){ saveProfile(profile); applyTheme(); }
function applyTheme(){
  const c = THEME_COLORS.find(t=>t.id===profile.color) || THEME_COLORS[0];
  document.documentElement.style.setProperty("--accent-deep", c.hex);
  document.documentElement.style.setProperty("--accent", c.hex);
}
function addStars(n){ profile.stars += n; persist(); }
function unlockSticker(id){
  if(!profile.stickers.includes(id)){ profile.stickers.push(id); addStars(3); }
}
function bumpStreak(){
  const today = new Date().toDateString();
  if(profile.lastVisit !== today){
    const yesterday = new Date(Date.now()-86400000).toDateString();
    profile.streak = (profile.lastVisit === yesterday) ? profile.streak+1 : 1;
    profile.lastVisit = today;
    if(profile.streak>=3) unlockSticker("streak3");
    persist();
  }
}

/* ---------- Router ---------- */
const viewEl = document.getElementById("view");
const topbarSub = document.getElementById("topbar-sub");
const bottomNav = document.getElementById("bottomNav");
const topbar = document.getElementById("topbar");

document.getElementById("profileBtn").addEventListener("click", ()=> navigate("profile"));
bottomNav.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=> navigate(btn.dataset.nav));
});
function setNavActive(name){
  bottomNav.querySelectorAll(".nav-btn").forEach(b=> b.classList.toggle("active", b.dataset.nav===name));
}
function navigate(name, param){
  window.scrollTo({top:0, behavior:"instant"});
  if(!profile || !profile.name){ renderOnboarding(); return; }
  bottomNav.classList.remove("hidden");
  topbar.classList.remove("hidden");
  switch(name){
    case "home": setNavActive("home"); renderHome(); break;
    case "stickers": setNavActive("stickers"); renderStickers(); break;
    case "parents": setNavActive("parents"); renderParents(); break;
    case "profile": setNavActive(""); renderProfileEdit(); break;
    case "feelings": setNavActive(""); renderFeelingsGame(); break;
    case "words": setNavActive(""); renderWordsGame(); break;
    case "stress": setNavActive(""); renderStressGame(); break;
    case "calm": setNavActive(""); renderCalmMenu(); break;
    case "stories": setNavActive(""); renderStoriesList(); break;
    case "story": setNavActive(""); renderStoryPlayer(param); break;
    case "surprise": setNavActive(""); surpriseMe(); break;
    default: setNavActive("home"); renderHome();
  }
}
function backBtn(target){
  return `<button class="icon-btn" style="margin-bottom:14px;" onclick="navigate('${target}')" aria-label="Zurück">←</button>`;
}
function surpriseMe(){
  const choices = currentLevel()>=2
    ? ["feelings","words","stress","calm","stories"]
    : ["feelings","calm","stories"];
  navigate(choices[Math.floor(Math.random()*choices.length)]);
  unlockSticker("explorer");
}

/* ============================================================
   ONBOARDING
   ============================================================ */
let onboardStep = 0;
let draft = { name:"", age:"", avatar:"🦊", color:"peach" };

function renderOnboarding(){
  bottomNav.classList.add("hidden");
  topbar.classList.add("hidden");
  const steps = ["name","age","avatar","color","done"];
  const step = steps[onboardStep];
  let html = `<div style="padding-top:24px;">
    <div class="stage" style="margin-bottom:20px;">
      <div class="mascot-lg">🌱</div>
      <h1 style="font-size:1.4rem;">Willkommen auf der Mutmach-Insel!</h1>
      <p style="color:var(--ink-soft); font-weight:600; margin-top:6px;">Lass uns dein Profil einrichten.</p>
    </div>
    <div class="card">
      <div class="step-dots">${steps.slice(0,4).map((s,i)=>`<span class="${i<=onboardStep?'on':''}"></span>`).join("")}</div>`;
  if(step==="name"){
    html += `
      <span class="field-label">Wie heißt du?</span>
      <input class="text-input" id="nameInput" placeholder="Dein Name" value="${draft.name}" maxlength="20" autofocus>
      <button class="btn block" style="margin-top:20px;" onclick="onboardNext()">Weiter</button>`;
  } else if(step==="age"){
    html += `
      <span class="field-label">Wie alt bist du?</span>
      <p class="section-sub">Danach richten sich die Aufgaben und Geschichten.</p>
      <div class="pill-grid">
        ${AGE_ORDER.map(a=>`<button class="pill ${draft.age===a?'on':''}" onclick="draft.age='${a}'; renderOnboarding();">${a} Jahre</button>`).join("")}
      </div>
      <button class="btn block" style="margin-top:20px;" ${!draft.age?"disabled":""} onclick="onboardNext()">Weiter</button>`;
  } else if(step==="avatar"){
    html += `
      <span class="field-label">Wähl dein Insel-Tier</span>
      <div class="avatar-grid">
        ${AVATARS.map(a=>`<button class="avatar-pick ${draft.avatar===a?'on':''}" onclick="draft.avatar='${a}'; renderOnboarding();">${a}</button>`).join("")}
      </div>
      <button class="btn block" style="margin-top:20px;" onclick="onboardNext()">Weiter</button>`;
  } else if(step==="color"){
    html += `
      <span class="field-label">Wähl deine Lieblingsfarbe</span>
      <div class="color-grid">
        ${THEME_COLORS.map(c=>`<button class="color-pick ${draft.color===c.id?'on':''}" style="background:${c.hex}" onclick="draft.color='${c.id}'; renderOnboarding();"></button>`).join("")}
      </div>
      <button class="btn block" style="margin-top:20px;" onclick="onboardNext()">Fertig!</button>`;
  }
  html += `</div></div>`;
  viewEl.innerHTML = html;
  const ni = document.getElementById("nameInput");
  if(ni){ ni.addEventListener("input", e=> draft.name = e.target.value); }
}
function onboardNext(){
  if(onboardStep===0 && !draft.name.trim()) return;
  onboardStep++;
  if(onboardStep>=4){
    profile = freshProfile();
    profile.name = draft.name.trim();
    profile.age = draft.age;
    profile.avatar = draft.avatar;
    profile.color = draft.color;
    persist();
    bumpStreak();
    navigate("home");
    return;
  }
  renderOnboarding();
}

/* ============================================================
   HOME
   ============================================================ */
function islandSvg(){
  return `
  <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <path d="M60,150 C40,95 105,45 180,48 C245,20 325,50 352,105 C382,155 360,215 298,238 C245,262 178,256 128,230 C68,208 55,192 60,150 Z" fill="var(--mint)" opacity="0.95"/>
    <circle cx="345" cy="42" r="34" fill="var(--sun)" opacity="0.25"/>
    <circle cx="345" cy="42" r="23" fill="var(--sun)"/>
    <g opacity="0.85">
      <ellipse cx="66" cy="36" rx="22" ry="12" fill="#fff"/>
      <ellipse cx="86" cy="32" rx="15" ry="10" fill="#fff"/>
      <ellipse cx="48" cy="33" rx="13" ry="9" fill="#fff"/>
    </g>
    <path d="M88,72 L200,78 L320,138 L296,216 L96,180" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 15" opacity="0.6"/>
  </svg>`;
}

function renderHome(){
  bumpStreak();
  topbarSub.textContent = `Hallo, ${profile.name}!`;
  const stations = [
    { key:"feelings", icon:"🎈", label:"Gefühls-Wiese",    bubble:"var(--mint)",  x:24, y:64, minLevel:1 },
    { key:"stories",  icon:"📖", label:"Geschichten-Wald", bubble:"var(--sun)",   x:50, y:24, minLevel:1 },
    { key:"calm",     icon:"🌊", label:"Ruhe-Bucht",       bubble:"var(--sky)",   x:76, y:70, minLevel:1 },
    { key:"words",    icon:"💬", label:"Wort-Werkstatt",   bubble:"var(--berry)", x:80, y:42, minLevel:2 },
    { key:"stress",   icon:"💪", label:"Mutmach-Berg",     bubble:"var(--peach)", x:20, y:24, minLevel:2 },
  ].filter(s => s.minLevel <= currentLevel());

  viewEl.innerHTML = `
    <div class="stage" style="margin:12px 0 14px;">
      <div class="mascot-lg" style="font-size:3rem;">${profile.avatar}</div>
      <h2 style="font-size:1.2rem;">Schön, dass du da bist, ${profile.name}!</h2>
      <p style="color:var(--ink-soft); font-weight:700; margin-top:4px;">⭐ ${profile.stars} Sterne gesammelt</p>
    </div>
    <p class="section-sub" style="text-align:center; margin-bottom:10px;">Tippe auf einen Ort auf der Insel!</p>
    <div class="island-map">
      <div class="island-bg">${islandSvg()}</div>
      ${stations.map((s,i)=>`
        <button class="station" style="left:${s.x}%; top:${s.y}%; animation-delay:${(i*0.35).toFixed(2)}s;" onclick="navigate('${s.key}')" aria-label="${s.label}">
          <span class="station-bubble" style="background:${s.bubble};">${s.icon}</span>
          <span class="station-label">${s.label}</span>
        </button>`).join("")}
    </div>
    <button class="btn secondary block" onclick="navigate('surprise')">🎲 Überrasch mich</button>
  `;
}

/* ============================================================
   Generischer Quiz-Ablauf (für Gefühle, Worte, Stress)
   ============================================================ */
function roundCountForLevel(){
  return [3,4,5,6,7][currentLevel()-1];
}
function optionCountForLevel(){
  return [2,3,4,4,4][currentLevel()-1];
}

/* ---- MODUL: GEFÜHLE ENTDECKEN ---- */
let feelingIdx=0, feelingCorrectCount=0, feelingRoundOrder=[];
function renderFeelingsGame(){
  feelingIdx=0; feelingCorrectCount=0;
  const pool = byLevel(FEELING_SCENES);
  feelingRoundOrder = shuffle(pool).slice(0, roundCountForLevel());
  showFeelingScene();
}
function showFeelingScene(){
  if(feelingIdx >= feelingRoundOrder.length){
    profile.progress.feelingsDone++;
    unlockSticker("first_feeling");
    if(feelingCorrectCount===feelingRoundOrder.length) unlockSticker("all_feelings");
    addStars(feelingCorrectCount);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Super gemacht!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${feelingCorrectCount} von ${feelingRoundOrder.length} Gefühlen richtig erkannt.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderFeelingsGame()">Nochmal, neue Szenen</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const scene = feelingRoundOrder[feelingIdx];
  const correct = emotionById(scene.correct);
  const emoPool = byLevel(EMOTIONS).filter(e=>e.id!==correct.id);
  const distractors = shuffle(emoPool).slice(0, optionCountForLevel()-1);
  const options = shuffle([correct, ...distractors]);
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(feelingIdx/feelingRoundOrder.length)*100}%"></div></div>
    <div class="card">
      <p class="section-title" style="font-size:1.1rem;">${scene.text}</p>
      <p class="section-sub">Wie fühlt sich die Person wohl?</p>
      <div class="choice-grid" id="choices">
        ${options.map(o=>`
          <button class="choice" data-id="${o.id}" onclick="pickFeeling('${o.id}','${correct.id}')">
            <span class="emoji">${o.emoji}</span>${o.label}
          </button>`).join("")}
      </div>
      <div id="feelingFeedback"></div>
    </div>`;
}
function pickFeeling(pickedId, correctId){
  const buttons = document.querySelectorAll("#choices .choice");
  buttons.forEach(b=> b.onclick=null);
  const isCorrect = pickedId === correctId;
  buttons.forEach(b=>{
    if(b.dataset.id===correctId) b.classList.add("correct");
    else if(b.dataset.id===pickedId) b.classList.add("wrong");
  });
  if(isCorrect) feelingCorrectCount++;
  document.getElementById("feelingFeedback").innerHTML = `
    <div class="feedback-banner ${isCorrect?'good':'gentle'}">
      ${isCorrect ? "🎉 Genau richtig!" : `Fast! Das nennt man „${emotionById(correctId).label}“.`}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="feelingIdx++; showFeelingScene();">Weiter</button>`;
}

/* ---- MODUL: ICH SAG'S MIT WORTEN ---- */
let wordIdx=0, wordGoodCount=0, wordRoundOrder=[];
function renderWordsGame(){
  wordIdx=0; wordGoodCount=0;
  const pool = byLevel(WORD_SCENES);
  wordRoundOrder = shuffle(pool).slice(0, roundCountForLevel());
  showWordScene();
}
function showWordScene(){
  if(wordIdx >= wordRoundOrder.length){
    profile.progress.wordsGood += wordGoodCount;
    profile.progress.wordsTotal += wordRoundOrder.length;
    unlockSticker("first_words");
    if(profile.progress.wordsGood>=15) unlockSticker("words_master");
    addStars(wordGoodCount);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Toll gesprochen!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${wordGoodCount} von ${wordRoundOrder.length} Mal die klarste Art gefunden, dich mitzuteilen.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderWordsGame()">Nochmal, neue Szenen</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const scene = wordRoundOrder[wordIdx];
  const options = shuffle(scene.options.map((o,i)=>({...o, idx:i})));
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(wordIdx/wordRoundOrder.length)*100}%"></div></div>
    <div class="card">
      <p class="section-title" style="font-size:1.1rem;">${scene.text}</p>
      <p class="section-sub">Was sagst du?</p>
      <div id="wordChoices" style="display:flex; flex-direction:column; gap:12px;">
        ${options.map(o=>`
          <button class="choice" style="text-align:left; align-items:flex-start;" data-idx="${o.idx}" onclick="pickWord(${o.idx}, ${o.good})">
            ${o.text}
          </button>`).join("")}
      </div>
      <div id="wordFeedback"></div>
    </div>`;
}
function pickWord(idx, good){
  const buttons = document.querySelectorAll("#wordChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  buttons.forEach(b=>{
    const isGoodBtn = wordRoundOrder[wordIdx].options[b.dataset.idx].good;
    if(isGoodBtn) b.classList.add("correct");
    else if(parseInt(b.dataset.idx)===idx) b.classList.add("wrong");
  });
  if(good) wordGoodCount++;
  document.getElementById("wordFeedback").innerHTML = `
    <div class="feedback-banner ${good?'good':'gentle'}">
      ${good ? "🎉 Das war klar und freundlich gesagt!" : "Es gibt eine Art, es noch klarer zu sagen — schau sie dir an!"}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="wordIdx++; showWordScene();">Weiter</button>`;
}

/* ---- MODUL: STRESS-HELFER ---- */
let stressIdx=0, stressGoodCount=0, stressRoundOrder=[];
function renderStressGame(){
  stressIdx=0; stressGoodCount=0;
  const pool = byLevel(STRESS_SCENES);
  stressRoundOrder = shuffle(pool).slice(0, roundCountForLevel());
  showStressScene();
}
function showStressScene(){
  if(stressIdx >= stressRoundOrder.length){
    profile.progress.stressGood += stressGoodCount;
    profile.progress.stressTotal += stressRoundOrder.length;
    unlockSticker("first_stress");
    addStars(stressGoodCount);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Stark gemacht!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${stressGoodCount} von ${stressRoundOrder.length} Mal einen guten Weg gefunden, mit Stress umzugehen.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderStressGame()">Nochmal, neue Szenen</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const scene = stressRoundOrder[stressIdx];
  const options = shuffle(scene.options.map((o,i)=>({...o, idx:i})));
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(stressIdx/stressRoundOrder.length)*100}%"></div></div>
    <div class="card">
      <p class="section-title" style="font-size:1.1rem;">${scene.text}</p>
      <p class="section-sub">Was hilft dir gerade am meisten?</p>
      <div id="stressChoices" style="display:flex; flex-direction:column; gap:12px;">
        ${options.map(o=>`
          <button class="choice" style="text-align:left; align-items:flex-start;" data-idx="${o.idx}" onclick="pickStress(${o.idx}, ${o.good})">
            ${o.text}
          </button>`).join("")}
      </div>
      <div id="stressFeedback"></div>
    </div>`;
}
function pickStress(idx, good){
  const buttons = document.querySelectorAll("#stressChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  buttons.forEach(b=>{
    const isGoodBtn = stressRoundOrder[stressIdx].options[b.dataset.idx].good;
    if(isGoodBtn) b.classList.add("correct");
    else if(parseInt(b.dataset.idx)===idx) b.classList.add("wrong");
  });
  if(good) stressGoodCount++;
  document.getElementById("stressFeedback").innerHTML = `
    <div class="feedback-banner ${good?'good':'gentle'}">
      ${good ? "💪 Guter Weg, damit umzugehen!" : "Es gibt einen Weg, der dir noch besser hilft — schau ihn dir an!"}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="stressIdx++; showStressScene();">Weiter</button>`;
}

/* ============================================================
   MODUL: RUHE-OASE (mehrere Übungen zur Auswahl)
   ============================================================ */
function renderCalmMenu(){
  const options = shuffle(byLevel(CALM_EXERCISES));
  viewEl.innerHTML = `
    ${backBtn("home")}
    <h2 class="section-title" style="margin-bottom:4px;">Ruhe-Oase</h2>
    <p class="section-sub">Wähl eine Übung, die dir gerade guttut.</p>
    ${options.map(ex=>`
      <div class="module-card" style="background:#fff;" onclick="startCalmExercise('${ex.id}')">
        <div class="module-icon" style="background:var(--mint)">${ex.icon}</div>
        <div>
          <div class="module-title">${ex.title}</div>
          <div class="module-desc">${ex.desc}</div>
        </div>
        <div class="chevron">›</div>
      </div>
    `).join("")}
  `;
}
function startCalmExercise(id){
  const ex = CALM_EXERCISES.find(e=>e.id===id);
  if(ex.type==="breath") renderBreathing(ex);
  else if(ex.type==="grounding") renderGrounding();
  else if(ex.type==="muscle") renderMuscle();
}

let breathTimer=null, breathCount=0, currentExercise=null;
function renderBreathing(ex){
  currentExercise = ex; breathCount = 0;
  viewEl.innerHTML = `
    ${backBtn("calm")}
    <div class="stage">
      <h2>${ex.icon} ${ex.title}</h2>
      <p style="color:var(--ink-soft); font-weight:600; margin-top:6px;">Folge dem Kreis: einatmen, wenn er wächst — ausatmen, wenn er kleiner wird.</p>
      <div class="breath-circle" id="breathCircle">Bereit?</div>
      <p id="breathCounter" style="font-weight:800; color:var(--ink-soft);">0 / ${ex.rounds} Atemzüge</p>
      <button class="btn" id="breathStart" onclick="startBreathing()">Los geht's</button>
    </div>`;
}
function startBreathing(){
  document.getElementById("breathStart").classList.add("hidden");
  breathCount = 0;
  breathStep();
}
function breathStep(){
  const circle = document.getElementById("breathCircle");
  const counter = document.getElementById("breathCounter");
  if(!circle) return;
  const ex = currentExercise;
  if(breathCount >= ex.rounds){
    profile.progress.calmSessions++;
    if(profile.progress.calmSessions>=5) unlockSticker("calm5");
    addStars(2);
    circle.textContent = "🌿 Fertig!";
    counter.textContent = "Du bist jetzt ganz ruhig.";
    viewEl.insertAdjacentHTML("beforeend", `<button class="btn block" style="margin-top:18px;" onclick="navigate('home')">Zurück zur Insel</button>`);
    return;
  }
  circle.classList.remove("out"); circle.classList.add("in");
  circle.textContent = ex.inLabel;
  breathTimer = setTimeout(()=>{
    circle.classList.remove("in"); circle.classList.add("out");
    circle.textContent = ex.outLabel;
    breathTimer = setTimeout(()=>{
      breathCount++;
      counter.textContent = `${breathCount} / ${ex.rounds} Atemzüge`;
      breathStep();
    }, ex.outMs);
  }, ex.inMs);
}

let groundIdx = 0;
function renderGrounding(){
  groundIdx = 0;
  showGroundingStep();
}
function showGroundingStep(){
  if(groundIdx >= GROUNDING_STEPS.length){
    profile.progress.calmSessions++;
    if(profile.progress.calmSessions>=5) unlockSticker("calm5");
    addStars(2);
    viewEl.innerHTML = `
      ${backBtn("calm")}
      <div class="stage">
        <div class="mascot-lg">🔎</div>
        <h2>Gut gemacht!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du bist jetzt ganz im Moment angekommen.</p>
        <button class="btn" style="margin-top:20px;" onclick="navigate('home')">Zurück zur Insel</button>
      </div>`;
    return;
  }
  viewEl.innerHTML = `
    ${backBtn("calm")}
    <div class="progress-track"><div class="progress-fill" style="width:${(groundIdx/GROUNDING_STEPS.length)*100}%"></div></div>
    <div class="card stage">
      <div class="mascot-lg" style="font-size:3rem;">🔎</div>
      <p style="font-family:'Baloo 2'; font-weight:700; font-size:1.1rem;">${GROUNDING_STEPS[groundIdx]}</p>
      <button class="btn" style="margin-top:20px;" onclick="groundIdx++; showGroundingStep();">Weiter</button>
    </div>`;
}

let muscleIdx = 0, muscleTimer = null;
function renderMuscle(){
  muscleIdx = 0;
  showMuscleStep();
}
function showMuscleStep(){
  if(muscleIdx >= MUSCLE_STEPS.length){
    profile.progress.calmSessions++;
    if(profile.progress.calmSessions>=5) unlockSticker("calm5");
    addStars(2);
    viewEl.innerHTML = `
      ${backBtn("calm")}
      <div class="stage">
        <div class="mascot-lg">🍃</div>
        <h2>Schön locker!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Dein Körper ist jetzt schön entspannt.</p>
        <button class="btn" style="margin-top:20px;" onclick="navigate('home')">Zurück zur Insel</button>
      </div>`;
    return;
  }
  const step = MUSCLE_STEPS[muscleIdx];
  viewEl.innerHTML = `
    ${backBtn("calm")}
    <div class="progress-track"><div class="progress-fill" style="width:${(muscleIdx/MUSCLE_STEPS.length)*100}%"></div></div>
    <div class="card stage">
      <div class="mascot-lg" style="font-size:3rem;">🍃</div>
      <p style="font-family:'Baloo 2'; font-weight:700; font-size:1.1rem;">${step.label}</p>
      <button class="btn" style="margin-top:20px;" onclick="muscleIdx++; showMuscleStep();">Weiter</button>
    </div>`;
}

/* ============================================================
   MODUL: GESCHICHTEN
   ============================================================ */
function renderStoriesList(){
  const stories = shuffle(byLevel(STORIES));
  viewEl.innerHTML = `
    ${backBtn("home")}
    <h2 class="section-title" style="margin-bottom:14px;">Pelos Geschichten</h2>
    ${stories.map(s=>`
      <div class="module-card" style="background:#fff;" onclick="navigate('story','${s.id}')">
        <div class="module-icon" style="background:var(--sun)">${s.cover}</div>
        <div>
          <div class="module-title">${s.title}</div>
          <div class="module-desc">${profile.progress.storiesDone.includes(s.id) ? "✓ Gelesen" : "Noch nicht gelesen"}</div>
        </div>
        <div class="chevron">›</div>
      </div>
    `).join("")}
  `;
}
let storyState = { story:null, page:0 };
function renderStoryPlayer(storyId){
  storyState = { story: STORIES.find(s=>s.id===storyId), page:0 };
  showStoryPage();
}
function showStoryPage(){
  const s = storyState.story;
  if(storyState.page < s.pages.length){
    const p = s.pages[storyState.page];
    viewEl.innerHTML = `
      ${backBtn("stories")}
      <div class="card storypage">
        <div class="scene">${p.scene}</div>
        <p>${p.text}</p>
        <button class="btn" style="margin-top:22px;" onclick="storyState.page++; showStoryPage();">
          ${storyState.page === s.pages.length-1 ? "Weiter" : "Weiter →"}
        </button>
      </div>`;
    return;
  }
  const emoPool = byLevel(EMOTIONS);
  const opts = s.options.map(id=>emotionById(id)).filter(Boolean);
  const finalOpts = shuffle(opts.length>=2 ? opts : shuffle(emoPool).slice(0,3));
  viewEl.innerHTML = `
    ${backBtn("stories")}
    <div class="card">
      <p class="section-title" style="font-size:1.1rem;">${s.question}</p>
      <div class="choice-grid" id="storyChoices" style="margin-top:14px;">
        ${finalOpts.map(o=>`
          <button class="choice" data-id="${o.id}" onclick="pickStoryAnswer('${o.id}','${s.correct}')">
            <span class="emoji">${o.emoji}</span>${o.label}
          </button>`).join("")}
      </div>
      <div id="storyFeedback"></div>
    </div>`;
}
function pickStoryAnswer(pickedId, correctId){
  document.querySelectorAll("#storyChoices .choice").forEach(b=>{
    b.onclick=null;
    if(b.dataset.id===correctId) b.classList.add("correct");
    else if(b.dataset.id===pickedId) b.classList.add("wrong");
  });
  const s = storyState.story;
  if(!profile.progress.storiesDone.includes(s.id)){
    profile.progress.storiesDone.push(s.id);
    unlockSticker("first_story");
    if(profile.progress.storiesDone.length === byLevel(STORIES).length) unlockSticker("all_stories");
    addStars(3);
  }
  document.getElementById("storyFeedback").innerHTML = `
    <div class="tip-box">💡 ${s.tip}</div>
    <button class="btn block" style="margin-top:16px;" onclick="navigate('stories')">Zu den Geschichten</button>`;
}

/* ============================================================
   STICKERBUCH
   ============================================================ */
function renderStickers(){
  viewEl.innerHTML = `
    <div class="stage" style="margin-bottom:18px;">
      <h2>Dein Sternenbuch</h2>
      <p style="color:var(--ink-soft); font-weight:700; margin-top:6px;">⭐ ${profile.stars} Sterne · ${profile.stickers.length}/${STICKER_DEFS.length} Sticker</p>
    </div>
    <div class="card">
      <div class="sticker-grid">
        ${STICKER_DEFS.map(s=>{
          const unlocked = profile.stickers.includes(s.id);
          return `<div class="sticker ${unlocked?'':'locked'}" title="${unlocked?s.label:'Noch verborgen'}">${unlocked ? s.emoji : "❔"}</div>`;
        }).join("")}
      </div>
    </div>`;
}

/* ============================================================
   ELTERNBEREICH
   ============================================================ */
function renderParents(){
  viewEl.innerHTML = `
    <div class="card parent-block">
      <h3>💛 Willkommen im Elternbereich</h3>
      <p>Mutmach-Insel hilft Kindern spielerisch dabei, Gefühle zu erkennen, sie in Worte zu fassen und mit Stress umzugehen — in kurzen, ruhigen Einheiten ohne hektische Effekte oder Zeitdruck. Inhalte und Schwierigkeit passen sich automatisch der eingestellten Altersstufe an, und jede Runde wird neu gemischt.</p>
    </div>
    <div class="card parent-block">
      <h3>📊 Fortschritt von ${profile.name} (${profile.age||"–"} Jahre)</h3>
      <p>Gefühle-Runden gespielt: ${profile.progress.feelingsDone}<br>
      Klare Sätze geübt: ${profile.progress.wordsGood} von ${profile.progress.wordsTotal}<br>
      Stress-Situationen gemeistert: ${profile.progress.stressGood} von ${profile.progress.stressTotal}<br>
      Ruheübungen abgeschlossen: ${profile.progress.calmSessions}<br>
      Geschichten gelesen: ${profile.progress.storiesDone.length} von ${STORIES.length}</p>
    </div>
    <div class="card parent-block">
      <h3>🔒 Datenschutz</h3>
      <p>Alle Angaben bleiben ausschließlich auf diesem Gerät gespeichert (lokal im Browser). Es gibt keine Werbung, keine externen Konten und keine Datenweitergabe.</p>
    </div>
    <div class="card parent-block">
      <h3>⚙️ Profil verwalten</h3>
      <button class="btn secondary" onclick="navigate('profile')">Profil bearbeiten</button>
      <button class="btn secondary" style="margin-left:10px; margin-top:10px;" onclick="if(confirm('Wirklich den gesamten Fortschritt löschen?')){ localStorage.removeItem('${STORAGE_KEY}'); profile=null; navigate('home'); }">Fortschritt zurücksetzen</button>
    </div>`;
}

/* ============================================================
   PROFIL BEARBEITEN
   ============================================================ */
function renderProfileEdit(){
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="card">
      <span class="field-label">Name</span>
      <input class="text-input" id="editName" value="${profile.name}" maxlength="20">
      <span class="field-label" style="margin-top:18px;">Alter</span>
      <div class="pill-grid">
        ${AGE_ORDER.map(a=>`<button class="pill ${profile.age===a?'on':''}" onclick="profile.age='${a}'; persist(); renderProfileEdit();">${a} Jahre</button>`).join("")}
      </div>
      <span class="field-label" style="margin-top:18px;">Insel-Tier</span>
      <div class="avatar-grid">
        ${AVATARS.map(a=>`<button class="avatar-pick ${profile.avatar===a?'on':''}" onclick="profile.avatar='${a}'; persist(); renderProfileEdit();">${a}</button>`).join("")}
      </div>
      <span class="field-label" style="margin-top:18px;">Lieblingsfarbe</span>
      <div class="color-grid">
        ${THEME_COLORS.map(c=>`<button class="color-pick ${profile.color===c.id?'on':''}" style="background:${c.hex}" onclick="profile.color='${c.id}'; persist(); renderProfileEdit();"></button>`).join("")}
      </div>
      <button class="btn block" style="margin-top:22px;" onclick="saveProfileEdit()">Speichern</button>
    </div>`;
  document.getElementById("editName").addEventListener("input", e=> profile.name = e.target.value);
}
function saveProfileEdit(){
  if(!profile.name.trim()) return;
  persist();
  navigate("home");
}

/* ============================================================
   INIT
   ============================================================ */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); });
}
if(profile && profile.name){ applyTheme(); navigate("home"); }
else { renderOnboarding(); }
