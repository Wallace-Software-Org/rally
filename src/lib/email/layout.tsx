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
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: EMAIL_PALETTE.bg,
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
            style={{
              backgroundColor: EMAIL_PALETTE.surface,
              border: `1px solid ${EMAIL_PALETTE.border}`,
              borderRadius: "12px",
              padding: "16px 20px",
            }}
          >
            {children}
          </Section>
          <Hr style={{ borderColor: EMAIL_PALETTE.border, margin: "24px 0 12px" }} />
          <Text style={{ fontSize: "12px", lineHeight: "18px", color: EMAIL_PALETTE.muted, margin: 0 }}>
            You are getting this because activity notifications are on. Manage
            them in your{" "}
            <Link
              href={settingsUrl}
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
  return <Text style={headingStyle}>{children}</Text>;
}

export function EmailBody({ children }: { children: ReactNode }) {
  return <Text style={bodyStyle}>{children}</Text>;
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
      style={{
        backgroundColor: EMAIL_PALETTE.teal,
        color: EMAIL_PALETTE.cream,
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
