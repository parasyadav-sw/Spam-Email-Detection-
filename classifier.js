// Naive Bayes Spam Classifier module

// Common English stop-words to optionally filter out
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at", 
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant", "cannot", "could", 
  "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during", "each", "few", "for", 
  "from", "further", "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes", 
  "her", "here", "heres", "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", "ill", "im", 
  "ive", "if", "in", "into", "is", "isnt", "it", "its", "itself", "lets", "me", "more", "most", "mustnt", "my", 
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", 
  "ourselves", "out", "over", "own", "same", "shant", "she", "shed", "shell", "shes", "should", "shouldnt", 
  "so", "some", "such", "than", "that", "thats", "the", "their", "theirs", "them", "themselves", "then", 
  "there", "theres", "these", "they", "theyd", "theyll", "theyre", "theyve", "this", "those", "through", 
  "to", "too", "under", "until", "up", "very", "was", "wasnt", "we", "wed", "well", "were", "weve", "werent", 
  "what", "whats", "when", "whens", "where", "wheres", "which", "while", "who", "whos", "whom", "why", "whys", 
  "with", "wont", "would", "wouldnt", "you", "youd", "youll", "youre", "youve", "your", "yours", "yourself", 
  "yourselves"
]);

class SpamClassifier {
  constructor(settings = {}) {
    this.alpha = settings.alpha ?? 1.0;                  // Laplace smoothing
    this.lowercase = settings.lowercase ?? true;          // Convert text to lowercase
    this.removeStopWords = settings.removeStopWords ?? false; // Strip stop words
    this.minWordLength = settings.minWordLength ?? 2;     // Minimum word size to consider
    
    // Model state
    this.vocabulary = new Set();
    this.spamWordCounts = {}; // word -> count in spam
    this.hamWordCounts = {};  // word -> count in ham
    this.totalSpamWords = 0;  // sum of counts of all words in spam
    this.totalHamWords = 0;   // sum of counts of all words in ham
    
    this.numSpamDocs = 0;
    this.numHamDocs = 0;
    this.totalDocs = 0;
  }

  // Tokenize text into words based on active configurations
  tokenize(text) {
    if (!text) return [];
    
    let processed = text;
    if (this.lowercase) {
      processed = processed.toLowerCase();
    }
    
    // Replace hyphens and slashes with spaces, strip other punctuation
    processed = processed.replace(/[-/]/g, ' ');
    processed = processed.replace(/[^\w\s']/g, ''); // Keep words and single quotes (e.g. you've, it's)
    
    // Split on spaces
    const tokens = processed.split(/\s+/);
    
    // Filter tokens
    return tokens
      .map(t => t.trim())
      .filter(token => {
        if (token.length < this.minWordLength) return false;
        if (this.removeStopWords && STOP_WORDS.has(token)) return false;
        // Ignore purely numeric values to prevent training noise, but keep mixed (e.g. $1000, 24h)
        if (/^\d+$/.test(token)) return false;
        return true;
      });
  }

  // Train the Naive Bayes model on a given dataset
  train(dataset) {
    // Reset state
    this.vocabulary.clear();
    this.spamWordCounts = {};
    this.hamWordCounts = {};
    this.totalSpamWords = 0;
    this.totalHamWords = 0;
    this.numSpamDocs = 0;
    this.numHamDocs = 0;
    this.totalDocs = dataset.length;

    dataset.forEach(item => {
      const tokens = this.tokenize(item.text);
      const isSpam = item.label === "spam";
      
      if (isSpam) {
        this.numSpamDocs++;
      } else {
        this.numHamDocs++;
      }

      tokens.forEach(token => {
        this.vocabulary.add(token);
        if (isSpam) {
          this.spamWordCounts[token] = (this.spamWordCounts[token] || 0) + 1;
          this.totalSpamWords++;
        } else {
          this.hamWordCounts[token] = (this.hamWordCounts[token] || 0) + 1;
          this.totalHamWords++;
        }
      });
    });
  }

  // Classify a message
  classify(text) {
    if (this.totalDocs === 0) {
      return { label: "ham", confidence: 0.5, spamScore: 0, hamScore: 0, wordProbabilities: [] };
    }

    const tokens = this.tokenize(text);
    
    // Priors (P(Spam) and P(Ham))
    const pSpam = this.numSpamDocs / this.totalDocs;
    const pHam = this.numHamDocs / this.totalDocs;

    // Calculate logs of priors (handling zero counts gracefully)
    let logSpamScore = Math.log(pSpam || 0.0001);
    let logHamScore = Math.log(pHam || 0.0001);

    const vocabSize = this.vocabulary.size;
    const wordProbabilities = [];

    // Calculate likelihoods
    tokens.forEach(token => {
      // P(token | Spam) with Laplace smoothing
      const spamCount = this.spamWordCounts[token] || 0;
      const pWordSpam = (spamCount + this.alpha) / (this.totalSpamWords + this.alpha * vocabSize);
      
      // P(token | Ham) with Laplace smoothing
      const hamCount = this.hamWordCounts[token] || 0;
      const pWordHam = (hamCount + this.alpha) / (this.totalHamWords + this.alpha * vocabSize);

      logSpamScore += Math.log(pWordSpam);
      logHamScore += Math.log(pWordHam);

      // Save individual token statistics for highlight mapping
      // We also compute the posterior probability: P(Spam | token) assuming equal priors
      const totalLikelihood = pWordSpam + pWordHam;
      const spamProbability = totalLikelihood > 0 ? pWordSpam / totalLikelihood : 0.5;
      
      // Classify the word's impact: strong spam, weak spam, neutral, weak ham, strong ham
      let category = "neutral";
      if (spamProbability > 0.75) category = "spam-strong";
      else if (spamProbability > 0.55) category = "spam-weak";
      else if (spamProbability < 0.25) category = "ham-strong";
      else if (spamProbability < 0.45) category = "ham-weak";

      wordProbabilities.push({
        word: token,
        spamProb: pWordSpam,
        hamProb: pWordHam,
        posteriorSpam: spamProbability,
        category: category,
        spamCount: spamCount,
        hamCount: hamCount
      });
    });

    // Normalize log probabilities to [0, 1] range safely
    // P(Spam|text) = e^logSpamScore / (e^logSpamScore + e^logHamScore)
    // To prevent underflow, subtract max log score:
    const maxScore = Math.max(logSpamScore, logHamScore);
    const expSpam = Math.exp(logSpamScore - maxScore);
    const expHam = Math.exp(logHamScore - maxScore);
    const confidence = expSpam / (expSpam + expHam);

    return {
      label: confidence >= 0.5 ? "spam" : "ham",
      confidence: confidence, // probability of spam
      spamScore: logSpamScore,
      hamScore: logHamScore,
      wordProbabilities: wordProbabilities
    };
  }

  // K-Fold Cross-Validation to assess accuracy, precision, recall, F1
  evaluate(dataset, kFolds = 5) {
    if (dataset.length < kFolds) {
      throw new Error(`Dataset size must be at least ${kFolds} for cross-validation.`);
    }

    // Shuffle the dataset copy
    const shuffled = [...dataset].sort(() => Math.random() - 0.5);
    
    // Split into folds
    const folds = Array.from({ length: kFolds }, () => []);
    shuffled.forEach((item, index) => {
      folds[index % kFolds].push(item);
    });

    let tp = 0; // True Positive (Spam correctly classified as Spam)
    let fp = 0; // False Positive (Ham incorrectly classified as Spam)
    let tn = 0; // True Negative (Ham correctly classified as Ham)
    let fn = 0; // False Negative (Spam incorrectly classified as Ham)

    // Run training/testing for each fold
    for (let i = 0; i < kFolds; i++) {
      const testSet = folds[i];
      const trainSet = folds.flatMap((fold, idx) => (idx === i ? [] : fold));

      // Train on (K - 1) folds
      const foldClassifier = new SpamClassifier({
        alpha: this.alpha,
        lowercase: this.lowercase,
        removeStopWords: this.removeStopWords,
        minWordLength: this.minWordLength
      });
      foldClassifier.train(trainSet);

      // Test on remaining fold
      testSet.forEach(item => {
        const result = foldClassifier.classify(item.text);
        const actualLabel = item.label;
        const predictedLabel = result.label;

        if (actualLabel === "spam") {
          if (predictedLabel === "spam") {
            tp++;
          } else {
            fn++;
          }
        } else {
          if (predictedLabel === "spam") {
            fp++;
          } else {
            tn++;
          }
        }
      });
    }

    const accuracy = (tp + tn) / dataset.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      tp, fp, tn, fn,
      accuracy,
      precision,
      recall,
      f1,
      total: dataset.length
    };
  }

  // Returns all learned terms and counts, sorted
  getVocabularyData() {
    const list = [];
    this.vocabulary.forEach(word => {
      const spamC = this.spamWordCounts[word] || 0;
      const hamC = this.hamWordCounts[word] || 0;
      const total = spamC + hamC;
      
      const pWordSpam = (spamC + this.alpha) / (this.totalSpamWords + this.alpha * this.vocabulary.size);
      const pWordHam = (hamC + this.alpha) / (this.totalHamWords + this.alpha * this.vocabulary.size);
      
      // Spam ratio: high values mean strong spam affinity
      const spamRatio = pWordSpam / pWordHam;

      list.push({
        word,
        spamCount: spamC,
        hamCount: hamC,
        totalCount: total,
        pSpam: pWordSpam,
        pHam: pWordHam,
        ratio: spamRatio
      });
    });

    return list;
  }
}

// Expose globally
window.SpamClassifier = SpamClassifier;
