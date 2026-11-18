import type { ReactNode } from "react"

import { LINKS } from "@/lib/links"
import { SITE_HOST } from "@/lib/sites"
import { legalDoc, type LegalPart } from "@/lib/legal-content"

/**
 * The privacy page. Its words live in lib/legal-content.ts (also written as plain HTML/Markdown at build time for readers without JavaScript, see legal-static-plugin.ts).
 * When a rule changes, change it there.
 */
const heading = "text-[15px] font-semibold text-[var(--text)]"
const body = "text-[13px] leading-relaxed text-[var(--text-muted)]"
const doc = legalDoc("privacy")

const hrefOf = (href: "discord" | "privacy" | "terms") => (href === "discord" ? LINKS.discordInvite : `/${href}`)

function Parts({ parts }: { parts: LegalPart[] }): ReactNode {
  return parts.map((part, index) => {
    if (typeof part === "string") return part.replaceAll("{site}", SITE_HOST)
    if ("b" in part) return <b key={index} className="text-[var(--text)]">{part.b}</b>
    const external = part.href === "discord"
    return <a key={index} className="text-[var(--text)] underline" href={hrefOf(part.href)} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{part.a}</a>
  })
}

export function PrivacyPage() {
  return (
    <article className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 pb-16 pt-8 max-md:px-4">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-tight text-[var(--text)]">{doc.title}</h1>
        <p className={body}><Parts parts={doc.intro} /></p>
      </header>
      {doc.sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className={heading}>{section.title}</h2>
          <div className={`${body} flex flex-col gap-2`}>
            {section.paragraphs.map((paragraph, index) => <p key={index}><Parts parts={paragraph} /></p>)}
          </div>
        </section>
      ))}
    </article>
  )
}
