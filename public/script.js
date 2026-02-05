const list = document.getElementById("news-list");
const toTop = document.getElementById("toTop");
let currentPage = 1;
const perPage = 10; // كل صفحة 10 أخبار

async function loadNews() {
  try {
    const res = await fetch("/api/news?limit=200");
    const data = await res.json();
    const items = data?.data?.items || [];
    list.innerHTML = "";

    if (items.length === 0) {
      list.innerHTML = "<p>لا توجد أخبار حاليًا</p>";
      return;
    }

    const displayedTitles = new Set();

    // حساب الصفحات
    const totalPages = Math.ceil(items.length / perPage);
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageItems = items.slice(start, end);

    pageItems
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .forEach(n => {
        if (displayedTitles.has(n.title)) return;
        displayedTitles.add(n.title);

        const card = document.createElement("div");
        card.className = "card";

        // حساب الفرق بالأيام
        const createdDate = new Date(n.created_at);
        const now = new Date();
        const diffDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

        // تظهر "مساعدة جديدة" فقط إذا الفرق أقل من 3 أيام
        const newLabel = (n.isNew && diffDays < 3) ? "📢 مساعدة جديدة متاحة الآن<br>" : "";

        card.innerHTML = 
         `<h3>${n.title}</h3>
          ${newLabel}
          🕒 ${createdDate.toLocaleString("ar-PS")}<br>
          <a href="${n.link}" target="_blank">🔗  التسجيل من هنا</a>`
        ;

        list.appendChild(card);

        // إزالة علامة isNew بعد 3 أيام
        if (diffDays >= 3) n.isNew = false;
      });

    // إضافة أزرار الصفحات
    const pagination = document.createElement("div");
    pagination.className = "pagination";
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentPage ? "active" : "";
      btn.onclick = () => {
        currentPage = i;
        loadNews();
      };
      pagination.appendChild(btn);
    }
    list.appendChild(pagination);

  } catch (err) {
    console.error(err);
    list.innerHTML = "<p>⚠️ فشل تحميل الأخبار</p>";
  }
}

// أول تحميل
loadNews();

// تحديث تلقائي كل 5 دقائق
setInterval(loadNews, 5 * 60 * 1000);

// زر العودة للأعلى
window.addEventListener("scroll", () => {
  toTop.style.display = window.scrollY > 300 ? "block" : "none";
});

toTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

// تصغير الشريط عند التمرير
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 50) navbar.classList.add("shrink");
  else navbar.classList.remove("shrink");
});