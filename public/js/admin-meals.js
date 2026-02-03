// ===================================
// Admin Meals Logic
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // ⚡ Render Loading State Immediately
    renderMealsLoadingState();

    // ⚡ Instant Render if data exists
    if (getCategories().length > 0 && getMeals().length > 0) {
        initMealsPage();
    }

    // Need Meals and Categories
    initializeData({ meals: true, categories: true }).then(() => {
        initMealsPage();
    });
    // ...

    // Listen for background updates
    document.addEventListener('meals-updated', () => renderMeals());
    document.addEventListener('categories-updated', () => initMealsPage()); // Re-init to update select dropdown too

    // Image Input Handler (Direct Resize)
    const imageInput = document.getElementById('mealImageInput');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        
                        const MAX_SIZE = 1000;
                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const dataUrl = canvas.toDataURL('image/webp', 0.85); // Compress
                        
                        // Preview
                        const preview = document.getElementById('mealImagePreview');
                        preview.querySelector('img').src = dataUrl;
                        preview.style.display = 'flex';
                        
                        // Hidden Input
                        let hiddenInput = document.getElementById('croppedImageData');
                        if (!hiddenInput) {
                            hiddenInput = document.createElement('input');
                            hiddenInput.type = 'hidden';
                            hiddenInput.id = 'croppedImageData';
                            document.getElementById('mealForm').appendChild(hiddenInput);
                        }
                        hiddenInput.value = dataUrl;
                        
                        // Hide Label
                        const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                        if(uploadLabel) uploadLabel.style.display = 'none';

                        // Delete Btn
                        if (!preview.querySelector('.btn-delete-image')) {
                            const deleteBtn = document.createElement('button');
                            deleteBtn.className = 'btn-delete-image';
                            deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> حذف الصورة';
                            deleteBtn.type = 'button';
                            deleteBtn.onclick = function(e) {
                                e.stopPropagation(); 
                                if(confirm('هل أنت متأكد من حذف الصورة؟')) {
                                    preview.querySelector('img').src = '';
                                    preview.style.display = 'none';
                                    const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                                    if(uploadLabel) uploadLabel.style.display = 'flex'; 
                                    document.getElementById('mealImageInput').value = '';
                                    const hidden = document.getElementById('croppedImageData');
                                    if(hidden) hidden.value = '';
                                }
                            };
                            preview.appendChild(deleteBtn);
                            preview.style.position = 'relative'; 
                        }
                    }
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

    }
});

// ===================================
// Helper: Loading State
// ===================================
function renderMealsLoadingState() {
    const container = document.getElementById('mealsGrid');
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 0; color: var(--text-secondary);">
                <div class="action-loader-spinner" style="width: 40px; height: 40px; border-width: 3px; margin-bottom: 20px; position: relative;"></div>
                <h3 style="font-size: 1.1rem; font-weight: 500;">جاري تحميل الوجبات...</h3>
            </div>
        `;
    }
    
    // Optional: Filter Loading State
    const select = document.getElementById('mealsCategorySelect');
    if (select && select.options.length === 0) {
         // Create a temporary placeholder if custom select isn't built yet
         const wrapper = document.querySelector('.filter-wrapper');
         if (wrapper && !document.getElementById('customCategorySelectWrapper')) {
             // We can trigger a skeleton here if needed, but the spinner in grid is usually enough indication.
             // Just ensuring the select isn't completely invisible/broken-looking.
             select.innerHTML = '<option>جاري التحميل...</option>';
         }
    }
}

// ===================================
// Helper: Action Loader (Copied from Admin Categories)
// ===================================
function createActionLoader() {
    if (document.getElementById('globalActionLoader')) return;
    
    const loader = document.createElement('div');
    loader.id = 'globalActionLoader';
    loader.className = 'action-loader-overlay';
    loader.innerHTML = `
        <div class="action-loader-spinner"></div>
        <div class="action-loader-text">جاري المعالجة...</div>
    `;
    document.body.appendChild(loader);
}

function showActionLoader(text = 'جاري المعالجة...') {
    createActionLoader();
    const loader = document.getElementById('globalActionLoader');
    const textEl = loader.querySelector('.action-loader-text');
    if (textEl) textEl.textContent = text;
    loader.classList.add('active');
}

function hideActionLoader() {
    const loader = document.getElementById('globalActionLoader');
    if (loader) loader.classList.remove('active');
}

function initMealsPage() {
    const categories = getCategories();
    const select = document.getElementById('mealsCategorySelect');
    
    if (select) {
        // Populate Native Select (Hidden) so it can hold value
        select.innerHTML = '<option value="all">كل الأقسام</option>' + 
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            
        select.style.display = 'none';
        
        // ... Custom UI Construction ...
        let customWrapper = document.getElementById('customCategorySelectWrapper');
        if (!customWrapper) {
            customWrapper = document.createElement('div');
            customWrapper.id = 'customCategorySelectWrapper';
            customWrapper.className = 'custom-select-wrapper';
            select.parentNode.insertBefore(customWrapper, select.nextSibling);

             // Remove old arrow if present
            const oldArrow = select.parentNode.querySelector('.select-arrow');
            if(oldArrow) oldArrow.style.display = 'none';
        }

        // Generate Options Data
        const optionsData = [
            { id: 'all', name: 'كل الأقسام', icon: null },
            ...categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))
        ];

        // Build Custom Select HTML
        let selectedId = 'all';
         // Check if already selected
        if (select.value && select.value !== 'all') selectedId = select.value;

        const selectedOption = optionsData.find(o => String(o.id) === String(selectedId)) || optionsData[0];
        
        // Helper to render icon
        const renderIconHtml = (icon) => {
             if (!icon) return '';
             let content = '';
             if (icon.trim().startsWith('<svg')) {
                 content = icon.replace('<svg ', '<svg style="width:100%; height:100%;" ');
             } else if (icon.match(/\.(svg|png|jpg|jpeg)$/i) || icon.startsWith('data:') || icon.startsWith('http') || icon.startsWith('/')) {
                 content = `<img src="${icon}" alt="icon">`;
             } else {
                 content = `<span style="font-size:1.2em">${icon}</span>`;
             }
             return `<span class="option-icon">${content}</span>`;
        };

        const buildOptionsHtml = () => {
             return optionsData.map(opt => `
                <div class="custom-option ${String(opt.id) === String(selectedId) ? 'selected' : ''}" data-value="${opt.id}" onclick="selectCategoryCustom('${opt.id}')">
                    ${renderIconHtml(opt.icon)}
                    <span class="option-text">${opt.name}</span>
                </div>
             `).join('');
        };

        customWrapper.innerHTML = `
            <div class="custom-select" id="customCategoryTrigger">
                <div class="custom-select-trigger" onclick="toggleCustomSelect()">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${renderIconHtml(selectedOption.icon)}
                        <span>${selectedOption.name}</span>
                    </div>
                    <div class="arrow"></div>
                </div>
                <div class="custom-options">
                    ${buildOptionsHtml()}
                </div>
            </div>
        `;
        
        // Close on click outside
        window.onclick = function(event) {
            if (!event.target.closest('.custom-select')) {
                 const openSelect = document.querySelector('.custom-select.open');
                 if (openSelect) {
                      openSelect.classList.remove('open');
                 }
            }
        }
    }
        
    renderMeals();
}

function renderMeals(categoryId = 'all') {
    const container = document.getElementById('mealsGrid');
    if (!container) return;
    
    let allMeals = getMeals();
    const categories = getCategories();
    
    let meals = allMeals;
    // Check filter from select if argument matches
    const select = document.getElementById('mealsCategorySelect');
    if (select && select.value !== 'all') categoryId = select.value;

    if (categoryId && categoryId !== 'all') {
        meals = allMeals.filter(m => m.categoryId == categoryId);
    }
    
    updateMealsStats(meals);
    
    // --- EMPTY STATE CHECK ---
    if (meals.length === 0) {
        container.innerHTML = `
            <div class="empty-state-container" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; background: var(--bg-surface); border-radius: 16px; border: 2px dashed rgba(0,0,0,0.05); margin-top: 20px;">
                <div style="font-size: 4rem; margin-bottom: 24px; opacity: 0.8; filter: grayscale(0.2);">🍽️</div>
                <h3 style="font-size: 1.35rem; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">لا توجد وجبات هنا</h3>
                <p style="color: var(--text-secondary); font-size: 1rem; max-width: 400px; margin: 0 auto 32px; line-height: 1.6;">
                    ${categoryId !== 'all' ? 'لم يتم العثور على أي وجبات في هذا القسم.' : 'لم تقم بإضافة أي وجبات بعد.'}
                    <br>يمكنك إضافة وجبة جديدة لملء هذه القائمة.
                </p>
                <div style="display: flex; gap: 12px;">
                    ${categoryId !== 'all' ? `<button onclick="document.querySelector('.custom-option[data-value=\\'all\\']').click()" class="btn btn-secondary">عرض كل الأقسام</button>` : ''}
                    <button onclick="openMealModal()" class="btn btn-primary" style="padding: 12px 28px; font-size: 1rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        إضافة وجبة
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Lazy Render Limit
    const RENDER_LIMIT = 20;
    // We store the current limit in a property on the container or global var?
    // Global var specific to this module scope is fine since it's an IIFE-like module or just script.
    // But better to attach to window or state if needed.
    // Let's use a static var logic or reset it.
    
    // If resetting (default), start over. How to know if resetting? 
    // Maybe we just check if we have a "load more" flag.
    // For now, let's keep it simple: Render ALL is currently the bottleneck.
    // We'll render first 30, then button.
    
    if (!window.adminMealsRenderLimit) window.adminMealsRenderLimit = 30;
    
    // Reset limit if filter changes? `renderMeals` is called by filter. 
    // But `renderMeals` takes argument.
    // We need to know if this is a "Load More" call or a "Filter Change" call.
    // We can add a params: `renderMeals(categoryId, isLoadMore)`
    
    const visibleMeals = meals.slice(0, window.adminMealsRenderLimit);
    
    container.innerHTML = visibleMeals.map(meal => {
        const cat = categories.find(c => c.id === meal.categoryId);
        
        let priceDisplay = '';
        if (meal.hasSizes && meal.sizes && meal.sizes.length > 0) {
            const sizesChips = meal.sizes.map(s => 
                `<span class="size-chip"><span class="size-chip-name">${s.name}</span><span class="size-chip-price">${formatPrice(s.price)}</span></span>`
            ).join('');
            priceDisplay = `<div class="meal-sizes-display">${sizesChips}</div>`;
        } else {
            priceDisplay = `<div class="meal-price">${formatPrice(meal.price)}</div>`;
        }
        
        return `
            <div class="meal-card-admin ${!meal.active ? 'meal-inactive' : ''}" onclick="openMealModal(${meal.id})">
                <div class="meal-card-image">
                    ${(() => {
                        let imageHtml = '';
                    if (window.getMealImageOrPlaceholder) {
                        imageHtml = window.getMealImageOrPlaceholder(meal, '', '', 0.6);
                    } else {
                        // Safe Fallback if utils not loaded
                        imageHtml = meal.image 
                            ? `<img src="${meal.image}" alt="${meal.name}" onerror="this.style.display='none'">` 
                            : `<div class="no-image">No Image</div>`;
                    }
                    return imageHtml;
                    })()}
                </div>
                <div class="meal-card-content">
                    <div class="meal-header">
                        <span class="meal-category-tag">${cat ? cat.name : 'Unknown'}</span>
                        <label class="switch" onclick="event.stopPropagation()">
                            <input type="checkbox" id="meal-toggle-${meal.id}" onchange="toggleMealActive(${meal.id})" ${meal.active ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <h3 class="meal-title">${meal.name}</h3>
                    <p class="meal-desc">${meal.description || ''}</p>
                    <div class="meal-footer">
                        ${priceDisplay}
                        <div class="meal-actions">
                            <button class="action-btn edit" onclick="event.stopPropagation(); openMealModal(${meal.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button class="action-btn danger" onclick="event.stopPropagation(); deleteMealFunc(${meal.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Show More Button
    if (meals.length > window.adminMealsRenderLimit) {
        container.innerHTML += `
            <div style="grid-column: 1 / -1; text-align: center; margin-top: 20px;">
                <button onclick="loadMoreAdminMeals()" class="btn-primary" style="padding: 10px 30px;">
                    عرض المزيد (${meals.length - window.adminMealsRenderLimit} متبقي)
                </button>
            </div>
        `;
    }
}

// Global Load More Handler
window.loadMoreAdminMeals = function() {
    if (!window.adminMealsRenderLimit) window.adminMealsRenderLimit = 30;
    window.adminMealsRenderLimit += 30;
    renderMeals(); // Re-render with new limit
};

function updateMealsStats(meals) {
    const statsEl = document.getElementById('mealsStats');
    if (!statsEl) return;
    
    const total = meals.length;
    const active = meals.filter(m => m.active).length;
    const inactive = total - active;
    
    statsEl.innerHTML = `
        <span class="stat-pill stat-total"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> ${total} وجبة</span>
        <span class="stat-pill stat-active"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg> ${active} متوفر</span>
        <span class="stat-pill stat-inactive"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> ${inactive} غير متوفر</span>
    `;
}

function filterMeals(catId) {
    window.adminMealsRenderLimit = 30; // Reset limit on filter
    renderMeals(catId);
}

function openMealModal(mealId = null) {
    const form = document.getElementById('mealForm');
    form.reset();
    document.getElementById('mealImagePreview').style.display = 'none';
    
    document.getElementById('mealHasSizes').checked = false;
    document.getElementById('sizesSection').style.display = 'none';
    document.getElementById('singlePriceGroup').style.display = 'block';
    document.getElementById('sizesContainer').innerHTML = '';
    
    const categories = getCategories();
    const catSelect = document.getElementById('mealCategory');
    
    // Clear any previous custom select for modal
    const oldCustomModal = document.getElementById('customMealCategorySelectWrapper');
    if(oldCustomModal) oldCustomModal.remove();

    // Populate Native Select (Hidden)
    catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    catSelect.style.display = 'none'; // Hide native select

    // Build Custom Select Wrapper for Modal
    const customWrapper = document.createElement('div');
    customWrapper.id = 'customMealCategorySelectWrapper';
    customWrapper.className = 'custom-select-wrapper';
    customWrapper.style.width = '100%'; // Full width for modal
    catSelect.parentNode.insertBefore(customWrapper, catSelect.nextSibling);

    // Prepare Options
    const optionsData = categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }));
    
    // Helper Render Icon
    const renderIconHtml = (icon) => {
             if (!icon) return '';
             let content = '';
             if (icon.trim().startsWith('<svg')) {
                 content = icon.replace('<svg ', '<svg style="width:100%; height:100%;" ');
             } else if (icon.match(/\.(svg|png|jpg|jpeg)$/i) || icon.startsWith('data:') || icon.startsWith('http') || icon.startsWith('/')) {
                 content = `<img src="${icon}" alt="icon">`;
             } else {
                 content = `<span style="font-size:1.2em">${icon}</span>`;
             }
             return `<span class="option-icon">${content}</span>`;
    };

    // Determine initial selected (if edit mode, otherwise first)
    // We'll set this 'visual' state later if mealId exists, but default is first one.
    let currentSelectedId = categories.length > 0 ? categories[0].id : '';
    
    // Build HTML Function
    window.buildModalCustomSelect = (selectedId) => {
         const selectedOption = optionsData.find(o => String(o.id) === String(selectedId)) || optionsData[0];
         if (!selectedOption) return; // No categories

         const buildOptionsHtml = () => {
             return optionsData.map(opt => `
                <div class="custom-option ${String(opt.id) === String(selectedId) ? 'selected' : ''}" data-value="${opt.id}" onclick="selectModalCategory('${opt.id}')">
                    ${renderIconHtml(opt.icon)}
                    <span class="option-text">${opt.name}</span>
                </div>
             `).join('');
        };

        customWrapper.innerHTML = `
            <div class="custom-select" id="customMealCategoryTrigger">
                <div class="custom-select-trigger" onclick="toggleModalCustomSelect()">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${renderIconHtml(selectedOption.icon)}
                        <span>${selectedOption.name}</span>
                    </div>
                    <div class="arrow"></div>
                </div>
                <div class="custom-options">
                    ${buildOptionsHtml()}
                </div>
            </div>
        `;
    };
    
    // Initial Build
    buildModalCustomSelect(currentSelectedId);
    
    // Add Click Outside Listener specific for modal (optional, or use global one if class matches)
    // Global listener on window from previous step targets .custom-select, so it should work if we reused class.
    // We reused class 'custom-select', so generic listener works.

    
    if (mealId) {
        const meal = getMeals().find(m => m.id === mealId);
        if (meal) {
            document.getElementById('mealId').value = meal.id;
            document.getElementById('mealName').value = meal.name;
            document.getElementById('mealPrice').value = meal.price || '';
            document.getElementById('mealDescription').value = meal.description;
            document.getElementById('mealCategory').value = meal.categoryId;
            document.getElementById('mealModalTitle').textContent = 'تعديل وجبة';
            
            if (meal.hasSizes && meal.sizes && meal.sizes.length > 0) {
                document.getElementById('mealHasSizes').checked = true;
                document.getElementById('sizesSection').style.display = 'block';
                document.getElementById('singlePriceGroup').style.display = 'none';
                meal.sizes.forEach(size => addSizeRow(size.name, size.price));
            }
            
            if (meal.image) {
                const preview = document.getElementById('mealImagePreview');
                preview.querySelector('img').src = meal.image;
                preview.style.display = 'flex';
                const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                if(uploadLabel) uploadLabel.style.display = 'none';
                
                // Add Delete Button if missing
                if (!preview.querySelector('.btn-delete-image')) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-delete-image';
                    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> حذف الصورة';
                    deleteBtn.type = 'button';
                    deleteBtn.onclick = function(e) {
                         e.stopPropagation();
                         if(confirm('هل أنت متأكد من حذف الصورة؟')) {
                             preview.querySelector('img').src = '';
                             preview.style.display = 'none';
                             const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                             if(uploadLabel) uploadLabel.style.display = 'flex';
                             document.getElementById('mealImageInput').value = '';
                         }
                    };
                    preview.appendChild(deleteBtn);
                    preview.style.position = 'relative';
                }
            } else {
                 const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                 if(uploadLabel) uploadLabel.style.display = 'flex';
            }
        }
    } else {
        document.getElementById('mealId').value = '';
        document.getElementById('mealModalTitle').textContent = 'إضافة وجبة جديدة';
        const uploadLabel = document.querySelector('label[for="mealImageInput"]');
        if(uploadLabel) uploadLabel.style.display = 'flex';
    }
    
    document.getElementById('mealModal').classList.add('active');
}

function closeMealModal() {
    document.getElementById('mealModal').classList.remove('active');
}

async function saveMeal(event) {
    event.preventDefault();
    const submitBtn = document.querySelector('#mealForm button[type="submit"]');
    if (submitBtn) { submitBtn.textContent = '⏳ جاري الحفظ...'; submitBtn.disabled = true; }
    
    try {
        const id = document.getElementById('mealId').value;
        const name = document.getElementById('mealName').value;
        const description = document.getElementById('mealDescription').value;
        const categoryId = parseInt(document.getElementById('mealCategory').value);
        const hasSizes = document.getElementById('mealHasSizes').checked;
        
        let price = 0;
        let sizes = [];
        
        if (hasSizes) {
            sizes = getSizesFromForm();
            if (sizes.length === 0) throw new Error('يرجى إضافة حجم واحد على الأقل');
            price = Math.min(...sizes.map(s => s.price));
        } else {
            price = parseFloat(document.getElementById('mealPrice').value) || 0;
            if (price <= 0) throw new Error('يرجى إدخال سعر صحيح');
        }
        
        let image = '';
        const preview = document.getElementById('mealImagePreview');
        if (preview.style.display !== 'none') {
            image = preview.querySelector('img').src;
        }
        const croppedData = document.getElementById('croppedImageData');
        if (croppedData && croppedData.value) image = croppedData.value;
        
        const mealData = { name, price, description, categoryId, image: image || null, hasSizes, sizes, active: true };
        
        if (id) {
            const existing = getMeals().find(m => m.id == id);
            await updateMealData({ ...existing, ...mealData, id: parseInt(id) });
            showToast('تم تحديث الوجبة بنجاح', 'success');
        } else {
            await createMealData({ ...mealData, popular: false, order: getMeals().length + 1 });
            showToast('تم إضافة الوجبة بنجاح', 'success');
        }
        
        closeMealModal();
        renderMeals();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (submitBtn) { submitBtn.textContent = 'حفظ'; submitBtn.disabled = false; }
    }
}

function toggleSizesSection() {
    const hasSizes = document.getElementById('mealHasSizes').checked;
    const sizesSection = document.getElementById('sizesSection');
    const singlePriceGroup = document.getElementById('singlePriceGroup');
    
    if (hasSizes) {
        sizesSection.style.display = 'block';
        singlePriceGroup.style.display = 'none';
        if (document.getElementById('sizesContainer').children.length === 0) {
            addSizeRow('صغير', '');
            addSizeRow('وسط', '');
            addSizeRow('كبير', '');
        }
    } else {
        sizesSection.style.display = 'none';
        singlePriceGroup.style.display = 'block';
    }
}

function addSizeRow(sizeName = '', sizePrice = '') {
    const container = document.getElementById('sizesContainer');
    const rowId = Date.now() + Math.random().toString(36).substr(2, 5);;
    
    const row = document.createElement('div');
    row.className = 'size-row';
    row.id = `size-row-${rowId}`;
    row.innerHTML = `
        <input type="text" class="form-input size-name" placeholder="اسم الحجم" value="${sizeName}">
        <input type="number" class="form-input size-price" placeholder="السعر" value="${sizePrice}">
        <button type="button" class="btn-remove-size" onclick="removeSizeRow('size-row-${rowId}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
    `;
    container.appendChild(row);
}

function removeSizeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    if (document.getElementById('sizesContainer').children.length === 0) addSizeRow('', '');
}

function getSizesFromForm() {
    const sizes = [];
    document.querySelectorAll('#sizesContainer .size-row').forEach(row => {
        const name = row.querySelector('.size-name').value.trim();
        const price = parseFloat(row.querySelector('.size-price').value) || 0;
        if (name && price > 0) sizes.push({ name, price });
    });
    return sizes;
}

async function toggleMealActive(id) {
    const meal = getMeals().find(m => m.id === id);
    if (meal) {
        const updated = { ...meal, active: !meal.active };
        await updateMealData(updated);
        renderMeals();
        showToast(`${updated.name} ${updated.active ? 'متاح الآن' : 'غير متاح'}`, updated.active ? 'success' : 'warning');
    }
}

function bulkToggleMeals(activate) {
    const currentCategory = document.getElementById('mealsCategorySelect').value;
    let meals = getMeals();
    let targetMeals = meals;
    if (currentCategory && currentCategory !== 'all') {
        targetMeals = meals.filter(m => m.categoryId == currentCategory);
    }
    
    if (!confirm(`هل تريد ${activate ? 'تفعيل' : 'إيقاف'} ${targetMeals.length} وجبة؟`)) return;
    
    // Save Meals is deprecated in data.js, but since we modify many, we iterate
    // Ideally backend has bulk update endpoint. For now iterating is acceptable on small scale
    // Or just update local state and let background sync?
    // data.js `saveMeals` warns.
    // Let's iterate promises for robustness or just update local if backend is not strict.
    // I'll update local and try to save individually or if api supports bulk? It doesn't seem to.
    
    // Optimistic Update
    targetMeals.forEach(m => {
       if (m.active !== activate) {
           m.active = activate;
           updateMealData(m); // Sends request
       }
    });

    renderMeals();
    showToast('تم تحديث الحالة', 'success');
}

async function deleteMealFunc(id) {
    if (confirm('هل أنت متأكد من حذف الوجبة؟')) {
        try {
             showActionLoader('جاري حذف الوجبة...');
             await deleteMealData(id);
             renderMeals();
             showToast('تم حذف الوجبة', 'warning');
        } catch (e) {
             console.error(e);
             showToast('حدث خطأ أثناء الحذف', 'error');
        } finally {
             hideActionLoader();
        }
    }
}

// Custom Select Logic
window.toggleCustomSelect = function() {
    const trigger = document.getElementById('customCategoryTrigger');
    if (trigger) {
        trigger.classList.toggle('open');
    }
};

window.selectCategoryCustom = function(catId) {
    const parent = document.getElementById('mealsCategorySelect');
    if (parent) {
        parent.value = catId;
        
        // Update Visual Trigger UI to reflect selection
        const selectedOption = document.querySelector(`.custom-option[data-value="${catId}"]`);
        if (selectedOption) {
            // Get content from the clicked option
            const iconEl = selectedOption.querySelector('.option-icon');
            const iconHtml = iconEl ? iconEl.innerHTML : '';
            const text = selectedOption.querySelector('.option-text').innerText;
            
            // Update the trigger content (Icon + Text)
            // The trigger DOM structure is: .custom-select-trigger > div (flex) > icon + span
            const triggerContent = document.querySelector('#customCategoryTrigger .custom-select-trigger > div');
            if (triggerContent) {
                 // Only add icon span if there is an icon
                 const iconSpan = iconHtml ? `<span class="option-icon">${iconHtml}</span>` : '';
                 triggerContent.innerHTML = `${iconSpan}<span>${text}</span>`;
            }
            
            // Render Selection State in List
            document.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
            selectedOption.classList.add('selected');
        }

        // Trigger generic filter function
        if (typeof filterMeals === 'function') {
            filterMeals(catId);
        }
        
        // Close Dropdown
        const triggerWrapper = document.getElementById('customCategoryTrigger');
        if (triggerWrapper) {
            triggerWrapper.classList.remove('open');
        }
    }
};

// Custom Select Logic for Modal (Add/Edit Meal)
window.toggleModalCustomSelect = function() {
    const trigger = document.getElementById('customMealCategoryTrigger');
    if (trigger) {
        trigger.classList.toggle('open');
    }
};

window.selectModalCategory = function(catId) {
    const nativeSelect = document.getElementById('mealCategory');
    if (nativeSelect) {
        nativeSelect.value = catId;
        
        // Re-render Custom UI to show new selected
        if (typeof window.buildModalCustomSelect === 'function') {
            window.buildModalCustomSelect(catId);
        }
    }
};
