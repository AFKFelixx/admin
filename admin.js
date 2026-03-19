// admin.js – Complete version with all render functions
(function() {
    // ---------- Login redirect ----------
    if (sessionStorage.getItem('loggedIn') !== 'true') {
        window.location.href = 'Admin-Login.html';
        return;
    }

    // ---------- Supabase client ----------
    const supabase = window.supabase;
    if (!supabase || !supabase.from) {
        console.error('Supabase client not available');
        document.getElementById('loading-overlay').classList.add('hidden');
        document.body.innerHTML = '<div class="p-8 text-red-600">Supabase client not loaded. Check your supabase-client.js file.</div>';
        return;
    }

    // ---------- Helper functions ----------
    async function compressImage(file, maxWidth = 400, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.floor((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    }, 'image/jpeg', quality);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }

    async function uploadImage(file, folder = 'general') {
        if (!file) return '';
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filePath = `${folder}/${fileName}`;
        const { error } = await supabase.storage.from('cms-images').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (error) {
            console.error('Upload error:', error);
            return '';
        }
        const { data: { publicUrl } } = supabase.storage.from('cms-images').getPublicUrl(filePath);
        return publicUrl;
    }

    function escapeHtml(unsafe) {
        return unsafe.replace(/[&<>"']/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            if (m === "'") return '&#039;';
            return m;
        });
    }

    const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // ---------- Live Date & Time ----------
    function updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const dateTimeStr = now.toLocaleDateString('en-US', options);
        const liveDateTime = document.getElementById('liveDateTime');
        if (liveDateTime) liveDateTime.textContent = dateTimeStr;
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // ---------- Sidebar collapse ----------
    const sidebar = document.getElementById('mainSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebarState = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarState) sidebar.classList.add('collapsed');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }

    // ---------- Tab switching (main sidebar) ----------
    document.querySelectorAll('.sidebar-item').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            if (sectionId === 'logout') {
                sessionStorage.removeItem('loggedIn');
                sessionStorage.removeItem('currentUser');
                window.location.href = 'Admin-Login.html';
                return;
            }
            document.querySelectorAll('.sidebar-item').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const target = document.getElementById(`section-${sectionId}`);
            if (target) {
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                target.classList.add('active');
            }
        });
    });

    // ---------- General subnav ----------
    document.querySelectorAll('.subnav-item').forEach(item => {
        item.addEventListener('click', function() {
            const target = this.dataset.subtarget;
            document.querySelectorAll('.general-subsection').forEach(sub => sub.classList.remove('active-subsection'));
            const subsection = document.getElementById(`subsection-${target}`);
            if (subsection) subsection.classList.add('active-subsection');
            document.querySelectorAll('.subnav-item').forEach(i => i.classList.remove('active-sub'));
            this.classList.add('active-sub');
        });
    });

    // ---------- Global state ----------
    let siteData = {};

    // ---------- Load all data from Supabase ----------
    async function loadAllData() {
        try {
            const [
                { data: settings },
                { data: heroSlides },
                { data: newsCategories },
                { data: newsItems },
                { data: officials },
                { data: profileSections },
                { data: lguOffices },
                { data: ligaPunong },
                { data: ligaSk },
                { data: tourismSections },
                { data: tourismImages },
                { data: culturalPlan },
                { data: spesBeneficiaries },
                { data: pesoImages },
                { data: galleryImages },
                { data: aboutContent },
                { data: transparencyCards },
                { data: disclosureCategories },
                { data: disclosureYears },
                { data: downloadForms },
                { data: users }
            ] = await Promise.all([
                supabase.from('site_settings').select('*').eq('id', 1).single(),
                supabase.from('hero_slides').select('*').order('sort_order'),
                supabase.from('news_categories').select('*').order('sort_order'),
                supabase.from('news_items').select('*, news_categories(name)').order('sort_order'),
                supabase.from('officials').select('*').order('sort_order'),
                supabase.from('profile_sections').select('*').order('sort_order'),
                supabase.from('lgu_offices').select('*').order('sort_order'),
                supabase.from('liga_punong').select('*').order('sort_order'),
                supabase.from('liga_sk').select('*').order('sort_order'),
                supabase.from('tourism_sections').select('*'),
                supabase.from('tourism_images').select('*').order('sort_order'),
                supabase.from('tourism_cultural_plan').select('*').eq('id', 1).single(),
                supabase.from('spes_beneficiaries').select('*').order('id'),
                supabase.from('peso_images').select('*').order('sort_order'),
                supabase.from('gallery_images').select('*, gallery_pages(page_number)').order('sort_order'),
                supabase.from('about_content').select('*').eq('id', 1).single(),
                supabase.from('transparency_cards').select('*').order('sort_order'),
                supabase.from('disclosure_categories').select('*').order('sort_order'),
                supabase.from('disclosure_years').select('*').order('sort_order'),
                supabase.from('download_forms').select('*').order('sort_order'),
                supabase.from('users').select('*')
            ]);

            siteData = {
                site: settings || { logo: '', name: 'Municipality of Tobias Fornier' },
                hero: { slides: (heroSlides || []).map(s => s.image_url) },
                newsCategories: (() => {
                    const map = {};
                    (newsItems || []).forEach(item => {
                        const catName = item.news_categories?.name;
                        if (!catName) return;
                        if (!map[catName]) map[catName] = [];
                        map[catName].push({
                            title: item.title,
                            subtitle: item.subtitle,
                            desc: item.description,
                            author: item.author,
                            readTime: item.read_time,
                            timestamp: item.timestamp,
                            link: item.link,
                            image: item.image_url,
                            videoSrc: item.video_src,
                            duration: item.duration
                        });
                    });
                    return map;
                })(),
                officials: (officials || []).map(o => ({ name: o.name, position: o.position, image: o.image_url })),
                municipalProfile: {
                    bannerImage: settings?.logo || '',
                    sections: (profileSections || []).map(s => ({ heading: s.heading, content: s.content, image: s.image_url }))
                },
                lguOffices: (lguOffices || []).map(o => ({ icon: o.icon, name: o.name, services: o.services })),
                liga: {
                    punong: (ligaPunong || []).map(p => ({ barangay: p.barangay, name: p.name })),
                    sk: (ligaSk || []).map(s => ({ barangay: s.barangay, name: s.name }))
                },
                tourism: (() => {
                    const section1 = (tourismSections || []).find(s => s.section_key === 'section1') || {};
                    const section2 = (tourismSections || []).find(s => s.section_key === 'section2') || {};
                    return {
                        section1: {
                            text: section1.text_content || '',
                            images: (tourismImages || []).filter(img => img.section_key === 'section1').map(img => img.image_url)
                        },
                        section2: {
                            text: section2.text_content || '',
                            images: (tourismImages || []).filter(img => img.section_key === 'section2').map(img => img.image_url)
                        },
                        bulletList: section1.bullet_list || '',
                        culturalPlanImage: culturalPlan?.image_url || ''
                    };
                })(),
                peso: {
                    spes: (spesBeneficiaries || []).map(b => ({ name: b.name, address: b.address, years: b.years })),
                    images: (pesoImages || []).map(img => img.image_url)
                },
                gallery: (() => {
                    const pages = { 1: [], 2: [], 3: [] };
                    (galleryImages || []).forEach(img => {
                        const page = img.gallery_pages?.page_number;
                        if (page) pages[page].push(img.image_url);
                    });
                    return pages;
                })(),
                about: aboutContent || {},
                transparency: {
                    bgImage: settings?.colors?.bgImage || '',
                    paragraph: aboutContent?.paragraph || '',
                    cards: (transparencyCards || []).map(c => ({ icon: c.icon, title: c.title, desc: c.description, linkText: c.link_text }))
                },
                disclosure: {
                    categories: (disclosureCategories || []).map(cat => ({
                        summary: cat.summary,
                        years: (disclosureYears || []).filter(y => y.category_id === cat.id).map(y => y.year_label)
                    }))
                },
                download: (downloadForms || []).map(f => ({ icon: f.icon, title: f.title, desc: f.description, link: f.link })),
                users: users || [],
                social: settings?.social_links || [],
                footer: settings?.footer_data || {},
                colors: settings?.colors || {}
            };
        } catch (error) {
            console.error('Error loading data:', error);
            const errorContainer = document.getElementById('error-container');
            if (errorContainer) {
                errorContainer.textContent = 'Failed to load data from Supabase. Using fallback defaults.';
                errorContainer.classList.add('visible');
            }
            siteData = {
                site: { logo: '', name: 'Municipality of Tobias Fornier' },
                hero: { slides: [] },
                newsCategories: {},
                officials: [],
                municipalProfile: { bannerImage: '', sections: [] },
                lguOffices: [],
                liga: { punong: [], sk: [] },
                tourism: { section1: { text: '', images: [] }, section2: { text: '', images: [] }, bulletList: '', culturalPlanImage: '' },
                peso: { spes: [], images: [] },
                gallery: { 1: [], 2: [], 3: [] },
                about: {},
                transparency: { bgImage: '', paragraph: '', cards: [] },
                disclosure: { categories: [] },
                download: [],
                users: [],
                social: [],
                footer: {},
                colors: {}
            };
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    }

    // ========== RENDER FUNCTIONS (full implementations from original admin.js) ==========

    // ---------- Site Header Panel ----------
    function renderSiteHeader() {
        const container = document.getElementById('subsection-site-header');
        if (!container) return;
        container.innerHTML = `
            <h3 class="text-xl font-semibold text-[#2e5fa7] mb-4">Site Header Panel</h3>
            <div class="grid gap-6">
                <div><label class="block font-semibold mb-2">Site Logo</label>
                    <div class="flex items-center gap-4">
                        <img id="logoPreview" src="${siteData.site.logo || 'https://via.placeholder.com/80?text=Logo'}" class="w-20 h-20 object-contain border rounded-lg">
                        <input type="file" id="logoUpload" accept="image/*" class="block w-full text-sm">
                    </div>
                </div>
                <div><label class="block font-semibold mb-2">Site Name</label>
                    <input type="text" id="siteName" value="${siteData.site.name}" class="w-full border rounded-lg px-4 py-2">
                </div>
            </div>
            <div class="mt-8 border-t pt-6">
                <h4 class="text-lg font-bold text-[#2e5fa7] mb-4">Social Media Icons</h4>
                <div id="social-icons-container" class="space-y-3"></div>
                <button type="button" id="addSocialIcon" class="text-[#2e5fa7] text-sm"><i class="fas fa-plus-circle"></i> Add Icon</button>
            </div>
        `;
        const socialContainer = document.getElementById('social-icons-container');
        const socialIcons = siteData.social || [{ icon: 'facebook-f', url: '#' }];
        socialIcons.forEach(item => addSocialIconRow(item.icon, item.url));
        document.getElementById('addSocialIcon').addEventListener('click', () => addSocialIconRow('facebook-f', '#'));
        document.getElementById('logoUpload').addEventListener('change', async function(e) {
            if (e.target.files[0]) {
                const compressed = await compressImage(e.target.files[0]);
                document.getElementById('logoPreview').src = compressed;
            }
        });
    }

    function addSocialIconRow(icon = 'facebook-f', url = '#') {
        const container = document.getElementById('social-icons-container');
        const div = document.createElement('div');
        div.className = 'repeatable-item flex gap-3 items-center';
        div.innerHTML = `
            <select class="border rounded px-3 py-2 w-32">
                <option value="facebook-f" ${icon==='facebook-f'?'selected':''}>facebook-f</option>
                <option value="twitter" ${icon==='twitter'?'selected':''}>twitter</option>
                <option value="instagram" ${icon==='instagram'?'selected':''}>instagram</option>
                <option value="youtube" ${icon==='youtube'?'selected':''}>youtube</option>
            </select>
            <input type="url" value="${url}" class="flex-1 border rounded px-3 py-2">
            <button class="text-red-600" onclick="this.closest('.repeatable-item').remove()"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    }

    // ---------- Hero Section ----------
    function renderHero() {
        const container = document.getElementById('subsection-hero');
        if (!container) return;
        container.innerHTML = `
            <h3 class="text-xl font-semibold text-[#2e5fa7] mb-4">Hero Section</h3>
            <div id="heroSlidesContainer" class="space-y-4"></div>
            <button type="button" id="addSlide" class="text-[#2e5fa7] text-sm"><i class="fas fa-plus-circle"></i> Add Slide</button>
        `;
        const slidesContainer = document.getElementById('heroSlidesContainer');
        const slides = siteData.hero.slides.length ? siteData.hero.slides : [
            'https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?w=200&q=80',
            'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=200&q=80',
            'https://images.unsplash.com/photo-1564419320467-68788cdc6d7c?w=200&q=80'
        ];
        slides.forEach(src => addHeroSlide(src));
        document.getElementById('addSlide').addEventListener('click', () => addHeroSlide());
    }

    function addHeroSlide(src = 'https://via.placeholder.com/200?text=New') {
        const container = document.getElementById('heroSlidesContainer');
        const div = document.createElement('div');
        div.className = 'repeatable-item slide-item';
        div.innerHTML = `
            <label class="font-semibold">Slide Image</label>
            <input type="file" accept="image/*" class="slide-upload block w-full mt-1">
            <img class="slide-preview mt-2 h-20 object-cover rounded" src="${src}">
            <button class="mt-2 text-red-600 text-sm" onclick="this.closest('.repeatable-item').remove()"><i class="fas fa-trash"></i> Remove</button>
        `;
        container.appendChild(div);
        div.querySelector('.slide-upload').addEventListener('change', async function(e) {
            if (e.target.files[0]) {
                const compressed = await compressImage(e.target.files[0]);
                div.querySelector('.slide-preview').src = compressed;
            }
        });
    }

    // ---------- Footer Settings ----------
    function renderFooter() {
        const container = document.getElementById('subsection-footer');
        if (!container) return;
        const footerData = siteData.footer || {
            addressLine1: 'Poblacion, Tobias Fornier, Antique',
            addressLine2: 'Philippines 5716',
            email: 'tobiasfornier@gmail.com',
            phone: '(036) 123-4567',
            quickLinks: [{ text: 'Privacy Policy', url: '#' }],
            hotlines: [{ name: 'Emergency', number: '911' }],
            agencies: [{ name: 'DPWH', image: '', label: 'Department of Public Works' }]
        };
        container.innerHTML = `
            <h3 class="text-xl font-semibold text-[#2e5fa7] mb-4">Footer Settings</h3>
            
            <div class="grid gap-4 mb-6">
                <h4 class="font-bold text-[#2e5fa7] text-lg">CONNECT - Address</h4>
                <div><label class="block font-semibold">Line 1</label>
                    <input type="text" id="footerAddressLine1" value="${footerData.addressLine1 || ''}" class="w-full border rounded px-4 py-2">
                </div>
                <div><label class="block font-semibold">Line 2</label>
                    <input type="text" id="footerAddressLine2" value="${footerData.addressLine2 || ''}" class="w-full border rounded px-4 py-2">
                </div>
                <div><label class="block font-semibold">Email</label>
                    <input type="email" id="footerEmail" value="${footerData.email || ''}" class="w-full border rounded px-4 py-2">
                </div>
                <div><label class="block font-semibold">Phone</label>
                    <input type="text" id="footerPhone" value="${footerData.phone || ''}" class="w-full border rounded px-4 py-2">
                </div>
            </div>

            <div class="mt-6 border-t pt-4">
                <h4 class="text-lg font-bold text-[#2e5fa7] mb-3">Quick Links</h4>
                <div id="quickLinksContainer" class="space-y-2"></div>
                <button type="button" id="addQuickLink" class="text-[#2e5fa7] text-sm"><i class="fas fa-plus-circle"></i> Add Link</button>
            </div>

            <div class="mt-6 border-t pt-4">
                <h4 class="text-lg font-bold text-[#2e5fa7] mb-3">Emergency Hotlines</h4>
                <div id="hotlinesContainer" class="space-y-2"></div>
                <button type="button" id="addHotline" class="text-[#2e5fa7] text-sm"><i class="fas fa-plus-circle"></i> Add Hotline</button>
            </div>

            <div class="mt-6 border-t pt-4">
                <h4 class="text-lg font-bold text-[#2e5fa7] mb-3">Municipality Agencies (image + label)</h4>
                <div id="agenciesContainer" class="space-y-2"></div>
                <button type="button" id="addAgency" class="text-[#2e5fa7] text-sm"><i class="fas fa-plus-circle"></i> Add Agency</button>
            </div>
        `;

        const linksContainer = document.getElementById('quickLinksContainer');
        (footerData.quickLinks || []).forEach(link => addQuickLinkRow(link.text, link.url));
        document.getElementById('addQuickLink').addEventListener('click', () => addQuickLinkRow('', ''));

        const hotlinesContainer = document.getElementById('hotlinesContainer');
        (footerData.hotlines || []).forEach(h => addHotlineRow(h.name, h.number));
        document.getElementById('addHotline').addEventListener('click', () => addHotlineRow('', ''));

        const agenciesContainer = document.getElementById('agenciesContainer');
        (footerData.agencies || []).forEach(a => addAgencyRow(a.name, a.image, a.label));
        document.getElementById('addAgency').addEventListener('click', () => addAgencyRow('', '', ''));
    }

    function addQuickLinkRow(text = '', url = '') {
        const container = document.getElementById('quickLinksContainer');
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center';
        div.innerHTML = `
            <input type="text" placeholder="Link text" value="${text}" class="border rounded px-2 py-1 flex-1">
            <input type="url" placeholder="URL" value="${url}" class="border rounded px-2 py-1 flex-1">
            <button class="text-red-600" onclick="this.closest('div').remove()"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    }

    function addHotlineRow(name = '', number = '') {
        const container = document.getElementById('hotlinesContainer');
        const div = document.createElement('div');
        div.className = 'hotline-item flex gap-2 items-center';
        div.innerHTML = `
            <input type="text" placeholder="Name (e.g. Police)" value="${name}" class="border rounded px-2 py-1 flex-1">
            <input type="text" placeholder="Number" value="${number}" class="border rounded px-2 py-1 flex-1">
            <button class="text-red-600" onclick="this.closest('div').remove()"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    }

    function addAgencyRow(name = '', image = '', label = '') {
        const container = document.getElementById('agenciesContainer');
        const div = document.createElement('div');
        div.className = 'agency-item flex gap-3 items-center flex-wrap';
        div.innerHTML = `
            <div class="relative w-16 h-16 border rounded overflow-hidden flex-shrink-0">
                <img class="agency-image w-full h-full object-cover" src="${image || 'https://via.placeholder.com/64?text=Agency'}" alt="agency">
                <input type="file" accept="image/*" class="agency-upload hidden">
                <button class="change-agency-image absolute bottom-0 left-0 bg-black/60 text-white text-xs w-full py-0.5 opacity-0 hover:opacity-100 transition">Change</button>
            </div>
            <input type="text" placeholder="Agency name (key)" value="${name}" class="border rounded px-2 py-1 flex-1">
            <input type="text" placeholder="Display label" value="${label}" class="border rounded px-2 py-1 flex-1">
            <button class="text-red-600" onclick="this.closest('.agency-item').remove()"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);

        const changeBtn = div.querySelector('.change-agency-image');
        const fileInput = div.querySelector('.agency-upload');
        const img = div.querySelector('.agency-image');
        changeBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            if (fileInput.files[0]) {
                const compressed = await compressImage(fileInput.files[0]);
                img.src = compressed;
            }
        });
    }

    // ---------- Color Adjustment ----------
    function renderColor() {
        const colors = siteData.colors || {
            primary: '#2e5fa7',
            secondary: '#16a34a',
            backgroundLight: '#f3f4f6',
            textDark: '#111827'
        };
        const container = document.getElementById('subsection-color');
        if (!container) return;
        container.innerHTML = `
            <h3 class="text-xl font-semibold text-[#2e5fa7] mb-4">Webpage Color Adjustment</h3>
            <p class="text-sm text-gray-500 mb-4">These settings will be applied site-wide.</p>
            <div class="grid gap-5 sm:grid-cols-2">
                <div><label class="block font-medium mb-1">Primary Color</label>
                    <input type="color" id="primaryColor" value="${colors.primary}" class="w-10 h-10">
                </div>
                <div><label class="block font-medium mb-1">Secondary Color</label>
                    <input type="color" id="secondaryColor" value="${colors.secondary}" class="w-10 h-10">
                </div>
                <div><label class="block font-medium mb-1">Background Light</label>
                    <input type="color" id="backgroundLight" value="${colors.backgroundLight}" class="w-10 h-10">
                </div>
                <div><label class="block font-medium mb-1">Text Dark</label>
                    <input type="color" id="textDark" value="${colors.textDark}" class="w-10 h-10">
                </div>
            </div>
        `;
    }

    // ---------- System Settings ----------
    function renderSystem() {
        document.getElementById('maintenanceMode').value = siteData.system?.maintenance || 'off';
        document.getElementById('defaultLang').value = siteData.system?.lang || 'en';

        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        const users = siteData.users || [
            { username: 'Admin', email: 'admin@example.com', role: 'Administrator', password: 'admin123', status: 'Active' }
        ];
        users.forEach(user => addUserRow(user));
    }

    function addUserRow(user) {
        const tbody = document.getElementById('usersList');
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.dataset.userId = user.id || user.email;
        row.dataset.user = JSON.stringify(user);

        row.innerHTML = `
            <td class="px-3 py-2">${escapeHtml(user.username || '')}</td>
            <td class="px-3 py-2">${escapeHtml(user.email)}</td>
            <td class="px-3 py-2">${escapeHtml(user.role)}</td>
            <td class="px-3 py-2">${escapeHtml(user.status)}</td>
            <td class="px-3 py-2">
                <button class="edit-user text-blue-600 hover:text-blue-800 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="delete-user text-red-600 hover:text-red-800" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;

        row.querySelector('.edit-user').addEventListener('click', () => {
            const userData = JSON.parse(row.dataset.user);
            openUserModal(userData);
        });

        row.querySelector('.delete-user').addEventListener('click', () => {
            if (confirm('Delete this user?')) row.remove();
        });

        tbody.appendChild(row);
    }

    // ---------- User Modal ----------
    const modal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalUsername = document.getElementById('modalUsername');
    const modalEmail = document.getElementById('modalEmail');
    const modalRole = document.getElementById('modalRole');
    const modalPassword = document.getElementById('modalPassword');
    const modalStatus = document.getElementById('modalStatus');
    const modalCancel = document.getElementById('modalCancel');
    const modalSave = document.getElementById('modalSave');

    let editingUserId = null;

    function openUserModal(user = null) {
        modal.classList.remove('hidden');
        if (user) {
            modalTitle.textContent = 'Edit User';
            modalUsername.value = user.username || '';
            modalEmail.value = user.email || '';
            modalRole.value = user.role || 'Editor';
            modalPassword.value = user.password || '';
            modalStatus.value = user.status || 'Active';
            editingUserId = user.id || user.email;
        } else {
            modalTitle.textContent = 'Add User';
            modalUsername.value = '';
            modalEmail.value = '';
            modalRole.value = 'Editor';
            modalPassword.value = '';
            modalStatus.value = 'Active';
            editingUserId = null;
        }
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    modalCancel.addEventListener('click', closeModal);
    modalSave.addEventListener('click', () => {
        const username = modalUsername.value.trim();
        const email = modalEmail.value.trim();
        const role = modalRole.value;
        const password = modalPassword.value;
        const status = modalStatus.value;

        if (!username || !email) {
            alert('Username and email are required.');
            return;
        }

        const newUser = {
            id: editingUserId || Date.now().toString(),
            username,
            email,
            role,
            password,
            status
        };

        if (editingUserId) {
            const existingRow = document.querySelector(`#usersList tr[data-user-id="${editingUserId}"]`);
            if (existingRow) {
                existingRow.dataset.user = JSON.stringify(newUser);
                existingRow.innerHTML = `
                    <td class="px-3 py-2">${escapeHtml(username)}</td>
                    <td class="px-3 py-2">${escapeHtml(email)}</td>
                    <td class="px-3 py-2">${escapeHtml(role)}</td>
                    <td class="px-3 py-2">${escapeHtml(status)}</td>
                    <td class="px-3 py-2">
                        <button class="edit-user text-blue-600 hover:text-blue-800 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="delete-user text-red-600 hover:text-red-800" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                existingRow.querySelector('.edit-user').addEventListener('click', () => openUserModal(newUser));
                existingRow.querySelector('.delete-user').addEventListener('click', () => {
                    if (confirm('Delete this user?')) existingRow.remove();
                });
            }
        } else {
            const tbody = document.getElementById('usersList');
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            row.dataset.userId = newUser.id;
            row.dataset.user = JSON.stringify(newUser);
            row.innerHTML = `
                <td class="px-3 py-2">${escapeHtml(username)}</td>
                <td class="px-3 py-2">${escapeHtml(email)}</td>
                <td class="px-3 py-2">${escapeHtml(role)}</td>
                <td class="px-3 py-2">${escapeHtml(status)}</td>
                <td class="px-3 py-2">
                    <button class="edit-user text-blue-600 hover:text-blue-800 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="delete-user text-red-600 hover:text-red-800" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            `;
            row.querySelector('.edit-user').addEventListener('click', () => openUserModal(newUser));
            row.querySelector('.delete-user').addEventListener('click', () => {
                if (confirm('Delete this user?')) row.remove();
            });
            tbody.appendChild(row);
        }

        closeModal();
    });

    document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // ---------- Key Officials Editor ----------
    const officialsGrid = document.getElementById('officialsGrid');

    function renderOfficials() {
        officialsGrid.innerHTML = '';
        const officials = siteData.officials || [
            { name: "Hon. Ernesto O. Tajanlangit II", position: "Municipal Mayor", image: "" },
            { name: "Hon. Jose Maria A. Fornier", position: "Municipal Vice Mayor", image: "" },
            { name: "Hon. Rene Magdaong", position: "Councilor, SANGGUNIANG BAYAN", image: "" },
            { name: "Hon. Marlo Macabanti", position: "Councilor, SANGGUNIANG BAYAN", image: "" },
            { name: "Hon. Dindo John Lignig", position: "Councilor, SANGGUNIANG BAYAN", image: "" },
            { name: "Hon. Ma. Orchid P. Fornier", position: "Councilor, SANGGUNIANG BAYAN", image: "" },
            { name: "Hon. Rolando Magos Jr", position: "Councilor, SANGGUNIANG BAYAN", image: "" },
            { name: "Hon. Tess Asenjo", position: "Councilor, SANGGUNIANG BAYAN", image: "" },
            { name: "Hon. Melvin Flor", position: "Councilor, SANGGUNIANG BAYAN", image: "" },
            { name: "Hon. Eileen Macadangdang", position: "Councilor, SANGGUNIANG BAYAN", image: "" },
            { name: "Hon. Denn Estaris", position: "SK Chairman / Ex Officio", image: "" },
            { name: "Hon. Jose Magallon", position: "ABC President / Ex Officio", image: "" },
            { name: "Ms Arlyn Y. Gozon", position: "Municipal Treasurer / Dept. Head", image: "" },
            { name: "Ms Jay-Anne Kristelle Valdellon", position: "Municipal Accountant / Dept. Head", image: "" },
            { name: "Ms Karen Genterola", position: "Municipal Budget Officer / Dept. Head", image: "" }
        ];
        officials.forEach(off => addOfficialCard(off.name, off.position, off.image));
    }

    function addOfficialCard(name = '', position = '', image = '') {
        const card = document.createElement('div');
        card.className = 'official-card relative';
        card.innerHTML = `
            <button class="remove-official absolute top-2 right-2 text-red-600 hover:text-red-800" title="Remove"><i class="fas fa-trash-alt"></i></button>
            <div class="relative w-32 h-32 mx-auto mb-3">
                <img class="official-image-preview w-full h-full object-cover rounded-full border-3 border-[#2e5fa7]" src="${image || 'https://via.placeholder.com/120?text=Photo'}">
                <input type="file" accept="image/*" class="official-image-upload hidden">
                <button class="change-official-image absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-[#2e5fa7] text-white text-xs px-2 py-0.5 rounded-full opacity-0 hover:opacity-100 transition">Change</button>
            </div>
            <input type="text" placeholder="Full name" value="${name}" class="official-name-input w-full border rounded px-3 py-2 text-sm mb-2">
            <input type="text" placeholder="Position / Title" value="${position}" class="official-position-input w-full border rounded px-3 py-2 text-sm">
        `;

        const preview = card.querySelector('.official-image-preview');
        const fileInput = card.querySelector('.official-image-upload');
        const changeBtn = card.querySelector('.change-official-image');
        changeBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            if (fileInput.files[0]) {
                const compressed = await compressImage(fileInput.files[0]);
                preview.src = compressed;
            }
        });

        card.querySelector('.remove-official').addEventListener('click', (e) => {
            e.stopPropagation();
            card.remove();
        });

        officialsGrid.appendChild(card);
    }

    document.getElementById('addOfficialBtn').addEventListener('click', () => {
        addOfficialCard('New Official', 'Position', '');
    });

    // ---------- Municipal Profile Editor ----------
    const profileBannerPreview = document.getElementById('profileBannerPreview');
    const profileBannerUpload = document.getElementById('profileBannerUpload');
    const removeBannerBtn = document.getElementById('removeBannerBtn');
    const profileSectionsContainer = document.getElementById('profileSectionsContainer');

    removeBannerBtn.addEventListener('click', function() {
        profileBannerPreview.src = TRANSPARENT_PIXEL;
        profileBannerUpload.value = '';
    });

    function getDefaultProfileSections() {
        return [
            { heading: "", content: "<p><strong>MUNICIPALITY OF TOBIAS FORNIER</strong></p><p>The town of “Dao” was officially renamed as Tobias Fornier by virtue of Batas Pambansa Blg. 10 of 1978. Dao is the second (2nd) southernmost town in the Province of Antique. It has a total land area of 11,212 hectares and is composed of fifty (50) barangays of which 12 are coastal, 4 lowlands and 34 upland. Based on the latest survey of the Philippine Statistics Authority (2020), it has a total of 33,816 population.</p><p>Not a large town by any standard, Tobias Fornier still boasts of its 50 barangays with as many as 142 sitios. Barangays Abaca, Igdalaguit and Nasuli A have the most number of sitios but it is the barangays of Villaflor and Igtugas that have the largest land area.</p><p>Tobias Fornier is 98 kilometers away from Iloilo City and 27 kilometers away from San Jose de Buenavista, the capital town of Antique. Transportation is very accessible. It can be reached by buses from Iloilo and public utility jeepneys from San Jose. Tobias Fornier is known of it’s beautiful and clean beaches and mountain resorts good for lovers and family holiday treats. Tricycles are available from 5:00 AM to 7:00 PM or can be hired anytime of the day or night. Surely this is also a place where you can find mountains meeting the sea.</p>", image: "" },
            { heading: "VISION", content: "<p>“TOBIAS FORNIER: A PROGRESSIVE AND COMPETITIVE AGRI-BUSINESS OF THE SOUTH PROVIDING SUSTAINABLE ECONOMIC GROWTH TO HEALTHY, SELF-RELIANT, AND EMPOWERED PEOPLE WHO ENJOY A BETTER QUALITY OF LIFE IN AN ECOLOGICALLY-BALANCE COMMUNITY, GOVERNED BY DEDICATED AND HONEST LEADERS”</p>", image: "" },
            { heading: "MISSION", content: "<p>Provide adequate and modern technology to the people<br>Improve the facilities to ensure effective, efficient and sustainable delivery of quality health service through Government Organization (GO)-Non-government Organization (NGO) Partnership<br>Strengthen the commitment among public officials and employees for a good governance<br>Protect, conserve, preserve our natural resources for a sustainable development</p>", image: "" },
            { heading: "BUSINESS", content: "<p>As a fourth class Municipality, Tobias Fornier generates local revenues out of business establishments that gradually sprouted in the locality. Majority of the locally registered establishments in Tobias Fornier are small scale and service oriented. About 10 percent of these establishments are sari-sari stores distributed municipal wide. Aside from this, there are also grocery stores and general merchandizing, bakeries, fast food chains (milk teas/pizza pie, shawarma houses), convenience stores like 7/11, salons, notary public and hard wares located mostly in Poblacion Sur and Poblacion Norte which are considered as the center of commerce in the Municipality.</p><p>The One Town One Product of the National Government was given due credence by the local officials. A starting capital was given to Buri Handicraft Association Inc. (BUHAI) in the previous years to promote buri products as the product identity of Tobias Fornier. As well as Bamboo Crafters excels their talents in creating arts out of bamboo. Bamboo Furnitures (sala and dining sets), wind chimes, lamps and lanterns, baskets, boxes, trays and many others. These buri handicraft find its way to other provinces and cities as well as to foreign countries as their market.</p>", image: "" },
            { heading: "AGRICULTURE", content: "<p>Since the Municipality of Tobias Fornier is agricultural in character, economic activities is concentrated on the use of its land resources in the production of goods considered as basic to man’s survival. However, 6,617 hectares or 59.02% of the entire land area are planted with various crops. Out of this, rice lands have the widest coverage with 2,967.88 hectares or 44.85% of the overall agricultural areas but it is noted that only about 609.74 hectares or 9.2% of these are considered to be irrigated lands. Generally, palay registered the largest volume of production among variety of crops grown locally with an average yield of 3.90 metric tons per hectare followed by coconut and corn with 1.00 metric ton per hectare. Based on agricultural production, the Municipality is considered to be a rice producer with surplus production an average 23.44% (as per CY 2016-2020 data) being shipped to other places within the Province, Iloilo and even in the Island of Negros and Cebu.</p>", image: "" },
            { heading: "ROAD NETWORK", content: "<p>As of CY 2021, Tobias Fornier have a total road network of 119.42 kilometers (km) of which 17.28 kilometers are classified as National Road and all concreted; the Provincial road has a total length of 14.97 kilometers of which 10.16 km concreted and 4.81 gravel and earth fill road, while the municipal road has a total length of 2.25 kilometers which are all concrete paved. Barangay Road has a total length of 74.60 kilometers of which 33.72 km concreted, 40.88 km earth fill road.</p><p>Based on records, thirty seven (37) barangays (74%) have year-round road access while 13 barangays (26%) are accessible only during the dry season. Likewise, sitios are accessible only through trails or footpaths. However, at present due to the massive use of motorcycles, upland barangays can now be reached by commuters and riding public with the services of “habal-habal” (motorcycle used as passenger vehicle plying the route of upland barangays). Jeepneys and other vehicles also serve the commuters in all barangays of the municipality during dry season with the rehabilitation of all farms to market roads undertaken by the LGU annually that starts on or before the onset of dry season.</p><p>The municipal roads of the LGU are almost 100% concreted while the road networks linking the barangays to the main thoroughfares are being concreted gradually. Of the total length of 74.60 kilometers barangay of farm to market roads, only 33.72 kilometers are concrete and the rest are earth roads. Most of the farm to market roads have only 3 meters wide road right of ways and others have 6 meters this depends on the terrain especially in the remote upland barangays.</p>", image: "" },
            { heading: "HEALTH", content: "<p>The Municipal Health Center being a health facility serves as a birthing clinic which cater to normal deliveries, provides basic laboratory services, general medical services, minor surgical procedures, health and sanitation services and other health related concerns. Provision of drugs and medicines as primary care package under the health Programs. At present, the Municipal Health Center is accredited by the Philippine Health Insurance Corporation (PHIC), under 2 categories, DOTS package (Tuberculosis Drug Treatment), and the MCP-NBS packages (Maternal Care package and Newborn Services package). Aside from the Municipal Health Center, there are six (6) existing barangay health stations in Atiotes, Barasanan B, Diclum, Gamad, Igbangcal B, and Igdanlog. Fourteen (14) newly constructed Barangay Health Stations in Atabay, Barasanan A, Ballescas, Igbalogo, Igbangcal-C, Igcabuad, Igcado, Igcalawagan, Igtugas, Sto. Tomas, Villaflor, Quezon, Nagsubuan, and Nasuli-A. One (1) Newly Constructed Main Birthing Health Station in Barangay Poblacion Norte. One (1) government hospital that cater to the health needs of the people.</p>", image: "" },
            { heading: "NUTRITION", content: "<p>The health of every citizen is of prime importance especially during his/her formative years. It is for this reason, that several nutrition related initiatives are being undertaken in the Municipality of Tobias Fornier in support to nutrition program. The various enhancement strategies being delivered by the Barangay Nutrition Scholars (BNS), other barangay volunteer workers, municipal health workers and leaders have helped maintain the normal nutritional status of children in their vulnerable age. In 2011, DOST PINOY Program was introduced to the municipality of Tobias Fornier along with other two municipalities (Tibiao and Barbaza). The municipality was chosen to pilot this program because for several consecutive years, it ranked number 1 with the highest prevalence rate of malnutrition in the province. With the introduction of DOST PINOY Program in 2011 intended for infants and young children, it is interesting to note that this created a breakthrough in the improvement of the body weight of children beneficiaries. The DOST PINOY Program provided a package of nutrition intervention to reduce the prevalence of underweight among 6 to 35 month-old children through 120-days feeding. The FNRI-DOST developed complementary food blends and snack curls (Rice-Mongo-Sesame blend) complemented with nutrition education to mothers/caregivers on basic nutrition, breastfeeding, complementary feeding, meal planning, safe food handling and preparation, and backyard vegetable gardening. Due to the introduction of this program, the nutritional status of the municipality has been elevated. With the continued implementation of the program, the municipality ranked number 14 in the 2014 Operation Timbang Plus’s combined underweight and severely underweight prevalence magnitude in the province of Antique. The positive outcome of this postnatal intervention inspired the Local Chief Executive and nutrition stakeholders to strongly consider increasing the budget for Nutrition Program. The sustainability of the program was ensured through generous Nutrition Program Budget every year. A big slice of the nutrition budget goes to complementary feeding to malnourished pre-schoolers where local complementary foods such as Mongo-Rice-Sesame food blend were utilized and purchased by the municipality from the University of Antique. In 2021, with the 2,207,000.00 pesos Nutrition budget, 700,000.00 pesos (31.7%) was allotted to complementary feeding with the inclusion of pregnant women and lactating mothers, particularly those at risk as beneficiaries. This prenatal preventive measure is geared to avoid having stunted children in the future. The LGU-Tobias Fornier shall continue its commitment to strengthen efforts in addressing nutrition challenges confronting the municipality through more creative initiatives. Nutrition program is assured of its sustainability by the LGU as it is the appropriate response to the nutrition challenge.</p>", image: "" },
            { heading: "SOCIAL WELFARE SERVICES", content: "<p>The Office of Municipal Social Welfare & Development is the social welfare arm of the Municipal Government mandated by Local Government Code of 1991 to address poverty-related concerns and committed to care, protection and rehabilitation of individuals, families, groups and communities. In response to the improvement of social protection and equitable distribution of services and resources among the poor, the following programs and services are being served or extended by MSWD Office: Day Care Service Program, Sustainable Livelihood Program, Aid to Individual in Crisis Situation, Family Counseling Service, Pre-Marriage Counseling, Assistance to Senior Citizen, Assistance to Differently Abled Person, Special Social Services (Anti-Violence Against Women and their Children, Child Abuse, Children in Conflict with the Law), Referrals to other social welfare institution or agencies (educational assistance, medical & burial assistance, assistive devise & temporary shelter for abused women and children), Solo Parents, Youth Program, Pantawid Pamilyang Pilipino Program (4Ps), Kapit Bisig Laban Sa Kahirapan-Comprehensive & Integrated Delivery of Social Services – National Community Driven Development Program (Kalahi-CIDSS-NCDDP).</p>", image: "" },
            { heading: "PEACE AND ORDER", content: "<p>Tobias Fornier is relatively a peaceful Municipality with peace loving and God fearing people. During the previous years, the Municipality was never identified as a hotspot area per police record. There were crime incidence, but they were considered as petty and there was no significant case that will qualify as heinous crime. Although there were some areas or barangays reported with drug related activities, but these are manageable. The maintenance of peace and order is one great important factor in nation building. Everyone has the right to live in a democratic society where the people are happy, secured and protected. The present administration emphasizes that there is always a need for continuing education and awareness of the public and other stakeholders in the concept of shared responsibility in the maintenance of peace and order, while the PNP continuously fulfill their mission as vanguards of peace and order being supported by the Barangay Tanods in their respective areas of responsibility.</p>", image: "" },
            { heading: "CSOs/NGOs LINKAGES", content: "<p>Partnership between the LGU and the CSOs/NGOs is an ideal thrust in bringing the government and its basic services to the grassroots level of the society. Considered as partners for progress, the local administration is focusing on needs responsive interventions for the development of these sectoral groups particularly farmers, fisher folk, women’s groups and other marginalized sectors in order for them to contribute for the progress of the community, even just in a small but noble way. In 2021, there were about fifty eight (58) CSOs/NGOs accredited by the Sangguniang Bayan that are actively participating in the developmental programs of the Municipality. They are mostly involved in planning, implementing and monitoring which is evident during the Municipal Development Council meetings as well as in KALAHI-CIDSS, BUB and other programs of the LGU. The Civil Society Organizations (CSOs) serve as the complementary arm of the LGU in its pursuit for the economic advancement and stability.</p>", image: "" },
            { heading: "EDUCATION", content: "<p>The Municipality offers two levels of education, the elementary and secondary education. Elementary education is being catered by eight (8) primary schools and twenty five (25) complete elementary schools, some of these are multi grade schools while the rest are mono grade schools. Secondary education is being provided by six (6) public and one (1) private school. There are three (3) private elementary schools operating in the Municipality. Pre-school education is one of the priority programs of the Local Administration. Forty four (44) Daycare Centers were established in 41 barangays to promote the Early Childhood Care and Development Program of the present administration. Three private pre-schools operate within the Municipality.</p>", image: "" },
            { heading: "ENVIRONMENT", content: "<p>The Municipality of Tobias Fornier is a town blessed with different natural resources and ecosystems that are beneficial to both Daonhons and other living organisms. People in the upland areas depend on upland resources for their daily source of income. At the same time, fisher folks also depend on coastal resources for their livelihood. These are the reasons why, LGU’s programs and projects are gearing towards environmental protection and conservation. Currently, the LGU of Tobias Fornier has three (3) major programs on environmental management and integrated response to climate change. These programs include Upland Resource Management, Coastal Resource Management, Ecological Solid Waste Management, and Disaster Risk Reduction Management. Coastal Resource Management Program deals with Mangrove, Corals, Sea grass and other ecosystem management and preservation. This also responds to the issues on livelihood, and law enforcement and coastal communities’ compliance to municipal and national law. The Upland Resource Management Program involves forest area management and municipal watershed establishment. In disaster preparedness and management program, the municipality is currently under the collection of baseline data and orientation of the communities of the disaster risk management concept.</p>", image: "" },
            { heading: "TOURISM AND CULTURAL HERITAGE", content: "<p>Tobias Fornier is one municipality which treasures a rich heritage from its natural resources down to its people and other tangible forms. These, as time goes by becomes known to people and becomes part of their own everyday life, making them as if their own personal heritage. Starting from the ancestral house of the family of the late Tobias Fornier, located along the highway of Poblacion Norte. This houses has a lot of significant stories both political and personal. With the antique and original furniture that were used by the family since then, one has to take pride of our own local history. The arching gate of the Dao Central School that was constructed in , is one clear legacy this town is to be proud of. Another concrete unique structure of the town is the public cemetery façade of coral stones with it’s famous adage; “Kami Karun, Kamo Dason”. Its beaches and seashores like that of Coves Point with its black sands and marine resources underneath. Sandol beach with its weathered rocks that become a natural beauty in the making and serves as an attraction as well. The Fatima Boulevard with its golden sunset in the afternoon is becoming a tourist stop over avenue. The majestic beauty of Mount Samboranay and the three peaks of Mount Taripis along with Mount Danao in the uplands of Igdanlog and Aras-asan. If one looks out for adventure and challenge there awaits on this part also the hidden falls of Igbabanod as well as Siraan and Kipot Falls. Exploring more of the town’s natural beauty, Banderahan Pilgrimage site atop a hilly portion offers a 360 degrees plains, hills and blue seas surrounding Dao. A lot more treasures and richness are stored in Tobias Fornier waiting to be discovered. The food that boasts Heirlooms Recipes of Dao like Ubod (Buri), Binas-o (Buri), Kusahos and Kayos. The people. The intangible cultures! With the concreting of road networks in the coastal areas and the additional development to facilitate ease of transport and access, this town is becoming one blooming area destination. Truly, Tobias Fornier has what it takes to be an eco-tourism place.</p>", image: "" }
        ];
    }

    function renderMunicipalProfile() {
        if (siteData.municipalProfile?.bannerImage) {
            profileBannerPreview.src = siteData.municipalProfile.bannerImage;
        }
        profileSectionsContainer.innerHTML = '';
        const sections = siteData.municipalProfile?.sections || getDefaultProfileSections();
        sections.forEach(section => addProfileSection(section.heading, section.content, section.image));
    }

    function addProfileSection(heading = '', content = '', image = '') {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'profile-section-card';
        sectionDiv.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <input type="text" placeholder="Section heading (e.g. VISION, leave empty for intro)" value="${heading.replace(/"/g, '&quot;')}" class="section-heading w-full mr-4">
                <button class="remove-section text-red-600 hover:text-red-800" title="Remove section"><i class="fas fa-trash-alt"></i></button>
            </div>
            <textarea placeholder="Section content (HTML allowed)" rows="6" class="section-content w-full">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            <div class="flex items-center gap-4 mt-3">
                <div class="relative flex items-center gap-2">
                    <img class="section-image-preview" src="${image || TRANSPARENT_PIXEL}">
                    <input type="file" accept="image/*" class="section-image-upload hidden">
                    <div class="flex flex-col gap-1">
                        <button class="change-section-image text-xs bg-gray-200 px-2 py-1 rounded">Change image</button>
                        <button class="remove-section-image text-xs bg-red-100 text-red-700 px-2 py-1 rounded"><i class="fas fa-times mr-1"></i>Remove</button>
                    </div>
                </div>
                <span class="text-xs text-gray-500">Optional image for this section.</span>
            </div>
        `;

        const preview = sectionDiv.querySelector('.section-image-preview');
        const fileInput = sectionDiv.querySelector('.section-image-upload');
        const changeBtn = sectionDiv.querySelector('.change-section-image');
        const removeImageBtn = sectionDiv.querySelector('.remove-section-image');

        changeBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            if (fileInput.files[0]) {
                const compressed = await compressImage(fileInput.files[0]);
                preview.src = compressed;
            }
        });

        removeImageBtn.addEventListener('click', () => {
            preview.src = TRANSPARENT_PIXEL;
            fileInput.value = '';
        });

        sectionDiv.querySelector('.remove-section').addEventListener('click', () => {
            if (confirm('Remove this section?')) sectionDiv.remove();
        });

        profileSectionsContainer.appendChild(sectionDiv);
    }

    profileBannerUpload.addEventListener('change', async function(e) {
        if (e.target.files[0]) {
            const compressed = await compressImage(e.target.files[0], 1200, 0.8);
            profileBannerPreview.src = compressed;
        }
    });

    document.getElementById('addProfileSection').addEventListener('click', () => {
        addProfileSection('', '<p>New section content</p>', '');
    });

    // ---------- LGU Offices Editor ----------
    const lguOfficesContainer = document.getElementById('lguOfficesContainer');

    function getDefaultLguOffices() {
        return [
            { icon: 'fa-user-tie', name: "Mayor's Office", services: ["Issuance of Business Permit to Operate", "Issuance of Mayor’s Clearance", "Issuance of Franchise to Operate Motorized Tricycle (new applicant)", "Issuance of Motorized Tricycle Operator’s Permit (renewal)"] },
            { icon: 'fa-calculator', name: "Municipal Budget Office", services: ["Preliminary review of the barangay annual budget", "Issuance of review letter (barangay annual general fund budget)", "Preliminary review of supplemental budget", "Certification of existence of appropriation", "Request for cash advance (travel)"] },
            { icon: 'fa-coins', name: "Municipal Treasurer’s Office", services: ["Issuance of certification of payment of taxes", "Issuance of community tax certificate", "Issuance of burial permit", "Issuance of official receipt for marriage license", "Issuance of certificate of transfer or ownership of large cattle", "Issuance of official receipt for payment of real property tax"] },
            { icon: 'fa-file-invoice', name: "Municipal Accountant’s Office", services: ["Issuance of Certifications", "Barangay Budget Preparation Form (BBPF)", "Issuance of Certification (net take home pay)", "Issuance of Certification (statement of remittances)", "Issuance of Certification (as to completeness of documents)"] },
            { icon: 'fa-draw-polygon', name: "Municipal Planning & Development", services: ["Issuance of zoning clearance (residential, commercial, industrial)", "Issuance of zoning clearance (base stations of cellular-mobile telephone service)"] },
            { icon: 'fa-tractor', name: "Municipal Agriculture Office", services: ["Issuance of shipping permit for livestock, poultry, and animal by-products", "Issuance of permit to cut (fruit bearing trees)"] },
            { icon: 'fa-home', name: "Municipal Assessor’s Office", services: ["Issuance of true copy of tax declaration (land, building, machineries)", "Issuance of certification of total landholdings", "Preparation of tax declaration of simple transfer of ownership", "Preparation of tax declaration on sub-division of land", "Preparation of tax declaration for re-classification of land or building"] },
            { icon: 'fa-file-signature', name: "Municipal Civil Registrar", services: ["Issuance of true copy of certificate of live birth", "Issuance of true copy of certificate of marriage", "Issuance of true copy of certificate of death", "Issuance of certificate of live birth (new)", "Delayed registration of certificate of live birth"] },
            { icon: 'fa-house-flood', name: "MDRRMO", services: ["Disaster preparedness and response", "Issuance of hazard maps and advisories", "Coordination during emergencies"] },
            { icon: 'fa-tools', name: "Municipal Engineer’s Office", services: ["Issuance of building permit and certificate of occupancy", "Issuance of electrical permit"] },
            { icon: 'fa-notes-medical', name: "Municipal Health Office", services: ["Outpatient consultation", "Issuance of medical certificate", "Issuance of health certificate", "Issuance of sanitary permit", "Issuance of pre-marriage certificate (family planning)"] },
            { icon: 'fa-hand-holding-heart', name: "MSWDO", services: ["Facilitate release of financial aid to individuals in crisis (AICS)", "Issuance of senior citizen ID card", "Issuance of pre-marriage counselling certificate"] }
        ];
    }

    function renderLguOffices() {
        lguOfficesContainer.innerHTML = '';
        const offices = siteData.lguOffices || getDefaultLguOffices();
        offices.forEach(office => addLguOfficeCard(office.icon, office.name, office.services));
    }

    function addLguOfficeCard(icon = 'fa-building', name = '', services = []) {
        const card = document.createElement('div');
        card.className = 'lgu-office-card';
        card.innerHTML = `
            <button class="remove-office float-right text-red-600 hover:text-red-800" title="Remove office"><i class="fas fa-trash-alt"></i></button>
            <div class="clear-both"></div>
            <div class="grid md:grid-cols-3 gap-4">
                <div>
                    <label class="block font-semibold mb-1">Icon (Font Awesome class)</label>
                    <select class="office-icon-select border rounded px-3 py-2 w-full">
                        <option value="fa-user-tie" ${icon==='fa-user-tie'?'selected':''}>Mayor</option>
                        <option value="fa-calculator" ${icon==='fa-calculator'?'selected':''}>Budget</option>
                        <option value="fa-coins" ${icon==='fa-coins'?'selected':''}>Treasurer</option>
                        <option value="fa-file-invoice" ${icon==='fa-file-invoice'?'selected':''}>Accountant</option>
                        <option value="fa-draw-polygon" ${icon==='fa-draw-polygon'?'selected':''}>Planning</option>
                        <option value="fa-tractor" ${icon==='fa-tractor'?'selected':''}>Agriculture</option>
                        <option value="fa-home" ${icon==='fa-home'?'selected':''}>Assessor</option>
                        <option value="fa-file-signature" ${icon==='fa-file-signature'?'selected':''}>Civil Registrar</option>
                        <option value="fa-house-flood" ${icon==='fa-house-flood'?'selected':''}>MDRRMO</option>
                        <option value="fa-tools" ${icon==='fa-tools'?'selected':''}>Engineer</option>
                        <option value="fa-notes-medical" ${icon==='fa-notes-medical'?'selected':''}>Health</option>
                        <option value="fa-hand-holding-heart" ${icon==='fa-hand-holding-heart'?'selected':''}>MSWDO</option>
                        <option value="fa-building" ${icon==='fa-building'?'selected':''}>Generic</option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block font-semibold mb-1">Office Name</label>
                    <input type="text" class="office-name-input w-full border rounded px-3 py-2" value="${name.replace(/"/g, '&quot;')}" placeholder="e.g. Mayor's Office">
                </div>
            </div>
            <div class="mt-4">
                <label class="block font-semibold mb-1">Services (one per line)</label>
                <textarea class="office-services-textarea w-full border rounded px-3 py-2" rows="5" placeholder="Enter each service on a new line">${services.join('\n')}</textarea>
            </div>
        `;
        card.querySelector('.remove-office').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Remove this office?')) card.remove();
        });
        lguOfficesContainer.appendChild(card);
    }

    document.getElementById('addLguOfficeBtn').addEventListener('click', () => {
        addLguOfficeCard('fa-building', 'New Office', ['Service 1', 'Service 2']);
    });

    // ---------- Liga ng mga Barangay Editor ----------
    const ligaTabPunong = document.getElementById('ligaTabPunong');
    const ligaTabSK = document.getElementById('ligaTabSK');
    const ligaPunongPanel = document.getElementById('ligaPunongPanel');
    const ligaSKPanel = document.getElementById('ligaSKPanel');
    const punongList = document.getElementById('punongList');
    const skList = document.getElementById('skList');

    function renderLiga() {
        const ligaData = siteData.liga || { punong: getDefaultPunong(), sk: getDefaultSK() };
        punongList.innerHTML = '';
        ligaData.punong.forEach((item, index) => addLigaRow(punongList, item.barangay, item.name, index, 'punong'));
        skList.innerHTML = '';
        ligaData.sk.forEach((item, index) => addLigaRow(skList, item.barangay, item.name, index, 'sk'));
    }

    function getDefaultPunong() {
        return [
            { barangay: "ABACA", name: "Rafael A. Tarroja" },
            { barangay: "ARAS-ASAN", name: "Felipe Saraza" },
            { barangay: "AROBO", name: "Pedro D. Jumapit" },
            { barangay: "ATABAY", name: "Benjamin C. Rubite" },
            { barangay: "ATIOTES", name: "Noel S. Vicera" },
            { barangay: "BAGUMBAYAN", name: "Anacleto C. Fealani Jr." },
            { barangay: "BALLESCAS", name: "Jonathan G. Magbanua" },
            { barangay: "BALUD", name: "Monico Pelingon" },
            { barangay: "BARASANAN-A", name: "Jose Nelson O. Laurio" },
            { barangay: "BARASANAN-B", name: "Johnny C. Frencillo" },
            { barangay: "BARASANAN-C", name: "Melchor M. Ostras" },
            { barangay: "BARIRI", name: "Lily B. Asenjo" },
            { barangay: "CAMANDAGAN", name: "Romeo E. Laxinto" },
            { barangay: "CATO-OGAN", name: "Angel S. Ibañez" },
            { barangay: "DANAWAN", name: "Nicolas D. Permano" },
            { barangay: "DICLUM", name: "Jacinto C. Sumugat" },
            { barangay: "FATIMA", name: "Justina J. Pelingon" },
            { barangay: "GAMAD", name: "Juden M. Fenita" },
            { barangay: "IGBALOGO", name: "Feliciano Seron" },
            { barangay: "IGBANGCAL-A", name: "Robert N. Hepertor" },
            { barangay: "IGBANGCAL-B", name: "Dionisio A. Baguna Jr." },
            { barangay: "IGBANGCAL-C", name: "Arlen B. Alcones" },
            { barangay: "IGBCABUAD", name: "Elias M. Naig Jr." },
            { barangay: "IGCADAC", name: "Leovino C. Josue" },
            { barangay: "IGCADO", name: "Devie John S. Siploc" },
            { barangay: "IGCALAWAGAN", name: "Ronnie S. Noble" },
            { barangay: "IGCAPUYAS", name: "Lorna P. Badugas" },
            { barangay: "IGCASICAD", name: "Domingo M. Balingasa" },
            { barangay: "IGDALAGUIT", name: "Luis O. Sedavia" },
            { barangay: "IGDANLOG", name: "Nicolas M. Dolloso" },
            { barangay: "IGDURAROG", name: "Carmencita A. Locquiao" },
            { barangay: "IGTUGAS", name: "Jerry S. Rios" },
            { barangay: "LAWIGAN", name: "Noe S. Satojeto" },
            { barangay: "LINDERO", name: "Roberto N. Velez" },
            { barangay: "MANALING", name: "Dioscoro Sedano" },
            { barangay: "MASAYO", name: "Georgie P. Sicorsicor" },
            { barangay: "NAGSUBUAN", name: "Patricio S. Sandig" },
            { barangay: "NASULI-A", name: "Vicente C. Habin" },
            { barangay: "OPSAN", name: "Carlito P. Secapero" },
            { barangay: "PACIENCIA", name: "Conrado P. Mingo Jr." },
            { barangay: "POBLACION NORTE", name: "Gem V. Encarnacion" },
            { barangay: "POBLACION SUR", name: "Teodorico C. Saroca Jr." },
            { barangay: "PORTILLO", name: "Ramon S. Dabandan" },
            { barangay: "QUEZON", name: "Nieves S. Semilla" },
            { barangay: "SAMALAGUE", name: "Mario F. Ngalongalo" },
            { barangay: "STO. TOMAS", name: "Jose T. Magallon" },
            { barangay: "TACBUYAN", name: "Letecia S. Siaton" },
            { barangay: "TENE", name: "Moises F. Idaosos Sr." },
            { barangay: "VILLAFLOR", name: "Aldrin M. Asenjo" },
            { barangay: "YSULAT", name: "Isidro B. Rubite Jr." }
        ];
    }

    function getDefaultSK() {
        return [
            { barangay: "ABACA", name: "Gio Martin A. Serapion" },
            { barangay: "ARAS-ASAN", name: "Ernie L. Lintag Jr." },
            { barangay: "AROBO", name: "Arriane Camille A. Dolloso" },
            { barangay: "ATABAY", name: "John Lloyd A. Grecia" },
            { barangay: "ATIOTES", name: "Nathaniel V. Selerio" },
            { barangay: "BAGUMBAYAN", name: "Febbie Jade N. Osumo" },
            { barangay: "BALLESCAS", name: "Czyra Mae M. Villesenda" },
            { barangay: "BALUD", name: "Jindy D. Gonzales" },
            { barangay: "BARASANAN-A", name: "Diana Rose G. Lampaza" },
            { barangay: "BARASANAN-B", name: "Carla Chin Marie P. Dollopac" },
            { barangay: "BARASANAN-C", name: "Rico John O. Ostan" },
            { barangay: "BARIRI", name: "Aileen Joy D. Huevia" },
            { barangay: "CAMANDAGAN", name: "Pinkie L. Hepertor" },
            { barangay: "CATO-OGAN", name: "John Manuel I. Obasan" },
            { barangay: "DANAWAN", name: "Herman R. Diana" },
            { barangay: "DICLUM", name: "Rica Melisa Grace S. Diana" },
            { barangay: "FATIMA", name: "Juannah Mae P. Cabañero" },
            { barangay: "GAMAD", name: "Alan B. Serador" },
            { barangay: "IGBALOGO", name: "Roque P. Molo" },
            { barangay: "IGBANGCAL-A", name: "Kurt Russel A. Tarroza" },
            { barangay: "IGBANGCAL-B", name: "April Joy C. Huevia" },
            { barangay: "IGBANGCAL-C", name: "Mark Anthony B. Valdellon" },
            { barangay: "IGBCABUAD", name: "Jeefrey L. Cubon" },
            { barangay: "IGCADAC", name: "Sandie Geo N. Minaves" },
            { barangay: "IGCADO", name: "Welma C. Santero" },
            { barangay: "IGCALAWAGAN", name: "vacant" },
            { barangay: "IGCAPUYAS", name: "Russel E. Noble" },
            { barangay: "IGCASICAD", name: "Niño C. Calapano" },
            { barangay: "IGDALAGUIT", name: "Mark Anthony J. Asuya" },
            { barangay: "IGDANLOG", name: "Angelica S. Sibaya" },
            { barangay: "IGDURAROG", name: "Darwin S. Abiday" },
            { barangay: "IGTUGAS", name: "Mark Anthony S. Santillan" },
            { barangay: "LAWIGAN", name: "Jonas B. Balajidiong" },
            { barangay: "LINDERO", name: "Neil Clevan G. Sembrano" },
            { barangay: "MANALING", name: "Airheen S. Sempino" },
            { barangay: "MASAYO", name: "Grayszella Y. Mallo" },
            { barangay: "NAGSUBUAN", name: "John Kenneth D. Asenjo" },
            { barangay: "NASULI-A", name: "Fredel R. Villojan" },
            { barangay: "OPSAN", name: "Maribel T. Dollopac" },
            { barangay: "PACIENCIA", name: "Edgardo E. Servano Jr." },
            { barangay: "POBLACION NORTE", name: "Larah Marie D. Tajanlangit" },
            { barangay: "POBLACION SUR", name: "Denn I. Estaris" },
            { barangay: "PORTILLO", name: "vacant" },
            { barangay: "QUEZON", name: "Felix S. Seterra Jr." },
            { barangay: "SAMALAGUE", name: "Beverly F. Bernardo" },
            { barangay: "STO. TOMAS", name: "Mary Cris E. Juanites" },
            { barangay: "TACBUYAN", name: "Hernel S. Alintahan" },
            { barangay: "TENE", name: "Bernadeth B. Sermona" },
            { barangay: "VILLAFLOR", name: "Rubie Ann M. Arcilon" },
            { barangay: "YSULAT", name: "Primcy Mae G. Yasay" }
        ];
    }

    function addLigaRow(container, barangay = '', name = '', index = null, type) {
        const div = document.createElement('div');
        div.className = 'liga-item-row';
        div.innerHTML = `
            <input type="text" placeholder="Barangay Name" value="${barangay.replace(/"/g, '&quot;')}" class="liga-barangay-input flex-1 border rounded px-2 py-1">
            <input type="text" placeholder="Official Name (or 'vacant')" value="${name.replace(/"/g, '&quot;')}" class="liga-name-input flex-1 border rounded px-2 py-1">
            <button class="text-red-600 remove-liga-row" title="Remove"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
        div.querySelector('.remove-liga-row').addEventListener('click', () => div.remove());
    }

    ligaTabPunong.addEventListener('click', () => {
        ligaTabPunong.classList.add('active');
        ligaTabSK.classList.remove('active');
        ligaPunongPanel.classList.add('active');
        ligaSKPanel.classList.remove('active');
    });
    ligaTabSK.addEventListener('click', () => {
        ligaTabSK.classList.add('active');
        ligaTabPunong.classList.remove('active');
        ligaSKPanel.classList.add('active');
        ligaPunongPanel.classList.remove('active');
    });

    document.getElementById('addPunongBtn').addEventListener('click', () => addLigaRow(punongList, '', ''));
    document.getElementById('addSKBtn').addEventListener('click', () => addLigaRow(skList, '', ''));

    // ---------- Tourism Editor ----------
    const section1ImagesDiv = document.getElementById('tourismSection1Images');
    const section2ImagesDiv = document.getElementById('tourismSection2Images');
    const section1Text = document.getElementById('tourismSection1Text');
    const section2Text = document.getElementById('tourismSection2Text');
    const bulletList = document.getElementById('tourismBulletList');
    const culturalPlanPreview = document.getElementById('culturalPlanPreview');
    const culturalPlanUpload = document.getElementById('culturalPlanUpload');
    const removeCulturalPlanBtn = document.getElementById('removeCulturalPlanBtn');
    const addCulturalPlanBtn = document.getElementById('addCulturalPlanBtn');

    function renderTourism() {
        const tourism = siteData.tourism || {
            section1: {
                text: "<p class='mb-4'><span class='font-bold text-[#2e5fa7]'>Tourism industry in the Philippines</span> is considered as one of the most powerful economic growth engines. Aside from the best experience it could offer to tourists to enjoy the wonders and beauty of nature, it likewise generates revenue and provides job opportunities to locals. Tourism is becoming a productive sector in Tobias Fornier. People in the tourism sector collaborate and work together to promote the different tourist destinations and products in the Municipality. The aim is to win the confidence of tourists and investors and to preserve the antiquity of Daonhon culture and heritage.</p><p class='mb-4'>As one of the 18 municipalities comprising the Province of Antique, located at the southern part of Panay Island, Tobias Fornier is part of the craggy coastline, historical and heritage cluster. Its craggy yet breathtaking coastlines and vast green mountains are potential for eco-tourism development.</p>",
                images: [
                    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
                    "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=600&q=80",
                    "https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=600&q=80",
                    "https://images.unsplash.com/photo-1440342359742-84a3f3f87c5d?w=600&q=80"
                ]
            },
            section2: {
                text: "<p class='mb-4'><span class='font-bold text-[#2e5fa7]'>Culture and traditions</span> are the most common tourism attractions of a certain place. Festivals and ceremonies such as the <span class='font-semibold'>Panaet Tarambayaw Sambayang</span>, a histo-cultural event celebrated annually depicting the unique “Daonhon Spirit”, the love for peace and harmony and the enduring Maaram Traditions like “sayaw” and “pabulag”.</p><p>Traditional crafts include buri weaving and bamboo furniture and handicrafts, which visitors can witness and even participate in during community tours.</p>",
                images: [
                    "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&q=80",
                    "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=600&q=80",
                    "https://images.unsplash.com/photo-1603218011353-d43b6a531af6?w=600&q=80",
                    "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=600&q=80"
                ]
            },
            bulletList: "beaches/resorts\nmarine environment & coral reefs\nKalaparan Marine Sanctuary\nSangdol\nBato Kalsada\nSea turtle nesting ground\nIgdalaguit Municipal Fish Sanctuary\nFatima Reef\nMangroves & seagrass beds\nBanderahan viewpoint\nAliw-liw & Taripis\nIgbalde mountain\nIgbariles & Igcadac watershed\nWildlife & birdlife\nBuho Pilis & Puntahagdan caves",
            culturalPlanImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80"
        };

        section1ImagesDiv.innerHTML = '';
        tourism.section1.images.forEach((src, index) => addTourismImageInput(section1ImagesDiv, src, index, 'section1'));

        section2ImagesDiv.innerHTML = '';
        tourism.section2.images.forEach((src, index) => addTourismImageInput(section2ImagesDiv, src, index, 'section2'));

        section1Text.value = tourism.section1.text;
        section2Text.value = tourism.section2.text;
        bulletList.value = tourism.bulletList;
        culturalPlanPreview.src = tourism.culturalPlanImage;
    }

    function addTourismImageInput(container, src, index, section) {
        const div = document.createElement('div');
        div.className = 'tourism-image-item';
        div.innerHTML = `
            <img class="tourism-image-preview" src="${src}">
            <input type="file" accept="image/*" class="tourism-image-upload block w-full text-sm mt-2" data-section="${section}" data-index="${index}">
        `;
        container.appendChild(div);

        const fileInput = div.querySelector('.tourism-image-upload');
        const preview = div.querySelector('.tourism-image-preview');
        fileInput.addEventListener('change', async (e) => {
            if (fileInput.files[0]) {
                const compressed = await compressImage(fileInput.files[0]);
                preview.src = compressed;
            }
        });
    }

    culturalPlanUpload.addEventListener('change', async (e) => {
        if (culturalPlanUpload.files[0]) {
            const compressed = await compressImage(culturalPlanUpload.files[0], 1200, 0.8);
            culturalPlanPreview.src = compressed;
        }
    });

    removeCulturalPlanBtn.addEventListener('click', () => {
        culturalPlanPreview.src = TRANSPARENT_PIXEL;
        culturalPlanUpload.value = '';
    });

    addCulturalPlanBtn.addEventListener('click', () => {
        culturalPlanUpload.click();
    });

    // ---------- PESO Editor ----------
    const spesTableBody = document.getElementById('spesTableBody');
    const pesoImagesContainer = document.getElementById('pesoImagesContainer');

    function renderPeso() {
        const pesoData = siteData.peso || {
            spes: getDefaultSpes(),
            images: [
                "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=600&q=80",
                "https://images.unsplash.com/photo-1581092921461-39b21f7b8b3f?w=600&q=80"
            ]
        };
        spesTableBody.innerHTML = '';
        pesoData.spes.forEach((row, index) => addSpesRow(row.name, row.address, row.years));

        pesoImagesContainer.innerHTML = '';
        pesoData.images.forEach((src, index) => addPesoImage(src, index));
    }

    function getDefaultSpes() {
        return [
            { name: "ABIDAY, APRIL JOY P.", address: "Pob Sur", years: "2016 2017 2018" },
            { name: "ABIDAY, DINO MARTIN S.", address: "Igdurarog", years: "2021" },
        ];
    }

    function addSpesRow(name = '', address = '', years = '') {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="spes-name" value="${name.replace(/"/g, '&quot;')}"></td>
            <td><input type="text" class="spes-address" value="${address.replace(/"/g, '&quot;')}"></td>
            <td><input type="text" class="spes-years" value="${years.replace(/"/g, '&quot;')}"></td>
            <td><button class="text-red-600 remove-spes-row"><i class="fas fa-trash"></i></button></td>
        `;
        row.querySelector('.remove-spes-row').addEventListener('click', () => row.remove());
        spesTableBody.appendChild(row);
    }

    function addPesoImage(src, index) {
        const div = document.createElement('div');
        div.className = 'peso-image-item';
        div.innerHTML = `
            <img class="peso-image-preview" src="${src}">
            <input type="file" accept="image/*" class="peso-image-upload block w-full text-sm mt-2" data-index="${index}">
        `;
        pesoImagesContainer.appendChild(div);
        const fileInput = div.querySelector('.peso-image-upload');
        const preview = div.querySelector('.peso-image-preview');
        fileInput.addEventListener('change', async (e) => {
            if (fileInput.files[0]) {
                const compressed = await compressImage(fileInput.files[0]);
                preview.src = compressed;
            }
        });
    }

    document.getElementById('addSpesRowBtn').addEventListener('click', () => addSpesRow());

    // ---------- Gallery Editor ----------
    const galleryPageBtns = document.querySelectorAll('.gallery-page-btn');
    const galleryPanels = {
        1: document.getElementById('galleryPage1'),
        2: document.getElementById('galleryPage2'),
        3: document.getElementById('galleryPage3')
    };
    const galleryGrids = {
        1: document.getElementById('galleryGrid1'),
        2: document.getElementById('galleryGrid2'),
        3: document.getElementById('galleryGrid3')
    };

    function renderGallery() {
        const galleryData = siteData.gallery || {
            1: [
                "https://images.unsplash.com/photo-1468325268561-4025d6d0b9b8?w=200&q=80",
                "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=200&q=80",
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80",
                "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=200&q=80",
                "https://images.unsplash.com/photo-1468325268561-4025d6d0b9b8?w=200&q=80",
                "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=200&q=80",
                "https://images.unsplash.com/photo-1468325268561-4025d6d0b9b8?w=200&q=80",
                "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=200&q=80",
                "https://images.unsplash.com/photo-1468325268561-4025d6d0b9b8?w=200&q=80",
                "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=200&q=80",
                "https://images.unsplash.com/photo-1468325268561-4025d6d0b9b8?w=200&q=80",
                "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=200&q=80"
            ],
            2: [
                "https://images.unsplash.com/photo-1468325268561-4025d6d0b9b8?w=200&q=80",
                "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=200&q=80",
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80",
                "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=200&q=80"
            ],
            3: [
                "https://images.unsplash.com/photo-1468325268561-4025d6d0b9b8?w=200&q=80",
                "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=200&q=80",
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80",
                "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=200&q=80"
            ]
        };
        for (let page = 1; page <= 3; page++) {
            const grid = galleryGrids[page];
            grid.innerHTML = '';
            (galleryData[page] || []).forEach((src, index) => addGalleryImage(grid, src, page, index));
        }
    }

    function addGalleryImage(grid, src, page, index) {
        const card = document.createElement('div');
        card.className = 'gallery-image-card';
        card.innerHTML = `
            <img class="gallery-image-preview" src="${src}">
            <input type="file" accept="image/*" class="gallery-image-upload block w-full text-sm mt-2" data-page="${page}" data-index="${index}">
            <button class="remove-gallery-image text-red-600 text-sm mt-1"><i class="fas fa-trash mr-1"></i>Remove</button>
        `;
        grid.appendChild(card);
        const fileInput = card.querySelector('.gallery-image-upload');
        const preview = card.querySelector('.gallery-image-preview');
        fileInput.addEventListener('change', async (e) => {
            if (fileInput.files[0]) {
                const compressed = await compressImage(fileInput.files[0]);
                preview.src = compressed;
            }
        });
        card.querySelector('.remove-gallery-image').addEventListener('click', () => card.remove());
    }

    galleryPageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            galleryPageBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const page = btn.dataset.page;
            Object.values(galleryPanels).forEach(p => p.classList.remove('active'));
            galleryPanels[page].classList.add('active');
        });
    });

    document.querySelectorAll('.add-gallery-image').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            const grid = galleryGrids[page];
            addGalleryImage(grid, 'https://via.placeholder.com/200?text=New', page, grid.children.length);
        });
    });

    // ---------- Download Forms Editor ----------
    const downloadFormsContainer = document.getElementById('downloadFormsContainer');

    function renderDownloadForms() {
        downloadFormsContainer.innerHTML = '';
        const forms = siteData.download || getDefaultDownloadForms();
        forms.forEach(form => addDownloadFormCard(form.icon, form.title, form.desc, form.link));
    }

    function getDefaultDownloadForms() {
        return [
            { icon: 'fa-file-pdf', title: 'Unified Application Form – Building Permit', desc: 'Consolidated application form for building permit requirements.', link: 'https://drive.google.com/file/d/1RuTuFBFIP94UpWljEpTH1ePKH2pOFcxB/view' },
            { icon: 'fa-file-pdf', title: 'Unified Application Form – Certificate of Occupancy', desc: 'For securing the Certificate of Occupancy after construction.', link: 'https://drive.google.com/file/d/1ajt5SvQ3APsRL9wc3Ogh_ll-cMdOdJEM/view' },
            { icon: 'fa-file-pdf', title: 'Electrical Permit Form', desc: 'Application for electrical installation permit.', link: 'https://drive.google.com/file/d/14NgWSuvaj59zI0Y3VxsiKIv58wEgsvIB/view' },
            { icon: 'fa-file-pdf', title: 'Plumbing Permit Form', desc: 'Application for plumbing permit and sanitation.', link: 'https://drive.google.com/file/d/1brcLWc0WLLylVYxnaw2_21-WKr2kMVnd/view' },
            { icon: 'fa-file-pdf', title: 'Locational Clearance / Zoning Compliance', desc: 'Application for locational clearance and certificate of zoning compliance.', link: 'https://drive.google.com/file/d/1g61cG5N8CBskfcokksribibQ3MRV1ue3/view' },
            { icon: 'fa-file-pdf', title: 'Certificate of Completion', desc: 'Official certificate for completed construction works.', link: 'https://drive.google.com/file/d/13lG9krUjvyURXWS7bb--6bkKcgDA2u-q/view' },
            { icon: 'fa-file-pdf', title: 'Affidavit Form for BFP', desc: 'Affidavit required for Bureau of Fire Protection clearance.', link: 'https://drive.google.com/file/d/1df1vbTVsbOr4wi62dgKws4bKDjyjJzdA/view' }
        ];
    }

    function addDownloadFormCard(icon = 'fa-file-pdf', title = '', desc = '', link = '') {
        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative';
        card.innerHTML = `
            <button class="remove-form absolute top-2 right-2 text-red-600 hover:text-red-800" title="Remove form"><i class="fas fa-trash-alt"></i></button>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                    <label class="block text-xs font-semibold mb-1">Icon (Font Awesome class)</label>
                    <select class="form-icon-select border rounded px-2 py-1 w-full">
                        <option value="fa-file-pdf" ${icon==='fa-file-pdf'?'selected':''}>PDF</option>
                        <option value="fa-file-word" ${icon==='fa-file-word'?'selected':''}>Word</option>
                        <option value="fa-file-excel" ${icon==='fa-file-excel'?'selected':''}>Excel</option>
                        <option value="fa-file-alt" ${icon==='fa-file-alt'?'selected':''}>Text</option>
                    </select>
                </div>
                <div class="md:col-span-3">
                    <label class="block text-xs font-semibold mb-1">Title</label>
                    <input type="text" class="form-title w-full border rounded px-2 py-1" value="${title.replace(/"/g, '&quot;')}">
                </div>
            </div>
            <div class="mt-2">
                <label class="block text-xs font-semibold mb-1">Description</label>
                <textarea class="form-desc w-full border rounded px-2 py-1" rows="2">${desc.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            </div>
            <div class="mt-2">
                <label class="block text-xs font-semibold mb-1">Download Link</label>
                <input type="url" class="form-link w-full border rounded px-2 py-1" value="${link.replace(/"/g, '&quot;')}">
            </div>
        `;
        downloadFormsContainer.appendChild(card);
        card.querySelector('.remove-form').addEventListener('click', () => card.remove());
    }

    document.getElementById('addDownloadFormBtn').addEventListener('click', () => {
        addDownloadFormCard('fa-file-pdf', 'New Form', 'Description', '#');
    });

    // ---------- News Categories & Items (full version) ----------
    const defaultNewsCategories = [
        { name: "🏀 Municipal Announcement & News Updates", type: "article" },
        { name: "✨ Municipal Agriculture Featured Stories", type: "article" },
        { name: "📰 Provincial Health Latest Articles", type: "article" },
        { name: "🎥 Video News Highlights", type: "video" },
        { name: "📸 Municipality Gallery", type: "gallery" },
        { name: "🏀 Inter Barangay Basketball News", type: "article" }
    ];

    function createNewsItemElement(categoryName, itemData = {}) {
        const category = defaultNewsCategories.find(c => c.name === categoryName);
        const type = category ? category.type : 'article';
        const div = document.createElement('div');
        div.className = 'news-item-card';
        div.dataset.category = categoryName;

        const imageHtml = `
            <div class="relative">
                <img class="news-thumb-preview" src="${itemData.image || 'https://via.placeholder.com/120x90?text=No+Image'}">
                <input type="file" accept="image/*" class="news-image-upload hidden">
                <button class="change-news-image-btn text-xs bg-gray-200 px-2 py-0.5 rounded mt-1"><i class="fas fa-upload mr-1"></i>change</button>
            </div>
        `;

        let fieldsHtml = '', videoControlsHtml = '';
        if (type === 'gallery') {
            fieldsHtml = `<div class="flex-1"></div>`;
        } else if (type === 'video') {
            fieldsHtml = `
                <div class="news-item-fields grid grid-cols-1 gap-2 flex-1">
                    <input type="text" placeholder="Video title (e.g. BASKETBALL · 12:34)" value="${itemData.title || ''}" class="news-title border rounded px-2 py-1 text-sm w-full">
                    <input type="text" placeholder="Duration (optional, e.g. 12:34)" value="${itemData.duration || ''}" class="news-duration border rounded px-2 py-1 text-sm w-full">
                </div>
            `;
            videoControlsHtml = `
                <div class="w-full mt-2 video-upload-panel-inline">
                    <label class="block text-xs font-semibold mb-1"><i class="fas fa-video mr-1"></i>Video source</label>
                    <input type="file" accept="video/mp4,video/webm" class="video-file-input block w-full text-xs mb-2">
                    <div class="flex gap-2 items-center">
                        <input type="url" placeholder="YouTube or direct video URL" value="${itemData.videoSrc || ''}" class="video-url-input flex-1 border rounded px-2 py-1 text-xs">
                        <button class="set-video-url-btn bg-[#2e5fa7] text-white px-3 py-1 rounded text-xs whitespace-nowrap">Set</button>
                    </div>
                    <input type="hidden" class="video-src-hidden" value="${itemData.videoSrc || ''}">
                    <p class="text-[10px] text-gray-500 mt-1">Last set source will be used.</p>
                </div>
            `;
        } else {
            fieldsHtml = `
                <div class="news-item-fields grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                    <input type="text" placeholder="Title" value="${itemData.title || ''}" class="news-title border rounded px-2 py-1 text-sm">
                    <input type="text" placeholder="Subtitle" value="${itemData.subtitle || ''}" class="news-subtitle border rounded px-2 py-1 text-sm">
                    <textarea placeholder="Description" rows="2" class="news-desc border rounded px-2 py-1 text-sm col-span-2">${itemData.desc || ''}</textarea>
                    <input type="text" placeholder="Author" value="${itemData.author || ''}" class="news-author border rounded px-2 py-1 text-sm">
                    <input type="text" placeholder="Read time (e.g. 5 min)" value="${itemData.readTime || ''}" class="news-readtime border rounded px-2 py-1 text-sm">
                    <input type="text" placeholder="Timestamp (e.g. 2h ago)" value="${itemData.timestamp || ''}" class="news-timestamp border rounded px-2 py-1 text-sm">
                    <input type="url" placeholder="Link (read more)" value="${itemData.link || '#'}" class="news-link border rounded px-2 py-1 text-sm col-span-2">
                </div>
            `;
        }

        const rightColumn = document.createElement('div');
        rightColumn.className = 'flex-1';
        rightColumn.innerHTML = fieldsHtml + (videoControlsHtml || '');

        const removeBtn = document.createElement('div');
        removeBtn.className = 'flex flex-col items-end gap-1';
        removeBtn.innerHTML = `<button class="text-red-600 text-sm remove-news-item" title="Remove"><i class="fas fa-trash-alt"></i></button>`;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex gap-4 w-full';
        wrapper.appendChild(new DOMParser().parseFromString(imageHtml, 'text/html').body.firstChild);
        wrapper.appendChild(rightColumn);
        wrapper.appendChild(removeBtn);
        div.appendChild(wrapper);

        const changeBtn = div.querySelector('.change-news-image-btn');
        const fileInput = div.querySelector('.news-image-upload');
        const preview = div.querySelector('.news-thumb-preview');
        changeBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            if (fileInput.files[0]) {
                const compressed = await compressImage(fileInput.files[0]);
                preview.src = compressed;
            }
        });

        if (type === 'video') {
            const videoFileInput = div.querySelector('.video-file-input');
            const videoUrlInput = div.querySelector('.video-url-input');
            const setUrlBtn = div.querySelector('.set-video-url-btn');
            const hiddenSrc = div.querySelector('.video-src-hidden');

            videoFileInput.addEventListener('change', async (e) => {
                if (videoFileInput.files[0]) {
                    // For simplicity, we store as data URL – in save, we'll upload
                    const reader = new FileReader();
                    reader.onload = (ev) => hiddenSrc.value = ev.target.result;
                    reader.readAsDataURL(videoFileInput.files[0]);
                    videoUrlInput.value = '';
                }
            });

            setUrlBtn.addEventListener('click', () => {
                const url = videoUrlInput.value.trim();
                if (url) {
                    hiddenSrc.value = url;
                    videoFileInput.value = '';
                }
            });
        }

        div.querySelector('.remove-news-item').addEventListener('click', () => {
            if (confirm('Remove this item?')) div.remove();
        });

        return div;
    }

    function renderNewsCategories() {
        const tabNav = document.getElementById('newsTabNav');
        const panelsContainer = document.getElementById('newsPanelsContainer');
        tabNav.innerHTML = '';
        panelsContainer.innerHTML = '';

        const categories = defaultNewsCategories;
        const itemsMap = siteData.newsCategories || {};

        categories.forEach((cat, index) => {
            const btn = document.createElement('button');
            btn.className = `news-tab-btn ${index === 0 ? 'active-tab' : ''}`;
            btn.textContent = cat.name;
            btn.dataset.target = `panel-${index}`;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.news-tab-btn').forEach(b => b.classList.remove('active-tab'));
                btn.classList.add('active-tab');
                document.querySelectorAll('.category-panel').forEach(p => p.classList.remove('active-panel'));
                document.getElementById(`panel-${index}`).classList.add('active-panel');
            });
            tabNav.appendChild(btn);

            const panel = document.createElement('div');
            panel.className = `category-panel ${index === 0 ? 'active-panel' : ''}`;
            panel.id = `panel-${index}`;

            const headerDiv = document.createElement('div');
            headerDiv.className = 'flex-between mb-4';
            headerDiv.innerHTML = `<h3 class="text-xl font-bold text-[#2e5fa7]">${cat.name}</h3>`;
            panel.appendChild(headerDiv);

            const itemsDiv = document.createElement('div');
            if (cat.type === 'video') itemsDiv.className = 'video-grid';
            else if (cat.type === 'gallery') itemsDiv.className = 'gallery-grid';
            else itemsDiv.className = 'article-list';
            panel.appendChild(itemsDiv);

            const catItems = itemsMap[cat.name] || [];
            catItems.forEach(item => {
                itemsDiv.appendChild(createNewsItemElement(cat.name, item));
            });

            const addBtnDiv = document.createElement('div');
            addBtnDiv.className = 'flex justify-end mt-4';
            addBtnDiv.innerHTML = `<button class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full add-news-item-btn"><i class="fas fa-plus-circle mr-1"></i>Add item</button>`;
            panel.appendChild(addBtnDiv);

            addBtnDiv.querySelector('.add-news-item-btn').addEventListener('click', () => {
                let newItem = {};
                if (cat.type === 'gallery') {
                    newItem = { image: 'https://via.placeholder.com/120x90?text=New+Image' };
                } else if (cat.type === 'video') {
                    newItem = { title: 'New video', duration: '', image: 'https://via.placeholder.com/120x90?text=Video', videoSrc: '' };
                } else {
                    newItem = { title: 'New', subtitle: '', desc: '', author: '', readTime: '', timestamp: '', image: 'https://via.placeholder.com/120x90?text=New', link: '#' };
                }
                itemsDiv.appendChild(createNewsItemElement(cat.name, newItem));
            });

            panelsContainer.appendChild(panel);
        });
    }

    // ---------- Full Disclosure Editor ----------
    const disclosureContainer = document.getElementById('disclosureCategoriesContainer');

    function renderDisclosure() {
        disclosureContainer.innerHTML = '';
        const categories = siteData.disclosure?.categories || [
            { summary: "Annual Budget", years: ["FY 2022", "FY 2021", "FY 2020", "FY 2019"] },
            { summary: "Annual Procurement Plan", years: ["FY 2022", "FY 2021", "FY 2020", "FY 2019"] },
            { summary: "Statement of Receipts and Expenditures", years: ["FY 2022", "FY 2021", "FY 2020", "FY 2019"] },
            { summary: "Statement of Indebtedness, Payments, and Balances", years: ["FY 2022", "FY 2021", "FY 2020", "FY 2019"] },
            { summary: "Annual GAD Accomplishment Report", years: ["FY 2022", "FY 2021", "FY 2020", "FY 2019"] },
            { summary: "Supplemental Procurement Plan", years: ["FY 2022", "FY 2021", "FY 2020", "FY 2019"] },
            { summary: "Trust Fund Utilization", years: ["FY 2022 (1Q,2Q,3Q,4Q)"] },
            { summary: "20% Component of the IRA", years: ["FY 2021 (1Q,2Q,3Q,4Q)"] },
            { summary: "Local Disaster Risk Reduction and Management Fund Utilization", years: ["FY 2021 (...)"] },
            { summary: "Quarterly Statement of Cash Flows", years: ["FY 2021 (1Q,2Q,3Q,4Q)"] },
            { summary: "Bid Results (Civil Works, Goods, Consulting)", years: ["FY 2021 (1Q,2Q,3Q,4Q)"] },
            { summary: "SEF Utilization", years: ["FY 2021 (1Q,2Q,3Q,4Q)"] },
            { summary: "Unliquidated Cash Advances", years: ["FY 2021 (1Q,2Q,3Q,4Q)"] },
            { summary: "Human Resource Complement", years: ["FY 2021 (1Q,2Q,3Q,4Q)"] }
        ];
        categories.forEach(cat => addDisclosureCategory(cat.summary, cat.years));
    }

    function addDisclosureCategory(summary = '', years = []) {
        const card = document.createElement('div');
        card.className = 'disclosure-category-card';
        card.innerHTML = `
            <button class="remove-category" title="Remove category"><i class="fas fa-trash-alt"></i></button>
            <input type="text" class="summary-input" placeholder="Category title (e.g. Annual Budget)" value="${escapeHtml(summary)}">
            <div class="year-items-container"></div>
            <button class="add-year-btn"><i class="fas fa-plus-circle mr-1"></i>Add year</button>
        `;

        const yearsContainer = card.querySelector('.year-items-container');
        years.forEach(year => addYearItem(yearsContainer, year));

        card.querySelector('.add-year-btn').addEventListener('click', () => {
            addYearItem(yearsContainer, '');
        });

        card.querySelector('.remove-category').addEventListener('click', () => {
            if (confirm('Remove this category?')) card.remove();
        });

        disclosureContainer.appendChild(card);
    }

    function addYearItem(container, value = '') {
        const wrapper = document.createElement('div');
        wrapper.className = 'year-item-wrapper';
        wrapper.innerHTML = `
            <input type="text" placeholder="e.g. FY 2022" value="${escapeHtml(value)}">
            <button class="remove-year" title="Remove year"><i class="fas fa-times"></i></button>
        `;
        wrapper.querySelector('.remove-year').addEventListener('click', () => wrapper.remove());
        container.appendChild(wrapper);
    }

    document.getElementById('addDisclosureCategory').addEventListener('click', () => {
        addDisclosureCategory('New Category', []);
    });

    // ---------- Transparency Cards Editor ----------
    const transparencyCardsContainer = document.getElementById('transparencyCardsContainer');

    function renderTransparencyCards() {
        transparencyCardsContainer.innerHTML = '';
        const cards = siteData.transparency?.cards || [
            { icon: 'fa-file-invoice-dollar', title: 'Financial Reports', desc: 'FY 2024 Appropriations, Supplemental Budgets, and Financial Reports.', linkText: 'View Reports' },
            { icon: 'fa-hand-holding-heart', title: 'Bids & Awards', desc: 'Invitations to Bid, Notice of Awards, and BAC Resolutions.', linkText: 'View Projects' },
            { icon: 'fa-users', title: 'Sanggunian', desc: 'Ordinances, Resolutions, and Committee Reports – fully accessible.', linkText: 'Legislative' }
        ];
        cards.forEach(card => addTransparencyCard(card.icon, card.title, card.desc, card.linkText));
    }

    function addTransparencyCard(icon = 'fa-file-invoice-dollar', title = '', desc = '', linkText = '') {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'transparency-card-editor';
        cardDiv.innerHTML = `
            <div class="flex items-start gap-4 mb-3">
                <select class="card-icon-select border rounded px-2 py-1">
                    <option value="fa-file-invoice-dollar" ${icon==='fa-file-invoice-dollar'?'selected':''}>💰 Financial</option>
                    <option value="fa-hand-holding-heart" ${icon==='fa-hand-holding-heart'?'selected':''}>🤝 Bids</option>
                    <option value="fa-users" ${icon==='fa-users'?'selected':''}>👥 Sanggunian</option>
                    <option value="fa-file-alt" ${icon==='fa-file-alt'?'selected':''}>📄 Generic</option>
                </select>
                <input type="text" class="card-title flex-1 border rounded px-3 py-2" placeholder="Card title" value="${escapeHtml(title)}">
            </div>
            <textarea class="card-desc" rows="2" placeholder="Short description">${escapeHtml(desc)}</textarea>
            <input type="text" class="card-link-text" placeholder="Link text (e.g. View Reports)" value="${escapeHtml(linkText)}">
        `;
        transparencyCardsContainer.appendChild(cardDiv);
    }

    // ---------- About Editor ----------
    function renderAbout() {
        if (siteData.about) {
            document.getElementById('aboutHeading').value = siteData.about.heading || '';
            document.getElementById('aboutParagraph').value = siteData.about.paragraph || '';
            document.getElementById('aboutVision').value = siteData.about.vision || '';
            document.getElementById('aboutMission').value = siteData.about.mission || '';
            document.getElementById('aboutHistory').value = siteData.about.history || '';
            document.getElementById('aboutMapEmbed').value = siteData.about.map_embed_url || '';
            document.getElementById('aboutMapLink').value = siteData.about.map_link || '';
        }
    }

    // ========== SAVE ALL DATA TO SUPABASE ==========
    async function saveAllData() {
        const saveBtn = document.getElementById('saveSettings');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // ---------- 1. Site Settings ----------
            const logoPreview = document.getElementById('logoPreview');
            let logoUrl = siteData.site.logo;
            const logoUpload = document.getElementById('logoUpload');
            if (logoUpload.files.length > 0) {
                const compressedFile = await compressImage(logoUpload.files[0]);
                logoUrl = await uploadImage(compressedFile, 'site');
            }

            const socialLinks = [];
            document.querySelectorAll('#social-icons-container .repeatable-item').forEach(item => {
                const select = item.querySelector('select');
                const url = item.querySelector('input[type="url"]')?.value || '';
                socialLinks.push({ icon: select?.value || 'facebook-f', url });
            });

            const footerData = {
                addressLine1: document.getElementById('footerAddressLine1')?.value || '',
                addressLine2: document.getElementById('footerAddressLine2')?.value || '',
                email: document.getElementById('footerEmail')?.value || '',
                phone: document.getElementById('footerPhone')?.value || '',
                quickLinks: [],
                hotlines: [],
                agencies: []
            };
            document.querySelectorAll('#quickLinksContainer > div').forEach(div => {
                const inputs = div.querySelectorAll('input');
                if (inputs.length >= 2) footerData.quickLinks.push({ text: inputs[0].value, url: inputs[1].value });
            });
            document.querySelectorAll('#hotlinesContainer > div').forEach(div => {
                const inputs = div.querySelectorAll('input');
                if (inputs.length >= 2) footerData.hotlines.push({ name: inputs[0].value, number: inputs[1].value });
            });
            document.querySelectorAll('#agenciesContainer .agency-item').forEach(div => {
                const img = div.querySelector('.agency-image')?.src || '';
                const inputs = div.querySelectorAll('input[type="text"]');
                const name = inputs[0]?.value || '';
                const label = inputs[1]?.value || '';
                footerData.agencies.push({ name, image: img, label });
            });

            const colors = {
                primary: document.getElementById('primaryColor')?.value || '#2e5fa7',
                secondary: document.getElementById('secondaryColor')?.value || '#16a34a',
                backgroundLight: document.getElementById('backgroundLight')?.value || '#f3f4f6',
                textDark: document.getElementById('textDark')?.value || '#111827'
            };

            const { error: siteError } = await supabase
                .from('site_settings')
                .upsert({
                    id: 1,
                    logo_url: logoUrl,
                    site_name: document.getElementById('siteName')?.value || '',
                    social_links: socialLinks,
                    footer_data: footerData,
                    colors: colors
                });
            if (siteError) throw siteError;

            // ---------- 2. Hero Slides ----------
            await supabase.from('hero_slides').delete().neq('id', 0);
            const heroSlides = [];
            const slidePreviews = document.querySelectorAll('#heroSlidesContainer .slide-item .slide-preview');
            for (let i = 0; i < slidePreviews.length; i++) {
                const img = slidePreviews[i];
                let src = img.src;
                if (src.startsWith('data:')) {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    const file = new File([blob], `slide_${i}.jpg`, { type: 'image/jpeg' });
                    src = await uploadImage(file, 'hero');
                }
                heroSlides.push({ image_url: src, sort_order: i });
            }
            if (heroSlides.length) {
                const { error: heroError } = await supabase.from('hero_slides').insert(heroSlides);
                if (heroError) throw heroError;
            }

            // ---------- 3. News Categories & Items ----------
            await supabase.from('news_items').delete().neq('id', 0);
            await supabase.from('news_categories').delete().neq('id', 0);

            const newsData = collectNewsData();
            for (const [catName, catType] of Object.entries(newsData.categories)) {
                const { data: cat, error: catErr } = await supabase
                    .from('news_categories')
                    .insert({ name: catName, type: catType, sort_order: 0 })
                    .select()
                    .single();
                if (catErr) throw catErr;
                const items = newsData.items[catName] || [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    let imageUrl = item.image;
                    if (imageUrl && imageUrl.startsWith('data:')) {
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        const file = new File([blob], `news_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        imageUrl = await uploadImage(file, 'news');
                    }
                    let videoSrc = item.videoSrc;
                    if (videoSrc && videoSrc.startsWith('data:')) {
                        // For simplicity, we store video as data URL – but this will be huge. Better to upload to storage.
                        // In a real app, you'd upload video files to storage as well.
                        // For now, we keep as data URL – but be aware of size limits.
                    }
                    await supabase.from('news_items').insert({
                        category_id: cat.id,
                        title: item.title,
                        subtitle: item.subtitle,
                        description: item.desc,
                        author: item.author,
                        read_time: item.readTime,
                        timestamp: item.timestamp,
                        link: item.link,
                        image_url: imageUrl,
                        video_src: videoSrc,
                        duration: item.duration,
                        sort_order: i
                    });
                }
            }

            // ---------- 4. Officials ----------
            await supabase.from('officials').delete().neq('id', 0);
            const officialCards = document.querySelectorAll('#officialsGrid .official-card');
            for (let i = 0; i < officialCards.length; i++) {
                const card = officialCards[i];
                const name = card.querySelector('.official-name-input')?.value || '';
                const position = card.querySelector('.official-position-input')?.value || '';
                let imageUrl = card.querySelector('.official-image-preview')?.src || '';
                if (imageUrl.startsWith('data:')) {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], `official_${i}.jpg`, { type: 'image/jpeg' });
                    imageUrl = await uploadImage(file, 'officials');
                }
                if (name && position) {
                    await supabase.from('officials').insert({
                        name,
                        position,
                        image_url: imageUrl,
                        sort_order: i
                    });
                }
            }

            // ---------- 5. Municipal Profile Sections ----------
            await supabase.from('profile_sections').delete().neq('id', 0);
            const profileSections = document.querySelectorAll('#profileSectionsContainer .profile-section-card');
            for (let i = 0; i < profileSections.length; i++) {
                const sec = profileSections[i];
                const heading = sec.querySelector('.section-heading')?.value || '';
                const content = sec.querySelector('.section-content')?.value || '';
                let imageUrl = sec.querySelector('.section-image-preview')?.src || '';
                if (imageUrl.startsWith('data:')) {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], `profile_${i}.jpg`, { type: 'image/jpeg' });
                    imageUrl = await uploadImage(file, 'profile');
                }
                await supabase.from('profile_sections').insert({
                    heading,
                    content,
                    image_url: imageUrl,
                    sort_order: i
                });
            }

            // ---------- 6. LGU Offices ----------
            await supabase.from('lgu_offices').delete().neq('id', 0);
            const officeCards = document.querySelectorAll('#lguOfficesContainer .lgu-office-card');
            for (let i = 0; i < officeCards.length; i++) {
                const card = officeCards[i];
                const icon = card.querySelector('.office-icon-select')?.value || 'fa-building';
                const name = card.querySelector('.office-name-input')?.value || '';
                const servicesText = card.querySelector('.office-services-textarea')?.value || '';
                const services = servicesText.split('\n').map(s => s.trim()).filter(s => s);
                if (name) {
                    await supabase.from('lgu_offices').insert({
                        icon,
                        name,
                        services,
                        sort_order: i
                    });
                }
            }

            // ---------- 7. Liga Punong ----------
            await supabase.from('liga_punong').delete().neq('id', 0);
            const punongRows = document.querySelectorAll('#punongList .liga-item-row');
            for (let i = 0; i < punongRows.length; i++) {
                const row = punongRows[i];
                const barangay = row.querySelector('.liga-barangay-input')?.value || '';
                const name = row.querySelector('.liga-name-input')?.value || '';
                if (barangay) {
                    await supabase.from('liga_punong').insert({
                        barangay,
                        name: name || 'vacant',
                        sort_order: i
                    });
                }
            }

            // ---------- 8. Liga SK ----------
            await supabase.from('liga_sk').delete().neq('id', 0);
            const skRows = document.querySelectorAll('#skList .liga-item-row');
            for (let i = 0; i < skRows.length; i++) {
                const row = skRows[i];
                const barangay = row.querySelector('.liga-barangay-input')?.value || '';
                const name = row.querySelector('.liga-name-input')?.value || '';
                if (barangay) {
                    await supabase.from('liga_sk').insert({
                        barangay,
                        name: name || 'vacant',
                        sort_order: i
                    });
                }
            }

            // ---------- 9. Tourism Sections & Images ----------
            await supabase.from('tourism_sections').delete().neq('id', 0);
            await supabase.from('tourism_images').delete().neq('id', 0);

            const section1TextVal = document.getElementById('tourismSection1Text')?.value || '';
            const section2TextVal = document.getElementById('tourismSection2Text')?.value || '';
            const bulletListVal = document.getElementById('tourismBulletList')?.value || '';

            const { data: sec1 } = await supabase.from('tourism_sections').insert({
                section_key: 'section1',
                text_content: section1TextVal,
                bullet_list: bulletListVal
            }).select().single();

            const { data: sec2 } = await supabase.from('tourism_sections').insert({
                section_key: 'section2',
                text_content: section2TextVal
            }).select().single();

            const sec1Images = document.querySelectorAll('#tourismSection1Images .tourism-image-preview');
            for (let i = 0; i < sec1Images.length; i++) {
                let src = sec1Images[i].src;
                if (src.startsWith('data:')) {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    const file = new File([blob], `tourism1_${i}.jpg`, { type: 'image/jpeg' });
                    src = await uploadImage(file, 'tourism');
                }
                await supabase.from('tourism_images').insert({
                    section_key: 'section1',
                    image_url: src,
                    sort_order: i
                });
            }

            const sec2Images = document.querySelectorAll('#tourismSection2Images .tourism-image-preview');
            for (let i = 0; i < sec2Images.length; i++) {
                let src = sec2Images[i].src;
                if (src.startsWith('data:')) {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    const file = new File([blob], `tourism2_${i}.jpg`, { type: 'image/jpeg' });
                    src = await uploadImage(file, 'tourism');
                }
                await supabase.from('tourism_images').insert({
                    section_key: 'section2',
                    image_url: src,
                    sort_order: i
                });
            }

            let culturalPlanSrc = document.getElementById('culturalPlanPreview')?.src || '';
            if (culturalPlanSrc.startsWith('data:')) {
                const response = await fetch(culturalPlanSrc);
                const blob = await response.blob();
                const file = new File([blob], 'cultural_plan.jpg', { type: 'image/jpeg' });
                culturalPlanSrc = await uploadImage(file, 'tourism');
            }
            await supabase.from('tourism_cultural_plan').upsert({
                id: 1,
                image_url: culturalPlanSrc
            });

            // ---------- 10. PESO ----------
            await supabase.from('spes_beneficiaries').delete().neq('id', 0);
            const spesRows = document.querySelectorAll('#spesTableBody tr');
            for (let i = 0; i < spesRows.length; i++) {
                const row = spesRows[i];
                const name = row.querySelector('.spes-name')?.value || '';
                const address = row.querySelector('.spes-address')?.value || '';
                const years = row.querySelector('.spes-years')?.value || '';
                if (name) {
                    await supabase.from('spes_beneficiaries').insert({ name, address, years });
                }
            }

            await supabase.from('peso_images').delete().neq('id', 0);
            const pesoImgs = document.querySelectorAll('#pesoImagesContainer .peso-image-preview');
            for (let i = 0; i < pesoImgs.length; i++) {
                let src = pesoImgs[i].src;
                if (src.startsWith('data:')) {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    const file = new File([blob], `peso_${i}.jpg`, { type: 'image/jpeg' });
                    src = await uploadImage(file, 'peso');
                }
                await supabase.from('peso_images').insert({ image_url: src, sort_order: i });
            }

            // ---------- 11. Gallery ----------
            await supabase.from('gallery_images').delete().neq('id', 0);
            for (let page = 1; page <= 3; page++) {
                const pageId = page;
                const images = document.querySelectorAll(`#galleryGrid${page} .gallery-image-preview`);
                for (let i = 0; i < images.length; i++) {
                    let src = images[i].src;
                    if (src.startsWith('data:')) {
                        const response = await fetch(src);
                        const blob = await response.blob();
                        const file = new File([blob], `gallery_${page}_${i}.jpg`, { type: 'image/jpeg' });
                        src = await uploadImage(file, 'gallery');
                    }
                    await supabase.from('gallery_images').insert({
                        page_id: pageId,
                        image_url: src,
                        sort_order: i
                    });
                }
            }

            // ---------- 12. About Content ----------
            const about = {
                heading: document.getElementById('aboutHeading')?.value || '',
                paragraph: document.getElementById('aboutParagraph')?.value || '',
                vision: document.getElementById('aboutVision')?.value || '',
                mission: document.getElementById('aboutMission')?.value || '',
                history: document.getElementById('aboutHistory')?.value || '',
                map_embed_url: document.getElementById('aboutMapEmbed')?.value || '',
                map_link: document.getElementById('aboutMapLink')?.value || ''
            };
            await supabase.from('about_content').upsert({ id: 1, ...about });

            // ---------- 13. Transparency Cards ----------
            await supabase.from('transparency_cards').delete().neq('id', 0);
            const cardDivs = document.querySelectorAll('#transparencyCardsContainer .transparency-card-editor');
            for (let i = 0; i < cardDivs.length; i++) {
                const div = cardDivs[i];
                const icon = div.querySelector('.card-icon-select')?.value || 'fa-file-invoice-dollar';
                const title = div.querySelector('.card-title')?.value || '';
                const desc = div.querySelector('.card-desc')?.value || '';
                const linkText = div.querySelector('.card-link-text')?.value || '';
                if (title) {
                    await supabase.from('transparency_cards').insert({
                        icon,
                        title,
                        description: desc,
                        link_text: linkText,
                        sort_order: i
                    });
                }
            }

            // ---------- 14. Full Disclosure ----------
            await supabase.from('disclosure_categories').delete().neq('id', 0);
            await supabase.from('disclosure_years').delete().neq('id', 0);
            const catDivs = document.querySelectorAll('#disclosureCategoriesContainer .disclosure-category-card');
            for (let i = 0; i < catDivs.length; i++) {
                const div = catDivs[i];
                const summary = div.querySelector('.summary-input')?.value || '';
                const { data: cat, error: catErr } = await supabase
                    .from('disclosure_categories')
                    .insert({ summary, sort_order: i })
                    .select()
                    .single();
                if (catErr) throw catErr;
                const yearInputs = div.querySelectorAll('.year-item-wrapper input');
                for (let j = 0; j < yearInputs.length; j++) {
                    const year = yearInputs[j].value;
                    if (year) {
                        await supabase.from('disclosure_years').insert({
                            category_id: cat.id,
                            year_label: year,
                            sort_order: j
                        });
                    }
                }
            }

            // ---------- 15. Download Forms ----------
            await supabase.from('download_forms').delete().neq('id', 0);
            const formDivs = document.querySelectorAll('#downloadFormsContainer > div');
            for (let i = 0; i < formDivs.length; i++) {
                const div = formDivs[i];
                const icon = div.querySelector('.form-icon-select')?.value || 'fa-file-pdf';
                const title = div.querySelector('.form-title')?.value || '';
                const desc = div.querySelector('.form-desc')?.value || '';
                const link = div.querySelector('.form-link')?.value || '#';
                if (title) {
                    await supabase.from('download_forms').insert({
                        icon,
                        title,
                        description: desc,
                        link,
                        sort_order: i
                    });
                }
            }

            // ---------- 16. Users ----------
            // We do not delete users; we upsert based on the UI.
            const userRows = document.querySelectorAll('#usersList tr');
            for (const row of userRows) {
                const user = JSON.parse(row.dataset.user);
                await supabase.from('users').upsert({
                    username: user.username,
                    email: user.email,
                    password: user.password,
                    role: user.role,
                    status: user.status
                }, { onConflict: 'username' });
            }

            alert('All changes saved successfully!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving data. Check console for details.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
        }
    }

    // Helper to collect news data from UI
    function collectNewsData() {
        const categories = {};
        const items = {};
        document.querySelectorAll('.category-panel').forEach(panel => {
            const header = panel.querySelector('h3');
            if (!header) return;
            const catName = header.innerText;
            const cat = defaultNewsCategories.find(c => c.name === catName);
            const catType = cat ? cat.type : 'article';
            categories[catName] = catType;
            items[catName] = [];
            panel.querySelectorAll('.news-item-card').forEach(card => {
                const type = catType;
                const image = card.querySelector('.news-thumb-preview')?.src || '';
                if (type === 'gallery') {
                    items[catName].push({ image });
                } else if (type === 'video') {
                    const title = card.querySelector('.news-title')?.value || '';
                    const duration = card.querySelector('.news-duration')?.value || '';
                    const videoSrc = card.querySelector('.video-src-hidden')?.value || '';
                    items[catName].push({ title, duration, image, videoSrc });
                } else {
                    const title = card.querySelector('.news-title')?.value || '';
                    const subtitle = card.querySelector('.news-subtitle')?.value || '';
                    const desc = card.querySelector('.news-desc')?.value || '';
                    const author = card.querySelector('.news-author')?.value || '';
                    const readTime = card.querySelector('.news-readtime')?.value || '';
                    const timestamp = card.querySelector('.news-timestamp')?.value || '';
                    const link = card.querySelector('.news-link')?.value || '#';
                    items[catName].push({ title, subtitle, desc, author, readTime, timestamp, link, image });
                }
            });
        });
        return { categories, items };
    }

    // ---------- Initialize ----------
    document.addEventListener('DOMContentLoaded', async () => {
        await loadAllData();

        renderSiteHeader();
        renderHero();
        renderFooter();
        renderColor();
        renderSystem();
        renderOfficials();
        renderMunicipalProfile();
        renderLguOffices();
        renderLiga();
        renderTourism();
        renderPeso();
        renderGallery();
        renderDownloadForms();
        renderNewsCategories();
        renderDisclosure();
        renderTransparencyCards();
        renderAbout();

        document.getElementById('saveSettings').addEventListener('click', saveAllData);

        // Activate first section
        document.querySelector('.sidebar-item[data-section="general"]').classList.add('active');
    });
})();
