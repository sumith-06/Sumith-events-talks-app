// App JavaScript Logic for BigQuery Release Notes

document.addEventListener("DOMContentLoaded", () => {
    // State management
    let releaseNotes = [];
    let filteredNotes = [];
    let currentFilter = "All";
    let searchQuery = "";
    let activeTweetNote = null;
    let selectedTemplateStyle = "standard";

    // DOM Elements
    const notesGrid = document.getElementById("notes-grid");
    const skeletonLoader = document.getElementById("skeleton-loader");
    const errorState = document.getElementById("error-state");
    const errorMessage = document.getElementById("error-message");
    const emptyState = document.getElementById("empty-state");
    const searchInput = document.getElementById("search-input");
    const clearSearchBtn = document.getElementById("clear-search-btn");
    const refreshBtn = document.getElementById("refresh-btn");
    const refreshIcon = document.getElementById("refresh-icon");
    const retryBtn = document.getElementById("retry-btn");
    const resetFiltersBtn = document.getElementById("reset-filters-btn");
    
    // Status Banner Elements
    const feedStatusBanner = document.getElementById("feed-status-banner");
    const feedStatusText = document.getElementById("feed-status-text");
    const feedTimestampText = document.getElementById("feed-timestamp-text");

    // Filter Buttons
    const categoryFilters = document.getElementById("category-filters");
    const filterTags = document.querySelectorAll(".filter-tag");
    const statCards = document.querySelectorAll(".stat-card");

    // Stats Counters
    const statTotal = document.getElementById("stat-total");
    const statFeatures = document.getElementById("stat-features");
    const statAnnouncements = document.getElementById("stat-announcements");
    const statChanges = document.getElementById("stat-changes");
    const statBreaking = document.getElementById("stat-breaking");

    // Tweet Modal Elements
    const tweetModal = document.getElementById("tweet-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const tweetTextarea = document.getElementById("tweet-textarea");
    const templateTabs = document.querySelectorAll(".template-tab");
    const charCount = document.getElementById("char-count");
    const charProgress = document.getElementById("char-progress");
    const copyTweetBtn = document.getElementById("copy-tweet-btn");
    const postTweetBtn = document.getElementById("post-tweet-btn");

    // Toast Element
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");
    const toastIcon = document.getElementById("toast-icon");

    // Initialize
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener("click", () => fetchReleases(true));
    retryBtn.addEventListener("click", () => fetchReleases(true));
    resetFiltersBtn.addEventListener("click", resetAllFilters);

    // Search events
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery.length > 0 ? "block" : "none";
        applyFilters();
    });

    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        searchQuery = "";
        clearSearchBtn.style.display = "none";
        searchInput.focus();
        applyFilters();
    });

    // Category filter events
    categoryFilters.addEventListener("click", (e) => {
        const target = e.target.closest(".filter-tag");
        if (!target) return;
        
        filterTags.forEach(tag => tag.classList.remove("active"));
        target.classList.add("active");
        
        currentFilter = target.getAttribute("data-category");
        applyFilters();
    });

    // Stat card click events (acts as category filter)
    statCards.forEach(card => {
        card.addEventListener("click", () => {
            const category = card.getAttribute("data-category");
            
            // Sync with category filters pills
            filterTags.forEach(tag => {
                if (tag.getAttribute("data-category") === category) {
                    tag.classList.add("active");
                } else {
                    tag.classList.remove("active");
                }
            });

            currentFilter = category;
            applyFilters();
            
            // Smooth scroll to control-bar or notes list
            document.querySelector(".control-bar").scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Tweet Modal Events
    closeModalBtn.addEventListener("click", closeTweetModal);
    tweetModal.addEventListener("click", (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    tweetTextarea.addEventListener("input", () => {
        updateCharCount();
    });

    templateTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            templateTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            selectedTemplateStyle = tab.getAttribute("data-style");
            generateTweetContent();
        });
    });

    copyTweetBtn.addEventListener("click", () => {
        const text = tweetTextarea.innerText;
        copyToClipboard(text, "Tweet copied to clipboard!");
    });

    postTweetBtn.addEventListener("click", () => {
        const text = tweetTextarea.innerText;
        if (text.length > 280) {
            showToast("Tweet exceeds the 280 character limit!", "error");
            return;
        }
        const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(intentUrl, "_blank", "width=600,height=400");
        closeTweetModal();
    });

    // Functions
    async function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        
        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            const resData = await response.json();

            if (resData.status === "success" || resData.status === "partial_success") {
                releaseNotes = resData.data;
                updateStats(releaseNotes);
                applyFilters();
                
                // Show status banner
                const lastFetchedDate = new Date(resData.last_fetched * 1000);
                const formatTime = lastFetchedDate.toLocaleTimeString();
                const formatDate = lastFetchedDate.toLocaleDateString();
                
                feedStatusText.textContent = resData.source === "cache" 
                    ? "Displaying Cached Release Notes" 
                    : "Fresh Release Notes Loaded";
                feedTimestampText.textContent = `Last Synced: ${formatDate} ${formatTime}`;
                feedStatusBanner.style.display = "flex";

                if (forceRefresh) {
                    showToast(resData.source === "network" ? "Feed updated successfully!" : "Feed fetched (cached copy).");
                }
            } else {
                showError(resData.message || "Failed to load release notes.");
            }
        } catch (err) {
            console.error("Error fetching releases:", err);
            showError("Network connection error. Check if the backend is running.");
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            skeletonLoader.style.display = "grid";
            notesGrid.style.display = "none";
            errorState.style.display = "none";
            emptyState.style.display = "none";
            refreshBtn.disabled = true;
            refreshIcon.classList.add("animate-spin");
        } else {
            skeletonLoader.style.display = "none";
            refreshBtn.disabled = false;
            refreshIcon.classList.remove("animate-spin");
        }
    }

    function showError(msg) {
        notesGrid.style.display = "none";
        errorState.style.display = "flex";
        errorMessage.textContent = msg;
    }

    function updateStats(notes) {
        const counts = {
            All: notes.length,
            Feature: 0,
            Announcement: 0,
            Change: 0,
            Breaking: 0,
            Issue: 0
        };

        notes.forEach(note => {
            if (counts[note.category] !== undefined) {
                counts[note.category]++;
            }
        });

        // Update DOM
        statTotal.textContent = counts.All;
        statFeatures.textContent = counts.Feature;
        statAnnouncements.textContent = counts.Announcement;
        statChanges.textContent = counts.Change;
        statBreaking.textContent = counts.Breaking;
    }

    function applyFilters() {
        filteredNotes = releaseNotes.filter(note => {
            // Category filter check
            const matchesCategory = currentFilter === "All" || note.category === currentFilter;
            
            // Search query check
            const matchesSearch = !searchQuery || 
                note.content_text.toLowerCase().includes(searchQuery) ||
                note.category.toLowerCase().includes(searchQuery) ||
                note.date.toLowerCase().includes(searchQuery);

            return matchesCategory && matchesSearch;
        });

        renderNotes();
    }

    function renderNotes() {
        notesGrid.innerHTML = "";

        if (filteredNotes.length === 0) {
            notesGrid.style.display = "none";
            emptyState.style.display = "flex";
            return;
        }

        emptyState.style.display = "none";
        errorState.style.display = "none";
        notesGrid.style.display = "grid";

        filteredNotes.forEach(note => {
            const card = document.createElement("div");
            card.className = "note-card";
            card.setAttribute("data-id", note.id);

            // Clean icon mapping for tags
            let categoryIcon = "fa-circle-info";
            if (note.category === "Feature") categoryIcon = "fa-star";
            else if (note.category === "Announcement") categoryIcon = "fa-bullhorn";
            else if (note.category === "Change") categoryIcon = "fa-sliders";
            else if (note.category === "Breaking") categoryIcon = "fa-triangle-exclamation";
            else if (note.category === "Issue") categoryIcon = "fa-circle-exclamation";

            card.innerHTML = `
                <div class="card-header">
                    <span class="category-tag tag-${note.category.toLowerCase()}">
                        <i class="fa-solid ${categoryIcon}"></i> ${note.category}
                    </span>
                    <span class="card-date">
                        <i class="fa-regular fa-calendar"></i> ${note.date}
                    </span>
                </div>
                <div class="card-content">
                    ${note.content_html}
                </div>
                <div class="card-footer">
                    <button class="btn-icon-only btn-doc" title="Open Official Release Notes" onclick="window.open('${note.link}', '_blank')">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                    <button class="btn-icon-only btn-copy" title="Copy text contents">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="btn-icon-only btn-share-tweet" title="Compose Tweet">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            `;

            // Event Listeners for action buttons inside card
            card.querySelector(".btn-copy").addEventListener("click", () => {
                copyToClipboard(note.content_text, "Release note content copied!");
            });

            card.querySelector(".btn-share-tweet").addEventListener("click", () => {
                openTweetModal(note);
            });

            notesGrid.appendChild(card);
        });
    }

    function resetAllFilters() {
        searchInput.value = "";
        searchQuery = "";
        clearSearchBtn.style.display = "none";
        
        filterTags.forEach(tag => {
            if (tag.getAttribute("data-category") === "All") {
                tag.classList.add("active");
            } else {
                tag.classList.remove("active");
            }
        });
        
        currentFilter = "All";
        applyFilters();
        showToast("Filters reset successfully!");
    }

    // Modal Logic
    function openTweetModal(note) {
        activeTweetNote = note;
        // Default to standard template style on load
        selectedTemplateStyle = "standard";
        templateTabs.forEach(t => {
            if (t.getAttribute("data-style") === "standard") {
                t.classList.add("active");
            } else {
                t.classList.remove("active");
            }
        });

        generateTweetContent();
        
        tweetModal.style.display = "flex";
        document.body.style.overflow = "hidden"; // Disable scroll behind
        tweetTextarea.focus();
    }

    function closeTweetModal() {
        tweetModal.style.display = "none";
        document.body.style.overflow = "auto";
        activeTweetNote = null;
    }

    function generateTweetContent() {
        if (!activeTweetNote) return;

        const date = activeTweetNote.date;
        const category = activeTweetNote.category;
        const link = activeTweetNote.link;
        const bodyText = activeTweetNote.content_text;

        let tweetText = "";

        // Truncation helper to fit inside 280 chars
        function buildTweet(prefix, suffix) {
            const staticLength = prefix.length + suffix.length + 4; // 4 extra chars for line breaks & buffer
            const allowedBodyLength = 280 - staticLength;
            
            let finalBody = bodyText;
            if (bodyText.length > allowedBodyLength) {
                finalBody = bodyText.substring(0, allowedBodyLength - 3) + "...";
            }
            
            return `${prefix}\n\n${finalBody}\n\n${suffix}`;
        }

        if (selectedTemplateStyle === "standard") {
            const prefix = `🚀 BigQuery ${category} (${date}):`;
            const suffix = `Details: ${link}\n#BigQuery #GCP`;
            tweetText = buildTweet(prefix, suffix);
        } 
        else if (selectedTemplateStyle === "brief") {
            // Keep it very minimal
            const prefix = `BigQuery [${category}]:`;
            const suffix = `${link} #GCP`;
            
            const staticLength = prefix.length + suffix.length + 2;
            const allowedBodyLength = 280 - staticLength;
            
            let finalBody = bodyText;
            if (bodyText.length > allowedBodyLength) {
                finalBody = bodyText.substring(0, allowedBodyLength - 3) + "...";
            }
            tweetText = `${prefix} ${finalBody} ${suffix}`;
        } 
        else if (selectedTemplateStyle === "excited") {
            const prefix = `Check this out! BigQuery just released a new ${category}! 🎉`;
            const suffix = `Read full docs: ${link}\n#BigQuery #Cloud #GCP`;
            tweetText = buildTweet(prefix, suffix);
        } 
        else if (selectedTemplateStyle === "formal") {
            const prefix = `Google Cloud Release Notice: BigQuery ${category} update.`;
            const suffix = `Reference Documentation: ${link}\n#BigQuery #GoogleCloud`;
            tweetText = buildTweet(prefix, suffix);
        }

        tweetTextarea.innerText = tweetText;
        updateCharCount();
    }

    function updateCharCount() {
        const text = tweetTextarea.innerText;
        const length = text.length;
        
        charCount.textContent = `${length} / 280`;
        
        // Character count percentage
        const pct = Math.min((length / 280) * 100, 100);
        charProgress.style.width = `${pct}%`;

        // Style updates based on length
        charCount.classList.remove("danger");
        charProgress.className = "progress-bar";
        postTweetBtn.disabled = false;

        if (length > 280) {
            charCount.classList.add("danger");
            charProgress.classList.add("danger");
            postTweetBtn.disabled = true;
        } else if (length > 250) {
            charProgress.classList.add("warn");
        }
    }

    // Clipboard and Toast helpers
    function copyToClipboard(text, message) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(message, "success");
        }).catch(err => {
            console.error('Could not copy text: ', err);
            // Fallback for non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(message, "success");
            } catch (err) {
                showToast("Failed to copy text", "error");
            }
            document.body.removeChild(textArea);
        });
    }

    function showToast(message, type = "success") {
        toastMessage.textContent = message;
        
        // Adjust icon and border border-left based on type
        if (type === "error") {
            toastIcon.className = "fa-solid fa-circle-xmark";
            toastIcon.style.color = "#ef4444";
            toast.style.borderLeftColor = "#ef4444";
        } else {
            toastIcon.className = "fa-solid fa-circle-check";
            toastIcon.style.color = "var(--color-feature)";
            toast.style.borderLeftColor = "var(--color-feature)";
        }
        
        toast.style.display = "flex";
        
        // Auto dismiss after 3 seconds
        if (window.toastTimer) clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => {
            toast.style.display = "none";
        }, 3000);
    }
});
