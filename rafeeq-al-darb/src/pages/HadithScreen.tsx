import React, { useState, useCallback } from 'react';
import { HADITH_BOOKS, HADITH_CATEGORIES } from '../utils/surahNames';

interface HadithScreenProps { setPage: (page: string) => void; }

interface Hadith {
  id?: number;
  hadith?: string;
  text?: string;
  arabic?: string;
  matn?: string;
  book?: number;
  [key: string]: unknown;
}

interface SearchResult {
  hadith: Hadith;
  bookId: string;
  bookName: string;
  idx: number;
}

type Tab = 'books' | 'topics' | 'search';

const SAANDSOFT_BASE = 'https://raw.githubusercontent.com/saandsoft/hadith-json/main/db/';
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/';
const CDN_MAP: Record<string, string> = {
  bukhari: 'ara-bukhari', muslim: 'ara-muslim', tirmidhi: 'ara-tirmidhi',
  abudawud: 'ara-abudawud', nasai: 'ara-nasai', ibnmajah: 'ara-ibnmajah',
  malik: 'ara-malik', darimi: 'ara-darimi', nawawi: 'ara-nawawi40',
};

const getHadithText = (h: Hadith): string =>
  (h.text || h.hadith || h.arabic || h.matn || '').toString().trim() ||
  JSON.stringify(h).slice(0, 200);

const parseHadiths = (data: unknown): Hadith[] => {
  if (!data) return [];
  if (typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.hadiths)) return d.hadiths as Hadith[];
    if (Array.isArray(d.data)) return d.data as Hadith[];
  }
  if (Array.isArray(data)) return data as Hadith[];
  return [];
};

const searchCachedBooks = (query: string, limit = 300): SearchResult[] => {
  const results: SearchResult[] = [];
  for (const book of HADITH_BOOKS) {
    try {
      const raw = localStorage.getItem(`hadith_${book.id}`);
      if (!raw) continue;
      const hadiths = parseHadiths(JSON.parse(raw));
      for (let i = 0; i < hadiths.length; i++) {
        if (results.length >= limit) break;
        const text = getHadithText(hadiths[i]);
        if (text.includes(query)) {
          results.push({ hadith: hadiths[i], bookId: book.id, bookName: book.name, idx: i });
        }
      }
    } catch { /* skip */ }
    if (results.length >= limit) break;
  }
  return results;
};

const searchByCategory = (keywords: string[], limit = 200): SearchResult[] => {
  const results: SearchResult[] = [];
  for (const book of HADITH_BOOKS) {
    try {
      const raw = localStorage.getItem(`hadith_${book.id}`);
      if (!raw) continue;
      const hadiths = parseHadiths(JSON.parse(raw));
      for (let i = 0; i < hadiths.length; i++) {
        if (results.length >= limit) break;
        const text = getHadithText(hadiths[i]);
        if (keywords.some(kw => text.includes(kw))) {
          results.push({ hadith: hadiths[i], bookId: book.id, bookName: book.name, idx: i });
        }
      }
    } catch { /* skip */ }
    if (results.length >= limit) break;
  }
  return results;
};

const HadithScreen: React.FC<HadithScreenProps> = ({ setPage }) => {
  const [tab, setTab] = useState<Tab>('books');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<SearchResult[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [bookError, setBookError] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [showChapters, setShowChapters] = useState(false);

  const loadBook = async (bookId: string) => {
    setLoading(true);
    setBookError('');
    setSelectedBook(bookId);
    setBookSearch('');
    setExpandedId(null);
    setDisplayLimit(50);
    setSelectedSection(null);
    setShowChapters(false);
    try {
      const secRaw = localStorage.getItem(`hadith_${bookId}_sections`);
      if (secRaw) setSections(JSON.parse(secRaw));
      else setSections({});
    } catch { setSections({}); }

    const cached = localStorage.getItem(`hadith_${bookId}`);
    if (cached) {
      try {
        const list = parseHadiths(JSON.parse(cached));
        if (list.length > 0) { setHadiths(list); setLoading(false); return; }
      } catch { /* fetch fresh */ }
    }

    let fetched: Hadith[] = [];

    if (CDN_MAP[bookId]) {
      try {
        const res = await fetch(`${CDN_BASE}${CDN_MAP[bookId]}.min.json`);
        if (res.ok) {
          const data = await res.json();
          fetched = parseHadiths(data).map(h => ({
            id: (h as { hadithnumber?: number }).hadithnumber ?? h.id,
            text: h.text || h.hadith || '',
          }));
        }
      } catch { /* try saandsoft */ }
    }

    if (fetched.length === 0) {
      try {
        const res = await fetch(`${SAANDSOFT_BASE}${bookId}.json`);
        if (res.ok) fetched = parseHadiths(await res.json());
      } catch { /* noop */ }
    }

    if (fetched.length > 0) {
      try {
        localStorage.setItem(`hadith_${bookId}`, JSON.stringify({ hadiths: fetched.slice(0, 600) }));
      } catch { /* storage full */ }
      setHadiths(fetched);
    } else {
      setBookError('تعذر تحميل الكتاب. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.');
      setHadiths([]);
    }
    setLoading(false);
  };

  const handleGlobalSearch = useCallback(() => {
    const q = globalSearch.trim();
    if (!q || q.length < 2) return;
    setSearching(true);
    setTimeout(() => {
      setSearchResults(searchCachedBooks(q, 300));
      setSearching(false);
    }, 50);
  }, [globalSearch]);

  const handleCategorySelect = useCallback((catId: string, keywords: string[]) => {
    setSelectedCategory(catId);
    setLoadingCategory(true);
    setTimeout(() => {
      setCategoryResults(searchByCategory(keywords, 200));
      setLoadingCategory(false);
    }, 50);
  }, []);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.8;
    window.speechSynthesis.speak(u);
  };

  const bookName = HADITH_BOOKS.find(b => b.id === selectedBook)?.name || '';
  const sectionEntries = Object.entries(sections);
  const filteredBySection = selectedSection !== null
    ? hadiths.filter(h => h.book === selectedSection)
    : hadiths;
  const filteredHadiths = filteredBySection.filter(h =>
    !bookSearch || getHadithText(h).includes(bookSearch)
  );

  const selectedCat = HADITH_CATEGORIES.find(c => c.id === selectedCategory);

  const TabBar = () => (
    <div className="flex gap-1 px-4 pb-3">
      {[
        { id: 'books' as Tab, label: 'الكتب', icon: '📚' },
        { id: 'topics' as Tab, label: 'المواضيع', icon: '🔖' },
        { id: 'search' as Tab, label: 'البحث', icon: '🔍' },
      ].map(t => (
        <button key={t.id} onClick={() => { setTab(t.id); setSelectedBook(null); setSelectedCategory(null); }}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ background: tab === t.id ? '#D4AF37' : '#1E1E1E', color: tab === t.id ? '#121212' : '#888', border: '1px solid rgba(212,175,55,0.2)' }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );

  const HadithCard = ({ result, index }: { result: SearchResult; index: number }) => {
    const text = getHadithText(result.hadith);
    const isExpanded = expandedId === index;
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.1)' }}>
        <button onClick={() => setExpandedId(isExpanded ? null : index)} className="w-full p-3 text-right">
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>{index + 1}</div>
            </div>
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: '#D4AF37', opacity: 0.7 }}>{result.bookName}</p>
              <p className="text-white text-sm leading-relaxed" style={{ fontFamily: "'Scheherazade New', serif", fontSize: '15px' }}>
                {isExpanded ? text : text.slice(0, 130) + (text.length > 130 ? '...' : '')}
              </p>
            </div>
          </div>
        </button>
        {isExpanded && (
          <div className="px-3 pb-3 flex gap-2">
            <button onClick={() => speak(text)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>🔊 استمع</button>
          </div>
        )}
      </div>
    );
  };

  if (selectedBook && tab === 'books') {
    return (
      <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
        <div className="px-4 py-4 sticky top-0 z-10 space-y-3" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedBook(null)} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
            <div className="flex-1">
              <h1 className="text-lg font-bold" style={{ color: '#D4AF37' }}>{bookName}</h1>
              <p className="text-gray-500 text-xs">
                {selectedSection !== null && sections[selectedSection] ? `كتاب: ${sections[selectedSection]} · ` : ''}
                {filteredHadiths.length} حديث
              </p>
            </div>
            {sectionEntries.length > 0 && (
              <button onClick={() => setShowChapters(c => !c)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: showChapters ? '#D4AF37' : 'rgba(212,175,55,0.15)', color: showChapters ? '#121212' : '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
                📑 الكتب
              </button>
            )}
          </div>

          {showChapters && sectionEntries.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border" style={{ border: '1px solid rgba(212,175,55,0.2)', background: '#1A1A1A' }}>
              <button onClick={() => { setSelectedSection(null); setShowChapters(false); setDisplayLimit(50); }}
                className="w-full text-right px-3 py-2 text-xs font-bold border-b"
                style={{ color: selectedSection === null ? '#D4AF37' : '#888', borderColor: 'rgba(212,175,55,0.1)', background: selectedSection === null ? 'rgba(212,175,55,0.1)' : 'transparent' }}>
                كل الأحاديث ({hadiths.length})
              </button>
              {sectionEntries.map(([num, name]) => {
                const count = hadiths.filter(h => h.book === +num).length;
                return (
                  <button key={num}
                    onClick={() => { setSelectedSection(+num); setShowChapters(false); setDisplayLimit(50); setExpandedId(null); }}
                    className="w-full text-right px-3 py-2 text-xs border-b transition-all"
                    style={{ borderColor: 'rgba(212,175,55,0.05)', color: selectedSection === +num ? '#D4AF37' : '#aaa', background: selectedSection === +num ? 'rgba(212,175,55,0.1)' : 'transparent' }}>
                    <span className="text-gray-600 ml-2">({count})</span> {name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <input type="text" placeholder="ابحث في أحاديث هذا الكتاب..." value={bookSearch}
              onChange={e => { setBookSearch(e.target.value); setExpandedId(null); setDisplayLimit(50); }}
              className="w-full px-4 py-2 rounded-xl text-sm outline-none pr-10"
              style={{ background: '#1E1E1E', color: 'white', border: '1px solid rgba(212,175,55,0.2)' }} />
            {bookSearch && (
              <button onClick={() => setBookSearch('')} className="absolute left-3 top-2.5 text-gray-500 text-sm">✕</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
            <p className="text-gray-400">جاري تحميل الأحاديث...</p>
          </div>
        ) : bookError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <p className="text-4xl">⚠️</p>
            <p className="text-orange-400 text-center text-sm">{bookError}</p>
            <button onClick={() => loadBook(selectedBook)} className="px-6 py-2 rounded-xl font-bold text-sm"
              style={{ background: '#D4AF37', color: '#121212' }}>إعادة المحاولة</button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {filteredHadiths.length === 0 ? (
              <p className="text-center text-gray-500 mt-12">لا توجد نتائج</p>
            ) : (
              <>
                {filteredHadiths.slice(0, displayLimit).map((hadith, i) => {
                  const text = getHadithText(hadith);
                  const isExpanded = expandedId === i;
                  return (
                    <div key={i} className="rounded-2xl overflow-hidden" style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.1)' }}>
                      <button onClick={() => setExpandedId(isExpanded ? null : i)} className="w-full p-4 text-right">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                            style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>{i + 1}</div>
                          <p className="text-white text-sm leading-relaxed flex-1"
                            style={{ fontFamily: "'Scheherazade New', serif", fontSize: '16px' }}>
                            {isExpanded ? text : text.slice(0, 130) + (text.length > 130 ? '...' : '')}
                          </p>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 flex gap-2">
                          <button onClick={() => speak(text)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>🔊 استمع</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredHadiths.length > displayLimit && (
                  <button onClick={() => setDisplayLimit(l => l + 100)}
                    className="w-full py-3 rounded-2xl text-sm font-bold"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                    تحميل المزيد ({filteredHadiths.length - displayLimit} متبقي)
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (selectedCategory && tab === 'topics') {
    return (
      <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
        <div className="px-4 py-4 sticky top-0 z-10 flex items-center gap-3" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
          <button onClick={() => setSelectedCategory(null)} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: '#D4AF37' }}>
              {selectedCat?.icon} {selectedCat?.name}
            </h1>
            <p className="text-gray-500 text-xs">{categoryResults.length} حديث</p>
          </div>
        </div>

        {loadingCategory ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
            <p className="text-gray-400">جاري البحث...</p>
          </div>
        ) : categoryResults.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
            <p className="text-4xl">📭</p>
            <p className="text-gray-400 text-center text-sm">
              لم تُحمَّل كتب الحديث بعد.<br/>ارجع للرئيسية لتحميل البيانات أولاً.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {categoryResults.map((r, i) => (
              <HadithCard key={`${r.bookId}-${r.idx}`} result={r} index={i} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ background: '#121212', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
      <div className="px-4 py-4 sticky top-0 z-10" style={{ background: '#121212', borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setPage('home')} className="text-2xl" style={{ color: '#D4AF37' }}>←</button>
          <h1 className="text-xl font-bold" style={{ color: '#D4AF37' }}>كتب الحديث</h1>
        </div>
        <TabBar />
      </div>

      {tab === 'books' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {HADITH_BOOKS.map((book) => {
            const cached = !!localStorage.getItem(`hadith_${book.id}`);
            return (
              <button key={book.id} onClick={() => loadBook(book.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-right transition-all active:scale-98"
                style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,0.15)' }}>
                <span className="text-2xl">📚</span>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: '#D4AF37' }}>{book.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: cached ? '#4CAF50' : '#666' }}>
                    {cached ? 'محفوظ محلياً ✅' : 'اضغط للتحميل'}
                  </p>
                </div>
                <span style={{ color: '#D4AF37' }}>›</span>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'topics' && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-gray-500 text-xs text-center mb-4">
            اختر موضوعاً للبحث في جميع كتب الحديث المحفوظة
          </p>
          <div className="grid grid-cols-2 gap-3">
            {HADITH_CATEGORIES.map(cat => (
              <button key={cat.id}
                onClick={() => handleCategorySelect(cat.id, cat.keywords)}
                className="p-4 rounded-2xl text-right transition-all active:scale-95"
                style={{ background: '#1E1E1E', border: `1px solid ${cat.color}33` }}>
                <span className="text-3xl block mb-2">{cat.icon}</span>
                <p className="font-bold text-sm" style={{ color: cat.color }}>{cat.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">{cat.keywords.slice(0, 3).join('، ')}...</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 space-y-2" style={{ borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
            <p className="text-gray-500 text-xs">البحث في جميع كتب الحديث المحفوظة محلياً</p>
            <div className="flex gap-2">
              <input type="text" placeholder="ابحث عن حديث..." value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                className="flex-1 px-4 py-2 rounded-xl text-sm outline-none"
                style={{ background: '#1E1E1E', color: 'white', border: '1px solid rgba(212,175,55,0.2)' }} />
              <button onClick={handleGlobalSearch}
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#D4AF37', color: '#121212' }}>بحث</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['الصلاة', 'الزكاة', 'الصيام', 'الإيمان', 'الأخلاق', 'الجنة'].map(kw => (
                <button key={kw} onClick={() => { setGlobalSearch(kw); setTimeout(handleGlobalSearch, 10); }}
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                  {kw}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {searching ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
                <p className="text-gray-400">جاري البحث...</p>
              </div>
            ) : searchResults.length === 0 && globalSearch ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <p className="text-4xl">🔍</p>
                <p className="text-gray-400 text-center text-sm">
                  لا توجد نتائج لـ "{globalSearch}"<br/>
                  <span className="text-gray-600">تأكد من تحميل كتب الحديث أولاً</span>
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <p className="text-4xl">🔍</p>
                <p className="text-gray-400 text-center text-sm">اكتب كلمة للبحث في جميع كتب الحديث</p>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-xs text-center">وُجد {searchResults.length} حديث</p>
                {searchResults.map((r, i) => (
                  <HadithCard key={`${r.bookId}-${r.idx}`} result={r} index={i} />
                ))}
                {searchResults.length >= 300 && (
                  <p className="text-center text-gray-600 text-xs pb-2">يُعرض أول 300 نتيجة. دقق البحث للحصول على نتائج أدق</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HadithScreen;
