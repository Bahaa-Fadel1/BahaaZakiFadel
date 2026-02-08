const express = require("express");
const Parser = require("rss-parser");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // ملفات الواجهة

const RSS_URL = "https://www.motqdmon.com/feeds/posts/default?alt=rss";
const parser = new Parser();

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "news.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

let newsData = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    newsData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    newsData = [];
  }
}

/* ======================================
   استخراج البيانات من صفحة الخبر
====================================== */
async function extractData(page, link) {
  try {
    await page.goto(link, { waitUntil: "domcontentloaded", timeout: 30000 });

    const result = await page.evaluate(() => {
      // جمع النصوص من الفقرات
      const paragraphs = Array.from(document.querySelectorAll("article p, article div, main p, main div"));
      let text = paragraphs.map(p => p.innerText).join(" ").replace(/\s+/g, " ").trim();

      // تجاهل أي فقرة فيها كلمة "المتقدمون" أو "اكتشف المزيد"
      text = text.split(/[.؟!]/).filter(s => {
        const lower = s.toLowerCase();
        return !lower.includes("المتقدمون") && !lower.includes("اكتشف") && !lower.includes("المزيد");
      }).join(". ");

      // ===== ملخص الخبر =====
      const sentences = text.split(/[.؟!]/).map(s => s.trim()).filter(s => s.length > 0);
      const summary = sentences.slice(0, 2).join(". ") + (sentences.length > 2 ? "..." : "");

      // ===== الغرض من الوظيفة =====
      let purpose = "";
      const purposeMatch = text.match(/الغرض من الوظيفة[:\-]?\s*(.+?)(?:المهام|المتطلبات|$)/i);
      if (purposeMatch && purposeMatch[1]) purpose = purposeMatch[1].trim();

      // ===== المتطلبات =====
      let requirements = "";
      const reqMatch = text.match(/(المؤهلات|المتطلبات|الشروط)[:\-]?\s*(.+?)(?:\.|$)/i);
      if (reqMatch && reqMatch[2]) requirements = reqMatch[2].trim();

    // ===== آخر موعد =====
let deadline = null;

// يوم-شهر-سنة أو يوم/شهر/سنة أو يوم شهر سنة (بالإنجليزي)
const deadlineRegex = /(آخر موعد للتقديم|ينتهي التسجيل|آخر موعد|الموعد النهائي للتقديم|في موعد اقصاه)[:\-]?\s*(\d{1,2}\s*[-\/]?\s*(?:[A-Za-z]{3,9}|\d{1,2})\s*[-\/]?\s*\d{2,4})/i;

const match = text.match(deadlineRegex);
if (match && match[2]) {
  deadline = match[2].trim(); // فقط التاريخ بدون أي نصوص بعده
}
      // ===== استخراج الرابط الأصلي =====
      let originalLink = null;
      const anchors = Array.from(document.querySelectorAll("article a"));
      for (let i = anchors.length - 1; i >= 0; i--) {
        const a = anchors[i];
        const href = a.href || "";
        const txt = (a.innerText || "").trim();

        if (
          href &&
          !href.includes("motqdmon.com") &&
          !txt.includes("اكتشف") &&
          !txt.includes("المزيد") &&
          !txt.includes("المتقدمون") &&
          (txt.includes("تقديم") || txt.includes("تسجيل") || txt.includes("اضغط") || txt.includes("تحديث البيانات"))
        ) {
          originalLink = href;
          break;
        }
      }

      return { summary, purpose, requirements, deadline, originalLink };
    });

    return result;

  } catch (err) {
    console.log("⚠️ فشل استخراج البيانات:", err.message);
    return { summary: "", purpose: "", requirements: "", deadline: null, originalLink: null };
  }
}

/* ======================================
   جلب الأخبار من RSS + معالجة الصفحة
====================================== */
async function scrapeNews() {
  console.log("🔍 بدأ تنفيذ scrapeNews");
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    const feed = await parser.parseURL(RSS_URL);
    let added = 0;

    for (const item of feed.items.slice(0, 20)) {
      const title = item.title?.trim();
      const pageLink = item.link?.trim();
      const created_at = item.pubDate ? new Date(item.pubDate) : new Date();

      if (!title || !pageLink) continue;
      if (newsData.some(n => n.title === title)) continue;

      const { summary, purpose, requirements, deadline, originalLink } = await extractData(page, pageLink);

      if (!originalLink) {
        newsData.push({
          title,
          link: null,
          created_at,
          summary,
          purpose,
          requirements,
          deadline,
          message: "لا يوجد رابط تقديم أو تحديث بيانات",
          isNew: true
        });
        console.log("⚠️ لا يوجد رابط تقديم:", title);
        continue;
      }

      newsData.push({
        title,
        link: originalLink,
        created_at,
        summary,
        purpose,
        requirements,
        deadline,
        isNew: true
      });

      added++;
      console.log("✔️ أُضيف:", title);
    }

    newsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    fs.writeFileSync(DATA_FILE, JSON.stringify(newsData, null, 2));
    console.log(`✅ تم حفظ ${added} خبر جديد`);

  } catch (err) {
    console.error("❌ خطأ عند جلب الأخبار:", err.message);
  } finally {
    if (browser) await browser.close();
  }
}

// أول تحميل
scrapeNews();

// تحديث تلقائي كل 10 دقائق
setInterval(scrapeNews, 10 * 60 * 1000);

/* ======================================
   API
====================================== */
app.get("/api/news", (req, res) => {
  res.json({ success: true, data: { items: newsData } });
});

app.listen(PORT, () =>
  console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`)
);