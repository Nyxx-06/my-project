const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Cache untuk data dan kategori
let dataCache = null;
let categoryCacheData = null;
let lastDataLoad = 0;
const CACHE_DURATION = 30000; // 30 detik cache

// Template HTML dengan CSS dan JavaScript embedded
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JAV-SUB {{current_page}}</title>
    <link rel="icon" type="image/png" href="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2nAUmxC6eY5Z9UArIaBnuaYFhh17cxlsgMf8Psn2mTw&s">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background-color: #1a1a1a;
            color: #ffffff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            padding-top: 55px;
            transition: padding-top 0.3s ease-in-out;
        }
        
        body.video-active {
            padding-top: 320px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 10px;
        }
        
        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0;
            padding: 5px 10px;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background-color: #1a1a1a;
            z-index: 1005;
        }
        
        h1 {
            font-size: 2em;
            font-weight: bold;
            font-style: normal;
            text-align: left;
        }

        .hamburger-menu {
            font-size: 1.5em;
            cursor: pointer;
            z-index: 1001;
            color: #fff;
            padding: 5px;
        }
        
        .category-menu-container {
            position: fixed;
            top: 0;
            right: 0;
            width: 300px;
            height: 100%;
            background-color: #2d2d2d;
            box-shadow: -4px 0 15px rgba(0,0,0,0.5);
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
            z-index: 1002;
            padding: 20px;
            display: flex;
            flex-direction: column;
        }

        .category-menu-container.open {
            transform: translateX(0);
        }

        .category-menu-container h2 {
            margin-bottom: 20px;
        }

        .category-menu-container ul {
            list-style-type: none;
            overflow-y: auto;
            flex-grow: 1;
        }

        .category-menu-container li {
            margin-bottom: 10px;
        }

        .category-menu-container a {
            color: #fff;
            text-decoration: none;
            font-size: 1.1em;
            display: block;
            padding: 8px;
            border-radius: 8px;
            transition: background-color 0.3s ease;
        }

        .category-menu-container a:hover {
            background-color: #444;
        }
        
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1001;
            display: none;
        }
        
        .overlay.active {
            display: block;
        }

        .search-container {
            text-align: center;
            margin-bottom: 20px;
            margin-top: 10px;
        }
        
        body.video-active .search-container {
            margin: 5px auto;
        }

        .search-container input[type="text"] {
            padding: 10px;
            width: 70%;
            max-width: 500px;
            border: 1px solid #444;
            border-radius: 8px;
            background-color: #333;
            color: #fff;
            font-size: 1em;
        }

        .search-container button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            background-color: #007bff;
            color: white;
            cursor: pointer;
            font-size: 1em;
            transition: background-color 0.3s ease;
        }

        .search-container button:hover {
            background-color: #0056b3;
        }

        .video-player-container {
            position: fixed;
            top: 55px;
            left: 0;
            width: 100%;
            background: none;
            z-index: 1000;
            padding: 0;
            box-shadow: none;
            display: none;
            transition: transform 0.3s ease-in-out;
            transform: translateY(-100%);
        }
        
        body.video-active .video-player-container {
            transform: translateY(0);
        }
        
        .video-card {
            background: none;
            border-radius: 0;
            overflow: hidden;
            box-shadow: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            margin: 0;
            position: relative;
        }
        
        .video-card .thumbnail {
            cursor: default;
            width: 100%;
            height: 250px;
        }

        .video-card .thumbnail::after {
            display: none;
        }

        .video-content-toggle {
            width: 100%;
            background: #2d2d2d;
            padding: 5px 20px;
        }
        
        #video-details {
            transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out;
            overflow: hidden;
            max-height: 200px;
            padding-top: 10px;
        }
        
        #video-details.hidden-details {
            max-height: 0;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
        }

        .hide-show-button {
            text-align: right;
            margin-top: 5px;
        }

        .hide-show-button h3 {
            cursor: pointer;
            color: #8c8c8c;
            font-size: 1em;
            display: inline-block;
            transition: color 0.3s ease;
        }

        .hide-show-button h3:hover {
            color: white;
        }

        @media (max-width: 767px) {
            .video-card .thumbnail {
                height: 200px;
            }
            body.video-active {
                padding-top: 305px;
            }
        }
        
        .grid {
            display: grid;
            gap: 20px;
            margin-bottom: 40px;
        }
        
        @media (max-width: 767px) {
            .grid { grid-template-columns: 1fr; }
        }
        
        @media (min-width: 768px) and (max-width: 1023px) {
            .grid { grid-template-columns: repeat(2, 1fr); }
        }
        
        @media (min-width: 1024px) {
            .grid { grid-template-columns: repeat(4, 1fr); }
        }
        
        .card {
            background: #2d2d2d;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        }

        .card.hidden-on-play {
            display: none;
        }
        
        .thumbnail {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            cursor: pointer;
        }
        
        .thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .thumbnail:hover img {
            transform: scale(1.05);
        }
        
        .thumbnail::after {
            content: '▶';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3em;
            color: white;
            text-shadow: 0 2px 4px rgba(0,0,0,0.7);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        
        .thumbnail:hover::after {
            opacity: 1;
        }

        .thumbnail.playing img {
            display: none !important;
        }
        
        .card-content {
            padding: 20px;
        }
        
        .title {
            font-size: 1.1em;
            font-weight: 600;
            margin-bottom: 12px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.4;
            min-height: 2.8em;
        }
        
        .categories {
            margin-bottom: 15px;
        }
        
        .badge {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            margin: 2px 4px 2px 0;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
        }
        
        .pagination {
            text-align: center;
            margin: 40px 0;
            display: flex;
            justify-content: center;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding: 0 10px;
        }
        
        .pagination a, .pagination span {
            display: inline-block;
            padding: 8px 12px;
            margin: 0 3px;
            background: #343a40;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.3s ease;
            font-size: 0.9em;
            white-space: nowrap;
        }
        
        .pagination a:hover {
            background: #495057;
        }
        
        .pagination .current {
            background: #007bff;
        }
        
        .pagination .disabled {
            background: #6c757d;
            cursor: not-allowed;
            opacity: 0.6;
        }
        
        .no-data {
            text-align: center;
            padding: 60px 20px;
            color: #999;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="overlay" id="overlay"></div>
    <div class="container">
        <div class="header-container">
            <h1><a href="/" style="text-decoration: none; color: inherit;">JAV-SUB</a></h1>
            <div class="hamburger-menu" id="hamburger-icon">☰</div>
        </div>

        <div class="category-menu-container" id="category-menu">
            <h2>Kategori</h2>
            <ul>
                {{category_list}}
            </ul>
        </div>
        
        <div class="search-container">
            <form action="/page/1" method="get">
                <input type="text" name="q" placeholder="Cari video..." value="{{query}}">
                <button type="submit">Cari</button>
            </form>
        </div>

        <div id="video-player-section" class="video-player-container">
            <div class="card video-card">
                <div id="video-thumbnail" class="thumbnail"></div>
                <div class="video-content-toggle">
                    <div id="video-details" class="hidden-details">
                        <div id="video-title" class="title"></div>
                        <div id="video-categories" class="categories"></div>
                    </div>
                    <div class="hide-show-button">
                        <h3 id="toggle-text" onclick="toggleVideoDetails()">show</h3>
                    </div>
                </div>
            </div>
        </div>
        
        {{content}}
        
        {{pagination}}
    </div>
<script>
        let previousVideoCard = null;
        const categoryMenu = document.getElementById('category-menu');
        const hamburgerIcon = document.getElementById('hamburger-icon');
        const overlay = document.getElementById('overlay');
        
        function playVideo(thumbnailElement) {
            const card = thumbnailElement.closest('.card');
            const videoUrl = card.dataset.urlVideo;
            const videoTitle = card.dataset.title;
            const categoriesString = card.dataset.categories;

            if (previousVideoCard) {
                previousVideoCard.classList.remove('hidden-on-play');
            }
            card.classList.add('hidden-on-play');
            previousVideoCard = card;

            const videoPlayerSection = document.getElementById('video-player-section');
            const videoThumbnail = document.getElementById('video-thumbnail');
            const videoTitleElement = document.getElementById('video-title');
            const videoCategoriesElement = document.getElementById('video-categories');
            const toggleText = document.getElementById('toggle-text');
            const videoDetails = document.getElementById('video-details');

            videoThumbnail.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.src = videoUrl + '?autoplay=1';
            iframe.allow = 'autoplay; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            videoThumbnail.appendChild(iframe);

            videoTitleElement.textContent = videoTitle;
            
            videoCategoriesElement.innerHTML = '';
            const categories = categoriesString ? categoriesString.split(',') : [];
            categories.forEach(category => {
                if (category) {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'badge';
                    newBadge.textContent = category;
                    videoCategoriesElement.appendChild(newBadge);
                }
            });

            videoDetails.classList.add('hidden-details');
            toggleText.textContent = 'show';

            videoPlayerSection.style.display = 'block';
            document.body.classList.add('video-active');

            // Update URL and add to history
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('video', videoUrl);
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            history.pushState({ videoUrl: videoUrl, page: '{{current_page}}', query: '{{query}}' }, '', newUrl);

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        function hideVideoPlayer() {
            const videoPlayerSection = document.getElementById('video-player-section');
            const videoThumbnail = document.getElementById('video-thumbnail');
            
            if (previousVideoCard) {
                previousVideoCard.classList.remove('hidden-on-play');
                previousVideoCard = null;
            }
            
            videoThumbnail.innerHTML = '';
            videoPlayerSection.style.display = 'none';
            document.body.classList.remove('video-active');
        }

        function toggleVideoDetails() {
            const videoDetails = document.getElementById('video-details');
            const toggleText = document.getElementById('toggle-text');

            if (videoDetails.classList.contains('hidden-details')) {
                videoDetails.classList.remove('hidden-details');
                toggleText.textContent = 'hide';
            } else {
                videoDetails.classList.add('hidden-details');
                toggleText.textContent = 'show';
            }
        }
        
        function openCategoryMenu() {
            categoryMenu.classList.add('open');
            overlay.classList.add('active');
            hamburgerIcon.textContent = '✕';
        }

        function closeCategoryMenu() {
            categoryMenu.classList.remove('open');
            overlay.classList.remove('active');
            hamburgerIcon.textContent = '☰';
        }

        hamburgerIcon.addEventListener('click', function(event) {
            event.stopPropagation();
            if (categoryMenu.classList.contains('open')) {
                closeCategoryMenu();
            } else {
                openCategoryMenu();
            }
        });

        overlay.addEventListener('click', function() {
            closeCategoryMenu();
        });

        document.addEventListener('click', function(event) {
            const isClickInsideMenu = categoryMenu.contains(event.target);
            const isClickOnHamburger = hamburgerIcon.contains(event.target);
            if (!isClickInsideMenu && !isClickOnHamburger && categoryMenu.classList.contains('open')) {
                closeCategoryMenu();
            }
        });

        // Handle browser/Android back button
        window.onpopstate = function(event) {
            const urlParams = new URLSearchParams(window.location.search);
            const videoUrl = urlParams.get('video');
            
            if (videoUrl) {
                const card = document.querySelector(\`.card[data-url-video="\${videoUrl}"]\`);
                if (card) {
                    playVideo(card.querySelector('.thumbnail'));
                }
            } else {
                hideVideoPlayer();
            }
        };

        // Check on initial load if there's a video parameter in the URL
        document.addEventListener('DOMContentLoaded', (event) => {
            const urlParams = new URLSearchParams(window.location.search);
            const videoUrl = urlParams.get('video');
            if (videoUrl) {
                const card = document.querySelector(\`.card[data-url-video="\${videoUrl}"]\`);
                if (card) {
                    playVideo(card.querySelector('.thumbnail'));
                }
            }
        });
    </script>
</body>
</html>
`;

// Load data dari cache atau file dengan optimasi
function loadData() {
    const now = Date.now();
    
    // Gunakan cache jika masih fresh
    if (dataCache && (now - lastDataLoad < CACHE_DURATION)) {
        return dataCache;
    }
    
    try {
        if (fs.existsSync('result.json')) {
            const rawData = fs.readFileSync('result.json', 'utf-8');
            const data = JSON.parse(rawData);
            dataCache = Array.isArray(data) ? data : [data];
        } else {
            console.log("Warning: result.json not found. Using sample data.");
            const sampleData = [
                {
                    "url": "https://example.com/post1",
                    "thumbnail": "https://via.placeholder.com/300x200/333/fff?text=Video+1",
                    "title": "Video Contoh 1 - Judul Yang Panjang Sekali Untuk Testing",
                    "categories": ["Technology", "Tutorial"],
                    "url_video": "https://www.youtube.com/embed/dQw4w9WgXcQ"
                },
                {
                    "url": "https://example.com/post2",
                    "thumbnail": "https://via.placeholder.com/300x200/666/fff?text=Video+2",
                    "title": "Video Contoh 2",
                    "categories": ["Entertainment", "Music"],
                    "url_video": "https://www.youtube.com/embed/dQw4w9WgXcQ"
                },
                {
                    "url": "https://example.com/post3",
                    "thumbnail": "https://via.placeholder.com/300x200/999/fff?text=Video+3",
                    "title": "Video Contoh 3",
                    "categories": ["Gaming"],
                    "url_video": "https://www.youtube.com/embed/tgbNymZ7vqY"
                },
                {
                    "url": "https://example.com/post4",
                    "thumbnail": "https://via.placeholder.com/300x200/000/fff?text=Video+4",
                    "title": "Video Contoh 4 - Judul Pendek",
                    "categories": ["Sports"],
                    "url_video": "https://www.youtube.com/embed/0G3_kmtwH6U"
                },
                {
                    "url": "https://example.com/post5",
                    "thumbnail": "https://via.placeholder.com/300x200/444/fff?text=Video+5",
                    "title": "Video Contoh 5",
                    "categories": ["Science", "Documentary"],
                    "url_video": "https://www.youtube.com/embed/FwFkM3hG34U"
                }
            ];
            
            // Repeat sample data 30 times
            dataCache = [];
            for (let i = 0; i < 30; i++) {
                dataCache.push(...sampleData);
            }
        }
        
        lastDataLoad = now;
        // Reset category cache ketika data berubah
        categoryCacheData = null;
        
        return dataCache;
    } catch (error) {
        console.error(`Error loading data: ${error}`);
        return dataCache || [];
    }
}

// Fungsi untuk menghitung kategori dengan cache
function getCategoryData() {
    if (categoryCacheData) {
        return categoryCacheData;
    }
    
    const data = loadData();
    const categoryCount = {};
    
    // Optimasi: gunakan for loop biasa yang lebih cepat
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.categories && Array.isArray(item.categories)) {
            for (let j = 0; j < item.categories.length; j++) {
                const cat = item.categories[j].toString().trim();
                if (cat) {
                    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                }
            }
        }
    }
    
    // Cache hasil
    categoryCacheData = Object.entries(categoryCount).sort((a, b) => a[0].localeCompare(b[0]));
    return categoryCacheData;
}

// Generate a list of up to 5 page numbers for pagination
function getPaginatedPages(currentPage, totalPages) {
    const pagesToShow = [];
    
    // Handle case where total pages are 5 or less
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) {
            pagesToShow.push(i);
        }
        return pagesToShow;
    }

    // Handle case where current page is near the beginning
    if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
            pagesToShow.push(i);
        }
    }
    // Handle case where current page is near the end
    else if (currentPage > totalPages - 3) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
            pagesToShow.push(i);
        }
    }
    // Handle all other cases (middle)
    else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
            pagesToShow.push(i);
        }
    }

    return pagesToShow;
}

// Template rendering function dengan optimasi
function renderTemplate(template, data) {
    let rendered = template;
    
    // Optimasi: gunakan regex yang sudah dikompile
    const replacements = [
        [/{{current_page}}/g, data.current_page || ''],
        [/{{query}}/g, data.query || ''],
        [/{{category_list}}/g, data.category_list || ''],
        [/{{content}}/g, data.content || ''],
        [/{{pagination}}/g, data.pagination || '']
    ];
    
    for (const [regex, value] of replacements) {
        rendered = rendered.replace(regex, value);
    }
    
    return rendered;
}

// Debug endpoint dengan optimasi
app.get('/debug/categories', (req, res) => {
    const startTime = Date.now();
    const data = loadData();
    const sortedCategories = getCategoryData();
    
    const result = {
        totalItems: data.length,
        totalCategories: sortedCategories.length,
        categories: Object.fromEntries(sortedCategories.map(([cat, count]) => [cat, { count }])),
        processingTime: Date.now() - startTime
    };
    
    res.json(result);
});

// Redirect to first page
app.get('/', (req, res) => {
    res.redirect('/page/1');
});

// Display paginated content dengan optimasi performa
app.get('/page/:page', (req, res) => {
    const startTime = Date.now();
    
    const data = loadData();
    const itemsPerPage = 25;
    let page = parseInt(req.params.page) || 1;
    const query = (req.query.q || '').toLowerCase().trim();

    // Gunakan category cache
    const sortedCategoryCounts = getCategoryData();

    // Optimasi filtering dengan early termination
    let filteredData = data;
    if (query) {
        const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
        filteredData = [];
        
        // Optimasi: gunakan for loop dan pre-compute strings
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const title = (item.title || '').toLowerCase();
            const categories = item.categories || [];
            
            // Check exact category match dulu (lebih cepat)
            let isMatch = false;
            for (let j = 0; j < categories.length; j++) {
                if (categories[j].toString().toLowerCase() === query) {
                    isMatch = true;
                    break;
                }
            }
            
            // Jika belum match, cek text match
            if (!isMatch) {
                const itemText = title + ' ' + categories.join(' ').toLowerCase();
                isMatch = searchTerms.every(term => itemText.includes(term));
            }
            
            if (isMatch) {
                filteredData.push(item);
            }
        }
    }
    
    const totalItems = filteredData.length;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / itemsPerPage) : 1;
    
    if (page < 1) page = 1;
    else if (page > totalPages) page = totalPages;
    
    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const items = filteredData.slice(startIdx, endIdx);
    
    const pagesToShow = getPaginatedPages(page, totalPages);
    
    // Pre-build strings untuk menghindari multiple string operations
    const categoryListHtml = sortedCategoryCounts.map(([category, count]) => 
        `<li><a href="/page/1?q=${encodeURIComponent(category)}">${category} (${count})</a></li>`
    ).join('');
    
    let contentHtml = '';
    if (items.length > 0) {
        contentHtml = '<div class="grid">';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const categoriesHtml = (item.categories || []).map(category => {
                const encodedCategory = encodeURIComponent(category.toString().trim());
                return `<a href="/page/1?q=${encodedCategory}" class="badge">${category}</a>`;
            }).join('');
            
            const safeTitle = (item.title || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const safeCategories = (item.categories || []).map(cat => cat.toString().trim()).join(',');
            
            contentHtml += `<div class="card" data-url-video="${item.url_video}" data-title="${safeTitle}" data-categories="${safeCategories}"><div class="thumbnail" onclick="playVideo(this)"><img src="${item.thumbnail}" alt="${safeTitle}" onerror="this.src='https://via.placeholder.com/300x200/555/eee?text=No+Thumbnail'"></div><div class="card-content"><div class="title">${item.title}</div><div class="categories">${categoriesHtml}</div></div></div>`;
        }
        contentHtml += '</div>';
    } else {
        contentHtml = '<div class="no-data"><p>Tidak ada data untuk ditampilkan.</p></div>';
    }
    
    // Build pagination HTML dengan optimasi
    let paginationHtml = '<div class="pagination">';
    
    if (page > 1) {
        const prevUrl = query ? `/page/${page-1}?q=${encodeURIComponent(query)}` : `/page/${page-1}`;
        paginationHtml += `<a href="${prevUrl}">Prev</a>`;
    } else {
        paginationHtml += '<span class="disabled">Prev</span>';
    }
    
    for (let i = 0; i < pagesToShow.length; i++) {
        const p = pagesToShow[i];
        if (p === page) {
            paginationHtml += `<span class="current">${p}</span>`;
        } else {
            const pageUrl = query ? `/page/${p}?q=${encodeURIComponent(query)}` : `/page/${p}`;
            paginationHtml += `<a href="${pageUrl}">${p}</a>`;
        }
    }
    
    if (page < totalPages) {
        const nextUrl = query ? `/page/${page+1}?q=${encodeURIComponent(query)}` : `/page/${page+1}`;
        paginationHtml += `<a href="${nextUrl}">Next</a>`;
    } else {
        paginationHtml += '<span class="disabled">Next</span>';
    }
    
    paginationHtml += '</div>';
    
    const html = renderTemplate(HTML_TEMPLATE, {
        current_page: page,
        query: req.query.q || '',
        category_list: categoryListHtml,
        content: contentHtml,
        pagination: paginationHtml
    });
    
    const processingTime = Date.now() - startTime;
    console.log(`Page ${page} processed in ${processingTime}ms (${totalItems} items, query: "${query}")`);
    
    res.send(html);
});

const PORT = process.env.PORT || 5000;

// Middleware untuk kompresi dan caching
app.use((req, res, next) => {
    // Set cache headers untuk static content
    if (req.url.includes('debug')) {
        res.set('Cache-Control', 'no-cache');
    } else {
        res.set('Cache-Control', 'public, max-age=300'); // 5 menit cache
    }
    next();
});

app.listen(PORT, '127.0.0.1', () => {
    console.log('Starting Express server...');
    console.log(`Open your browser and go to: http://127.0.0.1:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
    
    // Preload data saat server start
    console.log('Preloading data...');
    const startTime = Date.now();
    loadData();
    getCategoryData();
    console.log(`Data preloaded in ${Date.now() - startTime}ms`);
});
