# Button

The shared `Button` is the base action component for the School ERP design system.

## Variants

- `primary`: main action such as save, create, submit.
- `secondary`: supporting action such as cancel or view details.
- `outline`: lower-emphasis bordered action.
- `ghost`: toolbar or navigation action.
- `destructive`: dangerous action such as delete, refund, deactivate.
- `link`: text action with button semantics.

## Sizes

- `sm`: compact table actions.
- `md`: default application action.
- `lg`: prominent action.
- `icon`: square icon-only button.

## Loading

Use `loading` to prevent repeated interaction and show a spinner while preserving the label.

```tsx
<Button loading>Saving...</Button>
```

## Icons

Pass icons as children. Icon-only buttons must provide `aria-label` or `aria-labelledby`.

```tsx
<Button>Save Student</Button>
<Button variant="secondary">Cancel</Button>
<Button size="icon" aria-label="Search">...</Button>
```
