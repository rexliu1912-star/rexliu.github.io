/**
 * Animation utilities for Rex Liu's website
 * Five animation effects:
 * 1. Text reveal animation (Hero section)
 * 2. Post card hover lift
 * 3. Scroll-triggered fade-in
 * 4. Link underline animation
 * 5. Dark mode transition
 */

/**
 * 1. Initialize text reveal animation for Hero section
 * Staggered character/word reveal effect
 */
export function initTextReveal() {
	const heroTitle = document.querySelector('.hero-reveal-text');
	const heroSubtitle = document.querySelector('.hero-reveal-subtitle');
	
	if (heroTitle) {
		// Wrap each character in a span for staggered animation
		const text = heroTitle.textContent || '';
		heroTitle.innerHTML = text
			.split('')
			.map((char, i) => 
				char === ' ' 
					? ' ' 
					: `<span class="char-reveal" style="--char-index: ${i}">${char}</span>`
			)
			.join('');
		
		// Trigger animation after a short delay
		setTimeout(() => {
			heroTitle.classList.add('revealed');
		}, 100);
	}
	
	if (heroSubtitle) {
		// Split by words for subtitle
		const text = heroSubtitle.innerHTML || '';
		// Handle HTML tags properly
		const wrapper = document.createElement('div');
		wrapper.innerHTML = text;
		
		const processNode = (node: Node, index: { value: number }): string => {
			if (node.nodeType === Node.TEXT_NODE) {
				return node.textContent
					?.split(/(\s+)/)
					.map((part) => {
						if (part.trim() === '') return part;
						const delay = index.value++ * 0.03;
						return `<span class="word-reveal" style="--word-index: ${delay.toFixed(3)}">${part}</span>`;
					})
					.join('') || '';
			}
			if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				const children = Array.from(el.childNodes)
					.map((child) => processNode(child, index))
					.join('');
				return `<${el.tagName.toLowerCase()}${Array.from(el.attributes)
					.map((a) => ` ${a.name}="${a.value}"`)
					.join('')}>${children}</${el.tagName.toLowerCase()}>`;
			}
			return '';
		};
		
		const index = { value: 0 };
		heroSubtitle.innerHTML = Array.from(wrapper.childNodes)
			.map((node) => processNode(node, index))
			.join('');
		
		setTimeout(() => {
			heroSubtitle.classList.add('revealed');
		}, 400);
	}
}

/**
 * 2. Initialize card hover effects
 * Lift and shadow on hover with smooth transition
 */
export function initCardHover() {
	const cards = document.querySelectorAll('.post-card-hover');
	
	cards.forEach((card) => {
		const cardEl = card as HTMLElement;
		
		cardEl.addEventListener('mouseenter', () => {
			cardEl.style.transform = 'translateY(-4px)';
			cardEl.style.boxShadow = '0 12px 40px -12px rgba(137, 83, 209, 0.25)';
		});
		
		cardEl.addEventListener('mouseleave', () => {
			cardEl.style.transform = 'translateY(0)';
			cardEl.style.boxShadow = '';
		});
	});
}

/**
 * 3. Initialize scroll animations
 * Using Intersection Observer for fade-in effects
 */
export function initScrollAnimations() {
	// Check browser support
	if (!("IntersectionObserver" in window)) {
		// Fallback: show all elements immediately
		document.querySelectorAll(".fade-in-up, .fade-in, .stagger-fade").forEach((el) => {
			el.classList.add("visible");
		});
		return;
	}

	// Create observer with stagger support
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const el = entry.target as HTMLElement;
					const delay = el.style.getPropertyValue('--delay') || '0ms';
					
					// Apply delay if specified
					setTimeout(() => {
						el.classList.add("visible");
					}, parseInt(delay));
					
					observer.unobserve(el);
				}
			});
		},
		{
			threshold: 0.15,
			rootMargin: "0px 0px -30px 0px",
		},
	);

	// Observe all target elements
	document.querySelectorAll(".fade-in-up, .fade-in, .stagger-fade").forEach((el) => {
		observer.observe(el);
	});
}

/**
 * 4. Initialize link underline animations
 * Purple underline that expands from left on hover
 */
export function initLinkUnderline() {
	// This is handled via CSS mostly, but we can add dynamic elements here if needed
	const animatedLinks = document.querySelectorAll('.animated-link');
	
	animatedLinks.forEach((link) => {
		const linkEl = link as HTMLElement;
		
		// Ensure the link has proper positioning for pseudo-element
		if (getComputedStyle(linkEl).position === 'static') {
			linkEl.style.position = 'relative';
		}
	});
}

/**
 * 5. Initialize smooth transitions for theme changes
 * Dark mode transition handled via CSS, this ensures JS-triggered changes are smooth
 */
export function initThemeTransitions() {
	const html = document.documentElement;
	
	// Listen for theme changes
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.attributeName === 'data-theme') {
				// Add transition class during theme change
				html.classList.add('theme-transitioning');
				
				// Remove after transition completes
				setTimeout(() => {
					html.classList.remove('theme-transitioning');
				}, 500);
			}
		});
	});
	
	observer.observe(html, { attributes: true });
}

/**
 * Initialize mouse glow effect for cards
 * Subtle spotlight following cursor
 */
export function initMouseGlow() {
	// Only on desktop devices
	const hasPointer = window.matchMedia("(pointer: fine)").matches;
	if (!hasPointer) return;

	const cards = document.querySelectorAll(".glow-card");

	cards.forEach((card) => {
		const cardElement = card as HTMLElement;

		cardElement.addEventListener("mousemove", (e: MouseEvent) => {
			const rect = cardElement.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			cardElement.style.setProperty("--mouse-x", `${x}px`);
			cardElement.style.setProperty("--mouse-y", `${y}px`);
		});

		cardElement.addEventListener("mouseleave", () => {
			cardElement.style.setProperty("--mouse-x", "-999px");
			cardElement.style.setProperty("--mouse-y", "-999px");
		});
	});
}

/**
 * Initialize all animations
 * Call this on page load and after view transitions
 */
export function initAllAnimations() {
	initTextReveal();
	initCardHover();
	initScrollAnimations();
	initLinkUnderline();
	initThemeTransitions();
	initMouseGlow();
}
