import { ArrowRight, LogOut, Plus, User } from "lucide-react";
import { twMerge } from "tailwind-merge";

import Button from "@kenstack/components/Button";
import { LinkButton } from "@kenstack/components/LinkButton";

export type StyleGuideContext = "base" | "admin" | "site";

const contextLabels = {
  base: "Kenstack base",
  admin: "Admin",
  site: "Site",
} satisfies Record<StyleGuideContext, string>;

export default function StyleGuide({
  context,
}: {
  context: StyleGuideContext;
}) {
  return (
    <main
      className={twMerge(
        "style-guide",
        context === "base" && "style-guide-theme-base",
        context === "site" && "site-theme",
      )}
      data-admin-theme={context === "admin" ? "dark" : undefined}
    >
      <header className="style-guide-header">
        <h1>{contextLabels[context]} styles</h1>
        <p>
          These examples render the real Kenstack components and shared theme
          classes in the selected host context.
        </p>
      </header>

      <section className="style-guide-section" id="buttons">
        <header>
          <h2>Buttons</h2>
          <p>
            <code>@kenstack/components/button.css</code>
          </p>
        </header>

        <div className="style-guide-group">
          <h3>Variants</h3>
          <div className="style-guide-row">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>

        <div className="style-guide-group">
          <h3>Sizes</h3>
          <div className="style-guide-row">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        <div className="style-guide-group">
          <h3>Icons and states</h3>
          <div className="style-guide-row">
            <Button icon={ArrowRight} iconPosition="end" variant="outline">
              Continue
            </Button>
            <Button
              aria-label="Add"
              icon={Plus}
              size="icon"
              variant="outline"
            />
            <Button disabled>Disabled</Button>
            <Button aria-invalid variant="outline">
              Invalid
            </Button>
          </div>
        </div>

        <div className="style-guide-group">
          <h3>Links</h3>
          <div className="style-guide-row">
            <a className="link" href="#buttons">
              Link utility
            </a>
            <button className="link" type="button">
              Native button with link utility
            </button>
            <LinkButton href="#buttons" variant="link">
              LinkButton
            </LinkButton>
            <Button variant="link">Button with link presentation</Button>
          </div>
        </div>
      </section>

      <section className="style-guide-section" id="menu-items">
        <header>
          <h2>Menu items</h2>
          <p>
            <code>@kenstack/components/menu-item.css</code>
          </p>
        </header>

        <nav className="style-guide-menu" aria-label="Example menu">
          <div className="menu-heading">
            <User aria-hidden="true" />
            Signed in as Jamie
          </div>
          <a className="menu-item" href="#menu-items">
            <User aria-hidden="true" />
            Account
          </a>
          <button className="menu-item" type="button">
            <LogOut aria-hidden="true" />
            Sign out
          </button>
          <button className="menu-item" disabled type="button">
            Unavailable item
          </button>
        </nav>
      </section>

      <section className="style-guide-section" id="markdown">
        <header>
          <h2>Rendered Markdown</h2>
          <p>
            <code>@kenstack/components/markdown.css</code>
          </p>
        </header>

        <article className="markdown style-guide-markdown">
          <h1>Heading one</h1>
          <p>
            Kenstack supplies readable defaults for rendered content, including
            <a href="#markdown"> links</a>, lists, headings, and quotations.
          </p>
          <h2>Heading two</h2>
          <ul>
            <li>First unordered item</li>
            <li>Second unordered item</li>
          </ul>
          <h3>Heading three</h3>
          <ol>
            <li>First ordered item</li>
            <li>Second ordered item</li>
          </ol>
          <blockquote>
            A host theme can keep these structural defaults and adjust its own
            typography, spacing, and colour.
          </blockquote>
          <pre>
            <code>import &quot;@kenstack/theme.css&quot;;</code>
          </pre>
        </article>
      </section>
    </main>
  );
}
