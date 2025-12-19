import { Resvg } from "@resvg/resvg-js";
import type { APIContext, InferGetStaticPropsType } from "astro";
import satori, { type SatoriOptions } from "satori";
import { html } from "satori-html";
import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";
// 引入项目自带的字体，确保 satori 能够运行
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
    html`<div tw="flex flex-col w-full h-full bg-[#FFF8EB] text-[#151515] items-center justify-center p-20" style="font-family: 'Roboto Mono';">
        <div tw="flex flex-col items-center">
            <h1 tw="text-7xl font-bold tracking-[0.05em] uppercase border-b-8 border-[#18F2B2] pb-4">
                ${siteConfig.title}
            </h1>
            <p tw="text-3xl mt-10 text-[#151515] opacity-60">
                ${siteConfig.description}
            </p>
        </div>
    </div>`;

export async function GET() {
    const svg = await satori(markup(), ogOptions);
    const pngBuffer = new Resvg(svg).render().asPng();
    
    return new Response(new Uint8Array(pngBuffer), {
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

type Props = InferGetStaticPropsType<typeof getStaticPaths>;