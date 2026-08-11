import type { ReactElement } from "react";
import { EmailBody, EmailButton, EmailHeading, EmailLayout } from "./layout";
import { formatEmailDateTime } from "./format";
import { spotsLeftText } from "@/lib/utils/activity-participants";
import { getSiteUrl } from "@/lib/utils/site-url";

// The three V1 transactional templates. The heading is the specific fact (no
// generic restatement); the body carries the details. Each returns an explicit
// subject, react body, and text body: the text is authored here, never
// auto-generated from the react tree. Names are nullable (full_name has no NOT
// NULL constraint), so each falls back to a neutral label.

export type EmailContent = {
  subject: string;
  react: ReactElement;
  text: string;
};

export type ActivityInfo = {
  id: string;
  title: string;
  startsAt: string;
  maxParticipants: number | null;
  participantCount: number;
};

// Someone joined -> host only. Body is date/time then spots remaining, using the
// shared spotsLeftText() so the string matches the app exactly.
export function participantJoinedEmail({
  activity,
  participantName,
}: {
  activity: ActivityInfo;
  participantName: string | null;
}): EmailContent {
  const when = formatEmailDateTime(activity.startsAt);
  const spots = spotsLeftText(activity.maxParticipants, activity.participantCount);
  const who = participantName?.trim() || "Someone";
  const heading = `${who} joined ${activity.title}`;
  const url = `${getSiteUrl()}/activity/${activity.id}`;

  const react = (
    <EmailLayout preview={heading}>
      <EmailHeading>{heading}</EmailHeading>
      <EmailBody>
        {when}. {spots}.
      </EmailBody>
      <EmailButton href={url}>View activity</EmailButton>
    </EmailLayout>
  );

  const text = `${heading}\n\n${when}. ${spots}.\n\nView activity: ${url}`;

  return { subject: heading, react, text };
}

// Someone left -> host only. Same body shape as the join notice.
export function participantLeftEmail({
  activity,
  participantName,
}: {
  activity: ActivityInfo;
  participantName: string | null;
}): EmailContent {
  const when = formatEmailDateTime(activity.startsAt);
  const spots = spotsLeftText(activity.maxParticipants, activity.participantCount);
  const who = participantName?.trim() || "Someone";
  const heading = `${who} left ${activity.title}`;
  const url = `${getSiteUrl()}/activity/${activity.id}`;

  const react = (
    <EmailLayout preview={heading}>
      <EmailHeading>{heading}</EmailHeading>
      <EmailBody>
        {when}. {spots}.
      </EmailBody>
      <EmailButton href={url}>View activity</EmailButton>
    </EmailLayout>
  );

  const text = `${heading}\n\n${when}. ${spots}.\n\nView activity: ${url}`;

  return { subject: heading, react, text };
}

// Activity cancelled -> every participant except the creator. Body names the
// host and the date so recipients know which activity and when it was set for.
export function activityCancelledEmail({
  activity,
  hostName,
}: {
  activity: ActivityInfo;
  hostName: string | null;
}): EmailContent {
  const when = formatEmailDateTime(activity.startsAt);
  const host = hostName?.trim() || "The host";
  const heading = `${activity.title} was cancelled`;
  const browseUrl = `${getSiteUrl()}/`;

  const react = (
    <EmailLayout preview={heading}>
      <EmailHeading>{heading}</EmailHeading>
      <EmailBody>
        {host} cancelled this activity, which was set for {when}.
      </EmailBody>
      <EmailButton href={browseUrl}>Find another activity</EmailButton>
    </EmailLayout>
  );

  const text = `${heading}\n\n${host} cancelled this activity, which was set for ${when}.\n\nFind another activity: ${browseUrl}`;

  return { subject: heading, react, text };
}
