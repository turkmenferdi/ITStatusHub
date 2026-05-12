import nodemailer from "nodemailer";
import type { Incident, IncidentStage, NotificationGroup } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

function createTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });
}

function isDevMode(incident?: Incident): boolean {
  return env.DEV_EMAIL_MODE || !env.SMTP_HOST || Boolean(incident?.summary.startsWith("[NON-PRODUCTION]"));
}

export async function deliverIncidentEmail(input: {
  incident: Incident;
  stage: IncidentStage;
  group: NotificationGroup;
  subject: string;
  html: string;
  text: string;
}) {
  const members = await prisma.notificationGroupMember.findMany({
    where: { notificationGroupId: input.group.id, isActive: true }
  });

  const recipients = members.map((m) => m.email);
  const devMode = isDevMode(input.incident);
  let deliveryStatus: "simulated" | "sent" | "failed" = devMode ? "simulated" : "sent";
  let providerMessageId: string | undefined;

  if (devMode) {
    console.log("[DEV EMAIL]", { to: recipients, subject: input.subject, text: input.text });
  } else {
    try {
      const result = await createTransporter().sendMail({
        from: env.SMTP_FROM,
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.text
      });
      providerMessageId = result.messageId;
    } catch (error) {
      deliveryStatus = "failed";
      console.error("[SMTP EMAIL FAILED]", error);
    }
  }

  const notification = await prisma.incidentNotification.create({
    data: {
      incidentId: input.incident.id,
      stage: input.stage,
      recipientGroupId: input.group.id,
      deliveryMode: devMode ? "dev" : "smtp",
      subjectRendered: input.subject,
      bodyRendered: input.html,
      deliveryStatus,
      providerMessageId,
      sentAt: deliveryStatus === "failed" ? null : new Date()
    }
  });

  await auditLog({
    actorType: "system",
    actorName: "email-service",
    action: "incident.email_recorded",
    entityType: "IncidentNotification",
    entityId: notification.id,
    payload: {
      incidentId: input.incident.id,
      stage: input.stage,
      group: input.group.name,
      recipients,
      deliveryStatus
    }
  });

  return notification;
}

export async function deliverSubscriberNotifications(input: {
  incident: Incident;
  stage: IncidentStage;
  subject: string;
  html: string;
  text: string;
}) {
  const subscribers = await prisma.statusPageSubscriber.findMany({
    where: { isActive: true }
  });

  if (subscribers.length === 0) return;

  const recipients = subscribers.map((s) => s.email);
  const devMode = isDevMode(input.incident);

  if (devMode) {
    console.log("[DEV SUBSCRIBER EMAIL]", {
      to: recipients,
      subject: input.subject,
      stage: input.stage
    });
    return;
  }

  try {
    await createTransporter().sendMail({
      from: env.SMTP_FROM,
      bcc: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text
    });
  } catch (error) {
    console.error("[SMTP SUBSCRIBER EMAIL FAILED]", error);
  }

  await auditLog({
    actorType: "system",
    actorName: "email-service",
    action: "incident.subscriber_notified",
    entityType: "Incident",
    entityId: input.incident.id,
    payload: { stage: input.stage, count: subscribers.length, devMode }
  });
}

export async function deliverTemplateTestEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  templateId: string;
}) {
  const devMode = env.DEV_EMAIL_MODE || !env.SMTP_HOST;
  let deliveryStatus: "simulated" | "sent" | "failed" = devMode ? "simulated" : "sent";
  let providerMessageId: string | undefined;

  if (devMode) {
    console.log("[DEV TEST EMAIL]", { to: input.to, subject: input.subject });
  } else {
    try {
      const result = await createTransporter().sendMail({
        from: env.SMTP_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text
      });
      providerMessageId = result.messageId;
    } catch (error) {
      deliveryStatus = "failed";
      console.error("[SMTP TEST EMAIL FAILED]", error);
    }
  }

  await auditLog({
    actorType: "user",
    actorName: "operator",
    action: "template.test_email_sent",
    entityType: "MessageTemplate",
    entityId: input.templateId,
    payload: {
      to: input.to,
      deliveryStatus,
      deliveryMode: devMode ? "dev" : "smtp",
      providerMessageId
    }
  });

  return { deliveryStatus, deliveryMode: devMode ? "dev" : "smtp", providerMessageId };
}
