// Isolated browser QA only: proxy a production preview and replace API calls with fixtures.
// Does not connect to the real backend or write any data.
const http = require("node:http");
const upstream = process.env.PREVIEW_ORIGIN || "http://127.0.0.1:3002";
const port = Number(process.env.FIXTURE_PORT || 3003);
const origin = "http://127.0.0.1:" + port;
const mails = [101, 102].map((id, i) => ({ messageUid: String(id), fromAddress: "sender@example.com",
  fromName: "性能验证 " + (i + 1), subject: "测试邮件 " + (i + 1), contentText: "邮件正文 " + (i + 1),
  contentHtml: null, receiveTime: "2026-11-03 10:00:00", isRead: false, hasAttachment: false }));
const events = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, title: "验证日程 " + (i + 1),
  startTime: "2026-11-0" + (i % 3 + 1) + " 09:00:00", endTime: "2026-11-05 18:00:00",
  isAllDay: 0, location: "测试地点", content: "仅浏览器验证，不保存" }));
const bill = { id: 1, category: "餐饮", type: 0, amount: 25, billDate: "2026-11-03", paymentMethod: 2,
  remark: "测试数据", createTime: "2026-11-03 10:00:00", updateTime: "2026-11-03 10:00:00" };
const summary = { startDate: "2026-11-01", endDate: "2026-11-03", income: 1000, expense: 25, balance: 975, billCount: 2 };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  if (url.pathname === "/__stop") { res.end("stopped"); server.close(); return; }
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    let data;
    const path = url.pathname;
    if (req.method === "POST" && /^\/api\/mails\/\d+\/read$/.test(path)) data = null;
    else if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
    else if (path === "/api/mails") data = mails;
    else if (/^\/api\/mails\/\d+$/.test(path)) {
      data = mails.find(m => path.endsWith("/" + m.messageUid));
      await new Promise(resolve => setTimeout(resolve, path.endsWith("101") ? 800 : 20));
    } else if (path === "/api/events/range") data = events;
    else if (path.startsWith("/api/holidays/")) data = [];
    else if (path === "/api/bills") data = { records: [bill], total: 1, size: 20, current: 1, pages: 1 };
    else if (path === "/api/bills/summary") data = summary;
    else if (path === "/api/bills/trend") data = [{ periodLabel: "2026-11-03", periodStart: "2026-11-03", periodEnd: "2026-11-03", income: 1000, expense: 25, billCount: 2 }];
    else if (path === "/api/bills/category-stat") data = [{ category: "餐饮", income: 0, expense: 25, expensePercent: 100, billCount: 1 }];
    else if (path === "/api/savings-goal") data = { name: "每月工资分配", salaryDay: 1, buckets: [{ name: "储蓄", percent: 70, saving: true }, { name: "日常开销", percent: 30, saving: false }] };
    else if (path === "/api/mails/account") data = null;
    else { res.writeHead(404); res.end(); return; }
    res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ code: 200, message: "fixture", data })); return;
  }
  try {
    const response = await fetch(upstream + req.url, { headers: { "accept-encoding": "identity" } });
    const contentType = response.headers.get("content-type") || "";
    let body = Buffer.from(await response.arrayBuffer());
    if (contentType.includes("javascript")) body = Buffer.from(body.toString().replaceAll("http://localhost:1001", origin));
    res.writeHead(response.status, { "content-type": contentType, "cache-control": "no-store" }); res.end(body);
  } catch { res.writeHead(502); res.end("Preview server unavailable"); }
});
server.listen(port, "127.0.0.1", () => console.log("Isolated fixture preview: " + origin));
