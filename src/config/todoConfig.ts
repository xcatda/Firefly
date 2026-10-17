import type { TodoConfig } from "../types/config";

/**
 * 待办清单页面配置
 *
 * 待办内容放在 src/content/todos/ 下，一个待办 = 一个 markdown 文件，
 * 和写文章一样：新建/编辑 md → 重新构建。
 *
 * 也可以执行 `pnpm new-todo "买咖啡"` 快速新建一条。
 */
export const todoConfig: TodoConfig = {
	// 是否启用待办页（顶部「我的 → 待办」）
	enable: true,

	// 页面标题与副标题，留空则使用 i18n 文案
	title: "",
	description: "",

	// 是否显示「已完成 x / y」进度条
	showProgress: true,

	// 页面底部「打卡记录」小墙显示多少周（26 约等于半年）
	heatmapWeeks: 26,
};
