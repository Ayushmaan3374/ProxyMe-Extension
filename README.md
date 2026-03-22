# 🚀 ProxyMe Agent — AI Meeting Assistant

**ProxyMe Agent** is a Chrome Extension + Backend system that enables real-time AI participation in online meetings (Google Meet).
It listens for a trigger name, processes speech using AI, and responds naturally — acting as your intelligent meeting proxy.

---

## ✨ Key Features

### 🎤 Real-Time Voice Interaction

* Continuously listens for a **custom trigger name**
* Converts speech → text → AI response → speech
* Fully hands-free interaction inside meetings

---

### 🧠 Context-Aware AI Responses

* Upload meeting context (agenda, notes, etc.)
* AI uses this context to generate **relevant and accurate responses**
* Supports **follow-up commands** like:

  * *continue*
  * *simpler*
  * *summarize*
  * *example*

---

### 👥 Host & Attendee Modes (Unified Experience)

* Both roles now have:

  * Toggle ON/OFF control
  * Live listening status (Listening / Thinking / Speaking)
  * Real-time transcription box
* Identical UI & functionality across roles

---

### 🔒 Meeting-Based Validation

* Ensures the assistant only works in **registered meetings**
* Prevents accidental activation in unrelated tabs
* Double-layer protection:

  * Start-time validation
  * Runtime meeting ID verification

---

### 🎛️ Smart Toggle Control

* Enable/disable listening instantly
* Stops:

  * Speech recognition
  * AI processing
  * Voice output
* Fully synchronized with UI state

---

### 🧾 Live Transcription

* Displays real-time speech input
* Separate transcript boxes for host & attendee
* Helps track conversation flow clearly

---

### 🔄 Interruption Handling

* AI stops speaking immediately when user speaks
* Ensures natural conversation flow
* No overlapping audio

---

### 🌐 Backend Intelligence (Flask + Gemini AI)

* Uses **Google Gemini (genai)** for responses
* Features:

  * Lazy summarization of context
  * Follow-up query handling
  * Context memory per meeting
* PostgreSQL-backed storage

---

### 🗂️ Smart Context Management

* Upload `.txt` context files
* Stored per:

  * meeting ID
  * participant name
* Automatic cleanup:

  * Time-based expiry
  * FIFO-based pruning

---

### ⚡ Name Auto-Fetch (Attendee Mode)

* Automatically assigns names from backend
* Eliminates manual setup for attendees
* Ensures meeting consistency

---

## 🏗️ Architecture Overview

```
Chrome Extension (Popup + Content Script)
        ↓
Speech Recognition (Browser)
        ↓
Trigger Detection
        ↓
Backend API (Flask)
        ↓
Gemini AI Processing
        ↓
Response → Speech Synthesis
        ↓
UI Update (Transcript + Status)
```

---

## 🧩 Tech Stack

### Frontend (Extension)

* JavaScript (Vanilla)
* Chrome Extension APIs
* Web Speech API

### Backend

* Python (Flask)
* Google Gemini AI (`google-genai`)
* PostgreSQL (psycopg2)

---

## 📦 Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd proxyme-agent
```

---

### 2. Setup Backend

```bash
pip install -r requirements.txt
```

Set environment variables:

```
GEMINI_API_KEY=your_key
DATABASE_URL=your_db_url
```

Run server:

```bash
python app.py
```

---

### 3. Load Chrome Extension

1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select project folder

---

## ▶️ Usage

1. Open Google Meet
2. Launch extension
3. Choose:

   * Represent yourself OR fetch from backend
4. Select role (Host / Attendee)
5. Start speaking using trigger name

Example:

```
"Hey Ayushmaan, summarize the agenda"
```

---

## ⚠️ Important Notes

* Works only on **Google Meet**
* Requires microphone permissions
* AI voice is **local (not broadcast to others)** unless routed externally

---

## 🚀 Future Improvements

* Per-device toggle (local storage)
* Audio routing to meeting participants
* Multi-user sync & coordination
* Enhanced UI feedback (invalid meeting state)
* Live interim transcription

---

## 🤝 Contribution

Feel free to fork, improve, and contribute to the project!

---

## 💡 Final Thought

ProxyMe Agent transforms meetings into **AI-assisted conversations**, helping you respond intelligently, instantly, and effortlessly.

---
