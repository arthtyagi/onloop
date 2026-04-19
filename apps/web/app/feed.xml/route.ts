import { Podcast } from "podcast";
import { getPublishedEpisodes } from "@/lib/db/onloop-runs";
import {
  PODCAST_AUTHOR,
  PODCAST_CATEGORY,
  PODCAST_DESCRIPTION,
  PODCAST_LANGUAGE,
  PODCAST_OWNER_NAME,
  PODCAST_TITLE,
} from "@/lib/onloop/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBaseUrl(): string {
  const env = process.env.ONLOOP_DOMAIN;
  if (env) {
    return env.startsWith("http") ? env : `https://${env}`;
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) {
    return `https://${vercel}`;
  }
  return "https://onloop.work";
}

export async function GET(): Promise<Response> {
  const episodes = await getPublishedEpisodes(50);
  const baseUrl = getBaseUrl();
  const ownerEmail = process.env.ONLOOP_FROM_ADDRESS ?? "hello@onloop.work";
  const coverImageUrl = process.env.COVER_IMAGE_URL ?? `${baseUrl}/cover.jpg`;

  const feed = new Podcast({
    title: PODCAST_TITLE,
    description: PODCAST_DESCRIPTION,
    feedUrl: `${baseUrl}/feed.xml`,
    siteUrl: baseUrl,
    imageUrl: coverImageUrl,
    author: PODCAST_AUTHOR,
    language: PODCAST_LANGUAGE,
    copyright: `© ${new Date().getFullYear()} onloop`,
    itunesAuthor: PODCAST_AUTHOR,
    itunesExplicit: false,
    itunesOwner: { name: PODCAST_OWNER_NAME, email: ownerEmail },
    itunesCategory: [{ text: PODCAST_CATEGORY }],
    itunesImage: coverImageUrl,
    itunesType: "episodic",
  });

  for (const ep of episodes) {
    feed.addItem({
      title: ep.title,
      description: ep.description,
      url: ep.mp3Url,
      guid: ep.guid,
      date: ep.pubDate,
      enclosure: {
        url: ep.mp3Url,
        size: ep.lengthBytes,
        type: "audio/mpeg",
      },
      itunesAuthor: PODCAST_AUTHOR,
      itunesExplicit: false,
      itunesDuration: ep.durationSec,
      itunesImage: coverImageUrl,
    });
  }

  const xml = feed.buildXml({ indent: "  " });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}
