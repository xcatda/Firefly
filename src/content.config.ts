import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
		author: z.string().optional().default(""),
		sourceLink: z.string().optional().default(""),
		licenseName: z.string().optional().default(""),
		licenseUrl: z.string().optional().default(""),
		comment: z.boolean().optional().default(true),
		password: z.string().optional().default(""),
		passwordHint: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const specCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/spec" }),
	schema: z.object({}),
});

// 待办清单：一个待办 = 一个 markdown 文件，和写文章一样维护
const todosCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/todos" }),
	schema: z.object({
		title: z.string(),
		// 创建日期，用于排序（写 YYYY-MM-DD 即可）
		date: z.date().optional(),
		// 是否已完成：true 时页面上会显示为划掉状态
		done: z.boolean().optional().default(false),
		// 备注，显示在标题下方
		description: z.string().optional().default(""),

		/* 进度型待办：填了 progressTotal 才会显示进度条和「今日打卡」按钮 */
		// 起始进度（已经完成多少）
		progress: z.number().optional().default(0),
		// 总进度，不填就是普通待办
		progressTotal: z.number().optional(),
		// 每天打卡一次加多少，默认 1
		progressStep: z.number().optional().default(1),
		// 进度单位，比如「讲」「页」「天」
		progressUnit: z.string().optional().default(""),
	}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	todos: todosCollection,
};
