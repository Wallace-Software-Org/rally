import type { ReactNode } from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { EMAIL_PALETTE } from "@/lib/brand";
import { getSiteUrl } from "@/lib/utils/site-url";

// Base transactional layout: 600px, inline styles, system font stack, no
// shadows, gradients, remote images, or avatars. Colors come from EMAIL_PALETTE
// (the only place email hex lives). Every template renders through this, so the
// footer pointing at the notification setting is applied once, here.

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Rally is light-mode only. The meta tags (in Head) declare that; this block
// restates the palette under prefers-color-scheme: dark for clients that honor
// it, so they keep the intended colors instead of auto-darkening. Some clients
// (notably Gmail iOS) force-invert regardless and ignore this, which is why the
// button also carries enough label contrast to survive inversion. Values are
// interpolated from EMAIL_PALETTE so no hex is inlined. !important overrides the
// elements' inline styles.
const COLOR_SCHEME_CSS = `
:root { color-scheme: light; supported-color-schemes: light; }
@media (prefers-color-scheme: dark) {
  .email-card { background-color: ${EMAIL_PALETTE.input} !important; border-color: ${EMAIL_PALETTE.border} !important; }
  .email-dot { background-color: ${EMAIL_PALETTE.teal} !important; }
  .email-text { color: ${EMAIL_PALETTE.text} !important; }
  .email-footer { color: ${EMAIL_PALETTE.muted} !important; }
  .email-link { color: ${EMAIL_PALETTE.muted} !important; }
  .email-button { background-color: ${EMAIL_PALETTE.teal} !important; color: ${EMAIL_PALETTE.buttonText} !important; }
}
`;

const headingStyle = {
  fontSize: "18px",
  fontWeight: 600,
  color: EMAIL_PALETTE.text,
  margin: "0 0 6px",
} as const;

const bodyStyle = {
  fontSize: "15px",
  lineHeight: "22px",
  color: EMAIL_PALETTE.text,
  margin: "0 0 16px",
} as const;

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  const settingsUrl = `${getSiteUrl()}/profile/edit`;
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_CSS }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          // No background: the card sits directly on the client background
          // (white in light, dark in dark). The header, divider, and footer sit
          // on that client background too, so they stay theme-neutral.
          margin: 0,
          padding: "24px 0",
          fontFamily: FONT_STACK,
        }}
      >
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "0 16px" }}>
          {/* Brand mark: teal dot + wordmark. The dot is a styled table cell,
              not an image, so it survives image blocking. */}
          <Row style={{ marginBottom: "16px" }}>
            <Column style={{ width: "10px", verticalAlign: "middle" }}>
              <div
                className="email-dot"
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "9999px",
                  backgroundColor: EMAIL_PALETTE.teal,
                }}
              />
            </Column>
            <Column style={{ verticalAlign: "middle", paddingLeft: "8px" }}>
              <Text
                className="email-text"
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: EMAIL_PALETTE.text,
                  margin: 0,
                }}
              >
                Rally
              </Text>
            </Column>
          </Row>
          <Section
            className="email-card"
            style={{
              backgroundColor: EMAIL_PALETTE.input,
              border: `1px solid ${EMAIL_PALETTE.border}`,
              borderRadius: "12px",
              padding: "16px 20px",
            }}
          >
            {children}
          </Section>
          <Hr style={{ borderColor: EMAIL_PALETTE.border, margin: "24px 0 12px" }} />
          <Text
            className="email-footer"
            style={{ fontSize: "12px", lineHeight: "18px", color: EMAIL_PALETTE.muted, margin: 0 }}
          >
            You are getting this because activity notifications are on. Manage
            them in your{" "}
            <Link
              href={settingsUrl}
              className="email-link"
              style={{ color: EMAIL_PALETTE.muted, textDecoration: "underline" }}
            >
              profile settings
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Text className="email-text" style={headingStyle}>
      {children}
    </Text>
  );
}

export function EmailBody({ children }: { children: ReactNode }) {
  return (
    <Text className="email-text" style={bodyStyle}>
      {children}
    </Text>
  );
}

export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Button
      href={href}
      className="email-button"
      style={{
        backgroundColor: EMAIL_PALETTE.teal,
        color: EMAIL_PALETTE.buttonText,
        borderRadius: "10px",
        padding: "12px 20px",
        fontSize: "14px",
        fontWeight: 600,
        textDecoration: "none",
        display: "inline-block",
      }}
    >
      {children}
    </Button>
  );
}
