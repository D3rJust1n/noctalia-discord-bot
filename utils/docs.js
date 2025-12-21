const resources = require('../config/resources');

let docsCache = null;
let faqCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 30;

function getApiBaseUrl() {
    if (process.env.DOCS_API_URL) {
        return process.env.DOCS_API_URL.endsWith('/') 
            ? process.env.DOCS_API_URL 
            : process.env.DOCS_API_URL + '/';
    }
    return 'https://docs.noctalia.dev/';
}

async function fetchDocs() {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}api/docs.json`);
        if (response.ok) {
            const data = await response.json();
            console.log(`Successfully fetched docs from ${apiBaseUrl}api/docs.json`);
            return data;
        }
        
        console.log(`Failed to fetch docs: ${response.status} ${response.statusText}`);
        return null;
    } catch (error) {
        console.error(`Error fetching docs from ${getApiBaseUrl()}api/docs.json:`, error.message);
        return null;
    }
}

async function fetchFAQs() {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}api/faq.json`);
        if (response.ok) {
            const data = await response.json();
            const faqs = Array.isArray(data) ? data : (data.faqs || data.faq || null);
            if (faqs) {
                console.log(`Successfully fetched ${faqs.length} FAQs from ${apiBaseUrl}api/faq.json`);
            }
            return faqs;
        }
        
        console.log(`Failed to fetch FAQs: ${response.status} ${response.statusText}`);
        return null;
    } catch (error) {
        console.error(`Error fetching FAQs from ${getApiBaseUrl()}api/faq.json:`, error.message);
        return null;
    }
}

async function getDocs() {
    const now = Date.now();
    const apiBaseUrl = getApiBaseUrl();
    
    const docs = await fetchDocs();
    
    if (docs && docs.gettingStarted) {
        docsCache = docs;
        cacheTimestamp = now;
        console.log(`Using docs from API: ${apiBaseUrl}`);
        return docs;
    }
    
    if (docsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log(`Using cached docs (cache expires in ${Math.round((CACHE_DURATION - (now - cacheTimestamp)) / 1000)}s)`);
        return docsCache;
    }
    
    throw new Error(`Failed to fetch docs from ${apiBaseUrl}api/docs.json. The documentation API is unavailable.`);
}

async function getFAQs() {
    const now = Date.now();
    const apiBaseUrl = getApiBaseUrl();
    
    const faqs = await fetchFAQs();
    
    if (faqs && Array.isArray(faqs) && faqs.length > 0) {
        faqCache = faqs;
        cacheTimestamp = now;
        console.log(`Using ${faqs.length} FAQs from API: ${apiBaseUrl}`);
        return faqs;
    }
    
    if (faqCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log(`Using cached FAQs (${faqCache.length} items, cache expires in ${Math.round((CACHE_DURATION - (now - cacheTimestamp)) / 1000)}s)`);
        return faqCache;
    }
    
    throw new Error(`Failed to fetch FAQs from ${apiBaseUrl}api/faq.json. The documentation API is unavailable.`);
}

function clearCache() {
    docsCache = null;
    faqCache = null;
    cacheTimestamp = null;
}

module.exports = {
    getDocs,
    getFAQs,
    clearCache,
    fetchDocs,
    fetchFAQs,
};

