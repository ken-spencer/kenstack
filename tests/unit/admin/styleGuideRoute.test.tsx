import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToReadableStream } from "react-dom/server";

const { requireUser } = vi.hoisted(() => ({
  requireUser: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("@kenstack/auth/server/user", () => ({ requireUser }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@app/modules", () => ({ modules: {} }));
vi.mock("@kenstack/admin/List", () => ({ default: () => null }));
vi.mock("@kenstack/admin/Edit", () => ({ default: () => null }));

import { createAdminPage, generateMetadata } from "@kenstack/admin/AdminPage";

async function renderPage(admin: string[], context?: string | string[]) {
  const Page = createAdminPage();
  const errors: unknown[] = [];
  const stream = await renderToReadableStream(
    <Page
      params={Promise.resolve({ admin })}
      searchParams={Promise.resolve({ context })}
    />,
    {
      onError: (error) => {
        errors.push(error);
      },
    },
  );
  await stream.allReady;
  return { html: await new Response(stream).text(), errors };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("automatic admin style guide", () => {
  it("does not render the guide when admin authentication fails", async () => {
    vi.stubEnv("NODE_ENV", "development");
    requireUser.mockRejectedValueOnce(new Error("ADMIN_REQUIRED"));
    const result = await renderPage(["style-guide"]);

    expect(result.errors).toEqual([new Error("ADMIN_REQUIRED")]);
    expect(result.html).not.toContain("<iframe");
  });

  it.each([undefined, "base", "admin", "site", "invalid", ["admin", "site"]])(
    "renders an authenticated development preview for context %s",
    async (context) => {
      vi.stubEnv("NODE_ENV", "development");
      const result = await renderPage(["style-guide"], context);
      const selected =
        context === "admin" || context === "site" ? context : "base";

      expect(result.errors).toEqual([]);
      expect(requireUser).toHaveBeenCalledWith("admin");
      expect(result.html).toContain(`src="/style-guide/${selected}"`);
      expect(result.html).toContain("Style guide</h1>");
      expect(result.html).toContain('<nav aria-label="Style-guide context"');
      expect(result.html).not.toContain('role="tab');
      expect(result.html).not.toContain("aria-selected");
      expect(result.html).not.toContain("aria-controls");
      const currentLinks = (result.html.match(/<a\b[^>]*>/g) ?? []).filter(
        (link) => link.includes('aria-current="page"'),
      );
      expect(currentLinks).toHaveLength(1);
      expect(currentLinks[0]).toContain(
        `href="/admin/style-guide?context=${selected}"`,
      );
    },
  );

  it.each([
    ["production", ["style-guide"]],
    ["development", ["style-guide", "new"]],
    ["development", ["style-guide", "1"]],
    ["development", ["1", "style-guide"]],
  ])(
    "rejects %s route %j before authentication",
    async (environment, segments) => {
      vi.stubEnv("NODE_ENV", environment);
      const result = await renderPage(segments);

      expect(result.errors).toEqual([new Error("NOT_FOUND")]);
      expect(requireUser).not.toHaveBeenCalled();
      expect(result.html).not.toContain("<iframe");
    },
  );

  it("provides the style guide title and noindex metadata", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      await generateMetadata({
        params: Promise.resolve({ admin: ["style-guide"] }),
      }),
    ).toEqual({
      title: { absolute: "Style guide · Admin" },
      robots: { index: false, follow: false },
    });
  });
});
