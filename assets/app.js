function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPayload() {
  const node = document.querySelector("#feedPayload");
  if (!node) return { digest: {}, posts: {} };
  try {
    return JSON.parse(node.textContent || "{}");
  } catch {
    return { digest: {}, posts: {} };
  }
}

function postLookup(postsPayload) {
  const posts = postsPayload?.posts || [];
  return new Map(posts.map((post) => [String(post.id), post]));
}

function formatTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dateKey(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(value) {
  if (value === "all") return "ALL";
  if (value === "unknown") return "未知日期";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function enrichItems(payload) {
  const items = payload.digest?.digest?.items || [];
  const lookup = postLookup(payload.posts || {});
  const rows = [];

  for (const item of items) {
    const articleId = item.article_id || item.id || item.source_post_ids?.[0] || "";
    const post = articleId ? lookup.get(String(articleId)) : null;
    const url = item.article_url || post?.article_url || item.source_urls?.[0] || post?.url || "#";
    const createdAt = item.article_published_at || post?.article_published_at || post?.created_at || null;
    rows.push({
      ...item,
      postId: articleId,
      author: post?.article_author_name || post?.article_author_username || "",
      handle: post?.article_author_username ? `@${post.article_author_username}` : "",
      createdAt,
      dateKey: dateKey(createdAt),
      url,
    });
  }

  return rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function renderDateSelect(items, activeDate) {
  const target = document.querySelector("#timelineDateSelect");
  if (!target) return;
  const dates = ["all", ...new Set(items.map((item) => item.dateKey || "unknown"))];
  target.innerHTML = dates.map((date) =>
    `<option value="${escapeHtml(date)}"${date === activeDate ? " selected" : ""}>${escapeHtml(dateLabel(date))}</option>`
  ).join("");
}

function renderTimeline(items, activeDate = "all") {
  const target = document.querySelector("#timelineList");
  if (!target) return;
  const visibleItems = activeDate === "all" ? items : items.filter((item) => item.dateKey === activeDate);
  target.innerHTML = visibleItems.map((item, index) => {
    return `<article class="timeline-row" style="animation-delay:${Math.min(index * 50, 400)}ms">
      <time class="timeline-time">${formatTime(item.createdAt)}</time>
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-card">
        <div class="timeline-meta">
          <span>${escapeHtml(item.author)} ${escapeHtml(item.handle)}</span>
          <span class="timeline-pill">${escapeHtml(item.category || "其他")}</span>
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.summary)}</p>
        <div class="timeline-links"><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开长文</a></div>
      </div>
    </article>`;
  }).join("") || `<p class="empty-state">暂无时间线数据</p>`;
  target.scrollTop = 0;
}

function renderFeed(items) {
  const feed = document.querySelector("#feed");
  if (!feed) return;
  feed.innerHTML = items.map((item, index) => {
    const url = item.article_url || item.source_urls?.[0] || "#";
    const publishedAt = item.article_published_at ? formatTime(item.article_published_at) : "--:--";
    return `<article class="item" style="animation-delay:${Math.min(index * 55, 440)}ms">
      <div class="item-head">
        <h2>${String(index + 1).padStart(2, "0")} // ${escapeHtml(item.title)}</h2>
        <span class="category">${escapeHtml(item.category || "其他")}</span>
      </div>
      <p>${escapeHtml(item.summary)}</p>
      <div class="score">发布时间：${escapeHtml(publishedAt)}</div>
      <div class="links"><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">打开长文</a></div>
    </article>`;
  }).join("");
}

function boot() {
  const payload = getPayload();
  const timelineItems = enrichItems(payload);
  const digestItems = payload.digest?.digest?.items || [];
  let activeDate = "all";
  renderDateSelect(timelineItems, activeDate);
  renderTimeline(timelineItems, activeDate);
  renderFeed(digestItems);

  document.querySelector("#timelineDateSelect")?.addEventListener("change", (event) => {
    activeDate = event.target.value || "all";
    renderTimeline(timelineItems, activeDate);
  });
}

boot();
