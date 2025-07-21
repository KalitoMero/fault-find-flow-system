
import { pipeline } from '@huggingface/transformers';

// Cache für das Text-Korrektur-Modell
let textCorrectionPipeline: any = null;

// Erweiterte Füllwörter und unerwünschte Ausdrücke
const FILLER_WORDS = [
  // Klassische Füllwörter
  'äh', 'ähm', 'ähem', 'eh', 'ehm', 'hm', 'hmm', 'mhm', 'uhm', 'uh',
  // Deutsche Füllwörter
  'also', 'halt', 'eigentlich', 'irgendwie', 'sozusagen', 'quasi', 'gewissermaßen',
  'praktisch', 'im prinzip', 'sagen wir mal', 'wie soll ich sagen',
  // Häufige Geräusche
  'tja', 'naja', 'öh', 'öhm'
];

// Häufige Transkriptionsfehler
const COMMON_ERRORS = {
  // Verkürzungen
  'nich': 'nicht',
  'wa': 'was',
  'ma': 'mal',
  'ne': 'eine',
  'nen': 'einen',
  'nem': 'einem',
  'aufm': 'auf dem',
  'ausm': 'aus dem',
  'durchs': 'durch das',
  'fürs': 'für das',
  'ins': 'in das',
  'ums': 'um das',
  'übers': 'über das',
  'unters': 'unter das',
  'vors': 'vor das',
  'wegen dem': 'wegen des',
  
  // Häufige Homophone
  'seit': 'seit', // Kontext-abhängig
  'seid': 'seid', // Kontext-abhängig
  'das': 'das',
  'dass': 'dass',
  'wider': 'wieder', // Meist ist "wieder" gemeint
  'den': 'den',
  'denn': 'denn',
  
  // Häufige Verschreibungen
  'und so weiter': 'und so weiter',
  'etzetera': 'et cetera',
  'vorallem': 'vor allem',
  'aufjedenfall': 'auf jeden Fall',
  'zumbeispiel': 'zum Beispiel',
  'sodass': 'sodass',
  'so dass': 'sodass',
  'garnicht': 'gar nicht',
  'garnichts': 'gar nichts',
  'warscheinlich': 'wahrscheinlich',
  'villeicht': 'vielleicht',
  'vieleicht': 'vielleicht'
};

// Initialisierung des Text-Korrektur-Modells (falls verfügbar)
const initTextCorrectionModel = async () => {
  if (textCorrectionPipeline) return textCorrectionPipeline;
  
  try {
    console.log('Lade Text-Korrektur-Modell...');
    // Verwende ein deutsches Sprachmodell für Grammatikkorrektur
    textCorrectionPipeline = await pipeline(
      'text2text-generation',
      'Xenova/flan-t5-small',
      { device: 'wasm' }
    );
    console.log('Text-Korrektur-Modell geladen');
    return textCorrectionPipeline;
  } catch (error) {
    console.warn('Text-Korrektur-Modell konnte nicht geladen werden:', error);
    return null;
  }
};

// Entfernung von Füllwörtern
const removeFillersAndNoises = (text: string): string => {
  let cleanedText = text;
  
  // Entferne Füllwörter (case-insensitive)
  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    cleanedText = cleanedText.replace(regex, '');
  });
  
  // Entferne Wiederholungen (z.B. "ich ich ich sage")
  cleanedText = cleanedText.replace(/\b(\w+)(\s+\1){2,}\b/gi, '$1');
  
  // Entferne Stottern (z.B. "b-b-bin")
  cleanedText = cleanedText.replace(/\b(\w)-\1+(\w*)\b/g, '$1$2');
  
  // Entferne mehrfache Satzzeichen
  cleanedText = cleanedText.replace(/[.]{2,}/g, '.');
  cleanedText = cleanedText.replace(/[,]{2,}/g, ',');
  cleanedText = cleanedText.replace(/[!]{2,}/g, '!');
  cleanedText = cleanedText.replace(/[?]{2,}/g, '?');
  
  // Entferne Leerräume vor Satzzeichen
  cleanedText = cleanedText.replace(/\s+([.!?,:;])/g, '$1');
  
  return cleanedText;
};

// Korrektur häufiger Fehler
const correctCommonErrors = (text: string): string => {
  let correctedText = text;
  
  // Ersetze häufige Transkriptionsfehler
  Object.entries(COMMON_ERRORS).forEach(([error, correction]) => {
    const regex = new RegExp(`\\b${error}\\b`, 'gi');
    correctedText = correctedText.replace(regex, correction);
  });
  
  return correctedText;
};

// Verbesserung der Satzstruktur
const improveSentenceStructure = (text: string): string => {
  let improvedText = text;
  
  // Entferne unvollständige Wörter (einzelne Buchstaben oder sehr kurze Fragmente)
  improvedText = improvedText.replace(/\b[a-zA-ZäöüÄÖÜß]{1,2}\b(?!\s*[.!?])/g, '');
  
  // Füge Leerzeichen nach Satzzeichen hinzu, falls fehlend
  improvedText = improvedText.replace(/([.!?])([A-ZÄÖÜ])/g, '$1 $2');
  
  // Korrigiere Groß-/Kleinschreibung am Satzanfang
  improvedText = improvedText.replace(/(^|[.!?]\s+)([a-zäöüß])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });
  
  // Entferne überflüssige Leerzeichen
  improvedText = improvedText.replace(/\s{2,}/g, ' ');
  
  // Trimme und stelle sicher, dass der Text mit einem Punkt endet
  improvedText = improvedText.trim();
  if (improvedText && !improvedText.match(/[.!?]$/)) {
    improvedText += '.';
  }
  
  return improvedText;
};

// Kontextuelle Verbesserungen
const applyContextualImprovements = (text: string): string => {
  let contextText = text;
  
  // Verbessere häufige Phrasen
  const phraseCorrections = {
    'aufgrund von': 'aufgrund von',
    'wegen von': 'wegen',
    'trotz von': 'trotz',
    'anstatt von': 'anstatt',
    'während von': 'während',
    'bezüglich von': 'bezüglich',
    
    // Zeitangaben
    'um 8 uhr': 'um 8 Uhr',
    'um 9 uhr': 'um 9 Uhr',
    'um 10 uhr': 'um 10 Uhr',
    'um 11 uhr': 'um 11 Uhr',
    'um 12 uhr': 'um 12 Uhr',
    
    // Höflichkeitsformen
    'bitte schön': 'bitte schön',
    'danke schön': 'danke schön',
    'gerne geschehen': 'gerne geschehen',
    
    // Häufige Formeln
    'mit freundlichen grüßen': 'mit freundlichen Grüßen',
    'vielen dank': 'vielen Dank',
    'beste grüße': 'beste Grüße'
  };
  
  Object.entries(phraseCorrections).forEach(([phrase, correction]) => {
    const regex = new RegExp(phrase, 'gi');
    contextText = contextText.replace(regex, correction);
  });
  
  return contextText;
};

// AI-basierte Textverbesserung (experimentell)
const applyAICorrection = async (text: string): Promise<string> => {
  try {
    const model = await initTextCorrectionModel();
    if (!model || text.length < 10) return text;
    
    // Einfache Grammatikkorrektur mit dem Modell
    const prompt = `Korrigiere die Grammatik und verbessere den folgenden deutschen Text: "${text}"`;
    const result = await model(prompt, {
      max_length: Math.min(text.length * 2, 512),
      temperature: 0.1,
      do_sample: false
    });
    
    if (result && result[0] && result[0].generated_text) {
      const correctedText = result[0].generated_text.replace(prompt, '').trim();
      return correctedText || text;
    }
    
    return text;
  } catch (error) {
    console.warn('AI-Korrektur fehlgeschlagen:', error);
    return text;
  }
};

// Hauptfunktion für erweiterte Textbereinigung
export const cleanTranscriptionText = async (
  text: string, 
  useAICorrection: boolean = false
): Promise<string> => {
  if (!text || typeof text !== 'string') return '';
  
  console.log('Starte erweiterte Textbereinigung:', text);
  
  let cleanedText = text;
  
  // 1. Entferne Füllwörter und Geräusche
  cleanedText = removeFillersAndNoises(cleanedText);
  console.log('Nach Füllwort-Entfernung:', cleanedText);
  
  // 2. Korrigiere häufige Fehler
  cleanedText = correctCommonErrors(cleanedText);
  console.log('Nach Fehlerkorrektur:', cleanedText);
  
  // 3. Verbessere Satzstruktur
  cleanedText = improveSentenceStructure(cleanedText);
  console.log('Nach Strukturverbesserung:', cleanedText);
  
  // 4. Kontextuelle Verbesserungen
  cleanedText = applyContextualImprovements(cleanedText);
  console.log('Nach kontextuellen Verbesserungen:', cleanedText);
  
  // 5. Optional: AI-basierte Korrektur
  if (useAICorrection && cleanedText.length > 10) {
    cleanedText = await applyAICorrection(cleanedText);
    console.log('Nach AI-Korrektur:', cleanedText);
  }
  
  console.log('Finale bereinigte Transkription:', cleanedText);
  return cleanedText.trim();
};

// Vorschau-Funktion für Textverbesserungen
export const previewTextImprovements = (originalText: string): {
  original: string;
  withoutFillers: string;
  withErrorCorrection: string;
  withStructureImprovement: string;
  final: string;
} => {
  const withoutFillers = removeFillersAndNoises(originalText);
  const withErrorCorrection = correctCommonErrors(withoutFillers);
  const withStructureImprovement = improveSentenceStructure(withErrorCorrection);
  const final = applyContextualImprovements(withStructureImprovement);
  
  return {
    original: originalText,
    withoutFillers,
    withErrorCorrection,
    withStructureImprovement,
    final
  };
};
