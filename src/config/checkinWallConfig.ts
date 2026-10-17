import type { CheckinWallConfig } from "../types/config";

/**
 * 首页写作打卡墙配置
 *
 * 类似 GitHub 贡献图的「打卡墙」：一格代表一天，颜色越深代表当天发布的文章越多。
 * 数据直接来自站内文章的发布日期，无需任何外部接口。
 *
 * 外观相关：卡片纵向边距、标题图标等由组件内部样式控制；
 * 配色使用主题色（--primary）自动适配亮/暗色模式与主题色相。
 */
export const checkinWallConfig: CheckinWallConfig = {
	// 是否在首页顶部显示打卡墙
	enable: true,

	// 显示的周数（热力图列数），53 列约等于一年，可改为 26 表示只看最近半年
	weeks: 53,

	// 卡片标题与副标题，留空则使用 i18n 文案
	title: "",
	subtitle: "",

	// 是否显示「文章 / 打卡天数 / 最长连续」统计
	showStats: true,

	// 是否显示「少 → 多」色阶图例
	showLegend: true,

	// 格子边长与间距（px），调大可让格子更显眼，调小可让一年更紧凑
	cellSize: 11,
	cellGap: 3,

	// 是否把文章的「最近更新」日期也算作一次打卡（默认只统计发布日期）
	countUpdated: false,
};
