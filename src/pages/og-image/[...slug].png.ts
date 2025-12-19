import { Resvg } from "@resvg/resvg-js";
import satori, { type SatoriOptions } from "satori";
import { html } from "satori-html";
import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";
// 使用项目内置字体
import RobotoMonoBold from "@/assets/roboto-mono-700.ttf";

const ogOptions: SatoriOptions = {
	fonts: [
		{
			data: Buffer.from(RobotoMonoBold),
			name: "Roboto Mono",
			style: "normal",
			weight: 700,
		},
	],
	height: 630,
	width: 1200,
};

const markup = () =>
	html`<div tw="flex flex-col w-full h-full bg-[#1d1f21] text-white items-center justify-center p-20" style="font-family: 'Roboto Mono';">
		<div tw="flex flex-col items-center w-full">
			<p tw="text-4xl mb-8 text-[#c9cacc] opacity-90 tracking-wide text-center">
				${siteConfig.description}
			</p>
			<div tw="flex w-1/3 h-[4px] bg-[#8953d1] mb-10"></div>
			<h1 tw="text-7xl font-bold tracking-[0.1em] uppercase text-center">
				${siteConfig.title}
			</h1>
		</div>
	</div>`;

export async function GET() {
	const svg = await satori(markup(), ogOptions);
	const pngBuffer = new Resvg(svg).render().asPng();
	const png = new Uint8Array(pngBuffer);

	return new Response(png, {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/png",
		},
	});
}

export async function getStaticPaths() {
	const posts = await getAllPosts();
	return posts
		.filter(({ data }) => !data.ogImage)
		.map((post) => ({
			params: { slug: post.id },
			props: {
				title: post.data.title,
			},
		}));
}