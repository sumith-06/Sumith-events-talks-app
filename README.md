# BigQuery Release Notes Explorer 🚀

A premium, modern, single-page web dashboard to explore, search, filter, and share Google Cloud BigQuery release notes. This application is built with a Python Flask backend and a vanilla HTML, JavaScript, and CSS frontend.

---

## ✨ Features

- **Intelligent Release Splitting**: Google releases daily updates as one merged entry. This application automatically separates daily notes into individual, categorized cards (Announcement, Feature, Change, Breaking, Issue).
- **Fast In-Memory Cache**: Restricts redundant requests to Google's feed by caching updates for 5 minutes, keeping page loads fast.
- **Active Sync Engine**: Bypass the cache and force-fetch fresh feed data directly from GCP at any time.
- **Live Filtering and Search**: Instantly query dates, categories, or release content.
- **Dynamic Stats Widgets**: Dashboard headers count update types in real-time. Clicking any widget filters the feed to that category.
- **Interactive Tweet Composer**:
  - Open a mock X/Twitter card to preview updates.
  - Choose between 4 templates: **Standard**, **Short**, **Excited**, or **Professional**.
  - Auto-truncation guarantees details fit inside the **280 character limit** while keeping links and hashtags intact.
  - Real-time character counts and warning progression bars.
  - Easy share via X Web Intents.

---

## 📁 Project Structure

```text
Sumith-events-talk-app/
├── app.py                  # Flask Web server & XML parsing engine
├── templates/
│   └── index.html          # Main HTML structure & Tweet composer modal
├── static/
│   ├── css/
│   │   └── style.css       # Core stylesheet (Slate theme, layouts, animations)
│   └── js/
│       └── app.js          # Client-side state manager & dynamic renderer
├── .gitignore              # Ignores venv, caches, and OS temp files
├── requirements.txt        # Python package dependencies
└── README.md               # Project documentation
```

---

## 🛠️ Tech Stack

- **Backend**: Python 3.7+, Flask, requests, feedparser
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, CSS Grid/Flexbox), Vanilla JS (ES6)
- **Icons**: FontAwesome v6
- **Typography**: Google Fonts (Inter)

---

## 🚀 Getting Started

### Prerequisites
Make sure Python 3.7 or higher is installed on your system.

### 1. Clone & Navigate
```bash
git clone https://github.com/sumith-06/Sumith-events-talk-app.git
cd Sumith-events-talk-app
```

### 2. Setup Virtual Environment
Initialize a Python virtual environment to contain dependencies:
* **Windows**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\activate
  ```
* **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
Launch the Flask development server:
```bash
python app.py
```

### 5. Access the Web App
Open your web browser and go to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📝 License

This project is licensed under the MIT License.
