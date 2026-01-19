/**
 * 初始化滚动动画
 * 使用 Intersection Observer 监听元素进入视口，触发淡入上浮动画
 */
export function initScrollAnimations() {
	// 检查浏览器支持
	if (!("IntersectionObserver" in window)) {
		// 降级：直接显示所有元素
		document.querySelectorAll(".fade-in-up, .fade-in").forEach((el) => {
			el.classList.add("visible");
		});
		return;
	}

	// 创建观察器
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add("visible");
					observer.unobserve(entry.target); // 只触发一次
				}
			});
		},
		{
			threshold: 0.2, // 元素 20% 可见时触发
			rootMargin: "0px 0px -50px 0px", // 提前一点触发
		},
	);

	// 观察所有目标元素
	document.querySelectorAll(".fade-in-up, .fade-in").forEach((el) => {
		observer.observe(el);
	});
}

/**
 * 初始化鼠标跟随光晕效果
 * 为指定元素添加微妙的鼠标跟随高光，类似 Apple 官网效果
 */
export function initMouseGlow() {
	// 只在桌面端启用（检测是否有精确指针设备）
	const hasPointer = window.matchMedia("(pointer: fine)").matches;
	if (!hasPointer) return;

	const cards = document.querySelectorAll(".glow-card");

	cards.forEach((card) => {
		const cardElement = card as HTMLElement;

		cardElement.addEventListener("mousemove", (e: MouseEvent) => {
			const rect = cardElement.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			// 使用 CSS 变量传递鼠标位置
			cardElement.style.setProperty("--mouse-x", `${x}px`);
			cardElement.style.setProperty("--mouse-y", `${y}px`);
		});

		cardElement.addEventListener("mouseleave", () => {
			// 鼠标离开时清除位置
			cardElement.style.setProperty("--mouse-x", "-999px");
			cardElement.style.setProperty("--mouse-y", "-999px");
		});
	});
}
