let products = [];
let translations = {};
let config = { batchSize: 4, loaderDelay: 160 };

let currentLang = 'pt';
let currentTheme = localStorage.getItem('theme') || 'light';
let activeFilter = 'all';
let searchTerm = '';

// Array que armazena os IDs dos produtos favoritados no LocalStorage
let favoriteIds = JSON.parse(localStorage.getItem('catalogFavorites')) || [];

const pageLoader = document.getElementById('pageLoader');
const sectionTitle = document.getElementById('sectionTitle');

function showPageLoader() {
    document.body.classList.add('is-loading');
    pageLoader?.classList.add('active');
}

function hidePageLoader() {
    document.body.classList.remove('is-loading');
    pageLoader?.classList.remove('active');
}

function applyTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    const themeButton = document.getElementById('themeToggle');

    if (themeButton) {
        themeButton.setAttribute('aria-pressed', theme === 'dark');
    }

    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const themeButton = document.getElementById('themeToggle');
    const cord = themeButton?.querySelector('.lamp-cord');

    if (cord) {
        const animationClass = currentTheme === 'light' ? 'is-animating-on' : 'is-animating-off';
        
        cord.classList.add(animationClass);

        cord.addEventListener('animationend', () => {
            cord.classList.remove(animationClass);
        }, { once: true });
    }

    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

// Altera a categoria atual e muda o título da página
function setFilter(filter, titleText) {
    activeFilter = filter;
    
    if (sectionTitle) {
        sectionTitle.textContent = titleText;
    }
    
    renderProducts();
}

function clearSearch() {
    searchTerm = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    renderProducts();
    renderSuggestions();
}

function matchesTitleSearch(title, term) {
    const normalizedTitle = (title || '').toLowerCase();
    const normalizedTerm = (term || '').trim().toLowerCase();

    if (!normalizedTerm) {
        return true;
    }

    return normalizedTitle.includes(normalizedTerm);
}

function renderSuggestions() {
    const suggestionsBox = document.getElementById('searchSuggestions');
    if (!suggestionsBox) return;

    const trimmed = searchTerm.trim().toLowerCase();

    if (!trimmed) {
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        return;
    }

    const matches = products
        .filter(prod => prod.title[currentLang] === trimmed)
        .slice(0, 5);

    if (matches.length === 0) {
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        return;
    }

    suggestionsBox.innerHTML = matches.map(prod => `
        <button type="button" class="search-suggestion" data-product-id="${prod.id}">${prod.title[currentLang]}</button>
    `).join('');

    suggestionsBox.style.display = 'block';
}


// Lida com o clique duplo no cartão (curtida estilo instagram / remover curtida)
function handleDoubleTap(e, productId, cardElement) {
    const isAlreadyFavorite = favoriteIds.includes(productId);

    if (!isAlreadyFavorite) {
        // Se NÃO é favorito: Adiciona ao array
        favoriteIds.push(productId);
        
        // Cria e injeta o elemento SVG da animação do coração (só quando dá o like)
        const heartSvg = document.createElement('div');
        heartSvg.innerHTML = `
            <svg viewBox="0 0 24 24" class="heart-burst">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        `;
        const animatedHeart = heartSvg.firstElementChild;
        cardElement.appendChild(animatedHeart);

        // Remove o SVG animado da DOM após o término da animação
        setTimeout(() => {
            if (cardElement.contains(animatedHeart)) {
                animatedHeart.remove();
            }
        }, 800);

    } else {
        // Se JÁ É favorito: Remove do array
        favoriteIds = favoriteIds.filter(id => id !== productId);
        
        // Se o usuário desfavoritou de dentro da própria aba "Meus Favoritos", 
        // recarregamos a grid para o produto sumir de lá imediatamente.
        if (activeFilter === 'favoritos') {
            setTimeout(() => {
                renderProducts();
            }, 300); // Um leve delay apenas para não ser um corte tão brusco
        }
    }
    
    // Atualiza o armazenamento local com a nova lista
    localStorage.setItem('catalogFavorites', JSON.stringify(favoriteIds));

    // Atualiza o estado visual do cartão (mostra/esconde o coração persistente no canto)
    cardElement.classList.toggle('is-favorite', favoriteIds.includes(productId));
}

function renderProducts({ useLoader = false } = {}) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (useLoader) {
        showPageLoader();
    }

    grid.classList.add('is-transitioning');
    grid.innerHTML = '';

    const visibleProducts = products.filter(prod => {
        const isAvailable = prod.available !== false;
        
        // Lógica especial para a aba Favoritos
        const matchesFilter = activeFilter === 'favoritos' 
            ? favoriteIds.includes(prod.id) 
            : (activeFilter === 'all' || prod.categoryClass === activeFilter);
            
        const matchesSearch = matchesTitleSearch(prod.title[currentLang], searchTerm);
        return isAvailable && matchesFilter && matchesSearch;
    });

    if (visibleProducts.length === 0) {
        grid.classList.remove('is-transitioning');
        
        let emptyMessage = currentLang === 'pt' ? 'Nenhum produto encontrado :/' : 'No products found :/';
        if (activeFilter === 'favoritos') {
            emptyMessage = currentLang === 'pt' ? 'Você ainda não possui favoritos.' : 'You have no favorites yet.';
        }

        grid.innerHTML = `
            <div class="empty-state">
                <h3>${emptyMessage}</h3>
                <p>${currentLang === 'pt' ? 'Tente outro termo ou limpe o filtro.' : 'Try another term or clear the filter.'}</p>
                <button type="button" id="clearSearchBtn">${currentLang === 'pt' ? 'Limpar busca' : 'Clear search'}</button>
            </div>
        `;
        document.getElementById('clearSearchBtn')?.addEventListener('click', clearSearch);
        if (useLoader) {
            hidePageLoader();
        }
        return;
    }

    let index = 0;
    const batchSize = config.batchSize || 4;

    const renderNextBatch = () => {
        const fragment = document.createDocumentFragment();
        const limit = Math.min(index + batchSize, visibleProducts.length);

        for (; index < limit; index++) {
            const prod = visibleProducts[index];
            const card = document.createElement('div');
            
            const isFavClass = favoriteIds.includes(prod.id) ? 'is-favorite' : '';
            card.className = `product-card ${prod.categoryClass || ''} ${isFavClass}`;

            card.innerHTML = `
                <svg viewBox="0 0 24 24" class="persistent-heart">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>

                <img class="store-icon" src="img/mercadolivre.png" alt="Mercado Livre">
                <div class="product-badges">
                    <span class="product-status available">Disponível</span>
                    ${prod.discount ? `<span class="product-discount">-${prod.discount}</span>` : ''}
                </div>
                <img src="${prod.img}" alt="${prod.title[currentLang]}" class="product-img">
                <div class="product-title">${prod.title[currentLang]}</div>
                <button type="button" class="product-btn">${prod.btnText[currentLang]}</button>
            `;

            // Evento do duplo clique para dar Like (estilo Instagram)
            card.addEventListener('dblclick', (e) => {
                handleDoubleTap(e, prod.id, card);
            });

            // Evita que clicar no botão dispare evento na div
            const button = card.querySelector('.product-btn');
            button?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                window.open(prod.link, '_blank', 'noopener,noreferrer');
            });
            
            // Opcional: Se for no mobile e o clique duplo não pegar bem por causa de seleção de texto
            // podemos usar 'touchend' também simulando o duplo clique. Mas o dblclick costuma funcionar nos browsers modernos.

            fragment.appendChild(card);
        }

        grid.appendChild(fragment);

        if (index < visibleProducts.length) {
            requestAnimationFrame(renderNextBatch);
        } else {
            grid.classList.remove('is-transitioning');
            if (useLoader) {
                hidePageLoader();
            }
        }
    };

    requestAnimationFrame(renderNextBatch);
}

function updateStaticText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = translations[currentLang]?.[key] || '';
        el.innerHTML = "";

        const words = text.split(' ');
        words.forEach((word, index) => {
            const span = document.createElement('span');
            span.className = 'title-word';
            span.textContent = word;
            el.appendChild(span);

            if (index < words.length - 1) {
                el.appendChild(document.createTextNode(' '));
            }
        });
    });
}

function toggleLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    updateStaticText();
    renderProducts();
    renderSuggestions();
}

document.getElementById('langToggle').addEventListener('click', toggleLanguage);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

const searchInput = document.getElementById('searchInput');
searchInput?.addEventListener('input', (event) => {
    searchTerm = event.target.value.trim();
    renderProducts();
    renderSuggestions();
});

const menuToggle = document.getElementById('menuToggle');
const closeMenu = document.getElementById('closeMenu');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');

function openMenu() {
    sideMenu.classList.add('open');
    menuOverlay.classList.add('active');
    sideMenu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
}

function closeMenuPanel() {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('active');
    sideMenu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', openMenu);
closeMenu.addEventListener('click', closeMenuPanel);
menuOverlay.addEventListener('click', closeMenuPanel);

document.querySelectorAll('.side-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        // Pega o título clicado para colocar no cabeçalho da seção
        const titleText = link.textContent;
        setFilter(link.getAttribute('data-filter'), titleText);
        closeMenuPanel();
    });
});

async function initApp() {
    try {
        const [productsResponse, translationsResponse, configResponse] = await Promise.all([
            fetch('data/products.json'),
            fetch('data/translations.json'),
            fetch('data/config.json')
        ]);

        products = await productsResponse.json();
        translations = await translationsResponse.json();
        config = await configResponse.json();
    } catch (error) {
        console.error('Erro ao carregar os dados do site:', error);
    }

    applyTheme(currentTheme);
    updateStaticText();
    renderProducts({ useLoader: true });
    renderSuggestions();
}

initApp();
