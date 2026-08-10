/* ============================================================
   Leo's Lerninsel — mit Leo
   Kindgerechte Lern-App zu Gefühlen, Kommunikation & Stress.
   Inhalte werden nach Altersstufe gefiltert und bei jedem
   Durchgang neu gemischt — kein starrer Ablauf.
   Alle Daten bleiben ausschließlich lokal (localStorage).
   ============================================================ */

const STORAGE_KEY = "mutmach-insel-profile-v1";
const APP_VERSION = "v33"; // manuell synchron zu CACHE_NAME in sw.js halten

/* ---------- Sprachausgabe (Vorlesen für Kinder, die noch nicht lesen können) ---------- */
let currentSpeakText = "";
function speak(text){
  if(!text || !("speechSynthesis" in window)) return;
  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = (profile && profile.speechRate) || 0.92;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  }catch(e){ /* Sprachausgabe im Browser nicht verfügbar - kein Problem, still weitermachen */ }
}
function speechRateLabel(rate){
  if(rate <= 0.72) return "Sehr langsam";
  if(rate <= 0.88) return "Langsam";
  if(rate <= 1.02) return "Normal";
  if(rate <= 1.16) return "Schnell";
  return "Sehr schnell";
}
function speakerBtn(extraStyle){
  return `<button class="speak-btn" style="${extraStyle||''}" onclick="speak(currentSpeakText)" aria-label="Vorlesen">🔊</button>`;
}
/* Merkt sich den Text und liest ihn bei jüngeren Kindern (die meist noch nicht
   lesen können) automatisch vor, sofern im Elternbereich nicht deaktiviert. */
function setSpeakText(text){
  currentSpeakText = text;
  if(profile && profile.autoRead !== false && currentLevel() <= 2){
    speak(text);
  }
}

/* ---------- Zwei-Tipp-Bestätigung für Kleinkinder (2-3 und 3-4 Jahre) ----------
   Der erste Tipp auf eine Antwort wertet noch nichts, sondern markiert sie nur
   und liest sie vor. Erst ein zweiter Tipp auf DIESELBE Antwort zählt final.
   Ältere Kinder (ab 5-6 Jahre) behalten das direkte Ein-Tipp-Verhalten. */
let pendingChoice = null; // { moduleKey, id }
function needsConfirmTap(moduleKey, id){
  if(currentLevel() > 3) return true; // kein Vorschau-Modus für ältere Kinder (ab 7-8 Jahre)
  if(pendingChoice && pendingChoice.moduleKey === moduleKey && pendingChoice.id === String(id)){
    pendingChoice = null;
    return true; // zweiter Tipp auf dieselbe Antwort -> jetzt auswerten
  }
  pendingChoice = { moduleKey, id: String(id) };
  return false; // erster Tipp (oder Wechsel der Auswahl) -> nur Vorschau
}
function previewPick(containerId, dataAttr, value){
  document.querySelectorAll(`#${containerId} .choice`).forEach(b=>{
    b.classList.toggle("preview-pick", b.dataset[dataAttr] === String(value));
  });
}
function showConfirmHint(feedbackElId){
  const el = document.getElementById(feedbackElId);
  if(el) el.innerHTML = `<div class="feedback-banner preview">👆 Nochmal antippen zum Bestätigen</div>`;
}

/* Spricht nach jeder Antwort das Ergebnis: bei richtig zufällig eine von mehreren
   Lob-Formulierungen, bei falsch immer denselben ruhigen Hinweis. */
const PRAISE_PHRASES = ["Super gemacht", "Klasse", "Spitze", "Weiter so"];
/* Ersetzt den Namen der Geschichten-Hauptfigur ("Leo") durch den Profilnamen des Kindes,
   inklusive des Genitivs ("Leos" -> "{Name}s"). Ohne Profilname bleibt "Leo" stehen. */
function personalizeStoryText(text){
  if(!text || !profile || !profile.name) return text;
  return text
    .replace(/\bLeos\b/g, profile.name + "s")
    .replace(/\bLeo\b/g, profile.name);
}

function speakResult(isCorrect, correctLabel){
  if(!profile || profile.autoRead === false) return;
  if(isCorrect){
    const name = profile.name ? ` ${profile.name}` : "";
    const phrase = PRAISE_PHRASES[Math.floor(Math.random()*PRAISE_PHRASES.length)];
    speak(`${phrase}${name}!`);
  } else {
    speak(`Das war leider nicht richtig. Die korrekte Antwort ist ${correctLabel||""}.`);
  }
}

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
/* Jedes Gefühl hat eine eigene, feste Hinweisfarbe (wie ein Farbcode-System). */
const EMOTIONS = [
  { id:"freude",       label:"Freude",        emoji:"😊", level:1, hue:"#FFD966" },
  { id:"traurig",      label:"Traurigkeit",   emoji:"😢", level:1, hue:"#6FB8E0" },
  { id:"wut",          label:"Wut",           emoji:"😠", level:1, hue:"#FF6F61" },
  { id:"angst",        label:"Angst",         emoji:"😟", level:1, hue:"#A78BFA" },
  { id:"ueberr",       label:"Überraschung",  emoji:"😮", level:1, hue:"#FF9F5B" },
  { id:"ruhe",         label:"Ruhe",          emoji:"😌", level:1, hue:"#7FD8A6" },
  { id:"stolz",        label:"Stolz",         emoji:"😌", level:3, hue:"#F2A7D8" },
  { id:"nervoes",      label:"Nervosität",    emoji:"😬", level:3, hue:"#C9A66B" },
  { id:"enttaeuscht",  label:"Enttäuschung",  emoji:"😞", level:3, hue:"#9FB4C7" },
  { id:"eifersucht",   label:"Eifersucht",    emoji:"😒", level:4, hue:"#7C9473" },
  { id:"scham",        label:"Verlegenheit",  emoji:"😳", level:4, hue:"#F4889C" },
  { id:"dankbar",      label:"Dankbarkeit",   emoji:"🥰", level:4, hue:"#E0B15C" },
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
  { level:1, text:"Der bunte Luftballon fliegt hoch in den Himmel davon.", correct:"traurig" },
  { level:1, text:"Papa liest ein lustiges Buch vor und macht komische Stimmen.", correct:"freude" },
  { level:1, text:"Der Teddy fällt vom Bett und landet auf dem Boden.", correct:"traurig" },
  { level:1, text:"Ein großer Bagger fährt ganz laut an Ben vorbei.", correct:"angst" },
  { level:1, text:"Mama kommt nach der Arbeit endlich nach Hause.", correct:"freude" },
  { level:2, text:"Beim Verstecken findet niemand Timo, obwohl er hinter dem Vorhang steht.", correct:"ueberr" },
  { level:2, text:"In der Turnstunde klatschen alle Kinder für Mias Rolle vorwärts.", correct:"freude" },
  { level:2, text:"Nele muss ihr Eis abgeben, weil es zu tropfen beginnt.", correct:"traurig" },
  { level:2, text:"Beim Abendessen erzählt Opa eine spannende Gutenachtgeschichte.", correct:"ueberr" },
  { level:3, text:"Beim Vorlesen vor der Klasse verhaspelt sich Ben an einem schwierigen Wort.", correct:"nervoes" },
  { level:3, text:"Nach dem Schwimmkurs bekommt Lina ihr erstes Seepferdchen-Abzeichen.", correct:"stolz" },
  { level:3, text:"Beim Wandertag zieht plötzlich ein Gewitter auf und alle müssen schnell rein.", correct:"angst" },
  { level:3, text:"Obwohl Finn sich riesig auf das Fußballturnier gefreut hat, fällt es wegen Sturm aus.", correct:"enttaeuscht" },
  { level:4, text:"Als alle den neuen Schuhen der Mitschülerin Aufmerksamkeit schenken, fühlt Mara ein komisches Ziehen.", correct:"eifersucht" },
  { level:4, text:"Nach dem Sturz vor der ganzen Pausenhofgruppe lacht kurz jemand.", correct:"scham" },
  { level:4, text:"Zum Abschied schenkt die Oma ein selbstgemachtes Geschenk, und alle sind gerührt.", correct:"dankbar" },
  { level:5, text:"In den Ferien vermisst Noah heimlich seine Klasse, obwohl er sich so sehr auf die freie Zeit gefreut hatte.", correct:"traurig" },
  { level:5, text:"Nach dem Streit entschuldigt sich die Freundin ehrlich, und der Ärger verfliegt langsam.", correct:"ruhe" },
  { level:1, text:"Ein Schmetterling landet auf Linas Hand.", correct:"ueberr" },
  { level:1, text:"Papa macht Kitzel-Spiele mit Ben.", correct:"freude" },
  { level:1, text:"Mia darf nicht mit dem Ball nach draußen.", correct:"wut" },
  { level:1, text:"Es donnert laut am Himmel.", correct:"angst" },
  { level:1, text:"Oma singt ein leises Schlaflied.", correct:"ruhe" },
  { level:1, text:"Nele bekommt ihr Lieblingsessen zum Mittag.", correct:"freude" },
  { level:1, text:"Bens Turm aus Bauklötzen fällt laut scheppernd um.", correct:"traurig" },
  { level:1, text:"Das Eis fällt Mia von der Waffel.", correct:"traurig" },
  { level:1, text:"Finn muss sein Dreirad mit der Schwester teilen.", correct:"wut" },
  { level:1, text:"Ein fremder Hund knurrt ganz laut.", correct:"angst" },
  { level:1, text:"Beim Öffnen der Box hüpft ein kleiner Springteufel heraus.", correct:"ueberr" },
  { level:1, text:"Beim Kuscheln mit der Katze schnurrt sie ganz leise.", correct:"ruhe" },
  { level:1, text:"Beim Baden platscht Ben fröhlich mit den Händen im Wasser.", correct:"freude" },
  { level:1, text:"Der Eiswagen spielt eine fröhliche Melodie vor dem Haus.", correct:"freude" },
  { level:1, text:"Lea darf heute ihr Lieblingskleid anziehen.", correct:"freude" },
  { level:1, text:"Beim Karussellfahren winkt Tom jedes Mal, wenn er vorbeikommt.", correct:"freude" },
  { level:1, text:"Der Sandkuchen fällt beim Umdrehen der Förmchen auseinander.", correct:"traurig" },
  { level:1, text:"Mias Luftballon geht beim Spielen kaputt.", correct:"traurig" },
  { level:1, text:"Bens bester Freund ist heute nicht im Kindergarten.", correct:"traurig" },
  { level:1, text:"Der Schneemann von Lina schmilzt in der Sonne.", correct:"traurig" },
  { level:1, text:"Nele darf ihre Gummistiefel nicht in die Pfütze stellen.", correct:"wut" },
  { level:1, text:"Ben muss vom Trampolin runter, obwohl er weiterspringen möchte.", correct:"wut" },
  { level:1, text:"Mias Turm wird von ihrem Bruder umgestoßen.", correct:"wut" },
  { level:1, text:"Tom soll sein Spielzeugauto weggeben, obwohl er noch länger spielen wollte.", correct:"wut" },
  { level:1, text:"Ein großer Staubsauger brummt laut durchs Zimmer.", correct:"angst" },
  { level:1, text:"Im dunklen Kino wird es plötzlich ganz still und dunkel.", correct:"angst" },
  { level:1, text:"Ein Feuerwerk knallt draußen ganz plötzlich.", correct:"angst" },
  { level:1, text:"Die Tür fällt mit einem lauten Knall zu.", correct:"angst" },
  { level:1, text:"Unter dem Kissen findet Ben plötzlich eine kleine Süßigkeit.", correct:"ueberr" },
  { level:1, text:"Beim Spaziergang hüpft ein Frosch direkt vor Leas Füße.", correct:"ueberr" },
  { level:1, text:"Aus der Kiste springt beim Öffnen buntes Konfetti heraus.", correct:"ueberr" },
  { level:1, text:"Am Fenster sitzt plötzlich ein bunter Papagei.", correct:"ueberr" },
  { level:1, text:"Beim Schaukeln im Garten wird Lina immer ruhiger.", correct:"ruhe" },
  { level:1, text:"Nach dem Baden kuschelt sich Tom in ein warmes Handtuch.", correct:"ruhe" },
  { level:1, text:"Beim Betrachten der Fische im Aquarium wird Nele ganz still.", correct:"ruhe" },
  { level:1, text:"Mit dem Kuscheltier im Arm schläft Ben langsam ein.", correct:"ruhe" },
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
  { level:2, text:"Ein anderes Kind schneidet dir beim Anstehen die Reihe ab. Was sagst du?",
    options:[
      { text:"„Entschuldige, ich glaube ich war zuerst dran.“", good:true },
      { text:"Es einfach hinnehmen und leise ärgern.", good:false },
      { text:"Laut schreien und schubsen.", good:false } ] },
  { level:2, text:"Du möchtest, dass dein Freund beim Fangenspielen langsamer rennt. Was sagst du?",
    options:[
      { text:"„Kannst du bitte etwas langsamer rennen, ich komme nicht mit?“", good:true },
      { text:"Einfach aufhören mitzuspielen, ohne etwas zu sagen.", good:false },
      { text:"Ihn wütend anschreien.", good:false } ] },
  { level:2, text:"Beim Basteln geht dir der Kleber aus. Was sagst du?",
    options:[
      { text:"„Hast du noch etwas Kleber für mich übrig?“", good:true },
      { text:"Den Kleber von einem anderen Kind wegnehmen.", good:false },
      { text:"Aufgeben und nicht weiterbasteln.", good:false } ] },
  { level:2, text:"Du hast dich verlaufen und findest deine Gruppe nicht mehr. Was sagst du?",
    options:[
      { text:"„Entschuldigung, ich habe meine Gruppe verloren. Können Sie mir helfen?“", good:true },
      { text:"Einfach allein weitersuchen, ohne jemanden zu fragen.", good:false },
      { text:"Sich verstecken, bis jemand einen findet.", good:false } ] },
  { level:3, text:"Ein Mitschüler behauptet, deine Zeichnung sei hässlich. Was sagst du?",
    options:[
      { text:"„Das trifft mich. Ich habe mir viel Mühe gegeben.“", good:true },
      { text:"Seine Zeichnung auch schlechtmachen.", good:false },
      { text:"Weinend die Zeichnung zerreißen.", good:false } ] },
  { level:3, text:"In der Gruppenarbeit will niemand die unangenehme Aufgabe übernehmen. Was schlägst du vor?",
    options:[
      { text:"„Sollen wir losen, wer die Aufgabe übernimmt? Dann ist es fair.“", good:true },
      { text:"Einfach schweigen und hoffen, jemand anderes macht es.", good:false },
      { text:"Bestimmen, dass ein bestimmtes Kind es machen muss.", good:false } ] },
  { level:3, text:"Du merkst, dass du beim Streit lauter wirst, als du eigentlich willst. Was sagst du?",
    options:[
      { text:"„Ich brauche kurz eine Pause, bevor wir weiterreden.“", good:true },
      { text:"Trotzdem einfach weiterschreien.", good:false },
      { text:"Wortlos wegrennen und tagelang schmollen.", good:false } ] },
  { level:3, text:"Ein Freund erzählt ein Geheimnis von dir weiter, das er versprochen hatte. Was sagst du ihm?",
    options:[
      { text:"„Das hat mich verletzt, du hattest es versprochen.“", good:true },
      { text:"Ihm sofort auch ein Geheimnis wegnehmen, um sich zu rächen.", good:false },
      { text:"Nie wieder mit ihm reden, ohne einen Grund zu nennen.", good:false } ] },
  { level:4, text:"Du hast eine gute Idee, traust dich aber nicht, sie in der Klasse zu sagen. Was hilft dir?",
    options:[
      { text:"„Ich atme kurz durch und melde mich, auch wenn es mich Mut kostet.“", good:true },
      { text:"Die Idee einfach für sich behalten, um kein Risiko einzugehen.", good:false },
      { text:"Die Idee einem Freund zuflüstern, statt sie selbst zu sagen.", good:false } ] },
  { level:4, text:"Ein Freund braucht deine Hilfe, aber du bist selbst gerade im Stress. Was sagst du?",
    options:[
      { text:"„Ich helfe dir gern, aber erst in 10 Minuten, ist das okay?“", good:true },
      { text:"Einfach ignorieren, ohne etwas zu sagen.", good:false },
      { text:"Genervt ablehnen, ohne einen Grund zu nennen.", good:false } ] },
  { level:4, text:"Du hast gemerkt, dass eine Regel in der Gruppe unfair ist. Was sagst du?",
    options:[
      { text:"„Ich finde diese Regel unfair, können wir das gemeinsam besprechen?“", good:true },
      { text:"Sich einfach nicht mehr an die Regel halten, ohne etwas zu sagen.", good:false },
      { text:"Laut vor allen schimpfen, ohne einen Vorschlag zu machen.", good:false } ] },
  { level:5, text:"Du merkst, dass ein Freund öfter traurig wirkt, spricht aber nicht darüber. Was sagst du?",
    options:[
      { text:"„Ich hab gemerkt, dass es dir in letzter Zeit nicht so gut geht. Magst du mir davon erzählen?“", good:true },
      { text:"Nichts sagen, es ist ja nicht dein Problem.", good:false },
      { text:"Hinter seinem Rücken mit anderen darüber reden.", good:false } ] },
  { level:5, text:"In einer Diskussion hat jemand eine ganz andere Meinung als du. Was sagst du?",
    options:[
      { text:"„Ich sehe das anders, aber ich verstehe, warum du das so siehst.“", good:true },
      { text:"Laut behaupten, die eigene Meinung sei die einzig richtige.", good:false },
      { text:"Beleidigt schweigen, weil man nicht recht bekommt.", good:false } ] },
  { level:5, text:"Du hast eine wichtige Deadline verpasst, weil du dich verplant hast. Was sagst du?",
    options:[
      { text:"„Das tut mir leid, ich habe mich verplant. Wie können wir das jetzt lösen?“", good:true },
      { text:"Eine Ausrede erfinden, die nicht stimmt.", good:false },
      { text:"Das Thema einfach ignorieren und hoffen, es fällt niemandem auf.", good:false } ] },
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
  { level:2, text:"Du sollst zum ersten Mal allein im Kindergarten ein Lied vor allen singen.",
    options:[
      { text:"Ich übe das Lied vorher leise für mich, das macht mich sicherer.", good:true },
      { text:"Ich weigere mich ganz und renne weg.", good:false },
      { text:"Ich werde die ganze Zeit zittrig, ohne etwas zu sagen.", good:false } ] },
  { level:2, text:"Ein Spiel läuft nicht so, wie du es dir vorgestellt hast, und du wirst schnell frustriert.",
    options:[
      { text:"Ich atme kurz durch und probiere es noch einmal.", good:true },
      { text:"Ich werfe die Spielsachen durch die Gegend.", good:false },
      { text:"Ich gebe sofort ganz auf.", good:false } ] },
  { level:2, text:"Im Wartezimmer beim Arzt wird dir die Zeit lang und du wirst unruhig.",
    options:[
      { text:"Ich schaue mir ein Buch an oder male, während ich warte.", good:true },
      { text:"Ich renne laut schreiend durchs Wartezimmer.", good:false },
      { text:"Ich werde zappelig und störe andere Wartende.", good:false } ] },
  { level:2, text:"Beim Umziehen für den Kindergarten klemmt der Reißverschluss und du wirst ungeduldig.",
    options:[
      { text:"Ich hole mir Hilfe, statt mich zu ärgern.", good:true },
      { text:"Ich reiße wütend an der Jacke.", good:false },
      { text:"Ich weine, ohne um Hilfe zu bitten.", good:false } ] },
  { level:3, text:"Du hast eine wichtige Präsentation in der Schule und dein Bauch kribbelt vor Aufregung.",
    options:[
      { text:"Ich übe kurz vor dem Spiegel und erinnere mich, dass ich vorbereitet bin.", good:true },
      { text:"Ich melde mich krank, obwohl mir nichts fehlt.", good:false },
      { text:"Ich denke die ganze Zeit nur an das Schlimmste, was passieren könnte.", good:false } ] },
  { level:3, text:"Zwei Freunde streiten sich, und du steckst mittendrin.",
    options:[
      { text:"Ich sage: „Lasst uns in Ruhe reden, ich will nicht zwischen euch stehen.“", good:true },
      { text:"Ich nehme heimlich für eine Seite Partei.", good:false },
      { text:"Ich schreie beide an, damit sie aufhören.", good:false } ] },
  { level:3, text:"Beim Sport klappt eine Übung einfach nicht, egal wie oft du es versuchst.",
    options:[
      { text:"Ich mache eine kurze Pause und versuche es dann noch mal.", good:true },
      { text:"Ich werfe wütend die Sportsachen weg.", good:false },
      { text:"Ich sage mir, dass ich das sowieso nie können werde.", good:false } ] },
  { level:3, text:"Du hast dein Hausaufgabenheft verloren und weißt nicht, was aufgegeben wurde.",
    options:[
      { text:"Ich frage in Ruhe einen Mitschüler oder die Lehrerin nach den Aufgaben.", good:true },
      { text:"Ich mache mir große Sorgen, ohne etwas zu unternehmen.", good:false },
      { text:"Ich behaupte, es gäbe keine Hausaufgaben.", good:false } ] },
  { level:4, text:"Du hast das Gefühl, dass du in der Gruppe nicht mehr mitkommst, weil alles sehr schnell geht.",
    options:[
      { text:"Ich bitte kurz darum, dass wir das Tempo etwas verlangsamen.", good:true },
      { text:"Ich tue so, als würde ich alles verstehen, obwohl das nicht stimmt.", good:false },
      { text:"Ich gebe innerlich auf und höre auf mitzumachen.", good:false } ] },
  { level:4, text:"Beim Wettkampf merkst du, wie dein Herz vor Nervosität schneller schlägt.",
    options:[
      { text:"Ich atme bewusst langsamer und erinnere mich an mein Training.", good:true },
      { text:"Ich rede mir ein, dass ich sowieso verlieren werde.", good:false },
      { text:"Ich breche kurzfristig ab, ohne es zu versuchen.", good:false } ] },
  { level:5, text:"Du hast mehrere Aufgaben gleichzeitig zu erledigen und weißt nicht, wo du anfangen sollst.",
    options:[
      { text:"Ich schreibe eine kurze Liste und erledige eine Sache nach der anderen.", good:true },
      { text:"Ich springe hektisch zwischen allem hin und her.", good:false },
      { text:"Ich schiebe alles auf und mache gar nichts.", good:false } ] },
  { level:5, text:"Ein Streit mit einem Freund beschäftigt dich noch tagelang.",
    options:[
      { text:"Ich suche das Gespräch, sobald ich mich beruhigt habe, um es zu klären.", good:true },
      { text:"Ich rede tagelang schlecht über die Person zu anderen.", good:false },
      { text:"Ich tue so, als wäre nichts, obwohl es mich sehr beschäftigt.", good:false } ] },
];

/* ---------- Ruhe-Übungen: 4 wirklich unterschiedliche Übungsarten ----------
   1) "breath"    – geführte Atem-Animation (Kreis wächst/schrumpft)
   2) "steps"     – Schritt-für-Schritt-Impulse zum Antippen (beobachten, bewegen, vorstellen)
   3) "tap"       – aktive Tipp-Übung (Seifenblasen / Sterne antippen)
*/
const CALM_EXERCISES = [
  { id:"wellen", level:1, icon:"🌊", title:"Wellen-Atmung", desc:"Ruhig ein- und ausatmen wie sanfte Wellen", type:"breath", inLabel:"Einatmen …", outLabel:"Ausatmen …", inMs:4000, outMs:4000, rounds:4 },
  { id:"blume", level:1, icon:"🌸", title:"Blumen-Duft", desc:"An einer Blume schnuppern, dann eine Kerze auspusten", type:"breath", inLabel:"An der Blume riechen …", outLabel:"Kerze auspusten …", inMs:3000, outMs:2500, rounds:3 },
  { id:"biene", level:2, icon:"🐝", title:"Bienen-Atmung", desc:"Leise summen beim Ausatmen", type:"breath", inLabel:"Einatmen …", outLabel:"Summmm …", inMs:3000, outMs:4000, rounds:4 },
  { id:"ballon", level:2, icon:"🎈", title:"Ballon-Bauch", desc:"Den Bauch wie einen Ballon füllen und leeren", type:"breath", inLabel:"Bauch füllt sich …", outLabel:"Bauch wird leicht …", inMs:4000, outMs:5000, rounds:4 },
  { id:"mondschein", level:3, icon:"🌙", title:"Mondschein-Atmung", desc:"Ruhig werden wie eine stille Nacht", type:"breath", inLabel:"Mond geht auf …", outLabel:"Mond sinkt …", inMs:4000, outMs:5000, rounds:4 },
  { id:"rakete", level:3, icon:"🚀", title:"Raketen-Countdown", desc:"Mit einem Countdown zur Ruhe starten", type:"breath", inLabel:"Countdown … einatmen", outLabel:"Start! Ausatmen", inMs:3000, outMs:3000, rounds:5 },
  { id:"bremsweg", level:4, icon:"🚗", title:"Sanft bremsen", desc:"Wie ein Auto langsam zum Stehen kommen", type:"breath", inLabel:"Gas geben … einatmen", outLabel:"Sanft bremsen … ausatmen", inMs:4000, outMs:4500, rounds:5 },

  { id:"entdeckung", level:1, icon:"👀", title:"Kleine Entdeckung", desc:"Die Welt um dich herum entdecken", type:"steps",
    steps:["Schau dich um: Was siehst du gerade Buntes?","Hör mal ganz genau hin: Was hörst du?","Fühl mal: Ist der Boden hart oder weich unter dir?","Gut gemacht! Du hast die Welt um dich herum entdeckt."] },
  { id:"rundgang", level:3, icon:"🔎", title:"Ruhe-Rundgang", desc:"In Gedanken auf Entdeckungstour gehen", type:"steps",
    steps:["Nenne 3 Dinge, die du gerade siehst.","Nenne 2 Geräusche, die du gerade hörst.","Spüre deinen Atem, wie er ein- und ausströmt.","Atme einmal tief ein und aus. Du bist gerade hier, und das ist gut so."] },

  { id:"tierwackeln", level:1, icon:"🦒", title:"Tier-Wackeln", desc:"Wie verschiedene Tiere bewegen", type:"steps",
    steps:["Streck dich groß wie eine Giraffe.","Wackle wie ein Fisch im Wasser.","Kuschle dich klein zusammen wie eine Schnecke.","Schüttle dich locker aus wie ein Hund nach dem Baden."] },
  { id:"teddyreise", level:1, icon:"🧸", title:"Teddybär-Reise", desc:"Eine kleine Kuschel-Reise mit dem Teddy", type:"steps",
    steps:["Nimm deinen Teddy ganz fest in den Arm.","Stellt euch vor, ihr fliegt über eine bunte Blumenwiese.","Der Wind ist ganz sanft und warm.","Ihr landet weich auf einer Wolke aus Kissen."] },
  { id:"yogareise", level:3, icon:"🧘", title:"Kleine Yoga-Reise", desc:"Ruhige Posen wie in einer kleinen Reise", type:"steps",
    steps:["Strecke dich groß wie ein Baum, die Arme wie Äste nach oben.","Roll dich klein zusammen wie ein Igel.","Steh fest und ruhig wie ein Berg.","Atme tief durch und lächle — du bist stark und ruhig."] },
  { id:"wackelpudding", level:4, icon:"🍮", title:"Wackelpudding", desc:"Spannung abschütteln wie ein Pudding", type:"steps",
    steps:["Balle beide Hände fest zu Fäusten … und lass sie locker.","Zieh die Schultern hoch zu den Ohren … und lass sie sinken.","Schüttle Arme und Beine locker aus wie Wackelpudding.","Bleib ganz still stehen und spüre die Ruhe danach."] },

  { id:"wolkenreise", level:2, icon:"☁️", title:"Wolkenreise", desc:"Eine ruhige Reise auf einer Wolke", type:"steps",
    steps:["Stell dir vor, du liegst auf einer weichen Wolke.","Die Wolke schwebt ganz langsam über grüne Wiesen.","Unter dir hörst du leise Vogelgezwitscher.","Die Wolke bringt dich sanft zurück, und du fühlst dich ruhig."] },
  { id:"sternenreise", level:4, icon:"🌌", title:"Sternenreise", desc:"Eine ruhige Reise durch die Nacht", type:"steps",
    steps:["Stell dir vor, du fliegst sanft zwischen den Sternen.","Jeder Stern leuchtet ruhig und gleichmäßig.","Du schwebst ganz langsam zurück zur Erde.","Du landest sanft und fühlst dich geborgen."] },

  { id:"seifenblasen-pop", level:1, icon:"🫧", title:"Seifenblasen zerplatzen", desc:"Tippe nacheinander alle Seifenblasen an", type:"tap", emoji:"🫧", poppedEmoji:"✨", count:6 },
  { id:"sterne-sammeln", level:2, icon:"⭐", title:"Sterne sammeln", desc:"Tippe die Sterne an, bis alle funkeln", type:"tap", emoji:"☆", poppedEmoji:"⭐", count:8 },
];

/* Schritt-für-Schritt-Übungen (type:"steps") nutzen exercise.steps direkt, keine globalen Listen mehr nötig. */

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
  { id:"erster-tag", level:2, title:"Leos erster Tag", cover:"🌤️",
    pages:[
      { scene:"🌱", text:"Leo geht zum ersten Mal in die neue Gruppe. Im Bauch kribbelt es ganz komisch." },
      { scene:"🚪", text:"An der Tür bleibt Leo kurz stehen. So viele neue Gesichter!" },
      { scene:"🤝", text:"Ein Kind lächelt Leo an und fragt: „Möchtest du mitspielen?“" },
      { scene:"😊", text:"Leo atmet einmal tief durch und sagt: „Ja, gerne!“" } ],
    question:"Wie hat sich Leo an der Tür wohl gefühlt?", options:["angst","freude","wut"], correct:"angst",
    tip:"Aufgeregt sein vor etwas Neuem ist ganz normal. Ein tiefer Atemzug hilft, mutig zu bleiben." },
  { id:"turm", level:2, title:"Der umgefallene Turm", cover:"🧱",
    pages:[
      { scene:"🏗️", text:"Leo baut einen riesigen Turm aus Bauklötzen. Ganz vorsichtig, Stein für Stein." },
      { scene:"💥", text:"Plötzlich stößt jemand dagegen — der ganze Turm fällt um!" },
      { scene:"😤", text:"Leo spürt, wie es im Bauch heiß wird und die Fäuste sich ballen." },
      { scene:"🌬️", text:"Leo macht drei ruhige Atemzüge und sagt dann: „Das hat mich richtig geärgert. Können wir zusammen neu bauen?“" } ],
    question:"Was hat Leo gespürt, als der Turm umfiel?", options:["wut","ueberr","ruhe"], correct:"wut",
    tip:"Wut darf sein! Wichtig ist, sie mit Worten statt mit Schubsen zu zeigen." },
  { id:"dunkler-flur", level:2, title:"Der dunkle Flur", cover:"🌙",
    pages:[
      { scene:"🏠", text:"Es ist Abend. Leo muss noch einmal durch den dunklen Flur zur Küche." },
      { scene:"😨", text:"Das Herz klopft schneller. Was, wenn dort etwas Gruseliges ist?" },
      { scene:"💬", text:"Leo geht zu Mama und sagt: „Ich habe Angst im dunklen Flur.“" },
      { scene:"🕯️", text:"Gemeinsam machen sie ein kleines Licht an und gehen zusammen los." } ],
    question:"Was hat Leo im dunklen Flur gefühlt?", options:["angst","freude","ruhe"], correct:"angst",
    tip:"Über Angst zu sprechen macht sie kleiner. Hilfe holen ist immer eine gute Idee." },
  { id:"teilen", level:3, title:"Ein Eis für zwei", cover:"🍦",
    pages:[
      { scene:"🍦", text:"Leo bekommt ein großes Eis, aber die Freundin hat gar keins mehr." },
      { scene:"🤔", text:"Erst denkt Leo: „Das ist doch mein Eis!“" },
      { scene:"💡", text:"Dann fällt Leo ein, wie schön geteilte Freude ist." },
      { scene:"😊", text:"„Willst du auch probieren?“, fragt Leo und beide lachen." } ],
    question:"Wie hat sich Leo zuerst gefühlt, als die Freundin kein Eis hatte?", options:["freude","enttaeuscht","ruhe"], correct:"freude",
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
      { scene:"🚪", text:"Heute steht eine Erzieherin in der Tür, die Leo noch nicht kennt." },
      { scene:"😯", text:"Leo bleibt erst mal ganz still am Rand stehen." },
      { scene:"🙋", text:"Die neue Erzieherin lächelt und fragt: „Magst du mir zeigen, wo die Bauklötze sind?“" },
      { scene:"😊", text:"Am Ende des Tages hat Leo eine neue Freundin gefunden." } ],
    question:"Wie hat sich Leo gefühlt, als die neue Erzieherin kam?", options:["angst","freude","ueberr"], correct:"angst",
    tip:"Neue Gesichter können am Anfang ungewohnt sein. Ein kleiner Schritt aufeinander zu hilft oft schon." },
  { id:"uebernachtung", level:3, title:"Die erste Übernachtung", cover:"🧸",
    pages:[
      { scene:"🎒", text:"Leo darf zum ersten Mal bei der Oma übernachten." },
      { scene:"😟", text:"Abends im fremden Bett fühlt sich alles anders an als zu Hause." },
      { scene:"🧸", text:"Leo umarmt sein mitgebrachtes Kuscheltier ganz fest." },
      { scene:"😌", text:"Oma liest noch eine Geschichte vor, und Leo schläft ganz ruhig ein." } ],
    question:"Wie hat sich Leo im fremden Bett zuerst gefühlt?", options:["angst","ruhe","freude"], correct:"angst",
    tip:"Ein vertrautes Kuscheltier oder Ritual kann an neuen Orten Sicherheit geben." },
  { id:"geschwister", level:4, title:"Der kleine Bruder", cover:"👶",
    pages:[
      { scene:"👨‍👩‍👧", text:"Seit der kleine Bruder da ist, dreht sich zu Hause vieles um ihn." },
      { scene:"😒", text:"Leo sitzt oft still in der Ecke und fühlt ein komisches Ziehen im Bauch." },
      { scene:"💬", text:"Eines Abends sagt Leo zu Mama: „Ich vermisse unsere Zeit zu zweit.“" },
      { scene:"🤗", text:"Am nächsten Tag gibt es eine extra Leo-und-Mama-Zeit, nur für die beiden." } ],
    question:"Was hat Leo gefühlt, als sich alles um den kleinen Bruder drehte?", options:["eifersucht","ueberr","stolz"], correct:"eifersucht",
    tip:"Eifersucht ist ein ganz normales Gefühl. Darüber zu sprechen hilft, wieder gesehen zu werden." },
  { id:"verlorenes-spiel", level:3, title:"Verloren, aber nicht traurig", cover:"⚽",
    pages:[
      { scene:"⚽", text:"Leos Mannschaft verliert das Spiel, obwohl alle ihr Bestes gegeben haben." },
      { scene:"😞", text:"Leo hätte so gern gewonnen und ist richtig enttäuscht." },
      { scene:"🫂", text:"Der Trainer sagt: „Ihr habt heute super zusammengespielt.“" },
      { scene:"🙂", text:"Leo lächelt wieder und freut sich schon aufs nächste Spiel." } ],
    question:"Was hat Leo nach dem verlorenen Spiel gefühlt?", options:["enttaeuscht","dankbar","ueberr"], correct:"enttaeuscht",
    tip:"Enttäuschung nach einer Niederlage ist normal. Sie wird kleiner, wenn man sieht, was gut gelaufen ist." },
  { id:"neue-schule", level:4, title:"Der erste Schultag", cover:"🎒",
    pages:[
      { scene:"🎒", text:"Heute ist Leos erster Tag in der neuen Schule. Der Ranzen fühlt sich schwer an." },
      { scene:"😬", text:"Im Bauch kribbelt es, und die Hände sind ganz zittrig." },
      { scene:"🧘", text:"Leo erinnert sich an die Ballon-Atmung und atmet dreimal ruhig." },
      { scene:"👋", text:"In der Klasse winkt ein Kind und zeigt Leo den freien Platz neben sich." } ],
    question:"Wie hat sich Leo vor der neuen Schule gefühlt?", options:["nervoes","stolz","dankbar"], correct:"nervoes",
    tip:"Nervosität vor Neuem verschwindet oft nach den ersten Minuten. Atmen hilft, ruhiger zu werden." },
  { id:"fehler", level:5, title:"Der Fehler an der Tafel", cover:"📝",
    pages:[
      { scene:"📝", text:"Leo soll eine Aufgabe an der Tafel lösen — und macht dabei einen Fehler." },
      { scene:"😳", text:"Ein paar Kinder kichern, und Leo wird ganz heiß im Gesicht." },
      { scene:"🧑‍🏫", text:"Die Lehrerin sagt: „Fehler gehören zum Lernen dazu, das passiert uns allen.“" },
      { scene:"🙂", text:"Leo atmet durch und setzt sich wieder — es ist schon halb so schlimm." } ],
    question:"Was hat Leo an der Tafel gespürt?", options:["scham","freude","ruhe"], correct:"scham",
    tip:"Sich zu schämen ist unangenehm, geht aber vorbei. Fehler machen gehört zum Lernen dazu." },
  { id:"nasser-hund", level:1, title:"Der nasse Hund", cover:"🐶",
    pages:[
      { scene:"🐶", text:"Leo streichelt einen nassen Hund im Garten." },
      { scene:"💦", text:"Platsch! Der Hund schüttelt sich und Leo wird nass." },
      { scene:"😆", text:"Leo lacht, weil es so kitzlig war." } ],
    question:"Wie hat sich Leo gefühlt, als das Wasser spritzte?", options:["ueberr","freude","wut"], correct:"ueberr",
    tip:"Kleine Überraschungen können erst komisch und dann lustig sein." },
  { id:"verlorene-muetze", level:2, title:"Die verlorene Mütze", cover:"🧢",
    pages:[
      { scene:"🧢", text:"Leo hat seine Lieblingsmütze im Park verloren." },
      { scene:"😟", text:"Er sucht überall, aber sie ist nicht da." },
      { scene:"🧑‍🤝‍🧑", text:"Ein anderes Kind findet sie und bringt sie zurück." },
      { scene:"😊", text:"Leo bedankt sich riesig und strahlt vor Freude." } ],
    question:"Wie hat sich Leo gefühlt, als die Mütze weg war?", options:["traurig","freude","wut"], correct:"traurig",
    tip:"Etwas zu verlieren fühlt sich unangenehm an. Wiederzufinden macht umso glücklicher." },
  { id:"gruppenprojekt", level:3, title:"Das Gruppenprojekt", cover:"📋",
    pages:[
      { scene:"📋", text:"Leo soll mit drei anderen Kindern ein Plakat gestalten." },
      { scene:"😤", text:"Ein Kind will alles allein bestimmen, das ärgert Leo." },
      { scene:"💬", text:"Leo sagt ruhig: „Lasst uns abstimmen, was jeder gern machen möchte.“" },
      { scene:"🎉", text:"Am Ende ist das Plakat bunt und alle haben mitgeholfen." } ],
    question:"Was hat Leo gefühlt, als ein Kind alles bestimmen wollte?", options:["wut","freude","ruhe"], correct:"wut",
    tip:"Bei Gruppenarbeit hilft es, alle Meinungen zu hören, auch wenn man kurz ärgerlich wird." },
  { id:"verpasster-bus", level:3, title:"Der verpasste Bus", cover:"🚌",
    pages:[
      { scene:"🚌", text:"Leo kommt zu spät zur Bushaltestelle, der Bus fährt gerade ab." },
      { scene:"😩", text:"Er ist genervt und ein bisschen ängstlich, weil er zu spät zur Schule kommt." },
      { scene:"📞", text:"Leo ruft Mama an und erklärt ruhig, was passiert ist." },
      { scene:"🚗", text:"Mama bringt ihn mit dem Auto, alles wird gut." } ],
    question:"Wie hat sich Leo gefühlt, als der Bus abfuhr?", options:["nervoes","freude","ruhe"], correct:"nervoes",
    tip:"Wenn etwas schiefgeht, hilft es, ruhig zu bleiben und sich Hilfe zu holen." },
  { id:"geburtstagseinladung", level:4, title:"Die Geburtstagseinladung", cover:"🎂",
    pages:[
      { scene:"🎉", text:"Alle in der Klasse werden zur Geburtstagsfeier eingeladen — außer Leo." },
      { scene:"😞", text:"Das fühlt sich richtig unfair und traurig an." },
      { scene:"💬", text:"Leo erzählt seiner besten Freundin davon, wie sehr ihn das verletzt hat." },
      { scene:"🤗", text:"Sie lädt Leo spontan zu sich zum Spielen ein, das tröstet." } ],
    question:"Was hat Leo gefühlt, als er nicht eingeladen wurde?", options:["enttaeuscht","freude","stolz"], correct:"enttaeuscht",
    tip:"Ausgeschlossen zu werden tut weh. Sich jemandem anzuvertrauen hilft, den Schmerz zu teilen." },
  { id:"notluege", level:5, title:"Die ehrliche Antwort", cover:"🖍️",
    pages:[
      { scene:"🖍️", text:"Leo hat aus Versehen den Lieblingsstift der Schwester kaputt gemacht." },
      { scene:"😰", text:"Er überlegt kurz, ob er es einfach abstreiten soll." },
      { scene:"💬", text:"Stattdessen sagt er ehrlich: „Das war ich, es tut mir leid.“" },
      { scene:"🙂", text:"Die Schwester ist zwar kurz sauer, aber froh über die Ehrlichkeit." } ],
    question:"Was hat Leo gespürt, bevor er die Wahrheit gesagt hat?", options:["nervoes","freude","ruhe"], correct:"nervoes",
    tip:"Ehrlich zu sein kostet manchmal Mut, fühlt sich aber am Ende meist besser an." },
  { id:"seifenblase", level:1, title:"Die Seifenblase", cover:"🫧",
    pages:[
      { scene:"🫧", text:"Ben pustet eine große Seifenblase." },
      { scene:"💥", text:"Zack! Die Blase platzt auf seiner Nase." },
      { scene:"😄", text:"Ben lacht und pustet gleich die nächste." } ],
    question:"Wie fühlt sich Ben, als die Blase platzt?", options:["ueberr","traurig","wut"], correct:"ueberr",
    tip:"Kleine Überraschungen gehören zum Spielen dazu und sind oft lustig." },
  { id:"tuermchen", level:1, title:"Das Bauklötze-Türmchen", cover:"🧱",
    pages:[
      { scene:"🧱", text:"Mia baut ein kleines Türmchen." },
      { scene:"🙌", text:"Ganz oben setzt sie den letzten Stein drauf." },
      { scene:"😊", text:"Stolz zeigt sie es Mama." } ],
    question:"Wie fühlt sich Mia, als der Turm fertig ist?", options:["freude","traurig","angst"], correct:"freude",
    tip:"Etwas geschafft zu haben macht kleine und große Baumeister glücklich." },
  { id:"regenbogen", level:1, title:"Der Regenbogen", cover:"🌈",
    pages:[
      { scene:"🌧️", text:"Es hat geregnet, und Lea schaut traurig aus dem Fenster." },
      { scene:"🌈", text:"Plötzlich erscheint ein bunter Regenbogen am Himmel." },
      { scene:"😍", text:"Lea strahlt und zeigt mit dem Finger darauf." } ],
    question:"Wie fühlt sich Lea, als sie den Regenbogen sieht?", options:["ueberr","wut","traurig"], correct:"ueberr",
    tip:"Nach dem Regen kommt oft etwas Schönes — das ist eine kleine Überraschung." },
  { id:"gewitter-klein", level:1, title:"Das laute Gewitter", cover:"⛈️",
    pages:[
      { scene:"⛈️", text:"Draußen blitzt und donnert es laut." },
      { scene:"😦", text:"Ben kuschelt sich ganz fest an Mama." },
      { scene:"🤗", text:"Mama hält ihn fest, bis das Gewitter vorbei ist." } ],
    question:"Wie fühlt sich Ben beim lauten Donner?", options:["angst","freude","ruhe"], correct:"angst",
    tip:"Bei lauten Geräuschen hilft Nähe und ein fester Arm zum Anlehnen." },
  { id:"mittagsschlaf", level:1, title:"Der Mittagsschlaf", cover:"😴",
    pages:[
      { scene:"🛏️", text:"Nele soll jetzt schlafen, will aber noch spielen." },
      { scene:"😤", text:"Erst ist sie ein bisschen bockig." },
      { scene:"📖", text:"Nach einer kleinen Geschichte wird sie ganz müde und ruhig." } ],
    question:"Wie fühlt sich Nele zuerst, als sie schlafen soll?", options:["wut","freude","ruhe"], correct:"wut",
    tip:"Vom Spielen zum Schlafen zu wechseln ist manchmal schwer. Ein Ritual hilft beim Runterkommen." },
  { id:"badewanne", level:1, title:"Badewannen-Zeit", cover:"🛁",
    pages:[
      { scene:"🛁", text:"Lea planscht fröhlich in der warmen Badewanne." },
      { scene:"🧴", text:"Etwas Schaum kommt ihr versehentlich ins Auge." },
      { scene:"😊", text:"Nach dem Abspülen lacht sie wieder und spielt mit der Ente." } ],
    question:"Wie fühlt sich Lea, als der Schaum ins Auge kommt?", options:["traurig","freude","ueberr"], correct:"traurig",
    tip:"Kleine Missgeschicke beim Baden sind schnell vergessen." },
  { id:"picknick", level:1, title:"Das Picknick", cover:"🧺",
    pages:[
      { scene:"🧺", text:"Familie Fuchs macht ein Picknick im Park." },
      { scene:"🐝", text:"Eine Biene summt ganz nah um Bens Kopf." },
      { scene:"😌", text:"Sie fliegt weiter, und alle essen in Ruhe weiter." } ],
    question:"Wie fühlt sich Ben, als die Biene ganz nah ist?", options:["angst","freude","ruhe"], correct:"angst",
    tip:"Stillhalten und ruhig bleiben lässt Bienen meist von allein weiterfliegen." },
  { id:"verlorener-schuh", level:1, title:"Der verlorene Schuh", cover:"👟",
    pages:[
      { scene:"👟", text:"Beim Spielen verliert Mia einen Schuh im Sand." },
      { scene:"😟", text:"Sie sucht und sucht, kann ihn aber nicht finden." },
      { scene:"🎉", text:"Papa gräbt ihn schließlich aus dem Sandkasten aus." } ],
    question:"Wie fühlt sich Mia, als sie den Schuh sucht?", options:["traurig","freude","wut"], correct:"traurig",
    tip:"Etwas Verlorenes wiederzufinden ist ein schönes Gefühl der Erleichterung." },
  { id:"erster-schnee", level:1, title:"Der erste Schnee", cover:"❄️",
    pages:[
      { scene:"❄️", text:"Tom wacht auf und draußen liegt der erste Schnee." },
      { scene:"😲", text:"Er kann es kaum glauben, alles ist weiß." },
      { scene:"🥳", text:"Schnell zieht er sich an, um im Schnee zu spielen." } ],
    question:"Wie fühlt sich Tom beim ersten Schnee?", options:["ueberr","traurig","wut"], correct:"ueberr",
    tip:"Der erste Schnee im Jahr ist für viele Kinder eine große, schöne Überraschung." },
  { id:"enten-fuettern", level:1, title:"Die Enten füttern", cover:"🦆",
    pages:[
      { scene:"🦆", text:"Am Teich füttert Nele die Enten mit Brot." },
      { scene:"🦆", text:"Auf einmal kommen ganz viele Enten gleichzeitig angeschwommen." },
      { scene:"😄", text:"Nele freut sich riesig über den Trubel." } ],
    question:"Wie fühlt sich Nele, als so viele Enten kommen?", options:["ueberr","wut","angst"], correct:"ueberr",
    tip:"Manchmal ist Überraschung mit einem Lächeln verbunden." },
  { id:"sandkasten", level:1, title:"Der Sandkasten", cover:"🏖️",
    pages:[
      { scene:"🏖️", text:"Ben und Lina spielen zusammen im Sandkasten." },
      { scene:"🪣", text:"Lina möchte den Eimer, den Ben gerade benutzt." },
      { scene:"🤝", text:"Sie einigen sich, abwechselnd damit zu bauen." } ],
    question:"Was braucht es, damit beide zufrieden sind?", options:["ruhe","wut","angst"], correct:"ruhe",
    tip:"Abwechseln beim Teilen macht das Spielen für beide Kinder angenehmer." },
  { id:"luftballon-fahrt", level:1, title:"Die Ballonfahrt", cover:"🎈",
    pages:[
      { scene:"🎈", text:"Tom bekommt auf dem Jahrmarkt einen Luftballon geschenkt." },
      { scene:"💨", text:"Ein Windstoß reißt ihn kurz aus der Hand." },
      { scene:"🤗", text:"Papa hält ihn schnell wieder fest." } ],
    question:"Wie fühlt sich Tom, als der Ballon wegfliegen will?", options:["angst","freude","ruhe"], correct:"angst",
    tip:"Ein kurzer Schreck ist schnell vorbei, wenn jemand hilft." },
  { id:"neue-schuhe", level:1, title:"Die neuen Schuhe", cover:"👟",
    pages:[
      { scene:"👟", text:"Lea bekommt tolle neue Schuhe mit Blinklicht." },
      { scene:"🏃", text:"Sie rennt aufgeregt im Kreis, um sie leuchten zu sehen." },
      { scene:"😄", text:"Alle bewundern die blinkenden Schuhe." } ],
    question:"Wie fühlt sich Lea mit ihren neuen Schuhen?", options:["freude","traurig","angst"], correct:"freude",
    tip:"Kleine Dinge können große Freude machen." },
  { id:"kuscheltier-suche", level:1, title:"Die Kuscheltier-Suche", cover:"🧸",
    pages:[
      { scene:"🧸", text:"Beim Schlafengehen fehlt plötzlich der Teddy." },
      { scene:"😟", text:"Ben sucht unter dem Bett und im Schrank." },
      { scene:"😊", text:"Er findet ihn unter der Decke, ganz warm und gemütlich." } ],
    question:"Wie fühlt sich Ben, als er den Teddy nicht findet?", options:["traurig","freude","wut"], correct:"traurig",
    tip:"Etwas Vertrautes wiederzufinden ist ein beruhigendes Gefühl." },
];

/* ---------- Modul: Lack-Werkstatt (Farben erkennen, mit Piktogramm + Farbhinweis) ---------- */
const COLOR_NAMES = {
  gelb:  { label:"Gelb",  hue:"#FFD966" },
  rot:   { label:"Rot",   hue:"#FF6F61" },
  gruen: { label:"Grün",  hue:"#7FD8A6" },
  blau:  { label:"Blau",  hue:"#6FB8E0" },
  orange:{ label:"Orange",hue:"#FFA45B" },
  lila:  { label:"Lila",  hue:"#B39DDB" },
  rosa:  { label:"Rosa",  hue:"#F7A8C4" },
  braun: { label:"Braun", hue:"#B5835A" },
  grau:  { label:"Grau",  hue:"#AEB4BD" },
  schwarz:{ label:"Schwarz", hue:"#4A4358" },
};
const COLOR_ITEMS = [
  { level:1, icon:"🍋", text:"Welche Farbe hat die Zitrone?", correct:"gelb" },
  { level:1, icon:"🍓", text:"Welche Farbe hat die Erdbeere?", correct:"rot" },
  { level:1, icon:"🍀", text:"Welche Farbe hat das Kleeblatt?", correct:"gruen" },
  { level:1, icon:"🌊", text:"Welche Farbe hat das Meer?", correct:"blau" },
  { level:1, icon:"🍌", text:"Welche Farbe hat die Banane?", correct:"gelb" },
  { level:1, icon:"🥕", text:"Welche Farbe hat die Karotte?", correct:"orange" },
  { level:1, icon:"🐸", text:"Welche Farbe hat der Frosch?", correct:"gruen" },
  { level:2, icon:"🚒", text:"Welche Farbe hat das Feuerwehrauto?", correct:"rot" },
  { level:2, icon:"🍇", text:"Welche Farbe hat die Traube?", correct:"lila" },
  { level:2, icon:"🌞", text:"Welche Farbe hat die Sonne?", correct:"gelb" },
  { level:2, icon:"🐷", text:"Welche Farbe hat das Schweinchen?", correct:"rosa" },
  { level:3, icon:"🍫", text:"Welche Farbe hat die Schokolade?", correct:"braun" },
  { level:3, icon:"🌳", text:"Welche Farbe hat der Baum?", correct:"gruen" },
  { level:1, icon:"🍊", text:"Welche Farbe hat die Orange?", correct:"orange" },
  { level:1, icon:"🫐", text:"Welche Farbe hat die Heidelbeere?", correct:"blau" },
  { level:1, icon:"🌻", text:"Welche Farbe hat die Sonnenblume?", correct:"gelb" },
  { level:1, icon:"🍉", text:"Welche Farbe ist die Melone innen?", correct:"rot" },
  { level:2, icon:"🐝", text:"Welche Farbe hat die Biene?", correct:"gelb" },
  { level:2, icon:"🐘", text:"Welche Farbe hat der Elefant?", correct:"grau" },
  { level:3, icon:"🍆", text:"Welche Farbe hat die Aubergine?", correct:"lila" },
  { level:3, icon:"🐧", text:"Welche Farbe hat der Rücken des Pinguins?", correct:"schwarz" },
  { level:1, icon:"🍎", text:"Welche Farbe hat der Apfel?", correct:"rot" },
  { level:1, icon:"🐤", text:"Welche Farbe hat das Küken?", correct:"gelb" },
  { level:1, icon:"🐻", text:"Welche Farbe hat der Bär?", correct:"braun" },
  { level:1, icon:"🐳", text:"Welche Farbe hat der Wal?", correct:"blau" },
  { level:1, icon:"🎃", text:"Welche Farbe hat der Kürbis?", correct:"orange" },
  { level:1, icon:"🍒", text:"Welche Farbe hat die Kirsche?", correct:"rot" },
  { level:1, icon:"🌼", text:"Welche Farbe hat die Blüte?", correct:"gelb" },
  { level:1, icon:"🐹", text:"Welche Farbe hat das Hamsterfell?", correct:"braun" },
  { level:1, icon:"🟣", text:"Welche Farbe hat dieser Punkt?", correct:"lila" },
  { level:1, icon:"🍅", text:"Welche Farbe hat die Tomate?", correct:"rot" },
  { level:1, icon:"🦩", text:"Welche Farbe hat der Flamingo?", correct:"rosa" },
  { level:1, icon:"🐬", text:"Welche Farbe hat der Delfin?", correct:"blau" },
  { level:1, icon:"🍑", text:"Welche Farbe hat der Pfirsich?", correct:"orange" },
  { level:1, icon:"🐨", text:"Welche Farbe hat der Koala?", correct:"grau" },
  { level:1, icon:"🍁", text:"Welche Farbe hat das Herbstblatt?", correct:"orange" },
  { level:1, icon:"🐴", text:"Welche Farbe hat das Pferd?", correct:"braun" },
  { level:1, icon:"🦆", text:"Welche Farbe hat die Ente?", correct:"braun" },
  { level:1, icon:"🍄", text:"Welche Farbe hat der Pilzhut?", correct:"rot" },
  { level:1, icon:"🚗", text:"Welche Farbe hat Leos Rennauto?", correct:"rot" },
  { level:1, icon:"🏍️", text:"Welche Farbe hat Leos Motorrad?", correct:"rot" },
  { level:1, icon:"🐞", text:"Welche Farbe hat der Marienkäfer?", correct:"rot" },
  { level:1, icon:"🦁", text:"Welche Farbe hat die Löwenmähne?", correct:"braun" },
  { level:1, icon:"🐷", text:"Welche Farbe hat das Ferkel?", correct:"rosa" },
  { level:1, icon:"🍐", text:"Welche Farbe hat die Birne?", correct:"gelb" },
];

/* ---------- Modul: Formen-Werkstatt (Formen erkennen) ---------- */
const SHAPE_NAMES = {
  kreis:   { label:"Kreis",    glyph:"●" },
  dreieck: { label:"Dreieck",  glyph:"▲" },
  quadrat: { label:"Quadrat",  glyph:"■" },
  rechteck:{ label:"Rechteck", glyph:"▬" },
  stern:   { label:"Stern",    glyph:"★" },
  herz:    { label:"Herz",     glyph:"♥" },
  raute:   { label:"Raute",    glyph:"♦" },
};
const SHAPE_ITEMS = [
  { level:1, icon:"🛞", text:"Welche Form hat das Rad?", correct:"kreis" },
  { level:1, icon:"🍕", text:"Welche Form hat ein Stück Pizza?", correct:"dreieck" },
  { level:1, icon:"🪟", text:"Welche Form hat das Fenster?", correct:"quadrat" },
  { level:1, icon:"🔴", text:"Welche Form hat der Ball?", correct:"kreis" },
  { level:1, icon:"🎪", text:"Welche Form hat das Zirkuszelt-Dach?", correct:"dreieck" },
  { level:1, icon:"🧇", text:"Welche Form hat die Waffel?", correct:"quadrat" },
  { level:1, icon:"🌕", text:"Welche Form hat der Vollmond?", correct:"kreis" },
  { level:1, icon:"🍪", text:"Welche Form hat der Keks?", correct:"kreis" },
  { level:1, icon:"🎩", text:"Welche Form hat der Hexenhut?", correct:"dreieck" },
  { level:1, icon:"📺", text:"Welche Form hat der Fernseher?", correct:"quadrat" },
  { level:1, icon:"🍕", text:"Welche Form hat das andere Pizzastück?", correct:"dreieck" },
  { level:1, icon:"🧊", text:"Welche Form hat der Eiswürfel?", correct:"quadrat" },
  { level:1, icon:"⚽", text:"Welche Form hat der Fußball?", correct:"kreis" },
  { level:2, icon:"🚪", text:"Welche Form hat die Tür?", correct:"rechteck" },
  { level:2, icon:"⭐", text:"Welche Form hat der Stern am Himmel?", correct:"stern" },
  { level:2, icon:"📱", text:"Welche Form hat das Handy?", correct:"rechteck" },
  { level:2, icon:"🚦", text:"Welche Form haben die Ampellichter?", correct:"kreis" },
  { level:2, icon:"🎫", text:"Welche Form hat das Ticket?", correct:"rechteck" },
  { level:3, icon:"💌", text:"Welche Form hat das Herz auf dem Brief?", correct:"herz" },
  { level:3, icon:"🍉", text:"Welche Form hat die Wassermelonenscheibe?", correct:"dreieck" },
  { level:3, icon:"🚩", text:"Welche Form hat die Wimpel-Flagge?", correct:"dreieck" },
  { level:3, icon:"🧱", text:"Welche Form hat der Baustein?", correct:"quadrat" },
  { level:4, icon:"🔶", text:"Welche Form hat das Vorfahrtsschild?", correct:"raute" },
  { level:4, icon:"🎏", text:"Welche Form hat die Wimpelkette?", correct:"dreieck" },
  { level:5, icon:"🀄", text:"Welche Form hat diese Spielkarte?", correct:"rechteck" },
  { level:5, icon:"🔷", text:"Welche Form hat dieses Verkehrsschild?", correct:"raute" },
];

/* ---------- Modul: Zähl-Werkstatt (Zählen üben) ---------- */
const COUNT_ITEMS = [
  { level:1, emoji:"🚗", noun:"Autos", count:2 },
  { level:1, emoji:"🐶", noun:"Hunde", count:1 },
  { level:1, emoji:"🍎", noun:"Äpfel", count:3 },
  { level:1, emoji:"⭐", noun:"Sterne", count:2 },
  { level:1, emoji:"🎈", noun:"Luftballons", count:1 },
  { level:1, emoji:"🐟", noun:"Fische", count:3 },
  { level:1, emoji:"🌼", noun:"Blumen", count:2 },
  { level:1, emoji:"🐻", noun:"Bären", count:1 },
  { level:1, emoji:"🦆", noun:"Enten", count:2 },
  { level:1, emoji:"🎁", noun:"Geschenke", count:3 },
  { level:1, emoji:"🧦", noun:"Socken", count:2 },
  { level:1, emoji:"🥕", noun:"Karotten", count:3 },
  { level:1, emoji:"🚙", noun:"Autos", count:1 },
  { level:2, emoji:"🏍️", noun:"Motorräder", count:3 },
  { level:2, emoji:"🌼", noun:"Blumen", count:4 },
  { level:2, emoji:"🐤", noun:"Küken", count:2 },
  { level:2, emoji:"🍪", noun:"Kekse", count:4 },
  { level:2, emoji:"🚲", noun:"Fahrräder", count:3 },
  { level:3, emoji:"🚓", noun:"Polizeiautos", count:5 },
  { level:3, emoji:"🍇", noun:"Trauben", count:6 },
  { level:3, emoji:"⚽", noun:"Bälle", count:4 },
  { level:3, emoji:"🦋", noun:"Schmetterlinge", count:5 },
  { level:4, emoji:"🚒", noun:"Feuerwehrautos", count:7 },
  { level:4, emoji:"🌟", noun:"Sterne", count:6 },
  { level:4, emoji:"🍩", noun:"Donuts", count:8 },
  { level:5, emoji:"🚙", noun:"Autos", count:9 },
  { level:5, emoji:"🎈", noun:"Luftballons", count:10 },
  { level:5, emoji:"🍓", noun:"Erdbeeren", count:7 },
];

/* ---------- Modul: Tier-Laute-Werkstatt (Tierlaute zuordnen) ---------- */
const ANIMAL_SOUNDS = {
  kuh:      { label:"Kuh",      emoji:"🐄" },
  hund:     { label:"Hund",     emoji:"🐶" },
  katze:    { label:"Katze",    emoji:"🐱" },
  ente:     { label:"Ente",     emoji:"🦆" },
  schaf:    { label:"Schaf",    emoji:"🐑" },
  pferd:    { label:"Pferd",    emoji:"🐴" },
  schwein:  { label:"Schwein",  emoji:"🐷" },
  loewe:    { label:"Löwe",     emoji:"🦁" },
  hahn:     { label:"Hahn",     emoji:"🐓" },
  frosch:   { label:"Frosch",   emoji:"🐸" },
  biene:    { label:"Biene",    emoji:"🐝" },
  eule:     { label:"Eule",     emoji:"🦉" },
  esel:     { label:"Esel",     emoji:"🫏" },
  vogel:    { label:"Vogel",    emoji:"🐦" },
  schlange: { label:"Schlange", emoji:"🐍" },
  elefant:  { label:"Elefant",  emoji:"🐘" },
};
const SOUND_ITEMS = [
  { level:1, sound:"„Muh“", correct:"kuh" },
  { level:1, sound:"„Wau, wau“", correct:"hund" },
  { level:1, sound:"„Miau“", correct:"katze" },
  { level:1, sound:"„Mäh“", correct:"schaf" },
  { level:1, sound:"„Oink, oink“", correct:"schwein" },
  { level:1, sound:"„Kikeriki“", correct:"hahn" },
  { level:1, sound:"„Schnatter, schnatter“", correct:"ente" },
  { level:1, sound:"„Iiiäh“", correct:"pferd" },
  { level:2, sound:"„Quak, quak“", correct:"frosch" },
  { level:2, sound:"„Summ, summ“", correct:"biene" },
  { level:2, sound:"„Huhu“", correct:"eule" },
  { level:2, sound:"„Grrr“", correct:"loewe" },
  { level:3, sound:"„Iah, iah“", correct:"esel" },
  { level:3, sound:"„Zwitscher, zwitscher“", correct:"vogel" },
  { level:3, sound:"„Zisssch“", correct:"schlange" },
  { level:3, sound:"„Tröööt“", correct:"elefant" },
];

/* ---------- Modul: Fahrzeug-Kunde (Fahrzeuge erkennen) ---------- */
const VEHICLE_NAMES = {
  auto:           { label:"Auto",           emoji:"🚗" },
  motorrad:       { label:"Motorrad",       emoji:"🏍️" },
  boot:           { label:"Boot",           emoji:"⛵" },
  zug:            { label:"Zug",            emoji:"🚂" },
  fahrrad:        { label:"Fahrrad",        emoji:"🚲" },
  flugzeug:       { label:"Flugzeug",       emoji:"✈️" },
  traktor:        { label:"Traktor",        emoji:"🚜" },
  feuerwehrauto:  { label:"Feuerwehrauto",  emoji:"🚒" },
  krankenwagen:   { label:"Krankenwagen",   emoji:"🚑" },
  bus:            { label:"Bus",            emoji:"🚌" },
  taxi:           { label:"Taxi",           emoji:"🚕" },
  polizeiauto:    { label:"Polizeiauto",    emoji:"🚓" },
  hubschrauber:   { label:"Hubschrauber",   emoji:"🚁" },
  rakete:         { label:"Rakete",         emoji:"🚀" },
  laster:         { label:"Laster",         emoji:"🚛" },
  bagger:         { label:"Bagger",         emoji:"🏗️" },
};
const VEHICLE_ITEMS = [
  { level:1, icon:"🚗", text:"Wie heißt dieses Fahrzeug?", correct:"auto" },
  { level:1, icon:"🏍️", text:"Wie heißt dieses Fahrzeug?", correct:"motorrad" },
  { level:1, icon:"⛵", text:"Wie heißt dieses Fahrzeug?", correct:"boot" },
  { level:1, icon:"🚂", text:"Wie heißt dieses Fahrzeug?", correct:"zug" },
  { level:1, icon:"🚲", text:"Wie heißt dieses Fahrzeug?", correct:"fahrrad" },
  { level:1, icon:"✈️", text:"Wie heißt dieses Fahrzeug?", correct:"flugzeug" },
  { level:2, icon:"🚜", text:"Wie heißt dieses Fahrzeug?", correct:"traktor" },
  { level:2, icon:"🚒", text:"Wie heißt dieses Fahrzeug?", correct:"feuerwehrauto" },
  { level:2, icon:"🚑", text:"Wie heißt dieses Fahrzeug?", correct:"krankenwagen" },
  { level:2, icon:"🚌", text:"Wie heißt dieses Fahrzeug?", correct:"bus" },
  { level:2, icon:"🚕", text:"Wie heißt dieses Fahrzeug?", correct:"taxi" },
  { level:2, icon:"🚓", text:"Wie heißt dieses Fahrzeug?", correct:"polizeiauto" },
  { level:3, icon:"🚁", text:"Wie heißt dieses Fahrzeug?", correct:"hubschrauber" },
  { level:3, icon:"🚀", text:"Wie heißt dieses Fahrzeug?", correct:"rakete" },
  { level:3, icon:"🚛", text:"Wie heißt dieses Fahrzeug?", correct:"laster" },
  { level:3, icon:"🏗️", text:"Wie heißt dieses Fahrzeug?", correct:"bagger" },
];

/* ---------- Modul: Mal-Werkstatt (mit dem Finger nachzeichnen) ---------- */
/* Jeder Eintrag hat neben dem Anzeigenamen (label, Nominativ) auch eine fertige
   Akkusativ-Formulierung (akk), da "über" bei Bewegung den Akkusativ verlangt
   ("über den Kreis", "über das Dreieck", "über die Linie" — nicht "über die Kreis").
   Bei "Buchstabe" außerdem die schwache Deklination beachtet: den Buchstaben (nicht Buchstabe). */
const TRACE_ITEMS = [
  { level:1, glyph:"●", label:"Kreis",     akk:"den Kreis" },
  { level:1, glyph:"▲", label:"Dreieck",   akk:"das Dreieck" },
  { level:1, glyph:"■", label:"Quadrat",   akk:"das Quadrat" },
  { level:1, glyph:"—", label:"Linie",     akk:"die Linie" },
  { level:1, glyph:"∿", label:"Welle",     akk:"die Welle" },
  { level:1, glyph:"✚", label:"Kreuz",     akk:"das Kreuz" },
  { level:1, glyph:"•", label:"Punkt",     akk:"den Punkt" },
  { level:2, glyph:"★", label:"Stern",     akk:"den Stern" },
  { level:2, glyph:"♥", label:"Herz",      akk:"das Herz" },
  { level:2, glyph:"◆", label:"Raute",     akk:"die Raute" },
  { level:2, glyph:"▬", label:"Rechteck",  akk:"das Rechteck" },
  { level:2, glyph:"☾", label:"Mond",      akk:"den Mond" },
  { level:2, glyph:"O", label:"Buchstabe O", akk:"den Buchstaben O" },
  { level:2, glyph:"I", label:"Buchstabe I", akk:"den Buchstaben I" },
  { level:3, glyph:"1", label:"Zahl 1",    akk:"die Zahl 1" },
  { level:3, glyph:"2", label:"Zahl 2",    akk:"die Zahl 2" },
  { level:3, glyph:"3", label:"Zahl 3",    akk:"die Zahl 3" },
  { level:3, glyph:"⬟", label:"Fünfeck",   akk:"das Fünfeck" },
  { level:3, glyph:"S", label:"Buchstabe S", akk:"den Buchstaben S" },
  { level:3, glyph:"C", label:"Buchstabe C", akk:"den Buchstaben C" },
  { level:3, glyph:"U", label:"Buchstabe U", akk:"den Buchstaben U" },
  { level:4, glyph:"⬡", label:"Sechseck",  akk:"das Sechseck" },
  { level:4, glyph:"5", label:"Zahl 5",    akk:"die Zahl 5" },
  { level:4, glyph:"8", label:"Zahl 8",    akk:"die Zahl 8" },
  { level:4, glyph:"A", label:"Buchstabe A", akk:"den Buchstaben A" },
  { level:4, glyph:"L", label:"Buchstabe L", akk:"den Buchstaben L" },
  { level:4, glyph:"M", label:"Buchstabe M", akk:"den Buchstaben M" },
  { level:4, glyph:"E", label:"Buchstabe E", akk:"den Buchstaben E" },
];

/* ---------- Modul: Tier-Pflege (sanftes virtuelles Haustier) ----------
   Bewusst OHNE "Sterben" oder traurige/verängstigende Zustände: Werte sinken
   langsam mit der Zeit, aber nie unter ein noch-okay-Niveau. Füttern/Spielen
   macht das Haustier jederzeit wieder froh — nichts kann dauerhaft "kaputt" gehen. */
const PETS = [
  { id:"hund",  name:"Bello",    emoji:"🐶", body:"#D9A574", belly:"#F3E3C7", accent:"#B97E4B" },
  { id:"katze", name:"Mia",      emoji:"🐱", body:"#E7B25A", belly:"#FBEBC9", accent:"#C98A34" },
  { id:"hase",  name:"Flauschi", emoji:"🐰", body:"#F6ECE4", belly:"#FFFFFF", accent:"#F3B6C6" },
  { id:"panda", name:"Bao",      emoji:"🐼", body:"#FFFFFF", belly:"#FFFFFF", accent:"#2B2B33" },
  { id:"fuchs", name:"Finn",     emoji:"🦊", body:"#F0894D", belly:"#FFF7EF", accent:"#F0894D" },
];
const PET_STAT_FLOOR = 30; // Werte sinken nie unter dieses Niveau — kein "trauriges" Haustier

/* ---------- Minispiel: Frosch-Kreuzung ----------
   "Frogger", aber umgekehrt: Man steuert das Auto und muss den hüpfenden
   Fröschen ausweichen. Schwierigkeit (Spuren, Tempo) steigt mit der Altersstufe.
   Keine "Game Over"-Bestrafung — bei einem Treffer hüpft der Frosch einfach
   erschrocken, aber unverletzt weiter, das Spiel läuft normal weiter. */
const CARGAME_CONFIG = [
  { lanes:2, fallMs:6500, spawnMs:2800 }, // 2-3 Jahre: sehr langsam, wenig Spuren
  { lanes:2, fallMs:5200, spawnMs:2300 }, // 3-4 Jahre
  { lanes:3, fallMs:4200, spawnMs:1900 }, // 5-6 Jahre
  { lanes:3, fallMs:3300, spawnMs:1500 }, // 7-8 Jahre
  { lanes:4, fallMs:2600, spawnMs:1200 }, // 9-10 Jahre: schnell, viele Spuren
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
  { id:"first_color",   emoji:"🎨", label:"Farben-Profi" },
  { id:"all_colors",    emoji:"🚙", label:"Lack-Meister" },
  { id:"first_shape",   emoji:"🔺", label:"Formen-Entdecker" },
  { id:"all_shapes",    emoji:"🔷", label:"Formen-Meister" },
  { id:"first_count",   emoji:"🔢", label:"Zähl-Talent" },
  { id:"all_count",     emoji:"🏎️", label:"Zähl-Champion" },
  { id:"first_sound",   emoji:"🔊", label:"Tier-Kenner" },
  { id:"all_sounds",    emoji:"🦁", label:"Tier-Meister" },
  { id:"first_vehicle", emoji:"🚦", label:"Fahrzeug-Fan" },
  { id:"all_vehicles",  emoji:"🏁", label:"Fahrzeug-Profi" },
  { id:"first_trace",   emoji:"✏️", label:"Mal-Talent" },
  { id:"first_pet",     emoji:"🐾", label:"Tierfreund" },
  { id:"pet_caretaker", emoji:"💞", label:"Tier-Profi" },
  { id:"first_cargame", emoji:"🐸", label:"Vorsichtiger Fahrer" },
  { id:"all_cargame",   emoji:"🏆", label:"Frosch-Retter" },
];

const AVATARS = ["🚗","🚙","🚕","🏎️","🚓","🚑","🚒","🏍️","🛵","🚲","✈️","🚁","⛵","🚤","🚂","🚀","🚜","🚐","🛺","🚌"];
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
    name:"", age:"", avatar:"🚗", color:"peach",
    stars:0, stickers:[], lastVisit:null, streak:0, toddlerSet:"primary", toddlerRandomSet:[], autoRead:true, speechRate:0.92, reviewMode:"week",
    progress:{ feelingsDone:0, wordsGood:0, wordsTotal:0, calmSessions:0, storiesDone:[], stressGood:0, stressTotal:0, colorsGood:0, colorsTotal:0, shapesGood:0, shapesTotal:0, countGood:0, countTotal:0, soundsGood:0, soundsTotal:0, vehiclesGood:0, vehiclesTotal:0, tracesDone:0 },
    activityLog:{}, // { "YYYY-MM-DD": { stars:Zahl, sessions:Zahl } } - fürs Wochen-/Monatsrückblick
    pet:null, // { id, name, hunger, happiness, lastUpdate, careCount } - erst gesetzt, sobald ein Haustier gewählt wurde
    carGameBest:0, // beste Anzahl sicher vorbeigelassener Frösche in einer Runde
  };
}
let profile = loadProfile();
function persist(){ saveProfile(profile); applyTheme(); }
function applyTheme(){
  const c = THEME_COLORS.find(t=>t.id===profile.color) || THEME_COLORS[0];
  document.documentElement.style.setProperty("--accent-deep", c.hex);
  document.documentElement.style.setProperty("--accent", c.hex);
}
/* ---------- Aktivitäts-Log für den Eltern-Rückblick ---------- */
function dateKey(d){
  const date = d || new Date();
  return date.toISOString().slice(0,10); // "YYYY-MM-DD"
}
function logActivity(starsEarned){
  if(!profile.activityLog) profile.activityLog = {};
  const key = dateKey();
  if(!profile.activityLog[key]) profile.activityLog[key] = { stars:0, sessions:0 };
  profile.activityLog[key].stars += starsEarned;
  profile.activityLog[key].sessions += 1;
  // Alte Einträge begrenzen, damit der lokale Speicher nicht unbegrenzt wächst
  const keys = Object.keys(profile.activityLog);
  if(keys.length > 400){
    keys.sort().slice(0, keys.length-400).forEach(k=> delete profile.activityLog[k]);
  }
}
function addStars(n){
  profile.stars += n;
  if(n>0) logActivity(n);
  persist();
}
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
  pendingChoice = null;
  if(carGame){
    clearInterval(carGame.spawnTimer);
    clearInterval(carGame.checkTimer);
    carGame = null;
  }
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
    case "colors": setNavActive(""); renderColorGame(); break;
    case "shapes": setNavActive(""); renderShapeGame(); break;
    case "count": setNavActive(""); renderCountGame(); break;
    case "sounds": setNavActive(""); renderSoundGame(); break;
    case "vehicles": setNavActive(""); renderVehicleGame(); break;
    case "trace": setNavActive(""); renderTraceGame(); break;
    case "pet": setNavActive(""); renderPetGame(); break;
    case "cargame": setNavActive(""); renderCarGame(); break;
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
    ? ["feelings","words","stress","calm","stories","colors","shapes","count","sounds","vehicles","trace","cargame"]
    : ["feelings","calm","stories","colors","shapes","count","sounds","vehicles","trace","cargame"];
  navigate(choices[Math.floor(Math.random()*choices.length)]);
  unlockSticker("explorer");
}

/* ============================================================
   ONBOARDING
   ============================================================ */
let onboardStep = 0;
let draft = { name:"", age:"", avatar:"🚗", color:"peach" };

function renderOnboarding(){
  bottomNav.classList.add("hidden");
  topbar.classList.add("hidden");
  const steps = ["name","age","avatar","color","done"];
  const step = steps[onboardStep];
  let html = `<div style="padding-top:24px;">
    <div class="stage" style="margin-bottom:20px;">
      <div class="mascot-lg">🌱</div>
      <h1 style="font-size:1.4rem;">Willkommen auf der Leo's Lerninsel!</h1>
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
      <span class="field-label">Wähl dein Fahrzeug</span>
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
/* Alle Insel-Stationen an handgezeichneten, unregelmäßig verteilten Punkten
   (kein perfekter Kreis/Raster) — wirkt dadurch natürlicher, bleibt aber
   überlappungsfrei, egal welche Teilmenge gerade sichtbar ist. */
const STATIONS = [
  { key:"feelings", icon:"🚦", label:"Gefühls-Tankstelle",   bubble:"var(--mint)",       x:48, y:10, minLevel:1 },
  { key:"stress",   icon:"🏁", label:"Mutmach-Rennstrecke",  bubble:"var(--sun-deep)",   x:77, y:16, minLevel:2 },
  { key:"words",    icon:"🔧", label:"Wort-Werkstatt",       bubble:"var(--berry)",      x:91, y:40, minLevel:2 },
  { key:"sounds",   icon:"🔊", label:"Tier-Laute-Werkstatt", bubble:"var(--mint-deep)",  x:84, y:65, minLevel:1 },
  { key:"vehicles", icon:"🚙", label:"Fahrzeug-Kunde",       bubble:"var(--peach-deep)", x:64, y:83, minLevel:1 },
  { key:"calm",     icon:"🅿️", label:"Boxenstopp",           bubble:"var(--sky)",        x:38, y:91, minLevel:1 },
  { key:"colors",   icon:"🎨", label:"Lack-Werkstatt",       bubble:"var(--peach)",      x:17, y:79, minLevel:1 },
  { key:"count",    icon:"🔢", label:"Zähl-Werkstatt",       bubble:"var(--berry-deep)", x:8,  y:54, minLevel:1 },
  { key:"shapes",   icon:"🔺", label:"Formen-Werkstatt",     bubble:"var(--sky-deep)",   x:9,  y:31, minLevel:1 },
  { key:"stories",  icon:"🛣️", label:"Geschichten-Autobahn", bubble:"var(--sun)",        x:28, y:13, minLevel:1 },
  { key:"trace",    icon:"✏️", label:"Mal-Werkstatt",        bubble:"var(--sky)",        x:60, y:45, minLevel:1 },
  { key:"pet",      icon:"🐾", label:"Tier-Pflege",          bubble:"var(--mint-deep)",  x:35, y:60, minLevel:1 },
  { key:"cargame",  icon:"🐸", label:"Frosch-Kreuzung",      bubble:"var(--sun-deep)",   x:40, y:34, minLevel:1 },
];

/* Erzeugt einen sanft geschwungenen, gepunkteten Pfad, der GENAU die
   aktuell sichtbaren Stationen in ihrer Reihenfolge verbindet. */
function buildTrailPath(stations){
  if(stations.length < 2) return "";
  const pts = stations.map(s => ({ x:s.x*4, y:s.y*3 })); // % -> viewBox 400x300
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for(let i=1; i<pts.length-1; i++){
    const midX = (pts[i].x + pts[i+1].x)/2;
    const midY = (pts[i].y + pts[i+1].y)/2;
    d += ` Q ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)}`;
  }
  const last = pts[pts.length-1];
  d += ` L ${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
}

function islandSvg(trailD){
  return `
  <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <path d="M40,150 C40,58 140,18 200,18 C268,18 360,58 360,150 C360,246 264,282 200,282 C118,282 40,242 40,150 Z" fill="var(--mint)" opacity="0.9"/>
    <circle cx="352" cy="36" r="30" fill="var(--sun)" opacity="0.25"/>
    <circle cx="352" cy="36" r="20" fill="var(--sun)"/>
    <g opacity="0.85">
      <ellipse cx="56" cy="30" rx="20" ry="11" fill="#fff"/>
      <ellipse cx="74" cy="26" rx="14" ry="9" fill="#fff"/>
      <ellipse cx="40" cy="27" rx="12" ry="8" fill="#fff"/>
    </g>
    ${trailD ? `<path d="${trailD}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 15" opacity="0.6"/>` : ""}
  </svg>`;
}

const TODDLER_SET_PRIMARY = ["feelings","stories","colors","shapes"];

function toddlerPool(){
  return STATIONS.filter(s => s.minLevel === 1).map(s => s.key);
}
function pickRandomToddlerSet(){
  return shuffle(toddlerPool()).slice(0,4);
}

function renderHome(){
  bumpStreak();
  topbarSub.textContent = `Hallo, ${profile.name}!`;
  let stations = STATIONS.filter(s => s.minLevel <= currentLevel());
  if(currentLevel() === 1){
    let activeKeys;
    if(profile.toddlerSet === "random"){
      if(!profile.toddlerRandomSet || profile.toddlerRandomSet.length !== 4){
        profile.toddlerRandomSet = pickRandomToddlerSet();
        persist();
      }
      activeKeys = profile.toddlerRandomSet;
    } else {
      activeKeys = TODDLER_SET_PRIMARY;
    }
    stations = stations.filter(s => activeKeys.includes(s.key));
  }
  const trailD = buildTrailPath(stations);

  viewEl.innerHTML = `
    <div class="stage" style="margin:12px 0 14px;">
      <div class="mascot-lg" style="font-size:3rem;">${profile.avatar}</div>
      <h2 style="font-size:1.2rem;">Schön, dass du da bist, ${profile.name}!</h2>
      <p style="color:var(--ink-soft); font-weight:700; margin-top:4px;">⭐ ${profile.stars} Sterne gesammelt</p>
    </div>
    <p class="section-sub" style="text-align:center; margin-bottom:10px;">Tippe auf einen Ort auf der Insel!</p>
    <div class="island-map">
      <div class="island-bg">${islandSvg(trailD)}</div>
      ${stations.map((s,i)=>`
        <button class="station" style="left:${s.x}%; top:${s.y}%; animation-delay:${(i*0.3).toFixed(2)}s;" onclick="navigate('${s.key}')" aria-label="${s.label}">
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
  return 5; // immer 5 Aufgaben pro Runde, unabhängig von der Altersstufe
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
/* Verteilt Hinweisfarben: die richtige Antwort bekommt ihre echte Farbe,
   alle falschen Antworten bekommen eine andere (nicht ihre eigene) Farbe. */
function assignHintBorders(options, correctId){
  const correct = options.find(o=>o.id===correctId || o.value===correctId);
  const wrong = options.filter(o=>o!==correct);
  let hues = wrong.map(o=>o.hue);
  for(let t=0;t<20;t++){
    hues = shuffle(hues);
    if(wrong.every((o,i)=> hues[i]!==o.hue)) break;
  }
  const map = {};
  map[correct.id||correct.value] = correct.hue;
  wrong.forEach((o,i)=> map[o.id||o.value] = hues[i]);
  return map;
}

function showFeelingScene(){
  pendingChoice = null;
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
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${scene.text}</p>${speakerBtn()}</div>
      <p class="section-sub">Wie fühlt sich die Person wohl?</p>
      <div class="choice-grid" id="choices">
        ${options.map(o=>`
          <button class="choice" data-id="${o.id}" onclick="pickFeeling('${o.id}','${correct.id}')">
            <span class="emoji emoji-lg">${o.emoji}</span>${o.label}
          </button>`).join("")}
      </div>
      <div id="feelingFeedback"></div>
    </div>`;
  setSpeakText(scene.text);
}
function pickFeeling(pickedId, correctId){
  if(!needsConfirmTap('feelings', pickedId)){
    previewPick('choices', 'id', pickedId);
    speak(emotionById(pickedId).label);
    showConfirmHint('feelingFeedback');
    return;
  }
  const buttons = document.querySelectorAll("#choices .choice");
  buttons.forEach(b=> b.onclick=null);
  const isCorrect = pickedId === correctId;
  buttons.forEach(b=>{
    if(b.dataset.id===correctId) b.classList.add("correct");
    else if(b.dataset.id===pickedId) b.classList.add("wrong");
  });
  if(isCorrect) feelingCorrectCount++;
  speakResult(isCorrect, emotionById(correctId).label);
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
  pendingChoice = null;
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
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${scene.text}</p>${speakerBtn()}</div>
      <p class="section-sub">Was sagst du?</p>
      <div id="wordChoices" style="display:flex; flex-direction:column; gap:12px;">
        ${options.map(o=>`
          <button class="choice" style="text-align:left; align-items:flex-start;" data-idx="${o.idx}" onclick="pickWord(${o.idx}, ${o.good})">
            ${o.text}
          </button>`).join("")}
      </div>
      <div id="wordFeedback"></div>
    </div>`;
  setSpeakText(scene.text);
}
function pickWord(idx, good){
  if(!needsConfirmTap('words', idx)){
    previewPick('wordChoices', 'idx', idx);
    speak(wordRoundOrder[wordIdx].options[idx].text);
    showConfirmHint('wordFeedback');
    return;
  }
  const buttons = document.querySelectorAll("#wordChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  buttons.forEach(b=>{
    const isGoodBtn = wordRoundOrder[wordIdx].options[b.dataset.idx].good;
    if(isGoodBtn) b.classList.add("correct");
    else if(parseInt(b.dataset.idx)===idx) b.classList.add("wrong");
  });
  if(good) wordGoodCount++;
  speakResult(good, wordRoundOrder[wordIdx].options.find(o=>o.good).text);
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
  pendingChoice = null;
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
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${scene.text}</p>${speakerBtn()}</div>
      <p class="section-sub">Was hilft dir gerade am meisten?</p>
      <div id="stressChoices" style="display:flex; flex-direction:column; gap:12px;">
        ${options.map(o=>`
          <button class="choice" style="text-align:left; align-items:flex-start;" data-idx="${o.idx}" onclick="pickStress(${o.idx}, ${o.good})">
            ${o.text}
          </button>`).join("")}
      </div>
      <div id="stressFeedback"></div>
    </div>`;
  setSpeakText(scene.text);
}
function pickStress(idx, good){
  if(!needsConfirmTap('stress', idx)){
    previewPick('stressChoices', 'idx', idx);
    speak(stressRoundOrder[stressIdx].options[idx].text);
    showConfirmHint('stressFeedback');
    return;
  }
  const buttons = document.querySelectorAll("#stressChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  buttons.forEach(b=>{
    const isGoodBtn = stressRoundOrder[stressIdx].options[b.dataset.idx].good;
    if(isGoodBtn) b.classList.add("correct");
    else if(parseInt(b.dataset.idx)===idx) b.classList.add("wrong");
  });
  if(good) stressGoodCount++;
  speakResult(good, stressRoundOrder[stressIdx].options.find(o=>o.good).text);
  document.getElementById("stressFeedback").innerHTML = `
    <div class="feedback-banner ${good?'good':'gentle'}">
      ${good ? "💪 Guter Weg, damit umzugehen!" : "Es gibt einen Weg, der dir noch besser hilft — schau ihn dir an!"}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="stressIdx++; showStressScene();">Weiter</button>`;
}

/* ============================================================
   MODUL: LACK-WERKSTATT (Farben erkennen mit Bild + Farbhinweis)
   ============================================================ */
let colorIdx=0, colorGoodCount=0, colorRoundOrder=[];
function renderColorGame(){
  colorIdx=0; colorGoodCount=0;
  const pool = byLevel(COLOR_ITEMS);
  colorRoundOrder = shuffle(pool).slice(0, roundCountForLevel());
  showColorScene();
}
function showColorScene(){
  pendingChoice = null;
  if(colorIdx >= colorRoundOrder.length){
    profile.progress.colorsGood += colorGoodCount;
    profile.progress.colorsTotal += colorRoundOrder.length;
    unlockSticker("first_color");
    if(colorGoodCount===colorRoundOrder.length) unlockSticker("all_colors");
    addStars(colorGoodCount);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Toll lackiert!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${colorGoodCount} von ${colorRoundOrder.length} Farben richtig erkannt.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderColorGame()">Nochmal, neue Dinge</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const scene = colorRoundOrder[colorIdx];
  const correctId = scene.correct;
  const otherIds = Object.keys(COLOR_NAMES).filter(id=>id!==correctId);
  const distractorIds = shuffle(otherIds).slice(0, optionCountForLevel()-1);
  const optionIds = shuffle([correctId, ...distractorIds]);
  const options = optionIds.map(id=>({ value:id, hue:COLOR_NAMES[id].hue, label:COLOR_NAMES[id].label }));
  const hints = assignHintBorders(options, correctId);
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(colorIdx/colorRoundOrder.length)*100}%"></div></div>
    <div class="card" style="text-align:center;">
      <div style="font-size:3.4rem; margin-bottom:6px;">${scene.icon}</div>
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${scene.text}</p>${speakerBtn()}</div>
      <p class="section-sub">Ein Farbrand verrät einen Tipp! 🎨</p>
      <div class="choice-grid" id="colorChoices">
        ${options.map(o=>`
          <button class="choice" data-id="${o.value}" style="border-color:${hints[o.value]};" onclick="pickColor('${o.value}','${correctId}')">
            <span class="emoji" style="width:34px; height:34px; border-radius:50%; background:${o.hue}; display:inline-block;"></span>${o.label}
          </button>`).join("")}
      </div>
      <div id="colorFeedback"></div>
    </div>`;
  setSpeakText(scene.text);
}
function pickColor(pickedId, correctId){
  if(!needsConfirmTap('colors', pickedId)){
    previewPick('colorChoices', 'id', pickedId);
    speak(COLOR_NAMES[pickedId].label);
    showConfirmHint('colorFeedback');
    return;
  }
  const buttons = document.querySelectorAll("#colorChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  const isCorrect = pickedId === correctId;
  buttons.forEach(b=>{
    b.style.borderColor = "";
    if(b.dataset.id===correctId) b.classList.add("correct");
    else if(b.dataset.id===pickedId) b.classList.add("wrong");
  });
  if(isCorrect) colorGoodCount++;
  speakResult(isCorrect, COLOR_NAMES[correctId].label);
  document.getElementById("colorFeedback").innerHTML = `
    <div class="feedback-banner ${isCorrect?'good':'gentle'}">
      ${isCorrect ? "🎉 Genau richtig!" : `Das ist eigentlich „${COLOR_NAMES[correctId].label}“.`}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="colorIdx++; showColorScene();">Weiter</button>`;
}

/* ============================================================
   MODUL: FORMEN-WERKSTATT (Formen erkennen)
   ============================================================ */
let shapeIdx=0, shapeGoodCount=0, shapeRoundOrder=[];
function renderShapeGame(){
  shapeIdx=0; shapeGoodCount=0;
  const pool = byLevel(SHAPE_ITEMS);
  shapeRoundOrder = shuffle(pool).slice(0, roundCountForLevel());
  showShapeScene();
}
function showShapeScene(){
  pendingChoice = null;
  if(shapeIdx >= shapeRoundOrder.length){
    profile.progress.shapesGood += shapeGoodCount;
    profile.progress.shapesTotal += shapeRoundOrder.length;
    unlockSticker("first_shape");
    if(shapeGoodCount===shapeRoundOrder.length) unlockSticker("all_shapes");
    addStars(shapeGoodCount);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Klasse erkannt!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${shapeGoodCount} von ${shapeRoundOrder.length} Formen richtig erkannt.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderShapeGame()">Nochmal, neue Formen</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const scene = shapeRoundOrder[shapeIdx];
  const correctId = scene.correct;
  const otherIds = Object.keys(SHAPE_NAMES).filter(id=>id!==correctId);
  const distractorIds = shuffle(otherIds).slice(0, optionCountForLevel()-1);
  const optionIds = shuffle([correctId, ...distractorIds]);
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(shapeIdx/shapeRoundOrder.length)*100}%"></div></div>
    <div class="card" style="text-align:center;">
      <div style="font-size:3.4rem; margin-bottom:6px;">${scene.icon}</div>
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${scene.text}</p>${speakerBtn()}</div>
      <div class="choice-grid" id="shapeChoices">
        ${optionIds.map(id=>`
          <button class="choice" data-id="${id}" onclick="pickShape('${id}','${correctId}')">
            <span class="emoji">${SHAPE_NAMES[id].glyph}</span>${SHAPE_NAMES[id].label}
          </button>`).join("")}
      </div>
      <div id="shapeFeedback"></div>
    </div>`;
  setSpeakText(scene.text);
}
function pickShape(pickedId, correctId){
  if(!needsConfirmTap('shapes', pickedId)){
    previewPick('shapeChoices', 'id', pickedId);
    speak(SHAPE_NAMES[pickedId].label);
    showConfirmHint('shapeFeedback');
    return;
  }
  const buttons = document.querySelectorAll("#shapeChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  const isCorrect = pickedId === correctId;
  buttons.forEach(b=>{
    if(b.dataset.id===correctId) b.classList.add("correct");
    else if(b.dataset.id===pickedId) b.classList.add("wrong");
  });
  if(isCorrect) shapeGoodCount++;
  speakResult(isCorrect, SHAPE_NAMES[correctId].label);
  document.getElementById("shapeFeedback").innerHTML = `
    <div class="feedback-banner ${isCorrect?'good':'gentle'}">
      ${isCorrect ? "🎉 Genau richtig!" : `Das ist eigentlich ein „${SHAPE_NAMES[correctId].label}“.`}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="shapeIdx++; showShapeScene();">Weiter</button>`;
}

/* ============================================================
   MODUL: ZÄHL-WERKSTATT (Zählen üben)
   ============================================================ */
let countIdx=0, countGoodCount=0, countRoundOrder=[];
function renderCountGame(){
  countIdx=0; countGoodCount=0;
  const pool = byLevel(COUNT_ITEMS);
  countRoundOrder = shuffle(pool).slice(0, roundCountForLevel());
  showCountScene();
}
function showCountScene(){
  pendingChoice = null;
  if(countIdx >= countRoundOrder.length){
    profile.progress.countGood += countGoodCount;
    profile.progress.countTotal += countRoundOrder.length;
    unlockSticker("first_count");
    if(countGoodCount===countRoundOrder.length) unlockSticker("all_count");
    addStars(countGoodCount);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Prima gezählt!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${countGoodCount} von ${countRoundOrder.length} Mal richtig gezählt.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderCountGame()">Nochmal, neue Zahlen</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const scene = countRoundOrder[countIdx];
  const correct = scene.count;
  const pool = [];
  for(let n=Math.max(1,correct-3); n<=correct+3; n++){ if(n!==correct) pool.push(n); }
  const distractors = shuffle(pool).slice(0, optionCountForLevel()-1);
  const options = shuffle([correct, ...distractors]);
  const row = Array(correct).fill(scene.emoji).join(" ");
  const questionText = `Wie viele ${scene.noun} siehst du?`;
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(countIdx/countRoundOrder.length)*100}%"></div></div>
    <div class="card" style="text-align:center;">
      <div style="font-size:2.4rem; line-height:1.5; margin-bottom:10px; word-spacing:6px;">${row}</div>
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${questionText}</p>${speakerBtn()}</div>
      <div class="choice-grid" id="countChoices">
        ${options.map(n=>`
          <button class="choice" data-id="${n}" onclick="pickCount(${n},${correct})">
            <span class="emoji" style="font-size:1.8rem;">${n}</span>
          </button>`).join("")}
      </div>
      <div id="countFeedback"></div>
    </div>`;
  setSpeakText(questionText);
}
function pickCount(pickedN, correctN){
  if(!needsConfirmTap('count', pickedN)){
    previewPick('countChoices', 'id', pickedN);
    speak(String(pickedN));
    showConfirmHint('countFeedback');
    return;
  }
  const buttons = document.querySelectorAll("#countChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  const isCorrect = pickedN === correctN;
  buttons.forEach(b=>{
    if(parseInt(b.dataset.id)===correctN) b.classList.add("correct");
    else if(parseInt(b.dataset.id)===pickedN) b.classList.add("wrong");
  });
  if(isCorrect) countGoodCount++;
  speakResult(isCorrect, String(correctN));
  document.getElementById("countFeedback").innerHTML = `
    <div class="feedback-banner ${isCorrect?'good':'gentle'}">
      ${isCorrect ? "🎉 Genau richtig gezählt!" : `Es waren genau ${correctN}.`}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="countIdx++; showCountScene();">Weiter</button>`;
}

/* ============================================================
   MODUL: TIER-LAUTE-WERKSTATT (Tierlaute zuordnen)
   ============================================================ */
let soundIdx=0, soundGoodCount=0, soundRoundOrder=[];
function renderSoundGame(){
  soundIdx=0; soundGoodCount=0;
  const pool = byLevel(SOUND_ITEMS);
  soundRoundOrder = shuffle(pool).slice(0, roundCountForLevel());
  showSoundScene();
}
function showSoundScene(){
  pendingChoice = null;
  if(soundIdx >= soundRoundOrder.length){
    profile.progress.soundsGood += soundGoodCount;
    profile.progress.soundsTotal += soundRoundOrder.length;
    unlockSticker("first_sound");
    if(soundGoodCount===soundRoundOrder.length) unlockSticker("all_sounds");
    addStars(soundGoodCount);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Gut gehört!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${soundGoodCount} von ${soundRoundOrder.length} Tierlauten richtig erkannt.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderSoundGame()">Nochmal, neue Laute</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const scene = soundRoundOrder[soundIdx];
  const correctId = scene.correct;
  const otherIds = Object.keys(ANIMAL_SOUNDS).filter(id=>id!==correctId);
  const distractorIds = shuffle(otherIds).slice(0, optionCountForLevel()-1);
  const optionIds = shuffle([correctId, ...distractorIds]);
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(soundIdx/soundRoundOrder.length)*100}%"></div></div>
    <div class="card" style="text-align:center;">
      <div style="font-size:2.6rem; margin-bottom:6px;">🔊</div>
      <div class="title-row"><p class="section-title" style="font-size:1.3rem;">${scene.sound}</p>${speakerBtn()}</div>
      <p class="section-sub">Wer sagt das?</p>
      <div class="choice-grid" id="soundChoices">
        ${optionIds.map(id=>`
          <button class="choice" data-id="${id}" onclick="pickSound('${id}','${correctId}')">
            <span class="emoji">${ANIMAL_SOUNDS[id].emoji}</span>${ANIMAL_SOUNDS[id].label}
          </button>`).join("")}
      </div>
      <div id="soundFeedback"></div>
    </div>`;
  setSpeakText(scene.sound.replace(/[„“]/g,""));
}
function pickSound(pickedId, correctId){
  if(!needsConfirmTap('sounds', pickedId)){
    previewPick('soundChoices', 'id', pickedId);
    speak(ANIMAL_SOUNDS[pickedId].label);
    showConfirmHint('soundFeedback');
    return;
  }
  const buttons = document.querySelectorAll("#soundChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  const isCorrect = pickedId === correctId;
  buttons.forEach(b=>{
    if(b.dataset.id===correctId) b.classList.add("correct");
    else if(b.dataset.id===pickedId) b.classList.add("wrong");
  });
  if(isCorrect) soundGoodCount++;
  speakResult(isCorrect, ANIMAL_SOUNDS[correctId].label);
  document.getElementById("soundFeedback").innerHTML = `
    <div class="feedback-banner ${isCorrect?'good':'gentle'}">
      ${isCorrect ? "🎉 Genau richtig!" : `Das war „${ANIMAL_SOUNDS[correctId].label}“.`}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="soundIdx++; showSoundScene();">Weiter</button>`;
}

/* ============================================================
   MODUL: FAHRZEUG-KUNDE (Fahrzeuge erkennen)
   ============================================================ */
let vehicleIdx=0, vehicleGoodCount=0, vehicleRoundOrder=[];
function renderVehicleGame(){
  vehicleIdx=0; vehicleGoodCount=0;
  const pool = byLevel(VEHICLE_ITEMS);
  vehicleRoundOrder = shuffle(pool).slice(0, roundCountForLevel());
  showVehicleScene();
}
function showVehicleScene(){
  pendingChoice = null;
  if(vehicleIdx >= vehicleRoundOrder.length){
    profile.progress.vehiclesGood += vehicleGoodCount;
    profile.progress.vehiclesTotal += vehicleRoundOrder.length;
    unlockSticker("first_vehicle");
    if(vehicleGoodCount===vehicleRoundOrder.length) unlockSticker("all_vehicles");
    addStars(vehicleGoodCount);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Fahrzeug-Kenner!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${vehicleGoodCount} von ${vehicleRoundOrder.length} Fahrzeugen richtig erkannt.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderVehicleGame()">Nochmal, neue Fahrzeuge</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const scene = vehicleRoundOrder[vehicleIdx];
  const correctId = scene.correct;
  const otherIds = Object.keys(VEHICLE_NAMES).filter(id=>id!==correctId);
  const distractorIds = shuffle(otherIds).slice(0, optionCountForLevel()-1);
  const optionIds = shuffle([correctId, ...distractorIds]);
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(vehicleIdx/vehicleRoundOrder.length)*100}%"></div></div>
    <div class="card" style="text-align:center;">
      <div style="font-size:3.4rem; margin-bottom:6px;">${scene.icon}</div>
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${scene.text}</p>${speakerBtn()}</div>
      <div class="choice-grid" id="vehicleChoices">
        ${optionIds.map(id=>`
          <button class="choice" data-id="${id}" onclick="pickVehicle('${id}','${correctId}')">
            <span class="emoji">${VEHICLE_NAMES[id].emoji}</span>${VEHICLE_NAMES[id].label}
          </button>`).join("")}
      </div>
      <div id="vehicleFeedback"></div>
    </div>`;
  setSpeakText(scene.text);
}
function pickVehicle(pickedId, correctId){
  if(!needsConfirmTap('vehicles', pickedId)){
    previewPick('vehicleChoices', 'id', pickedId);
    speak(VEHICLE_NAMES[pickedId].label);
    showConfirmHint('vehicleFeedback');
    return;
  }
  const buttons = document.querySelectorAll("#vehicleChoices .choice");
  buttons.forEach(b=> b.onclick=null);
  const isCorrect = pickedId === correctId;
  buttons.forEach(b=>{
    if(b.dataset.id===correctId) b.classList.add("correct");
    else if(b.dataset.id===pickedId) b.classList.add("wrong");
  });
  if(isCorrect) vehicleGoodCount++;
  speakResult(isCorrect, VEHICLE_NAMES[correctId].label);
  document.getElementById("vehicleFeedback").innerHTML = `
    <div class="feedback-banner ${isCorrect?'good':'gentle'}">
      ${isCorrect ? "🎉 Genau richtig!" : `Das ist ein „${VEHICLE_NAMES[correctId].label}“.`}
    </div>
    <button class="btn block" style="margin-top:14px;" onclick="vehicleIdx++; showVehicleScene();">Weiter</button>`;
}

/* ============================================================
   MODUL: MAL-WERKSTATT (mit dem Finger nachzeichnen)
   ============================================================ */
let traceIdx=0, traceRoundOrder=[], traceCtx=null, traceDrawColor="";
function renderTraceGame(){
  traceIdx=0;
  const pool = byLevel(TRACE_ITEMS);
  traceRoundOrder = shuffle(pool).slice(0, Math.min(roundCountForLevel(), pool.length));
  showTraceScene();
}
function showTraceScene(){
  if(traceIdx >= traceRoundOrder.length){
    profile.progress.tracesDone += traceRoundOrder.length;
    unlockSticker("first_trace");
    addStars(traceRoundOrder.length);
    viewEl.innerHTML = `
      ${backBtn("home")}
      <div class="stage">
        <div class="mascot-lg">${profile.avatar}</div>
        <h2>Super gemalt!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du hast ${traceRoundOrder.length} Formen nachgezeichnet.</p>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button class="btn secondary" onclick="renderTraceGame()">Nochmal, neue Formen</button>
          <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
        </div>
      </div>`;
    return;
  }
  const item = traceRoundOrder[traceIdx];
  const prompt = `Fahr mit dem Finger über ${item.akk}`;
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="progress-track"><div class="progress-fill" style="width:${(traceIdx/traceRoundOrder.length)*100}%"></div></div>
    <div class="card" style="text-align:center;">
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${prompt}</p>${speakerBtn()}</div>
      <div class="trace-wrap">
        <canvas id="traceCanvas" class="trace-canvas"></canvas>
      </div>
      <div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap;">
        <button class="btn secondary" onclick="clearTraceCanvas()">🧽 Löschen</button>
        <button class="btn" onclick="finishTrace()">✅ Fertig</button>
      </div>
    </div>`;
  setSpeakText(prompt);
  setupTraceCanvas(item);
}
function drawTraceGuide(item, size){
  const ctx = traceCtx;
  if(!ctx) return;
  ctx.clearRect(0,0,size,size);
  ctx.fillStyle = "rgba(74,67,88,0.18)";
  ctx.font = `${Math.floor(size*0.6)}px 'Baloo 2', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.glyph, size/2, size/2 + size*0.03);
}
function setupTraceCanvas(item){
  const canvas = document.getElementById("traceCanvas");
  if(!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const size = canvas.clientWidth || 300;
  canvas.width = size*ratio;
  canvas.height = size*ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  traceCtx = ctx;
  drawTraceGuide(item, size);
  const c = THEME_COLORS.find(t=>t.id===profile.color) || THEME_COLORS[0];
  traceDrawColor = c.hex;

  let drawing=false, last=null;
  function pos(e){
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX-rect.left, y: e.clientY-rect.top };
  }
  function start(e){ drawing=true; last=pos(e); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); }
  function move(e){
    if(!drawing) return;
    const p = pos(e);
    ctx.strokeStyle = traceDrawColor;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  }
  function end(){ drawing=false; last=null; }

  canvas.onpointerdown = start;
  canvas.onpointermove = move;
  canvas.onpointerup = end;
  canvas.onpointerleave = end;
  canvas.onpointercancel = end;
}
function clearTraceCanvas(){
  const item = traceRoundOrder[traceIdx];
  const canvas = document.getElementById("traceCanvas");
  if(!canvas) return;
  drawTraceGuide(item, canvas.clientWidth);
}
function finishTrace(){
  traceIdx++;
  showTraceScene();
}

/* ============================================================
   MODUL: TIER-PFLEGE (sanftes virtuelles Haustier)
   ============================================================ */
/* Baut ein kleines animierbares SVG-Wesen (statt eines starren Emojis).
   Körper/Augen/Mund sind bei allen Tieren gleich aufgebaut (fürs Blinzeln, Kauen,
   Hüpfen per CSS), nur Ohren/Extras unterscheiden sich je nach Tierart. */
function petSVG(petId){
  const def = PETS.find(p=>p.id===petId) || PETS[0];
  let ears = "", extras = "", overlay = "";
  if(petId === "hund"){
    ears = `<ellipse cx="24" cy="52" rx="12" ry="20" fill="${def.accent}" transform="rotate(-25 24 52)"/>
            <ellipse cx="96" cy="52" rx="12" ry="20" fill="${def.accent}" transform="rotate(25 96 52)"/>`;
    extras = `<ellipse class="pet-tail" cx="102" cy="86" rx="8" ry="14" fill="${def.accent}" transform="rotate(35 102 86)"/>`;
  } else if(petId === "katze"){
    ears = `<polygon points="30,38 42,18 50,42" fill="${def.body}"/>
            <polygon points="90,38 78,18 70,42" fill="${def.body}"/>
            <polygon points="33,38 40,26 45,40" fill="${def.accent}"/>
            <polygon points="87,38 80,26 75,40" fill="${def.accent}"/>`;
    extras = `<g class="pet-whiskers" stroke="${def.accent}" stroke-width="1.6" stroke-linecap="round">
            <line x1="18" y1="70" x2="38" y2="67"/><line x1="18" y1="76" x2="38" y2="76"/>
            <line x1="102" y1="70" x2="82" y2="67"/><line x1="102" y1="76" x2="82" y2="76"/>
            </g>
            <ellipse class="pet-tail" cx="100" cy="90" rx="7" ry="16" fill="${def.body}" transform="rotate(25 100 90)"/>`;
  } else if(petId === "hase"){
    ears = `<ellipse cx="46" cy="26" rx="8" ry="22" fill="${def.body}"/>
            <ellipse cx="74" cy="26" rx="8" ry="22" fill="${def.body}"/>
            <ellipse cx="46" cy="27" rx="4" ry="15" fill="${def.accent}"/>
            <ellipse cx="74" cy="27" rx="4" ry="15" fill="${def.accent}"/>`;
    extras = `<circle class="pet-tail" cx="104" cy="92" r="7" fill="#fff" stroke="#eee"/>`;
  } else if(petId === "panda"){
    ears = `<circle cx="28" cy="30" r="14" fill="${def.accent}"/>
            <circle cx="92" cy="30" r="14" fill="${def.accent}"/>`;
    overlay = `<ellipse cx="46" cy="58" rx="11" ry="14" fill="${def.accent}" opacity="0.85"/>
            <ellipse cx="74" cy="58" rx="11" ry="14" fill="${def.accent}" opacity="0.85"/>
            <ellipse cx="48" cy="58" rx="6" ry="8" fill="#fff"/>
            <ellipse cx="72" cy="58" rx="6" ry="8" fill="#fff"/>`;
  } else { // fuchs
    ears = `<polygon points="26,40 40,10 52,42" fill="${def.body}"/>
            <polygon points="94,40 80,10 68,42" fill="${def.body}"/>
            <polygon points="30,38 39,20 45,40" fill="#fff"/>
            <polygon points="90,38 81,20 75,40" fill="#fff"/>`;
    extras = `<path class="pet-tail" d="M100,88 Q118,82 112,62 Q109,78 96,82 Z" fill="${def.body}"/>
            <path d="M107,68 Q114,70 110,77 Z" fill="#fff"/>`;
  }
  return `
  <svg viewBox="0 0 120 120" class="pet-svg" aria-hidden="true">
    <g class="pet-body-group">
      ${extras}
      ${ears}
      <ellipse cx="60" cy="70" rx="40" ry="34" fill="${def.body}"/>
      <ellipse cx="60" cy="82" rx="20" ry="15" fill="${def.belly}"/>
      ${overlay}
      <ellipse cx="42" cy="70" rx="6" ry="5" fill="#FFB3A7" opacity="0.55"/>
      <ellipse cx="78" cy="70" rx="6" ry="5" fill="#FFB3A7" opacity="0.55"/>
      <ellipse class="pet-eye" cx="48" cy="58" rx="5" ry="7" fill="#332B27"/>
      <ellipse class="pet-eye" cx="72" cy="58" rx="5" ry="7" fill="#332B27"/>
      <path class="pet-mouth-smile" d="M52,78 Q60,84 68,78" stroke="#332B27" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse class="pet-mouth-open" cx="60" cy="79" rx="6" ry="4" fill="#7A4B3A"/>
    </g>
  </svg>`;
}

function renderPetGame(){
  if(!profile.pet){ renderPetSelect(); return; }
  renderPetHome();
}
function renderPetSelect(){
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="stage" style="margin-bottom:16px;">
      <h2>Wähl dein Haustier</h2>
      <p style="color:var(--ink-soft); font-weight:600; margin-top:6px;">Du kannst es füttern, mit ihm spielen — und es bleibt immer bei dir.</p>
    </div>
    <div class="pet-pick-grid">
      ${PETS.map(p=>`
        <button class="pet-pick" onclick="choosePet('${p.id}')">
          <span class="pet-pick-preview pet-stage idle">${petSVG(p.id)}</span>
          <span class="pet-pick-name">${p.name}</span>
        </button>`).join("")}
    </div>`;
}
function choosePet(id){
  const p = PETS.find(x=>x.id===id);
  if(!p) return;
  profile.pet = { id:p.id, name:p.name, hunger:80, happiness:80, lastUpdate:Date.now(), careCount:0 };
  unlockSticker("first_pet");
  persist();
  renderPetHome();
}
function updatePetDecay(){
  if(!profile.pet) return;
  const now = Date.now();
  const elapsedMin = (now - (profile.pet.lastUpdate || now)) / 60000;
  const decay = Math.floor(elapsedMin / 30); // 1 Punkt alle 30 Minuten
  if(decay > 0){
    profile.pet.hunger = Math.max(PET_STAT_FLOOR, profile.pet.hunger - decay);
    profile.pet.happiness = Math.max(PET_STAT_FLOOR, profile.pet.happiness - decay);
    profile.pet.lastUpdate = now;
    persist();
  }
}
function petMood(pet){
  const avg = (pet.hunger + pet.happiness) / 2;
  if(avg >= 75) return "ist super drauf!";
  if(avg >= 50) return "fühlt sich wohl.";
  return "freut sich über ein bisschen Aufmerksamkeit.";
}
function renderPetHome(){
  updatePetDecay();
  const pet = profile.pet;
  const moodText = `${pet.name} ${petMood(pet)}`;
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="card stage">
      <div class="tama-shell">
        <div class="tama-screen">
          <div class="pet-stage idle" id="petStage" style="position:relative;">${petSVG(pet.id)}</div>
        </div>
      </div>
      <div class="title-row"><h2>${pet.name}</h2>${speakerBtn()}</div>
      <p id="petMoodText" style="color:var(--ink-soft); font-weight:700; margin-top:4px;">${moodText}</p>

      <div style="text-align:left; margin-top:22px;">
        <span class="field-label" style="margin-bottom:4px;">🍖 Hunger</span>
        <div class="progress-track"><div class="progress-fill" id="hungerBar" style="width:${pet.hunger}%; background:var(--peach-deep);"></div></div>
        <span class="field-label" style="margin:14px 0 4px;">🎾 Freude</span>
        <div class="progress-track"><div class="progress-fill" id="happinessBar" style="width:${pet.happiness}%;"></div></div>
      </div>

      <div style="display:flex; gap:12px; justify-content:center; margin-top:22px; flex-wrap:wrap;">
        <button class="btn" onclick="feedPet()">🍖 Füttern</button>
        <button class="btn" onclick="playPet()">🎾 Spielen</button>
      </div>
      <button class="btn secondary" style="margin-top:16px; font-size:0.8rem; padding:8px 16px;" onclick="changePet()">Anderes Haustier wählen</button>
    </div>`;
  setSpeakText(moodText);
}
function petCareFeedback(text){
  const el = document.getElementById("petMoodText");
  if(el) el.textContent = text;
  speak(text);
}
let petAnimTimer = null;
function triggerPetAnim(state, ms){
  const stage = document.getElementById("petStage");
  if(!stage) return;
  stage.classList.remove("idle","eating","playing");
  stage.classList.add(state);
  clearTimeout(petAnimTimer);
  petAnimTimer = setTimeout(()=>{
    stage.classList.remove(state);
    stage.classList.add("idle");
  }, ms);
}
function spawnPetParticles(emoji, count){
  const stage = document.getElementById("petStage");
  if(!stage) return;
  for(let i=0;i<count;i++){
    const span = document.createElement("span");
    span.className = "pet-particle";
    span.textContent = emoji;
    span.style.left = (36 + Math.random()*28) + "%";
    span.style.bottom = "38%";
    span.style.animationDelay = (i*0.12) + "s";
    stage.appendChild(span);
    setTimeout(()=> span.remove(), 1700 + i*120);
  }
}
function feedPet(){
  const pet = profile.pet;
  if(!pet) return;
  pet.hunger = Math.min(100, pet.hunger + 25);
  pet.careCount = (pet.careCount||0) + 1;
  if(pet.careCount === 1 || pet.careCount % 10 === 0) addStars(1);
  if(pet.careCount >= 20) unlockSticker("pet_caretaker");
  persist();
  const bar = document.getElementById("hungerBar");
  if(bar) bar.style.width = pet.hunger + "%";
  triggerPetAnim("eating", 1700);
  spawnPetParticles("🍖", 1);
  petCareFeedback(`Lecker! ${pet.name} hat gegessen und freut sich.`);
}
function playPet(){
  const pet = profile.pet;
  if(!pet) return;
  pet.happiness = Math.min(100, pet.happiness + 25);
  pet.careCount = (pet.careCount||0) + 1;
  if(pet.careCount === 1 || pet.careCount % 10 === 0) addStars(1);
  if(pet.careCount >= 20) unlockSticker("pet_caretaker");
  persist();
  const bar = document.getElementById("happinessBar");
  if(bar) bar.style.width = pet.happiness + "%";
  triggerPetAnim("playing", 1700);
  spawnPetParticles("✨", 3);
  petCareFeedback(`${pet.name} hatte viel Spaß beim Spielen!`);
}
function changePet(){
  if(confirm("Wirklich ein anderes Haustier wählen? Dein aktuelles Haustier bleibt in Erinnerung, aber du fängst mit einem neuen frisch an.")){
    profile.pet = null;
    persist();
    renderPetSelect();
  }
}

/* ============================================================
   MINISPIEL: FROSCH-KREUZUNG
   ============================================================ */
let carGame = null; // { lanes, carLane, fallMs, spawnMs, target, spawned, resolved, dodged, spawnTimer, checkTimer, active }

function renderCarGame(){
  const cfg = CARGAME_CONFIG[currentLevel()-1];
  const laneXs = Array.from({length:cfg.lanes}, (_,i) => (100/cfg.lanes) * (i+0.5));
  carGame = {
    lanes: cfg.lanes, laneXs, carLane: Math.floor(cfg.lanes/2),
    fallMs: cfg.fallMs, spawnMs: cfg.spawnMs,
    target: 5, spawned: 0, resolved: 0, dodged: 0,
    spawnTimer: null, checkTimer: null, active: false,
  };
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="stage" style="margin-bottom:10px;">
      <h2>🐸 Frosch-Kreuzung</h2>
      <p style="color:var(--ink-soft); font-weight:600; margin-top:4px;">Weich den hüpfenden Fröschen aus! Mit den Pfeilen die Spur wechseln.</p>
    </div>
    <div class="car-game-wrap">
      <div class="car-game-road" id="carGameRoad" style="--lanes:${cfg.lanes};">
        ${laneXs.slice(1).map(x=>`<div class="car-game-laneline" style="left:${(x - (50/cfg.lanes))}%;"></div>`).join("")}
        <div class="car-game-car" id="carGameCar" style="left:${laneXs[carGame.carLane]}%;">🚗</div>
      </div>
    </div>
    <p id="carGameStatus" style="text-align:center; font-weight:800; color:var(--ink-soft); margin-top:10px;">0 / ${carGame.target} Frösche sicher vorbeigelassen</p>
    <div class="car-game-controls">
      <button class="btn secondary" id="carGameLeftBtn" onclick="moveCarGame(-1)" aria-label="Nach links">⬅️</button>
      <button class="btn" id="carGameStartBtn" onclick="startCarGame()">Los geht's</button>
      <button class="btn secondary" id="carGameRightBtn" onclick="moveCarGame(1)" aria-label="Nach rechts">➡️</button>
    </div>`;
  setSpeakText("Weich den hüpfenden Fröschen aus! Mit den Pfeilen wechselst du die Spur.");
}

function moveCarGame(dir){
  if(!carGame) return;
  carGame.carLane = Math.max(0, Math.min(carGame.lanes-1, carGame.carLane + dir));
  const car = document.getElementById("carGameCar");
  if(car) car.style.left = carGame.laneXs[carGame.carLane] + "%";
}

function startCarGame(){
  if(!carGame || carGame.active) return;
  carGame.active = true;
  const startBtn = document.getElementById("carGameStartBtn");
  if(startBtn) startBtn.classList.add("hidden");
  spawnFrog();
  carGame.spawnTimer = setInterval(spawnFrog, carGame.spawnMs);
  carGame.checkTimer = setInterval(checkCarGameCollisions, 100);
}

function spawnFrog(){
  if(!carGame || carGame.spawned >= carGame.target) return;
  carGame.spawned++;
  const lane = Math.floor(Math.random()*carGame.lanes);
  const road = document.getElementById("carGameRoad");
  if(!road) return;
  const frog = document.createElement("div");
  frog.className = "car-game-frog";
  frog.textContent = "🐸";
  frog.style.left = carGame.laneXs[lane] + "%";
  frog.style.animationDuration = carGame.fallMs + "ms";
  frog.dataset.lane = lane;
  frog.dataset.hit = "0";
  road.appendChild(frog);
  frog.addEventListener("animationend", ()=> resolveFrog(frog, true));
  if(carGame.spawned >= carGame.target){
    clearInterval(carGame.spawnTimer);
  }
}

function checkCarGameCollisions(){
  if(!carGame) return;
  const road = document.getElementById("carGameRoad");
  const car = document.getElementById("carGameCar");
  if(!road || !car) return;
  const carRect = car.getBoundingClientRect();
  road.querySelectorAll(".car-game-frog").forEach(frog=>{
    if(frog.dataset.hit === "1") return;
    if(parseInt(frog.dataset.lane) !== carGame.carLane) return;
    const fr = frog.getBoundingClientRect();
    const overlapY = fr.bottom > carRect.top + carRect.height*0.25 && fr.top < carRect.bottom;
    if(overlapY){
      frog.dataset.hit = "1";
      frog.classList.add("boing");
      speak("Autsch, vorsichtig!");
      setTimeout(()=> resolveFrog(frog, false), 350);
    }
  });
}

function resolveFrog(frog, dodged){
  if(!carGame || frog.dataset.resolved === "1") return;
  frog.dataset.resolved = "1";
  frog.remove();
  carGame.resolved++;
  if(dodged) carGame.dodged++;
  const statusEl = document.getElementById("carGameStatus");
  if(statusEl) statusEl.textContent = `${carGame.dodged} / ${carGame.target} Frösche sicher vorbeigelassen`;
  if(carGame.resolved >= carGame.target){
    finishCarGame();
  }
}

function finishCarGame(){
  clearInterval(carGame.spawnTimer);
  clearInterval(carGame.checkTimer);
  carGame.active = false;
  const dodged = carGame.dodged, target = carGame.target;
  unlockSticker("first_cargame");
  if(dodged === target) unlockSticker("all_cargame");
  if(dodged > (profile.carGameBest||0)) profile.carGameBest = dodged;
  addStars(dodged);
  persist();
  const resultText = `${dodged} von ${target} Fröschen sicher vorbeigelassen!`;
  viewEl.innerHTML = `
    ${backBtn("home")}
    <div class="stage">
      <div class="mascot-lg">${profile.avatar}</div>
      <h2>Gut gefahren!</h2>
      <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">${resultText}</p>
      <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
        <button class="btn secondary" onclick="renderCarGame()">Nochmal fahren</button>
        <button class="btn" onclick="navigate('home')">Zurück zur Insel</button>
      </div>
    </div>`;
  setSpeakText(resultText);
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
  else if(ex.type==="steps") renderSteps(ex);
  else if(ex.type==="tap") renderTap(ex);
}

let breathTimer=null, breathCount=0, currentExercise=null;
function renderBreathing(ex){
  currentExercise = ex; breathCount = 0;
  viewEl.innerHTML = `
    ${backBtn("calm")}
    <div class="stage">
      <div class="title-row"><h2>${ex.icon} ${ex.title}</h2>${speakerBtn()}</div>
      <p style="color:var(--ink-soft); font-weight:600; margin-top:6px;">Folge dem Kreis: einatmen, wenn er wächst — ausatmen, wenn er kleiner wird.</p>
      <div class="breath-circle" id="breathCircle">Bereit?</div>
      <p id="breathCounter" style="font-weight:800; color:var(--ink-soft);">0 / ${ex.rounds} Atemzüge</p>
      <button class="btn" id="breathStart" onclick="startBreathing()">Los geht's</button>
    </div>`;
  setSpeakText(`${ex.title}. Folge dem Kreis: einatmen, wenn er wächst, ausatmen, wenn er kleiner wird.`);
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
  if(profile.autoRead !== false) speak(ex.inLabel);
  breathTimer = setTimeout(()=>{
    circle.classList.remove("in"); circle.classList.add("out");
    circle.textContent = ex.outLabel;
    if(profile.autoRead !== false) speak(ex.outLabel);
    breathTimer = setTimeout(()=>{
      breathCount++;
      counter.textContent = `${breathCount} / ${ex.rounds} Atemzüge`;
      breathStep();
    }, ex.outMs);
  }, ex.inMs);
}

/* Generische Schritt-für-Schritt-Übung: wird für Beobachten, Bewegen und Vorstellen genutzt,
   jede Übung bringt aber eigene, ganz unterschiedliche Inhalte mit (ex.steps). */
let stepIdx = 0, currentSteps = null;
function renderSteps(ex){
  currentSteps = ex; stepIdx = 0;
  showStep();
}
function showStep(){
  const ex = currentSteps;
  if(stepIdx >= ex.steps.length){
    profile.progress.calmSessions++;
    if(profile.progress.calmSessions>=5) unlockSticker("calm5");
    addStars(2);
    viewEl.innerHTML = `
      ${backBtn("calm")}
      <div class="stage">
        <div class="mascot-lg">${ex.icon}</div>
        <h2>Gut gemacht!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Du bist jetzt ganz ruhig angekommen.</p>
        <button class="btn" style="margin-top:20px;" onclick="navigate('home')">Zurück zur Insel</button>
      </div>`;
    return;
  }
  viewEl.innerHTML = `
    ${backBtn("calm")}
    <div class="progress-track"><div class="progress-fill" style="width:${(stepIdx/ex.steps.length)*100}%"></div></div>
    <div class="card stage">
      <div class="mascot-lg" style="font-size:3rem;">${ex.icon}</div>
      <div class="title-row"><p style="font-family:'Baloo 2'; font-weight:700; font-size:1.1rem;">${ex.steps[stepIdx]}</p>${speakerBtn()}</div>
      <button class="btn" style="margin-top:20px;" onclick="stepIdx++; showStep();">Weiter</button>
    </div>`;
  setSpeakText(ex.steps[stepIdx]);
}

/* Tipp-Übung: aktives Antippen statt nur Zuschauen — eine eigene, spürbar andere Mechanik. */
let tapState = null;
function renderTap(ex){
  tapState = { ex, popped: new Array(ex.count).fill(false) };
  showTap();
}
function showTap(){
  const { ex, popped } = tapState;
  const doneCount = popped.filter(Boolean).length;
  if(doneCount === ex.count){
    profile.progress.calmSessions++;
    if(profile.progress.calmSessions>=5) unlockSticker("calm5");
    addStars(2);
    viewEl.innerHTML = `
      ${backBtn("calm")}
      <div class="stage">
        <div class="mascot-lg">${ex.poppedEmoji}</div>
        <h2>Alle geschafft!</h2>
        <p style="margin-top:8px; color:var(--ink-soft); font-weight:700;">Schön ruhig geworden, oder?</p>
        <button class="btn" style="margin-top:20px;" onclick="navigate('home')">Zurück zur Insel</button>
      </div>`;
    return;
  }
  viewEl.innerHTML = `
    ${backBtn("calm")}
    <div class="stage">
      <div class="title-row"><h2>${ex.icon} ${ex.title}</h2>${speakerBtn()}</div>
      <p style="color:var(--ink-soft); font-weight:600; margin:6px 0 18px;">Tippe der Reihe nach auf jedes Symbol.</p>
      <div class="tap-grid">
        ${popped.map((done,i)=>`
          <button class="tap-item ${done?'popped':''}" ${done?'disabled':''} onclick="popTap(${i})" aria-label="Element ${i+1}">
            ${done ? ex.poppedEmoji : ex.emoji}
          </button>`).join("")}
      </div>
      <p style="margin-top:14px; font-weight:800; color:var(--ink-soft);">${doneCount} / ${ex.count}</p>
    </div>`;
}
function popTap(i){
  if(tapState.popped[i]) return;
  tapState.popped[i] = true;
  showTap();
}

/* ============================================================
   MODUL: GESCHICHTEN
   ============================================================ */
function renderStoriesList(){
  const stories = shuffle(byLevel(STORIES));
  viewEl.innerHTML = `
    ${backBtn("home")}
    <h2 class="section-title" style="margin-bottom:14px;">${personalizeStoryText("Leos Geschichten")}</h2>
    ${stories.map(s=>`
      <div class="module-card" style="background:#fff;" onclick="navigate('story','${s.id}')">
        <div class="module-icon" style="background:var(--sun)">${s.cover}</div>
        <div>
          <div class="module-title">${personalizeStoryText(s.title)}</div>
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
    const pageText = personalizeStoryText(p.text);
    viewEl.innerHTML = `
      ${backBtn("stories")}
      <div class="card storypage">
        <div class="scene">${p.scene}</div>
        <div class="title-row"><p>${pageText}</p>${speakerBtn()}</div>
        <button class="btn" style="margin-top:22px;" onclick="storyState.page++; showStoryPage();">
          ${storyState.page === s.pages.length-1 ? "Weiter" : "Weiter →"}
        </button>
      </div>`;
    setSpeakText(pageText);
    return;
  }
  const emoPool = byLevel(EMOTIONS);
  const opts = s.options.map(id=>emotionById(id)).filter(Boolean);
  const finalOpts = shuffle(opts.length>=2 ? opts : shuffle(emoPool).slice(0,3));
  pendingChoice = null;
  const questionText = personalizeStoryText(s.question);
  viewEl.innerHTML = `
    ${backBtn("stories")}
    <div class="card">
      <div class="title-row"><p class="section-title" style="font-size:1.1rem;">${questionText}</p>${speakerBtn()}</div>
      <div class="choice-grid" id="storyChoices" style="margin-top:14px;">
        ${finalOpts.map(o=>`
          <button class="choice" data-id="${o.id}" onclick="pickStoryAnswer('${o.id}','${s.correct}')">
            <span class="emoji">${o.emoji}</span>${o.label}
          </button>`).join("")}
      </div>
      <div id="storyFeedback"></div>
    </div>`;
  setSpeakText(s.question);
}
function pickStoryAnswer(pickedId, correctId){
  if(!needsConfirmTap('story', pickedId)){
    previewPick('storyChoices', 'id', pickedId);
    speak(emotionById(pickedId).label);
    showConfirmHint('storyFeedback');
    return;
  }
  document.querySelectorAll("#storyChoices .choice").forEach(b=>{
    b.onclick=null;
    if(b.dataset.id===correctId) b.classList.add("correct");
    else if(b.dataset.id===pickedId) b.classList.add("wrong");
  });
  speakResult(pickedId === correctId, emotionById(correctId).label);
  const s = storyState.story;
  if(!profile.progress.storiesDone.includes(s.id)){
    profile.progress.storiesDone.push(s.id);
    unlockSticker("first_story");
    if(profile.progress.storiesDone.length === byLevel(STORIES).length) unlockSticker("all_stories");
    addStars(3);
  }
  document.getElementById("storyFeedback").innerHTML = `
    <div class="tip-box">💡 ${personalizeStoryText(s.tip)}</div>
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
  const stationLabel = key => (STATIONS.find(s=>s.key===key)||{}).label || key;
  const toddlerToggle = currentLevel()===1 ? `
    <div class="card parent-block">
      <h3>🔄 Kategorien für 2-3 Jahre wechseln</h3>
      <p>Damit ${profile.name||"dein Kind"} nicht überfordert wird, zeigt die Insel für 2-3-Jährige immer nur 4 Kategorien gleichzeitig. Der Schalter wechselt zwischen der festen Grundauswahl und einer zufälligen Mischung aus allen 8 Kategorien.</p>
      <div style="display:flex; align-items:center; gap:14px; margin-top:14px; flex-wrap:wrap;">
        <button class="toggle-track ${profile.toddlerSet==='random'?'on':''}" onclick="toggleToddlerSet()" aria-label="Zufällige Kategorien aktivieren" aria-pressed="${profile.toddlerSet==='random'}">
          <span class="toggle-thumb"></span>
        </button>
        <div style="font-weight:700; font-size:0.85rem; color:var(--ink-soft);">
          ${profile.toddlerSet==='random'
            ? `🔀 Zufällig gemischt: ${(profile.toddlerRandomSet||[]).map(stationLabel).join(', ')}`
            : 'Feste Auswahl: Gefühls-Tankstelle, Geschichten-Autobahn, Lack-Werkstatt, Formen-Werkstatt'}
        </div>
      </div>
      ${profile.toddlerSet==='random' ? `<button class="btn secondary" style="margin-top:14px;" onclick="reshuffleToddlerSet()">🔀 Neu mischen</button>` : ``}
    </div>` : ``;
  const rate = profile.speechRate || 0.92;
  const speechToggle = `
    <div class="card parent-block">
      <h3>🔊 Fragen vorlesen</h3>
      <p>Bei 2-3 und 3-4 Jahren werden Fragen automatisch laut vorgelesen, da Kinder in dem Alter meist noch nicht lesen können. Ab 5-6 Jahren gibt's weiterhin einen 🔊-Knopf zum manuellen Vorlesen, falls gewünscht. Falls dein Gerät keine Sprachausgabe unterstützt, bleibt der Knopf einfach ohne Wirkung.</p>
      <div style="display:flex; align-items:center; gap:14px; margin-top:14px; flex-wrap:wrap;">
        <button class="toggle-track ${profile.autoRead!==false?'on':''}" onclick="toggleAutoRead()" aria-label="Automatisches Vorlesen umschalten" aria-pressed="${profile.autoRead!==false}">
          <span class="toggle-thumb"></span>
        </button>
        <div style="font-weight:700; font-size:0.85rem; color:var(--ink-soft);">
          ${profile.autoRead!==false ? "Automatisches Vorlesen ist an" : "Automatisches Vorlesen ist aus"}
        </div>
      </div>
      <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--line);">
        <span class="field-label" style="margin-bottom:8px; display:block;">Vorlesegeschwindigkeit</span>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:0.85rem;">🐢</span>
          <input type="range" id="speechRateSlider" min="0.6" max="1.3" step="0.05" value="${rate}"
                 oninput="updateSpeechRate(this.value)" style="flex:1; accent-color:var(--accent-deep);" aria-label="Vorlesegeschwindigkeit">
          <span style="font-size:0.85rem;">🐇</span>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
          <span id="speechRateLabel" style="font-weight:700; font-size:0.85rem; color:var(--ink-soft);">${speechRateLabel(rate)}</span>
          <button class="btn secondary" style="padding:8px 16px; font-size:0.85rem;" onclick="testSpeechRate()">🔊 Testen</button>
        </div>
      </div>
    </div>`;
  viewEl.innerHTML = `
    <div class="card parent-block">
      <h3>💛 Willkommen im Elternbereich</h3>
      <p>Leo's Lerninsel hilft Kindern spielerisch dabei, Gefühle zu erkennen, sie in Worte zu fassen und mit Stress umzugehen — in kurzen, ruhigen Einheiten ohne hektische Effekte oder Zeitdruck. Inhalte und Schwierigkeit passen sich automatisch der eingestellten Altersstufe an, und jede Runde wird neu gemischt.</p>
    </div>
    ${toddlerToggle}
    ${speechToggle}
    <div class="card parent-block">
      <h3>📈 Rückblick</h3>
      <p>Verfolge, wie aktiv ${profile.name||"dein Kind"} in der App lernt — als kleine Lernkurve über die Zeit.</p>
      <div style="display:flex; align-items:center; gap:14px; margin:14px 0 18px; flex-wrap:wrap;">
        <button class="toggle-track ${profile.reviewMode==='month'?'on':''}" onclick="toggleReviewMode()" aria-label="Monatsrückblick umschalten" aria-pressed="${profile.reviewMode==='month'}">
          <span class="toggle-thumb"></span>
        </button>
        <div style="font-weight:700; font-size:0.85rem; color:var(--ink-soft);">
          ${profile.reviewMode==='month' ? "Monatsrückblick" : "Wochenrückblick"}
        </div>
      </div>
      ${renderReviewChart()}
    </div>
    <div class="card parent-block">
      <h3>📊 Fortschritt von ${profile.name} (${profile.age||"–"} Jahre)</h3>
      <p>Gefühle-Runden gespielt: ${profile.progress.feelingsDone}<br>
      Klare Sätze geübt: ${profile.progress.wordsGood} von ${profile.progress.wordsTotal}<br>
      Stress-Situationen gemeistert: ${profile.progress.stressGood} von ${profile.progress.stressTotal}<br>
      Farben erkannt: ${profile.progress.colorsGood} von ${profile.progress.colorsTotal}<br>
      Formen erkannt: ${profile.progress.shapesGood} von ${profile.progress.shapesTotal}<br>
      Richtig gezählt: ${profile.progress.countGood} von ${profile.progress.countTotal}<br>
      Tierlaute erkannt: ${profile.progress.soundsGood} von ${profile.progress.soundsTotal}<br>
      Fahrzeuge erkannt: ${profile.progress.vehiclesGood} von ${profile.progress.vehiclesTotal}<br>
      Formen nachgezeichnet: ${profile.progress.tracesDone}<br>
      Haustier: ${profile.pet ? `${profile.pet.name} (${profile.pet.careCount||0}x versorgt)` : "noch nicht ausgewählt"}<br>
      Frosch-Kreuzung Bestwert: ${profile.carGameBest||0} von 5 sicher vorbeigelassen<br>
      Ruheübungen abgeschlossen: ${profile.progress.calmSessions}<br>
      Geschichten gelesen: ${profile.progress.storiesDone.length} von ${STORIES.length}</p>
    </div>
    <div class="card parent-block">
      <h3>🔒 Datenschutz</h3>
      <p>Alle Angaben bleiben ausschließlich auf diesem Gerät gespeichert (lokal im Browser). Es gibt keine Werbung, keine externen Konten und keine Datenweitergabe.</p>
    </div>
    <div class="card parent-block">
      <h3>⬇️ Nach Updates suchen</h3>
      <p>Als installierte App wird Leo's Lerninsel offlinefähig zwischengespeichert. Damit neue Inhalte und Verbesserungen sicher ankommen, kannst du hier aktiv nach der neuesten Version suchen — die Seite lädt danach automatisch komplett neu.</p>
      <p style="margin-top:8px; font-size:0.8rem;">Aktuell installierte Version: <strong>${APP_VERSION}</strong></p>
      <button id="updateCheckBtn" class="btn secondary" style="margin-top:10px;" onclick="checkForUpdates()">🔄 Nach Updates suchen</button>
      <p id="updateCheckStatus" style="margin-top:8px; font-size:0.8rem;"></p>
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
      <span class="field-label" style="margin-top:18px;">Fahrzeug</span>
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
function toggleToddlerSet(){
  if(profile.toddlerSet === "random"){
    profile.toddlerSet = "primary";
  } else {
    profile.toddlerSet = "random";
    profile.toddlerRandomSet = pickRandomToddlerSet();
  }
  persist();
  renderParents();
}
function reshuffleToddlerSet(){
  profile.toddlerRandomSet = pickRandomToddlerSet();
  persist();
  renderParents();
}
/* ---------- Eltern-Rückblick (Wochen-/Monatsansicht der Lernaktivität) ---------- */
function buildReviewBars(mode){
  const log = profile.activityLog || {};
  const days = ["So","Mo","Di","Mi","Do","Fr","Sa"];
  const bars = [];
  if(mode === "month"){
    for(let w=4; w>=0; w--){
      let stars=0, sessions=0;
      for(let i=0;i<7;i++){
        const d = new Date();
        d.setDate(d.getDate() - (w*7+i));
        const entry = log[dateKey(d)];
        if(entry){ stars += entry.stars; sessions += entry.sessions; }
      }
      bars.push({ label: w===0 ? "Diese Wo." : `vor ${w} Wo.`, stars, sessions });
    }
  } else {
    for(let i=6; i>=0; i--){
      const d = new Date();
      d.setDate(d.getDate()-i);
      const entry = log[dateKey(d)] || { stars:0, sessions:0 };
      bars.push({ label: days[d.getDay()], stars: entry.stars, sessions: entry.sessions });
    }
  }
  return bars;
}
function renderReviewChart(){
  const mode = profile.reviewMode === "month" ? "month" : "week";
  const bars = buildReviewBars(mode);
  const maxStars = Math.max(1, ...bars.map(b=>b.stars));
  const totalStars = bars.reduce((s,b)=>s+b.stars,0);
  const totalSessions = bars.reduce((s,b)=>s+b.sessions,0);
  return `
    <p style="margin-bottom:12px; font-weight:700; font-size:0.85rem; color:var(--ink-soft);">
      ${mode==='month' ? 'Letzte 5 Wochen' : 'Letzte 7 Tage'}: ⭐ ${totalStars} Sterne in ${totalSessions} Lerneinheiten
    </p>
    <div class="review-chart">
      ${bars.map(b=>`
        <div class="review-bar-col">
          <div class="review-bar-track">
            <div class="review-bar" style="height:${Math.max(6,(b.stars/maxStars)*100)}%;" title="${b.stars} Sterne, ${b.sessions} Einheiten"></div>
          </div>
          <div class="review-bar-value">${b.stars}</div>
          <div class="review-bar-label">${b.label}</div>
        </div>`).join("")}
    </div>`;
}
function toggleReviewMode(){
  profile.reviewMode = profile.reviewMode === "month" ? "week" : "month";
  persist();
  renderParents();
}

function toggleAutoRead(){
  profile.autoRead = profile.autoRead === false ? true : false;
  persist();
  renderParents();
}
function updateSpeechRate(value){
  profile.speechRate = parseFloat(value);
  persist();
  const label = document.getElementById("speechRateLabel");
  if(label) label.textContent = speechRateLabel(profile.speechRate);
}
function testSpeechRate(){
  speak("So klingt die Vorlesestimme in dieser Geschwindigkeit.");
}

/* Sucht aktiv nach einer neuen Version: stößt das Service-Worker-Update an,
   leert alle bekannten Caches und lädt die Seite dann cache-umgehend neu,
   damit garantiert die neueste Version aktiv ist. */
async function checkForUpdates(){
  const btn = document.getElementById("updateCheckBtn");
  const statusEl = document.getElementById("updateCheckStatus");
  if(btn){ btn.disabled = true; btn.textContent = "🔄 Suche läuft …"; }
  if(statusEl){ statusEl.textContent = "Einen Moment, es wird nach der neuesten Version gesucht …"; }
  try{
    if("serviceWorker" in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      for(const reg of regs){
        try{ await reg.update(); }catch(e){}
      }
    }
    if("caches" in window){
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  }catch(e){ /* auch bei Fehlern trotzdem neu laden versuchen */ }
  const url = new URL(window.location.href);
  url.searchParams.set("refresh", Date.now().toString());
  window.location.replace(url.toString());
}

/* ============================================================
   INIT
   ============================================================ */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js").then(reg=>{
      // Ein bereits wartender neuer Service Worker (z.B. von einem vorherigen Tab) -> sofort Hinweis zeigen
      if(reg.waiting && navigator.serviceWorker.controller){ showUpdateBanner(); }
      reg.addEventListener("updatefound", ()=>{
        const newWorker = reg.installing;
        if(!newWorker) return;
        newWorker.addEventListener("statechange", ()=>{
          if(newWorker.state === "installed" && navigator.serviceWorker.controller){
            showUpdateBanner();
          }
        });
      });
      // Beim Öffnen der App aktiv nachfragen, ob es etwas Neues gibt (statt nur passiv zu warten)
      reg.update().catch(()=>{});
      // Solange die App offen bleibt, alle 30 Minuten erneut nachfragen
      setInterval(()=>{ reg.update().catch(()=>{}); }, 30*60*1000);
    }).catch(()=>{});
  });
}
function showUpdateBanner(){
  if(document.getElementById("updateBanner")) return; // schon sichtbar
  const el = document.createElement("div");
  el.id = "updateBanner";
  el.className = "update-banner";
  el.innerHTML = `
    <span>🎉 Eine neue Version ist da!</span>
    <button onclick="checkForUpdates()">Jetzt aktualisieren</button>
    <button class="dismiss" onclick="document.getElementById('updateBanner').remove()" aria-label="Schließen">✕</button>`;
  document.body.appendChild(el);
}
// Aufräumen: den ?refresh=... Parameter (von der Update-Prüfung) wieder aus der Adresszeile entfernen
if(window.location.search.includes("refresh=") && window.history && window.history.replaceState){
  const cleanUrl = window.location.pathname + window.location.hash;
  window.history.replaceState({}, "", cleanUrl);
}
if(profile && profile.name){ applyTheme(); navigate("home"); }
else { renderOnboarding(); }
