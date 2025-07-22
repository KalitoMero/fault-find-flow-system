
import { pipeline } from '@huggingface/transformers';

// Memory-optimized model cache with automatic cleanup
interface ModelCache {
  textCorrection: any | null;
  sentenceEmbedding: any | null;
  ner: any | null;
  lastUsed: { [key: string]: number };
  memoryUsage: { [key: string]: number };
}

const modelCache: ModelCache = {
  textCorrection: null,
  sentenceEmbedding: null,
  ner: null,
  lastUsed: {},
  memoryUsage: {}
};

// Memory management constants
const MAX_MEMORY_MB = 300;
const MODEL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 30 * 1000; // 30 seconds

// Memory monitoring
function getMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
  }
  return 0;
}

function cleanupUnusedModels(): void {
  const now = Date.now();
  const currentMemory = getMemoryUsage();
  
  console.log(`Memory usage: ${currentMemory.toFixed(2)}MB`);
  
  if (currentMemory > MAX_MEMORY_MB) {
    console.log('Memory limit exceeded, cleaning up models...');
    
    // Sort models by last used time (oldest first)
    const modelEntries = Object.entries(modelCache.lastUsed)
      .sort(([,a], [,b]) => a - b);
    
    for (const [modelName] of modelEntries) {
      if (modelName === 'textCorrection') {
        modelCache.textCorrection = null;
      } else if (modelName === 'sentenceEmbedding') {
        modelCache.sentenceEmbedding = null;
      } else if (modelName === 'ner') {
        modelCache.ner = null;
      }
      
      delete modelCache.lastUsed[modelName];
      delete modelCache.memoryUsage[modelName];
      
      console.log(`Cleaned up ${modelName} model`);
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }
      
      break; // Clean one at a time
    }
  }
  
  // Auto cleanup old models
  for (const [modelName, lastUsed] of Object.entries(modelCache.lastUsed)) {
    if (now - lastUsed > MODEL_TIMEOUT_MS) {
      if (modelName === 'textCorrection') {
        modelCache.textCorrection = null;
      } else if (modelName === 'sentenceEmbedding') {
        modelCache.sentenceEmbedding = null;
      } else if (modelName === 'ner') {
        modelCache.ner = null;
      }
      
      delete modelCache.lastUsed[modelName];
      delete modelCache.memoryUsage[modelName];
      console.log(`Auto-cleaned ${modelName} model after timeout`);
    }
  }
}

// Start periodic cleanup
setInterval(cleanupUnusedModels, CLEANUP_INTERVAL_MS);

// Domänen-spezifische Erkennungsmuster
const DOMAIN_PATTERNS = {
  medical: [
    'patient', 'diagnose', 'therapie', 'medikament', 'symptom', 'behandlung',
    'krankheit', 'arzt', 'krankenhaus', 'operation', 'blutdruck', 'herzschlag',
    'röntgen', 'ultraschall', 'mrt', 'ct', 'labor', 'befund'
  ],
  technical: [
    'maschine', 'motor', 'getriebe', 'hydraulik', 'pneumatik', 'sensor',
    'steuerung', 'regelung', 'antrieb', 'lager', 'dichtung', 'wartung',
    'reparatur', 'instandhaltung', 'verschleiß', 'toleranz', 'material'
  ],
  business: [
    'umsatz', 'gewinn', 'verlust', 'budget', 'kosten', 'preis', 'markt',
    'kunde', 'vertrag', 'projekt', 'termin', 'meeting', 'präsentation',
    'strategie', 'analyse', 'bericht', 'verkauf', 'marketing'
  ],
  legal: [
    'gesetz', 'recht', 'paragraph', 'artikel', 'vertrag', 'klausel',
    'gericht', 'urteil', 'anwalt', 'richter', 'klage', 'berufung',
    'revision', 'rechtsmittel', 'frist', 'vollmacht', 'zeuge'
  ]
};

// Domänen-spezifische Korrekturen
const DOMAIN_CORRECTIONS = {
  medical: {
    'puls': 'Puls',
    'ekg': 'EKG',
    'ecg': 'EKG',
    'blutdruck': 'Blutdruck',
    'herzfrequenz': 'Herzfrequenz',
    'sauerstoffsättigung': 'Sauerstoffsättigung'
  },
  technical: {
    'cnc': 'CNC',
    'plc': 'PLC',
    'cad': 'CAD',
    'cam': 'CAM',
    'fräse': 'Fräse',
    'fräsen': 'Fräsen',
    'drehbank': 'Drehbank',
    'schleifmaschine': 'Schleifmaschine'
  },
  business: {
    'kpi': 'KPI',
    'roi': 'ROI',
    'crm': 'CRM',
    'erp': 'ERP',
    'b2b': 'B2B',
    'b2c': 'B2C'
  }
};

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
  'vieleicht': 'vielleicht',
  
  // Spezifische Umlaut-Korrekturen für häufige Whisper-Fehler
  'fressmaschine': 'Fräsmaschine',
  'fresmaschine': 'Fräsmaschine',
  'fres': 'Fräs',
  'frasen': 'Fräsen',
  'sagen': 'sägen',
  'uber': 'über',
  'fur': 'für',
  'tur': 'Tür',
  'turen': 'Türen',
  'grun': 'grün',
  'grune': 'grüne',
  'naturlich': 'natürlich',
  'moglich': 'möglich',
  'mogliche': 'mögliche',
  'grosse': 'große',
  'grossen': 'großen',
  'masse': 'Maße',
  'strasse': 'Straße',
  'strassen': 'Straßen',
  'weiss': 'weiß',
  'weisse': 'weiße',
  'heiss': 'heiß',
  'heisse': 'heiße',
  'fuss': 'Fuß',
  'fusse': 'Füße',
  'mussen': 'müssen',
  'konnen': 'können',
  'wurden': 'würden',
  'wurde': 'würde',
  'horen': 'hören',
  'gehoren': 'gehören',
  'erklaren': 'erklären',
  'zahlen': 'zählen',
  'wahlen': 'wählen',
  'fallen': 'fällen',
  'fullen': 'füllen',
  'drucker': 'Drucker',
  'drucken': 'drücken',
  'schlussel': 'Schlüssel',
  'flusse': 'Flüsse',
  'kuche': 'Küche',
  'muhe': 'Mühe',
  'muhsam': 'mühsam',
  'fruher': 'früher',
  'spater': 'später',
  'langer': 'länger',
  'kurzer': 'kürzer',
  'starker': 'stärker',
  'schwacher': 'schwächer'
};

// Lazy loading with memory management for text correction
const initTextCorrectionModel = async () => {
  if (modelCache.textCorrection) {
    modelCache.lastUsed.textCorrection = Date.now();
    return modelCache.textCorrection;
  }
  
  cleanupUnusedModels();
  
  try {
    console.log('Loading lightweight text correction model...');
    const { pipeline } = await import('@huggingface/transformers');
    
    // Use smaller model for better memory usage
    modelCache.textCorrection = await pipeline(
      'text2text-generation',
      'Xenova/flan-t5-small',
      {
        device: 'wasm',
        dtype: 'fp16'
      }
    );
    
    console.log('Text correction model loaded successfully');
    modelCache.lastUsed.textCorrection = Date.now();
    modelCache.memoryUsage.textCorrection = getMemoryUsage();
    return modelCache.textCorrection;
  } catch (error) {
    console.warn('Failed to load text correction model:', error);
    return null;
  }
};

// Lazy loading with memory management for sentence embedding
const initSentenceEmbeddingModel = async () => {
  if (modelCache.sentenceEmbedding) {
    modelCache.lastUsed.sentenceEmbedding = Date.now();
    return modelCache.sentenceEmbedding;
  }
  
  cleanupUnusedModels();
  
  try {
    console.log('Loading sentence embedding model...');
    const { pipeline } = await import('@huggingface/transformers');
    modelCache.sentenceEmbedding = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        device: 'wasm',
        dtype: 'fp16'
      }
    );
    console.log('Sentence embedding model loaded successfully');
    modelCache.lastUsed.sentenceEmbedding = Date.now();
    modelCache.memoryUsage.sentenceEmbedding = getMemoryUsage();
    return modelCache.sentenceEmbedding;
  } catch (error) {
    console.warn('Failed to load sentence embedding model:', error);
    return null;
  }
};

// Lazy loading with memory management for NER
const initNERModel = async () => {
  if (modelCache.ner) {
    modelCache.lastUsed.ner = Date.now();
    return modelCache.ner;
  }
  
  cleanupUnusedModels();
  
  try {
    console.log('Loading NER model...');
    const { pipeline } = await import('@huggingface/transformers');
    modelCache.ner = await pipeline(
      'token-classification',
      'Xenova/bert-base-multilingual-cased-ner-hrl',
      {
        device: 'wasm',
        dtype: 'fp16'
      }
    );
    console.log('NER model loaded successfully');
    modelCache.lastUsed.ner = Date.now();
    modelCache.memoryUsage.ner = getMemoryUsage();
    return modelCache.ner;
  } catch (error) {
    console.warn('Failed to load NER model:', error);
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
  
  // Entferne nur isolierte einzelne Buchstaben (aber nicht wichtige deutsche Wörter wie "zu", "im", "am")
  const importantShortWords = ['zu', 'im', 'am', 'an', 'in', 'um', 'ab', 'ex', 'ob', 'so', 'da', 'ja', 'er', 'es', 'wo', 'du', 'wir', 'ihr', 'ich', 'die', 'der', 'das', 'den', 'dem', 'des'];
  const shortWordPattern = importantShortWords.join('|');
  improvedText = improvedText.replace(new RegExp(`\\b(?!${shortWordPattern}\\b)[a-zA-ZäöüÄÖÜß]\\b`, 'gi'), '');
  
  // Entferne leere Anführungszeichen und unnötige Satzzeichen
  improvedText = improvedText.replace(/[""]/g, '');
  improvedText = improvedText.replace(/\s*-\s*(?=[A-ZÄÖÜ])/g, '. ');
  
  // Füge Leerzeichen nach Satzzeichen hinzu, falls fehlend
  improvedText = improvedText.replace(/([.!?])([A-ZÄÖÜ])/g, '$1 $2');
  
  // Korrigiere Groß-/Kleinschreibung am Satzanfang
  improvedText = improvedText.replace(/(^|[.!?]\s+)([a-zäöüß])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });
  
  // Entferne überflüssige Leerzeichen
  improvedText = improvedText.replace(/\s{2,}/g, ' ');
  
  // Entferne führende Kommas oder Punkte
  improvedText = improvedText.replace(/^[,.\s]+/, '');
  
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

// Domänen-Erkennung basierend auf Schlüsselwörtern
const detectDomain = (text: string): string[] => {
  const detectedDomains: string[] = [];
  const lowerText = text.toLowerCase();
  
  Object.entries(DOMAIN_PATTERNS).forEach(([domain, patterns]) => {
    const matchCount = patterns.filter(pattern => 
      lowerText.includes(pattern.toLowerCase())
    ).length;
    
    // Wenn mindestens 2 Begriffe aus einer Domäne gefunden werden
    if (matchCount >= 2) {
      detectedDomains.push(domain);
    }
  });
  
  return detectedDomains;
};

// Named Entity Recognition
const extractNamedEntities = async (text: string): Promise<any[]> => {
  try {
    const nerModel = await initNERModel();
    if (!nerModel) return [];
    
    const entities = await nerModel(text);
    return entities.filter((entity: any) => entity.score > 0.8);
  } catch (error) {
    console.warn('NER-Extraktion fehlgeschlagen:', error);
    return [];
  }
};

// Sentence Embedding für semantische Analyse
const analyzeSentenceSemantics = async (sentences: string[]): Promise<number[][]> => {
  try {
    const embeddingModel = await initSentenceEmbeddingModel();
    if (!embeddingModel || sentences.length === 0) return [];
    
    const embeddings = await embeddingModel(sentences, { pooling: 'mean', normalize: true });
    return embeddings.tolist();
  } catch (error) {
    console.warn('Sentence Embedding fehlgeschlagen:', error);
    return [];
  }
};

// Kontextuelle Verbesserungen basierend auf Domäne
const applyDomainSpecificCorrections = (text: string, domains: string[]): string => {
  let correctedText = text;
  
  domains.forEach(domain => {
    const corrections = DOMAIN_CORRECTIONS[domain as keyof typeof DOMAIN_CORRECTIONS];
    if (corrections) {
      Object.entries(corrections).forEach(([error, correction]) => {
        const regex = new RegExp(`\\b${error}\\b`, 'gi');
        correctedText = correctedText.replace(regex, correction);
      });
    }
  });
  
  return correctedText;
};

// Erweiterte AI-basierte Textverbesserung
const applyAdvancedAICorrection = async (text: string, context: {
  domains: string[];
  entities: any[];
  semantics: number[][];
}): Promise<string> => {
  try {
    const model = await initTextCorrectionModel();
    if (!model || text.length < 10) return text;
    
    // Erstelle kontextuellen Prompt basierend auf erkannten Domänen
    let contextPrompt = 'Korrigiere die Grammatik und verbessere den folgenden deutschen Text';
    
    if (context.domains.length > 0) {
      const domainNames = {
        medical: 'medizinischen',
        technical: 'technischen', 
        business: 'geschäftlichen',
        legal: 'rechtlichen'
      };
      
      const domainDescriptions = context.domains.map(d => 
        domainNames[d as keyof typeof domainNames] || d
      ).join(' und ');
      
      contextPrompt += ` aus dem ${domainDescriptions} Bereich`;
    }
    
    const prompt = `${contextPrompt}: "${text}"`;
    
    const result = await model(prompt, {
      max_length: Math.min(text.length * 2, 512),
      temperature: 0.1,
      do_sample: false,
      num_beams: 3
    });
    
    if (result && result[0] && result[0].generated_text) {
      let correctedText = result[0].generated_text;
      
      // Entferne den Prompt aus der Antwort
      if (correctedText.includes('"')) {
        const matches = correctedText.match(/"([^"]*)"/);
        if (matches && matches[1]) {
          correctedText = matches[1];
        }
      }
      
      return correctedText.trim() || text;
    }
    
    return text;
  } catch (error) {
    console.warn('Erweiterte AI-Korrektur fehlgeschlagen:', error);
    return text;
  }
};

// Multi-Step Text Processing Pipeline
export const cleanTranscriptionText = async (
  text: string, 
  useAICorrection: boolean = false
): Promise<string> => {
  if (!text || typeof text !== 'string') return '';
  
  console.log('🚀 Starte Multi-Step Text Processing Pipeline:', text);
  
  let processedText = text;
  
  // SCHRITT 1: Grundlegende Bereinigung
  console.log('📋 SCHRITT 1: Grundlegende Bereinigung');
  processedText = await performBasicCleaning(processedText);
  console.log('✅ Schritt 1 abgeschlossen:', processedText);
  
  // SCHRITT 2: Kontextuelle Analyse
  console.log('🔍 SCHRITT 2: Kontextuelle Analyse');
  const contextData = await performContextualAnalysis(processedText);
  console.log('✅ Schritt 2 abgeschlossen - Erkannte Domänen:', contextData.domains);
  
  // SCHRITT 3: Semantische Verbesserung
  console.log('🧠 SCHRITT 3: Semantische Verbesserung');
  processedText = await performSemanticImprovement(processedText, contextData, useAICorrection);
  console.log('✅ Schritt 3 abgeschlossen:', processedText);
  
  // SCHRITT 4: Finale Optimierung
  console.log('✨ SCHRITT 4: Finale Optimierung');
  processedText = await performFinalOptimization(processedText, contextData);
  console.log('✅ Schritt 4 abgeschlossen:', processedText);
  
  console.log('🎯 Multi-Step Processing abgeschlossen:', processedText);
  return processedText.trim();
};

// SCHRITT 1: Grundlegende Bereinigung
const performBasicCleaning = async (text: string): Promise<string> => {
  let cleanedText = text;
  
  // 1.1 Entferne Füllwörter und Geräusche
  cleanedText = removeFillersAndNoises(cleanedText);
  console.log('  ✂️ Füllwort-Entfernung:', cleanedText);
  
  // 1.2 Korrigiere häufige Fehler
  cleanedText = correctCommonErrors(cleanedText);
  console.log('  🔧 Fehlerkorrektur:', cleanedText);
  
  // 1.3 Verbessere grundlegende Satzstruktur
  cleanedText = improveSentenceStructure(cleanedText);
  console.log('  📝 Strukturverbesserung:', cleanedText);
  
  return cleanedText;
};

// SCHRITT 2: Kontextuelle Analyse
const performContextualAnalysis = async (text: string): Promise<{
  domains: string[];
  entities: any[];
  sentences: string[];
  semantics: number[][];
}> => {
  // 2.1 Domänen-Erkennung
  const detectedDomains = detectDomain(text);
  console.log('  🏷️ Domänen-Erkennung:', detectedDomains);
  
  // 2.2 Named Entity Recognition
  const entities = await extractNamedEntities(text);
  console.log('  🎭 Entity-Extraktion:', entities.length, 'Entitäten');
  
  // 2.3 Satz-Segmentierung
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  console.log('  📊 Satz-Segmentierung:', sentences.length, 'Sätze');
  
  // 2.4 Semantische Analyse
  const semantics = await analyzeSentenceSemantics(sentences);
  console.log('  🧮 Semantische Analyse:', semantics.length, 'Embeddings');
  
  return {
    domains: detectedDomains,
    entities,
    sentences,
    semantics
  };
};

// SCHRITT 3: Semantische Verbesserung
const performSemanticImprovement = async (
  text: string, 
  contextData: any, 
  useAICorrection: boolean
): Promise<string> => {
  let improvedText = text;
  
  // 3.1 Kontextuelle Basis-Verbesserungen
  improvedText = applyContextualImprovements(improvedText);
  console.log('  🎯 Kontextuelle Verbesserungen:', improvedText);
  
  // 3.2 Domänen-spezifische Korrekturen
  if (contextData.domains.length > 0) {
    improvedText = applyDomainSpecificCorrections(improvedText, contextData.domains);
    console.log('  🎓 Domänen-spezifische Korrekturen:', improvedText);
  }
  
  // 3.3 Erweiterte AI-basierte Korrekturen (optional)
  if (useAICorrection && improvedText.length > 10) {
    const aiContext = {
      domains: contextData.domains,
      entities: contextData.entities,
      semantics: contextData.semantics
    };
    
    improvedText = await applyAdvancedAICorrection(improvedText, aiContext);
    console.log('  🤖 AI-basierte Korrekturen:', improvedText);
  }
  
  return improvedText;
};

// SCHRITT 4: Finale Optimierung
const performFinalOptimization = async (text: string, contextData: any): Promise<string> => {
  let optimizedText = text;
  
  // 4.1 Finale Strukturoptimierung
  optimizedText = applyFinalStructureOptimization(optimizedText);
  console.log('  🔧 Struktur-Optimierung:', optimizedText);
  
  // 4.2 Konsistenz-Prüfung basierend auf Kontext
  optimizedText = applyConsistencyCheck(optimizedText, contextData);
  console.log('  ✅ Konsistenz-Prüfung:', optimizedText);
  
  // 4.3 Finale Politur
  optimizedText = applyFinalPolish(optimizedText);
  console.log('  ✨ Finale Politur:', optimizedText);
  
  return optimizedText;
};

// Hilfsfunktionen für Schritt 4
const applyFinalStructureOptimization = (text: string): string => {
  let optimized = text;
  
  // Optimiere Absatzstrukturen für längere Texte
  if (text.length > 200) {
    // Füge Absätze bei semantischen Brüchen hinzu
    optimized = optimized.replace(/(\. )([A-ZÄÖÜ][^.]{50,})/g, '$1\n\n$2');
  }
  
  // Optimiere Listen-Erkennungen
  optimized = optimized.replace(/(\d+\.) /g, '\n$1 ');
  optimized = optimized.replace(/^(\n)+/, ''); // Entferne führende Zeilenumbrüche
  
  return optimized;
};

const applyConsistencyCheck = (text: string, contextData: any): string => {
  let consistent = text;
  
  // Konsistente Terminologie basierend auf erkannten Domänen
  if (contextData.domains.includes('technical')) {
    consistent = consistent.replace(/maschiene/gi, 'Maschine');
    consistent = consistent.replace(/messure/gi, 'Messung');
  }
  
  if (contextData.domains.includes('medical')) {
    consistent = consistent.replace(/patiente?/gi, 'Patient');
    consistent = consistent.replace(/diagnos/gi, 'Diagnose');
  }
  
  return consistent;
};

const applyFinalPolish = (text: string): string => {
  let polished = text;
  
  // Finale Leerraum-Optimierung
  polished = polished.replace(/\s{3,}/g, ' ');
  polished = polished.replace(/\n{3,}/g, '\n\n');
  
  // Entferne ungewöhnliche Zeichen-Kombinationen
  polished = polished.replace(/[^\w\säöüÄÖÜß.!?,;:()\-"\n]/g, '');
  
  // Stelle sicher, dass der Text angemessen endet
  polished = polished.trim();
  if (polished && !polished.match(/[.!?]$/)) {
    polished += '.';
  }
  
  return polished;
};

// Erweiterte Vorschau-Funktion für KI-basierte Textverbesserungen
export const previewTextImprovements = async (originalText: string): Promise<{
  original: string;
  withoutFillers: string;
  withErrorCorrection: string;
  withStructureImprovement: string;
  withContextualImprovements: string;
  detectedDomains: string[];
  entities: any[];
  final: string;
}> => {
  const withoutFillers = removeFillersAndNoises(originalText);
  const withErrorCorrection = correctCommonErrors(withoutFillers);
  const withStructureImprovement = improveSentenceStructure(withErrorCorrection);
  const withContextualImprovements = applyContextualImprovements(withStructureImprovement);
  
  // Erweiterte Analyse
  const detectedDomains = detectDomain(withContextualImprovements);
  const entities = await extractNamedEntities(withContextualImprovements);
  
  // Domänen-spezifische Korrekturen anwenden
  let final = withContextualImprovements;
  if (detectedDomains.length > 0) {
    final = applyDomainSpecificCorrections(final, detectedDomains);
  }
  
  return {
    original: originalText,
    withoutFillers,
    withErrorCorrection,
    withStructureImprovement,
    withContextualImprovements,
    detectedDomains,
    entities,
    final
  };
};

// Hilfsfunktion für Domänen-Informationen
export const getDomainInfo = () => ({
  patterns: DOMAIN_PATTERNS,
  corrections: DOMAIN_CORRECTIONS
});

// Hilfsfunktion zum Testen der KI-Modelle
export const testAIModels = async (): Promise<{
  textCorrection: boolean;
  sentenceEmbedding: boolean;
  ner: boolean;
}> => {
  const results = {
    textCorrection: false,
    sentenceEmbedding: false,
    ner: false
  };
  
  try {
    const textModel = await initTextCorrectionModel();
    results.textCorrection = !!textModel;
  } catch (error) {
    console.warn('Text correction model test failed:', error);
  }
  
  try {
    const embeddingModel = await initSentenceEmbeddingModel();
    results.sentenceEmbedding = !!embeddingModel;
  } catch (error) {
    console.warn('Sentence embedding model test failed:', error);
  }
  
  try {
    const nerModel = await initNERModel();
    results.ner = !!nerModel;
  } catch (error) {
    console.warn('NER model test failed:', error);
  }
  
  return results;
};
