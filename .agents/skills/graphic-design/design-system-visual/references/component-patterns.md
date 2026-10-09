# Component Patterns Reference

## Button
- Anatomy: label, icon optional, loading spinner optional.
- States: default, hover, focus, active, disabled, loading.
- Sizes: small, medium, large.
- Variants: primary, secondary, tertiary, destructive, ghost.
- Accessibility: minimum 44x44px touch target, focus indicator, aria-label when icon-only.

## Input
- Anatomy: label, input field, helper text, error message, optional icon.
- States: default, hover, focus, filled, disabled, error, readonly.
- Types: text, password, email, number, search, textarea.
- Accessibility: associated label, error announced, autocomplete attributes.

## Card
- Anatomy: container, header, body, optional footer, optional media.
- States: default, hover, selected, disabled.
- Variants: elevated, outlined, filled.
- Accessibility: interactive cards must be focusable, have role and label.

## Navigation
- Anatomy: brand, links, actions, optional search, optional user menu.
- States: default, active, hover, disabled.
- Patterns: top bar, sidebar, bottom bar, tabs, breadcrumbs.
- Accessibility: current page indicated, keyboard navigable, aria-current.

## Modal
- Anatomy: backdrop, container, header, body, footer, close button.
- States: open, closed, closing.
- Accessibility: focus trap, escape to close, aria-modal, role=dialog, initial focus.

## Table
- Anatomy: header row, body rows, optional footer, optional caption.
- States: default, hover, selected, sorted, loading, empty.
- Accessibility: scope attributes on headers, row and column headers, aria-sort.

## Alert
- Anatomy: icon, title, description, optional action.
- Variants: info, success, warning, error.
- Accessibility: role=alert or aria-live region, color plus icon for meaning.
