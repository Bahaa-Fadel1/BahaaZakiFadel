const express = require("express");
const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 10000;
const RSS_URL = "https://www.motqdmon.com/feeds/posts/default?alt=rss";
const parser = new Parser({ timeout: 30000, headers: { "User-Agent": "Mozilla/5.0" } });

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "news.json");

// إنشاء مجلد البيانات إذا مش موجود
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// تحميل الأخبار من الملف لو موجود
let newsData = [];
if (fs.existsSync(DATA_FILE)) {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  try { newsData = JSON.parse(raw); } catch (err) { newsData = []; }
}

// Middleware لعرض الملفات الثابتة
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// جلب الأخبار الجديدة من RSS
async function scrapeNews() {
  console.log("🔍 جلب الأخبار...");
  try {
    const feed = await parser.parseURL(RSS_URL);
    let added = 0;

    feed.items.forEach(item => {
      const title = item.title?.trim();
      const link = item.link?.trim();
      const created_at = item.pubDate ? new Date(item.pubDate) : new Date();

      if (!title || !link) return;

      // إضافة فقط إذا لم تكن موجودة
      if (!newsData.some(n => n.title === title)) {
        // ضع علامة "مساعدة جديدة" فقط للأخبار الجديدة
        newsData.push({ title, link, created_at, isNew: true });
        added++;
      }
    });

    // ترتيب الأخبار من الأحدث للأقدم
    newsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // حفظ الأخبار في الملف
    fs.writeFileSync(DATA_FILE, JSON.stringify(newsData, null, 2));

    console.log(`✅ تم فحص ${feed.items.length} خبر – أضيف ${added} جديد`);
  } catch (err) {
    console.error("⚠️ خطأ أثناء جلب الأخبار:", err.message);
  }
}

// تحديث الأخبار كل 10 دقائق تلقائيًا
scrapeNews();
setInterval(scrapeNews, 10 * 60 * 1000);

// API لعرض الأخبار
app.get("/api/news", (req, res) => {
  const limit = parseInt(req.query.limit) || 1000;
  res.json({
    success: true,
    message: "News list",
    data: { items: newsData.slice(0, limit) }
  });
});

// بدء السيرفر
app.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/news`);
});