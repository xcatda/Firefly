---
title: C错误合集
published: 2026-09-28
description: '记录了学习c语言中遇到的错误'
image: './images/C_Error/cover.png'
tags: [学习]
category: '学习'
draft: false 
lang: ''
---
# C错误合集



## 1.没有阅读题目要求

题目要求仅152，而我使用了scanf，导致A没有输入，最后A为内存中垃圾值，输出错误

改正：int A = 152；
![](./images/C_Error/error1.png)