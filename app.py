from flask import Flask, render_template, jsonify, request
import feedparser
import re
import html
import time
import requests

app = Flask(__name__)

# Simple cache dictionary
feed_cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes cache

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def html_to_text(html_str):
    if not html_str:
        return ""
    # Replace list items with bullets
    text = re.sub(r'<li>\s*', '\n- ', html_str)
    # Replace paragraphs and line breaks
    text = re.sub(r'</p>\s*', '\n\n', text)
    text = re.sub(r'<br\s*/?>\s*', '\n', text)
    # Remove all other tags
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', text)
    # Decode HTML entities
    text = html.unescape(text)
    # Normalize lines
    lines = [line.strip() for line in text.split('\n')]
    # Remove duplicate empty lines
    result = []
    for line in lines:
        if line:
            result.append(line)
        elif not result or result[-1] != '':
            result.append('')
    return '\n'.join(result).strip()

def fetch_and_parse_feed():
    # Fetch feed content using requests first to handle network timeouts nicely
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        # Parse xml feed
        feed = feedparser.parse(response.content)
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None

    if not feed or not feed.entries:
        return None

    parsed_items = []
    for entry in feed.entries:
        title = entry.get('title', 'Unknown Date')
        link = entry.get('link', 'https://docs.cloud.google.com/bigquery/docs/release-notes')
        published = entry.get('published') or entry.get('updated', '')
        entry_id = entry.get('id', '')
        
        # Get raw content/summary
        content_val = ""
        if 'content' in entry and entry.content:
            content_val = entry.content[0].value
        else:
            content_val = entry.get('summary', '')

        # Split content by <h3> headers
        parts = re.split(r'(<h3>.*?</h3>)', content_val)

        if len(parts) <= 1:
            # No h3 tags, treat as single item with category 'General'
            clean_text = html_to_text(content_val)
            parsed_items.append({
                "id": f"{entry_id}_0",
                "date": title,
                "link": link,
                "published": published,
                "category": "General",
                "content_html": content_val.strip(),
                "content_text": clean_text,
                "raw_title": title
            })
            continue

        item_index = 0
        i = 1
        while i < len(parts):
            header = parts[i]
            body = parts[i+1] if i+1 < len(parts) else ""
            
            # Extract category name
            cat_match = re.search(r'<h3>(.*?)</h3>', header)
            category = cat_match.group(1) if cat_match else "General"
            
            clean_text = html_to_text(body)
            
            parsed_items.append({
                "id": f"{entry_id}_{item_index}",
                "date": title,
                "link": f"{link}#{title.replace(' ', '_').replace(',', '')}",
                "published": published,
                "category": category,
                "content_html": body.strip(),
                "content_text": clean_text,
                "raw_title": title
            })
            item_index += 1
            i += 2

    return parsed_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # If cached data is valid and no refresh is forced, return cache
    if not force_refresh and feed_cache["data"] and (current_time - feed_cache["last_fetched"] < CACHE_DURATION):
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_fetched": feed_cache["last_fetched"],
            "data": feed_cache["data"]
        })
        
    # Otherwise fetch new data
    data = fetch_and_parse_feed()
    if data is not None:
        feed_cache["data"] = data
        feed_cache["last_fetched"] = current_time
        return jsonify({
            "status": "success",
            "source": "network",
            "last_fetched": current_time,
            "data": data
        })
    else:
        # Fallback to cache if network fetch failed
        if feed_cache["data"]:
            return jsonify({
                "status": "partial_success",
                "source": "cache_fallback",
                "message": "Failed to fetch from Google feed. Showing cached copy.",
                "last_fetched": feed_cache["last_fetched"],
                "data": feed_cache["data"]
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to fetch release notes feed and no cache is available."
            }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
