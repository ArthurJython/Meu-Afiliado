let products = [];
let translations = {};
let config = { batchSize: 4, loaderDelay: 160 };

let currentLang = 'pt';
let currentTheme = localStorage.getItem('theme') || 'light';
let activeFilter = 'all';
let searchTerm = '';
const pageLoader = document.getElementById('pageLoader');

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
        // Define qual classe aplicar baseado no tema atual antes de mudar
        const animationClass = currentTheme === 'light' ? 'is-animating-on' : 'is-animating-off';
        
        cord.classList.add(animationClass);

        // Remove a classe específica assim que o balanço terminar
        cord.addEventListener('animationend', () => {
            cord.classList.remove(animationClass);
        }, { once: true });
    }

    // Executa a sua troca de tema padrão
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

function setFilter(filter) {
    activeFilter = filter;
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
        .filter(prod => matchesTitleSearch(prod.title[currentLang], trimmed))
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

    suggestionsBox.querySelectorAll('.search-suggestion').forEach(button => {
        button.addEventListener('click', () => {
            const selectedId = Number(button.getAttribute('data-product-id'));
            const selectedProduct = products.find(prod => prod.id === selectedId);
            if (selectedProduct) {
                searchTerm = selectedProduct.title[currentLang];
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = selectedProduct.title[currentLang];
                }
                renderProducts();
                renderSuggestions();
            }
        });
    });
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
        const matchesFilter = activeFilter === 'all' || prod.categoryClass === activeFilter;
        const matchesSearch = matchesTitleSearch(prod.title[currentLang], searchTerm);
        return isAvailable && matchesFilter && matchesSearch;
    });

    if (visibleProducts.length === 0) {
        grid.classList.remove('is-transitioning');
        grid.innerHTML = `
            <div class="empty-state">
                <h3>${currentLang === 'pt' ? 'Nenhum produto encontrado :/' : 'No products found :/'}</h3>
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
            card.className = `product-card ${prod.categoryClass || ''}`;

            card.innerHTML = `
                <img class="store-icon" src="../img/mercadolivre.png" alt="Mercado Livre">
                <div class="product-badges">
                    <span class="product-status available">Disponível</span>
                    ${prod.discount ? `<span class="product-discount">-${prod.discount}</span>` : ''}
                </div>
                <img src="${prod.img}" alt="${prod.title[currentLang]}" class="product-img">
                <div class="product-title">${prod.title[currentLang]}</div>
                <button type="button" class="product-btn">${prod.btnText[currentLang]}</button>
            `;

            const button = card.querySelector('.product-btn');
            button?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                window.open(prod.link, '_blank', 'noopener,noreferrer');
            });

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

// Função para atualizar textos fixos (como o título do site)
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

// Função que inverte o idioma
function toggleLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    updateStaticText();
    renderProducts();
    renderSuggestions();
}

// Escuta o clique nos botões
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
    link.addEventListener('click', () => {
        setFilter(link.getAttribute('data-filter'));
        closeMenuPanel();
    });
});

async function initApp() {
    try {
        const [productsResponse, translationsResponse, configResponse] = await Promise.all([
            fetch('../data/products.json'),
            fetch('../data/translations.json'),
            fetch('../data/config.json')
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