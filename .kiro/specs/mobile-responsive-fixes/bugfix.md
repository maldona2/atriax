# Bugfix Requirements Document

## Introduction

Three mobile UX bugs affect the Atriax frontend on small screens. The landing page hides the login button on mobile, the patients data table overflows the viewport horizontally, and the appointment detail sheet renders a cramped, non-responsive layout on narrow screens. These issues degrade usability for mobile users across the core flows of the application.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user visits the landing page on a mobile screen (viewport < 640px) THEN the system hides the "Iniciar sesión" button (`hidden sm:inline-flex`), leaving only the "Prueba gratis" button visible in the header.

1.2 WHEN a user navigates to the Patients page on a narrow mobile screen THEN the system renders the data table without a horizontal scroll container, causing the table to overflow and extend beyond the viewport width.

1.3 WHEN a user opens the AppointmentDetailSheet on a mobile screen THEN the system renders the date/time cards in a fixed 2-column grid (`grid-cols-2`) that is too cramped for small viewports.

1.4 WHEN a user views the payment status buttons row in AppointmentDetailSheet on mobile THEN the system renders all four payment buttons in a single row that overflows or wraps poorly on narrow screens.

1.5 WHEN a user views the appointment status change grid in AppointmentDetailSheet on mobile THEN the system renders the status buttons in a fixed 2-column grid that does not adapt to very small screens.

1.6 WHEN a user views the bottom action buttons (Cerrar / Ver paciente) in AppointmentDetailSheet on mobile THEN the system renders them with insufficient spacing and sizing for comfortable touch interaction.

### Expected Behavior (Correct)

2.1 WHEN a user visits the landing page on a mobile screen THEN the system SHALL display the "Iniciar sesión" button alongside the "Prueba gratis" button in the header, removing the `hidden sm:inline-flex` restriction.

2.2 WHEN a user navigates to the Patients page on a narrow mobile screen THEN the system SHALL wrap the data table in a container with `overflow-x-auto` so the table scrolls horizontally instead of overflowing the viewport.

2.3 WHEN a user opens the AppointmentDetailSheet on a mobile screen THEN the system SHALL render the date/time cards in a single-column layout on small screens, switching to 2 columns at the `sm` breakpoint (`grid-cols-1 sm:grid-cols-2`).

2.4 WHEN a user views the payment status buttons in AppointmentDetailSheet on mobile THEN the system SHALL render the buttons in a responsive wrapping layout that stacks or wraps gracefully on narrow screens.

2.5 WHEN a user views the appointment status change grid in AppointmentDetailSheet on mobile THEN the system SHALL render the status buttons in a single-column layout on small screens, switching to 2 columns at the `sm` breakpoint.

2.6 WHEN a user views the bottom action buttons in AppointmentDetailSheet on mobile THEN the system SHALL render them with adequate touch target sizing and spacing for comfortable mobile interaction.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user visits the landing page on a desktop screen (viewport ≥ 640px) THEN the system SHALL CONTINUE TO display both the "Iniciar sesión" and "Prueba gratis" buttons in the header.

3.2 WHEN a user navigates to the Patients page on a desktop screen THEN the system SHALL CONTINUE TO render the data table with its existing layout, borders, and pagination behavior unchanged.

3.3 WHEN a user opens the AppointmentDetailSheet on a desktop or tablet screen (viewport ≥ 640px) THEN the system SHALL CONTINUE TO render the date/time cards side by side in a 2-column grid.

3.4 WHEN a user interacts with payment status buttons or appointment status buttons in AppointmentDetailSheet on desktop THEN the system SHALL CONTINUE TO function identically, updating state and triggering API calls as before.

3.5 WHEN a user clicks "Cerrar" or "Ver paciente" in AppointmentDetailSheet on any screen size THEN the system SHALL CONTINUE TO close the sheet or navigate to the patient detail page respectively.
