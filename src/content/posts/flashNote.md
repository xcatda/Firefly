---
title: 连接Fastboot弹出，提示press any key reboot。       
published: 2026-09-9
description: '刷机注意事项：用USB2.0'
image: './images/cycling.jpg'
tags: [刷机]
category: '刷机'
draft: false 
lang: ''
---
刷机使用USB2.0！！！

3.0容易出问题

![img](https://i-blog.csdnimg.cn/blog_migrate/486b2a44bd5b5036b3097da68a9148c4.jpeg)



解决方法：

- （推荐）使用扩展坞

- win10系统 连接的USB2.0接口，刷机成功。

​       下面代码用txt编辑保存，扩展名改成bat，右键管理员权限运行，完美解决fastboot掉的情况。

```
@echo off
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\usbflags\18D1D00D0100" /v "osvc" /t REG_BINARY /d "0000" /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\usbflags\18D1D00D0100" /v "SkipContainerIdQuery" /t REG_BINARY /d "01000000" /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\usbflags\18D1D00D0100" /v "SkipBOSDescriptorQuery" /t REG_BINARY /d "01000000" /f


pause
```




参考文献

[进入fastboot模式后，一连接刷机助手就变成press any key to shutdown-CSDN博客](https://blog.csdn.net/gmaaa123/article/details/102882838)