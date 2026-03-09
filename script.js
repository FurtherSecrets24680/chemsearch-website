const state = { cid: null, name: '', sdf: null, pubDesc: null, aiDesc: null, wikiDesc: null, descSource: 'pubchem' };

// --- CORE LOGIC ---
async function searchChemical(queryOverride) {
    const input = document.getElementById('searchInput');
    const query = queryOverride || input.value.trim();
    if (!query) return;

    setLoading(true);

    try {
        // Get CID
        const cidRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`);
        if (!cidRes.ok) throw new Error();
        const cidData = await cidRes.json();
        const cid = cidData.IdentifierList.CID[0];

        state.cid = cid;
        state.name = query;
        updateHistory(query);

        state.wikiDesc = null;
        state.descSource = 'pubchem';

        const [props, syns, sdfRaw, desc] = await Promise.all([
            safeFetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,SMILES,ConnectivitySMILES,InChIKey,InChI,Charge/JSON`),
            safeFetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`),
            safeFetchText(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`),
            safeFetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/description/JSON`)
        ]);

        let sdf = sdfRaw;
        if (sdf && sdf.includes('no 3D structure available')) {
            sdf = null; // Treat as unavailable
        }
        state.sdf = sdf;

        const p = props?.PropertyTable?.Properties?.[0] || {};
        const sList = syns?.InformationList?.Information?.[0]?.Synonym || [];

        state.name = sList[0] || query;
        state.sdf = sdf;
        state.aiDesc = null;

        let pubDescText = null;
        if (desc?.InformationList?.Information) {
            const dList = desc.InformationList.Information || [];
            const descItem = dList.find(i => i.Description);
            if (descItem) {
                pubDescText = descItem.Description;
                if (Array.isArray(pubDescText)) {
                    pubDescText = pubDescText.join('\n\n');
                }
                console.log('PubChem description fetched:', pubDescText);
            } else {
                console.log('No description found in Information array');
            }
        } else {
            console.log('PubChem description response structure:', desc);
        }
        state.pubDesc = pubDescText;

        // Render PubChem Data immediately
        renderUI(p, sList);
        setLoading(false);

        // Handle Description display (PubChem default)
        const descSec = document.getElementById('section-about');
        const descVal = document.getElementById('val-desc');
        const aiLoader = document.getElementById('ai-loading');
        const pubBtn = document.getElementById('descPubBtn');
        const aiBtn = document.getElementById('descAIBtn');

        descSec.classList.remove('hidden');
        aiLoader.classList.add('hidden');

        if (pubBtn) pubBtn.style.display = '';
        if (aiBtn) aiBtn.style.display = '';

        const savedDefault = localStorage.getItem('defaultDescSource') || 'pubchem';
        state.descSource = savedDefault;

        if (savedDefault === 'pubchem') {
            const descVal = document.getElementById('val-desc');
            if (state.pubDesc) {
                descVal.textContent = state.pubDesc;
            } else {
                descVal.textContent = 'PubChem description not available for this compound.';
            }
            setDescriptionSource('pubchem');
        } else if (savedDefault === 'wiki') {
            fetchAndDisplayWiki();
        } else if (savedDefault === 'ai') {
            fetchAndDisplayAI();
        }

    } catch (e) {
        setLoading(false);
        showError("Chemical not found. Please check spelling, try a synonym, or ensure the compound exists in PubChem.");
    }
}

async function fetchGeminiDescription(chemName) {
    try {
        const apiKey = localStorage.getItem('gemini_key');
        if (!apiKey) {
            console.log('No API key found');
            return null;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

        const prompt = `Write a short description (approx 2-3 sentences) of the chemical "${chemName}".
        Crucial: Explicitly mention where it is mainly used in real-world applications.
        Keep it concise and easy to read.
        If using chemical formulas or math, please use standard LaTeX formatting (e.g. $H_2O$, $CO_2$) enclosed in dollar signs.`;

        console.log('Fetching from Gemini API...');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();
        console.log('Gemini API Response:', data);

        if (!response.ok) {
            console.log('API Error - Status:', response.status);
            console.log('Response error:', data.error);
            return null;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.log('No text in response');
            return null;
        }

        console.log('Successfully got AI description');
        return text;

    } catch (error) {
        console.error("Gemini Fetch Error:", error);
        return null;
    }
}

async function fetchWikiDescription(chemName) {
    try {
        let title = chemName.trim();
        if (title.length > 0) {
            title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
        }
        
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.extract || null;
    } catch (error) {
        console.error("Wikipedia Fetch Error:", error);
        return null;
    }
}

function renderUI(props, synonyms) {
    setText('chem-name', capitalize(state.name));

    let cas = '-';
    const casRegex = /^\d{2,7}-\d{2}-\d$/;
    for (let syn of synonyms) {
        if (casRegex.test(syn)) {
            cas = syn;
            break;
        }
    }
    setText('chem-iupac', props.IUPACName || "N/A");
    setText('chem-cas', cas);
    const cidEl = document.getElementById('chem-cid');
    if (cidEl) {
        if (state.cid) {
            cidEl.textContent = state.cid;
            cidEl.href = `https://pubchem.ncbi.nlm.nih.gov/compound/${state.cid}`;
        } else {
            cidEl.textContent = '-';
            cidEl.href = '#';
        }
    }

    // Stats
    document.getElementById('val-formula').innerHTML = formatSub(props.MolecularFormula || "-");
    document.getElementById('val-empirical').innerHTML = formatSub(getEmpirical(props.MolecularFormula) || "-");
    setText('val-weight', (props.MolecularWeight || "-") + " g/mol");
    setText('val-charge', props.Charge || 0);

    // Identifiers
    const connectivitySmiles = props.ConnectivitySMILES || props.SMILES || "-";
    const fullSmiles = props.SMILES || props.ConnectivitySMILES || "-";
    setText('val-smiles-connectivity', connectivitySmiles);
    setText('val-smiles-full', fullSmiles);
    setText('val-inchikey', props.InChIKey || "-");
    setText('val-inchi', props.InChI || "-");

    // Composition
    renderComposition(props.MolecularFormula);

    // Synonyms
    const synSec = document.getElementById('section-synonyms');
    const synList = document.getElementById('list-synonyms');
    synList.innerHTML = '';
    const topSyns = synonyms.slice(0, 8);
    if (topSyns.length > 0) {
        topSyns.forEach(s => {
            const tag = document.createElement('span');
            tag.className = "px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md border border-blue-100 dark:border-blue-800/50";
            tag.textContent = s;
            synList.appendChild(tag);
        });
        synSec.classList.remove('hidden');
    } else {
        synSec.classList.add('hidden');
    }

    // Image
    document.getElementById('mol-img').src = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${state.cid}/PNG?image_size=large`;
    setTab('2d');

    // Show Content
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');
}

function typewriterEffect(element, text, callback) {
    element.textContent = "";
    let index = 0;
    const speed = 10;

    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        } else if (callback) {
            callback();
        }
    }
    type();
}

// --- HELPERS ---
async function safeFetch(url) {
    try {
        const res = await fetch(url);
        return res.ok ? await res.json() : null;
    } catch { return null; }
}

async function safeFetchText(url) {
    try {
        const res = await fetch(url);
        return res.ok ? await res.text() : null;
    } catch { return null; }
}

function renderComposition(formula) {
    if (!formula) return;
    const elements = parseFormula(formula);
    const weights = {
        "H": 1.008, "He": 4.002602, "Li": 6.94, "Be": 9.012183, "B": 10.81, "C": 12.011, "N": 14.0067, "O": 15.9994,
        "F": 18.998403163, "Ne": 20.1797, "Na": 22.98976928, "Mg": 24.305, "Al": 26.9815385, "Si": 28.085, "P": 30.973762,
        "S": 32.065, "Cl": 35.45, "Ar": 39.948, "K": 39.0983, "Ca": 40.078, "Sc": 44.955912, "Ti": 47.867, "V": 50.9415,
        "Cr": 52.0, "Mn": 54.938044, "Fe": 55.845, "Co": 58.933194, "Ni": 58.6934, "Cu": 63.546, "Zn": 65.38, "Ga": 69.723,
        "Ge": 72.61, "As": 74.921595, "Se": 78.96, "Br": 79.904, "Kr": 83.798, "Rb": 85.4678, "Sr": 87.62, "Y": 88.90584,
        "Zr": 91.224, "Nb": 92.90637, "Mo": 95.95, "Tc": 98, "Ru": 101.07, "Rh": 102.9055, "Pd": 106.42, "Ag": 107.8682,
        "Cd": 112.411, "In": 114.818, "Sn": 118.71, "Sb": 121.76, "Te": 127.6, "I": 126.90447, "Xe": 131.293, "Cs": 132.90545196,
        "Ba": 137.327, "La": 138.90547, "Ce": 140.116, "Pr": 140.90765, "Nd": 144.242, "Pm": 145, "Sm": 150.36, "Eu": 151.964,
        "Gd": 157.25, "Tb": 158.92535, "Dy": 162.5, "Ho": 164.93032, "Er": 167.259, "Tm": 168.93421, "Yb": 173.054, "Lu": 174.967,
        "Hf": 178.49, "Ta": 180.94788, "W": 183.84, "Re": 186.207, "Os": 190.23, "Ir": 192.217, "Pt": 195.084, "Au": 196.966569,
        "Hg": 200.59, "Tl": 204.3833, "Pb": 207.2, "Bi": 208.9804, "Po": 209, "At": 210, "Rn": 222, "Fr": 223, "Ra": 226,
        "Ac": 227, "Th": 232.03774, "Pa": 231.035882, "U": 238.028913, "Np": 237, "Pu": 244, "Am": 243, "Cm": 247, "Bk": 247,
        "Cf": 251, "Es": 252, "Fm": 257, "Md": 258, "No": 259, "Lr": 266, "Rf": 267, "Db": 268, "Sg": 269, "Bh": 270, "Hs": 269,
        "Mt": 278, "Ds": 281, "Rg": 282, "Cn": 285, "Nh": 286, "Fl": 289, "Mc": 289, "Lv": 293, "Ts": 294, "Og": 294
    };

    let total = 0;
    const data = [];
    for (let k in elements) {
        const w = weights[k] || 0;
        const m = w * elements[k];
        total += m;
        data.push({ el: k, m });
    }
    data.sort((a, b) => b.m - a.m);

    const bar = document.getElementById('composition-bar');
    bar.innerHTML = '';
    data.forEach(d => {
        const pct = ((d.m / total) * 100).toFixed(1);
        const row = document.createElement('div');
        row.className = "flex items-center gap-3 text-sm";
        row.innerHTML = `<span class="font-bold w-6 dark:text-gray-300">${d.el}</span>
        <div class="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-blue-500 rounded-full" style="width:${pct}%"></div></div>
        <span class="font-mono text-gray-500 w-12 text-right">${pct}%</span>`;
        bar.appendChild(row);
    });
}

function parseFormula(f) {
    const r = /([A-Z][a-z]?)([0-9]*)/g;
    const res = {};
    let m;
    while ((m = r.exec(f)) !== null) res[m[1]] = (res[m[1]] || 0) + parseInt(m[2] || 1);
    return res;
}

function getEmpirical(f) {
    if (!f) return null;
    const el = parseFormula(f);
    const vals = Object.values(el);
    if (!vals.length) return f;
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const d = vals.reduce(gcd);
    if (d === 1) return f;
    return Object.keys(el).map(k => k + (el[k] / d > 1 ? el[k] / d : "")).join('');
}

// --- UTILITIES ---
function setText(id, val) { document.getElementById(id).textContent = val; }
function formatSub(s) {
    if (!s) return s;

    // Detect trailing charge patterns like "-6", "+2", "2+", "+" or "-"
    const chargeMatch = s.match(/([+\-]\d+|\d+[+\-]|[+\-])$/);
    let main = s;
    let charge = null;
    if (chargeMatch) {
        charge = chargeMatch[0];
        main = s.slice(0, -charge.length);
    }

    // Replace digits in main formula with subscript digits
    const subDigits = '₀₁₂₃₄₅₆₇₈₉';
    const formattedMain = main.replace(/\d/g, m => subDigits[m]);

    if (!charge) return formattedMain;

    // Convert charge to superscript (use superscript digits and plus/minus)
    const superDigits = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
    const superPlus = '⁺';
    const superMinus = '⁻';
    let sup = '';
    // Normalize formats like '2+' to '+2' for consistent rendering
    if (/^\d+[+\-]$/.test(charge)) {
        charge = charge.slice(-1) + charge.slice(0, -1);
    }
    for (const ch of charge) {
        if (ch === '+') sup += superPlus;
        else if (ch === '-') sup += superMinus;
        else if (ch >= '0' && ch <= '9') sup += superDigits[ch] || ch;
        else sup += ch;
    }

    return formattedMain + '<sup>' + sup + '</sup>';
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function setLoading(b) { document.getElementById('loader').classList.toggle('hidden', !b); }
function handleEnter(e) { if (e.key === 'Enter') searchChemical(); }

function setTab(tab) {
    document.getElementById('tab-2d').classList.toggle('border-blue-500', tab === '2d');
    document.getElementById('tab-2d').classList.toggle('text-blue-600', tab === '2d');
    document.getElementById('tab-2d').classList.toggle('bg-blue-50/50', tab === '2d');
    document.getElementById('tab-2d').classList.toggle('dark:bg-blue-900/20', tab === '2d');
    document.getElementById('tab-2d').classList.toggle('font-bold', tab === '2d');
    document.getElementById('tab-2d').classList.toggle('text-gray-500', tab !== '2d');
    document.getElementById('tab-2d').classList.toggle('font-medium', tab !== '2d');

    document.getElementById('tab-3d').classList.toggle('border-blue-500', tab === '3d');
    document.getElementById('tab-3d').classList.toggle('text-blue-600', tab === '3d');
    document.getElementById('tab-3d').classList.toggle('bg-blue-50/50', tab === '3d');
    document.getElementById('tab-3d').classList.toggle('dark:bg-blue-900/20', tab === '3d');
    document.getElementById('tab-3d').classList.toggle('font-bold', tab === '3d');
    document.getElementById('tab-3d').classList.toggle('text-gray-500', tab !== '3d');
    document.getElementById('tab-3d').classList.toggle('font-medium', tab !== '3d');

    if (tab === '2d') {
        document.getElementById('mol-img').classList.remove('hidden');
        document.getElementById('mol-3d').classList.add('hidden');
        document.getElementById('no-3d').classList.add('hidden');
    } else {
        document.getElementById('mol-img').classList.add('hidden');
        if (!state.sdf) { // Enhanced check for unavailable/invalid SDF
            document.getElementById('mol-3d').classList.add('hidden');
            document.getElementById('no-3d').classList.remove('hidden');
            return;
        }
        document.getElementById('no-3d').classList.add('hidden');
        document.getElementById('mol-3d').classList.remove('hidden');
        const viewer = $3Dmol.createViewer(document.getElementById('mol-3d'), { backgroundColor: 'white' }); // Or 'transparent' if preferred
        viewer.addModel(state.sdf, 'sdf');
        viewer.setStyle({}, { stick: { radius: 0.15, color: 'spectrum' }, sphere: { scale: 0.3 } });
        viewer.zoomTo();
        viewer.render();
    }
}

async function downloadPNG() {
    if (!state.cid) return;
    const r = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${state.cid}/PNG?image_size=large`);
    const b = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = `${state.name}.png`;
    a.click();
}

function openExternal() { if (state.cid) window.open(`https://pubchem.ncbi.nlm.nih.gov/compound/${state.cid}`); }

function clearSearch() {
    const s = document.getElementById('searchInput');
    if (!s) return;
    s.value = '';
    document.getElementById('clearSearchBtn').classList.add('hidden');
    s.focus();
}
function copyText(id) {
    const t = document.getElementById(id).innerText;
    if (!t || t === '-') return;
    navigator.clipboard.writeText(t);
    showToast(`Copied: ${t.length > 120 ? t.slice(0, 120) + '…' : t}`);
}

function showToast(msg = 'Done') {
    const toast = document.getElementById('toast');
    const m = document.getElementById('toastMsg');
    m.textContent = msg;
    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-24', 'opacity-0'), 2000);
}

// History & Theme
function updateHistory(q) {
    let h = JSON.parse(localStorage.getItem('ch_hist') || '[]');
    h = h.filter(x => x.toLowerCase() !== q.toLowerCase());
    h.unshift(q);
    if (h.length > 10) h.pop();
    localStorage.setItem('ch_hist', JSON.stringify(h));
    localStorage.setItem('last_search', q);
    renderHistory();
}
function renderHistory() {
    const h = JSON.parse(localStorage.getItem('ch_hist') || '[]');
    const c = document.getElementById('historyList');
    c.innerHTML = h.map(x => `<div onclick="searchChemical('${x}')" class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-3 transition-colors"><i class="ph ph-clock"></i>${capitalize(x)}</div>`).join('');
    document.querySelector('#historyContainer .flex.justify-end').classList.toggle('hidden', h.length === 0);
}
function clearHistory() {
    localStorage.removeItem('ch_hist');
    renderHistory();
}
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

// Description toggle control (pubchem | wikipedia | ai)
function setDescriptionSource(src) {
    src = src === 'ai' ? 'ai' : src === 'wiki' ? 'wiki' : 'pubchem';
    state.descSource = src;
    const pubBtn = document.getElementById('descPubBtn');
    const wikiBtn = document.getElementById('descWikiBtn');
    const aiBtn = document.getElementById('descAIBtn');
    const descVal = document.getElementById('val-desc');
    const aiLoader = document.getElementById('ai-loading');
    const regenerateBtn = document.getElementById('regenerateAIBtn');

    aiLoader.classList.add('hidden');

    if (src === 'ai') {
        pubBtn.classList.remove('bg-blue-50', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-300', 'border-blue-200', 'dark:border-blue-700/50');
        pubBtn.classList.add('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
        if (wikiBtn) wikiBtn.classList.add('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
        aiBtn.classList.remove('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
        aiBtn.classList.add('bg-blue-50', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-300', 'border-blue-200', 'dark:border-blue-700/50');

        if (state.aiDesc) {
            regenerateBtn.classList.remove('hidden');
            descVal.textContent = '';
            typewriterEffect(descVal, state.aiDesc, () => {
                if (window.renderMathInElement) renderMathInElement(descVal, { delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}], throwOnError:false });
            });
        } else {
            descVal.textContent = 'AI description not available.';
        }
    } else if (src === 'wiki') {
        pubBtn.classList.add('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
        if (wikiBtn) {
            wikiBtn.classList.remove('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
            wikiBtn.classList.add('bg-blue-50', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-300', 'border-blue-200', 'dark:border-blue-700/50');
        }
        aiBtn.classList.add('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
        regenerateBtn.classList.add('hidden');
        descVal.textContent = state.wikiDesc || 'Wikipedia description not available.';
    } else {
        if (wikiBtn) wikiBtn.classList.add('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
        aiBtn.classList.add('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
        pubBtn.classList.remove('bg-transparent', 'text-gray-500', 'dark:text-gray-400', 'border-gray-200', 'dark:border-gray-700');
        pubBtn.classList.add('bg-blue-50', 'text-blue-700', 'dark:bg-blue-900/30', 'dark:text-blue-300', 'border-blue-200', 'dark:border-blue-700/50');
        regenerateBtn.classList.add('hidden');
        descVal.textContent = state.pubDesc || 'Description unavailable.';
    }
}

// API Key Modal functions
function openAPIKeyModal() {
    const bd = document.getElementById('apiKeyModalBackdrop');
    const input = document.getElementById('apiKeyInput');
    bd.classList.remove('hidden');
    input.value = localStorage.getItem('gemini_key') || '';
    setTimeout(() => input.focus(), 100);
}

function closeAPIKeyModal() {
    const bd = document.getElementById('apiKeyModalBackdrop');
    bd.classList.add('hidden');
}

function saveAPIKey() {
    const input = document.getElementById('apiKeyInput');
    const key = input.value.trim();

    if (!key) {
        showToast('API key cannot be empty');
        return;
    }

    localStorage.setItem('gemini_key', key);
    closeAPIKeyModal();
    showToast('API key saved successfully');

    if (state.cid) {
        state.aiDesc = null;
        state.descSource = 'pubchem';
        setDescriptionSource('pubchem');
        fetchAndDisplayAI();
    }
}

function handleAIDescriptionClick() {
    const hasKey = localStorage.getItem('gemini_key');
    if (!hasKey) {
        openAPIKeyModal();
    } else if (state.aiDesc) {
        setDescriptionSource('ai');
    } else {
        fetchAndDisplayAI();
    }
}

function fetchAndDisplayAI() {
    const aiLoader = document.getElementById('ai-loading');
    aiLoader.classList.remove('hidden');
    console.log('Fetching AI description...');

    fetchGeminiDescription(state.name).then(aiDesc => {
        aiLoader.classList.add('hidden');
        if (aiDesc) {
            state.aiDesc = aiDesc;
            setDescriptionSource('ai');
            console.log('AI description fetched successfully');
        } else {
            showToast('Failed to generate AI description. Check your API key.');
            console.log('AI description fetch failed');
            // Revert to PubChem on error
            setDescriptionSource('pubchem');
        }
    }).catch(e => {
        aiLoader.classList.add('hidden');
        showToast('Error fetching AI description');
        console.log('AI fetch error:', e);
        // Revert to PubChem on error
        setDescriptionSource('pubchem');
    });
}

function regenerateAIDescription() {
    const hasKey = localStorage.getItem('gemini_key');
    if (!hasKey) {
        openAPIKeyModal();
    } else {
        state.aiDesc = null;
        fetchAndDisplayAI();
    }
}

function handleWikiDescriptionClick() {
    if (state.wikiDesc) {
        setDescriptionSource('wiki');
    } else {
        fetchAndDisplayWiki();
    }
}

async function fetchAndDisplayWiki() {
    fetchWikiDescription(state.name).then(wikiDesc => {
        if (wikiDesc) {
            state.wikiDesc = wikiDesc;
            setDescriptionSource('wiki');
        } else {
            showToast('Wikipedia description not available for this compound.');
            setDescriptionSource('pubchem');
        }
    }).catch(() => {
        showToast('Error fetching Wikipedia description');
        setDescriptionSource('pubchem');
    });
}

// === SEARCH AUTOSUGGESTIONS (PubChem Auto-Complete API) ===
let debounceTimer = null;

function initAutosuggestions() {
    const input = document.getElementById('searchInput');
    
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchSuggestions, 280);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('suggestionsDropdown');
        if (!input.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('suggestionsDropdown').classList.add('hidden');
        }
    });
}

async function fetchSuggestions() {
    const input = document.getElementById('searchInput');
    const query = input.value.trim();
    
    if (query.length < 3) {
        document.getElementById('suggestionsDropdown').classList.add('hidden');
        return;
    }

    try {
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/Compound/${encodeURIComponent(query)}/json`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        const suggestions = data.dictionary_terms?.compound || [];

        renderSuggestions(suggestions.slice(0, 15)); // max 15 results
    } catch (e) {
        console.error("Autosuggest error:", e);
    }
}

function renderSuggestions(suggestions) {
    const list = document.getElementById('suggestionsList');
    const dropdown = document.getElementById('suggestionsDropdown');
    
    list.innerHTML = '';

    if (suggestions.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    suggestions.forEach(sug => {
        const li = document.createElement('li');
        li.className = "px-5 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors";
        li.textContent = sug;
        li.onclick = () => {
            const input = document.getElementById('searchInput');
            input.value = sug;
            dropdown.classList.add('hidden');
            searchChemical();
        };
        list.appendChild(li);
    });

    dropdown.classList.remove('hidden');
}

// === Default Description Settings ===
function openDefaultSettingsModal() {
    const bd = document.getElementById('defaultSettingsModalBackdrop');
    bd.classList.remove('hidden');
    updateDefaultBadges();
}

function closeDefaultSettingsModal() {
    const bd = document.getElementById('defaultSettingsModalBackdrop');
    bd.classList.add('hidden');
}

function setDefaultDescSource(src) {
    localStorage.setItem('defaultDescSource', src);
    updateDefaultBadges();
    closeDefaultSettingsModal();
    showToast(`Default set to ${src.toUpperCase()}`);
}

function updateDefaultBadges() {
    const def = localStorage.getItem('defaultDescSource') || 'pubchem';
    document.getElementById('default-pubchem').classList.toggle('hidden', def !== 'pubchem');
    document.getElementById('default-wiki').classList.toggle('hidden', def !== 'wiki');
    document.getElementById('default-ai').classList.toggle('hidden', def !== 'ai');
}

// === FEEDBACK MODAL WITH FORMSPREE ===
function openFeedbackModal() {
    document.getElementById('feedbackModalBackdrop').classList.remove('hidden');
    document.getElementById('feedbackMessage').focus();
}

function closeFeedbackModal() {
    const bd = document.getElementById('feedbackModalBackdrop');
    bd.classList.add('hidden');
    document.getElementById('feedbackForm').reset();
}

async function handleFeedbackSubmit(e) {
    e.preventDefault();

    const btn = document.getElementById('feedbackSubmitBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sending...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('message', document.getElementById('feedbackMessage').value);
    formData.append('email / name', document.getElementById('feedbackEmail').value || 'anonymous@chemsearch.app');
    formData.append('_subject', 'ChemSearch Feedback');

    const FORMSPREE_ENDPOINT = "https://formspree.io/f/mykdqyrg";

    try {
        const res = await fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
            showToast("Thank you! Feedback sent successfully ❤️");
            closeFeedbackModal();
        } else {
            showToast("Failed to send. Please try again.");
        }
    } catch (err) {
        showToast("Network error. Please check your connection.");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// === Identifier Info Buttons ===
function showInfo(type) {
    let title = '';
    let text = '';
    if (type === 'smiles-connectivity') {
        title = 'SMILES (Connectivity)';
        text = 'A simplified line notation that shows which atoms are connected. It ignores stereochemistry and explicit hydrogens for brevity.';
    } else if (type === 'smiles-full') {
        title = 'SMILES (Full)';
        text = 'Complete SMILES including all atoms, bonds, branches, and stereochemistry information.';
    } else if (type === 'inchi') {
        title = 'InChI';
        text = 'International Chemical Identifier — a unique, standardized string that fully describes a molecule\'s structure (machine-readable).';
    } else if (type === 'inchikey') {
        title = 'InChI Key';
        text = 'A 27-character hashed version of the InChI, designed for fast web/database searches. It is not reversible to the full structure.';
    }
    alert(title + '\n\n' + text);
}

document.addEventListener('click', (e) => {
    const bd = document.getElementById('apiKeyModalBackdrop');
    if (bd && !bd.classList.contains('hidden') && e.target === bd) {
        closeAPIKeyModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const bd = document.getElementById('apiKeyModalBackdrop');
        if (bd && !bd.classList.contains('hidden')) {
            closeAPIKeyModal();
        }
    }
});

// Init
if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
renderHistory();
document.getElementById('searchInput').focus();
const lastSearch = localStorage.getItem('last_search');
if (lastSearch) document.getElementById('searchInput').value = lastSearch;

// Wire up clear button visibility
const _si = document.getElementById('searchInput');
const _cb = document.getElementById('clearSearchBtn');
if (_si && _cb) {
    _si.addEventListener('input', () => _cb.classList.toggle('hidden', !_si.value));
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); document.getElementById('searchInput').focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault(); searchChemical();
    }
    if (e.key === 'Escape') {
        const s = document.getElementById('searchInput');
        if (s && s.value) clearSearch();
    }
});

// Mobile history toggle
document.getElementById('historyToggle').addEventListener('click', () => {
    const cont = document.getElementById('historyContainer');
    cont.classList.toggle('hidden');
    const btn = document.getElementById('historyToggle');
    btn.textContent = cont.classList.contains('hidden') ? 'Show History' : 'Hide History';
});

// About & FAQ modal handlers
function showAbout() {
    const bd = document.getElementById('aboutModalBackdrop');
    const modal = document.getElementById('aboutModal');
    if (!bd || !modal) return;
    bd.classList.remove('hidden');
    requestAnimationFrame(() => {
        bd.setAttribute('data-open', 'true');
        modal.setAttribute('data-open', 'true');
        modal.classList.remove('scale-95', 'opacity-0');
    });
    document.body.style.overflow = 'hidden';
    setTimeout(() => modal.focus(), 120);
}

function hideAbout() {
    const bd = document.getElementById('aboutModalBackdrop');
    const modal = document.getElementById('aboutModal');
    if (!bd || !modal) return;
    bd.removeAttribute('data-open');
    modal.removeAttribute('data-open');
    setTimeout(() => {
        bd.classList.add('hidden');
        document.body.style.overflow = '';
    }, 180);
}

function showFAQ() {
    const bd = document.getElementById('faqModalBackdrop');
    const modal = document.getElementById('faqModal');
    if (!bd || !modal) return;
    bd.classList.remove('hidden');
    requestAnimationFrame(() => {
        bd.setAttribute('data-open', 'true');
        modal.setAttribute('data-open', 'true');
        modal.classList.remove('scale-95', 'opacity-0');
    });
    document.body.style.overflow = 'hidden';
    setTimeout(() => modal.focus(), 120);
}

function hideFAQ() {
    const bd = document.getElementById('faqModalBackdrop');
    const modal = document.getElementById('faqModal');
    if (!bd || !modal) return;
    bd.removeAttribute('data-open');
    modal.removeAttribute('data-open');
    setTimeout(() => {
        bd.classList.add('hidden');
        document.body.style.overflow = '';
    }, 180);
}

// Error modal (replaces native alert for not-found / errors)
function showError(msg) {
    const bd = document.getElementById('errorModalBackdrop');
    const modal = document.getElementById('errorModal');
    const msgEl = document.getElementById('errorMsg');
    if (!bd || !modal || !msgEl) return;
    msgEl.textContent = msg;
    bd.classList.remove('hidden');
    requestAnimationFrame(() => {
        bd.setAttribute('data-open', 'true');
        modal.setAttribute('data-open', 'true');
        modal.classList.remove('scale-95', 'opacity-0');
    });
    document.body.style.overflow = 'hidden';
    setTimeout(() => modal.focus(), 120);
}

function hideError() {
    const bd = document.getElementById('errorModalBackdrop');
    const modal = document.getElementById('errorModal');
    if (!bd || !modal) return;
    bd.removeAttribute('data-open');
    modal.removeAttribute('data-open');
    setTimeout(() => {
        bd.classList.add('hidden');
        document.body.style.overflow = '';
    }, 180);
}

document.addEventListener('click', (e) => {
    const aBd = document.getElementById('aboutModalBackdrop');
    const fBd = document.getElementById('faqModalBackdrop');
    const errBd = document.getElementById('errorModalBackdrop');
    if (aBd && !aBd.classList.contains('hidden') && e.target === aBd) hideAbout();
    if (fBd && !fBd.classList.contains('hidden') && e.target === fBd) hideFAQ();
    if (errBd && !errBd.classList.contains('hidden') && e.target === errBd) hideError();
    const defaultBd = document.getElementById('defaultSettingsModalBackdrop');
    if (defaultBd && !defaultBd.classList.contains('hidden') && e.target === defaultBd) closeDefaultSettingsModal();
    const fbBd = document.getElementById('feedbackModalBackdrop');
    if (fbBd && !fbBd.classList.contains('hidden') && e.target === fbBd) closeFeedbackModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const aBd = document.getElementById('aboutModalBackdrop');
        const fBd = document.getElementById('faqModalBackdrop');
        const errBd = document.getElementById('errorModalBackdrop');
        if (aBd && !aBd.classList.contains('hidden')) hideAbout();
        if (fBd && !fBd.classList.contains('hidden')) hideFAQ();
        if (errBd && !errBd.classList.contains('hidden')) hideError();
        const defaultBd = document.getElementById('defaultSettingsModalBackdrop');
        if (defaultBd && !defaultBd.classList.contains('hidden')) closeDefaultSettingsModal();
        const fbBd = document.getElementById('feedbackModalBackdrop');
        if (fbBd && !fbBd.classList.contains('hidden')) closeFeedbackModal();
    }
});

// Init Autosuggestions
initAutosuggestions();