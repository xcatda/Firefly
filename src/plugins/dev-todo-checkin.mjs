import fs from "node:fs/promises";
import path from "node:path";

/**
 * 只在 `astro dev` 下挂载的打卡接口：
 *
 *   GET /api/todo-check/?id=<待办 id>&entry=2026-10-20%2022:31        → 追加一次打卡
 *   GET /api/todo-check/?id=<待办 id>&entry=2026-10-20%2022:31&mode=undo → 撤销这次打卡
 *
 * 作用是把打卡记录写回 `src/content/todos/<id>.md` 的 `checkins` 里，
 * 这样「今日打卡 / 撤销」在本地是真的改仓库文件；构建产物里没有这个接口，
 * 线上页面会自动退回浏览器本地存储。
 */

const ENTRY_PATTERN = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/;
const FRONTMATTER = /^---(\r?\n)([\s\S]*?)\r?\n---/;
const MAX_PER_DAY = 20;
const CONTENT_DIR = () => path.join(process.cwd(), "src", "content", "todos");

const pad = (value) => String(value).padStart(2, "0");

const nowEntry = () => {
	const now = new Date();
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

/** 解析行内数组里的条目（支持带引号的 "2026-10-20 22:31"） */
function parseEntries(raw) {
	// 我们的条目里不会出现逗号，按逗号切就够；两边可能包着引号
	return raw
		.split(",")
		.map((part) =>
			part
				.trim()
				.replace(/^"(.*)"$/, "$1")
				.replace(/^'(.*)'$/, "$1")
				.trim(),
		)
		.filter(Boolean);
}

/** 写回时统一成行内数组，带时间的条目加引号（否则 YAML 会当成时间戳） */
const formatEntries = (entries) =>
	entries.map((value) => (value.includes(" ") ? `"${value}"` : value)).join(", ");

/**
 * 追加 / 撤销一条打卡记录，只动 frontmatter 里 checkins 那一行，
 * 文件其它内容一个字节都不改。
 */
function applyCheckin(source, { entry, mode }) {
	const match = source.match(FRONTMATTER);
	if (!match) return { error: "no-frontmatter" };

	const eol = match[1];
	const front = match[2];
	const day = entry.slice(0, 10);

	if (mode === "add") {
		const used = (front.match(new RegExp(day, "g")) || []).length;
		if (used >= MAX_PER_DAY) return { error: "daily-cap" };
	}

	// 行内写法：checkins: [2026-10-15, "2026-10-16 22:31"]
	const inline = front.match(/^checkins:[ \t]*\[([\s\S]*?)\][ \t]*$/m);
	if (inline) {
		const entries = parseEntries(inline[1]);
		if (!entries.every((value) => ENTRY_PATTERN.test(value))) {
			return { error: "bad-entry-format" };
		}

		let next;
		if (mode === "undo") {
			const index = entries.lastIndexOf(entry);
			if (index === -1) return { error: "not-found" };
			entries.splice(index, 1);
			next = `checkins: [${formatEntries(entries)}]`;
		} else {
			next = `checkins: [${formatEntries([...entries, entry])}]`;
		}
		return { text: source.replace(inline[0], () => next), changed: true };
	}

	// 列表写法：
	// checkins:
	//   - 2026-10-15
	const block = front.match(/^checkins:[ \t]*\r?\n((?:[ \t]*-[^\r\n]*(?:\r?\n|$))+)/m);
	if (block) {
		const entries = block[1]
			.split(/\r?\n/)
			.map((line) => line.replace(/^[ \t]*-[ \t]*/, "").trim().replace(/^["']|["']$/g, ""))
			.filter(Boolean);
		if (!entries.every((value) => ENTRY_PATTERN.test(value))) {
			return { error: "bad-entry-format" };
		}

		let merged = entries;
		if (mode === "undo") {
			const index = entries.lastIndexOf(entry);
			if (index === -1) return { error: "not-found" };
			merged = [...entries];
			merged.splice(index, 1);
		} else {
			merged = [...entries, entry];
		}

		const trailing = /\r?\n$/.test(block[0]) ? eol : "";
		const next = `checkins: [${formatEntries(merged)}]${trailing}`;
		return { text: source.replace(block[0], () => next), changed: true };
	}

	if (mode === "undo") return { error: "not-found" };

	// 还没有 checkins 字段：在 frontmatter 末尾补一行
	const updatedFront = `${front}${eol}checkins: [${formatEntries([entry])}]`;
	const text = source.replace(match[0], () => `---${eol}${updatedFront}${eol}---`);
	return { text, changed: true };
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

		const mode = url.searchParams.get("mode") === "undo" ? "undo" : "add";
		const id = (url.searchParams.get("id") || "").trim();
		if (!id || id.includes("..") || id.startsWith("/") || id.includes("\\")) {
			return sendJson(res, 400, { ok: false, reason: "bad-id" });
		}

		// 客户端传本地时间，服务端只在没传时兜底
		const requested = (url.searchParams.get("entry") || "").trim();
		const entry =
			mode === "add" && ENTRY_PATTERN.test(requested) ? requested : requested || nowEntry();
		if (!ENTRY_PATTERN.test(entry)) {
			return sendJson(res, 400, { ok: false, reason: "bad-entry" });
		}

		try {
			const file = await findTodoFile(id);
			if (!file) return sendJson(res, 404, { ok: false, reason: "not-found" });

			const result = applyCheckin(file.content, { entry, mode });
			if (result.error) {
				return sendJson(res, 400, { ok: false, reason: result.error });
			}
			if (result.changed) {
				await fs.writeFile(file.filePath, result.text, "utf8");
			}
			return sendJson(res, 200, { ok: true, mode, entry });
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
