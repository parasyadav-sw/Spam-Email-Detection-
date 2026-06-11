# Implementation Plan: SpamSentinel (Email Spam Detector Web App)

We will build **SpamSentinel**, a premium, interactive, client-side email spam classifier and machine learning dashboard. It will run entirely in the browser using a custom Naive Bayes classifier implemented in vanilla JavaScript. This architecture guarantees total privacy, zero server dependencies, and instant, real-time visual feedback.

## User Review Required

> [!NOTE]
> **Client-Side Architecture**: The spam classifier will run entirely in the user's browser using JavaScript. No external APIs or servers are used. This allows us to offer real-time classification as the user types, interactive word-highlighting, and instant retraining of the model.

> [!TIP]
> **Pre-Seeded Dataset**: We will pre-populate the application with a curated dataset of ~100 diverse email/SMS messages (both spam and legitimate "ham") so the model is fully functional right after loading.

## Proposed Changes

We will create the web project directly in your preferred directory: `C:\Users\internship\OneDrive\Desktop\AIML\Spam Email Detection`.

### SpamSentinel Application

```
Spam Email Detection/
├── index.html          # Main HTML structure with tab-based dashboard
├── style.css           # Premium vanilla CSS with dark mode, animations, glassmorphism
├── classifier.js       # Naive Bayes Classifier & metrics calculations
├── dataset.js          # Pre-seeded training data
└── app.js              # DOM controller, event handlers, and visualization
```

---

#### [NEW] [index.html](file:///C:/Users/internship/OneDrive/Desktop/AIML/Spam%20Email%20Detection/index.html)
The core page structure incorporating:
- **Header**: Modern branding with dynamic status indicator ("Model Trained & Ready").
- **Sidebar Navigation**: Dashboard tabs:
  - *Sandbox*: Live email testing, gauge meters, and word-by-word probability highlighting.
  - *Dataset Manager*: View training data, add new examples, reset dataset, import/export.
  - *Vocabulary*: Explorable table of words, their spammy/hammy counts, and conditional probabilities.
  - *Analytics*: Model metrics (Accuracy, Precision, Recall, F1) and a visual Confusion Matrix.
  - *Settings*: Classifier configuration (Laplace smoothing, case folding, stop-word removal).
- **Modals**: Standardized modal for adding custom training items.

#### [NEW] [style.css](file:///C:/Users/internship/OneDrive/Desktop/AIML/Spam%20Email%20Detection/style.css)
- Custom CSS design tokens (HSL palette: deep purple primary, emerald green success, coral red warning, charcoal backgrounds).
- Glassmorphic panels with subtle borders, backdrops, and drop shadows.
- Fully responsive layout (flexbox/grid) with a collapsible sidebar for mobile.
- Custom keyframe animations for entry transitions, meter filling, and word highlighting.
- Highlight styles: Soft background overlays for words based on their spam-probability ratio.

#### [NEW] [classifier.js](file:///C:/Users/internship/OneDrive/Desktop/AIML/Spam%20Email%20Detection/classifier.js)
- **Tokenization Engine**: Stripping punctuation, lowecasing, optional stop-word filtration.
- **Naive Bayes Core**:
  - Track vocabulary, document counts, and word-frequency frequencies per class (spam/ham).
  - Compute log-likelihoods to avoid floating-point underflow:
    $$\log P(\text{Spam} | \text{words}) \propto \log P(\text{Spam}) + \sum \log P(w_i | \text{Spam})$$
  - Support Laplace smoothing adjustment.
- **Evaluation Engine**:
  - Run 5-fold cross-validation or train/test split on the active dataset.
  - Output: Confusion Matrix (TP, FP, TN, FN), Accuracy, Precision, Recall, and F1-score.

#### [NEW] [dataset.js](file:///C:/Users/internship/OneDrive/Desktop/AIML/Spam%20Email%20Detection/dataset.js)
- A collection of ~100 distinct messages:
  - **Spam**: High-frequency terms like "win money", "urgent security alert", "investment opportunity", "click link", "limited time offer".
  - **Ham (Not Spam)**: Normal business text, meeting requests, casual conversations, project updates.
- Exported as a static array of objects: `{ text: string, label: 'spam' | 'ham' }`.

#### [NEW] [app.js](file:///C:/Users/internship/OneDrive/Desktop/AIML/Spam%20Email%20Detection/app.js)
- Orchestrate tab navigation and layout updates.
- Bind real-time input textarea to run classification on keystroke or submit.
- Render visual indicators:
  - SVG radial progress bar for confidence.
  - Word highlights overlay in the results view.
  - Tabular view of learned vocabulary with filtering/sorting.
  - Interactive grid representing the Confusion Matrix.
- Manage local storage persistence so user additions/settings survive page refreshes.

---

## Verification Plan

### Manual Verification
1. Open the file [index.html](file:///C:/Users/internship/OneDrive/Desktop/AIML/Spam%20Email%20Detection/index.html) in a modern web browser.
2. Verify that the pre-seeded model trains successfully and shows 100% ready status.
3. **Sandbox Testing**:
   - Paste a standard spam message (e.g. "CONGRATULATIONS! You won a $1000 gift card, click here now!") and verify it is classified as **Spam** with high confidence.
   - Paste a standard ham message (e.g. "Hi team, let's meet tomorrow at 10 AM to discuss the project.") and verify it is classified as **Ham** (Not Spam).
   - Check that individual words are highlighted in red (for spam triggers) and green (for normal words) in the detailed breakdown.
4. **Dataset Management**:
   - Add a custom spam sentence, retrain, and verify that the model updates.
   - Verify importing/exporting works as expected.
5. **Analytics**:
   - Confirm that the cross-validation runs and displays valid statistics (Accuracy, Precision, Recall, F1) and a populated Confusion Matrix.
6. **Responsive Design**:
   - Test on various viewport sizes (mobile, tablet, desktop) to ensure layout integrity.
