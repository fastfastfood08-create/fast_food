// =====================================================
// تطبيق الواجهة الرئيسية - Main App
// =====================================================

let currentCategory = null;
let searchQuery = '';

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// تهيئة التطبيق - ⚡ ULTRA-FAST Version
async function initializeApp() {
    // تطبيق الإعدادات المحفوظة فوراً لتجنب الوميض
    loadRestaurantSettings();

    // إخفاء الـ Loader فوراً إذا كانت هناك بيانات مخبأة (Cached)
    const hasCachedData = localStorage.getItem('cachedCategories_v2') && localStorage.getItem('cachedMeals_v2');
    
    if (hasCachedData) {
        // ⚡ INSTANT RENDER from Cache
        renderCategories();
        renderMeals();
        
        // إخفاء التحميل فوراً
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.remove(), 200);
        }
        
        // ثم تحميل البيانات الجديدة في الخلفية
        if (typeof initializeData === 'function') {
            initializeData().then(() => {
                loadRestaurantSettings();
                renderCategories();
                renderMeals();
            });
        }
    } else {
        // No cache: Show skeleton, wait for data
        renderSkeletonLoading();
        
        if (typeof initializeData === 'function') {
            await initializeData();
        }
        
        loadRestaurantSettings();
        renderCategories();
        renderMeals();
        
        // إخفاء التحميل
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.remove(), 200);
        }
    }
    
    // إعداد البحث
    setupSearch();
    
    // إعداد تفاعل الرأس مع التمرير
    setupHeaderScroll();
}

// دالة مساعدة لانتظار تحميل الصور المهمة
function waitForCriticalImages() {
    return new Promise((resolve) => {
        // نجمع كل الصور في الفئات وأول 8 صور في الوجبات
        // Optimizing Critical Path: Only wait for what's likely above the fold.
        // Wait for first 6 categories and first 4 meals.
        const categoryImages = Array.from(document.querySelectorAll('#categoriesContainer img')).slice(0, 6);
        const mealImages = Array.from(document.querySelectorAll('#mealsContainer .meal-card:nth-child(-n+4) img'));
        
        const allImages = [...categoryImages, ...mealImages];
        
        if (allImages.length === 0) {
            resolve();
            return;
        }

        let loadedCount = 0;
        const total = allImages.length;
        let resolved = false;

        const checkDone = () => {
            loadedCount++;
            if (loadedCount >= total && !resolved) {
                resolved = true;
                resolve();
            }
        };

        // Safety timeout (max 3 seconds waiting for images)
        const timeout = setTimeout(() => {
            if (!resolved) {
                console.log('Image loading timed out, proceeding anyway...');
                resolved = true;
                resolve();
            }
        }, 3000);

        allImages.forEach(img => {
            if (img.complete) {
                checkDone();
            } else {
                img.onload = checkDone;
                img.onerror = checkDone;
            }
        });
    });
}

// عرض واجهة التحميل (Skeleton)
function renderSkeletonLoading() {
    const container = document.getElementById('mealsContainer');
    const catContainer = document.getElementById('categoriesContainer');
    
    if (catContainer && !catContainer.hasChildNodes()) {
         catContainer.innerHTML = Array(5).fill(0).map(() => `
            <div class="category-btn skeleton-cat"></div>
        `).join('');
    }

    if (container) {
        container.innerHTML = Array(6).fill(0).map((_, i) => `
            <div class="meal-card skeleton-card" style="animation-delay: ${i * 0.1}s">
                <div class="meal-image skeleton-image">
                    <div class="skeleton-shimmer"></div>
                </div>
                <div class="meal-content">
                    <div class="skeleton-text title"></div>
                    <div class="skeleton-text desc"></div>
                    <div class="meal-footer">
                        <div class="skeleton-text price"></div>
                        <div class="skeleton-btn"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// تحميل إعدادات المطعم
function loadRestaurantSettings() {
    const settings = getSettings();
    
    // تحديث اسم المطعم
    // تحديث اسم المطعم
    if (settings.restaurantName) {
        const elements = ['logoName', 'footerName', 'copyrightName', 'pageTitle'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'pageTitle') {
                    el.textContent = settings.restaurantName + ' - اطلب الآن';
                } else {
                    el.textContent = settings.restaurantName;
                }
            }
        });
    }

    // تحديث معلومات الاتصال (الهاتف والعنوان)
    const phoneEl = document.getElementById('contactPhone');
    if (phoneEl) {
        // التحقق من الرقم: إذا كان موجوداً وليس "غير مذكور"
        const phone = settings.contactPhone || settings.phone;
        if (phone && phone !== 'غير مذكور' && phone.trim() !== '') {
            phoneEl.innerHTML = `📞 <a href="tel:${phone}" style="color: inherit;">${phone}</a>`;
            phoneEl.style.display = ''; // إظهار
        } else {
            phoneEl.style.display = 'none'; // إخفاء
        }
    }

    const addressEl = document.getElementById('contactAddress');
    if (addressEl) {
        // التحقق من العنوان
        if (settings.address && settings.address !== 'غير مذكور' && settings.address.trim() !== '') {
            addressEl.textContent = '📍 ' + settings.address;
            addressEl.style.display = ''; // إظهار
        } else {
            addressEl.style.display = 'none'; // إخفاء
        }
    }
    
    // تحديث حالة المطعم (مفتوح/مغلق)
    const statusEl = document.querySelector('.restaurant-status');
    if (statusEl) {
        if (settings.isOpen === true) {
            statusEl.style.display = 'flex'; // Ensure visible
            statusEl.classList.remove('closed');
            statusEl.classList.add('open');
            statusEl.querySelector('span:last-child').textContent = 'مفتوح الآن';
        } else if (settings.isOpen === false) {
            statusEl.style.display = 'flex'; // Ensure visible
            statusEl.classList.remove('open');
            statusEl.classList.add('closed');
            statusEl.querySelector('span:last-child').textContent = 'مغلق حالياً';
        } else {
            // الحالة غير معروفة بعد (null) - إخفاء المؤشر
            statusEl.style.display = 'none';
        }
    }

    // تحديث السنة الحالية
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

// عرض الفئات
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    const categories = getCategories().filter(c => c.active).sort((a, b) => a.order - b.order);
    
    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">لا توجد فئات</p>';
        return;
    }
    
    // إضافة زر "الكل"
    let html = `
        <button class="category-card ${!currentCategory ? 'active' : ''}" onclick="filterByCategory(null)">
            <span class="category-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"/></svg>
            </span>
            <span class="category-name">الكل</span>
        </button>
    `;
    
    // إضافة باقي الفئات
    html += categories.map(cat => {
        // Use centralized helper
        const iconHtml = window.getCategoryIconHtml ? window.getCategoryIconHtml(cat, 'height: 100%;') : cat.icon;

        return `
        <button class="category-card ${currentCategory === cat.id ? 'active' : ''}" onclick="filterByCategory(${cat.id})">
            <span class="category-icon">${iconHtml}</span>
            <span class="category-name">${cat.name}</span>
        </button>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    // Check for scroll buttons after rendering
    setTimeout(checkScrollButtons, 100);
}

// تصفية الوجبات حسب الفئة
function filterByCategory(categoryId) {
    currentCategory = categoryId;
    renderCategories();
    renderMeals();
}

// إعداد البحث
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderMeals();
    });
}

const MEALS_CHUNK_SIZE = 12;
let currentRenderedCount = MEALS_CHUNK_SIZE;

// عرض الوجبات
function renderMeals(reset = true) {
    const container = document.getElementById('mealsContainer');
    if (!container) return;
    
    if (reset) {
        currentRenderedCount = MEALS_CHUNK_SIZE;
        container.innerHTML = ''; // Clear only on reset
    }

    let meals = getMeals().filter(m => m.active);
    
    // تصفية حسب الفئة
    if (currentCategory) {
        meals = meals.filter(m => m.categoryId === currentCategory);
    }
    
    // تصفية حسب البحث
    if (searchQuery) {
        meals = meals.filter(m => 
            m.name.toLowerCase().includes(searchQuery) ||
            m.description.toLowerCase().includes(searchQuery)
        );
    }
    
    // ترتيب الوجبات
    meals.sort((a, b) => {
        // الوجبات الشائعة أولاً
        // ترتيب عادي حسب Order
        return a.order - b.order;
    });
    
    if (meals.length === 0) {
        container.innerHTML = `
            <div class="no-meals">
                <div class="no-meals-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" stroke="#E5E7EB" stroke-width="2"/><circle cx="12" cy="12" r="6" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="2 2"/><path d="M7 6V11C7 12 8 13 8 13H5C5 13 6 12 6 11V6" stroke="#9CA3AF" stroke-width="1.5"/><line x1="6.5" y1="6" x2="6.5" y2="10" stroke="#9CA3AF"/><line x1="5.5" y1="13" x2="5.5" y2="18" stroke="#9CA3AF" stroke-width="1.5"/><path d="M17 18V13C17 13 19 11 19 8C19 6 18 5 17 5C16 5 15 6 15 8C15 11 17 13 17 13Z" stroke="#9CA3AF" stroke-width="1.5"/></svg>
                </div>
                <h3>لا توجد وجبات</h3>
                <p>${searchQuery ? 'لم نجد وجبات تطابق بحثك' : 'لا توجد وجبات في هذه الفئة'}</p>
            </div>
        `;
        return;
    }
    
    // Slice for pagination
    const visibleMeals = meals.slice(0, currentRenderedCount);
    const html = visibleMeals.map((meal, index) => createMealCard(meal, index)).join('');
    
    container.innerHTML = html;
    
    // Show More Button
    const btnId = 'btnLoadMoreMeals';
    const oldBtn = document.getElementById(btnId);
    if (oldBtn) oldBtn.remove();
    
    if (meals.length > currentRenderedCount) {
        const remaining = meals.length - currentRenderedCount;
        const btnContainer = document.createElement('div');
        btnContainer.id = btnId;
        btnContainer.style.cssText = 'width:100%; text-align:center; margin-top:30px; padding-bottom:20px; grid-column: 1 / -1;';
        btnContainer.innerHTML = `
            <button onclick="loadMoreMeals()" class="btn btn-outline" style="padding: 12px 30px; border-radius: 50px;">
                عرض المزيد (${remaining} متبقي)
            </button>
        `;
        container.parentElement.appendChild(btnContainer); // Append to parent (wrapper) or inside grid?
        // Usually inside grid might break layout if grid-cols is fixed.
        // Let's rely on CSS grid-column: 1/-1.
        container.appendChild(btnContainer);
    }
}

window.loadMoreMeals = function() {
    currentRenderedCount += MEALS_CHUNK_SIZE;
    renderMeals(false); // No reset
};

// إعداد تأثير التمرير للرأس
function setupHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    // استدعاء فوري لضبط الحالة عند التحميل
    handleScroll();
}

// إنشاء بطاقة وجبة
function createMealCard(meal, index) {
    const displayPrice = meal.hasSizes && meal.sizes.length > 0 
        ? meal.sizes[0].price 
        : meal.price;
    
    const priceLabel = meal.hasSizes && meal.sizes.length > 0 
        ? 'يبدأ من ' 
        : '';
    
    // Find category to access its icon/name
    const category = getCategories().find(c => c.id === meal.categoryId);
    
    // Determine Image Content
    // Determine Image Content using centralized helper
    // 2.2 scaling used to be passed, but new helper handles sizing internally via CSS layout.
    // We can pass empty strings for styles to rely on default full-width/height.
    let imageContent = '';
    
    if (window.getMealImageOrPlaceholder) {
        imageContent = window.getMealImageOrPlaceholder(meal);
    } else {
        // Fallback for safety
        if (meal.image) {
            imageContent = `<img src="${meal.image}" alt="${meal.name}" loading="lazy">`;
        } else {
            imageContent = `<img src="/icons/default-meal.svg" alt="${meal.name}" loading="lazy">`; 
        }
    }

    return `
        <div class="meal-card fade-in" style="animation-delay: ${index * 0.05}s" onclick="openMealModal(${meal.id})">
            <div class="meal-image">
                ${imageContent}
            </div>
            <div class="meal-content">
                <div class="meal-header-row" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                    <h3 class="meal-name" style="margin:0;">${meal.name}</h3>
                    ${category ? `<span class="badge" style="font-size:0.75rem; background:var(--surface-hover); color:var(--text-secondary); padding:2px 8px; border-radius:12px; white-space:nowrap;">${category.name}</span>` : ''}
                </div>
                <p class="meal-description">${meal.description}</p>
                <div class="meal-footer">
                    <div class="meal-price">
                        <span class="price-label">${priceLabel}</span>
                        <span class="price-value">${formatPrice(displayPrice)}</span>
                    </div>
                    <button class="btn btn-primary btn-sm meal-add-btn" onclick="event.stopPropagation(); quickAddToCart(${meal.id})">
                        <span>+</span> أضف
                    </button>
                </div>
            </div>
        </div>
    `;
}

// إضافة سريعة للسلة
function quickAddToCart(mealId) {
    const meal = getMeals().find(m => m.id === mealId);
    if (!meal) return;
    
    if (meal.hasSizes && meal.sizes.length > 0) {
        // إذا كانت الوجبة لها أحجام، افتح النافذة المنبثقة
        openMealModal(mealId);
    } else {
        // إضافة مباشرة
        addToCart(mealId, null, 1);
    }
}

// فتح نافذة تفاصيل الوجبة
function openMealModal(mealId) {
    const meal = getMeals().find(m => m.id === mealId);
    if (!meal) return;
    
    // إزالة أي modal موجود
    const existingModal = document.getElementById('mealModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'mealModal';
    modal.className = 'modal-overlay';
    
    const sizesHtml = meal.hasSizes && meal.sizes.length > 0 
        ? `
            <div class="size-selection">
                <label class="form-label">اختر الحجم:</label>
                <div class="size-options">
                    ${meal.sizes.map((size, i) => `
                        <label class="size-option ${i === 0 ? 'selected' : ''}">
                            <input type="radio" name="mealSize" value="${size.name}" ${i === 0 ? 'checked' : ''}>
                            <span class="size-name">${size.name}</span>
                            <span class="size-price">${formatPrice(size.price)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `
        : '';
    
    const currentPrice = meal.hasSizes && meal.sizes.length > 0 
        ? meal.sizes[0].price 
        : meal.price;
    
    modal.innerHTML = `
        <div class="modal meal-modal">
            <button class="modal-close" onclick="closeMealModal()">✕</button>
            
            <div class="meal-modal-image">
                ${window.getMealImageOrPlaceholder 
                    ? window.getMealImageOrPlaceholder(meal, '', '', 0.5) // 0.5 scale for modal placeholder
                    : (meal.image ? `<img src="${meal.image}" alt="${meal.name}">` : '')}
            </div>
            
            <div class="meal-modal-content">
                <h2 class="meal-modal-title">${meal.name}</h2>
                <p class="meal-modal-description">${meal.description}</p>
                
                ${sizesHtml}
                
                <div class="quantity-section">
                    <label class="form-label">الكمية:</label>
                    <div class="quantity-control quantity-control-lg">
                        <button class="quantity-btn" onclick="updateModalQuantity(-1)">−</button>
                        <span class="quantity-value" id="modalQuantity">1</span>
                        <button class="quantity-btn" onclick="updateModalQuantity(1)">+</button>
                    </div>
                </div>
                
                <div class="meal-modal-footer">
                    <div class="modal-total">
                        <span>المجموع:</span>
                        <span class="modal-total-price" id="modalTotalPrice">${formatPrice(currentPrice)}</span>
                    </div>
                    <button class="btn btn-primary btn-lg btn-block" onclick="addMealFromModal(${meal.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> أضف للسلة
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // تفعيل النافذة
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    // إعداد تغيير الحجم
    setupSizeSelection(meal);
    
    // إغلاق عند النقر خارج النافذة
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeMealModal();
    });
    
    // إغلاق بمفتاح Escape
    document.addEventListener('keydown', handleEscapeKey);
}

// إعداد اختيار الحجم
function setupSizeSelection(meal) {
    const sizeOptions = document.querySelectorAll('.size-option input');
    sizeOptions.forEach(radio => {
        radio.addEventListener('change', () => {
            // تحديث الحالة المرئية
            document.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('selected'));
            radio.closest('.size-option').classList.add('selected');
            
            // تحديث السعر
            updateModalPrice(meal);
        });
    });
}

// تحديث الكمية في النافذة المنبثقة
function updateModalQuantity(delta) {
    const quantityEl = document.getElementById('modalQuantity');
    if (!quantityEl) return;
    
    let quantity = parseInt(quantityEl.textContent) + delta;
    if (quantity < 1) quantity = 1;
    if (quantity > 99) quantity = 99;
    
    quantityEl.textContent = quantity;
    
    // تحديث السعر الإجمالي
    const modalEl = document.getElementById('mealModal');
    if (modalEl) {
        const mealId = parseInt(modalEl.querySelector('[onclick*="addMealFromModal"]').getAttribute('onclick').match(/\d+/)[0]);
        const meal = getMeals().find(m => m.id === mealId);
        if (meal) updateModalPrice(meal);
    }
}

// تحديث السعر في النافذة المنبثقة
function updateModalPrice(meal) {
    const quantityEl = document.getElementById('modalQuantity');
    const priceEl = document.getElementById('modalTotalPrice');
    
    if (!quantityEl || !priceEl) return;
    
    const quantity = parseInt(quantityEl.textContent);
    let price = meal.price;
    
    // الحصول على السعر حسب الحجم المختار
    const selectedSize = document.querySelector('.size-option input:checked');
    if (selectedSize && meal.hasSizes) {
        const size = meal.sizes.find(s => s.name === selectedSize.value);
        if (size) price = size.price;
    }
    
    priceEl.textContent = formatPrice(price * quantity);
}

// إضافة من النافذة المنبثقة
function addMealFromModal(mealId) {
    const quantityEl = document.getElementById('modalQuantity');
    const selectedSize = document.querySelector('.size-option input:checked');
    
    const quantity = quantityEl ? parseInt(quantityEl.textContent) : 1;
    const sizeName = selectedSize ? selectedSize.value : null;
    
    if (addToCart(mealId, sizeName, quantity)) {
        closeMealModal();
    }
}

// إغلاق نافذة الوجبة
function closeMealModal() {
    const modal = document.getElementById('mealModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
    document.removeEventListener('keydown', handleEscapeKey);
}

// معالجة مفتاح Escape
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeMealModal();
    }
}

// =====================================================
// Scroll Logic (Categories)
// =====================================================

function scrollCategories(direction) {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    // Determine scroll amount (approx width of a few cards)
    const scrollAmount = 300 * direction; // -1 for left (prev), 1 for right (next)
    
    // Since we are RTL, scrolling "positive" (1) usually means going LEFT (Next items). 
    // However, scrollLeft behavior varies by browser in RTL.
    // Standard logic in modern browsers:
    // RTL: scrollLeft is negative or 0 on rightmost.
    // But easier to use scrollBy({ left: -scrollAmount })?
    
    // Let's assume standard behavior:
    // Button "Next" (Left Arrow) needs to scroll to Next items.
    // In RTL, "Next" items are to the LEFT. So we want to scroll negative X?
    // Wait, physically they are to the left.
    // Let's rely on scrollBy. left: -300 means move view to left (scan rightwards content in LTR, but in RTL...)
    
    // Simplest: Direction 1 (Next) = Scroll deeper into content.
    // Direction -1 (Prev) = Scroll back to start.
    
    // In RTL, "start" is right. "End" is left.
    // So "Next" should scroll towards the left (negative value usually).
    
    // Safe approach: check current direction via flow
    const isRTL = document.dir === 'rtl';
    const factor = isRTL ? -1 : 1;
    
    container.scrollBy({
        left: scrollAmount * factor, 
        behavior: 'smooth'
    });
    
    // Update buttons afterwards
    setTimeout(checkScrollButtons, 300);
}

function checkScrollButtons() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    const prevBtn = document.getElementById('scrollLeftBtn');
    const nextBtn = document.getElementById('scrollRightBtn');
    
    if (!prevBtn || !nextBtn) return;
    
    // Check if scrollable
    // Use slightly larger tolerance
    const isScrollable = container.scrollWidth > container.clientWidth + 5;
    
    if (!isScrollable) {
        prevBtn.classList.remove('visible');
        nextBtn.classList.remove('visible');
        return;
    }
    
    // Show buttons if scrollable
    // Only show if we are NOT at the very start/end?
    // Or just always show if scrollable for simplicity in UX?
    // User said "if one section starts to disappear" (overflow).
    
    // Logic: 
    // If we are at strict start, hide Prev.
    // If we are at strict end, hide Next.
    
    // RTL handling for scrollLeft is messy cross-browser. 
    // Chrome: scrollLeft decreases (negative) as you go left.
    // Firefox: scrollLeft decreases (negative).
    // Some older: scrollLeft increases.
    
    // Robust check:
    // Start is when scrollLeft is close to 0 (or max positive in some impls?? No, usually 0 is start).
    // EXCEPT in RTL, 0 is often the rightmost point (Start).
    
    const scrollLeft = Math.abs(container.scrollLeft);
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    // Start (Right side in RTL): scrollLeft is near 0.
    // End (Left side in RTL): scrollLeft is near maxScroll.
    
    // "Prev" Button (Right Scroll) -> Should appear if we have scrolled AWAY from start (scrollLeft > 0)
    if (scrollLeft > 10) {
        prevBtn.classList.add('visible'); // Show Prev (to go back right)
    } else {
        prevBtn.classList.remove('visible');
    }
    
    // "Next" Button (Left Scroll) -> Should appear if we are NOT at end (scrollLeft < max)
    if (maxScroll - scrollLeft > 10) {
        nextBtn.classList.add('visible'); // Show Next (to go further left)
    } else {
        nextBtn.classList.remove('visible');
    }
}

// Hook resize
window.addEventListener('resize', checkScrollButtons);
// Hook scroll
const catContainer = document.getElementById('categoriesContainer');
if (catContainer) {
    catContainer.addEventListener('scroll', () => {
        // Throttling could be good but not strictly necessary for simple button toggle
        checkScrollButtons();
    });
}

