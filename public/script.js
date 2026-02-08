const list = document.getElementById("news-list");
const toTop = document.getElementById("toTop");
let currentPage = 1;
const perPage = 10;

/* =========================
   استخراج آخر موعد للتقديم
========================= */
function getDeadline(n) {
  if (n.deadline && typeof n.deadline === "string") return n.deadline.trim();
  if (n.deadline_text && typeof n.deadline_text === "string") return n.deadline_text.trim();
  if (n.description) {
    const cleanText = n.description
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\(adsbygoogle[\s\S]*?\);?/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const match = cleanText.match(
      /(آخر موعد للتقديم[:：]?\s*[^\n]+)|(التسجيل من\s*[^\n]+)|(حتى\s*\d{1,2}\s*\S+\s*\d{4})/i
    );
    if (match) return match[0];
  }
  return "غير محدد";
}


/* =========================
   اختيار الرابط الأصلي
========================= */
function getOriginalLink(n) {
  if (n.original_link) return n.original_link;
  if (n.source_link) return n.source_link;
  return n.link || "#"; // fallback
}

/* =========================
   تحميل الأخبار
========================= */
async function loadNews() {
  try {
    const res = await fetch("/api/news?limit=200");
    const data = await res.json();
    const items = data?.data?.items || [];
    list.innerHTML = "";

    if (!items.length) {
      list.innerHTML = "<p>لا توجد أخبار حاليًا</p>";
      return;
    }

    const totalPages = Math.ceil(items.length / perPage);
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    const pageItems = items
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(start, end);

    pageItems.forEach((n, index) => {
      const card = document.createElement("div");
      card.className = "card";

      const createdDate = new Date(n.created_at);
      const now = new Date();
      const diffDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      const newLabel =
        n.isNew && diffDays < 3
          ? "📢 <strong>مساعدة جديدة متاحة الآن</strong><br>"
          : "";

      const deadline = getDeadline(n);
      const finalLink = getOriginalLink(n);

      card.style.animation = `cardAppear 0.8s ease forwards`;
      card.style.animationDelay =`${index * 0.15}s`; // حركة متتابعة لكل بطاقة
const toTop = document.getElementById("toTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    toTop.classList.add("show");
  } else {
    toTop.classList.remove("show");
  }
});

toTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});
      card.innerHTML = `
        <h3 style="margin-bottom: 5px;">${n.title}</h3>
        ${newLabel}
        <p>${n.summary || ""}</p>
        <p>🕒 تم الإضافة: ${createdDate.toLocaleString("ar-PS")}</p>
        <p>⏰ <strong>آخر موعد للتقديم:</strong> ${deadline}</p>
        ${finalLink ? `<a href="${finalLink}" target="_blank" rel="noopener" style="display:inline-block; margin-top:5px;">🔗 الدخول من هنا</a>`: ""}`
      ;

      list.appendChild(card);
    });

    /* =========================
       Pagination
    ========================== */
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

/* =========================
   تشغيل
========================= */
loadNews();
setInterval(loadNews, 5 * 60 * 1000);

/* =========================
   زر الرجوع للأعلى
========================= */
window.addEventListener("scroll", () => {
  toTop.style.display = window.scrollY > 300 ? "block" : "none";

  const navbar = document.querySelector(".navbar");
  if (navbar) {
    window.scrollY > 50
      ? navbar.classList.add("shrink")
      : navbar.classList.remove("shrink");
  }
});
toTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });