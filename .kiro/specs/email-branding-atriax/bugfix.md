# Bugfix Requirements Document

## Introduction

The app has been rebranded from "AnamnesIA" to "Atriax", but outgoing emails and calendar events still display the old brand name "AnamnesIA" as the sender display name and in calendar metadata. The email domain (`anamnesia.pro`) and Resend configuration remain unchanged since Atriax is a product of that company. Only the visible brand name in email sender display names and calendar event metadata needs to be updated.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an email is sent and `RESEND_FROM` env var is not set THEN the system uses `'AnamnesIA <noreply@anamnesia.pro>'` as the sender display name, showing the old brand to recipients

1.2 WHEN a Google Calendar event is created or updated THEN the system sets the event source title to `'AnamnesIA'`, showing the old brand in calendar integrations

1.3 WHEN an ICS calendar file is generated THEN the system sets the `PRODID` field to `'-//AnamnesIA//Appointment Calendar//ES'`, embedding the old brand name in calendar attachments

### Expected Behavior (Correct)

2.1 WHEN an email is sent and `RESEND_FROM` env var is not set THEN the system SHALL use `'Atriax <noreply@anamnesia.pro>'` as the sender display name

2.2 WHEN a Google Calendar event is created or updated THEN the system SHALL set the event source title to `'Atriax'`

2.3 WHEN an ICS calendar file is generated THEN the system SHALL set the `PRODID` field to `'-//Atriax//Appointment Calendar//ES'`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `RESEND_FROM` env var is explicitly set THEN the system SHALL CONTINUE TO use the configured value as the sender address without modification

3.2 WHEN emails are sent THEN the system SHALL CONTINUE TO use `noreply@anamnesia.pro` as the sender email address

3.3 WHEN ICS files are generated THEN the system SHALL CONTINUE TO use `anamnesia.pro` as the domain in UIDs and organizer fields

3.4 WHEN appointment emails are sent THEN the system SHALL CONTINUE TO deliver all email content, attachments, and calendar invites correctly
