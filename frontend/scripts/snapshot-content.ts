import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Snapshot = {
  snapshotDate: string;
  api: {
    branchCount: number;
    firstBranch: { name: string; address: string; region: string };
    firstProduct: { name: string; slug: string };
    firstCategory: { name: string };
  };
  web: {
    pageTitle: string;
    heroHeading: string;
    locationsHeading: string;
    aboutHeading: string;
    firstBlogTitle: string;
    firstBlogSlug: string;
  };
  order: {
    cartHeadingTemplate: string;
    addToCartConfirmation: string;
    viewCartButton: string;
    increaseQtyButton: string;
    addToCartButton: string;
    payAtCounterButton: string;
    deliveryButton: string;
    deliveryAddressLabel: string;
    orderPlacedHeading: string;
    trackOrderLink: string;
  };
};

const apiUrl = requireEnv("DEMO_API_URL").replace(/\/$/, "");
const webUrl = requireEnv("DEMO_WEB_URL").replace(/\/$/, "");
const fixturePath = path.join(
  process.cwd(),
  "e2e/fixtures/content.snapshot.json",
);

async function main() {
  const [branches, products, categories, home, locations, about, blog] =
    await Promise.all([
      getJson<unknown[]>("/branch"),
      getJson<unknown[]>("/products"),
      getJson<unknown[]>("/categories"),
      getHtml("/"),
      getHtml("/locations"),
      getHtml("/about"),
      getHtml("/blog"),
    ]);

  const firstBranch = asRecord(branches[0], "first branch");
  const firstProduct = asRecord(products[0], "first product");
  const firstCategory = asRecord(categories[0], "first category");
  const firstBlog = firstBlogPost(blog);

  await getHtml(`/blog/${firstBlog.slug}`);

  const snapshot: Snapshot = {
    snapshotDate: new Date().toISOString().slice(0, 10),
    api: {
      branchCount: branches.length,
      firstBranch: {
        name: stringField(firstBranch, "name"),
        address: stringField(firstBranch, "address"),
        region: optionalStringField(firstBranch, "region"),
      },
      firstProduct: {
        name: stringField(firstProduct, "name"),
        slug: stringField(firstProduct, "slug"),
      },
      firstCategory: { name: stringField(firstCategory, "name") },
    },
    web: {
      pageTitle: textFromTag(home, "title"),
      heroHeading: textFromTag(home, "h1"),
      locationsHeading: textFromTag(locations, "h1"),
      aboutHeading: textFromTag(about, "h1"),
      firstBlogTitle: firstBlog.title,
      firstBlogSlug: firstBlog.slug,
    },
    order: {
      cartHeadingTemplate: "{n} items, baked fresh",
      addToCartConfirmation: "Added to cart!",
      viewCartButton: "View Cart",
      increaseQtyButton: "Increase quantity",
      addToCartButton: "Add to Cart",
      payAtCounterButton: "Pay with Pay at counter",
      deliveryButton: "Delivery",
      deliveryAddressLabel: "Deliver to",
      orderPlacedHeading: "Order placed",
      trackOrderLink: "Track my order",
    },
  };

  await mkdir(path.dirname(fixturePath), { recursive: true });
  await printDiff(snapshot);
  await writeFile(fixturePath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${fixturePath}`);
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function getJson<T>(route: string): Promise<T> {
  const res = await fetch(`${apiUrl}${route}`);
  if (!res.ok) throw new Error(`${route} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function getHtml(route: string) {
  const res = await fetch(`${webUrl}${route}`);
  if (!res.ok) throw new Error(`${route} failed: ${res.status}`);
  return res.text();
}

function textFromTag(html: string, tag: string) {
  const match = html.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  );
  if (!match) throw new Error(`Missing <${tag}>`);
  return cleanText(match[1]);
}

function firstBlogPost(html: string) {
  const link = html.match(
    /href=["']\/blog\/([^"'#?]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
  );
  if (!link) throw new Error("Missing first blog link");
  return { slug: link[1], title: cleanText(link[2]) };
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown, label: string) {
  if (!value || typeof value !== "object") throw new Error(`Missing ${label}`);
  return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, field: string) {
  const value = record[field];
  if (typeof value !== "string")
    throw new Error(`Missing string field ${field}`);
  return value;
}

function optionalStringField(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return typeof value === "string" ? value : "";
}

async function printDiff(next: Snapshot) {
  try {
    const current = JSON.parse(await readFile(fixturePath, "utf8")) as Snapshot;
    const changes = diffKeys(current, next);
    console.log(
      changes.length ? `Changed: ${changes.join(", ")}` : "No fixture changes",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.log("Creating new content snapshot");
  }
}

function diffKeys(a: unknown, b: unknown, prefix = ""): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (!isObject(a) || !isObject(b)) return [prefix || "<root>"];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].flatMap((key) =>
    diffKeys(a[key], b[key], prefix ? `${prefix}.${key}` : key),
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
