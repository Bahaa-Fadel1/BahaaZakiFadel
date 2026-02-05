const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../data/news.json');
const URL = 'https://www.motqdmon.com/search/label/%D8%A7%D9%84%D9%85%D8%B3%D8%A7%D8%B9%D8%A7%D8%AA';

const scrapeNews = async () => {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    let existingNews = [];
    if (fs.existsSync(FILE_PATH)) {
      existingNews = JSON.parse(fs.readFileSync(FILE_PATH));
    }

    const newNews = [];

    $('h3.post-title').each((i, el) => {
      if (i >= 10) return; // أول 10 أخبار فقط
      const title = $(el).text().trim();
      const link = $(el).find('a').attr('href');
      const date = new Date().toISOString();

      // منع التكرار
      if (!existingNews.find(n => n.title === title)) {
        newNews.push({ title, link, date });
      }
    });

    const allNews = [...newNews, ...existingNews];
    fs.writeFileSync(FILE_PATH, JSON.stringify(allNews, null, 2));
    console.log(`✅ تم تحديث الأخبار (${newNews.length} جديد`);
  } catch (err) {
    console.log('⚠️ خطأ أثناء جلب الأخبار:', err.message);
  }
};

module.exports = scrapeNews;