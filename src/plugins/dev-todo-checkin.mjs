import fs from "node:fs/promises";
import path from "node:path";

/**
 * 只在 `astro dev` 下挂载的打卡接口：GET /api/todo-check/?id=<待办 id>&date=YYYY-MM-DD
 *
 * 作用是把日期追加到 `src/content/todos/<id>.md` 的 `checkins` 里，
 * 这样「今日打卡」在本地是真的写回仓库的；构建产物里没有这个接口，
 * 线上页面会自动退回浏览器本地存储。
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FRONTMATTER = /^---(\r?\n)([\s\S]*?)\r?\n---/;
const CONTENT_DIR = () => path.join(process.cwd(), "src", "content", "todos");

const pad = (value) => String(value).padStart(2, "0");

const localDateKey = () => {
	const now = new Date();
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * 把日期追加进 frontmatter 的 checkins，统一写成行内数组；
 * 除了这一行（或新增的这一行）之外，文件其它内容一个字节都不动。
 */
function appendCheckin(source, date) {
	const match = source.match(FRONTMATTER);
	if (!match) return { error: "no-frontmatter" };

	const eol = match[1];
	const front = match[2];

	// 保护一下：同一天最多写 20 次，避免脚本抽风把文件刷爆
	const MAX_PER_DAY = 20;
	const usedToday = (front.match(new RegExp(date, "g")) || []).length;
	if (usedToday >= MAX_PER_DAY) return { error: "daily-cap" };

	// 行内写法：checkins: [2026-10-15, 2026-10-16]
	const inline = front.match(/^checkins:[ \t]*\[([\s\S]*?)\][ \t]*$/m);
	if (inline) {
		const dates = inline[1]
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
		if (!dates.every((value) => DATE_PATTERN.test(value))) {
			return { error: "bad-date-format" };
		}
		// 一天可以多次打卡：同一天重复写日期就是多次
		const next = `checkins: [${[...dates, date].join(", ")}]`;
		return { text: source.replace(inline[0], () => next), added: true };
	}

	// 列表写法：
	// checkins:
	//   - 2026-10-15
	const block = front.match(/^checkins:[ \t]*\r?\n((?:[ \t]*-[^\r\n]*(?:\r?\n|$))+)/m);
	if (block) {
		const dates = block[1]
			.split(/\r?\n/)
			.map((line) => line.replace(/^[ \t]*-[ \t]*/, "").trim())
			.filter(Boolean);
		if (!dates.every((value) => DATE_PATTERN.test(value))) {
			return { error: "bad-date-format" };
		}
		const merged = [...dates, date];
		const trailing = /\r?\n$/.test(block[0]) ? eol : "";
		const next = `checkins: [${merged.join(", ")}]${trailing}`;
		return {
			text: source.replace(block[0], () => next),
			added: true,
		};
	}

	// 还没有 checkins 字段：在 frontmatter 末尾补一行
	const updatedFront = `${front}${eol}checkins: [${date}]`;
	const text = source.replace(match[0], () => `---${eol}${updatedFront}${eol}---`);
	return { text, added: true };
}

async function findTodoFile(id) {
	for (const ext of [".md", ".mdx"]) {
		const filePath = path.join(CONTENT_DIR(), `${id}${ext}`);
		try {
			const content = await fs.readFile(filePath, "utf8");
			return { filePath, content };
		} catch {
			// 试下一个扩展名
		}
	}
	return null;
}

const sendJson = (res, status, data) => {
	res.statusCode = status;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.end(JSON.stringify(data));
};

function createHandler() {
	return async (req, res, next) => {
		if (!req.url) return next();

		// 挂载点是 /api/todo-check，req.url 形如 "/?id=xxx"
		let url;
		try {
			url = new URL(req.url, "http://localhost");
		} catch {
			return sendJson(res, 400, { ok: false, reason: "bad-url" });
		}

		const id = (url.searchParams.get("id") || "").trim();
		if (!id || id.includes("..") || id.startsWith("/") || id.includes("\\")) {
			return sendJson(res, 400, { ok: false, reason: "bad-id" });
		}

		const requested = (url.searchParams.get("date") || "").trim();
		const date = DATE_PATTERN.test(requested) ? requested : localDateKey();

		try {
			const file = await findTodoFile(id);
			if (!file) return sendJson(res, 404, { ok: false, reason: "not-found" });

			const result = appendCheckin(file.content, date);
			if (result.error) {
				return sendJson(res, 400, { ok: false, reason: result.error });
			}
			if (result.added) {
				await fs.writeFile(file.filePath, result.text, "utf8");
			}
			return sendJson(res, 200, { ok: true, added: result.added, date });
		} catch (error) {
			return sendJson(res, 500, {
				ok: false,
				reason: "write-failed",
				message: String(error && error.message ? error.message : error),
			});
		}
	};
}

export function devTodoCheckin() {
	return {
		name: "dev-todo-checkin",
		hooks: {
			"astro:config:setup": ({ updateConfig }) => {
				updateConfig({
					vite: {
						plugins: [
							{
								name: "dev-todo-checkin-middleware",
								configureServer(server) {
									server.middlewares.use("/api/todo-check", createHandler());
								},
							},
						],
					},
				});
			},
		},
	};
}
