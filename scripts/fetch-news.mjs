import { mkdir, writeFile } from 'node:fs/promises';

const feeds = [
  { url: 'https://metalinjection.net/feed', source: 'Metal Injection', category: 'metal' },
  { url: 'https://blabbermouth.net/feed', source: 'Blabbermouth', category: 'metal' },
  { url: 'https://news.google.com/rss/search?q=' + encodeURIComponent('아마추어 밴드 공연 모집 OR 밴드 경연대회 모집') + '&hl=ko&gl=KR&ceid=KR:ko', source: 'Google News · 공연 모집', category: 'opportunity' },
  { url: 'https://news.google.com/rss/search?q=' + encodeURIComponent('인디밴드 공연 참가 모집 OR 직장인 밴드 페스티벌 모집') + '&hl=ko&gl=KR&ceid=KR:ko', source: 'Google News · 밴드 공고', category: 'opportunity' },
];

function decode(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function tag(item, name) {
  return decode(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '');
}

function parse(xml, feed) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => {
    const body = match[1];
    const title = tag(body, 'title');
    const link = tag(body, 'link') || tag(body, 'guid');
    const rawDate = tag(body, 'pubDate') || tag(body, 'dc:date');
    return { id: Buffer.from(`${feed.source}:${title}`).toString('base64url').slice(0, 24), title, url: link, source: feed.source, category: feed.category, publishedAt: Number.isNaN(Date.parse(rawDate)) ? null : new Date(rawDate).toISOString() };
  }).filter((item) => item.title && /^https?:\/\//.test(item.url));
}

const settled = await Promise.allSettled(feeds.map(async (feed) => {
  const response = await fetch(feed.url, { headers: { 'user-agent': 'HALBI-METAL-NewsBoard/1.0 (+https://github.com/k710922-a11y/halbimetal-platform)' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${feed.source}: HTTP ${response.status}`);
  return parse(await response.text(), feed);
}));

const errors = settled.flatMap((result, index) => result.status === 'rejected' ? [`${feeds[index].source}: ${result.reason.message}`] : []);
const unique = new Map();
settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []).forEach((item) => { if (!unique.has(item.url) && ![...unique.values()].some((existing) => existing.title === item.title)) unique.set(item.url, item); });
const items = [...unique.values()].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
const limited = ['metal', 'opportunity'].flatMap((category) => items.filter((item) => item.category === category).slice(0, 20));
await mkdir('public/data', { recursive: true });
await writeFile('public/data/metal-news.json', JSON.stringify({ generatedAt: new Date().toISOString(), items: limited, errors }, null, 2) + '\n');
console.log(`Saved ${limited.length} items. ${errors.length} feed error(s).`);
